-- ============================================================
-- Batwara – Complete Supabase setup (single file, run once)
--
-- Sets up EVERYTHING the app needs: profiles, groups, expenses,
-- settlements, lending/borrowing, the work ledger, plus the auth
-- trigger and the password-recovery / loan-claim helper functions.
--
-- Instructions:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire file → click Run
--
-- Safe to re-run: drops everything first then recreates cleanly.
-- WARNING: dropping the tables wipes existing data — only run on a
-- fresh project (or when you intend to reset).
-- ============================================================


-- ============================================================
-- CLEANUP  (drop old tables, triggers, and functions if they exist)
-- ============================================================

DROP TRIGGER  IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS claim_my_lendings();
DROP FUNCTION IF EXISTS email_is_registered(text);

DROP TABLE IF EXISTS work_reactions CASCADE;
DROP TABLE IF EXISTS work_votes     CASCADE;
DROP TABLE IF EXISTS work_entries   CASCADE;
DROP TABLE IF EXISTS lendings       CASCADE;
DROP TABLE IF EXISTS settlements    CASCADE;
DROP TABLE IF EXISTS expenses       CASCADE;
DROP TABLE IF EXISTS group_members  CASCADE;
DROP TABLE IF EXISTS groups         CASCADE;
DROP TABLE IF EXISTS members        CASCADE;  -- old schema
DROP TABLE IF EXISTS profiles       CASCADE;


-- ============================================================
-- PROFILES
-- One row per registered user. All signed-in users can search
-- profiles by name/email (needed for adding group members).
-- Auto-created via trigger when a user signs up.
-- ============================================================

CREATE TABLE profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text        NOT NULL,
  email        text        NOT NULL,
  color        text        NOT NULL DEFAULT '#34d399',
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can read all profiles (for member search)
CREATE POLICY "profiles: authenticated read"
  ON profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Anyone can insert (needed by trigger; id FK prevents abuse)
CREATE POLICY "profiles: insert"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- Users can only update their own profile
CREATE POLICY "profiles: own update"
  ON profiles FOR UPDATE
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger function: auto-create profile when a user signs up.
-- SECURITY DEFINER + search_path: runs as postgres role, finds public tables.
-- Exception block: profile errors never block signup.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, display_name, email, color)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name',
               split_part(COALESCE(NEW.email, ''), '@', 1),
               'User'),
      COALESCE(NEW.email, ''),
      '#34d399'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- silently ignore so signup always succeeds
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Backfill profiles for any users that already exist
INSERT INTO public.profiles (id, display_name, email, color)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'display_name',
           split_part(COALESCE(email, ''), '@', 1),
           'User'),
  COALESCE(email, ''),
  '#34d399'
FROM auth.users
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- GROUPS
-- Created by one user, shared with all members.
-- RLS policies are added AFTER group_members is created
-- (policies reference group_members, so order matters).
-- ============================================================

CREATE TABLE groups (
  id         text        PRIMARY KEY,
  created_by uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text        NOT NULL,
  emoji      text        NOT NULL DEFAULT '🏠',
  created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- GROUP_MEMBERS  (junction table: which users are in which group)
-- Must be created before groups RLS policies below.
-- ============================================================

CREATE TABLE group_members (
  group_id  text        NOT NULL REFERENCES groups(id)     ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);


-- ============================================================
-- RLS for GROUPS  (added here, after group_members exists)
-- ============================================================

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- Visible to the creator and to any member in the group
CREATE POLICY "groups: member read"
  ON groups FOR SELECT
  USING (
    created_by = auth.uid()
    OR id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "groups: creator insert"
  ON groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "groups: creator delete"
  ON groups FOR DELETE
  USING (auth.uid() = created_by);


-- ============================================================
-- RLS for GROUP_MEMBERS
-- ============================================================

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read membership rows
-- (needed to build the member list inside a group)
CREATE POLICY "group_members: authenticated read"
  ON group_members FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only the group creator can add members
CREATE POLICY "group_members: creator insert"
  ON group_members FOR INSERT
  WITH CHECK (
    group_id IN (SELECT id FROM groups WHERE created_by = auth.uid())
  );


-- ============================================================
-- EXPENSES
-- personal → visible only to the creator
-- group    → visible to all members of that group
-- ============================================================

CREATE TABLE expenses (
  id           text           PRIMARY KEY,
  created_by   uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description  text           NOT NULL,
  amount       numeric(12, 2) NOT NULL CHECK (amount > 0),
  category     text           NOT NULL,
  date         timestamptz    NOT NULL,
  type         text           NOT NULL CHECK (type IN ('personal', 'group')),
  group_id     text           REFERENCES groups(id) ON DELETE SET NULL,
  paid_by      text,          -- UUID of who paid (group expenses)
  split_method text,          -- 'equal' | 'exact' | 'percentage'
  splits       jsonb,         -- [{memberId, amount}]
  created_at   timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses: read"
  ON expenses FOR SELECT
  USING (
    (type = 'personal' AND created_by = auth.uid())
    OR
    (type = 'group' AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "expenses: creator insert"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "expenses: creator delete"
  ON expenses FOR DELETE
  USING (auth.uid() = created_by);

CREATE INDEX expenses_created_by_idx ON expenses(created_by);
CREATE INDEX expenses_group_id_idx   ON expenses(group_id);
CREATE INDEX expenses_date_idx       ON expenses(date DESC);


-- ============================================================
-- SETTLEMENTS
-- Records debt repayments within a group.
-- Visible to anyone in the group (or the from/to users).
-- ============================================================

CREATE TABLE settlements (
  id         text           PRIMARY KEY,
  group_id   text           REFERENCES groups(id) ON DELETE SET NULL,
  from_user  text           NOT NULL,  -- UUID of who paid
  to_user    text           NOT NULL,  -- UUID of who received
  amount     numeric(12, 2) NOT NULL CHECK (amount > 0),
  date       timestamptz    NOT NULL,
  created_at timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settlements: group members read"
  ON settlements FOR SELECT
  USING (
    from_user = auth.uid()::text
    OR to_user = auth.uid()::text
    OR (group_id IS NOT NULL AND group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "settlements: group members insert"
  ON settlements FOR INSERT
  WITH CHECK (
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );


-- ============================================================
-- LENDINGS
-- Money lent to or borrowed from a friend, tracked until returned.
-- `direction` is from the creator's point of view (lent out / borrowed in).
-- The other person may be an onboarded user (counterparty_id) or just a
-- name — with an optional email that auto-links the loan to their account
-- when they later sign up (see claim_my_lendings below).
-- ============================================================

CREATE TABLE lendings (
  id                 text           PRIMARY KEY,
  created_by         uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,   -- whoever logged it
  direction          text           NOT NULL DEFAULT 'lent' CHECK (direction IN ('lent', 'borrowed')),
  counterparty_id    uuid           REFERENCES auth.users(id) ON DELETE SET NULL,           -- the other person, if onboarded
  counterparty_name  text           NOT NULL,
  counterparty_email text,          -- optional; used to auto-link on signup
  amount             numeric(12, 2) NOT NULL CHECK (amount > 0),
  description        text,
  date               timestamptz    NOT NULL,
  settled_at         timestamptz,   -- NULL = still outstanding
  created_at         timestamptz    NOT NULL DEFAULT now()
);

ALTER TABLE lendings ENABLE ROW LEVEL SECURITY;

-- Both sides of the loan can see it
CREATE POLICY "lendings: participant read"
  ON lendings FOR SELECT
  USING (created_by = auth.uid() OR counterparty_id = auth.uid());

-- Only the creator logs the record
CREATE POLICY "lendings: creator insert"
  ON lendings FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Either side can mark it settled / unsettled
CREATE POLICY "lendings: participant update"
  ON lendings FOR UPDATE
  USING (created_by = auth.uid() OR counterparty_id = auth.uid())
  WITH CHECK (created_by = auth.uid() OR counterparty_id = auth.uid());

-- Only the creator can delete it
CREATE POLICY "lendings: creator delete"
  ON lendings FOR DELETE
  USING (created_by = auth.uid());

CREATE INDEX lendings_created_by_idx         ON lendings(created_by);
CREATE INDEX lendings_counterparty_id_idx    ON lendings(counterparty_id);
CREATE INDEX lendings_counterparty_email_idx ON lendings(lower(counterparty_email));
CREATE INDEX lendings_date_idx               ON lendings(date DESC);

-- Link loans logged against my email before I onboarded. SECURITY DEFINER so
-- it can set counterparty_id on rows I don't yet own; the app calls it on load.
CREATE OR REPLACE FUNCTION claim_my_lendings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_email text;
BEGIN
  SELECT email INTO my_email FROM auth.users WHERE id = auth.uid();
  IF my_email IS NULL THEN
    RETURN;
  END IF;

  UPDATE lendings
     SET counterparty_id = auth.uid()
   WHERE counterparty_id IS NULL
     AND counterparty_email IS NOT NULL
     AND lower(counterparty_email) = lower(my_email);
END;
$$;

REVOKE ALL ON FUNCTION claim_my_lendings() FROM public;
GRANT EXECUTE ON FUNCTION claim_my_lendings() TO authenticated;


-- ============================================================
-- WORK LEDGER — household chore tracking
--
--   work_entries   : a logged chore, always tied to a group
--   work_votes     : approve/reject validations (one per user per entry)
--   work_reactions : 👏 ❤️ 🔥 🙌 on verified work
--
-- Status (pending / verified / rejected) is DERIVED on the client from the
-- votes + group size, so it is intentionally NOT stored here.
-- ============================================================

CREATE TABLE work_entries (
  id               text        PRIMARY KEY,
  group_id         text        NOT NULL REFERENCES groups(id)     ON DELETE CASCADE,
  created_by       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text        NOT NULL,
  description      text        NOT NULL DEFAULT '',
  category         text        NOT NULL,
  effort           text        NOT NULL CHECK (effort IN ('Easy', 'Medium', 'Hard')),
  duration_minutes integer     NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  images           jsonb       NOT NULL DEFAULT '[]'::jsonb,
  date             timestamptz NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE work_entries ENABLE ROW LEVEL SECURITY;

-- Visible to every member of the entry's group
CREATE POLICY "work_entries: group members read"
  ON work_entries FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

-- The submitter must be the creator AND a member of the group
CREATE POLICY "work_entries: creator insert"
  ON work_entries FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "work_entries: creator delete"
  ON work_entries FOR DELETE
  USING (created_by = auth.uid());

CREATE INDEX work_entries_group_id_idx   ON work_entries(group_id);
CREATE INDEX work_entries_created_by_idx ON work_entries(created_by);
CREATE INDEX work_entries_date_idx       ON work_entries(date DESC);


CREATE TABLE work_votes (
  id         text        PRIMARY KEY,
  work_id    text        NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  vote       text        NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, user_id)   -- one vote per member per entry (enables upsert)
);

ALTER TABLE work_votes ENABLE ROW LEVEL SECURITY;

-- Readable by anyone who can see the underlying work entry
CREATE POLICY "work_votes: group members read"
  ON work_votes FOR SELECT
  USING (
    work_id IN (
      SELECT id FROM work_entries
      WHERE group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    )
  );

-- You may vote on a group-mate's entry, but NOT on your own
CREATE POLICY "work_votes: eligible insert"
  ON work_votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND work_id IN (
      SELECT id FROM work_entries
      WHERE created_by <> auth.uid()
        AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "work_votes: own update"
  ON work_votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "work_votes: own delete"
  ON work_votes FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX work_votes_work_id_idx ON work_votes(work_id);


CREATE TABLE work_reactions (
  id         text        PRIMARY KEY,
  work_id    text        NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  emoji      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, user_id, emoji)
);

ALTER TABLE work_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_reactions: group members read"
  ON work_reactions FOR SELECT
  USING (
    work_id IN (
      SELECT id FROM work_entries
      WHERE group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "work_reactions: member insert"
  ON work_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND work_id IN (
      SELECT id FROM work_entries
      WHERE group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "work_reactions: own delete"
  ON work_reactions FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX work_reactions_work_id_idx ON work_reactions(work_id);


-- ============================================================
-- PASSWORD RECOVERY HELPER
-- Lets the app check — before login — whether an email belongs to a
-- registered account, so password-reset codes only go to real users.
-- Returns only a boolean. Exposed to `anon` on purpose (the check runs
-- while logged out); note this does allow email enumeration.
-- ============================================================

CREATE OR REPLACE FUNCTION email_is_registered(check_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE lower(email) = lower(trim(check_email))
  );
$$;

REVOKE ALL ON FUNCTION email_is_registered(text) FROM public;
GRANT EXECUTE ON FUNCTION email_is_registered(text) TO anon, authenticated;
