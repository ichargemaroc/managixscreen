CREATE OR REPLACE FUNCTION public.replace_playlist_items(p_playlist_id uuid,p_items jsonb) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$
DECLARE previous jsonb; v_entry jsonb; old jsonb; entry_id uuid; used uuid[]:='{}'::uuid[]; position_index int:=0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM 1 FROM public.playlists WHERE id=p_playlist_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items)>1000 THEN RAISE EXCEPTION 'Invalid items'; END IF;
 SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.position,i.id),'[]'::jsonb) INTO previous FROM public.playlist_items i WHERE i.playlist_id=p_playlist_id;
 DELETE FROM public.playlist_items WHERE playlist_id=p_playlist_id;
 FOR v_entry IN SELECT x FROM jsonb_array_elements(p_items) x LOOP
  IF NOT EXISTS(SELECT 1 FROM public.media WHERE id=(v_entry->>'mediaId')::uuid AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Media inaccessible'; END IF;
  IF v_entry->>'id' IS NOT NULL THEN
   entry_id:=(v_entry->>'id')::uuid;
   SELECT x INTO old FROM jsonb_array_elements(previous) x WHERE x->>'id'=entry_id::text AND x->>'media_id'=v_entry->>'mediaId';
  ELSE
   SELECT x INTO old FROM jsonb_array_elements(previous) x WHERE x->>'media_id'=v_entry->>'mediaId' AND NOT((x->>'id')::uuid=ANY(used)) LIMIT 1;
   entry_id:=COALESCE((old->>'id')::uuid,gen_random_uuid());
  END IF;
  IF entry_id=ANY(used) THEN RAISE EXCEPTION 'Duplicate item identity'; END IF;
  used:=array_append(used,entry_id);
  INSERT INTO public.playlist_items(id,playlist_id,media_id,duration,position,playback_schedule,slide_transition)
  VALUES(entry_id,p_playlist_id,(v_entry->>'mediaId')::uuid,(v_entry->>'duration')::int,position_index,
   CASE WHEN v_entry ? 'schedule' THEN NULLIF(v_entry->'schedule','null'::jsonb) ELSE NULLIF(old->'playback_schedule','null'::jsonb) END,
   CASE WHEN v_entry ? 'transition' THEN v_entry->>'transition' ELSE old->>'slide_transition' END);
  position_index:=position_index+1;
 END LOOP;
 UPDATE public.playlists SET updated_at=now() WHERE id=p_playlist_id;
END; $$;