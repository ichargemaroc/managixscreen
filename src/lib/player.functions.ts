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
const releaseSchema = z.object({ tag_name: z.string(), name: z.string().nullable(), body: z.string().nullable(), published_at: z.string().nullable(), assets: z.array(z.object({ name: z.string(), browser_download_url: z.string().url() })) });

/** Latest Android player published on the GitHub Releases of the configured repository. */
async function latestRelease() {
  const repo = process.env['PLAYER_RELEASE_REPO'] || 'ichargemaroc/managixscreen';
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("Dépôt GitHub des mises à jour non configuré.");
  const response = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ScreenFlow' } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("GitHub est momentanément indisponible.");
  const release = releaseSchema.parse(await response.json());
  const apk = release.assets.find((a) => a.name.endsWith('.apk'));
  const code = /(\d+)$/.exec(release.tag_name)?.[1];
  if (!apk || !code || !apk.browser_download_url.startsWith(`https://github.com/${repo}/releases/download/`)) return null;
  const shaAsset = release.assets.find((a) => a.name === `${apk.name}.sha256`);
  let sha256: string | null = null;
  if (shaAsset) { const text = await (await fetch(shaAsset.browser_download_url)).text(); sha256 = /^[a-f0-9]{64}/.exec(text.trim().toLowerCase())?.[0] ?? null; }
  return { url: apk.browser_download_url, versionCode: Number(code), versionName: (release.name ?? release.tag_name).slice(0, 40), notes: (release.body ?? '').slice(0, 500), publishedAt: release.published_at, sha256 };
}

export const getLatestPlayerRelease = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => latestRelease());

export const sendApkUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ screenId: z.string().uuid() }).strict())
  .handler(async ({ data, context }) => {
    const release = await latestRelease();
    if (!release) throw new Error("Aucun APK publié dans les Releases GitHub.");
    const { data: id, error } = await context.supabase.rpc("enqueue_apk_update", { p_screen: data.screenId, p_url: release.url, p_version_code: release.versionCode, p_version_name: release.versionName, p_sha256: release.sha256 ?? (null as unknown as string) });
    if (error || !id) throw new Error("Mise à jour refusée : appareil indisponible ou file d’attente pleine.");
    return { id, versionName: release.versionName };
  });
