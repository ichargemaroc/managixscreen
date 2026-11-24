# Vérification de l’écran blanc connecté

## Règle
Une mise à jour ne doit pas empêcher l’accès à l’espace connecté. Les éléments de chargement doivent exister et une ancienne version conservée dans un onglet doit pouvoir être remplacée sans déconnexion ni effacement de données.

## Pages et parcours
| Emplacement | Vérification | Résultat |
|---|---|---|
| Tableau de bord | Code et navigateur connecté | Conforme |
| Écrans et détail d’un écran réel | Code et navigateur connecté | Conforme |
| Médiathèque | Code et navigateur connecté | Conforme |
| Playlists | Code et navigateur connecté | Conforme |
| Programmation | Code et navigateur connecté | Conforme |
| Groupes | Code et navigateur connecté | Conforme |
| Murs d’images | Code et navigateur connecté | Conforme |
| Multi-zones | Code et navigateur connecté | Conforme |
| Intégrations | Code et navigateur connecté | Conforme |
| Équipe | Code et navigateur connecté | Conforme |
| Paramètres | Code et navigateur connecté | Conforme |
| Abonnement | Code et navigateur connecté | Conforme |
| Administration | Code et navigateur avec compte non administrateur | Refus attendu ; affichage autorisé non exécuté dans cette vérification |
| Connexion par mot de passe, Google, inscription, récupération de mot de passe | Code ; tests du parcours mot de passe | Aucun autre import du nouvel affichage depuis le module de données ; Google et envoi d’e-mails non exécutés |
| Jumelage QR et invitation d’équipe | Code | Affichage indépendant ; ouverture de l’espace connecté utilise le même cadre corrigé. Aucun jumelage ni invitation créé |
| Lecteur web et entrée Android indépendante | Code des entrées | Aucun AuthenticatedLayout ni StoreContent ; matériel Android non testé |
| Affichages météo et Instagram | Code | Indépendants du cadre connecté ; affichage fournisseur non exécuté dans cette vérification |
| Rafraîchissement des données et suivi en direct | Code du store et RealtimeSync | Pas de nouvel élément de chargement importé ; menu conservé pendant le chargement |
| Entrées HTTP appareils/météo et fonctions de données | Recherche des entrées et imports | Pas de rendu AuthenticatedLayout ; aucun changement serveur ou de données nécessaire |
| Récupération automatique et bouton Réessayer | Code et tests | Ancien affichage connecté reconnu, recharge limitée à une fois par minute ; les erreurs de composants d’autres pages ne sont pas assimilées à ce cas |

## Correction supplémentaire
L’onglet conservant l’ancien cadre connecté pouvait rester bloqué malgré la correction du nouvel import. La récupération déjà existante prend désormais en charge exactement l’erreur « composant undefined » dans AuthenticatedLayout. Son bouton Réessayer recharge le document au lieu de réutiliser les anciens éléments.

## Preuves et limites
- L’erreur exacte a été reproduite avec un store antérieur sans StoreContent, puis le même test a réussi.
- 24 tests ciblés réussis ; compilation automatique réussie.
- Treize affichages connectés accessibles vérifiés ; aucun événement d’erreur navigateur. Ordinateur et téléphone vérifiés lors de la correction initiale.
- L’inspection directe de l’onglet personnel a été ignorée par l’outil : aucun onglet connecté disponible. L’erreur précédemment signalée n’a pas été reproduite avec le code actuel dans un navigateur neuf.
- Aucune modification des clients, abonnements, médias, écrans, paiements, permissions ou paramètres.