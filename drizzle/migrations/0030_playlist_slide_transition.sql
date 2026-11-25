ALTER TABLE public.playlists ADD COLUMN slide_transition text NOT NULL DEFAULT 'default' CHECK (slide_transition IN ('default','fade','zoom','spin','slide-right','slide-left','bounce','scale','rotate','blink','random'));
UPDATE public.playlists p SET slide_transition=COALESCE((SELECT s.slide_transition FROM public.screens s WHERE s.playlist_id=p.id AND s.user_id=p.user_id AND s.slide_transition<>'default' ORDER BY s.assignment_updated_at DESC,s.id LIMIT 1),'default');
COMMENT ON COLUMN public.screens.slide_transition IS 'DEPRECATED: replaced by playlists.slide_transition; retained for legacy clients.';
CREATE OR REPLACE FUNCTION public.device_content(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; s public.screens; manifest jsonb; music jsonb; BEGIN
 sid=public.device_screen(p_device,p_hash); SELECT * INTO s FROM public.screens WHERE id=sid;
 SELECT jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'slide_transition',p.slide_transition,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'media',public.manifest_media(m)) ORDER BY i.position,i.id) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=s.user_id WHERE i.playlist_id=p.id),'[]'::jsonb)) INTO manifest FROM public.playlists p WHERE p.id=s.playlist_id AND p.user_id=s.user_id;
 SELECT jsonb_build_object('id',m.track_id,'name',m.name,'path',m.path,'size',m.size,'enabled',m.enabled,'volume',m.volume,'pause_on_video',m.pause_on_video) INTO music FROM public.playlist_music m WHERE m.playlist_id=s.playlist_id AND m.user_id=s.user_id;
 IF music IS NULL THEN
 SELECT jsonb_build_object('id',m.track_id,'name',m.name,'path',m.path,'size',m.size,'enabled',m.enabled,'volume',m.volume,'pause_on_video',m.pause_on_video) INTO music FROM public.screen_music m WHERE m.screen_id=sid AND m.user_id=s.user_id;
 END IF;
 RETURN jsonb_build_object('screen_id',sid,'assignment_updated_at',s.assignment_updated_at,'display_rotation',s.display_rotation,'slide_transition',COALESCE(manifest->>'slide_transition','default'),'playlist',manifest,'background_music',music); END $$;
REVOKE ALL ON FUNCTION public.device_content(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_content(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.device_layout(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; l public.screen_layouts; result jsonb;
BEGIN sid:=public.device_screen(p_device,p_hash); SELECT x.* INTO l FROM public.screen_layout_assignments a JOIN public.screen_layouts x ON x.id=a.layout_id JOIN public.screens s ON s.id=a.screen_id AND s.user_id=x.user_id WHERE a.screen_id=sid;
IF NOT FOUND THEN RETURN NULL; END IF;
SELECT jsonb_agg(z || jsonb_build_object('playlist',CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'slide_transition',p.slide_transition,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'media',public.manifest_media(m)) ORDER BY i.position) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=l.user_id WHERE i.playlist_id=p.id),'[]'::jsonb)) END)) INTO result FROM jsonb_array_elements(l.zones) z LEFT JOIN public.playlists p ON p.id=(z->>'playlist_id')::uuid AND p.user_id=l.user_id;
RETURN jsonb_build_object('id',l.id,'name',l.name,'revision',l.revision,'zones',result); END $$;
REVOKE ALL ON FUNCTION public.device_layout(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_layout(uuid,text) TO service_role;