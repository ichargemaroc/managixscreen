CREATE TABLE public.screen_layouts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, name text NOT NULL, zones jsonb NOT NULL, revision bigint NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.screen_layouts TO authenticated; GRANT ALL ON public.screen_layouts TO service_role;
ALTER TABLE public.screen_layouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY layout_owner_read ON public.screen_layouts FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.screen_layout_assignments (screen_id uuid PRIMARY KEY REFERENCES public.screens(id) ON DELETE CASCADE, layout_id uuid NOT NULL REFERENCES public.screen_layouts(id) ON DELETE CASCADE, user_id uuid NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.screen_layout_assignments TO authenticated; GRANT ALL ON public.screen_layout_assignments TO service_role;
ALTER TABLE public.screen_layout_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY assignment_owner_read ON public.screen_layout_assignments FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.save_screen_layout(p_id uuid,p_name text,p_zones jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE result uuid; z jsonb; a jsonb; b jsonb;
BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 80 OR jsonb_typeof(p_zones) IS DISTINCT FROM 'array' OR jsonb_array_length(p_zones) NOT BETWEEN 2 AND 4 THEN RAISE EXCEPTION 'Invalid composition'; END IF;
IF (SELECT count(*) FROM jsonb_array_elements(p_zones) v WHERE COALESCE((v->>'audio')::boolean,false))>1 THEN RAISE EXCEPTION 'One audio zone only'; END IF;
IF (SELECT count(DISTINCT v->>'id') FROM jsonb_array_elements(p_zones) v)<>jsonb_array_length(p_zones) THEN RAISE EXCEPTION 'Invalid zones'; END IF;
FOR z IN SELECT value FROM jsonb_array_elements(p_zones) LOOP
IF z->>'id' IS NULL OR (z->>'x')::numeric IS NULL OR (z->>'y')::numeric IS NULL OR (z->>'width')::numeric IS NULL OR (z->>'height')::numeric IS NULL OR (z->>'x')::numeric<0 OR (z->>'y')::numeric<0 OR (z->>'width')::numeric<0.1 OR (z->>'height')::numeric<0.1 OR (z->>'x')::numeric+(z->>'width')::numeric>1.000001 OR (z->>'y')::numeric+(z->>'height')::numeric>1.000001 THEN RAISE EXCEPTION 'Invalid rectangle'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.playlists WHERE id=(z->>'playlist_id')::uuid AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Playlist forbidden'; END IF;
END LOOP;
FOR a IN SELECT value FROM jsonb_array_elements(p_zones) LOOP FOR b IN SELECT value FROM jsonb_array_elements(p_zones) LOOP
IF a->>'id'<>b->>'id' AND (a->>'x')::numeric<(b->>'x')::numeric+(b->>'width')::numeric-0.000001 AND (b->>'x')::numeric<(a->>'x')::numeric+(a->>'width')::numeric-0.000001 AND (a->>'y')::numeric<(b->>'y')::numeric+(b->>'height')::numeric-0.000001 AND (b->>'y')::numeric<(a->>'y')::numeric+(a->>'height')::numeric-0.000001 THEN RAISE EXCEPTION 'Overlapping zones'; END IF;
END LOOP; END LOOP;
IF p_id IS NULL THEN INSERT INTO public.screen_layouts(user_id,name,zones) VALUES(auth.uid(),trim(p_name),p_zones) RETURNING id INTO result;
ELSE UPDATE public.screen_layouts SET name=trim(p_name),zones=p_zones,revision=revision+1,updated_at=now() WHERE id=p_id AND user_id=auth.uid() RETURNING id INTO result; IF result IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF; END IF; RETURN result;
END $$;
CREATE FUNCTION public.assign_screen_layout(p_screen uuid,p_layout uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
PERFORM 1 FROM public.screens WHERE id=p_screen AND user_id=auth.uid() FOR UPDATE; IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF p_layout IS NULL THEN DELETE FROM public.screen_layout_assignments WHERE screen_id=p_screen AND user_id=auth.uid(); RETURN; END IF;
IF NOT EXISTS(SELECT 1 FROM public.screen_entitlements WHERE screen_id=p_screen AND user_id=auth.uid() AND active) THEN RAISE EXCEPTION 'Screen disabled'; END IF;
IF NOT EXISTS(SELECT 1 FROM public.screen_layouts WHERE id=p_layout AND user_id=auth.uid()) THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF EXISTS(SELECT 1 FROM public.video_wall_screens WHERE screen_id=p_screen) THEN RAISE EXCEPTION 'Screen assigned to wall'; END IF;
INSERT INTO public.screen_layout_assignments(screen_id,layout_id,user_id) VALUES(p_screen,p_layout,auth.uid()) ON CONFLICT(screen_id) DO UPDATE SET layout_id=excluded.layout_id,updated_at=now();
END $$;
CREATE FUNCTION public.prevent_wall_layout_conflict() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM 1 FROM public.screens WHERE id=NEW.screen_id FOR UPDATE; IF EXISTS(SELECT 1 FROM public.screen_layout_assignments WHERE screen_id=NEW.screen_id) THEN RAISE EXCEPTION 'Screen assigned to composition'; END IF; RETURN NEW; END $$;
CREATE TRIGGER wall_layout_conflict BEFORE INSERT OR UPDATE ON public.video_wall_screens FOR EACH ROW EXECUTE FUNCTION public.prevent_wall_layout_conflict();
CREATE FUNCTION public.device_layout(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE sid uuid; l public.screen_layouts; result jsonb;
BEGIN sid:=public.device_screen(p_device,p_hash); SELECT x.* INTO l FROM public.screen_layout_assignments a JOIN public.screen_layouts x ON x.id=a.layout_id JOIN public.screens s ON s.id=a.screen_id AND s.user_id=x.user_id WHERE a.screen_id=sid;
IF NOT FOUND THEN RETURN NULL; END IF;
SELECT jsonb_agg(z || jsonb_build_object('playlist',CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('id',p.id,'name',p.name,'updated_at',p.updated_at,'items',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',i.id,'position',i.position,'display_duration',i.duration,'media',public.manifest_media(m)) ORDER BY i.position) FROM public.playlist_items i JOIN public.media m ON m.id=i.media_id AND m.user_id=l.user_id WHERE i.playlist_id=p.id),'[]'::jsonb)) END)) INTO result FROM jsonb_array_elements(l.zones) z LEFT JOIN public.playlists p ON p.id=(z->>'playlist_id')::uuid AND p.user_id=l.user_id;
RETURN jsonb_build_object('id',l.id,'name',l.name,'revision',l.revision,'zones',result); END $$;
REVOKE ALL ON FUNCTION public.save_screen_layout(uuid,text,jsonb), public.assign_screen_layout(uuid,uuid) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.save_screen_layout(uuid,text,jsonb),public.assign_screen_layout(uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.device_layout(uuid,text) FROM PUBLIC,anon,authenticated; GRANT EXECUTE ON FUNCTION public.device_layout(uuid,text) TO service_role;
REVOKE ALL ON FUNCTION public.prevent_wall_layout_conflict() FROM PUBLIC,anon,authenticated;