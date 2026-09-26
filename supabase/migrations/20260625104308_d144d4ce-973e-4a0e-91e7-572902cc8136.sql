
-- Clean any orphan public.users rows whose auth user no longer exists
DELETE FROM public.users u WHERE NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = u.user_id);

-- Enforce unique email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON public.users (lower(email));

-- Make trigger fully idempotent (skip if user_id OR email already present)
CREATE OR REPLACE FUNCTION public.handle_new_candidate_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.users WHERE user_id = NEW.id OR lower(email) = lower(NEW.email)) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.users (user_id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'candidate')::text
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_candidate_user() FROM PUBLIC, anon, authenticated;
