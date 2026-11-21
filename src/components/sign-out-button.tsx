import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function SignOutButton({ variant = "ghost" }: { variant?: "ghost" | "outline" }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <Button
      variant={variant}
      size="icon"
      className="size-10 shrink-0"
      onClick={() => void signOut()}
      aria-label="Se déconnecter"
      title="Se déconnecter"
    >
      <LogOut />
    </Button>
  );
}
