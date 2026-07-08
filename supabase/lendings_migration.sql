-- ============================================================
-- LENDINGS — money lent to a friend, tracked until returned.
--
-- The lender (created_by) always sees the record. If the friend is an
-- onboarded app user, counterparty_id links to them so they see it on
-- their side as "borrowed". If not onboarded, only counterparty_name (and
-- optionally counterparty_email) is stored; when that person later signs up
-- with the same email, claim_my_lendings() links the loan to their account.
--
-- Safe to re-run on an existing project (idempotent: IF NOT EXISTS / OR REPLACE).
-- ============================================================

CREATE TABLE IF NOT EXISTS lendings (
  id                text           PRIMARY KEY,
  created_by        uuid           NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,   -- lender
  counterparty_id   uuid           REFERENCES auth.users(id) ON DELETE SET NULL,           -- borrower, if onboarded
  counterparty_name text           NOT NULL,
  counterparty_email text,         -- optional; used to auto-link when they onboard later
  amount            numeric(12, 2) NOT NULL CHECK (amount > 0),
  description       text,
  date              timestamptz    NOT NULL,
  settled_at        timestamptz,   -- NULL = still outstanding
  created_at        timestamptz    NOT NULL DEFAULT now()
);

-- For projects that already created the table before this column existed.
ALTER TABLE lendings ADD COLUMN IF NOT EXISTS counterparty_email text;

ALTER TABLE lendings ENABLE ROW LEVEL SECURITY;

-- Both sides of the loan can see it.
DROP POLICY IF EXISTS "lendings: participant read" ON lendings;
CREATE POLICY "lendings: participant read"
  ON lendings FOR SELECT
  USING (created_by = auth.uid() OR counterparty_id = auth.uid());

-- Only the lender creates the record.
DROP POLICY IF EXISTS "lendings: lender insert" ON lendings;
CREATE POLICY "lendings: lender insert"
  ON lendings FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Either side can mark it settled / unsettled.
DROP POLICY IF EXISTS "lendings: participant update" ON lendings;
CREATE POLICY "lendings: participant update"
  ON lendings FOR UPDATE
  USING (created_by = auth.uid() OR counterparty_id = auth.uid())
  WITH CHECK (created_by = auth.uid() OR counterparty_id = auth.uid());

-- Only the lender can delete the record.
DROP POLICY IF EXISTS "lendings: lender delete" ON lendings;
CREATE POLICY "lendings: lender delete"
  ON lendings FOR DELETE
  USING (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS lendings_created_by_idx      ON lendings(created_by);
CREATE INDEX IF NOT EXISTS lendings_counterparty_id_idx ON lendings(counterparty_id);
CREATE INDEX IF NOT EXISTS lendings_counterparty_email_idx ON lendings(lower(counterparty_email));
CREATE INDEX IF NOT EXISTS lendings_date_idx            ON lendings(date DESC);

-- ------------------------------------------------------------
-- Auto-link loans logged against my email before I onboarded.
-- Call from the client after login; runs as owner so it can set
-- counterparty_id on rows the caller doesn't yet own (RLS-safe).
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_my_lendings()
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

REVOKE ALL ON FUNCTION public.claim_my_lendings() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_my_lendings() TO authenticated;
