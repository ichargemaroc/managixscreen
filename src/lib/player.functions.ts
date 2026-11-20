import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deviceCommand } from "@/lib/player-protocol";

export const enqueueCommand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ screenId: z.string().uuid(), command: deviceCommand }).strict())
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("enqueue_device_command", { p_screen: data.screenId, p_command: data.command });
    if (error || !id) throw new Error("Commande refusée : appareil indisponible ou file d’attente pleine (20 commandes maximum).");
    return id;
  });