CREATE TABLE public.device_request_limits (key text PRIMARY KEY, window_start timestamptz NOT NULL DEFAULT now(), attempts integer NOT NULL DEFAULT 0);
GRANT ALL ON public.device_request_limits TO service_role;
ALTER TABLE public.device_request_limits ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.consume_device_limit(p_key text,p_max integer,p_seconds integer) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE n integer; BEGIN
 INSERT INTO public.device_request_limits(key,window_start,attempts) VALUES(p_key,now(),1) ON CONFLICT(key) DO UPDATE SET window_start=CASE WHEN device_request_limits.window_start<=now()-make_interval(secs=>p_seconds) THEN now() ELSE device_request_limits.window_start END, attempts=CASE WHEN device_request_limits.window_start<=now()-make_interval(secs=>p_seconds) THEN 1 ELSE device_request_limits.attempts+1 END RETURNING attempts INTO n;
 RETURN n<=p_max; END; $$;
REVOKE ALL ON FUNCTION public.consume_device_limit(text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_device_limit(text,integer,integer) TO service_role;
CREATE OR REPLACE FUNCTION public.claim_pairing_code(p_code text,p_name text,p_location text,p_group uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE ps public.pairing_sessions; sid uuid; allowed boolean; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.device_pairing_config WHERE id=true AND enabled) THEN RAISE EXCEPTION 'Pairing disabled'; END IF;
 allowed=public.consume_device_limit('claim:user:'||auth.uid()::text,10,600);
 allowed=public.consume_device_limit('claim:global',100,600) AND allowed;
 IF NOT allowed THEN RETURN NULL; END IF;
 IF p_code !~ '^\d{6}$' OR length(trim(p_name)) NOT BETWEEN 1 AND 120 OR length(p_location)>240 THEN RETURN NULL; END IF;
 SELECT * INTO ps FROM public.pairing_sessions WHERE pairing_code=p_code FOR UPDATE;
 IF NOT FOUND OR ps.status<>'pending' OR ps.expires_at<=now() THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM public.device_credentials WHERE device_id=ps.device_id AND revoked_at IS NOT NULL) THEN RETURN NULL; END IF;
 IF p_group IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.groups WHERE id=p_group AND user_id=auth.uid()) THEN RETURN NULL; END IF;
 INSERT INTO public.screens(user_id,name,pairing_code,location,group_id,status) VALUES(auth.uid(),trim(p_name),p_code,p_location,p_group,'pending') RETURNING id INTO sid;
 UPDATE public.pairing_sessions SET status='paired',user_id=auth.uid(),screen_id=sid,paired_at=now() WHERE id=ps.id;
 RETURN sid; END; $$;
CREATE FUNCTION public.revoke_deleted_screen() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 UPDATE public.device_credentials SET revoked_at=now() WHERE device_id IN(SELECT device_id FROM public.pairing_sessions WHERE screen_id=OLD.id);
 UPDATE public.pairing_sessions SET status='revoked' WHERE screen_id=OLD.id;
 RETURN OLD; END; $$;
CREATE TRIGGER revoke_deleted_screen BEFORE DELETE ON public.screens FOR EACH ROW EXECUTE FUNCTION public.revoke_deleted_screen();
INSERT INTO public.device_pairing_config(id,enabled) VALUES(true,true) ON CONFLICT(id) DO UPDATE SET enabled=true;