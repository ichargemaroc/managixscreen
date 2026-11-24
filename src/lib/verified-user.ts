import type { QueryClient } from '@tanstack/react-query';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Only call with the user returned by a successful signInWithPassword response,
// never a restored browser session or an auth-event payload.
export async function cacheVerifiedSignIn(queryClient: QueryClient, user: User) {
  await queryClient.cancelQueries({ queryKey: ['auth', 'verified-user'] });
  queryClient.setQueryData(['auth', 'verified-user'], user);
}

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