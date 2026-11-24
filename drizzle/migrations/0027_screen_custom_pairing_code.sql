CREATE OR REPLACE FUNCTION public.set_screen_pairing_code(p_screen uuid, p_code text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF p_code IS NULL OR p_code !~ '^\d{6}$' THEN RAISE EXCEPTION 'INVALID_CODE'; END IF;
  PERFORM 1 FROM public.screens WHERE id=p_screen AND user_id=auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF EXISTS(SELECT 1 FROM public.screens WHERE user_id=auth.uid() AND pairing_code=p_code AND id<>p_screen) THEN RAISE EXCEPTION 'DUPLICATE_CODE'; END IF;
  UPDATE public.screens SET pairing_code=p_code WHERE id=p_screen;
END $$;
REVOKE ALL ON FUNCTION public.set_screen_pairing_code(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_screen_pairing_code(uuid,text) TO authenticated;