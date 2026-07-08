-- ---------------------------------------------------------------------------
-- Password-reset: only send a code to registered emails.
--
-- resetPasswordForEmail() runs while the user is logged out (anon role), and
-- the profiles table's RLS blocks anonymous reads, so the client can't check
-- existence directly. This SECURITY DEFINER function runs as the owner and
-- returns ONLY a boolean (no data leak beyond "does this email exist").
--
-- NOTE: exposing this to `anon` allows email enumeration (someone can learn
-- which addresses are registered). That is the intended trade-off here.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.email_is_registered(check_email text)
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

-- Callable before login, so grant to anon (and authenticated for completeness).
REVOKE ALL ON FUNCTION public.email_is_registered(text) FROM public;
GRANT EXECUTE ON FUNCTION public.email_is_registered(text) TO anon, authenticated;
