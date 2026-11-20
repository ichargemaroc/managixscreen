import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const claimScreen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ code: z.string().regex(/^\d{6}$/), name: z.string().trim().min(1).max(120), location: z.string().max(240), groupId: z.string().uuid().nullable() }))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("claim_pairing_code", { p_code: data.code, p_name: data.name, p_location: data.location, ...(data.groupId ? { p_group: data.groupId } : {}) });
    if (error || !id) {
      if (error?.message.includes("Pairing disabled")) throw new Error("Le jumelage attend l’activation de sa protection.");
      throw new Error("Code invalide, expiré ou déjà utilisé. Demandez un nouveau code à la TV.");
    }
    return id;
  });

export const revokeScreen = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ screenId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("revoke_screen_device", { p_screen: data.screenId });
    if (error) throw new Error("L’accès de cet appareil n’a pas pu être révoqué.");
  });