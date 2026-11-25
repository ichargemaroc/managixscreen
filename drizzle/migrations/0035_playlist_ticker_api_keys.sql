CREATE TABLE public.playlist_ticker_keys (
  playlist_id uuid PRIMARY KEY REFERENCES public.playlists(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
GRANT ALL ON public.playlist_ticker_keys TO service_role;
ALTER TABLE public.playlist_ticker_keys ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.playlist_ticker_key_status(p_playlist uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT CASE WHEN k.playlist_id IS NULL THEN NULL ELSE jsonb_build_object('created_at',k.created_at,'last_used_at',k.last_used_at) END
  FROM public.playlists p LEFT JOIN public.playlist_ticker_keys k ON k.playlist_id=p.id
  WHERE p.id=p_playlist AND p.user_id=auth.uid();
$$;
CREATE FUNCTION public.rotate_playlist_ticker_key(p_playlist uuid, p_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
  IF auth.uid() IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.playlists WHERE id=p_playlist AND user_id=auth.uid()) THEN RETURN false; END IF;
  INSERT INTO public.playlist_ticker_keys(playlist_id,owner_id,token_hash) VALUES(p_playlist,auth.uid(),p_hash)
  ON CONFLICT(playlist_id) DO UPDATE SET token_hash=EXCLUDED.token_hash,created_at=now(),last_used_at=NULL;
  RETURN true;
END $$;
CREATE FUNCTION public.revoke_playlist_ticker_key(p_playlist uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
  DELETE FROM public.playlist_ticker_keys WHERE playlist_id=p_playlist AND owner_id=auth.uid();
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.playlist_ticker_key_status(uuid), public.rotate_playlist_ticker_key(uuid,text), public.revoke_playlist_ticker_key(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.playlist_ticker_key_status(uuid), public.rotate_playlist_ticker_key(uuid,text), public.revoke_playlist_ticker_key(uuid) TO authenticated;

CREATE FUNCTION public.set_playlist_ticker_text(p_hash text, p_text text, p_enabled boolean) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE k public.playlist_ticker_keys; BEGIN
  IF p_text IS NULL OR length(p_text)>500 THEN RETURN false; END IF;
  SELECT * INTO k FROM public.playlist_ticker_keys WHERE token_hash=p_hash FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.playlists SET ticker = COALESCE(ticker, '{"mode":"loop","seconds":30}'::jsonb)
    || jsonb_build_object('text', p_text, 'enabled', COALESCE(p_enabled, (ticker->>'enabled')::boolean, true)), updated_at=now()
    WHERE id=k.playlist_id AND user_id=k.owner_id;
  UPDATE public.playlist_ticker_keys SET last_used_at=now() WHERE playlist_id=k.playlist_id;
  INSERT INTO public.device_commands(screen_id,device_id,user_id,command)
    SELECT p.screen_id,p.device_id,k.owner_id,'refresh_content' FROM public.pairing_sessions p JOIN public.device_credentials c USING(device_id)
    WHERE p.user_id=k.owner_id AND p.status='paired' AND c.revoked_at IS NULL
      AND (SELECT count(*) FROM public.device_commands d WHERE d.device_id=p.device_id AND d.status IN ('pending','delivered') AND d.expires_at>now())<20;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.set_playlist_ticker_text(text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_playlist_ticker_text(text,text,boolean) TO service_role;