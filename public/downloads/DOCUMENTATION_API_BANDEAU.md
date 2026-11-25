# ScreenFlow — Documentation de l’API Bandeau défilant

## Périmètre
Cette API permet à une application externe d’envoyer le texte et, facultativement, l’état d’activation du bandeau d’une playlist. Ce n’est pas une API générale de gestion des comptes, médias ou TV.

## Adresse et méthode
POST https://screenflow.live/api/public/ticker
Content-Type: application/json
Authorization: Bearer VOTRE_CLE_API

Utilisez la version publiée de ScreenFlow avec cette API déployée. Une réponse 404 indique notamment une adresse incorrecte ou une version publiée ne contenant pas cette API.

## Obtenir et protéger la clé
Dans Playlists → ouvrir la playlist → Paramètres → Bandeau défilant → Mise à jour par API, cliquez sur Générer une clé API.
La clé contient 64 caractères hexadécimaux et n’est affichée qu’à sa création. Copiez-la immédiatement dans un stockage de secrets côté serveur. Ne l’insérez ni dans une URL, ni dans une page publique, ni dans un dépôt de code.
Chaque clé cible sa propre playlist : aucun identifiant de playlist ou de TV n’est à envoyer. Régénérer invalide l’ancienne clé ; Désactiver la révoque.

## Corps JSON
| Champ | Type | Obligatoire | Effet |
|---|---|---|---|
| text | chaîne | Oui | Maximum 500 caractères. Un texte vide ou uniquement composé d’espaces ne s’affiche pas. |
| enabled | booléen | Non | true : activer ; false : masquer. Omission : conserver l’état actuel. |

Les champs supplémentaires sont refusés. Pour masquer le bandeau, envoyez aussi text (il reste obligatoire).

```json
{"text":"Bienvenue • Promotion du jour -20 %","enabled":true}
```

## Exemples
Les variables SCREENFLOW_API_KEY doivent être définies dans l’environnement sécurisé de l’application appelante.

### cURL

```bash
curl --request POST https://screenflow.live/api/public/ticker \
  --header "Authorization: Bearer VOTRE_CLE_API" \
  --header "Content-Type: application/json" \
  --data '{"text":"Bienvenue • Promotion du jour -20 %","enabled":true}'
```

### JavaScript

```javascript
// Exécuter côté serveur : ne pas exposer la clé dans une page publique.
const response = await fetch("https://screenflow.live/api/public/ticker", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.SCREENFLOW_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ text: "Bienvenue • Promotion du jour -20 %", enabled: true })
});
const result = await response.json();
if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
console.log(result); // { ok: true }
```

### Python

```python
import os
import requests

response = requests.post(
    "https://screenflow.live/api/public/ticker",
    headers={"Authorization": f"Bearer {os.environ['SCREENFLOW_API_KEY']}"},
    json={"text": "Bienvenue • Promotion du jour -20 %", "enabled": True},
    timeout=15,
)
response.raise_for_status()
print(response.json()) # {"ok": True}
```

### PHP

```php
<?php
$ch = curl_init("https://screenflow.live/api/public/ticker");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer " . getenv("SCREENFLOW_API_KEY"),
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "text" => "Bienvenue • Promotion du jour -20 %",
        "enabled" => true
    ])
]);
$result = curl_exec($ch);
if ($result === false) throw new RuntimeException(curl_error($ch));
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
if ($status !== 200) throw new RuntimeException("HTTP " . $status . " : " . $result);
echo $result;
```

## Réponses HTTP

| Code | Signification |
|---|---|
| 200 | Succès : {"ok": true}. Le texte est enregistré ; cela ne confirme pas son affichage sur une TV. |
| 400 | JSON invalide, champ inconnu, texte absent ou supérieur à 500 caractères, enabled non booléen. |
| 401 | Clé absente, mal formée, inconnue ou révoquée. |
| 413 | Corps trop volumineux : la route refuse plus de 4 096 caractères de corps brut. |
| 429 | Limite de 60 demandes par clé sur 60 secondes, ou contrôle de limite indisponible. Attendre une minute. |
| 503 | Service indisponible. Réessayer plus tard avec un délai progressif. |

## Affichage et synchronisation
L’API conserve la hauteur, les couleurs, l’opacité, la taille du texte, le mode et la durée de défilement réglés dans ScreenFlow.
Un signal de rafraîchissement est demandé aux TV concernées après enregistrement. Le délai dépend de leur connexion, de la playlist active et de la version du player ; la réponse 200 ne garantit pas l’affichage immédiat. Un ancien APK sans prise en charge du bandeau doit être mis à jour. Hors connexion, la TV conserve le dernier contenu synchronisé et reçoit le nouveau texte après reconnexion.
