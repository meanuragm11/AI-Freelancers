-- Builder payout methods and withdrawal ledger

CREATE TABLE IF NOT EXISTS public.builder_payout_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payout_region text NOT NULL CHECK (payout_region IN ('india', 'international')),
  account_holder_name text NOT NULL,
  bank_name text,
  account_last4 text NOT NULL,
  routing_last4 text,
  ifsc_code text,
  paypal_email text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT builder_payout_methods_builder_unique UNIQUE (builder_id)
);

CREATE TABLE IF NOT EXISTS public.builder_withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  builder_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payout_method_id uuid REFERENCES public.builder_payout_methods(id) ON DELETE SET NULL,
  amount_usd numeric(12, 2) NOT NULL CHECK (amount_usd > 0),
  status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
  reference_code text NOT NULL UNIQUE,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_builder_withdrawals_builder_created
  ON public.builder_withdrawals(builder_id, created_at DESC);

ALTER TABLE public.builder_payout_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builder_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Builders can read own payout method"
  ON public.builder_payout_methods FOR SELECT
  USING (auth.uid() = builder_id);

CREATE POLICY "Builders can read own withdrawals"
  ON public.builder_withdrawals FOR SELECT
  USING (auth.uid() = builder_id);

DROP TRIGGER IF EXISTS touch_builder_payout_methods_updated_at ON public.builder_payout_methods;
CREATE TRIGGER touch_builder_payout_methods_updated_at
  BEFORE UPDATE ON public.builder_payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
