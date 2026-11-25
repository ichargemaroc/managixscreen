# Nouvelle page d'accueil ScreenFlow + tarifs + inscription payante

## Objectif
Refaire la page d'accueil publique (aujourd'hui intégrée à la page de connexion) à partir d'un audit complet des fonctionnalités réellement disponibles, afficher les prix des abonnements et permettre aux visiteurs de s'inscrire puis de payer.

## 1. Audit des fonctionnalités (avant rédaction)
Lister uniquement ce qui existe et fonctionne, pour ne rien promettre de faux :
- Écrans : jumelage par code / QR, groupes, rotation, son, supervision en direct
- Médiathèque : images, vidéos MP4, pages web, YouTube plein écran
- Playlists : transitions, musique de fond, bandeau défilant (+ API)
- Programmation horaire avec playlist par défaut
- Multi-zones, murs d'images, intégrations (Canva, météo, Instagram)
- Gestion d'équipe, lecture hors ligne, mises à jour APK à distance
- Players : Android TV / Google TV, navigateur web

## 2. Nouvelle page d'accueil (sections)
1. Bandeau principal : promesse, boutons « Essai gratuit 14 jours » et « Voir les tarifs »
2. Comment ça marche en 3 étapes (installer, jumeler, diffuser)
3. Fonctionnalités par familles (issues de l'audit), avec captures/illustrations
4. Appareils compatibles (et limites honnêtes : Samsung Tizen / LG webOS non pris en charge)
5. **Tarifs** : paliers lus depuis les plans publiés par l'administrateur (jamais codés en dur), bascule Mensuel / Annuel (2 mois offerts), mise en avant de l'essai 14 jours sans carte
6. Questions fréquentes
7. Appel final à l'inscription + pied de page

La connexion reste accessible via un bouton « Se connecter » ; le style Play Console et le logo ScreenFlow sont conservés.

## 3. Inscription et paiement
- Clic sur un palier → inscription (palier choisi mémorisé) → après connexion, page Abonnement avec ce palier présélectionné.
- Paiement en ligne : activation d'un prestataire de paiement intégré (vérification d'éligibilité d'abord ; entreprise au Maroc, clients mondiaux). Un environnement de test est créé immédiatement ; les paiements réels nécessitent une vérification du compte vendeur.
- Création des produits correspondant aux paliers (mensuel + annuel), page de paiement, et activation automatique de l'abonnement après paiement (en remplaçant le mode actuel sans paiement réel), sans toucher aux écrans existants.

## Détails techniques
- Nouvelle route publique `/` (src/routes/index.tsx) en dehors de `_authenticated` ; les utilisateurs connectés sont redirigés vers le tableau de bord ; `/auth` redevient une page de connexion simple, avec `?plan=` et `?cycle=`.
- Lecture publique des plans publiés via une lecture serveur anonyme restreinte (politique SELECT `published = true`).
- Paiement : `recommend_payment_provider` puis activation après votre accord ; webhook sous `/api/public/` qui met à jour `subscriptions` ; tests sur le mapping palier → produit et l'activation.
- Métadonnées SEO uniques pour la page d'accueil.
