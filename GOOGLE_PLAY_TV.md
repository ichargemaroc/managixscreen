# Publier ScreenFlow TV sur Google Play

## État réel de cette préparation

Le projet existant est conservé : lecteur partagé `src/player`, page publique `/player`, bundle statique Capacitor dans `player`, modèles Android dans `android-support`, génération par `scripts/prepare-android.mjs`. Le nom ScreenFlow et l’identifiant existant `app.screenflow.player` restent inchangés, même si le brief utilise Screenova. Ne changez pas l’identifiant d’une application déjà publiée.

**Préparation implémentée, publication non effectuée.** Aucun nouveau fichier APK ou AAB n’a été compilé dans cet environnement et aucun workflow GitHub n’a été lancé. Les commandes ci-dessous produisent ces fichiers seulement après une exécution réussie. L’acceptation Google Play ne peut pas être garantie avant examen.

## 1. Compiler et télécharger l’APK de test

Dans votre dépôt GitHub connecté :

1. Ouvrir **Actions → Build Android TV player → Run workflow**.
2. Choisir la branche contenant ces changements.
3. Renseigner `api_origin` : **https://screenflow.live**, sans `/player`.
4. Choisir `build_mode` : **debug**.
5. Renseigner `version_code` et `version_name`, par exemple `1` et `1.0.0`.
6. Lancer, attendre la fin, ouvrir l’exécution puis télécharger **Artifacts → screenflow-tv-debug-apk**.
7. Extraire l’archive et installer `app-debug.apk` sur une TV Android/Google TV de test.

Le workflow reste manuel et unique. Il installe Java 21, Android SDK 36, build-tools 35.0.0 et platform-tools, sans l’ancien package `tools`. Il prépare le lecteur local, Android, puis lance `assembleDebug`. Les tests et vérifications bloquent une livraison invalide.

L’APK debug est pour les essais uniquement, pas pour Google Play. Pour **publish_release**, les quatre secrets de signature ci-dessous sont désormais obligatoires, même en mode debug : les APK publiés utilisent une clé persistante au lieu d’une clé debug générée sur chaque runner. Cette clé doit être celle de l’APK déjà installé. Une nouvelle clé ne peut pas remplacer une ancienne signature. **Ne jamais désinstaller une TV jumelée ni effacer ses données pour contourner un refus de mise à jour.** Le lecteur vérifie l’identifiant, la version et la signature avant d’ouvrir l’installateur ; une incompatibilité conserve le jumelage et bloque l’installation. Les anciens APK debug déjà distribués nécessitent leur clé d’origine ; si elle n’a pas été conservée, une mise à jour en place n’est pas possible avec une nouvelle clé.

## 2. Signature de production et AAB

### Créer et garder votre clé d’envoi

La clé privée est sous votre responsabilité. Créez-la sur un poste sécurisé avec le JDK, **hors du dépôt**, avec la commande interactive :

```sh
keytool -genkeypair -v -keystore screenflow-upload.jks -alias screenflow-upload -keyalg RSA -keysize 2048 -validity 10000
```

Elle demande vos informations et mots de passe sans les écrire dans le code. Garder une sauvegarde chiffrée de la clé et des mots de passe. Ne jamais les envoyer dans le chat ni les committer. Encoder le fichier en Base64 localement et coller le résultat uniquement dans un secret GitHub ; Base64 n’est pas un chiffrement.

Dans **GitHub → Settings → Secrets and variables → Actions**, créer :

| Secret | Contenu à fournir |
|---|---|
| `PLAYER_UPLOAD_KEYSTORE_BASE64` | Fichier de la clé d’envoi encodé en Base64 |
| `PLAYER_KEYSTORE_PASSWORD` | Mot de passe du coffre |
| `PLAYER_KEY_ALIAS` | Alias choisi lors de la création |
| `PLAYER_KEY_PASSWORD` | Mot de passe de cette clé |

Ces secrets sont utilisés uniquement sur le runner. Le fichier est créé dans son dossier temporaire avec accès restreint et supprimé en fin d’exécution, même si une étape échoue. Les secrets ne sont jamais inclus dans les Artifacts. Ne lancer la version signée que sur une branche de confiance, car le code de cette branche peut accéder aux secrets pendant l’exécution.

### Compiler la release

Relancer le même workflow avec **build_mode = play-release**, l’origine publiée et une version. Chaque nouvelle soumission Play doit avoir un `version_code` strictement supérieur au précédent ; le workflow contrôle son format, pas la dernière version déjà déposée dans votre compte Play.

Ce mode produit également l’APK debug, puis exécute `lintRelease assembleRelease bundleRelease`. Sans les quatre secrets, la release échoue explicitement : aucune signature debug ni AAB prétendument prêt n’est substitué.

Télécharger **screenflow-tv-play-release**, qui contient :
- `app-release.aab` : bundle signé avec votre clé d’envoi, destiné à Play Console.
- `app-release.apk` : APK signé pour les installations manuelles de production/test.
- `lint-results-release.html` : rapport Android Lint.

Avec **Play App Signing**, Google conserve la clé de signature de distribution et votre clé sert à autoriser les envois. Les APK téléchargés depuis Play sont signés par Google : un APK manuel signé avec la clé d’envoi ne peut pas forcément les remplacer. Utiliser les pistes de test Play pour valider les mises à jour réellement distribuées.

### Compilation locale facultative

Avec Bun, Java 21 et le SDK Android requis installés :

```sh
bun install --frozen-lockfile
VITE_PLAYER_API_ORIGIN=https://screenflow.live VITE_PLAYER_VERSION_NAME=1.0.0 bun run player:build
bun run android:prepare
bun run android:sync
cd android
./gradlew assembleDebug
```

Pour `lintRelease assembleRelease bundleRelease`, fournir dans l’environnement local `PLAYER_VERSION_CODE`, `PLAYER_VERSION_NAME`, `PLAYER_KEYSTORE_PATH`, `PLAYER_KEYSTORE_PASSWORD`, `PLAYER_KEY_ALIAS` et `PLAYER_KEY_PASSWORD`. Ne pas les mettre dans un fichier versionné ou dans une commande conservée avec les valeurs de mots de passe. Le dossier `android/` est généré : modifier les modèles versionnés, pas ses sorties, et ne pas committer le dossier généré, `dist-player`, les clés ou les dépendances.

## 3. Conformité TV préparée

- Manifeste dédié aux appareils **Android TV/Google TV** : leanback requis, `LEANBACK_LAUNCHER`, tactile/faketouch/caméra/microphone/téléphonie/localisation/Wi-Fi matériel facultatifs. Une TV Ethernet n’est pas exclue. La distribution Play préparée n’est pas destinée aux téléphones.
- Bannière embarquée **320 × 180 pixels** contenant le nom et le logo existants ; icônes de lancement classiques et adaptatives. Icône classique xhdpi **160 × 160**. Les ressources sont natives et ne nécessitent pas de connexion.
- SDK de compilation et cible **36**, minimum **24** (Android 7), compatibles avec le modèle Capacitor 8 installé. Au 21 novembre 2026, la documentation officielle indique API 34 minimum pour les nouvelles applications TV ; la cible 36 retenue le dépasse. Recontrôler la règle dans Play Console le jour de l’envoi.
- ABI ARM 32/64 bits et x86 32/64 bits autorisées. Le lecteur est principalement Java/WebView : le navigateur système n’est pas un moteur natif embarqué par notre application.
- Le workflow examine les **vrais APK/AAB générés** : chaque bibliothèque `.so` doit avoir des segments ELF compatibles **16 Ko** ; un équivalent 64 bits est requis pour chaque bibliothèque 32 bits. Il vérifie aussi l’alignement APK avec `zipalign -P 16`, les signatures et les permissions du manifeste fusionné. AGP 8.13 et le packaging natif moderne préparent le bundle ; la validation des APK issus du bundle par Play et l’exécution sur un appareil/émulateur 16 Ko restent nécessaires. Les tests du vérificateur utilisent des ELF synthétiques, pas une compilation de l’application.
- Permissions fusionnées autorisées : Internet, état réseau, démarrage, et protection de receiver interne AndroidX. Une nouvelle permission inattendue fait échouer l’audit.
- Plein écran/paysage natifs existants conservés. Les flèches déplacent le focus dans les deux sens ; Entrée active les commandes ; le bouton Retour natif ferme les commandes puis quitte à la racine sans effacer le jumelage. Le focus ne disparaît pas pendant l’utilisation des commandes.
- Jumelage, heartbeat, playlists, cache et commandes existants restent utilisés. Le coffre Keystore ne revient plus au stockage en clair en cas d’échec. Les anciens identifiants de secours sont migrés après chiffrement réussi. En cas de panne du coffre, le lecteur propose de réessayer sans réinscrire une TV existante.
- Sauvegarde Android/cloud et transfert d’identité désactivés : une identité ne doit pas être clonée sur une autre TV. Désinstallation, effacement des données et révocation ne sont pas des redémarrages ordinaires.
- Démarrage automatique existant conservé, uniquement quand Android l’autorise. Android moderne nécessite le choix explicite de l’application comme Accueil ou une gestion device-owner compatible ; le Play Store n’accorde pas ces privilèges.
- Murs d’images et tests de position existants conservés. Le déplacement à la souris dans « Configurer le mur » est enregistré et partagé avec le découpage réellement lu ; le bouton Recentrer annule le décalage. Les anciens lecteurs doivent être mis à jour pour appliquer ce placement.

## 4. Préparer la fiche Google Play Console

1. Disposer d’un compte développeur Google Play vérifié et créer l’application avec l’identifiant existant.
2. Choisir les langues, le nom public définitif, la catégorie et les pays ; activer la distribution **Android TV** selon les options de Console.
3. Activer Play App Signing et déposer l’AAB signé dans une piste de **test interne**, avant une demande de production.
4. Fournir la description française, une adresse de support, une politique de confidentialité accessible publiquement et les informations légales de l’éditeur.
5. Remplir honnêtement les formulaires : sécurité des données, présence de publicités, classification du contenu, public cible et accès à l’application. Le lecteur traite des identifiants de terminal, informations de connexion/lecture et médias privés. Vérifier les catégories exactes avec vos pratiques réelles ; ne pas déclarer « aucune donnée » automatiquement.
6. Fournir aux examinateurs une méthode testable pour jumeler une TV et accéder à de vrais contenus autorisés, avec un compte d’essai dédié si nécessaire ; aucun accès à vos données de production.
7. Ajouter l’icône de fiche **512 × 512**, le visuel de présentation **1024 × 500** et de vraies captures TV **16:9** conformes aux champs affichés par Console. La bannière Android est déjà intégrée ; les captures navigateur de nos essais ne remplacent pas les captures de l’APK sur TV/émulateur.
8. Examiner les rapports de test, corriger les problèmes TV ou 16 Ko, puis demander l’accès production et soumettre. Certains nouveaux comptes personnels ont une période de tests fermés imposée : suivre les conditions affichées pour votre compte.

## 5. Essais obligatoires avant soumission

- Installer sur au moins une Android TV et une Google TV ; essayer toutes les actions à la télécommande, sans souris ni tactile, en 720p/1080p et sur votre TV 4K.
- Retour ferme les commandes puis retourne à l’accueil Android ; relancer conserve l’association.
- Jumeler via un vrai code, assigner une image et une vidéo, vérifier téléchargement, boucle, codecs, reconnection et commandes confirmées dans l’administration.
- Éteindre/rebooter puis retrouver la même TV, le même cache et la playlist sans nouveau code. Tester hors réseau sur l’APK embarqué, après téléchargement complet.
- Tester mise à jour de même signature depuis une piste Play sans désinstaller, reprise, mémoire, durée de lecture et éventuelles restrictions constructeur.
- Tester toutes les positions d’un mur, le déplacement enregistré, pause/reprise, l’expiration du test de position et la dérive réelle. Il s’agit d’une synchronisation best-effort, pas d’un verrouillage matériel des images.
- Vérifier la révocation et les échecs du coffre ; une erreur de stockage ne doit pas demander silencieusement un nouveau jumelage.
- Installer les APK distribués depuis l’AAB sur un environnement **16 Ko** et vérifier l’absence de problème ; contrôler le rapport de Play Console et tester ARM64 réel.

Les vidéos restent muettes pour l’autoplay WebView ; pas de garantie sur tous les codecs ni sur la synchronisation physique des murs. Le navigateur web ouvert fonctionne hors connexion avec son cache, mais un démarrage web à froid hors réseau n’est pas garanti : l’APK, lui, embarque la page. La programmation horaire n’est pas résolue par le manifeste actuel. Aucun contournement des restrictions Android ni simulation de présence n’est ajouté.

## 6. Tests effectués et fichiers modifiés

**Effectués :** 100 tests Vitest réussis sur 22 fichiers ; 8 tests Python du vérificateur ELF/permissions réussis ; politique native auto-start compilée et exécutée sous Java 21 ; workflow validé par actionlint. Génération idempotente testée contre le modèle Capacitor installé, sans compiler l’APK. Application web vérifiée sans erreurs de rendu.

**Parcours réel navigateur :** code reçu, TV jumelée depuis un compte connecté, image importée/assignée/téléchargée puis affichée ; navigation D-pad, pause par Entrée, Retour fermant les commandes ; association conservée après rechargement en ligne et lecture maintenue hors réseau. Mur créé, image déplacée à la souris, sauvegardée puis relue après rechargement. Données d’essai retirées. Ces essais ne constituent pas des tests d’un appareil Android ni de la passerelle native Retour/Keystore. La reprise native est vérifiée par tests automatisés avec adaptateurs simulés, et reste à valider sur TV.

| Fichiers | Modification |
|---|---|
| `.github/workflows/android-player.yml` | Workflow unique, modes debug/release, versions, clé temporaire, APK/AAB, audits |
| `android-support/play-release.gradle`, `scripts/android-play.mjs` | Cible SDK, version, ABI, signature obligatoire release, intégration idempotente |
| `scripts/android-manifest.mjs`, `scripts/prepare-android.mjs` | TV requise, restrictions de sauvegarde/HTTP, ressources et Gradle |
| `android-support/data_extraction_rules.xml`, `android-support/DeviceVaultPlugin.java` | Exclusion sauvegarde/transfert, erreur de suppression du coffre signalée |
| `android-support/res/**` | Bannière PNG et icônes ; ancien `tv_banner.xml` retiré |
| `src/player/tv-navigation.ts`, `src/player/player.tsx`, `src/player/platform.ts`, `src/styles.css` | Focus/Retour, vraie version et plateforme, coffre sans secours en clair, contrôles lisibles |
| `scripts/check-android-artifacts.py`, `scripts/check-android-manifest.py`, `scripts/test-android-artifacts.py` | Audits sur résultats compilés et tests des vérificateurs |
| `src/test/android-autostart.test.ts`, `android-play.test.ts`, `player-vault.test.ts`, `player-storage-error.test.tsx`, `tv-navigation.test.ts` | Tests ajoutés/étendus des règles Android et de sécurité |
| `src/components/wall-media-preview.tsx`, `src/lib/video-wall.ts`, `src/routes/_authenticated/video-walls.tsx`, `src/test/wall-media-placement.test.ts` | Glisser, recentrer, aperçu et découpage commun testés |
| `drizzle/migrations/0013_wall_media_placement.sql` et métadonnées/types générés | Décalages du mur, RPC propriétaire et compatibilité des clients existants |
| `AGENTS.md`, `roadmap.md`, `PLAYER_ANDROID.md`, `GOOGLE_PLAY_TV.md` | Règles et documentation |

**Reste à fournir :** clé d’envoi et secrets GitHub, compte développeur/accès dépôt, choix définitif de fiche, coordonnées et documents légaux, captures réelles, contenus/accès d’examen, TV de test et exécution du workflow. Le dépôt local est sauvegardé par commit ; aucun accès direct GitHub permettant de vérifier sa synchronisation ou lancer Actions n’est établi dans cet environnement.

## Références officielles consultées

- [Exigences target SDK (dont Android TV, août 2026)](https://developer.android.com/google/play/requirements/target-sdk)
- [Distribution TV : 64 bits et pages 16 Ko depuis août 2026](https://developer.android.com/training/tv/publishing/distribute)
- [Qualité des applications TV](https://developer.android.com/docs/quality-guidelines/tv-app-quality)
- [Icônes et bannières TV](https://developer.android.com/design/ui/tv/guides/system/tv-app-icon-guidelines)
- [Création d’une application TV et manifeste](https://developer.android.com/training/tv/get-started/create)