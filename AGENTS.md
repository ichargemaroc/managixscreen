<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Vault diagnostics use allow-listed codes, never raw native errors, to keep device secrets off the TV.
- Shared visual styles use semantic tokens in `src/styles.css`, common controls, and the app shell; keep player playback surfaces isolated so dashboard restyling never changes displayed media.
- App data and Cloud writes live in `src/lib/store.tsx`; pages consume `useStore()` and its exported actions to keep data access centralized.
- Media object keys use generated identifiers and safe extensions, while original names remain in metadata, because storage rejects Unicode keys.
- Pairing QR codes encode only the expiring pairing code on the public /pair page; explicit authenticated confirmation reuses the existing claim action and never exposes device credentials.
- In-app QR scanning loads the camera decoder only in the browser, extracts a pairing code without following scanned URLs, and fills the existing claim form so confirmation and owner validation remain unchanged.
- App shell (sidebar + header) is in `src/components/app-shell.tsx`, rendered from `src/routes/_authenticated/route.tsx`; each nav item has its own route file.
- Preserve legacy database fields through generated aliases and an RLS-aware group view so deployed clients remain compatible.
- Replace playlist items through the owner-scoped transactional RPC so failed writes never erase existing content.
- Keep device status heartbeat-derived and prohibit ordinary account writes to status timestamps to avoid simulated connectivity.
- Device enrollment and heartbeat use token-scoped public server routes; web claims/revocations use authenticated server functions and owner-scoped transactional RPCs to keep the native device protocol separate from user access.
- Store only device token hashes in a service-only table; revoke credentials on screen deletion so orphaned devices cannot reconnect.
- Persist custom abuse counters in PostgreSQL and fail closed on limit errors; global caps protect enrollment when trusted edge IP identity is absent.
- Recover stale module-import failures with at most one automatic reload per minute per tab; manual retry reloads the document because router invalidation cannot replace failed module imports.
- Install dependency-free recovery before the module entry in the root document; bootstrap failures cannot be caught by React effects and must show a standalone retry when offline or reload-throttled.
- Device telemetry and commands use dedicated owner-readable tables with service-only transactional RPCs; device APIs revalidate token hashes and pairing inside each RPC to isolate content and acknowledgements.
- Content manifests expose only the assigned playlist and one-hour signed media URLs; successful manifest retrieval records synchronization without implying download, playback, or connectivity.
- Command delivery is at-least-once until acknowledgement or expiry; native players must deduplicate command IDs before executing destructive actions.
- The public /player route and standalone player entry share src/player modules; the native static bundle excludes admin routing and server code to preserve the dashboard.
- Player manifests switch only after all media are stored in IndexedDB; failed downloads preserve the previous offline playlist, and cache cleanup retains command receipts.
- Native identity uses the Android Keystore-backed DeviceVault plugin without plaintext fallback; migrate old fallback data only after encryption succeeds, and block re-enrollment on vault-read failures to preserve paired identity.
- Android sources and Play resources are generated from versioned android-support templates; the single manual workflow builds debug APKs or upload-key-signed release APK/AAB artifacts, keeping keys runner-local and checking merged permissions, ELF 16 KB alignment and 64-bit counterparts before delivery.
- Native boot/update startup uses a non-exported receiver with a tested background-launch policy and singleTask activity; optional Android HOME selection provides system-managed startup on restricted devices without bypassing OS protections or reading device credentials.
- Android CI explicitly installs platform-tools, the Capacitor compile SDK platform and AGP-compatible build-tools; never use setup-android's obsolete default packages, and keep the JDK compatible with the generated Gradle project.
- Native player requests try the WebView fetch first (same network stack as Chrome) and fall back to time-capped native HTTP; device routes therefore allow cross-origin bearer-token calls without credentials, and player branding is bundled locally because relative CDN URLs do not resolve in the native app.
- Video walls use owner-scoped transactional configuration and a token-revalidated device manifest that overrides standard playlists; one screen belongs to one wall to avoid conflicting playback assignments.
- Wall assignment cells use a dedicated screen picker and client-safe assignment rules; the existing transactional RPC remains authoritative and preserves timestamps for unchanged positions, leaving unknown historical dates null.
- Wall playback crops one globally contain-fitted cached source into physical viewports, uses a persisted server timeline with midpoint clock correction and drift seeking, and retains control state offline; this is best-effort synchronization, not hardware frame lock or server-side transcoding.

- Wall position tests reuse device_commands with server-derived assignment snapshots, expiring sessions and owner-only RPCs; independent five-second player polling must not wait for media downloads, and acknowledgements confirm rendered tests rather than enqueue success.
- Player D-pad focus and native Back handling live in src/player/tv-navigation.ts; Back closes playback controls before exiting at root without changing cached media or paired identity.
- Wall media placement uses normalized offsets and a uniform scale persisted by the owner-scoped wall RPC; previews and native playback share wallMediaRect so movement and resizing change actual cropping without distortion.
