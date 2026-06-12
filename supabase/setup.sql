-- ============================================================
-- Batwara – Complete Supabase setup (single file, run once)
--
-- Instructions:
--   1. Go to Supabase Dashboard → SQL Editor
--   2. Paste this entire file → click Run
--   3. All tables, policies, and triggers will be created
--
-- Safe to re-run: drops everything first then recreates cleanly.
-- ============================================================


-- ============================================================
-- CLEANUP  (drop old tables and triggers if they exist)
-- ============================================================

DROP TRIGGER  IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

DROP TABLE IF EXISTS settlements   CASCADE;
DROP TABLE IF EXISTS expenses      CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups        CASCADE;
DROP TABLE IF EXISTS members       CASCADE;  -- old schema
DROP TABLE IF EXISTS profiles      CASCADE;


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
