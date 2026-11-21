# Roadmap — Sauvegarde réelle ScreenFlow

## Son des vidéos diffusées
- [x] Activer le son dans les playlists et les murs, avec reprise explicite si le navigateur bloque la lecture
- [x] 114 tests réussis ; import, jumelage, affectation et lecture réelle avec piste audio décodée vérifiés, y compris après rechargement ; données de vérification supprimées
- [ ] Essai physique TV : nouvelle compilation APK et installation sur le matériel nécessaires

## Blocage du coffre sur TV — version 1.0.1
- [x] Ajouter des diagnostics sûrs distinguant module absent, délai, déchiffrement et identité invalide ; conserver le jumelage
- [x] Reproduire VAULT_TIMEOUT : le proxy Capacitor renvoyé par une fonction async bloque avant la lecture ; remplacer par un adaptateur ordinaire et ajouter un test de régression
- [ ] Valider sur la TV Mi : nouvelle compilation APK et installation sur le matériel nécessaires

## Préparation Google Play TV
- [x] Positionnement de l’image à la souris, recentrage, coordonnées partagées avec le lecteur ; sauvegarde et relecture vérifiées sur un vrai mur
- [x] Manifeste TV, identité graphique embarquée, versionnement et signature de production sans secrets dans le dépôt
- [x] Workflow manuel unique : APK de test, AAB release, vérifications ELF 16 Ko, 64 bits, permissions, signatures et documentation française GOOGLE_PLAY_TV.md
- [x] Navigation télécommande/Retour et protection du coffre natif ; 100 tests Vitest, 8 tests Python, politique JVM Java 21 et actionlint réussis ; jumelage/image/D-pad/reprise en ligne puis hors réseau vérifiés dans le navigateur
- [ ] Compilation signée et tests Android TV physiques : clés de signature, exécution GitHub et TV nécessaires

## Test de position des murs
- [x] Commandes individuelles sécurisées depuis les affectations réelles, durée bornée, arrêt et suivi honnête des accusés
- [x] Écran de test partagé Android/web, grille numérotée et contrôles dans l’administration
- [x] Tests automatisés, parcours connecté avec commande affichée/confirmée, TV hors ligne non envoyée, arrêt et expiration hors réseau ; documentation d’utilisation
- [ ] Compilation APK et essais sur TV physiques : matériel et exécution GitHub indisponibles

## Murs d’images
- [x] Redimensionnement proportionnel du contenu avec curseur et zoom ; taille 150 % enregistrée puis relue, réduction/recentrage et affichage mobile vérifiés ; 28 tests réussis
- [x] Sélecteur détaillé par cellule, remplacement/retrait, erreurs visibles et enregistrement des affectations datées
- [x] Affectation, déplacement et retrait relus après rechargement sur compte réel ; 41 tests du mur, du protocole appareil et du lecteur réussis, sans modifier la transmission existante
- [x] Configuration, grille, affectations uniques et contenu depuis la médiathèque
- [x] Tables isolées par propriétaire, contrôles transactionnels et manifeste appareil sécurisé
- [x] Découpage réel au rendu, cache et horloge commune dans le lecteur partagé Android/web ; fichier global téléchargé, sans transcodage serveur
- [x] 71 tests réussis ; deux lecteurs image, vidéo locale/hors ligne, reprise après rechargement et validations transactionnelles vérifiés ; rapport VIDEO_WALL.md
- [ ] Vérification APK et synchronisation sur TV physiques : matériel et exécution GitHub indisponibles

## Démarrage automatique Android TV
- [x] Receiver natif BOOT_COMPLETED et MY_PACKAGE_REPLACED, permissions et intégration à la préparation Capacitor
- [x] Démarrage limité aux cas autorisés, alternative Accueil Android et plein écran moderne
- [x] Politique native compilée/testée avec Java 21 ; 16 tests réussis, génération idempotente du manifeste réel Capacitor et reprise locale d’un lecteur jumelé vérifiées
- [x] Documentation : limites Android, choix Accueil, mise à jour sans désinstallation, reprise sécurisée et protocole d’essai matériel
- [ ] Compilation complète du nouvel APK et tests boot/mise à jour sur télévision réelle : pas de TV ni d’exécution GitHub disponibles dans cet environnement

## Correction installation SDK Android TV
- [x] Remplacer les packages SDK obsolètes ; SDK 36, build-tools 35.0.0 et Java 21 vérifiés avec Capacitor 8 / Gradle 8.14.3 / AGP 8.13
- [x] YAML validé avec actionlint ; lancement manuel, api_origin et Artifact APK conservés ; nouvelle exécution GitHub non lancée

## Style Google Play Console
- [x] Harmoniser les couleurs, la typographie, le menu et les boutons avec la capture fournie
- [x] Adapter la connexion et le tableau de bord ; navigation connectée vérifiée sur les sept pages, ordinateur et téléphone sans erreur

## Appairage QR code
- [x] Scan caméra et photo depuis Ajouter une TV, saisie manuelle conservée
- [x] Lecture caméra de test et photo QR validées ; jumelage réel mobile, relecture après rechargement et lecteur connecté confirmés ; caméra physique du téléphone non testée
- [x] QR code local sur le lecteur, lien public sans identité secrète
- [x] Connexion et confirmation de jumelage sur téléphone
- [x] QR décodé, jumelage réel confirmé sur téléphone et lecteur, 9 tests réussis ; OAuth externe et caméra physique non testés

## Lecteur TV web et préparation Android
- [x] Lecteur public séparé /player, jumelage réel et synchronisation
- [x] Images, vidéos, cache local et reprise hors connexion, commandes et télécommande
- [x] Modules Android, configuration Capacitor et workflow GitHub Actions préparés ; APK non compilé
- [x] 36 tests réussis ; jumelage web réel, photo, MP4, coupure réseau, reprise et commande confirmée dans l’administration
- [x] Limites documentées : tests Android, signature et lancement kiosk au boot restent à réaliser ; démarrage navigateur à froid hors réseau non garanti

## Communication du futur lecteur Android
- [x] Télémétrie authentifiée, manifeste de contenu et liens privés temporaires
- [x] File de commandes, lecture et accusés de réception isolés par appareil
- [x] Affectation et suivi dans les détails d’écran, documentation du protocole
- [x] 31 tests réussis et pages connectées vérifiées sans simuler de TV ; appels anonymes refusés
- [x] Limite explicitée : aucun appareil jumelé disponible pour vérifier l’affectation, le téléchargement et l’exécution de bout en bout ; lecteur Android à développer et mise à jour à publier

## Jumelage sécurisé
- [x] Sessions expirant en 10 minutes et identité secrète par appareil
- [x] Réclamation atomique, révocation et heartbeat vérifié
- [x] Formulaire de jumelage et détails d’écran
- [x] Protection spécifique approuvée et activée : limites persistantes de demandes, essais par compte et appels par appareil
- [x] Tests des droits et parcours connecté ; documentation du futur lecteur Android

- [x] Cloud, comptes, pages protégées et stockage privé existants
- [x] Compléter les champs demandés et les relations groupes / membres / programmations
- [x] Sécuriser les références entre propriétaires et sauvegarder les playlists atomiquement
- [x] Finaliser profil, écrans, médias, playlists, groupes et programmation sans changer la navigation
- [x] Vérifier les données réelles, les droits et le parcours connecté sur ordinateur et téléphone
- [x] Limites identifiées : lecteur Android natif et diffusion programmée à développer ; protocole de jumelage/heartbeat testé avec un client de test uniquement ; invitations d’équipe non implémentées ; OAuth externe non testé ; publication de cette mise à jour nécessaire
