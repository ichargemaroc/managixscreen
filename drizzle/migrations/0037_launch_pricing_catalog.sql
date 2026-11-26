ALTER TABLE public.billing_plans ADD COLUMN catalog_version text NOT NULL DEFAULT 'legacy', ADD COLUMN features jsonb NOT NULL DEFAULT '[]'::jsonb, ADD COLUMN comparison jsonb NOT NULL DEFAULT '{}'::jsonb, ADD COLUMN quote_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.billing_plans DROP CONSTRAINT billing_plans_capacity_key;
ALTER TABLE public.billing_plans DROP CONSTRAINT billing_plans_capacity_check;
ALTER TABLE public.billing_plans ADD CONSTRAINT billing_plans_capacity_check CHECK(capacity=2 OR (capacity>=5 AND capacity%5=0)), ADD CONSTRAINT billing_plans_catalog_capacity_key UNIQUE(catalog_version,capacity);
ALTER TABLE public.billing_settings DROP CONSTRAINT billing_settings_trial_capacity_check;
ALTER TABLE public.billing_settings ADD CONSTRAINT billing_settings_trial_capacity_check CHECK(trial_capacity>=0 AND (trial_capacity=2 OR trial_capacity%5=0));
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_capacity_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_capacity_check CHECK(capacity>=0 AND (capacity=2 OR capacity%5=0)), ADD COLUMN catalog_version text NOT NULL DEFAULT 'legacy', ADD COLUMN founder_rank integer, ADD COLUMN founder_discount_percent numeric, ADD COLUMN founder_discount_months integer, ADD COLUMN founder_started_at timestamptz, ADD COLUMN founder_ends_at timestamptz;
CREATE TABLE public.billing_launch_campaign (code text PRIMARY KEY, account_limit integer NOT NULL CHECK(account_limit=20), reserved integer NOT NULL DEFAULT 0 CHECK(reserved BETWEEN 0 AND 20), discount_percent numeric NOT NULL CHECK(discount_percent=25), discount_months integer NOT NULL CHECK(discount_months=6));
GRANT ALL ON public.billing_launch_campaign TO service_role;
ALTER TABLE public.billing_launch_campaign ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.billing_new_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.billing_settings; c public.billing_launch_campaign; h text; eligible boolean := true; rank integer;
BEGIN
 IF EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=NEW.id) THEN RETURN NEW; END IF;
 SELECT * INTO b FROM public.billing_settings WHERE id;
 SELECT * INTO c FROM public.billing_launch_campaign WHERE code='launch_2026' FOR UPDATE;
 IF NEW.email IS NOT NULL THEN
  h:=md5(lower(trim(NEW.email)));
  INSERT INTO public.billing_trial_registry(email_hash) VALUES(h) ON CONFLICT DO NOTHING;
  IF b.trial_one_per_email AND NOT FOUND THEN eligible:=false; END IF;
 END IF;
 IF eligible AND c.reserved<c.account_limit THEN rank:=c.reserved+1; END IF;
 INSERT INTO public.subscriptions(user_id,status,capacity,trial_started_at,trial_ends_at,catalog_version,founder_rank,founder_discount_percent,founder_discount_months)
 VALUES(NEW.id,'trial',CASE WHEN eligible AND b.trial_days>0 THEN b.trial_capacity ELSE 0 END,now(),CASE WHEN eligible THEN now()+make_interval(days=>b.trial_days) ELSE now() END,'launch_2026',rank,CASE WHEN rank IS NOT NULL THEN c.discount_percent END,CASE WHEN rank IS NOT NULL THEN c.discount_months END) ON CONFLICT DO NOTHING;
 IF FOUND AND rank IS NOT NULL THEN UPDATE public.billing_launch_campaign SET reserved=reserved+1 WHERE code='launch_2026'; END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION public.billing_start_founder_period() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.founder_rank IS NOT NULL AND NEW.founder_started_at IS NULL AND NEW.status='active' AND NEW.amount>0 AND NEW.interval='month' THEN
  NEW.founder_started_at:=now(); NEW.founder_ends_at:=now()+make_interval(months=>NEW.founder_discount_months);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER billing_founder_period BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.billing_start_founder_period();
CREATE OR REPLACE FUNCTION public.billing_admin_save_plan(p_id uuid DEFAULT NULL,p_name text DEFAULT NULL,p_capacity integer DEFAULT NULL,p_amount bigint DEFAULT NULL,p_published boolean DEFAULT true) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF p_name IS NULL OR p_capacity IS NULL OR p_published IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 80 OR NOT(p_capacity=2 OR (p_capacity>=5 AND p_capacity%5=0)) OR p_capacity>100000 OR p_amount<0 THEN RAISE EXCEPTION 'Invalid plan'; END IF;
 IF p_id IS NULL THEN INSERT INTO public.billing_plans(name,capacity,monthly_amount,published,catalog_version) VALUES(trim(p_name),p_capacity,p_amount,p_published,'launch_2026') RETURNING id INTO result;
 ELSE UPDATE public.billing_plans SET name=trim(p_name),capacity=p_capacity,monthly_amount=p_amount,published=p_published,price_revision=price_revision+1,provider_monthly_price=NULL,provider_annual_price=NULL,updated_at=now() WHERE id=p_id RETURNING id INTO result; IF result IS NULL THEN RAISE EXCEPTION 'Unknown plan'; END IF; END IF;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.billing_admin_trial_settings(p_days integer,p_capacity integer,p_one_per_email boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF p_days IS NULL OR p_days NOT BETWEEN 0 AND 90 OR p_capacity IS NULL OR NOT(p_capacity=2 OR (p_capacity>=0 AND p_capacity%5=0)) OR p_capacity>1000 OR p_one_per_email IS NULL THEN RAISE EXCEPTION 'Invalid settings'; END IF;
 UPDATE public.billing_settings SET trial_days=p_days,trial_capacity=p_capacity,trial_one_per_email=p_one_per_email,updated_at=now() WHERE id;
END $$;
CREATE OR REPLACE FUNCTION public.public_pricing() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('currency',b.currency,'annual_discount_percent',b.annual_discount_percent,'trial_days',b.trial_days,'trial_capacity',b.trial_capacity,
 'founders',(SELECT jsonb_build_object('limit',account_limit,'remaining',account_limit-reserved,'discount_percent',discount_percent,'months',discount_months) FROM public.billing_launch_campaign WHERE code='launch_2026'),
 'plans',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name,'capacity',capacity,'monthly_amount',monthly_amount,'features',features,'comparison',comparison,'quote_only',quote_only) ORDER BY capacity) FROM public.billing_plans WHERE published AND monthly_amount IS NOT NULL AND catalog_version='launch_2026'),'[]'::jsonb)) FROM public.billing_settings b WHERE id;
$$;
REVOKE ALL ON FUNCTION public.public_pricing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_pricing() TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.billing_my_account() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 PERFORM public.billing_lock_account(auth.uid()); SELECT * INTO s FROM public.subscriptions WHERE user_id=auth.uid();
 RETURN jsonb_build_object('subscription',to_jsonb(s)-'provider_customer_id'-'provider_subscription_id'-'previous_status',
 'used',(SELECT count(*) FROM public.screen_entitlements WHERE user_id=auth.uid() AND active),
 'plans',COALESCE((SELECT jsonb_agg(to_jsonb(p)-'provider_monthly_price'-'provider_annual_price' ORDER BY capacity) FROM public.billing_plans p WHERE (published AND catalog_version=s.catalog_version) OR id=s.plan_id OR id=s.scheduled_plan_id),'[]'::jsonb),
 'settings',(SELECT to_jsonb(b) FROM public.billing_settings b WHERE id),
 'payments',COALESCE((SELECT jsonb_agg(t) FROM (SELECT id,kind,status,amount,currency,hosted_url,paid_at,created_at FROM public.payment_records WHERE user_id=auth.uid() ORDER BY created_at DESC LIMIT 100)t),'[]'::jsonb),
 'history',COALESCE((SELECT jsonb_agg(t) FROM (SELECT action,details,created_at FROM public.subscription_history WHERE user_id=auth.uid() ORDER BY created_at DESC LIMIT 50)t),'[]'::jsonb),
 'entitlements',COALESCE((SELECT jsonb_agg(jsonb_build_object('screen_id',screen_id,'active',active)) FROM public.screen_entitlements WHERE user_id=auth.uid()),'[]'::jsonb),'is_admin',public.has_role(auth.uid(),'admin'));
END $$;
REVOKE ALL ON FUNCTION public.billing_my_account() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.billing_my_account() TO authenticated;
CREATE FUNCTION public.billing_launch_quote(p_user uuid,p_plan uuid,p_interval text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s public.subscriptions; p public.billing_plans; amount bigint; discount numeric:=0; annual_discount numeric;
BEGIN
 SELECT * INTO s FROM public.subscriptions WHERE user_id=p_user;
 SELECT * INTO p FROM public.billing_plans WHERE id=p_plan AND published AND catalog_version=s.catalog_version;
 IF NOT FOUND OR p.quote_only OR p.monthly_amount IS NULL OR p_interval NOT IN ('month','year') THEN RAISE EXCEPTION 'Invalid plan'; END IF;
 IF p_interval='year' THEN SELECT annual_discount_percent INTO annual_discount FROM public.billing_settings WHERE id; amount:=round(p.monthly_amount*12*(1-COALESCE(annual_discount,0)/100));
 ELSE
  IF s.founder_rank IS NOT NULL AND (s.founder_ends_at IS NULL OR now()<s.founder_ends_at) THEN discount:=COALESCE(s.founder_discount_percent,0); END IF;
  amount:=round(p.monthly_amount*(1-discount/100));
 END IF;
 RETURN jsonb_build_object('amount',amount,'currency',(SELECT currency FROM public.billing_settings WHERE id),'founder_discount_percent',discount,'interval',p_interval);
END $$;
REVOKE ALL ON FUNCTION public.billing_launch_quote(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.billing_launch_quote(uuid,uuid,text) TO service_role;