
-- Allow HR/Manager/Superadmin/Owner of a company to delete their company's jobs
CREATE POLICY "Company staff can delete company jobs"
ON public.jobs FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
      AND u.company_id = jobs.company_id
      AND u.role = ANY (ARRAY['owner','superadmin','hr','manager'])
  )
);

-- Make dependent rows cascade so delete actually succeeds
ALTER TABLE public.group_discussions DROP CONSTRAINT group_discussions_job_id_fkey,
  ADD CONSTRAINT group_discussions_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.interviews DROP CONSTRAINT interviews_job_id_fkey,
  ADD CONSTRAINT interviews_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;

ALTER TABLE public.offer_letters DROP CONSTRAINT offer_letters_job_id_fkey,
  ADD CONSTRAINT offer_letters_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.jobs(id) ON DELETE CASCADE;
