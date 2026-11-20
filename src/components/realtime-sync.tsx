import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Écoute les changements de la table screens (connexions de TV) et
// rafraîchit les données affichées en temps réel.
export function RealtimeSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`screens-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "screens" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["screenflow"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
  return null;
}
