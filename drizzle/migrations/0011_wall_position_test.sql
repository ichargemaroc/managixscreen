ALTER TABLE public.device_commands ADD COLUMN wall_id uuid REFERENCES public.video_walls(id) ON DELETE SET NULL, ADD COLUMN test_id uuid, ADD COLUMN payload jsonb;
ALTER TABLE public.device_commands DROP CONSTRAINT device_commands_command_check;
ALTER TABLE public.device_commands ADD CONSTRAINT device_commands_command_check CHECK (command IN ('refresh_content','reload_playlist','restart_player','clear_cache','position_test','stop_position_test'));
CREATE INDEX device_commands_wall_test ON public.device_commands(wall_id,created_at DESC) WHERE test_id IS NOT NULL;
CREATE FUNCTION public.control_wall_position_test(p_wall uuid,p_action text,p_duration integer DEFAULT 60) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE w public.video_walls; tid uuid; until_at timestamptz; target record; did uuid; failure text; cid uuid;
BEGIN
 IF auth.uid() IS NULL OR p_action NOT IN ('start','stop') OR p_duration NOT BETWEEN 10 AND 300 THEN RAISE EXCEPTION 'Invalid request'; END IF;
 SELECT * INTO w FROM public.video_walls WHERE id=p_wall AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
 IF p_action='start' AND NOT EXISTS(SELECT 1 FROM public.video_wall_screens WHERE wall_id=p_wall) THEN RAISE EXCEPTION 'No screens'; END IF;
 tid=gen_random_uuid(); until_at=now()+make_interval(secs=>CASE WHEN p_action='start' THEN p_duration ELSE 60 END);
 UPDATE public.device_commands SET status='expired' WHERE wall_id=p_wall AND command IN ('position_test','stop_position_test') AND status IN ('pending','delivered');
 FOR target IN
  SELECT s.id,s.name,s.status,s.last_seen,m.row_index,m.column_index FROM public.screens s LEFT JOIN public.video_wall_screens m ON m.screen_id=s.id AND m.wall_id=p_wall
  WHERE s.user_id=auth.uid() AND (m.wall_id=p_wall OR (p_action='stop' AND EXISTS(SELECT 1 FROM public.device_commands c WHERE c.wall_id=p_wall AND c.screen_id=s.id AND c.command='position_test' AND c.expires_at>now()))) ORDER BY s.id
 LOOP
  did=NULL; failure=NULL;
  SELECT p.device_id INTO did FROM public.pairing_sessions p JOIN public.device_credentials c USING(device_id) WHERE p.screen_id=target.id AND p.user_id=auth.uid() AND p.status='paired' AND c.revoked_at IS NULL FOR UPDATE OF c;
  IF did IS NULL THEN CONTINUE; END IF;
  IF p_action='start' AND (target.status<>'online' OR target.last_seen IS NULL OR target.last_seen>now() OR target.last_seen<=now()-interval '120 seconds') THEN failure='offline'; END IF;
  IF failure IS NULL AND (SELECT count(*) FROM public.device_commands WHERE device_id=did AND status IN ('pending','delivered') AND expires_at>now())>=20 THEN failure='queue_full'; END IF;
  INSERT INTO public.device_commands(screen_id,device_id,user_id,command,wall_id,test_id,payload,status,error_message,expires_at)
  VALUES(target.id,did,auth.uid(),CASE WHEN p_action='start' THEN 'position_test' ELSE 'stop_position_test' END,p_wall,tid,
   jsonb_build_object('wall_id',p_wall,'test_id',tid,'wall_name',w.name,'screen_name',target.name,'row_index',target.row_index,'column_index',target.column_index,'columns',w.columns,'number',target.row_index*w.columns+target.column_index+1,'expires_at',until_at),
   CASE WHEN failure IS NULL THEN 'pending' ELSE 'failed' END,failure,until_at);
 END LOOP;
 RETURN jsonb_build_object('test_id',tid,'expires_at',until_at);
END; $$;
REVOKE ALL ON FUNCTION public.control_wall_position_test(uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.control_wall_position_test(uuid,text,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.device_poll_commands(p_device uuid,p_hash text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE cmds jsonb; sid uuid;
BEGIN
 sid=public.device_screen(p_device,p_hash);
 UPDATE public.device_commands SET status='expired' WHERE device_id=p_device AND status IN ('pending','delivered') AND (expires_at<=now() OR (command='position_test' AND NOT EXISTS(SELECT 1 FROM public.video_wall_screens m JOIN public.video_walls w ON w.id=m.wall_id WHERE m.wall_id=device_commands.wall_id AND m.screen_id=sid AND m.row_index=(device_commands.payload->>'row_index')::integer AND m.column_index=(device_commands.payload->>'column_index')::integer AND w.columns=(device_commands.payload->>'columns')::integer)));
 UPDATE public.device_commands SET status='delivered',delivered_at=COALESCE(delivered_at,now()) WHERE device_id=p_device AND status='pending' AND expires_at>now();
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'command',command,'created_at',created_at,'expires_at',expires_at,'payload',payload) ORDER BY created_at,id),'[]'::jsonb) INTO cmds FROM public.device_commands WHERE device_id=p_device AND status='delivered' AND expires_at>now();
 RETURN cmds;
END; $$;