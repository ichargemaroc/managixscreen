ALTER FUNCTION public.claim_pairing_code(text,text,text,uuid) RENAME TO claim_pairing_code_internal;
CREATE FUNCTION public.claim_pairing_code(p_code text,p_name text,p_location text,p_group uuid DEFAULT NULL) RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT public.claim_pairing_code_internal(p_code,p_name,p_location,p_group); $$;
REVOKE ALL ON FUNCTION public.claim_pairing_code(text,text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_pairing_code(text,text,text,uuid) TO authenticated;