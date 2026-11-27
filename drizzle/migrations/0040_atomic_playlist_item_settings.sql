CREATE OR REPLACE FUNCTION public.touch_playlist_item_settings() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.playback_schedule IS DISTINCT FROM OLD.playback_schedule OR NEW.slide_transition IS DISTINCT FROM OLD.slide_transition THEN UPDATE public.playlists SET updated_at=now() WHERE id=NEW.playlist_id; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.touch_playlist_item_settings() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER touch_playlist_item_settings AFTER UPDATE OF playback_schedule,slide_transition ON public.playlist_items FOR EACH ROW EXECUTE FUNCTION public.touch_playlist_item_settings();
CREATE OR REPLACE FUNCTION public.validate_playlist_item_schedule_shape() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE j jsonb:=NEW.playback_schedule;
BEGIN
 IF j IS NULL THEN RETURN NEW; END IF;
 IF jsonb_typeof(j->'timezone') IS DISTINCT FROM 'string' OR jsonb_typeof(j->'daily'->'start') IS DISTINCT FROM 'string' OR jsonb_typeof(j->'daily'->'end') IS DISTINCT FROM 'string' OR COALESCE(jsonb_typeof(j->'periodic'->'startDate'),'missing') NOT IN ('string','null') OR COALESCE(jsonb_typeof(j->'periodic'->'endDate'),'missing') NOT IN ('string','null') THEN RAISE EXCEPTION 'Invalid schedule fields'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_playlist_item_schedule_shape() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_playlist_item_schedule_shape BEFORE INSERT OR UPDATE ON public.playlist_items FOR EACH ROW EXECUTE FUNCTION public.validate_playlist_item_schedule_shape();