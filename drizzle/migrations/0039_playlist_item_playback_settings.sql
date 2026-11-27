ALTER TABLE public.playlist_items ADD COLUMN playback_schedule jsonb DEFAULT NULL, ADD COLUMN slide_transition text DEFAULT NULL;
ALTER TABLE public.playlist_items ADD CONSTRAINT playlist_item_transition_allowed CHECK (slide_transition IS NULL OR slide_transition IN ('default','fade','zoom','spin','slide-right','slide-left','bounce','scale','rotate','blink','random'));
CREATE OR REPLACE FUNCTION public.validate_playlist_item_schedule() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE j jsonb:=NEW.playback_schedule; d jsonb; p jsonb; v text;
BEGIN
 IF j IS NULL THEN RETURN NEW; END IF;
 d:=j->'daily'; p:=j->'periodic';
 IF jsonb_typeof(j)<>'object' OR NOT(j ?& ARRAY['timezone','daily','periodic']) OR NOT EXISTS(SELECT 1 FROM pg_timezone_names WHERE name=j->>'timezone') OR jsonb_typeof(d)<>'object' OR jsonb_typeof(p)<>'object' OR NOT(d ?& ARRAY['enabled','start','end']) OR NOT(p ?& ARRAY['enabled','startDate','endDate','days']) OR jsonb_typeof(d->'enabled')<>'boolean' OR jsonb_typeof(p->'enabled')<>'boolean' OR (d->>'start') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR (d->>'end') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' OR jsonb_typeof(p->'days')<>'array' THEN RAISE EXCEPTION 'Invalid item schedule'; END IF;
 IF (d->>'enabled')::boolean AND d->>'start'=d->>'end' THEN RAISE EXCEPTION 'Invalid daily window'; END IF;
 IF jsonb_array_length(p->'days')>7 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p->'days') x WHERE jsonb_typeof(x)<>'number' OR x::text !~ '^[0-6]$') THEN RAISE EXCEPTION 'Invalid weekdays'; END IF;
 FOREACH v IN ARRAY ARRAY[p->>'startDate',p->>'endDate'] LOOP
  IF v IS NOT NULL AND (v !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR to_char(v::date,'YYYY-MM-DD')<>v) THEN RAISE EXCEPTION 'Invalid date'; END IF;
 END LOOP;
 IF (p->>'enabled')::boolean AND (p->>'startDate' IS NULL OR p->>'endDate' IS NULL OR (p->>'startDate')::date>(p->>'endDate')::date OR jsonb_array_length(p->'days')=0) THEN RAISE EXCEPTION 'Invalid periodic window'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_playlist_item_schedule() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_playlist_item_schedule BEFORE INSERT OR UPDATE ON public.playlist_items FOR EACH ROW EXECUTE FUNCTION public.validate_playlist_item_schedule();
CREATE OR REPLACE FUNCTION public.replace_playlist_items(p_playlist_id uuid,p_items jsonb) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE previous jsonb; value jsonb; old jsonb; entry_id uuid; used uuid[]:='{}'::uuid[]; position_index int:=0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM 1 FROM public.playlists WHERE id=p_playlist_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)>1000 THEN RAISE EXCEPTION 'Invalid items'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.position,i.id),'[]'::jsonb) INTO previous FROM public.playlist_items i WHERE i.playlist_id=p_playlist_id;
 DELETE FROM public.playlist_items WHERE playlist_id=p_playlist_id;
 FOR value IN SELECT x FROM jsonb_array_elements(p_items) x LOOP
  IF NOT EXISTS(SELECT 1 FROM public.media WHERE id=(value->>'mediaId')::uuid AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Media inaccessible'; END IF;
  IF value->>'id' IS NOT NULL THEN
   entry_id:=(value->>'id')::uuid;
   SELECT x INTO old FROM jsonb_array_elements(previous) x WHERE x->>'id'=entry_id::text AND x->>'media_id'=value->>'mediaId';
  ELSE
   SELECT x INTO old FROM jsonb_array_elements(previous) x WHERE x->>'media_id'=value->>'mediaId' AND NOT((x->>'id')::uuid=ANY(used)) LIMIT 1;
   entry_id:=COALESCE((old->>'id')::uuid,gen_random_uuid());
  END IF;
  IF entry_id=ANY(used) THEN RAISE EXCEPTION 'Duplicate item identity'; END IF;
  used:=array_append(used,entry_id);
  INSERT INTO public.playlist_items(id,playlist_id,media_id,duration,position,playback_schedule,slide_transition)
  VALUES(entry_id,p_playlist_id,(value->>'mediaId')::uuid,(value->>'duration')::int,position_index,
   CASE WHEN value ? 'schedule' THEN NULLIF(value->'schedule','null'::jsonb) ELSE NULLIF(old->'playback_schedule','null'::jsonb) END,
   CASE WHEN value ? 'transition' THEN value->>'transition' ELSE old->>'slide_transition' END);
  position_index:=position_index+1;
 END LOOP;
 UPDATE public.playlists SET updated_at=now() WHERE id=p_playlist_id;
END; $$;
REVOKE ALL ON FUNCTION public.replace_playlist_items(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_playlist_items(uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.manifest_playlist(p_id uuid,p_owner uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path=public AS $$
 SELECT jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'slide_transition',p.slide_transition,'ticker',p.ticker,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'schedule',i.playback_schedule,'transition',i.slide_transition,'media',public.manifest_media(m)) ORDER BY i.position,i.id) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=p_owner WHERE i.playlist_id=p.id),'[]'::jsonb)) FROM public.playlists p WHERE p.id=p_id AND p.user_id=p_owner;
$$;
REVOKE ALL ON FUNCTION public.manifest_playlist(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.manifest_playlist(uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.device_content(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; s public.screens; pid uuid; manifest jsonb; music jsonb;
BEGIN
 sid:=public.device_screen(p_device,p_hash); SELECT * INTO s FROM public.screens WHERE id=sid;
 pid:=COALESCE(public.active_schedule_playlist(sid),s.playlist_id); manifest:=public.manifest_playlist(pid,s.user_id);
 IF s.sound_enabled THEN SELECT jsonb_build_object('id',m.track_id,'name',m.name,'path',m.path,'size',m.size,'enabled',m.enabled,'volume',m.volume,'pause_on_video',m.pause_on_video) INTO music FROM public.playlist_music m WHERE m.playlist_id=pid AND m.user_id=s.user_id; END IF;
 RETURN jsonb_build_object('screen_id',sid,'assignment_updated_at',s.assignment_updated_at,'display_rotation',s.display_rotation,'slide_transition',COALESCE(manifest->>'slide_transition','default'),'playlist',manifest,'background_music',music);
END; $$;
REVOKE ALL ON FUNCTION public.device_content(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_content(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.device_layout(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; l public.screen_layouts; result jsonb;
BEGIN
 sid:=public.device_screen(p_device,p_hash);
 SELECT x.* INTO l FROM public.screen_layout_assignments a JOIN public.screen_layouts x ON x.id=a.layout_id JOIN public.screens s ON s.id=a.screen_id AND s.user_id=x.user_id WHERE a.screen_id=sid;
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT jsonb_agg(z || jsonb_build_object('playlist',public.manifest_playlist((z->>'playlist_id')::uuid,l.user_id))) INTO result FROM jsonb_array_elements(l.zones) z;
 RETURN jsonb_build_object('id',l.id,'name',l.name,'revision',l.revision,'zones',result);
END; $$;
REVOKE ALL ON FUNCTION public.device_layout(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.device_layout(uuid,text) TO service_role;