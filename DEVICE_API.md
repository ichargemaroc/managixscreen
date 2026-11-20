# Android TV device protocol

The native Android TV player is not implemented. These TanStack Start endpoints prepare real device enrollment; no app screen generates a simulated TV or sends synthetic heartbeats. Publish the updated application before using them from a TV.

## Enrollment

1. POST `/api/public/devices/request`, JSON `{ "device_name": "Android TV", "device_metadata": { "model": "TV" } }`.
2. Response 201 contains a server-generated `device_id`, a 256-bit `device_token`, `pairing_code`, and `expires_in: 600`. Store the token securely on the device (Android Keystore-backed storage). Never log it, include it in URLs, or expose it in the admin UI.
3. Display the six-digit code on the TV. The signed-in owner claims it from Écrans → Ajouter une TV. Claiming is transactional and consumes the code once; it does not mark the screen online.
4. POST `/api/public/devices/status`, JSON `{ "device_id": "..." }`, with `Authorization: Bearer <device_token>`. Poll no faster than once every five seconds. Only the matching token/ID can read status; no user account data is returned.
5. Once `paired` is true, POST `/api/public/devices/heartbeat` with the same identity and bearer token every 30–60 seconds. The server records its own time. The UI requires a heartbeat less than two minutes old to show online.

All requests require `Content-Type: application/json` and HTTPS in production. Native Android requests do not require browser CORS support. Bearer tokens are scoped only to device APIs and cannot authenticate to user tables or storage. Content manifests, scheduled playback, offline cache, token rotation and the Android native application remain to be developed.

## Security and limits

- Ten-minute code lifetime; used codes remain reserved and cannot be claimed again.
- Credentials contain only SHA-256 token hashes and are inaccessible to anon/authenticated table access.
- Session reads require account ownership; claims require verified web login.
- Revoke or delete a screen immediately invalidates its device token. Re-enrollment needs a fresh identity/token and code.
- Persistent custom limits, approved for this project: 5 enrollment requests per trusted edge address and 100 globally per ten minutes; 10 claim attempts per account and 100 globally per ten minutes; 30 authenticated status/heartbeat requests per device per minute.
- If the trusted edge address is absent, all requests share the conservative address bucket. Global caps bound distributed guessing but can temporarily deny enrollment to legitimate devices. This is not a managed anti-abuse service.
- Invalid, expired, used and over-limit claims return a generic error without disclosing another device's data.
- Admin service credentials never ship to the frontend. External APIs use `/api/public/devices/*` with in-handler device checks; application claims and revocation use authenticated server functions, not Edge Functions.