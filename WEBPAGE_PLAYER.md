# Diffusion des pages Web — ScreenFlow

## Fonctionnalités livrées
- Médiathèque : création et modification de sources `webpage` nommées, URL publique HTTP/HTTPS, durée en secondes, actualisation en minutes (0 = désactivée), plein écran ou retrait de 32 px, aperçu et ouverture du site dans un nouvel onglet, suppression sans suppression de fichier inexistant.
- Playlists : pages Web mélangées aux images et vidéos, durée modifiable par élément, affectation aux TV ou groupes existants. Une source seule se diffuse en composant une playlist avec cette source ; plusieurs TV peuvent recevoir la même playlist.
- Murs : la source est sélectionnable comme contenu du mur. Le manifeste sécurisé est reçu par les seuls appareils affectés. Chaque écran affiche la page entière ; aucun découpage DOM, zoom global ou synchronisme Web n’est promis. La pause ou l’arrêt masque la page ; reprendre recharge la page.
- Lecteur : instructions Web conservées dans le manifeste local, sans télécharger le HTML dans IndexedDB ; durée bornée, passage au contenu suivant, contrôle de pause, actualisation uniquement active, délai de chargement de 15 secondes.
- Android : nouvelle WebView indépendante, sans bridge Capacitor ni interface JavaScript donnant accès au coffre ; JavaScript/DOM storage activés, accès fichiers/contenus désactivé, fenêtres et téléchargements non autorisés, navigation limitée aux adresses publiques HTTP/HTTPS. D-pad et Entrée restent dédiés à la page ; Retour, Menu ou Média suivant ferme la page et rend la main à la playlist. L’identifiant Android reste `app.screenflow.player`.
- Commandes : réutilisation de la synchronisation, du rechargement de playlist et de la révocation existants, sans nouveau protocole appareil.

## Tests réellement effectués
- Suite Vitest complète : validation des URL, compatibilité des anciens fichiers, manifestes Web sans signature de stockage, cache d’instructions sans fetch HTML, délai de 15 s, actualisation à la minute seulement pendant la diffusion et nettoyage des surfaces natives simulées.
- Navigateur avec compte connecté réel : création d’une source HTTPS, aperçu réel incluant le JavaScript du site, enregistrement et relecture après rechargement, appairage d’un nouvel écran, affectation d’une playlist page Web + image, lecture réelle de la page puis passage à l’image au bout de 3 s.
- Affectation d’un mur réel à l’écran de vérification et relecture de la page depuis le manifeste du mur.
- Les données de vérification (mur, écran, playlist, source et image) ont été supprimées ensuite.
- Accueil : vérification ordinateur/téléphone, affichage de l’image et ouverture de la connexion conservée.
- Préparation des sources Android vérifiée par les tests existants de génération ; cela ne constitue pas une compilation APK.

## Limites et essais encore nécessaires
- Aucune TV physique ni SDK Android complet dans cet environnement : compilation APK/AAB, vraie WebView, télécommande, retour Android et comportement plein écran natif restent à vérifier via le workflow GitHub et une TV. Installer un nouvel APK sans effacer le jumelage.
- HTTP est accepté à l’enregistrement, mais la protection Android contre les connexions non chiffrées n’a pas été désactivée : privilégier HTTPS. Une page HTTP rejetée passe au contenu suivant après l’erreur ; fonctionnement HTTP natif non revendiqué.
- Certains sites refusent les cadres, WebView, cookies tiers ou demandent une connexion. Le navigateur ne permet pas de détecter fiablement tous les refus `X-Frame-Options`/CSP : un événement de chargement ne garantit pas que le site est affichable. Ne pas contourner ces protections.
- Les pages dépendent du réseau et du cache propre au site/WebView ; fonctionnement complet hors connexion non garanti. Ni proxy ni récupération serveur du site.
- Les anciens APK ne reconnaissent pas `webpage` : les mettre à jour avant d’affecter une playlist contenant des pages Web. Un ancien lecteur conserve son précédent cache si le nouveau manifeste est incompatible.
- YouTube et les flux vidéo ne disposent pas de types dédiés dans le projet existant ; cette livraison ne prétend pas les ajouter ni garantir leur lecture comme page Web.
- Navigation privée, URL contenant des identifiants et schémas exécutables refusés. Pas de traitement de pages internes du réseau local ; les contrôles d’URL ne sont pas une protection réseau complète contre une résolution DNS malveillante.

## Fichiers modifiés ou ajoutés
- Sources/validation : `src/lib/webpage.ts`, `src/lib/store.tsx`, `drizzle/migrations/0015_webpage_media_sources.sql`, types et métadonnées générés.
- Manifestes/cache : `src/lib/player-protocol.ts`, `src/lib/device-api.server.ts`, `src/player/protocol.ts`, `src/player/cache.ts`.
- Lecture : `src/player/webpage-native.ts`, `src/player/webpage-stage.tsx`, `src/player/player.tsx`, `src/player/AGENTS.md`.
- Android : `android-support/WebpagePlayerPlugin.java`, `android-support/MainActivity.java`, `scripts/prepare-android.mjs`, `.github/workflows/android-player.yml`.
- Interfaces : `src/components/webpage-editor.tsx`, `src/components/webpage-preview.tsx`, `src/components/wall-media-preview.tsx`, pages médiathèque/playlists, `src/styles.css`.
- Accueil demandé pendant la livraison : `src/routes/auth.tsx`, `src/assets/screenflow-tv-welcome.png`, styles dédiés, formulaires existants conservés.
- Tests : `src/test/webpage.test.ts`, `src/test/webpage-stage.test.tsx`, `src/test/webpage-native.test.tsx`, tests du cache, API appareil et préparation Android.
- Suivi : `roadmap.md`, présent rapport.