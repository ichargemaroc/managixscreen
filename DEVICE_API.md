# Android TV device protocol

The native Android TV player is not implemented. These TanStack Start endpoints prepare real device enrollment; no app screen generates a simulated TV or sends synthetic heartbeats. Publish the updated application before using them from a TV.

## Enrollment

1. POST `/api/public/devices/request`, JSON `{ "device_name": "Android TV", "device_metadata": { "model": "TV" } }`.
2. Response 201 contains a server-generated `device_id`, a 256-bit `device_token`, `pairing_code`, and `expires_in: 600`. Store the token securely on the device (Android Keystore-backed storage). Never log it, include it in URLs, or expose it in the admin UI.
3. Display the six-digit code on the TV. The signed-in owner claims it from Écrans → Ajouter une TV. Claiming is transactional and consumes the code once; it does not mark the screen online.
4. POST `/api/public/devices/status`, JSON `{ "device_id": "..." }`, with `Authorization: Bearer <device_token>`. Poll no faster than once every five seconds. Only the matching token/ID can read status; no user account data is returned.
5. Once `paired` is true, POST `/api/public/devices/heartbeat` with the same identity and bearer token every 30–60 seconds. The server records its own time. The UI requires a heartbeat less than two minutes old to show online.

All requests require `Content-Type: application/json` and HTTPS in production. Native Android requests do not require browser CORS support. Bearer tokens are scoped only to device APIs and cannot authenticate to user tables or storage. Scheduled playback, offline cache, token rotation and the Android native application remain to be developed.

## Security and limits

- Ten-minute code lifetime; used codes remain reserved and cannot be claimed again.
- Credentials contain only SHA-256 token hashes and are inaccessible to anon/authenticated table access.
- Session reads require account ownership; claims require verified web login.
- Revoke or delete a screen immediately invalidates its device token. Re-enrollment needs a fresh identity/token and code.
- Persistent custom limits, approved for this project: 5 enrollment requests per trusted edge address and 100 globally per ten minutes; 10 claim attempts per account and 100 globally per ten minutes; 30 authenticated status/heartbeat requests per device per minute.
- If the trusted edge address is absent, all requests share the conservative address bucket. Global caps bound distributed guessing but can temporarily deny enrollment to legitimate devices. This is not a managed anti-abuse service.
- Invalid, expired, used and over-limit claims return a generic error without disclosing another device's data.
- Admin service credentials never ship to the frontend. External APIs use `/api/public/devices/*` with in-handler device checks; application claims and revocation use authenticated server functions, not Edge Functions.

## Content synchronization (implemented)

POST `/api/public/devices/content` with the identity JSON and device bearer token. Only a paired, non-revoked device is accepted. The response includes `screen_id`, `assignment_updated_at`, `last_sync_at`, `download_urls_expire_in: 3600`, and `playlist` (null when unassigned). A playlist contains `id`, `name`, `updated_at` and ordered `items`. Each item contains `id`, `position`, `display_duration` in seconds, and media `id`, `name`, `type`, `size` in bytes, optional `duration`, and `download_url`.

Downloads use private signed URLs valid for one hour, not permanent public access. Do not log these URLs. Refresh the manifest to renew URLs; cache downloaded files locally for offline playback. Revocation blocks new requests immediately, but an already issued signed URL remains valid until expiry. The synchronization timestamp records successful manifest preparation, NOT a confirmed download or playback. Only heartbeat updates connectivity. Compare both assignment and playlist timestamps; renaming media and changing items refresh playlist timestamps. A null playlist means stop the old assigned playlist. Group assignment snapshots existing group members; new members need assignment again. No schedule resolution is performed in this endpoint yet.

## Heartbeat telemetry (implemented)

POST `/api/public/devices/heartbeat` now accepts optional fields alongside `device_id`:

```json
{
  "device_id": "device UUID",
  "player_version": "1.0.0",
  "device_info": { "manufacturer": "Vendor", "model": "TV model", "android_version": "14" },
  "playback_status": { "state": "playing", "position_seconds": 12 }
}
```

Playback state is `idle`, `playing`, `paused`, `buffering` or `error`; optional `media_id` and `playlist_id` are UUIDs or null, and `error` is bounded text. Omitted telemetry fields retain previous values. Server time is authoritative. Telemetry is device-reported, not independently verified. Web users cannot write telemetry or simulate heartbeats.

## Commands (implemented)

The signed-in screen owner queues commands in the screen details page via an authenticated server function. No global administrator role was added. Supported commands: `refresh_content`, `reload_playlist`, `restart_player`, `clear_cache`. At most 20 unexpired outstanding commands per device, lifetime 24 hours. Screen and group playlist assignment already persists through owner-scoped screen writes; details now allow replacing or clearing assignment.

- POST `/api/public/devices/commands` with identity JSON: returns `commands`, each with `id`, `command`, `created_at`, `expires_at`. Poll every 30–60 seconds. Delivery sets `delivered_at` but does NOT claim execution.
- POST `/api/public/devices/commands/ack` with identity plus `command_id`, `status` (`completed` or `failed`) and optional `error` (500 characters maximum). Same-state acknowledgements are idempotent; incompatible, unreceived or expired commands return 409. Other devices cannot acknowledge them.
- Delivery is at-least-once: delivered commands repeat until acknowledged or expired. The Android player MUST persist processed command IDs and deduplicate, especially restart/cache commands. Acknowledge only after actual success or failure. Acknowledge restart after recovery. Expiry is enforced on polling and acknowledgement; the UI also renders overdue outstanding commands as expired.

All authenticated operations share the existing 30 calls/device/minute budget. Responses use `Cache-Control: no-store`; errors: 400 invalid JSON/input, 401 invalid/revoked/unpaired device, 409 incompatible acknowledgement, 413 oversized body, 415 wrong content type, 429 limit, 503 unavailable service. Maximum body size: 4096 characters. Do not send account credentials or pairing codes as permanent tokens.

## Database actually used

Existing: `pairing_sessions`, `device_credentials`, `device_request_limits`, `device_pairing_config`, `screens`, `playlists`, `playlist_items`, `media`, `screen_group_members`.

New: `device_telemetry` (version, device info, playback report, last manifest synchronization) and `device_commands` (queue, delivery, acknowledgement, expiry, failure details). Owners have SELECT access via RLS; writes use restricted RPCs. Commands can only be queued for the caller’s owned, currently paired screen. Device RPCs revalidate the exact device/token pair transactionally. `screens.assignment_updated_at` tracks replacement/removal of a playlist.

## Remaining native work and validation limits

Android application, secure token storage, real heartbeat sending, downloads, playback, offline cache, command execution/deduplication and scheduled playback are not built here. No fake device or synthetic heartbeat is created for this step. Automated isolated API tests verify protocol and authorization behavior; actual paired-device execution requires the future Android application. Publish the web changes before integrating production devices.