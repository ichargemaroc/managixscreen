# Multi-zones, intégrations et équipe — vérification du 22 novembre 2026

## Fonctionnalités livrées

- **Multi-zones** : compositions de deux à quatre zones, deux colonnes, deux lignes, bande latérale ou grille ; proportion ajustable, playlist indépendante par zone, aperçu et affectation aux écrans. Une seule zone audio. Une composition reste un seul écran dans le quota. Une TV ne peut pas appartenir simultanément à un mur et à une composition.
- **Lecteur** : manifeste réservé à l’appareil jumelé, URLs temporaires sans chemins privés, téléchargement de toutes les zones avant remplacement du cache, conservation de la diffusion précédente en cas d’échec. Images/vidéos locales et pages Web ; timers indépendants. Retour à la playlist standard depuis les affectations.
- **Canva** : ajout de liens publics en lecture seule ou d’intégration fournis par Canva, sans inventer de conversion ni connexion de compte. Les exports restent importables dans la Médiathèque.
- **Météo** : prévisions réelles MET Norway, coordonnées explicites, °C et km/h, horodatage, attribution CC BY 4.0, signalement de données anciennes, rafraîchissement et compteur d’abus persistant. Pas de clé commerciale fictive ni données simulées. Pas de garantie de disponibilité du fournisseur.
- **Instagram** : publications/Reels publics avec affichage officiel isolé dans une iframe sans accès au stockage de l’application. Pas de profil privé, Stories, récupération de flux de compte ou connexion OAuth. L’auteur doit autoriser l’intégration ; le fournisseur peut la refuser.
- **Équipe** : invitations expirant après sept jours, lien secret dont seul le hash est conservé, acceptation réservée à l’adresse vérifiée destinataire, révocation, espaces de préparation et propositions. Le propriétaire consulte les contenus et valide explicitement avant tout changement de playlist diffusée. Les médias d’un collaborateur sont copiés dans l’espace du propriétaire. Les collaborateurs n’obtiennent aucun accès aux écrans, quotas, abonnements ou administration du propriétaire.

## Vérifications réellement effectuées

- **206 tests automatisés réussis** : règles de composition, audio unique, cache de toutes les zones/échec atomique, URLs externes, équipe, abonnements et tests de non-régression existants.
- Deux comptes temporaires distincts, sans modification des clients existants : import de deux photos, création de deux playlists, composition enregistrée via le formulaire, affectation à une TV réellement jumelée, rechargement et relecture du manifeste sécurisé.
- Lecteur web : deux photos simultanées dans des zones distinctes, reprise après rechargement ; capture et contrôles de positions réalisés.
- Invitations : création, acceptation avec le bon compte, proposition enregistrée. Le collaborateur n’a pas pu lire l’écran du propriétaire, affecter sa composition, modifier son quota ou approuver sa proposition.
- Validation propriétaire : durée de sept secondes effectivement appliquée et relue dans la playlist ; nouvelle source proposée par le collaborateur copiée dans l’espace propriétaire et intégrée à une nouvelle playlist.
- Révocation : espace partagé absent lors d’une nouvelle lecture par le collaborateur.
- Météo : réponse réelle du fournisseur, affichage, source enregistrée et relue dans la Médiathèque ; données anciennes explicitement distinguées.
- Ordinateur et téléphone : composition/formulaire/affectation visibles, pas de débordement horizontal sur téléphone ; aucune erreur navigateur sur le premier parcours complet.
- Dernière compilation contrôlée : aucune erreur. Données temporaires créées pour ces essais retirées.

## Limites et essais restant à faire

- **Android TV physique** : reconstruire et installer un nouvel APK debug pour la lecture multi-zones et les WebViews séparées. Pas de compilation native ni test physique effectué dans cette vérification. Tester ressources disponibles, décodage vidéo simultané, audio, télécommande et démarrage/reprise sur les modèles réels.
- Les pages Web ont besoin du réseau et ne sont pas mises en cache comme une image/vidéo. Le contrôle audio des pages externes dépend aussi de leurs lecteurs : ne pas promettre une suppression sonore parfaite de tout contenu tiers.
- **Canva/Instagram du client** : aucune publication réelle fournie pour vérifier ses droits et sa disponibilité dans chaque navigateur/TV. Tester les liens souhaités ; utiliser un export Canva si le partage refuse l’affichage intégré.
- Les invitations sont des **liens à partager** ; aucun envoi d’e-mail automatique n’est annoncé ou effectué.
- Les tarifs et les mécanismes d’abonnement n’ont pas été refaits ; aucun paiement simulé. Les écrans existants sans composition continuent à recevoir leur playlist habituelle.

## Références des fournisseurs

- Canva : https://www.canva.com/help/share-via-link-or-email/
- Instagram : https://developers.facebook.com/docs/instagram-platform/oembed/
- MET Norway : https://api.met.no/doc/TermsOfService et https://api.met.no/doc/FAQ