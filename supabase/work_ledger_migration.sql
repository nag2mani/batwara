-- ============================================================
-- Work Ledger — ADDITIVE migration (safe for existing databases)
--
-- Run this INSTEAD of setup.sql when you already have data.
-- It only CREATES the three new work tables + their policies and
-- indexes. It does NOT drop or touch profiles / groups /
-- group_members / expenses / settlements, so existing data is safe.
--
-- Safe to re-run: uses IF NOT EXISTS and drops-then-recreates only
-- its OWN policies (never any table).
-- ============================================================

-- ---- work_entries ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_entries (
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

DROP POLICY IF EXISTS "work_entries: group members read" ON work_entries;
CREATE POLICY "work_entries: group members read"
  ON work_entries FOR SELECT
  USING (group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "work_entries: creator insert" ON work_entries;
CREATE POLICY "work_entries: creator insert"
  ON work_entries FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "work_entries: creator delete" ON work_entries;
CREATE POLICY "work_entries: creator delete"
  ON work_entries FOR DELETE
  USING (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS work_entries_group_id_idx   ON work_entries(group_id);
CREATE INDEX IF NOT EXISTS work_entries_created_by_idx ON work_entries(created_by);
CREATE INDEX IF NOT EXISTS work_entries_date_idx       ON work_entries(date DESC);


-- ---- work_votes ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_votes (
  id         text        PRIMARY KEY,
  work_id    text        NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  vote       text        NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, user_id)
);

ALTER TABLE work_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_votes: group members read" ON work_votes;
CREATE POLICY "work_votes: group members read"
  ON work_votes FOR SELECT
  USING (
    work_id IN (
      SELECT id FROM work_entries
      WHERE group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "work_votes: eligible insert" ON work_votes;
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

DROP POLICY IF EXISTS "work_votes: own update" ON work_votes;
CREATE POLICY "work_votes: own update"
  ON work_votes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "work_votes: own delete" ON work_votes;
CREATE POLICY "work_votes: own delete"
  ON work_votes FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS work_votes_work_id_idx ON work_votes(work_id);


-- ---- work_reactions --------------------------------------------------------
CREATE TABLE IF NOT EXISTS work_reactions (
  id         text        PRIMARY KEY,
  work_id    text        NOT NULL REFERENCES work_entries(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  emoji      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, user_id, emoji)
);

ALTER TABLE work_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_reactions: group members read" ON work_reactions;
CREATE POLICY "work_reactions: group members read"
  ON work_reactions FOR SELECT
  USING (
    work_id IN (
      SELECT id FROM work_entries
      WHERE group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "work_reactions: member insert" ON work_reactions;
CREATE POLICY "work_reactions: member insert"
  ON work_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND work_id IN (
      SELECT id FROM work_entries
      WHERE group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "work_reactions: own delete" ON work_reactions;
CREATE POLICY "work_reactions: own delete"
  ON work_reactions FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS work_reactions_work_id_idx ON work_reactions(work_id);
