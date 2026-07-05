-- Profile fields for builder profile page
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'available'
    CHECK (availability_status IN ('available', 'limited', 'unavailable'));

COMMENT ON COLUMN public.profiles.languages IS 'Spoken languages for builder profile display';
COMMENT ON COLUMN public.profiles.availability_status IS 'Builder availability: available, limited, or unavailable';
