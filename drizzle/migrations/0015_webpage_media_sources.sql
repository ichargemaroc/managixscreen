ALTER TABLE public.media DROP CONSTRAINT media_type_check;
ALTER TABLE public.media ADD CONSTRAINT media_type_check CHECK (type IN ('image','video','webpage'));
ALTER TABLE public.media ADD COLUMN webpage_url text, ADD COLUMN refresh_minutes integer NOT NULL DEFAULT 0 CHECK (refresh_minutes BETWEEN 0 AND 1440), ADD COLUMN webpage_fullscreen boolean NOT NULL DEFAULT true;
CREATE FUNCTION public.validate_webpage_media() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ DECLARE host text; BEGIN
 IF NEW.type='webpage' THEN
  IF NEW.webpage_url IS NULL OR length(NEW.webpage_url)>2048 OR NEW.webpage_url !~ '^https?://[^[:space:]@]+([/?#].*)?$' THEN RAISE EXCEPTION 'Invalid webpage URL'; END IF;
  host=lower(split_part(split_part(split_part(substring(NEW.webpage_url from '^https?://([^/?#]+)'),':',1),'.',1),'/',1));
  IF NEW.webpage_url ~* '^https?://(localhost|[^/]+\.localhost|[^/]+\.local|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2[0-9]|3[01])\.|0\.|\[)' OR host ~ '^[0-9]+$' AND NEW.webpage_url !~ '^https?://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' THEN RAISE EXCEPTION 'Private webpage URL forbidden'; END IF;
  IF NEW.duration IS NULL OR NEW.duration<1 OR NEW.duration>86400 OR NEW.duration<>floor(NEW.duration) OR NEW.size<>0 THEN RAISE EXCEPTION 'Invalid webpage timing'; END IF;
 ELSE
  IF NEW.webpage_url IS NOT NULL THEN RAISE EXCEPTION 'File media cannot carry webpage URL'; END IF;
 END IF;
 RETURN NEW; END $$;
CREATE TRIGGER validate_webpage_media BEFORE INSERT OR UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION public.validate_webpage_media();
CREATE FUNCTION public.manifest_media(m public.media) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$ SELECT jsonb_build_object('id',m.id,'name',m.name,'type',m.type,'size',m.size,'duration',m.duration,'path',m.path,'webpage_url',m.webpage_url,'refresh_minutes',m.refresh_minutes,'webpage_fullscreen',m.webpage_fullscreen) $$;
REVOKE ALL ON FUNCTION public.manifest_media(public.media) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manifest_media(public.media) TO service_role;
CREATE OR REPLACE FUNCTION public.device_content(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; s public.screens; manifest jsonb; BEGIN
 sid=public.device_screen(p_device,p_hash); SELECT * INTO s FROM public.screens WHERE id=sid;
 SELECT jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'media',public.manifest_media(m)) ORDER BY i.position,i.id) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=s.user_id WHERE i.playlist_id=p.id),'[]'::jsonb)) INTO manifest FROM public.playlists p WHERE p.id=s.playlist_id AND p.user_id=s.user_id;
 RETURN jsonb_build_object('screen_id',sid,'assignment_updated_at',s.assignment_updated_at,'playlist',manifest); END $$;
REVOKE ALL ON FUNCTION public.device_content(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_content(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.device_wall(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; result jsonb; BEGIN sid=public.device_screen(p_device,p_hash); SELECT to_jsonb(w)||jsonb_build_object('row_index',ws.row_index,'column_index',ws.column_index,'media',CASE WHEN m.id IS NULL THEN NULL ELSE public.manifest_media(m) END) INTO result FROM public.video_wall_screens ws JOIN public.video_walls w ON w.id=ws.wall_id JOIN public.screens s ON s.id=ws.screen_id AND s.user_id=w.user_id LEFT JOIN public.media m ON m.id=w.media_id AND m.user_id=w.user_id WHERE ws.screen_id=sid; RETURN result-'user_id'; END $$;
REVOKE ALL ON FUNCTION public.device_wall(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_wall(uuid,text) TO service_role;