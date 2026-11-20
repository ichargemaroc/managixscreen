# Roadmap — Sauvegarde réelle ScreenFlow

## Appairage QR code
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
