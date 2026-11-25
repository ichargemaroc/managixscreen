CREATE FUNCTION public.replace_playlist_assignments(p_playlist uuid,p_groups uuid[],p_screens uuid[]) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE owner_id uuid:=auth.uid(); target_ids uuid[]; changed_ids uuid[];
BEGIN
 IF owner_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.playlists WHERE id=p_playlist AND user_id=owner_id) THEN RAISE EXCEPTION 'Playlist inaccessible'; END IF;
 PERFORM 1 FROM public.groups WHERE user_id=owner_id ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.screens WHERE user_id=owner_id ORDER BY id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM unnest(COALESCE(p_groups,'{}'::uuid[])) x WHERE NOT EXISTS(SELECT 1 FROM public.groups g WHERE g.id=x AND g.user_id=owner_id)) OR EXISTS(SELECT 1 FROM unnest(COALESCE(p_screens,'{}'::uuid[])) x WHERE NOT EXISTS(SELECT 1 FROM public.screens s WHERE s.id=x AND s.user_id=owner_id)) THEN RAISE EXCEPTION 'Assignment inaccessible'; END IF;
 SELECT COALESCE(array_agg(DISTINCT s.id),'{}'::uuid[]) INTO target_ids FROM public.screens s WHERE s.user_id=owner_id AND (s.id=ANY(COALESCE(p_screens,'{}'::uuid[])) OR s.group_id=ANY(COALESCE(p_groups,'{}'::uuid[])) OR EXISTS(SELECT 1 FROM public.screen_group_members m WHERE m.screen_id=s.id AND m.group_id=ANY(COALESCE(p_groups,'{}'::uuid[]))));
 SELECT COALESCE(array_agg(s.id),'{}'::uuid[]) INTO changed_ids FROM public.screens s WHERE s.user_id=owner_id AND ((s.id=ANY(target_ids) AND s.playlist_id IS DISTINCT FROM p_playlist) OR (s.playlist_id=p_playlist AND NOT s.id=ANY(target_ids)));
 UPDATE public.groups SET playlist_id=NULL WHERE user_id=owner_id AND playlist_id=p_playlist AND NOT id=ANY(COALESCE(p_groups,'{}'::uuid[]));
 UPDATE public.groups SET playlist_id=p_playlist WHERE user_id=owner_id AND id=ANY(COALESCE(p_groups,'{}'::uuid[])) AND playlist_id IS DISTINCT FROM p_playlist;
 UPDATE public.screens SET playlist_id=NULL WHERE user_id=owner_id AND playlist_id=p_playlist AND NOT id=ANY(target_ids);
 UPDATE public.screens SET playlist_id=p_playlist WHERE user_id=owner_id AND id=ANY(target_ids) AND playlist_id IS DISTINCT FROM p_playlist;
 RETURN jsonb_build_object('count',cardinality(target_ids),'screen_ids',to_jsonb(changed_ids));
END $$;
REVOKE ALL ON FUNCTION public.replace_playlist_assignments(uuid,uuid[],uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replace_playlist_assignments(uuid,uuid[],uuid[]) TO authenticated;