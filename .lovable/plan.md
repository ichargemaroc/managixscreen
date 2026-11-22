# Multi-zones, intégrations et équipe ScreenFlow

## Objectif
Ajouter trois espaces utilisables dans le menu, sans refaire les abonnements, modifier les tarifs ou perturber les écrans actuellement appairés : **Multi-zones**, **Intégrations**, **Équipe**.

## 1. Multi-zones — écran scindé
- Créer des compositions nommées : deux colonnes, deux lignes, zone principale avec colonne latérale, grille de quatre zones.
- Choisir une playlist indépendante dans chaque zone, ajuster les proportions et visualiser la composition avant l’affectation.
- Définir une seule zone sonore pour éviter plusieurs vidéos audibles simultanément.
- Enregistrer et affecter une composition à un écran autorisé ; un écran scindé compte toujours comme un seul écran dans le quota.
- Conserver la playlist standard tant qu’aucune composition n’est affectée. Refuser une affectation contradictoire avec un mur d’images existant.
- Faire fonctionner les images et vidéos simultanément, avec stockage local conservé et mise à jour atomique de la composition.
- Préserver l’isolation des pages Web : adapter leur affichage natif aux rectangles des zones sans leur donner accès aux identités du lecteur.

**Android TV :** cette fonctionnalité nécessite une nouvelle compilation APK ; un ancien APK ne pourra pas afficher les compositions. Les essais physiques resteront distincts des vérifications navigateur.

## 2. Intégrations

### Canva
- Ajouter un design Canva par son lien publié, avec aperçu et affectation, sans connexion de compte Canva.
- Réutiliser les médias et les sources Web existants plutôt que créer une seconde médiathèque.
- Permettre aussi l’import d’un export Canva image ou vidéo depuis la médiathèque existante ; signaler les liens non publiés ou non intégrables.

### Météo
- Ajouter une source météo par ville : température, conditions et date de dernière actualisation, avec aperçu puis utilisation dans une playlist ou une zone.
- Utiliser des données réelles provenant d’un service autorisé pour un SaaS commercial. Indiquer les frais ou la clé nécessaires avant tout raccordement payant.
- Conserver la dernière information disponible en cas de panne, avec sa date ; ne jamais inventer la météo.

### Instagram — réseau retenu
- Ajouter des publications publiques par leur lien, avec aperçu et gestion des erreurs d’intégration.
- Ne pas confondre une publication publique avec un flux de compte synchronisé : la synchronisation automatique des publications nécessite une connexion Instagram et les autorisations Meta appropriées.
- Ne pas récupérer de comptes privés, contourner les restrictions ou présenter un compte comme connecté sans autorisation.
- Vérifier les possibilités d’affichage autorisées avant le raccordement ; les contenus incompatibles avec l’affichage TV seront signalés, pas silencieusement remplacés par toute la page Instagram.

## 3. Gestion d’équipe
- Ajouter une liste des membres, invitations, acceptation, révocation et historique des changements d’accès.
- Chaque membre utilise son propre compte ; aucun partage de mot de passe.
- Limiter les collaborateurs à la préparation des médias et playlists, sans gestion des écrans, affectations, programmations ou diffusion.
- Préparer les changements de playlist comme des brouillons : les modifications des collaborateurs ne doivent pas mettre à jour une playlist déjà diffusée avant validation explicite du propriétaire.
- Garder la facturation, les quotas et la gestion des membres sous le contrôle du propriétaire du compte.
- Les membres d’équipe n’obtiennent jamais le rôle d’administrateur de la plateforme.
- Partager uniquement les ressources du compte auquel le membre a été invité, sans exposer celles des autres clients.
- Comptabiliser les écrans dans le quota du propriétaire, jamais dans un quota fictif du collaborateur.

## Ordre de livraison
1. Multi-zones : configuration enregistrée, affectation et lecture images/vidéos.
2. Sources d’intégration : aperçu et diffusion, raccordements réels seulement lorsque leurs autorisations sont disponibles.
3. Équipe : invitations et préparation des contenus, avec validation par le propriétaire avant diffusion et contrôle de toutes les actions concernées.
4. Vérifications croisées et rapport distinguant ce qui fonctionne, les raccordements en attente et les essais Android nécessaires.

## Protections et vérifications
- Ne pas modifier les tarifs ou quotas attribués, ne pas simuler de paiements et ne pas supprimer les données existantes.
- Tester la sauvegarde/relecture des compositions, la lecture simultanée et la conservation du dernier contenu disponible.
- Tester qu’une composition ne consomme qu’une place et que les droits d’équipe ne permettent ni une sixième activation hors quota ni une modification d’abonnement.
- Tester les invitations expirées, la révocation, les droits de lecture/édition et l’isolation entre clients avec des comptes de vérification.
- Vérifier les pages sur ordinateur et téléphone, puis documenter les tests physiques TV restant à réaliser.

## Détails techniques
- Changements additifs uniquement : compositions et zones, affectations, équipes, membres et invitations dans les tables applicatives protégées.
- Centraliser les lectures et actions dans le store existant ; les pages utilisent les mêmes contrôles visuels et les couleurs actuelles.
- Enregistrer et affecter une composition par une opération transactionnelle contrôlant propriétaire, playlists, quotas et conflits de mur.
- Étendre le manifeste d’appareil de manière rétrocompatible ; partager la logique multi-zones entre lecteur web et Android.
- Garder les rôles d’équipe séparés du rôle `admin` de plateforme et contrôler les permissions côté serveur pour chaque opération, y compris les appels directs.
- Invitations : jetons aléatoires stockés sous forme de hachage, durée limitée, acceptation authentifiée liée à une adresse vérifiée, révocation réservée au propriétaire.
- Connexions externes par client : secrets conservés côté serveur, jamais dans les URLs des lecteurs ou le navigateur ; utiliser les connecteurs par utilisateur lorsqu’ils existent.

## Points en attente
Les choix sont confirmés : **liens Canva publiés**, **Instagram** et **équipe limitée à la préparation des contenus**. La météo commerciale et certaines possibilités Instagram peuvent nécessiter une autorisation ou un coût ; elles ne seront pas déclarées actives avant une vérification réelle.