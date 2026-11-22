ALTER TABLE public.billing_settings
  ADD COLUMN trial_days integer NOT NULL DEFAULT 14 CHECK (trial_days BETWEEN 0 AND 90),
  ADD COLUMN trial_capacity integer NOT NULL DEFAULT 5 CHECK (trial_capacity >= 0 AND trial_capacity % 5 = 0),
  ADD COLUMN trial_one_per_email boolean NOT NULL DEFAULT true;

ALTER TABLE public.subscriptions
  ADD COLUMN trial_started_at timestamptz,
  ADD COLUMN trial_ends_at timestamptz,
  ADD COLUMN complimentary_screens integer NOT NULL DEFAULT 0 CHECK (complimentary_screens BETWEEN 0 AND 100000),
  ADD COLUMN scheduled_plan_id uuid REFERENCES public.billing_plans(id),
  ADD COLUMN scheduled_keep_screens uuid[];

CREATE TABLE public.billing_trial_registry (email_hash text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.billing_trial_registry TO service_role;
ALTER TABLE public.billing_trial_registry ENABLE ROW LEVEL SECURITY;

INSERT INTO public.billing_trial_registry(email_hash)
SELECT DISTINCT md5(lower(trim(email))) FROM public.profiles WHERE email IS NOT NULL ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.billing_new_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.billing_settings; h text; eligible boolean := true;
BEGIN
  SELECT * INTO b FROM public.billing_settings WHERE id;
  IF NEW.email IS NOT NULL THEN
    h := md5(lower(trim(NEW.email)));
    IF b.trial_one_per_email AND EXISTS (SELECT 1 FROM public.billing_trial_registry WHERE email_hash=h) THEN eligible := false; END IF;
    INSERT INTO public.billing_trial_registry(email_hash) VALUES(h) ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.subscriptions(user_id,status,capacity,trial_started_at,trial_ends_at)
  VALUES(NEW.id,'trial',CASE WHEN eligible AND b.trial_days>0 THEN b.trial_capacity ELSE 0 END,now(),CASE WHEN eligible THEN now()+make_interval(days=>b.trial_days) ELSE now() END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.billing_check_place(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions; used integer;
BEGIN
  PERFORM public.billing_lock_account(p_user);
  SELECT * INTO s FROM public.subscriptions WHERE user_id=p_user FOR UPDATE;
  IF s.status='suspended' OR (s.enforce_capacity AND (s.status NOT IN ('active','trial','past_due') OR (s.status='past_due' AND (s.grace_until IS NULL OR s.grace_until<=now())) OR (s.current_period_end IS NOT NULL AND s.current_period_end<=now()))) THEN RAISE EXCEPTION 'BILLING_INACTIVE'; END IF;
  IF s.enforce_capacity AND s.status='trial' AND s.trial_ends_at IS NOT NULL AND s.trial_ends_at<=now() THEN RAISE EXCEPTION 'TRIAL_EXPIRED'; END IF;
  IF NOT s.enforce_capacity THEN RETURN; END IF;
  SELECT count(*) INTO used FROM public.screen_entitlements WHERE user_id=p_user AND active;
  IF used >= s.capacity + s.complimentary_screens THEN RAISE EXCEPTION 'SCREEN_LIMIT:%', s.capacity + s.complimentary_screens; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.billing_admin_settings(p_currency text,p_discount numeric,p_grace integer) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
UPDATE public.billing_settings SET currency=p_currency,annual_discount_percent=p_discount,grace_days=p_grace,updated_at=now() WHERE id; END $$;

CREATE FUNCTION public.billing_admin_trial_settings(p_days integer,p_capacity integer,p_one_per_email boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF p_days IS NULL OR p_days NOT BETWEEN 0 AND 90 OR p_capacity IS NULL OR p_capacity<0 OR p_capacity%5<>0 OR p_capacity>1000 OR p_one_per_email IS NULL THEN RAISE EXCEPTION 'Invalid settings'; END IF;
UPDATE public.billing_settings SET trial_days=p_days,trial_capacity=p_capacity,trial_one_per_email=p_one_per_email,updated_at=now() WHERE id; END $$;

CREATE FUNCTION public.billing_admin_grant(p_user uuid,p_kind text,p_value integer,p_until timestamptz DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions; used integer;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM public.billing_lock_account(p_user);
  SELECT * INTO s FROM public.subscriptions WHERE user_id=p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown client'; END IF;
  SELECT count(*) INTO used FROM public.screen_entitlements WHERE user_id=p_user AND active;
  IF p_kind='free_screens' THEN
    IF p_value IS NULL OR p_value<0 OR p_value>100000 THEN RAISE EXCEPTION 'Invalid value'; END IF;
    IF s.enforce_capacity AND used > s.capacity + p_value THEN RAISE EXCEPTION 'CAPACITY_BELOW_USAGE'; END IF;
    UPDATE public.subscriptions SET complimentary_screens=p_value,updated_at=now() WHERE user_id=p_user;
  ELSIF p_kind='special' THEN
    IF s.provider_subscription_id IS NOT NULL THEN RAISE EXCEPTION 'PROVIDER_MANAGED'; END IF;
    IF p_value IS NULL OR p_value<0 OR p_value%5<>0 OR p_value>100000 OR (p_until IS NOT NULL AND p_until<=now()) THEN RAISE EXCEPTION 'Invalid value'; END IF;
    IF used > p_value + s.complimentary_screens THEN RAISE EXCEPTION 'CAPACITY_BELOW_USAGE'; END IF;
    UPDATE public.subscriptions SET plan_id=NULL,capacity=p_value,status='active',previous_status=NULL,legacy_access=false,enforce_capacity=true,amount=NULL,currency=NULL,current_period_end=p_until,grace_until=NULL,trial_ends_at=NULL,scheduled_plan_id=NULL,scheduled_keep_screens=NULL,updated_at=now() WHERE user_id=p_user;
  ELSIF p_kind='extend_trial' THEN
    IF p_value IS NULL OR p_value NOT BETWEEN 1 AND 90 OR s.status<>'trial' THEN RAISE EXCEPTION 'Invalid value'; END IF;
    UPDATE public.subscriptions SET trial_ends_at=GREATEST(COALESCE(trial_ends_at,now()),now())+make_interval(days=>p_value),capacity=GREATEST(capacity,(SELECT trial_capacity FROM public.billing_settings WHERE id)),updated_at=now() WHERE user_id=p_user;
  ELSE RAISE EXCEPTION 'Invalid action'; END IF;
  INSERT INTO public.subscription_history(user_id,actor_id,action,details) VALUES(p_user,auth.uid(),p_kind,jsonb_build_object('value',p_value,'until',p_until));
END $$;

CREATE FUNCTION public.billing_schedule_downgrade(p_plan uuid,p_keep uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions; p public.billing_plans; used integer; k integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  PERFORM public.billing_lock_account(auth.uid());
  SELECT * INTO s FROM public.subscriptions WHERE user_id=auth.uid() FOR UPDATE;
  IF p_plan IS NULL THEN
    UPDATE public.subscriptions SET scheduled_plan_id=NULL,scheduled_keep_screens=NULL,updated_at=now() WHERE user_id=auth.uid();
    INSERT INTO public.subscription_history(user_id,actor_id,action,details) VALUES(auth.uid(),auth.uid(),'downgrade_cancelled','{}'::jsonb);
    RETURN;
  END IF;
  IF s.status<>'active' OR s.legacy_access OR s.current_period_end IS NULL THEN RAISE EXCEPTION 'DOWNGRADE_NOT_AVAILABLE'; END IF;
  SELECT * INTO p FROM public.billing_plans WHERE id=p_plan AND published;
  IF NOT FOUND OR p.capacity >= s.capacity THEN RAISE EXCEPTION 'Invalid plan'; END IF;
  SELECT count(*) INTO used FROM public.screen_entitlements WHERE user_id=auth.uid() AND active;
  k := COALESCE(cardinality(p_keep),0);
  IF used > p.capacity + s.complimentary_screens THEN
    IF k <> p.capacity + s.complimentary_screens OR (SELECT count(DISTINCT x) FROM unnest(p_keep) x) <> k
       OR EXISTS (SELECT 1 FROM unnest(p_keep) x WHERE NOT EXISTS (SELECT 1 FROM public.screen_entitlements e WHERE e.screen_id=x AND e.user_id=auth.uid() AND e.active))
    THEN RAISE EXCEPTION 'KEEP_SELECTION_REQUIRED:%', p.capacity + s.complimentary_screens; END IF;
  ELSE p_keep := NULL; END IF;
  UPDATE public.subscriptions SET scheduled_plan_id=p.id,scheduled_keep_screens=p_keep,updated_at=now() WHERE user_id=auth.uid();
  INSERT INTO public.subscription_history(user_id,actor_id,action,details) VALUES(auth.uid(),auth.uid(),'downgrade_scheduled',jsonb_build_object('plan_id',p.id,'capacity',p.capacity));
END $$;
REVOKE ALL ON FUNCTION public.billing_schedule_downgrade(uuid,uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.billing_schedule_downgrade(uuid,uuid[]) TO authenticated;

-- Service-only: applied by the future payment provider renewal handler.
CREATE FUNCTION public.billing_apply_scheduled_change(p_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions; p public.billing_plans;
BEGIN
  PERFORM public.billing_lock_account(p_user);
  SELECT * INTO s FROM public.subscriptions WHERE user_id=p_user FOR UPDATE;
  IF s.scheduled_plan_id IS NULL THEN RETURN; END IF;
  SELECT * INTO p FROM public.billing_plans WHERE id=s.scheduled_plan_id;
  IF s.scheduled_keep_screens IS NOT NULL THEN
    UPDATE public.screen_entitlements SET active=false,revision=revision+1,updated_at=now() WHERE user_id=p_user AND active AND NOT (screen_id = ANY(s.scheduled_keep_screens));
  END IF;
  UPDATE public.subscriptions SET plan_id=p.id,capacity=p.capacity,scheduled_plan_id=NULL,scheduled_keep_screens=NULL,updated_at=now() WHERE user_id=p_user;
  INSERT INTO public.subscription_history(user_id,actor_id,action,details) VALUES(p_user,NULL,'downgrade_applied',jsonb_build_object('plan_id',p.id));
END $$;
REVOKE ALL ON FUNCTION public.billing_apply_scheduled_change(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.billing_apply_scheduled_change(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.billing_admin_grant(uuid,text,integer,timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.billing_admin_grant(uuid,text,integer,timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.billing_admin_trial_settings(integer,integer,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.billing_admin_trial_settings(integer,integer,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.billing_admin_overview(p_page integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_page<0 OR p_page>100000 THEN RAISE EXCEPTION 'Invalid page'; END IF;
  RETURN jsonb_build_object(
    'clients',COALESCE((SELECT jsonb_agg(t) FROM (SELECT s.user_id,p.email,p.full_name,p.org_name,s.plan_id,s.status,s.capacity,s.complimentary_screens,s.legacy_access,s.enforce_capacity,s.current_period_end,s.trial_ends_at,(SELECT count(*) FROM public.screen_entitlements e WHERE e.user_id=s.user_id AND e.active) AS used FROM public.subscriptions s LEFT JOIN public.profiles p ON p.id=s.user_id ORDER BY s.user_id LIMIT 25 OFFSET p_page*25)t),'[]'::jsonb),
    'total',(SELECT count(*) FROM public.subscriptions),
    'active',(SELECT count(*) FROM public.subscriptions WHERE status='active' AND NOT legacy_access AND amount IS NOT NULL),
    'trials',(SELECT count(*) FROM public.subscriptions WHERE status='trial' AND trial_ends_at>now()),
    'past_due',(SELECT count(*) FROM public.subscriptions WHERE status='past_due'),
    'suspended',(SELECT count(*) FROM public.subscriptions WHERE status='suspended'),
    'screens',(SELECT count(*) FROM public.screen_entitlements WHERE active),
    'mrr',(SELECT COALESCE(sum(CASE WHEN interval='year' THEN amount/12 ELSE amount END),0) FROM public.subscriptions WHERE status IN ('active','past_due') AND NOT legacy_access AND amount IS NOT NULL AND currency=(SELECT currency FROM public.billing_settings WHERE id)),
    'plans',COALESCE((SELECT jsonb_agg(to_jsonb(p)-'provider_monthly_price'-'provider_annual_price' ORDER BY capacity) FROM public.billing_plans p),'[]'::jsonb),
    'settings',(SELECT to_jsonb(b) FROM public.billing_settings b WHERE id));
END $$;