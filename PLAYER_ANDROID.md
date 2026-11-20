# Lecteur TV ScreenFlow

## Navigateur : /player

Lecteur public séparé de l’administration. « Connecter cet écran » demande une vraie identité au serveur ; le propriétaire réclame son code dans Écrans. Aucun appareil n’est créé automatiquement. Le lecteur conserve son identité, interroge le jumelage toutes les 5 secondes puis envoie sa présence réelle et synchronise toutes les 30 secondes.

Images : durée de la playlist, boucle ordonnée. Vidéos HTML5 : MP4 et autres formats selon les codecs du navigateur, actuellement sans son pour permettre l’autoplay. Télécommande : flèches pour le focus, Entrée pour activer, droite pour le média suivant, Espace/MediaPlayPause pour pause. Plein écran et maintien d’éveil dépendent des permissions du navigateur.

Manifestes et fichiers sont conservés dans IndexedDB. Une nouvelle playlist remplace la précédente seulement après téléchargement complet ; une coupure conserve la boucle locale. Quotas et effacement dépendent du navigateur. Sans téléchargement préalable, pas de lecture hors connexion. Le navigateur doit avoir la page ouverte : un démarrage à froid hors réseau n’est pas garanti sans service worker. Dans l’APK, la page est embarquée.

Les commandes utilisent les API existantes et des reçus persistants pour dédupliquer. Redémarrer signifie recharger la page, pas redémarrer Android ; confirmation après reprise. Une révocation en ligne efface identité et médias ; hors réseau, elle ne peut être découverte avant reconnexion. L’identité navigateur est origin-local et accessible aux scripts de cette origine : utiliser HTTPS et un profil dédié. Le token n’est jamais affiché ni remplacé par le code de jumelage.

## Préparation Android

`player/` réutilise le lecteur sans administration ni serveur. `capacitor.config.ts` pointe vers `dist-player`, pas un site distant.

```sh
bun install --frozen-lockfile
VITE_PLAYER_API_ORIGIN=https://votre-application-publiee.example bun run player:build
bun run android:prepare
bun run android:sync
cd android
./gradlew assembleDebug
```

Utiliser une origine HTTPS publiée réelle sans /player. Capacitor HTTP sert aux API natives ; le navigateur utilise sa propre origine. Aucun secret serveur n’est embarqué. Le plugin DeviceVault chiffre l’identité avec AES-GCM et une clé Android Keystore non exportable. `android-support/` fournit activité immersive, paysage, maintien d’éveil et bannière TV. Le script génère `android/` depuis ces modèles ; ne pas committer les dépendances, sorties de compilation ni identités.

Le lancement de l’activité reprend le manifeste local. Le démarrage automatique à l’allumage du téléviseur nécessite encore une configuration kiosk/device-owner ou spécifique au fabricant : Android moderne ne garantit pas un lancement universel via BOOT_COMPLETED. Aucun démarrage au boot n’est simulé.

## GitHub Actions

`.github/workflows/android-player.yml` se lance manuellement avec l’origine publiée, prépare Android puis assemble un APK debug avec Java 21, SDK Android et Bun. L’APK est déposé seulement si la compilation réussit. **Aucun APK n’a encore été compilé ou testé sur TV.** Signature de production, distribution, codecs, télécommandes, coffre natif, cache WebView et kiosk restent à valider.

Connecter la synchronisation GitHub dans les paramètres Git de Lovable ; ce workflow ne connecte pas un dépôt et ne lance pas automatiquement une compilation.

## API réutilisées

Aucune table dupliquée : request, status, heartbeat, content, commands et commands/ack sous /api/public/devices. Voir DEVICE_API.md. La programmation horaire n’est pas résolue par le manifeste actuel ; seule la playlist directement affectée est lue.

## Vérifications réalisées

36 tests automatisés réussis. Le lecteur navigateur a été jumelé via un vrai code réclamé depuis l’administration : photo téléchargée et affichée depuis un fichier local, MP4 en lecture, navigation entre médias hors réseau, reprise de l’identité et de la playlist après rechargement en ligne. La commande Actualiser le contenu a été reçue et exécutée, puis son statut Exécutée a été relu dans l’administration. Écrans de jumelage et lecture vérifiés sur paysage 1920×1080 et téléphone 430×786. Les données de ce compte temporaire ont été nettoyées. Aucun appareil Android ni APK n’a été simulé, compilé ou validé.