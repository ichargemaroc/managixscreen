import { z } from "zod";

const payloadSchema = z.object({
  url: z.string().regex(/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/releases\/download\/\S+\.apk$/),
  version_code: z.number().int().positive(),
  version_name: z.string().max(40),
  sha256: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
});
type Plugin = { install(options: { url: string; versionCode: number; sha256?: string }): Promise<{ status: "installer_opened" | "up_to_date" }> };

/** Downloads the GitHub release APK natively, then opens Android's installer; playback continues meanwhile. */
export async function installApkUpdate(raw: unknown) {
  const payload = payloadSchema.safeParse(raw);
  if (!payload.success) throw new Error("Commande de mise à jour invalide.");
  const { Capacitor, registerPlugin } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) throw new Error("Mise à jour disponible uniquement sur le lecteur Android.");
  if (!Capacitor.isPluginAvailable("ApkUpdater")) throw new Error("Installez une fois manuellement le nouvel APK pour activer les mises à jour à distance.");
  const plugin = registerPlugin<Plugin>("ApkUpdater");
  try {
    await plugin.install({ url: payload.data.url, versionCode: payload.data.version_code, ...(payload.data.sha256 ? { sha256: payload.data.sha256 } : {}) });
  } catch (e) {
    const code = e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
    throw new Error(({ INSTALL_PERMISSION: "Autorisez « Installer des applications inconnues » pour ScreenFlow dans les paramètres de la TV.", DOWNLOAD_FAILED: "Téléchargement de l’APK impossible.", CHECKSUM: "APK corrompu : empreinte incorrecte.", INVALID_APK: "APK invalide ou d’une autre application." } as Record<string, string>)[code] ?? "La mise à jour a échoué.");
  }
}
