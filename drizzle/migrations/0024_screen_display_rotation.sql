ALTER TABLE public.screens ADD COLUMN display_rotation integer NOT NULL DEFAULT 0 CHECK (display_rotation IN (0,90,180,270));
COMMENT ON COLUMN public.screens.display_rotation IS 'Clockwise physical display rotation in degrees; separate from media animation.';
CREATE OR REPLACE FUNCTION public.device_content(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; s public.screens; manifest jsonb; BEGIN
 sid=public.device_screen(p_device,p_hash); SELECT * INTO s FROM public.screens WHERE id=sid;
 SELECT jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'media',public.manifest_media(m)) ORDER BY i.position,i.id) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=s.user_id WHERE i.playlist_id=p.id),'[]'::jsonb)) INTO manifest FROM public.playlists p WHERE p.id=s.playlist_id AND p.user_id=s.user_id;
 RETURN jsonb_build_object('screen_id',sid,'assignment_updated_at',s.assignment_updated_at,'display_rotation',s.display_rotation,'playlist',manifest); END $$;
REVOKE ALL ON FUNCTION public.device_content(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_content(uuid,text) TO service_role;