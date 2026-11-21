ALTER TABLE public.video_wall_screens ADD COLUMN assigned_at timestamptz;
ALTER TABLE public.video_wall_screens ALTER COLUMN assigned_at SET DEFAULT now();
COMMENT ON COLUMN public.video_wall_screens.assigned_at IS 'Actual assignment time; NULL for historical assignments with unknown date.';
CREATE OR REPLACE FUNCTION public.save_video_wall(p_id uuid,p_config jsonb,p_members jsonb) RETURNS uuid LANGUAGE plpgsql SET search_path=public AS $$
DECLARE wid uuid; previous jsonb; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
IF p_id IS NULL THEN INSERT INTO public.video_walls(user_id,name) VALUES(auth.uid(),p_config->>'name') RETURNING id INTO wid;
ELSE SELECT id INTO wid FROM public.video_walls WHERE id=p_id AND user_id=auth.uid() FOR UPDATE; IF wid IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF; END IF;
SELECT COALESCE(jsonb_agg(to_jsonb(ws)), '[]'::jsonb) INTO previous FROM public.video_wall_screens ws WHERE wall_id=wid;
DELETE FROM public.video_wall_screens WHERE wall_id=wid;
UPDATE public.video_walls SET name=p_config->>'name',columns=(p_config->>'columns')::int,rows=(p_config->>'rows')::int,width=(p_config->>'width')::int,height=(p_config->>'height')::int,gap_x=(p_config->>'gap_x')::int,gap_y=(p_config->>'gap_y')::int,orientation=p_config->>'orientation',media_id=NULLIF(p_config->>'media_id','')::uuid WHERE id=wid;
INSERT INTO public.video_wall_screens(wall_id,screen_id,row_index,column_index,assigned_at)
SELECT wid,(x->>'screen_id')::uuid,(x->>'row_index')::int,(x->>'column_index')::int,
CASE WHEN old.item IS NOT NULL THEN (old.item->>'assigned_at')::timestamptz ELSE now() END
FROM jsonb_array_elements(p_members) x
LEFT JOIN LATERAL (SELECT item FROM jsonb_array_elements(previous) item WHERE item->>'screen_id'=x->>'screen_id' AND item->>'row_index'=x->>'row_index' AND item->>'column_index'=x->>'column_index') old ON true;
RETURN wid; END $$;