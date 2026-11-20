CREATE TABLE public.device_telemetry (
 device_id uuid PRIMARY KEY REFERENCES public.pairing_sessions(device_id),
 player_version text, device_info jsonb NOT NULL DEFAULT '{}'::jsonb,
 playback_status jsonb NOT NULL DEFAULT '{}'::jsonb, last_sync_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.device_telemetry TO authenticated;
GRANT ALL ON public.device_telemetry TO service_role;
ALTER TABLE public.device_telemetry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read device telemetry" ON public.device_telemetry FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pairing_sessions p WHERE p.device_id=device_telemetry.device_id AND p.user_id=auth.uid()));
CREATE TABLE public.device_commands (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), screen_id uuid NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE,
 device_id uuid NOT NULL REFERENCES public.pairing_sessions(device_id), user_id uuid NOT NULL,
 command text NOT NULL CHECK (command IN ('refresh_content','reload_playlist','restart_player','clear_cache')),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','delivered','completed','failed','expired')),
 created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz, acknowledged_at timestamptz,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours', error_message text
);
GRANT SELECT ON public.device_commands TO authenticated;
GRANT ALL ON public.device_commands TO service_role;
ALTER TABLE public.device_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read commands" ON public.device_commands FOR SELECT TO authenticated USING (user_id=auth.uid());
CREATE INDEX device_commands_queue ON public.device_commands(device_id,status,created_at);
ALTER TABLE public.screens ADD COLUMN assignment_updated_at timestamptz NOT NULL DEFAULT now();
CREATE FUNCTION public.track_screen_assignment() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='UPDATE' THEN
  NEW.assignment_updated_at=CASE WHEN NEW.playlist_id IS DISTINCT FROM OLD.playlist_id THEN now() ELSE OLD.assignment_updated_at END;
 END IF; RETURN NEW; END; $$;
CREATE TRIGGER track_screen_assignment BEFORE UPDATE ON public.screens FOR EACH ROW EXECUTE FUNCTION public.track_screen_assignment();
CREATE FUNCTION public.device_screen(p_device uuid,p_hash text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; BEGIN
 SELECT p.screen_id INTO sid FROM public.pairing_sessions p JOIN public.device_credentials c USING(device_id)
 WHERE p.device_id=p_device AND c.token_hash=p_hash AND c.revoked_at IS NULL AND p.status='paired' FOR UPDATE OF c;
 IF sid IS NULL THEN RAISE EXCEPTION 'Unauthorized device'; END IF; RETURN sid; END; $$;
REVOKE ALL ON FUNCTION public.device_screen(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_screen(uuid,text) TO service_role;
CREATE FUNCTION public.device_report(p_device uuid,p_hash text,p_report jsonb) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE seen timestamptz; BEGIN
 PERFORM public.device_screen(p_device,p_hash);
 seen=public.device_heartbeat(p_device,p_hash);
 INSERT INTO public.device_telemetry(device_id,player_version,device_info,playback_status) VALUES(p_device,p_report->>'player_version',COALESCE(p_report->'device_info','{}'::jsonb),COALESCE(p_report->'playback_status','{}'::jsonb))
 ON CONFLICT(device_id) DO UPDATE SET player_version=COALESCE(EXCLUDED.player_version,device_telemetry.player_version),device_info=CASE WHEN p_report ? 'device_info' THEN EXCLUDED.device_info ELSE device_telemetry.device_info END,playback_status=CASE WHEN p_report ? 'playback_status' THEN EXCLUDED.playback_status ELSE device_telemetry.playback_status END,updated_at=now();
 RETURN seen; END; $$;
REVOKE ALL ON FUNCTION public.device_report(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_report(uuid,text,jsonb) TO service_role;
CREATE FUNCTION public.device_content(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; s public.screens; manifest jsonb; BEGIN
 sid=public.device_screen(p_device,p_hash); SELECT * INTO s FROM public.screens WHERE id=sid;
 SELECT jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'media',jsonb_build_object('id',m.id,'name',m.name,'type',m.type,'size',m.size,'duration',m.duration,'path',m.path)) ORDER BY i.position,i.id) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=s.user_id WHERE i.playlist_id=p.id),'[]'::jsonb)) INTO manifest FROM public.playlists p WHERE p.id=s.playlist_id AND p.user_id=s.user_id;
 RETURN jsonb_build_object('screen_id',sid,'assignment_updated_at',s.assignment_updated_at,'playlist',manifest);
 END; $$;
REVOKE ALL ON FUNCTION public.device_content(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_content(uuid,text) TO service_role;
CREATE FUNCTION public.device_record_sync(p_device uuid,p_hash text) RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE synced timestamptz; BEGIN
 PERFORM public.device_screen(p_device,p_hash);
 INSERT INTO public.device_telemetry(device_id,last_sync_at) VALUES(p_device,now()) ON CONFLICT(device_id) DO UPDATE SET last_sync_at=now() RETURNING last_sync_at INTO synced;
 RETURN synced; END; $$;
REVOKE ALL ON FUNCTION public.device_record_sync(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_record_sync(uuid,text) TO service_role;
CREATE FUNCTION public.enqueue_device_command(p_screen uuid,p_command text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE did uuid; cid uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM 1 FROM public.screens WHERE id=p_screen AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
 SELECT p.device_id INTO did FROM public.pairing_sessions p JOIN public.device_credentials c USING(device_id) WHERE p.screen_id=p_screen AND p.user_id=auth.uid() AND p.status='paired' AND c.revoked_at IS NULL FOR UPDATE OF c;
 IF did IS NULL THEN RAISE EXCEPTION 'Device unavailable'; END IF;
 IF (SELECT count(*) FROM public.device_commands WHERE device_id=did AND status IN ('pending','delivered') AND expires_at>now())>=20 THEN RAISE EXCEPTION 'Queue full'; END IF;
 INSERT INTO public.device_commands(screen_id,device_id,user_id,command) VALUES(p_screen,did,auth.uid(),p_command) RETURNING id INTO cid; RETURN cid;
 END; $$;
REVOKE ALL ON FUNCTION public.enqueue_device_command(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.enqueue_device_command(uuid,text) TO authenticated;
CREATE FUNCTION public.device_poll_commands(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cmds jsonb; BEGIN
 PERFORM public.device_screen(p_device,p_hash);
 UPDATE public.device_commands SET status='expired' WHERE device_id=p_device AND status IN ('pending','delivered') AND expires_at<=now();
 UPDATE public.device_commands SET status='delivered',delivered_at=COALESCE(delivered_at,now()) WHERE device_id=p_device AND status='pending' AND expires_at>now();
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'command',command,'created_at',created_at,'expires_at',expires_at) ORDER BY created_at,id),'[]'::jsonb) INTO cmds FROM public.device_commands WHERE device_id=p_device AND status='delivered' AND expires_at>now(); RETURN cmds;
 END; $$;
REVOKE ALL ON FUNCTION public.device_poll_commands(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_poll_commands(uuid,text) TO service_role;
CREATE FUNCTION public.device_ack_command(p_device uuid,p_hash text,p_command uuid,p_status text,p_error text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE cmd public.device_commands; BEGIN
 PERFORM public.device_screen(p_device,p_hash);
 IF p_status NOT IN ('completed','failed') OR length(p_error)>500 THEN RETURN false; END IF;
 SELECT * INTO cmd FROM public.device_commands WHERE id=p_command AND device_id=p_device FOR UPDATE;
 IF NOT FOUND OR cmd.expires_at<=now() THEN RETURN false; END IF;
 IF cmd.status IN ('completed','failed') THEN RETURN cmd.status=p_status; END IF;
 IF cmd.status<>'delivered' THEN RETURN false; END IF;
 UPDATE public.device_commands SET status=p_status,error_message=CASE WHEN p_status='failed' THEN p_error ELSE NULL END,acknowledged_at=now() WHERE id=p_command; RETURN true;
 END; $$;
REVOKE ALL ON FUNCTION public.device_ack_command(uuid,text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_ack_command(uuid,text,uuid,text,text) TO service_role;
CREATE FUNCTION public.touch_playlist_content() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF TG_TABLE_NAME='playlist_items' THEN
  IF TG_OP<>'INSERT' THEN UPDATE public.playlists SET updated_at=now() WHERE id=OLD.playlist_id; END IF;
  IF TG_OP<>'DELETE' THEN UPDATE public.playlists SET updated_at=now() WHERE id=NEW.playlist_id; END IF;
 ELSE
  UPDATE public.playlists SET updated_at=now() WHERE id IN (SELECT playlist_id FROM public.playlist_items WHERE media_id=NEW.id);
 END IF;
 RETURN NULL; END; $$;
CREATE TRIGGER touch_playlist_items AFTER INSERT OR UPDATE OR DELETE ON public.playlist_items FOR EACH ROW EXECUTE FUNCTION public.touch_playlist_content();
CREATE TRIGGER touch_playlist_media AFTER UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION public.touch_playlist_content();