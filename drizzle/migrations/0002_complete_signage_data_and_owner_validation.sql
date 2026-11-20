ALTER TABLE public.profiles ADD COLUMN email text;
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE p.id = u.id;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles(id, full_name, email) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email); RETURN NEW; END; $$;
ALTER TABLE public.screens ADD COLUMN location text NOT NULL DEFAULT '', ADD COLUMN current_playlist_id uuid GENERATED ALWAYS AS (playlist_id) STORED;
ALTER TABLE public.media ADD COLUMN file_path text GENERATED ALWAYS AS (path) STORED, ADD COLUMN file_type text GENERATED ALWAYS AS (type) STORED, ADD COLUMN file_size bigint GENERATED ALWAYS AS (size) STORED;
ALTER TABLE public.playlists ADD COLUMN description text NOT NULL DEFAULT '', ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.playlist_items ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
CREATE VIEW public.screen_groups WITH (security_invoker = true) AS SELECT * FROM public.groups;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screen_groups TO authenticated;
GRANT ALL ON public.screen_groups TO service_role;
CREATE TABLE public.screen_group_members(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE, screen_id uuid NOT NULL REFERENCES public.screens(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(group_id, screen_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screen_group_members TO authenticated;
GRANT ALL ON public.screen_group_members TO service_role;
ALTER TABLE public.screen_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage group members" ON public.screen_group_members FOR ALL TO authenticated USING (EXISTS(SELECT 1 FROM public.groups g WHERE g.id=group_id AND g.user_id=auth.uid()) AND EXISTS(SELECT 1 FROM public.screens s WHERE s.id=screen_id AND s.user_id=auth.uid())) WITH CHECK (EXISTS(SELECT 1 FROM public.groups g WHERE g.id=group_id AND g.user_id=auth.uid()) AND EXISTS(SELECT 1 FROM public.screens s WHERE s.id=screen_id AND s.user_id=auth.uid()));
INSERT INTO public.screen_group_members(group_id,screen_id) SELECT group_id,id FROM public.screens WHERE group_id IS NOT NULL;
CREATE FUNCTION public.sync_screen_group() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF TG_OP='UPDATE' AND OLD.group_id IS DISTINCT FROM NEW.group_id THEN DELETE FROM public.screen_group_members WHERE screen_id=NEW.id AND group_id=OLD.group_id; END IF; IF NEW.group_id IS NOT NULL THEN INSERT INTO public.screen_group_members(group_id,screen_id) VALUES(NEW.group_id,NEW.id) ON CONFLICT DO NOTHING; END IF; RETURN NEW; END; $$;
CREATE TRIGGER sync_screen_group AFTER INSERT OR UPDATE OF group_id ON public.screens FOR EACH ROW EXECUTE FUNCTION public.sync_screen_group();
ALTER TABLE public.schedules ADD COLUMN screen_id uuid REFERENCES public.screens(id) ON DELETE CASCADE, ADD COLUMN group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE, ADD COLUMN start_datetime timestamptz, ADD COLUMN end_datetime timestamptz;
UPDATE public.schedules SET screen_id=CASE WHEN target_type='screen' THEN target_id END, group_id=CASE WHEN target_type='group' THEN target_id END, start_datetime=(start_date+start_time) AT TIME ZONE 'UTC', end_datetime=(end_date+end_time) AT TIME ZONE 'UTC';
CREATE FUNCTION public.validate_signage_owner() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF TG_TABLE_NAME='screens' THEN
 IF NEW.group_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.groups WHERE id=NEW.group_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Invalid group owner'; END IF;
 IF NEW.playlist_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.playlists WHERE id=NEW.playlist_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Invalid playlist owner'; END IF;
 IF auth.uid() IS NOT NULL THEN
  IF TG_OP='INSERT' AND (NEW.status <> 'pending' OR NEW.last_seen IS NOT NULL) THEN RAISE EXCEPTION 'Device heartbeat required'; END IF;
  IF TG_OP='UPDATE' AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.last_seen IS DISTINCT FROM OLD.last_seen) THEN RAISE EXCEPTION 'Device heartbeat required'; END IF;
 END IF;
ELSIF TG_TABLE_NAME='media' THEN
 IF split_part(NEW.path,'/',1) <> NEW.user_id::text THEN RAISE EXCEPTION 'Invalid media owner'; END IF;
ELSIF TG_TABLE_NAME='playlist_items' THEN
 IF NOT EXISTS(SELECT 1 FROM public.playlists p JOIN public.media m ON m.user_id=p.user_id WHERE p.id=NEW.playlist_id AND m.id=NEW.media_id) THEN RAISE EXCEPTION 'Invalid media owner'; END IF;
 IF NEW.duration < 1 OR NEW.position < 0 THEN RAISE EXCEPTION 'Invalid playlist item'; END IF;
ELSIF TG_TABLE_NAME='schedules' THEN
 IF NOT EXISTS(SELECT 1 FROM public.playlists WHERE id=NEW.playlist_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Invalid playlist owner'; END IF;
 IF NEW.target_type='screen' THEN
  IF NOT EXISTS(SELECT 1 FROM public.screens WHERE id=NEW.target_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Invalid screen owner'; END IF;
  NEW.screen_id=NEW.target_id; NEW.group_id=NULL;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.groups WHERE id=NEW.target_id AND user_id=NEW.user_id) THEN RAISE EXCEPTION 'Invalid group owner'; END IF;
  NEW.group_id=NEW.target_id; NEW.screen_id=NULL;
 END IF;
 IF NEW.start_date > NEW.end_date OR NEW.start_time >= NEW.end_time OR cardinality(NEW.days)=0 THEN RAISE EXCEPTION 'Invalid schedule period'; END IF;
 IF NEW.start_datetime IS NULL THEN NEW.start_datetime=(NEW.start_date+NEW.start_time) AT TIME ZONE 'UTC'; END IF;
 IF NEW.end_datetime IS NULL THEN NEW.end_datetime=(NEW.end_date+NEW.end_time) AT TIME ZONE 'UTC'; END IF;
 IF NEW.end_datetime <= NEW.start_datetime THEN RAISE EXCEPTION 'Invalid schedule period'; END IF;
END IF; RETURN NEW; END; $$;
CREATE TRIGGER validate_screen_owner BEFORE INSERT OR UPDATE ON public.screens FOR EACH ROW EXECUTE FUNCTION public.validate_signage_owner();
CREATE TRIGGER validate_media_owner BEFORE INSERT OR UPDATE ON public.media FOR EACH ROW EXECUTE FUNCTION public.validate_signage_owner();
CREATE TRIGGER validate_item_owner BEFORE INSERT OR UPDATE ON public.playlist_items FOR EACH ROW EXECUTE FUNCTION public.validate_signage_owner();
CREATE TRIGGER validate_schedule_owner BEFORE INSERT OR UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION public.validate_signage_owner();
CREATE FUNCTION public.touch_playlist() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
CREATE TRIGGER touch_playlist BEFORE UPDATE ON public.playlists FOR EACH ROW EXECUTE FUNCTION public.touch_playlist();
CREATE FUNCTION public.replace_playlist_items(p_playlist_id uuid, p_items jsonb) RETURNS void LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 PERFORM 1 FROM public.playlists WHERE id=p_playlist_id AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
 DELETE FROM public.playlist_items WHERE playlist_id=p_playlist_id;
 INSERT INTO public.playlist_items(playlist_id,media_id,duration,position) SELECT p_playlist_id,(x.item->>'mediaId')::uuid,(x.item->>'duration')::integer,(x.ordinality-1)::integer FROM jsonb_array_elements(p_items) WITH ORDINALITY AS x(item,ordinality);
 UPDATE public.playlists SET updated_at=now() WHERE id=p_playlist_id;
END; $$;
REVOKE ALL ON FUNCTION public.replace_playlist_items(uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_playlist_items(uuid,jsonb) TO authenticated;