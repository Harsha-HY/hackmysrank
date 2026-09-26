
-- Fix 1: negotiation_messages sender_role spoof
-- Drop existing INSERT policies and recreate with sender_role validation.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='negotiation_messages' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.negotiation_messages', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Participants can send negotiation messages"
ON public.negotiation_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_role = (SELECT role FROM public.users WHERE user_id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.offer_letters ol
    WHERE ol.id = negotiation_messages.offer_id
      AND (
        ol.candidate_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.user_id = auth.uid()
            AND u.company_id = ol.company_id
            AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
        )
      )
  )
);

-- Fix 2: users self-insert privilege escalation
-- Drop existing INSERT policies and recreate restricting role/company_id on self-insert.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='users' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.users', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Users can insert own candidate record"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'candidate'
  AND company_id IS NULL
);

-- Service role bypasses RLS, so privileged staff creation via edge functions
-- (create-user) continues to work using the service_role key.
