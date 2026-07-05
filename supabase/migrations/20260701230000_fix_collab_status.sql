-- Fix collab status validation to include 'negotiating' status
-- Applied to fix custom project request submission failures

CREATE OR REPLACE FUNCTION public.prevent_invalid_collab_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN (
    'negotiating',
    'pending',
    'funded',
    'in_progress',
    'submitted',
    'pending_approval',
    'completed',
    'released',
    'disputed',
    'cancelled',
    'canceled',
    'rejected',
    'expired'
  ) THEN
    RAISE EXCEPTION 'Invalid collab status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
