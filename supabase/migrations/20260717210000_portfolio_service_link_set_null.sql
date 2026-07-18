-- Profile portfolio projects linked to a service should survive service deletion.
ALTER TABLE public.portfolio_projects
  DROP CONSTRAINT IF EXISTS portfolio_projects_service_id_fkey;

ALTER TABLE public.portfolio_projects
  ADD CONSTRAINT portfolio_projects_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;
