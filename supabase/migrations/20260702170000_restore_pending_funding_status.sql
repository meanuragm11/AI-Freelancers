-- Restore checkout-related collab statuses removed by 20260701230000_fix_collab_status.sql
-- Buy Service and contract checkout create collabs with status 'pending_funding'.

CREATE OR REPLACE FUNCTION public.prevent_invalid_collab_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN (
    'draft',
    'negotiating',
    'pending',
    'pending_funding',
    'funded',
    'active',
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
