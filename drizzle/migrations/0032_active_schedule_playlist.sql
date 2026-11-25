ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Casablanca';
CREATE OR REPLACE FUNCTION public.active_schedule_playlist(p_screen uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT x.playlist_id FROM public.schedules x JOIN public.screens s ON s.id=p_screen AND s.user_id=x.user_id
 CROSS JOIN LATERAL (SELECT (now() AT TIME ZONE COALESCE((SELECT name FROM pg_timezone_names WHERE name=x.timezone),'UTC')) AS lt) t
 WHERE ((x.target_type='screen' AND x.target_id=p_screen) OR (x.target_type='group' AND (x.target_id=s.group_id OR EXISTS (SELECT 1 FROM public.screen_group_members g WHERE g.group_id=x.target_id AND g.screen_id=p_screen))))
  AND t.lt::date BETWEEN x.start_date AND x.end_date
  AND (extract(isodow FROM t.lt)::int-1)=ANY(x.days)
  AND t.lt::time>=x.start_time AND t.lt::time<x.end_time
 ORDER BY (x.target_type='screen') DESC, x.created_at DESC LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.active_schedule_playlist(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.active_schedule_playlist(uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.device_content(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; s public.screens; pid uuid; manifest jsonb; music jsonb; BEGIN
 sid=public.device_screen(p_device,p_hash); SELECT * INTO s FROM public.screens WHERE id=sid;
 pid=COALESCE(public.active_schedule_playlist(sid), s.playlist_id);
 SELECT jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'slide_transition',p.slide_transition,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'media',public.manifest_media(m)) ORDER BY i.position,i.id) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=s.user_id WHERE i.playlist_id=p.id),'[]'::jsonb)) INTO manifest FROM public.playlists p WHERE p.id=pid AND p.user_id=s.user_id;
 SELECT jsonb_build_object('id',m.track_id,'name',m.name,'path',m.path,'size',m.size,'enabled',m.enabled,'volume',m.volume,'pause_on_video',m.pause_on_video) INTO music FROM public.playlist_music m WHERE m.playlist_id=pid AND m.user_id=s.user_id;
 IF music IS NULL THEN
 SELECT jsonb_build_object('id',m.track_id,'name',m.name,'path',m.path,'size',m.size,'enabled',m.enabled,'volume',m.volume,'pause_on_video',m.pause_on_video) INTO music FROM public.screen_music m WHERE m.screen_id=sid AND m.user_id=s.user_id;
 END IF;
 RETURN jsonb_build_object('screen_id',sid,'assignment_updated_at',s.assignment_updated_at,'display_rotation',s.display_rotation,'slide_transition',COALESCE(manifest->>'slide_transition','default'),'playlist',manifest,'background_music',music); END $$;
REVOKE ALL ON FUNCTION public.device_content(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_content(uuid,text) TO service_role;