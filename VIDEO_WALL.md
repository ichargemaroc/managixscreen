# Murs d’images — état réel de l’intégration

## Terminé
- Rubrique française « Murs d’images », liste des murs, création, modification et suppression avec confirmation.
- Grilles prédéfinies 1×2, 2×2, 2×3, 3×3, 4×4 (colonnes × lignes), et dimensions personnalisées de 1 à 8 par axe.
- Résolution globale, proportions paysage/portrait, compensation des espaces entre panneaux en pixels du visuel global.
- Affectation, remplacement, retrait et déplacement par sélection d’un écran dans une autre cellule. Un écran ne peut appartenir qu’à un seul mur et une cellule ne contient qu’un écran.
- Aperçu du contenu global et des cellules ; statuts de connexion dérivés des heartbeats existants, sans statut de lecture inventé.
- Sélection des images/vidéos privées de la médiathèque existante.
- Démarrage/reprise, pause et arrêt communs, avec historique persistant. Le démarrage est programmé 15 secondes après la commande.

## Lovable Cloud
Deux migrations appliquées : `0008_video_walls.sql` et `0009_video_wall_integrity.sql`.
- `video_walls` : propriétaire, nom, dimensions, résolution, orientation, espaces, média, état demandé, référence temporelle, position et révision.
- `video_wall_screens` : mur, écran, ligne et colonne, avec unicité de l’écran et de la cellule.
- `video_wall_events` : action, date effective et position ; lecture propriétaire uniquement, écriture par commande contrôlée.
- RLS et droits explicites ; références médias/écrans validées contre le propriétaire.
- `save_video_wall` remplace configuration et affectations dans une transaction ; une erreur laisse le mur précédent intact.
- `control_video_wall` contrôle le propriétaire, conserve la position à la pause et définit l’époque commune à la reprise.
- `device_wall` est réservé au service et revalide le hash du jeton et le jumelage avant de retourner le seul mur de cet appareil.
- La modification de géométrie arrête le mur. Les positions hors grille, les temps négatifs et les espaces invalides sont rejetés.

## Lecteur Android et web
Le lecteur partagé `src/player` utilise le même mode mur dans `/player` et dans la préparation APK existante. Pas de nouvelle application ni de modification des secrets d’appareil.
- Le manifeste appareil existant inclut la configuration et la position du mur ; il remplace explicitement le mode playlist standard lorsqu’un mur est affecté, même à l’arrêt.
- Les URL médias restent privées et signées pour une heure ; identifiants de propriétaire et chemins de stockage ne figurent pas dans les métadonnées du mur envoyées au lecteur.
- Le média global est téléchargé et mis en cache sur chaque appareil, puis réellement découpé au rendu par Canvas. Les portions ne sont pas des copies de l’image entière.
- Le cadrage conserve les proportions du média global, puis applique le viewport et les espaces du panneau. Si les proportions physiques du panneau diffèrent, des bandes évitent la déformation.
- L’époque du serveur, l’estimation d’écart d’horloge au milieu de l’aller-retour et la position persistée pilotent la lecture vidéo ; correction de dérive toutes les 500 ms, seuil de seek de 250 ms et vitesse ajustée entre 0,97 et 1,03.
- En mode mur, lecture du manifeste toutes les 10 secondes ; les commandes ont donc une latence de propagation, augmentée par les téléchargements et les réseaux lents.
- Le cache conserve média, mur, position et écart d’horloge ; reconnexion et reprise après réouverture sans rejumelage. Les commandes locales pause/suivant sont désactivées dans ce mode.
- Supprimer le mur rend aux appareils leur playlist standard à la prochaine synchronisation.

## Vérifications réellement exécutées
- 71 tests automatisés réussis (règles de découpage, coordonnées, proportions, doublons, temporalité, autorisation de manifeste et tests existants).
- Parcours connecté : deux lecteurs web nouvellement jumelés, média importé, mur enregistré et relu après rechargement.
- Image réelle : les centres des deux lecteurs contiennent respectivement les pixels rouges et verts de leurs cellules, pas le même visuel ; démarrage, pause enregistrée et arrêt noir reçus par les deux lecteurs.
- Vidéo réelle : portion vidéo affichée, lecture poursuivie après coupure réseau, et mur retrouvé après rechargement sans nouveau jumelage.
- Validation sur la vraie base : doublons et écran inexistant refusés ; anciennes affectations préservées après échec ; temps négatif refusé ; fonction appareil inaccessible à un compte ordinaire.
- Affichage mobile vérifié sans débordement horizontal ; les éléments d’essai ont été supprimés sans toucher aux données existantes.
- Aucun résultat de précision de synchronisation multi-TV n’est revendiqué : la seconde campagne vidéo multi-lecteurs a été arrêtée par la limite anti-abus de jumelage existante. Le contrôle pause vidéo après une reconnexion nécessite encore une mesure stabilisée dédiée.

## Limites et essais restant à faire
- Pas de transcodage serveur, pas de fichiers vidéo pré-découpés : chaque TV reçoit le fichier source entier et ne montre que sa portion. La bande passante, le stockage et le décodage restent ceux du média global. Pré-découper les téléchargements nécessite un service de traitement vidéo externe.
- Synchronisation logicielle best-effort, non verrouillée à l’image près. Le délai de 15 secondes ne garantit pas que tous les appareils ont fini un gros téléchargement ; les retardataires rejoignent la position commune une fois prêts. Pas de barrière de disponibilité de tous les panneaux.
- Hors ligne, la dernière commande reçue continue ; un appareil déconnecté ne peut recevoir une nouvelle pause ou un arrêt.
- Après redémarrage, une horloge système incorrecte peut entraîner un écart jusqu’au prochain échange serveur ; aucun NTP natif ni genlock n’est implémenté.
- L’orientation configure les proportions du mur ; le lecteur natif conserve le plein écran paysage existant. La rotation physique des panneaux portrait n’est pas automatiquement pilotée.
- L’aperçu administratif est un aperçu du média et de la grille, pas un retour vidéo en direct ni une preuve que les TV ont démarré.
- L’APK n’a pas été recompilé ici. Publier la version web puis relancer la compilation GitHub existante et installer une mise à jour sans désinstallation pour conserver le jumelage.
- Sur TV physiques : vérifier deux puis quatre panneaux, formats MP4/H.264, performance Canvas/WebView, résolution, compensation des bordures, dérive de lecture mesurée sur plusieurs minutes, pause/reprise/arrêt, réseau lent, déconnexion, reboot et mise à jour APK.
