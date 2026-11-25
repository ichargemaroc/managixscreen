ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS sound_enabled boolean NOT NULL DEFAULT true;
CREATE OR REPLACE FUNCTION public.device_content(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; s public.screens; pid uuid; manifest jsonb; music jsonb; BEGIN
 sid=public.device_screen(p_device,p_hash); SELECT * INTO s FROM public.screens WHERE id=sid;
 pid=COALESCE(public.active_schedule_playlist(sid), s.playlist_id);
 SELECT jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'slide_transition',p.slide_transition,'ticker',p.ticker,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'media',public.manifest_media(m)) ORDER BY i.position,i.id) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=s.user_id WHERE i.playlist_id=p.id),'[]'::jsonb)) INTO manifest FROM public.playlists p WHERE p.id=pid AND p.user_id=s.user_id;
 IF s.sound_enabled THEN
 SELECT jsonb_build_object('id',m.track_id,'name',m.name,'path',m.path,'size',m.size,'enabled',m.enabled,'volume',m.volume,'pause_on_video',m.pause_on_video) INTO music FROM public.playlist_music m WHERE m.playlist_id=pid AND m.user_id=s.user_id;
 END IF;
 RETURN jsonb_build_object('screen_id',sid,'assignment_updated_at',s.assignment_updated_at,'display_rotation',s.display_rotation,'slide_transition',COALESCE(manifest->>'slide_transition','default'),'playlist',manifest,'background_music',music); END $$;
REVOKE ALL ON FUNCTION public.device_content(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_content(uuid,text) TO service_role;