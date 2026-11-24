ALTER TABLE public.device_commands DROP CONSTRAINT device_commands_command_check;
ALTER TABLE public.device_commands ADD CONSTRAINT device_commands_command_check CHECK (command IN ('refresh_content','reload_playlist','restart_player','clear_cache','position_test','stop_position_test','update_apk'));
CREATE FUNCTION public.enqueue_apk_update(p_screen uuid,p_url text,p_version_code integer,p_version_name text,p_sha256 text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE did uuid; cid uuid; BEGIN
 IF auth.uid() IS NULL OR p_url !~ '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/releases/download/[^[:space:]]+\.apk$' OR p_version_code < 1 OR length(p_version_name) > 40 OR (p_sha256 IS NOT NULL AND p_sha256 !~ '^[a-f0-9]{64}$') THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM 1 FROM public.screens WHERE id=p_screen AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT p.device_id INTO did FROM public.pairing_sessions p JOIN public.device_credentials c USING(device_id) WHERE p.screen_id=p_screen AND p.user_id=auth.uid() AND p.status='paired' AND c.revoked_at IS NULL FOR UPDATE OF c;
 IF did IS NULL THEN RAISE EXCEPTION 'Device unavailable'; END IF;
 IF (SELECT count(*) FROM public.device_commands WHERE device_id=did AND status IN ('pending','delivered') AND expires_at>now())>=20 THEN RAISE EXCEPTION 'Queue full'; END IF;
 INSERT INTO public.device_commands(screen_id,device_id,user_id,command,payload,expires_at) VALUES(p_screen,did,auth.uid(),'update_apk',jsonb_build_object('url',p_url,'version_code',p_version_code,'version_name',p_version_name,'sha256',p_sha256),now()+interval '1 hour') RETURNING id INTO cid; RETURN cid;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_apk_update(uuid,text,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.enqueue_apk_update(uuid,text,integer,text,text) TO authenticated;