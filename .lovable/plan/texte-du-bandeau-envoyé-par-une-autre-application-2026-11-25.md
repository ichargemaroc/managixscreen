# Texte du bandeau envoyé par une autre application

## Ce que vous aurez
- Dans **Playlist → Paramètres → Bandeau défilant**, une section **« Mise à jour par API »** :
  - bouton **Générer une clé API** (propre à cette playlist), affichée une seule fois avec un bouton Copier ;
  - adresse à appeler et exemple prêt à copier ;
  - boutons **Régénérer** (l'ancienne clé cesse de marcher) et **Désactiver**.
- L'autre application envoie le nouveau texte ; le bandeau est mis à jour et les TV qui diffusent cette playlist le reçoivent en quelques secondes. L'apparence (couleurs, hauteur, vitesse…) reste celle réglée dans ScreenFlow.
- Le texte reste affiché hors connexion sur les TV jusqu'au prochain envoi.

## Exemple d'appel
```text
POST https://screenflow.live/api/public/ticker
Authorization: Bearer <clé de la playlist>
{ "text": "Promo du jour -20 %", "enabled": true }
```
Réponse : `{ "ok": true }`. Erreurs claires : clé invalide (401), texte trop long > 500 caractères (400), trop d'appels (429).

## Sécurité
- Seule une empreinte de la clé est conservée ; la clé ne permet de modifier que le texte de sa playlist, rien d'autre.
- Limite d'appels par clé (ex. 60 par minute), compteurs persistants, refus en cas de doute.
- Seul le propriétaire de la playlist peut générer, régénérer ou désactiver la clé.

## Détails techniques
- Nouvelle table service-only `playlist_ticker_keys` (playlist_id, owner_id, token_hash, created_at, last_used_at) ; RPC propriétaire `rotate_playlist_ticker_key` / `revoke_playlist_ticker_key` ; RPC service `set_playlist_ticker_text(token_hash, text, enabled)` qui met à jour `playlists.ticker` en conservant les autres champs.
- Route `src/routes/api/public/ticker.ts` : Zod, hachage SHA-256 du bearer, limite via compteurs PostgreSQL existants, CORS + OPTIONS, puis mise en file de `refresh_content` pour les écrans concernés.
- Fonctions serveur authentifiées pour générer/révoquer la clé ; composant ajouté au panneau du bandeau.
- Tests : clé invalide refusée, texte > 500 refusé, mise à jour conserve l'apparence.
