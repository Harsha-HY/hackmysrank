ALTER TABLE public.users DISABLE TRIGGER USER;
UPDATE public.users SET role = 'owner', company_id = NULL WHERE email = 'harshahy426@gmail.com';
ALTER TABLE public.users ENABLE TRIGGER USER;