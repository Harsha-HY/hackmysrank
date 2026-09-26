CREATE TABLE public.candidate_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL,
  application_id uuid,
  note_text text NOT NULL CHECK (char_length(note_text) <= 1000 AND char_length(note_text) > 0),
  created_by uuid NOT NULL,
  created_by_name text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_candidate_notes_candidate ON public.candidate_notes(candidate_id) WHERE is_deleted = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidate_notes TO authenticated;
GRANT ALL ON public.candidate_notes TO service_role;

ALTER TABLE public.candidate_notes ENABLE ROW LEVEL SECURITY;

-- Helper: is HR or Owner/Superadmin (NOT manager)
CREATE OR REPLACE FUNCTION public.is_hr_or_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE user_id = auth.uid()
      AND role = ANY (ARRAY['owner','superadmin','hr'])
  );
$$;

CREATE POLICY "HR/Admin can view notes" ON public.candidate_notes
  FOR SELECT TO authenticated
  USING (public.is_hr_or_admin());

CREATE POLICY "HR/Admin can insert notes" ON public.candidate_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_hr_or_admin() AND created_by = auth.uid());

CREATE POLICY "HR/Admin can update notes" ON public.candidate_notes
  FOR UPDATE TO authenticated
  USING (public.is_hr_or_admin())
  WITH CHECK (public.is_hr_or_admin());

CREATE POLICY "HR/Admin can delete notes" ON public.candidate_notes
  FOR DELETE TO authenticated
  USING (public.is_hr_or_admin());

CREATE TRIGGER update_candidate_notes_updated_at
  BEFORE UPDATE ON public.candidate_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();