import type { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// UI access only: Cloud policies and server functions still validate every request.
// The per-router cache is cleared on sign-out and invalidated on identity changes.
export function verifiedUser(queryClient: QueryClient) {
  return queryClient.fetchQuery({
    queryKey: ['auth', 'verified-user'],
    staleTime: 30_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });
}