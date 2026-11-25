CREATE OR REPLACE FUNCTION public.public_pricing()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'currency', (SELECT currency FROM billing_settings LIMIT 1),
    'annual_discount_percent', (SELECT annual_discount_percent FROM billing_settings LIMIT 1),
    'trial_days', (SELECT trial_days FROM billing_settings LIMIT 1),
    'trial_capacity', (SELECT trial_capacity FROM billing_settings LIMIT 1),
    'plans', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'capacity', capacity, 'monthly_amount', monthly_amount) ORDER BY capacity) FROM billing_plans WHERE published AND monthly_amount IS NOT NULL), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.public_pricing() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_pricing() TO anon, authenticated;