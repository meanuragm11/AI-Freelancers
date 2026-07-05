-- Fix: on_auth_user_created trigger never persisted the signup role, so every
-- new signup (email/password AND Google OAuth) ended up with role = NULL and
-- is_freelancer = false regardless of whether the user picked "buyer" or
-- "builder" on the auth page. This silently broke builder onboarding, since
-- the client-side fallback upsert (in app/auth/page.tsx / app/auth/callback)
-- also failed silently (it referenced a non-existent profiles.email column).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  signup_role text := new.raw_user_meta_data->>'role';
BEGIN
  IF signup_role NOT IN ('buyer', 'builder') THEN
    signup_role := 'buyer';
  END IF;

  INSERT INTO public.profiles (id, full_name, company_name, reputation_score, role, is_freelancer)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company_name',
    CASE WHEN signup_role = 'builder' THEN 100 ELSE 0 END,
    signup_role,
    signup_role = 'builder'
  );
  RETURN new;
END;
$function$;
