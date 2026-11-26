GRANT EXECUTE ON FUNCTION public.public_pricing() TO service_role;
CREATE OR REPLACE FUNCTION public.billing_schedule_downgrade(p_plan uuid,p_keep uuid[]) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 SELECT * INTO p FROM public.billing_plans WHERE id=p_plan AND published AND catalog_version=s.catalog_version AND NOT quote_only;
 IF NOT FOUND OR p.capacity>=s.capacity THEN RAISE EXCEPTION 'Invalid plan'; END IF;
 SELECT count(*) INTO used FROM public.screen_entitlements WHERE user_id=auth.uid() AND active;
 k:=COALESCE(cardinality(p_keep),0);
 IF used>p.capacity+s.complimentary_screens THEN
  IF k<>p.capacity+s.complimentary_screens OR (SELECT count(DISTINCT x) FROM unnest(p_keep) x)<>k OR EXISTS(SELECT 1 FROM unnest(p_keep) x WHERE NOT EXISTS(SELECT 1 FROM public.screen_entitlements e WHERE e.screen_id=x AND e.user_id=auth.uid() AND e.active)) THEN RAISE EXCEPTION 'KEEP_SELECTION_REQUIRED:%',p.capacity+s.complimentary_screens; END IF;
 ELSE p_keep:=NULL; END IF;
 UPDATE public.subscriptions SET scheduled_plan_id=p.id,scheduled_keep_screens=p_keep,updated_at=now() WHERE user_id=auth.uid();
 INSERT INTO public.subscription_history(user_id,actor_id,action,details) VALUES(auth.uid(),auth.uid(),'downgrade_scheduled',jsonb_build_object('plan_id',p.id,'capacity',p.capacity));
END $$;
REVOKE ALL ON FUNCTION public.billing_schedule_downgrade(uuid,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.billing_schedule_downgrade(uuid,uuid[]) TO authenticated;