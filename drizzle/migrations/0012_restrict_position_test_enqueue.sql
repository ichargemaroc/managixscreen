CREATE OR REPLACE FUNCTION public.enqueue_device_command(p_screen uuid,p_command text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE did uuid; cid uuid; BEGIN
 IF auth.uid() IS NULL OR p_command NOT IN ('refresh_content','reload_playlist','restart_player','clear_cache') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM 1 FROM public.screens WHERE id=p_screen AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT p.device_id INTO did FROM public.pairing_sessions p JOIN public.device_credentials c USING(device_id) WHERE p.screen_id=p_screen AND p.user_id=auth.uid() AND p.status='paired' AND c.revoked_at IS NULL FOR UPDATE OF c;
 IF did IS NULL THEN RAISE EXCEPTION 'Device unavailable'; END IF;
 IF (SELECT count(*) FROM public.device_commands WHERE device_id=did AND status IN ('pending','delivered') AND expires_at>now())>=20 THEN RAISE EXCEPTION 'Queue full'; END IF;
 INSERT INTO public.device_commands(screen_id,device_id,user_id,command) VALUES(p_screen,did,auth.uid(),p_command) RETURNING id INTO cid; RETURN cid;
END; $$;