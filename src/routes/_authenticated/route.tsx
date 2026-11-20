import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { StoreProvider } from "@/lib/store";
import { RealtimeSync } from "@/components/realtime-sync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <StoreProvider>
      <RealtimeSync />
      <AppShell>
        <Outlet />
      </AppShell>
    </StoreProvider>
  );
}
