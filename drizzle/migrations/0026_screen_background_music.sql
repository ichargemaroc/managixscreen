CREATE TABLE public.screen_music (
 screen_id uuid PRIMARY KEY REFERENCES public.screens(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 track_id uuid NOT NULL,
 name text NOT NULL CHECK (length(name) BETWEEN 1 AND 255),
 path text NOT NULL CHECK (path = user_id::text || '/' || track_id::text || '.mp3'),
 size bigint NOT NULL CHECK (size > 0 AND size <= 52428800),
 enabled boolean NOT NULL DEFAULT true,
 volume integer NOT NULL DEFAULT 50 CHECK (volume BETWEEN 0 AND 100),
 pause_on_video boolean NOT NULL DEFAULT true
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.screen_music TO authenticated;
GRANT ALL ON public.screen_music TO service_role;
ALTER TABLE public.screen_music ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages screen music" ON public.screen_music FOR ALL TO authenticated USING (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.screens s WHERE s.id=screen_id AND s.user_id=auth.uid())) WITH CHECK (user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.screens s WHERE s.id=screen_id AND s.user_id=auth.uid()));
CREATE OR REPLACE FUNCTION public.device_content(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE sid uuid; s public.screens; manifest jsonb; music jsonb; BEGIN
 sid=public.device_screen(p_device,p_hash); SELECT * INTO s FROM public.screens WHERE id=sid;
 SELECT jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'media',public.manifest_media(m)) ORDER BY i.position,i.id) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=s.user_id WHERE i.playlist_id=p.id),'[]'::jsonb)) INTO manifest FROM public.playlists p WHERE p.id=s.playlist_id AND p.user_id=s.user_id;
 SELECT jsonb_build_object('id',m.track_id,'name',m.name,'path',m.path,'size',m.size,'enabled',m.enabled,'volume',m.volume,'pause_on_video',m.pause_on_video) INTO music FROM public.screen_music m WHERE m.screen_id=sid AND m.user_id=s.user_id;
 RETURN jsonb_build_object('screen_id',sid,'assignment_updated_at',s.assignment_updated_at,'display_rotation',s.display_rotation,'slide_transition',s.slide_transition,'playlist',manifest,'background_music',music); END $$;
REVOKE ALL ON FUNCTION public.device_content(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_content(uuid,text) TO service_role;