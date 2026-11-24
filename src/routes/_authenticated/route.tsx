import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { verifiedUser } from "@/lib/verified-user";
import { AppShell } from "@/components/app-shell";
import { StoreProvider } from "@/lib/store";
import { StoreContent } from "@/components/store-content";
import { RealtimeSync } from "@/components/realtime-sync";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const user = await verifiedUser(context.queryClient).catch(() => null);
    if (!user) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <StoreProvider>
      <RealtimeSync />
      <AppShell>
        <StoreContent><Outlet /></StoreContent>
      </AppShell>
    </StoreProvider>
  );
}
