# Abonnements ScreenFlow TV — livraison progressive

## Opérationnel

- **Abonnement** accessible depuis le menu et le tableau de bord : offre, capacité, utilisation, places restantes, tarifs du catalogue, option annuelle, état et historique. Les commandes de paiement restent indisponibles avec un état explicite « Paiement non configuré ».
- **Administration** accessible au compte confirmé `karim.gharbi@me.com` : clients par pages de 25, capacités utilisées, statut, renouvellement, écrans et historique de chaque client, statistiques, création/modification des paliers, publication des offres, prix mensuels, devise, remise annuelle et grâce.
- Catalogue initial : Starter 5, Business 10, Business+ 15, Pro 20, Enterprise 25. Les paliers supplémentaires sont créés depuis l’administration par incréments de cinq. Aucun prix définitif, devise, remise ou grâce n’a été inventé ; les valeurs utilisées dans les essais ont été retirées.
- Attribution manuelle d’un **accès d’essai non facturé** par l’administrateur, avec confirmation ; aucune transaction simulée et aucun contrat payant fabriqué. Pas de durée d’essai automatiquement imposée.
- Suspension bloque les nouvelles activations, sans couper les TV existantes ni supprimer les données. La réactivation restaure le statut précédent. Toute autre politique de suspension reste à définir.

## Protection et compatibilité

- Les comptes existants ont un accès historique non facturé et sans quota rétroactif. Les neuf droits actifs observés avant les essais sont préservés. Les nouveaux comptes ont zéro place jusqu’à l’attribution explicite d’une offre ; aucun abonnement n’est prélevé.
- Un droit par écran et une identité unique par Player ; un écran hors ligne conserve sa place. Désactivation ou révocation libère une place. La suppression enlève le droit associé.
- Jumelage, activation et attribution administrative utilisent un verrou transactionnel par compte. Le sixième appareil est refusé sur une capacité de cinq, y compris si deux demandes arrivent simultanément à la dernière place.
- Les clients ne peuvent pas modifier directement abonnements, droits ou rôles, ni enregistrer directement une ligne d’écran. L’administration est vérifiée dans chaque fonction de données, pas uniquement masquée dans le menu.
- Réduction de capacité refusée si elle serait inférieure à l’usage actuel ; aucun écran choisi au hasard pour compenser.
- Les changements de catalogue ne réécrivent pas les droits déjà attribués. Une modification de prix invalide les références de prix fournisseur en préparation d’une future version ; **la création de versions de prix auprès du fournisseur n’est pas implémentée**, celui-ci n’étant pas raccordé.
- Le manifeste d’appareil ajoute un droit versionné après vérification du token et du jumelage. Un écran désactivé reçoit un manifeste sans nouvelles URLs de médias et non une erreur de révocation.
- Le lecteur mis à jour affiche « Écran désactivé », conserve identité, médias et accusés de commande, et reprend après réactivation sans jumelage. Ce droit est conservé séparément du manifeste local pour ne pas effacer la playlist précédente lors d’une désactivation.
- Les anciens APK n’interprètent pas ce nouveau droit et peuvent continuer la lecture locale ; une TV hors ligne ne reçoit pas immédiatement une désactivation. Aucun arrêt hors connexion ou contrôle matériel garanti.
- Les données métier continuent de passer par le store commun ; les informations détaillées d’abonnement utilisent leurs propres caches et ne sont pas chargées avec toutes les pages.

## Changements

- Migrations `0016_screenflow_subscription_foundation` et `0017_billing_nullable_plan_parameters` : catalogue, paramètres, abonnements, historique, factures/avoirs, journal d’événements, droits d’écrans, rôle administrateur, politiques et actions transactionnelles. Tables publiques avec droits explicites puis protection par propriétaire. Événements réservés au traitement privilégié.
- Fonctions administratives contrôlées dans la base et appels privés authentifiés. Aucun secret de paiement ajouté, aucune carte bancaire stockée, aucun fournisseur activé.
- Pages `/subscription` et `/billing-admin`, actions de désactivation/réactivation dans les détails d’écran et indicateur de capacité dans la liste des écrans.
- Adaptation du manifeste appareil et de la conservation des droits dans le cache du lecteur partagé Android/web.

## Tests réellement exécutés

**Tests automatisés : 191 tests réussis dans 36 fichiers.** Nouveaux tests couvrant paliers, refus du sixième, disponibilité après libération, augmentation à dix, remise configurable, devises, absence de prix, cache et reçus conservés, rétrocompatibilité du manifeste, absence d’URLs sur écran désactivé et refus fermé si les droits sont indisponibles. Les tests existants des murs, pages Web, MP4, son, coffre, redémarrage, synchronisation, navigation et déconnexion ont également réussi.

**Parcours connectés, données Cloud réelles et navigateur :**

1. Nouveau client temporaire, zéro place initiale, accès Starter attribué par administrateur.
2. Cinq associations acceptées ; cinquième ajoutée via le formulaire ; sixième refusée avec le message de limite et utilisation relue à cinq.
3. Accès Business dix places ; sixième ajoutée via le même formulaire et utilisation relue à six.
4. Désactivation et réactivation via les détails d’écran : cinq puis six droits actifs.
5. Deux associations concurrentes pour une seule place : exactement une réussite, une erreur de limite, total final cinq.
6. Réactivation au quota refusée ; modification directe d’abonnement, de rôle et de droit refusée ; insertion directe d’écran refusée ; lecture d’abonnements limitée au client ; administration refusée au client normal.
7. Suspension/réactivation du client de test : activations bloquées sans diminution des droits existants ; statut précédent restauré.
8. Administration : sauvegarde et relecture d’un forfait, des paramètres MAD/10 %/7 jours et d’un palier temporaire de trente écrans ; prix annuel 1 328,40 MAD relu pour un mensuel de 123 MAD. Valeurs de test supprimées/restaurées à non configuré après l’essai.
9. Image réellement importée, playlist affectée et rendue par un Player de test ; désactivation affichée sans effacer l’identité ; réactivation avec la même identité ; reprise locale avec les appels d’API appareil bloqués. Le document web et ses modules restaient accessibles lors de ces redémarrages : **ce n’est pas un test de démarrage navigateur totalement hors réseau**.
10. Pages ordinateur 1280×1800 et téléphone 430×786 vérifiées sans débordement global, navigation et enregistrement réussis, aucun événement d’erreur navigateur observé dans le premier parcours.

Les données temporaires (Players, télémétrie, médias, playlist, accès et palier) ont été supprimées. Aucune TV réelle du client n’a été utilisée pour les essais.

## Non implémenté / non testé

À la demande du client, **le paiement est reporté** : kit personnel, fournisseur, documentation et prix définitifs attendus. Paddle a été identifié comme éligible mais n’a pas été activé. Les montants ne sont pas prélevés et aucune facture fictive n’est créée.

Ne sont donc pas opérationnels : paiement récurrent, mise à niveau payante, prorata, portail, annulation d’un contrat fournisseur, synchronisation signée, réconciliation, renouvellement, échec de paiement, calcul automatique d’expiration/grâce et remboursement. Les états et tables sont préparés ; les tests de paiement réels ou de test n’ont pas été exécutés.

La validation physique Android TV et une nouvelle compilation APK restent nécessaires pour recevoir les droits réversibles. Le lecteur web partagé a été vérifié, pas une TV réelle.

Les changements sont disponibles dans l’aperçu. Publier les changements web pour les rendre disponibles sur le site public ; les migrations sont déjà appliquées à Lovable Cloud.
## Modèle commercial (v2)
- Tarifs initiaux MAD (modifiables) : 5→299, 10→499, 15→699, 20→899, 25→1 099, 30→1 299, 50→1 999, 100→3 499 /mois. Remise annuelle 16,67 % (2 mois offerts), grâce 7 jours.
- Essai : `billing_settings.trial_days/trial_capacity/trial_one_per_email`; démarré par `billing_new_profile`, registre d'e-mails hachés `billing_trial_registry` (service uniquement). `billing_check_place` refuse `TRIAL_EXPIRED` sans toucher aux écrans existants.
- Écrans offerts (`complimentary_screens`), abonnement spécial et prolongation d'essai via `billing_admin_grant` (admin).
- Downgrade : `billing_schedule_downgrade` (client, sélection des écrans conservés) ; `billing_apply_scheduled_change` (service uniquement) à appeler par le futur gestionnaire de renouvellement — désactive sans supprimer.
- Encore à faire : prestataire de paiement, souscription/upgrade/prorata, portail moyen de paiement, annulation, notifications d'impayé, webhooks signés, passage automatique à `past_due`/`suspended`.
