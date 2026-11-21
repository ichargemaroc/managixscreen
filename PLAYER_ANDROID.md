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

Le lancement de l’activité reprend le manifeste local et l’identité existante sans redemander de code de jumelage. Le démarrage natif est décrit ci-dessous ; il ne dépend pas d’une page web ouverte.

## Démarrage automatique natif

La préparation Capacitor inscrit `RECEIVE_BOOT_COMPLETED`, le receiver non exporté `BootReceiver` et ses événements `BOOT_COMPLETED` (allumage/redémarrage complet) et `MY_PACKAGE_REPLACED` (mise à jour de cette application uniquement). Les sources Java et la transformation idempotente du manifeste sont versionnées et incluses dans chaque APK par le workflow existant. `LOCKED_BOOT_COMPLETED` est volontairement absent : le coffre chiffré et les données WebView doivent être disponibles après le déverrouillage Android.

- **Android 9 et antérieur** : le receiver tente directement d’ouvrir `MainActivity`. Certaines TV imposent une autorisation fabricant supplémentaire.
- **Android 10 et ultérieur** : un receiver ordinaire ne peut pas imposer une ouverture en arrière-plan. La politique ne tente le lancement direct que si cette application est réellement device-owner (exception Android). Cette version ne provisionne pas un device-owner ni un administrateur ; elle ne s’attribue aucun privilège.
- **Solution compatible recommandée sur Android moderne** : l’activité est également déclarée comme candidate **Accueil Android (HOME)**. Sur une TV dédiée, sélectionner **ScreenFlow TV** comme application d’accueil par défaut dans les réglages de la TV, ou via le choix « Toujours » proposé par le bouton Accueil. Android lance alors lui-même le Player au démarrage et au bouton Accueil, indépendamment des restrictions du receiver. Ce choix est explicite : l’application ne remplace pas silencieusement l’accueil. Pour revenir à l’accueil habituel, changer l’application par défaut dans les réglages Android.
- Si la TV masque le choix de l’accueil, utiliser une solution de gestion dédiée (DPC/MDM device-owner) pouvant attribuer `app.screenflow.player/.MainActivity` comme accueil persistant via `DevicePolicyManager.addPersistentPreferredActivity`, ou l’option de démarrage automatique officiellement fournie par le fabricant. L’APK seul ne peut garantir le boot automatique sur ces TV verrouillées. Pas de service permanent, de faux appel/alarme plein écran ni de contournement des protections Android.

Le receiver ne télécharge pas de fichiers et ne lit/efface aucun token : il ouvre seulement l’activité. Le coffre Android Keystore, l’origine API et IndexedDB sont inchangés. Une identité jumelée reprend la playlist locale puis synchronise avec le serveur ; sans réseau, seuls les médias déjà téléchargés peuvent être lus. Une révocation, l’effacement des données ou la désinstallation exigent un nouveau jumelage ; un simple redémarrage ne l’exige pas. Pour une mise à jour, installer l’APK **par-dessus** l’existant, avec le même identifiant et la même signature, sans désinstaller. Les signatures debug peuvent changer entre environnements CI : en cas de refus de mise à jour, ne pas désinstaller une TV de production sans prévoir son rejumelage ; une signature de distribution stable reste nécessaire.

`singleTask` et les flags `NEW_TASK | CLEAR_TOP | SINGLE_TOP` réutilisent l’activité ; la politique filtre les actions et limite les tentatives rapprochées à une par 10 secondes dans le processus. Une exception est journalisée sans nouvelle tentative ni boucle. Le mode paysage et le maintien d’éveil restent actifs ; Android 11+ masque les barres via `WindowInsetsController`, les anciennes versions utilisent le mode immersif existant. Le fabricant peut toujours réserver certaines barres système.

### Installation et validation sur TV réelle

1. Relancer le workflow manuel avec `api_origin=https://screenflow.live`, télécharger l’Artifact et installer l’APK. Ouvrir l’application au moins une fois : Android ne délivre pas les broadcasts aux applications jamais lancées ou arrêtées de force.
2. Jumeler et affecter une playlist si ce n’est pas déjà fait ; attendre son téléchargement complet. Configurer ScreenFlow TV comme Accueil par défaut sur Android moderne (ou la politique fabricant/MDM).
3. Éteindre complètement puis rallumer la TV, et effectuer un redémarrage Android : vérifier l’ouverture sans télécommande, le paysage, les barres masquées, la reprise de la même TV dans l’administration et la lecture sans nouveau code.
4. Refaire le démarrage hors réseau : vérifier la playlist téléchargée, puis la synchronisation après retour du réseau.
5. Installer une mise à jour de même signature sans effacer les données ; vérifier la conservation du jumelage et le retour au Player. Sur Android moderne sans HOME/device-owner, l’événement de mise à jour seul ne force pas l’ouverture : revenir via Accueil.
6. Vérifier qu’Accueil/réouverture et événements rapprochés ne créent pas plusieurs lecteurs. Tester aussi une TV refusant le changement d’accueil : le lancement manuel doit rester disponible. Après « Forcer l’arrêt », relancer manuellement avant de retester.

Un simple réveil de veille n’est pas un boot et n’émet pas nécessairement `BOOT_COMPLETED` ; si Android conserve le Player au premier plan, il reprend à son réveil. Les événements constructeur doivent être validés sur le modèle réel. Les contrôles JVM et du manifeste ne prouvent ni la réception effective du broadcast ni l’ouverture sur une TV : ces essais matériels et la compilation complète de l’APK restent à réaliser.

Références : [restrictions Android des activités en arrière-plan](https://developer.android.com/guide/components/activities/background-starts), [application HOME pour appareils dédiés](https://developer.android.com/work/dpc/dedicated-devices/cookbook).

## Google Play TV et GitHub Actions

### Diagnostic « Stockage sécurisé indisponible »

Le lecteur affiche désormais un code fixe sans token ni détail privé : `VAULT_PLUGIN_MISSING` (module natif absent), `VAULT_TIMEOUT` (absence de réponse), `VAULT_READ_FAILED` (échec du déchiffrement Android), `VAULT_INCOMPLETE` (données chiffrées incomplètes), `VAULT_INVALID_IDENTITY` (identité invalide) ou `VAULT_UNKNOWN` (autre panne). Le pied de page identifie Android avant la lecture du coffre, même en cas d’échec. Aucun échec ne déclenche de nouveau jumelage ni d’effacement automatique. Photographier le code avec le modèle de TV pour poursuivre le diagnostic ; ne pas désinstaller ou effacer les données d’un écran déjà jumelé. Ces diagnostics nécessitent un nouvel APK ; la cause de la panne photographiée en version 1.0.1 n’est pas encore établie sur le matériel réel.

`.github/workflows/android-player.yml` reste l’unique workflow manuel. Le mode `debug` produit l’APK de test ; `play-release` prépare un APK et un AAB signés avec une clé d’envoi fournie par les secrets GitHub. Java 21, SDK 36 et build-tools 35.0.0 sont conservés. Les contrôles exécutent les tests, vérifient les permissions fusionnées, les segments ELF 16 Ko, les équivalents 64 bits et l’alignement APK. **Cette préparation n’a pas compilé de nouvel APK/AAB ni lancé GitHub Actions.** Voir [GOOGLE_PLAY_TV.md](GOOGLE_PLAY_TV.md) pour la signature, les fichiers et la soumission.

Le manifeste cible Android TV/Google TV (leanback requis) : la distribution Play n’est pas destinée aux téléphones. Le coffre natif n’utilise plus de secours en clair ; les anciens identifiants de secours sont migrés uniquement après écriture chiffrée réussie. Une panne du coffre bloque le nouveau jumelage plutôt que de remplacer l’association existante. Les sauvegardes cloud et transferts Android sont exclus. Le bouton Retour natif ferme les commandes ouvertes, puis quitte l’application à la racine sans effacer le jumelage. Les flèches déplacent le focus dans les deux directions et ne changent plus le média par accident.

Connecter la synchronisation GitHub dans les paramètres Git de Lovable ; ce workflow ne connecte pas un dépôt et ne lance pas automatiquement une compilation.

## API réutilisées

Aucune table dupliquée : request, status, heartbeat, content, commands et commands/ack sous /api/public/devices. Voir DEVICE_API.md. La programmation horaire n’est pas résolue par le manifeste actuel ; seule la playlist directement affectée est lue.

## Vérifications réalisées

36 tests automatisés réussis. Le lecteur navigateur a été jumelé via un vrai code réclamé depuis l’administration : photo téléchargée et affichée depuis un fichier local, MP4 en lecture, navigation entre médias hors réseau, reprise de l’identité et de la playlist après rechargement en ligne. La commande Actualiser le contenu a été reçue et exécutée, puis son statut Exécutée a été relu dans l’administration. Écrans de jumelage et lecture vérifiés sur paysage 1920×1080 et téléphone 430×786. Les données de ce compte temporaire ont été nettoyées. Aucun appareil Android ni APK n’a été simulé, compilé ou validé.