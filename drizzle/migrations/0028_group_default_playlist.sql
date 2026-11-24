ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS playlist_id uuid REFERENCES public.playlists(id) ON DELETE SET NULL;

UPDATE public.groups g SET playlist_id = sub.playlist_id FROM (
  SELECT DISTINCT ON (m.group_id) m.group_id, s.playlist_id FROM public.screen_group_members m JOIN public.screens s ON s.id = m.screen_id
  WHERE s.playlist_id IS NOT NULL ORDER BY m.group_id, s.created_at DESC
) sub WHERE g.id = sub.group_id AND g.playlist_id IS NULL;

CREATE OR REPLACE FUNCTION public.apply_group_playlist_on_screen() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  IF NEW.group_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.group_id IS DISTINCT FROM OLD.group_id) THEN
    SELECT playlist_id INTO v FROM public.groups WHERE id = NEW.group_id AND user_id = NEW.user_id;
    IF v IS NOT NULL THEN NEW.playlist_id := v; END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS screens_apply_group_playlist ON public.screens;
CREATE TRIGGER screens_apply_group_playlist BEFORE INSERT OR UPDATE OF group_id ON public.screens FOR EACH ROW EXECUTE FUNCTION public.apply_group_playlist_on_screen();

CREATE OR REPLACE FUNCTION public.apply_group_playlist_on_member() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  SELECT g.playlist_id INTO v FROM public.groups g JOIN public.screens s ON s.id = NEW.screen_id AND s.user_id = g.user_id WHERE g.id = NEW.group_id;
  IF v IS NOT NULL THEN UPDATE public.screens SET playlist_id = v WHERE id = NEW.screen_id; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS members_apply_group_playlist ON public.screen_group_members;
CREATE TRIGGER members_apply_group_playlist AFTER INSERT ON public.screen_group_members FOR EACH ROW EXECUTE FUNCTION public.apply_group_playlist_on_member();
REVOKE EXECUTE ON FUNCTION public.apply_group_playlist_on_screen() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_group_playlist_on_member() FROM PUBLIC, anon, authenticated;