CREATE OR REPLACE FUNCTION public.invite_content_member(p_email text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE token text; result uuid; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
IF p_email IS NULL OR length(p_email)>254 OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' OR lower(trim(p_email))=lower(auth.jwt()->>'email') THEN RAISE EXCEPTION 'Invalid email'; END IF;
IF (SELECT count(*) FROM public.content_team_invites WHERE owner_id=auth.uid() AND expires_at>now() AND accepted_at IS NULL AND revoked_at IS NULL)>=100 THEN RAISE EXCEPTION 'Too many invitations'; END IF;
token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
INSERT INTO public.content_team_invites(owner_id,email,token_hash) VALUES(auth.uid(),lower(trim(p_email)),md5(token)) RETURNING id INTO result; RETURN jsonb_build_object('id',result,'token',token); END $$;