# Roadmap — Sauvegarde réelle ScreenFlow

## Modification des affectations de playlist
- [x] Ajout et retrait des TV et groupes déjà affectés ; couverture par groupe et sélection multiple sans doublons.
- [x] Remplacement transactionnel propriétaire ; les retraits ciblent uniquement cette playlist, actualisation des TV modifiées.
- [x] 15 tests ciblés réussis ; retrait puis remise d’une TV de vérification relus après rechargement, affectation initiale restaurée ; tablette/téléphone sans débordement et compilation correcte.

## Animation des playlists
- [x] Animation enregistrée sur la playlist ; réglages existants repris, transmission compatible aux lecteurs et par zone ; murs sans animation.
- [x] Sélecteur déplacé des fiches Écran au détail de playlist ; Zoom enregistré puis relu après rechargement dans une session réelle, réglage initial restauré ; tablette et téléphone vérifiés.
- [x] Tests ciblés : 53 réussis ; compilation correcte.
- [ ] Validation des animations par zone sur Android TV physique : nouvel APK et matériel nécessaires.

## Aperçu depuis Supervision
- [x] Bouton par TV, aperçu du média réellement signalé, images/vidéos/pages Web et états indisponible/hors ligne ; aucune fausse capture en direct
- [x] Ouverture connectée vérifiée sur trois TV, tablette/téléphone sans débordement ni erreur ; trois tests du store réussis et compilation correcte
- [ ] Vérifier une image réellement signalée : les trois TV accessibles sont hors ligne et leurs médias signalés sont absents ; aucune donnée client modifiée

## Musique de fond par écran
- [x] Import MP3 privé (50 Mo), affectation par écran, volume et coupure optionnelle pendant les vidéos ; accès depuis les actions et détails d’écran
- [x] Manifeste protégé, empreinte des réglages, cache hors connexion atomique et audio continu indépendant des diapositives ; suivi des vidéos multi-zones
- [x] 274 tests réussis ; écran temporaire jumelé, MP3 importé puis relu à 35 %, piste locale décodée et lue avec temps avançant, téléphone sans débordement ; données temporaires supprimées ; continuité entre images et reprise hors connexion couvertes par tests automatisés
- [ ] Validation Android TV physique : nouvel APK signé et matériel nécessaires

## Rotation physique des écrans
- [x] Sélecteur 0°, 90°, 180° et 270° dans Gérer / renommer et les détails d’écran, sauvegarde propriétaire et manifeste compatible
- [x] Rotation du lecteur partagé et des pages Web natives isolées, dimensions portrait et cache sans modifier les fichiers ni le jumelage
- [x] 260 tests Vitest et 11 calculs natifs réussis ; écran temporaire réellement jumelé, image importée/diffusée aux quatre rotations, réglage relu après rechargement et reprise locale avec les accès de synchronisation/stockage coupés ; formats ordinateur/tablette/téléphone vérifiés, données temporaires supprimées
- [ ] Installation et validation sur Android TV physique : nouvel APK signé avec la clé d’origine et matériel nécessaires

## Conservation du jumelage après mise à jour APK
- [x] Signature persistante obligatoire pour les APK publiés ; validation native identifiant/version/signature avant installation, sans effacer le jumelage
- [x] Reprise du même code après commande de mise à jour et redémarrage ; récupération d’une confirmation serveur interrompue même après expiration du code, sans nouvel enrôlement
- [x] 28 tests Vitest et 7 vérifications JVM réussis ; workflow vérifié avec actionlint et application sans erreur de compilation
- [ ] Installation sur TV physique : clé d’origine et matériel nécessaires

## Téléchargement interrompu sur la connexion
- [x] Connexion normale vérifiée ; erreurs réseau simultanées et ancien contenu de démarrage repérés dans les journaux
- [x] Centraliser la récupération des erreurs interceptées, sans rechargement automatique hors ligne ni accès au stockage avant protection
- [x] 21 tests réussis ; téléchargement réellement bloqué puis connexion rouverte avec Réessayer au format téléphone ; onglet personnel indisponible à l’inspection directe
- [x] Vérification étendue : l’entrée du lecteur indépendant ne proposait pas de secours avant démarrage ; injection du même mécanisme ajoutée sans modifier son identité ni son cache
- [x] 17 tests réussis ; sept pages publiques et accueil connecté ouverts sans erreur ; HTML du lecteur indépendant testé avec téléchargement bloqué ; compilation APK et TV physique non vérifiées

## Écran blanc après connexion
- [x] Reproduire l’erreur AuthenticatedLayout avec un ancien module de données sans StoreContent
- [x] Isoler l’affichage de chargement dans son propre module sans changer les accès ni les données
- [x] 16 tests réussis ; accueil connecté → écrans → accueil vérifié sur ordinateur et téléphone sans erreur ; aucune donnée client modifiée
- [x] Pages partageant l’espace connecté et entrées publiques relues ; récupération bornée ajoutée pour les onglets conservant l’ancien affichage
- [x] 24 tests réussis ; treize affichages connectés relus dans le navigateur sans erreur, administration refusée au compte non administrateur ; onglet personnel inaccessible à la vérification directe

## Correction connexion iPhone
- [x] Supprimer la dépendance au helper de connexion et rendre la mise en cache facultative sans modifier la session ni les contrôles d’accès
- [x] 10 tests réussis : redirection après connexion, cache indisponible et refus d’identifiants ; accueil connecté vérifié au format iPhone sans erreur ; aucune donnée client modifiée

## Accueil après authentification
- [x] Réutiliser la réponse de connexion vérifiée pendant 30 secondes sans affaiblir les contrôles d’accès
- [x] Afficher le menu pendant le chargement et limiter l’accueil à quatre lectures utiles, sans signer les médias
- [x] 224 tests réussis ; accueil connecté, médiathèque et écrans relus sur ordinateur et téléphone, menu accessible pendant un chargement volontairement ralenti ; aucune donnée client modifiée

## Multi-zones, intégrations et gestion d’équipe
- [x] Compositions de deux à quatre zones, playlists indépendantes, aperçu, proportions, une zone sonore et affectation ; manifeste et cache atomique vérifiés
- [x] Sources Canva publiées, météo MET Norway réelle et Instagram public ; aucun compte fournisseur fictivement connecté, restrictions de publication documentées
- [x] Invitations expi­rantes, collaborateurs de préparation, propositions, aperçu et validation propriétaire ; copie des médias, révocation et isolation vérifiées sur deux comptes temporaires
- [x] 206 tests réussis ; composition enregistrée/affectée/relue, deux photos diffusées et reprise, météo enregistrée/affichée, droits tiers refusés ; données temporaires nettoyées
- [ ] Multi-zones et pages intégrées sur Android TV physique : nouvelle compilation APK et matériel nécessaires
- [ ] Affichage Canva/Instagram réel du client : liens publiés autorisant l’intégration nécessaires ; aucune connexion OAuth ni flux de compte automatisé

## Vérification ciblée de l’administration — 22 novembre 2026
- [x] Confirmer le rôle du compte administrateur principal et ouvrir son administration avec une session réelle, sans modifier les permissions déjà correctes
- [x] Relire les six clients, leurs écrans, les huit forfaits et les statistiques ; vérifier les formulaires sans enregistrer de changements
- [x] Vérifier le refus des lectures et commandes administratives pour un client normal, et examiner les politiques de protection
- [x] Rapport BILLING_AUDIT.md, 45 tests réussis, refus d’écriture directe et empreintes inchangées ; aucune correction de permissions nécessaire
- [ ] Tests d’écriture commerciale et quota réel : environnement isolé ou autorisation de données de test nécessaires ; hors périmètre non destructif de cet audit

## Abonnements SaaS par écrans
- [ ] Raccorder le kit de paiement personnel ultérieurement, à la demande du client ; fournisseur/documentation et tarifs attendus, Paddle non activé
- [x] Compte administrateur désigné et confirmé : karim.gharbi@me.com
- [x] Examiner le store, les pages, le jumelage transactionnel, les identités Players et les tables Cloud existantes ; contrôle du fournisseur effectué
- [x] Plan approuvé ; pays légal confirmé : Maroc, clientèle mondiale ; Paddle éligible mais non activé, raccordement du kit personnel reporté par le client
- [x] Catalogue centralisé, historique, droits d’écrans et paramètres avec lecture par propriétaire et rôle administrateur séparé ; comptes existants conservés en accès historique
- [x] Quota transactionnel au jumelage et à la réactivation, insertions directes refusées, identité unique et désactivation réversible sans effacer les médias locaux
- [x] Pages Abonnement et Administration, accès depuis le menu/tableau de bord, tarifs et paramètres administrables, annulation/portail explicitement indisponibles sans paiement
- [x] Client temporaire : cinq TV acceptées, sixième refusée dans le formulaire puis acceptée après passage à dix, désactivation/réactivation, concurrence à la dernière place, accès/écriture entre clients refusés, suspension/réactivation sans perte
- [x] Catalogue : paramètres enregistrés, palier de trente créé, prix annuel relu puis données de test retirées ; 191 tests réussis, ordinateur/téléphone sans erreur observée
- [x] Lecteur web : image réellement affectée/diffusée, désactivation et réactivation sans nouveau jumelage, reprise depuis le cache avec API appareil indisponible ; aucun démarrage web totalement hors réseau garanti
- [ ] Paiement, portail, événements signés, renouvellements/remboursements et tests de paiement : kit personnel et prix définitifs attendus, raccordement reporté
- [ ] Désactivation/réactivation et reprise sur Android TV physique : APK mis à jour et matériel nécessaires ; anciens APK/hors ligne peuvent conserver le contenu local

## Rapidité de la Médiathèque
- [x] Aperçus privés compressés 480×270, chargement différé, vidéos téléchargées uniquement à l’ouverture, liens originaux groupés et conservés dans le cache de session
- [x] Import/relecture connectés : aperçu de 19 Ko pour un original de 3,7 Mo, original 2800×1600 conservé, aucune vidéo téléchargée dans la grille ni nouvelle signature au retour ; téléphone sans débordement, fichiers temporaires supprimés et 158 tests réussis

## Actualisation des playlists affectées
- [x] Réutiliser les médias locaux après modification d’ordre/durée, migrer les anciens fichiers locaux et sérialiser les remplacements du cache
- [x] Ne pas bloquer la récupération de contenu en cas d’échec temporaire du suivi de connexion
- [x] Playlist réellement affectée puis modifiée : nouvelle image affichée automatiquement, un seul nouveau téléchargement et conservation hors connexion ; données temporaires supprimées
- [ ] Essai Android TV physique : nouvelle compilation APK et matériel nécessaires

## Fluidité de navigation
- [x] Éviter la vérification réseau répétée à chaque clic avec une vérification serveur partagée pendant 30 secondes, invalidée avec l’identité et effacée à la déconnexion
- [x] Cinq pages du compte réel mesurées : 56–116 ms après correction contre 122–384 ms avant ; six tests réussis, deux écrans réels relus, déconnexion et retour arrière refusé vérifiés

## Déconnexion
- [x] Bouton « Se déconnecter » dans l’en-tête et le bas du menu, avec nettoyage sûr des données protégées
- [x] 140 tests réussis ; parcours connecté vérifié : clic, retour à l’accueil, retour arrière refusé et session effacée

## Accueil Google TV
- [x] Reprendre la référence tv.google : accueil immersif sombre, navigation et grande télévision, sans modifier la connexion
- [x] Vérifier les boutons de création de compte/connexion/mot de passe oublié et quatre formats d’écran ; quatre tests existants réussis
- [x] Refaire l’accueil avant connexion dans le style Google TV, en conservant le logo et les accès existants
- [x] Vérifier l’affichage ordinateur/téléphone et l’ouverture de la connexion

## Diffusion de pages Web
- [x] Sources nommées avec URL validée, durée, plein écran et rafraîchissement ; création, modification, suppression et test
- [x] Playlists mixtes, affectation aux TV et murs via les mécanismes existants ; manifeste et cache compatibles
- [x] WebView Android isolée préparée sans accès au coffre/commandes, délai borné, télécommande/Retour et retour aux médias ; adaptateur et génération testés
- [x] 137 tests réussis ; création/aperçu/relecture, vrai écran jumelé, page Web puis image et page diffusée dans un mur vérifiés ; données temporaires supprimées, rapport WEBPAGE_PLAYER.md
- [ ] Compilation APK/AAB et vérification WebView/télécommande sur TV physique : SDK complet, exécution GitHub et matériel indisponibles

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

## YouTube en vidéo seule
- [x] Liens YouTube (vidéo, Short, direct) convertis automatiquement en lecture vidéo seule, sans la page autour
- [x] Aperçu du formulaire et lecteur (web + Android) utilisent la même conversion ; 154 tests verts

## Sous-menu latéral Écrans / Groupes
- [x] Icône téléviseur devant chaque nom de téléviseur dans l'accordéon du menu
- [x] Carte « Groupes » menant à la page Groupes ; accordéon ouvrant « Nouveau groupe » en première ligne
- [x] Vérification à l'écran : menu déplié, accordéon Groupes ouvert (groupe temporaire créé puis supprimé sur le compte de test), « Nouveau groupe » en tête, fenêtre de création ouverte puis paramètre d'URL effacé à la fermeture ; trois TV contrôlées avec icône

## Documentation API clients
- [x] Onglet API Développeur, exemples copiables et guide Markdown téléchargeable ; lien depuis les playlists.
- [x] Session connectée : onglets, lien depuis une playlist, copie des en-têtes et téléchargement de 4 952 octets vérifiés ; téléphone sans débordement, 10 tests réussis et aucune erreur observée.
- [x] Page d'accueil refaite (audit fonctionnalités + tarifs + inscription essai)
- [ ] Paiement en ligne (Paddle recommandé) — en attente de l'accord de l'utilisateur
