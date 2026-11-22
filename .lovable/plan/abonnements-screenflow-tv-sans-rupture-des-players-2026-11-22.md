# Abonnements ScreenFlow TV, sans rupture des Players

## Existant examiné

- Les comptes, écrans, playlists, médias, pages Web, programmations et murs existent déjà dans Lovable Cloud. Aucune table de facturation ni de rôles de plateforme n’a été trouvée dans l’inventaire consulté.
- Les données de l’application passent par le store commun. Le menu et les pages privées partagent la même présentation, avec mode nuit et déconnexion.
- L’association d’une TV est déjà transactionnelle et contrôlée par le propriétaire du compte. Les identités des Players et la révocation sont séparées des données du tableau de bord.
- Le lecteur dispose d’un cache hors connexion. Une erreur de facturation ne doit pas être traitée comme une révocation d’identité.

## 1. Catalogue et droits, avant toute mise en paiement

Créer un catalogue unique : Starter 5 écrans, Business 10, Business+ 15, Pro 20, Enterprise 25 puis +5. Conserver les montants en unités monétaires mineures, la devise, les tarifs mensuels et la remise annuelle dans les paramètres administrables ; aucune somme inventée ni dispersée dans le code.

Séparer les tarifs des abonnements souscrits : une modification du catalogue crée une nouvelle version de prix chez le fournisseur, sans changer silencieusement les contrats existants. Préparer les références promotionnelles sans ajouter de fausses promotions.

Ajouter abonnements, historique, factures/avoirs, événements de paiement, droits par écran et paramètres. Réutiliser les comptes et profils existants, sans créer d’organisations ou de profils supplémentaires.

**Transition proposée :** conserver les droits et les TV des comptes existants, sans prélèvement automatique ni suspension rétroactive. Les marquer comme accès historiques, et non comme abonnements payés. Activer les restrictions commerciales seulement après configuration explicite de leur offre. Aucun essai gratuit d’une durée inventée pour les nouveaux clients.

## 2. Quotas fiables et compatibles avec le jumelage

- Compter les Players associés et autorisés par identité unique ; une TV simplement hors ligne conserve sa place.
- Ajouter une désactivation réversible distincte de la révocation définitive. Suppression ou désactivation libère une place ; réactivation consomme une place et vérifie le quota.
- Contrôler association et réactivation dans la même transaction que l’attribution du droit, avec verrou par compte : deux demandes simultanées ne doivent pas dépasser la capacité.
- Empêcher aussi les insertions et modifications directes qui contourneraient les actions de l’application.
- À la limite, refuser uniquement le Player supplémentaire avec un message et un accès à la mise à niveau ; maintenir les TV autorisées, contenus, playlists et tableau de bord.
- Après une baisse de forfait, ne pas désactiver des TV au hasard : demander une sélection avant application, ou reporter la baisse au renouvellement une fois l’usage conforme.

## 3. Page Abonnement et administration

Ajouter **Abonnement** au menu et au tableau de bord : offre actuelle, coût réel, capacité, utilisation, places restantes, progression, renouvellement, état et historique de paiement. Présenter les offres et les commandes « Changer d’offre », « Ajouter 5 écrans », « Annuler » et « Gérer mon abonnement ».

Avant configuration du paiement, afficher un état honnête « Paiement non configuré », sans transactions fictives ni boutons donnant l’impression d’un paiement réussi.

Créer une administration réservée à un rôle de plateforme stocké séparément des profils. Vérifier ce rôle côté serveur pour chaque lecture globale et chaque modification : clients paginés, écrans, abonnements, paiements, statistiques, tarifs, paramètres, suspension et réactivation. L’accès initial sera attribué uniquement au compte explicitement désigné, jamais automatiquement au premier inscrit.

Conserver le style du tableau de bord, le mode nuit et les Players isolés. Charger les informations de facturation uniquement sur les pages concernées pour ne pas ralentir toutes les navigations.

## 4. Fournisseur et paiements récurrents

Le contrôle effectué confirme que **Paddle convient** à ce SaaS. Le document privilégie **Stripe Billing si compatible** : vérifier cette préférence avec le pays d’exploitation demandé, puis obtenir la confirmation du fournisseur avant toute activation.

L’activation crée un environnement de **test**, sans argent réel. Le passage en **live** nécessite la vérification ou la prise en charge du compte chez le fournisseur. Expliquer les frais et la prise en charge fiscale applicables avant confirmation.

Après activation, demander les tarifs, la devise et la remise annuelle, puis créer les produits et prix avant d’écrire le paiement. Utiliser le paiement et le portail hébergés par le fournisseur ; ne jamais stocker de numéros de carte.

Synchroniser paiements réussis/échoués, renouvellements, annulations, expirations et remboursements par notifications signées. Vérifier le corps original et la signature, conserver les identifiants uniques pour éviter les doubles traitements, gérer les événements retardés ou désordonnés et prévoir une réconciliation sécurisée.

Accorder une augmentation seulement après confirmation autoritative du fournisseur, pas au clic ni au retour de la page de paiement. Afficher le prorata confirmé avant validation. Par défaut, proposer l’annulation à la fin de la période déjà payée.

## 5. Impayés et compatibilité Android

Prévoir les états `active`, `trial`, `past_due`, `suspended`, `cancelled`, `expired`, une grâce configurable et l’accès au portail pour changer le moyen de paiement.

**Politique à définir avant application :** durée de grâce et conséquences de la suspension sur la diffusion. Tant qu’elle n’est pas validée, ne pas couper les TV existantes. Une suspension n’efface ni contenus, ni écrans, ni cache, ni identité d’appareil.

Ajouter au manifeste un état de droits versionné compatible avec les anciens lecteurs. Un refus commercial distinct d’une erreur d’identité ne déclenche ni ré-appairage ni suppression du cache. Toute politique d’arrêt hors connexion nécessitera un lecteur mis à jour et un essai matériel ; les anciens APK ne peuvent pas garantir ce comportement.

## Détails techniques

- Tables prévues : `billing_plans`, `billing_settings`, `subscriptions`, `subscription_history`, `payment_records`, `screen_entitlements`, `billing_events`, `user_roles`.
- Chaque nouvelle table publique reçoit des autorisations explicites puis des politiques par propriétaire ; les clients ne peuvent modifier ni quota, ni statut de paiement, ni rôle. Journal des événements réservé au traitement serveur.
- Actions privées via fonctions serveur authentifiées, contrôles administrateur côté serveur avant accès privilégié, exposition des actions aux pages via le store existant.
- Notifications externes sous `/api/public/billing/…`, authentifiées par signature ; aucun secret dans le navigateur ou le dépôt.
- Migrations progressives via Lovable Cloud ; préserver les champs et fonctions utilisés par les APK déployés. Ne pas remplacer le mécanisme d’authentification existant.

## Vérification et rapport

Exécuter et consigner : compte de test, capacité 5, cinq associations acceptées, sixième refusée, augmentation à 10, sixième acceptée, suppression/désactivation/réactivation, unicité du Player, concurrence à la dernière place, accès au tableau de bord à quota atteint, isolation entre deux clients et refus d’administration.

Après configuration du fournisseur, tester réellement les paiements en environnement de test : succès, échec, renouvellement, annulation, grâce, suspension, réactivation, remboursement, signatures invalides, répétitions et événements désordonnés. Des tests unitaires seuls ne valent pas une transaction de test chez le fournisseur.

Vérifier association, contenu, commandes, playlist, mur et reprise hors connexion dans le lecteur partagé. Signaler séparément les essais Android TV physiques non exécutés.

Livrer à chaque étape un rapport indiquant ce qui est opérationnel, les tests réellement exécutés et ce qui attend encore une configuration. **Aucun paiement ni changement de droits n’a été effectué pendant cette analyse.**