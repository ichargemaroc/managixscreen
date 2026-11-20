REVOKE ALL ON public.device_telemetry, public.device_commands FROM anon, authenticated;
GRANT SELECT ON public.device_telemetry, public.device_commands TO authenticated;
GRANT ALL ON public.device_telemetry, public.device_commands TO service_role;