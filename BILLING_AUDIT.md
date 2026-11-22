# ScreenFlow — Vérification ciblée de l’administration

**Date : 22 novembre 2026, entre 10 h 55 et 11 h UTC.**

## Conclusion

Le compte confirmé **karim.gharbi@me.com** possède déjà le rôle administrateur de plateforme. Son administration Billing a été ouverte avec une session réelle, puis rechargée avec succès. **Aucune correction de permissions n’est nécessaire.**

La liste des clients, les quotas, les écrans et les indicateurs commerciaux fonctionnent dans l’aperçu connecté à Lovable Cloud. Le compte client testé ne peut pas lire l’administration ni écrire directement ses quotas, les quotas d’un autre compte, les droits d’écran ou le rôle administrateur.

**Limite essentielle :** pour respecter l’interdiction de modifier les données, aucune activation/désactivation réelle, attribution commerciale ou suspension n’a été effectuée pendant cet audit. Leur présence et leurs protections ont été examinées ; les tests automatisés existants ont été exécutés. Cela ne remplace pas une nouvelle validation complète des écritures commerciales.

## 1. Périmètre et méthode

- Lectures des données et des protections effectivement déployées dans Lovable Cloud.
- Navigation dans l’aperçu local avec deux sessions réelles : administrateur principal et client non administrateur.
- Ouverture des formulaires et d’une confirmation de suspension, suivie d’une annulation, sans enregistrer.
- Appels administratifs depuis le compte client, refusés avant toute écriture ; paramètres invalides ou cible inexistante utilisés comme précaution supplémentaire.
- Tentatives d’écriture directe avec des valeurs identiques aux valeurs présentes : aucun enregistrement autorisé. Une insertion d’abonnement déjà existant a été refusée par la protection d’accès.
- Exécution de 45 tests existants, tous réussis.
- Comparaison des empreintes des abonnements, forfaits, droits d’écran et révocations d’identités avant/après les vérifications.

Aucun tarif changé, aucune donnée métier supprimée, aucun paiement simulé, aucune migration, aucune modification du Player Android ni de la structure applicative. Seuls ce rapport et le suivi de vérification ont été ajoutés au dépôt. Des sessions de vérification ont été ouvertes, sans déconnecter volontairement les comptes.

## 2. Compte administrateur principal

| Contrôle réellement effectué | Résultat |
|---|---|
| Compte principal présent et adresse confirmée | Conforme |
| Rôle `admin` présent dans la table de rôles protégée | Conforme |
| Vérification du rôle avec la session réelle | Administrateur confirmé |
| Ouverture de `/billing-admin` | Réussie |
| Navigation par le lien Administration | Réussie |
| Rechargement complet de l’administration | Réussi |
| Nombre de rôles administrateur enregistrés | Un seul |

Le rôle est contrôlé côté serveur à partir de l’identité authentifiée et de la table de rôles ; une adresse e-mail ou une valeur du navigateur ne suffit pas à obtenir les droits. Les fonctions administratives vérifient le rôle séparément de l’affichage du menu.

Accès habituel : se connecter avec **karim.gharbi@me.com**, puis ouvrir **Administration** ; adresse publique prévue : **https://screenflow.live/billing-admin**. Le parcours signé de cet audit a été exécuté dans l’aperçu, pas sur le domaine public : la présence de la dernière version publique n’a pas été retestée.

## 3. Gestion des clients et indicateurs

| Donnée lue et comparée à l’administration | Valeur observée |
|---|---:|
| Profils clients | 6 |
| Abonnements / fiches d’accès | 6 |
| Profils sans fiche d’abonnement | 0 |
| Clients visibles sur la première page | 6 sur 6 |
| Fiches détaillées lisibles | 6 sur 6 |
| Écrans enregistrés | 9 |
| Droits d’écran actifs | 9 |
| Forfaits visibles | 8 |
| Essais automatiques datés en cours | 0 |
| Abonnements payants actifs | 0 |
| Paiements en retard / comptes suspendus | 0 / 0 |
| Revenu mensuel récurrent affiché | 0,00 MAD |
| Paiements enregistrés | 0 |

Les six fiches détaillées ont été lues, avec respectivement 3, 1, 1, 0, 0 et 4 écrans. Les listes d’écrans, paiements et historiques sont renvoyées sans erreur. La page suivante est vide, ce qui correspond aux six clients présents ; les deux boutons de pagination sont désactivés sur la première page.

La recherche est explicitement limitée à la page courante. Les clients sont paginés par 25 ; un véritable jeu de plus de 25 clients n’a pas été créé pour cet audit.

**Revenus :** le zéro affiché correspond aux données actuelles, sans encaissement inventé. La formule déployée additionne les montants des abonnements actifs ou en retard, hors accès historiques et sans montant nul, dans la devise configurée ; les montants annuels sont divisés par 12. Ce MRR est un indicateur contractuel, pas un relevé d’encaissements. Son résultat sur des contrats payants réels n’a pas été vérifié, puisqu’aucun prestataire n’est raccordé.

## 4. Comptes préexistants sans essai automatique

**Situation réelle observée :** les six comptes n’ont ni début ni fin d’essai automatique enregistrés.

- **Cinq comptes**, dont l’administrateur principal, conservent un accès historique non facturé, sans quota rétroactif. Ils possèdent ensemble six écrans actifs. Le statut brut est `trial`, mais l’administration affiche correctement **Accès historique / Non facturé** ; ils ne sont pas comptés comme essais datés en cours.
- **Un compte** possède un accès Starter attribué manuellement, limité à cinq écrans et non facturé, avec trois écrans actifs. Il n’est pas historique, mais n’a pas de date de fin d’essai. La page Abonnement affiche **3 / 5** et **2 emplacements disponibles**. Il n’est pas compté comme essai gratuit daté en cours.

Ce dernier cas correspond à l’ancien accès accordé manuellement, pas à un nouvel essai de 14 jours. La fonction déployée n’applique pas l’expiration d’essai lorsqu’aucune date de fin n’existe. Il ne faut donc pas interpréter ce compte comme un essai automatique expiré ni lui imposer rétroactivement une date : aucun changement n’a été effectué.

## 5. Protection contre les manipulations client

| Test effectué avec une session client réelle | Résultat |
|---|---|
| Lire ses abonnements | Une seule ligne, appartenant au client |
| Lire l’abonnement du compte administrateur | Zéro ligne |
| Ouvrir la page Administration | Accès refusé, écran explicite |
| Appeler la liste administrative ou une fiche administrative | `Forbidden` |
| Appeler écrans gratuits, abonnement spécial, prolongation | `Forbidden` pour les trois |
| Appeler la modification d’un forfait | `Forbidden` |
| Appeler suspension ou réactivation | `Forbidden` pour les deux |
| Modifier directement son quota | Zéro ligne modifiée |
| Modifier directement le quota de l’administrateur | Zéro ligne modifiée |
| Modifier directement un droit de son écran | Zéro ligne modifiée |
| Modifier directement le rôle administrateur existant | Zéro ligne modifiée |
| Insérer directement une fiche d’abonnement | Refus explicite par la protection d’accès |
| Activer un écran sans propriété correspondante | `Forbidden` sur une cible inexistante |

Les tentatives directes de mise à jour portaient sur des valeurs déjà présentes, afin de ne rien changer même en cas d’erreur de protection. La réponse sans erreur mais avec **zéro ligne** signifie ici que la politique ne permet pas de cibler la ligne en écriture ; ce n’est pas un succès de modification.

Les tables abonnements et droits d’écran n’ont que des politiques de lecture pour le client ; la table de rôles n’autorise que la lecture de son propre rôle. Les privilèges SQL généraux ne suffisent pas à écrire : les politiques d’accès effectivement activées bloquent les écritures. Les actions autorisées passent par les fonctions transactionnelles protégées.

**Limite :** aucune attaque avec une véritable identité d’écran appartenant à un autre client n’a été exécutée via la fonction d’activation ; le filtre de propriété déployé a été examiné, et le refus sur une cible inexistante testé. Cet audit ciblé n’est pas un test d’intrusion exhaustif.

## 6. Sixième écran et libération d’une place

**Tests automatisés réellement réexécutés :**

- Cinq places déjà utilisées sur une capacité de cinq : activation supplémentaire refusée par la règle testée.
- Cinq places utilisées sur une capacité de dix : une place supplémentaire autorisée.
- Capacité cinq, quatre droits actifs : exactement une place disponible.

**Fonctions déployées examinées :**

- Contrôle des places actives face à `capacité + écrans offerts`, sous verrou transactionnel du compte.
- Refus de l’activation quand l’usage atteint le quota.
- Même contrôle pour le jumelage et la réactivation d’un écran existant.
- Une désactivation passe uniquement le droit à inactif, augmente sa révision et conserve le jumelage. Le comptage ne retient que les droits actifs : la place est donc libérée.
- Un écran simplement hors ligne reste actif et continue d’occuper une place.

**Non réexécuté en conditions réelles pendant cet audit :** passage d’un compte de cinq à six écrans, désactivation effective, réactivation effective, activations concurrentes. Le compte limité actuellement disponible n’a que trois écrans ; aucun nouveau compte ni écran n’a été créé. Les scénarios réels de la livraison précédente sont décrits dans `BILLING.md`, mais ne sont pas présentés ici comme des essais fraîchement réalisés.

## 7. Préservation des écrans enregistrés

- Neuf écrans, neuf droits actifs ; aucun écran sans droit ou avec un propriétaire incohérent.
- Les neuf droits actifs correspondent à des appareils jumelés avec des identités non révoquées.
- Empreintes inchangées des droits, des révisions et des révocations d’identités après les vérifications.
- Abonnements, catalogue et date de modification des paramètres de facturation inchangés.

Le contrôle de droit d’appareil déployé vérifie l’identité puis lit le droit de l’écran ; il ne désactive pas spontanément les droits lorsque l’essai expire ou qu’un compte est suspendu. La politique configurée est **bloquer les nouvelles activations uniquement**. La suspension de compte ne change pas les droits actifs ; une désactivation explicite d’écran reste une opération distincte.

**Pas de garantie matérielle ajoutée :** aucun Player Android ni aucune télévision physique n’a été piloté. La réception des droits, la lecture sur TV, la stabilité réseau, le fonctionnement hors connexion et les anciens APK restent à vérifier sur les appareils concernés. L’absence d’incohérence des données ne prouve pas à elle seule une lecture physique ininterrompue.

## 8. Possibilités de l’administrateur

| Action | Vérification actuelle | Réserve |
|---|---|---|
| Accorder des écrans gratuits | Formulaire ouvert, fonction protégée examinée, accès client refusé | Attribution et relecture non effectuées |
| Accorder un abonnement spécial | Option et champs ouverts, fonction protégée examinée, accès client refusé | Attribution non effectuée |
| Prolonger un essai | Option et champ ouverts, fonction protégée examinée, accès client refusé | Prolongation non effectuée |
| Modifier les forfaits | Éditeur Starter ouvert, prix existant de 299 MAD relu, accès client refusé | Aucune sauvegarde ni modification de tarif |
| Suspendre un client | Confirmation ouverte puis annulée, fonction examinée, accès client refusé | Aucune suspension réelle |
| Réactiver un client | Restauration du statut précédent examinée, accès client refusé | Aucun compte suspendu disponible ; bouton conditionnel non exercé |

Précisions sur les règles examinées :

- Les écrans gratuits définissent **un total d’écrans offerts**, pas un ajout cumulatif à chaque clic ; une réduction sous l’usage existant est refusée.
- Un abonnement spécial ne produit aucun paiement ; la capacité ne peut pas devenir inférieure à l’usage autorisé, et un contrat déjà géré par un prestataire est protégé.
- La prolongation accepte de 1 à 90 jours pour un compte au statut `trial`, en partant de la fin actuelle ou de maintenant si elle est absente/passée. Aucun test d’écriture n’a été fait sur les accès historiques ou manuels sans date.
- La modification de catalogue ne réécrit pas les capacités et montants déjà attribués aux clients.
- La suspension bloque les nouvelles activations et conserve les TV ; la réactivation restaure le statut précédent, sans simuler un paiement.

## 9. Résultats techniques et vérifications restantes

**45 tests réussis dans trois suites existantes :** règles commerciales 24, droits du lecteur 2, API appareils 19. Aucun test ajouté ni règle métier modifiée. Les tests du lecteur ont seulement été exécutés : aucun fichier Player n’a été changé.

**Navigateur :** administration sur ordinateur et vue mobile, fiches, options commerciales, éditeur de forfait, navigation et rechargement vérifiés ; aucune erreur d’exécution navigateur observée. Dernier signal de compilation disponible : `build OK`.

Pour terminer une validation complète sans toucher aux clients existants, prévoir ultérieurement un environnement isolé ou l’autorisation explicite d’utiliser des données de test pour :

1. Activer cinq écrans, refuser le sixième, désactiver un écran, constater la place libérée et la réactivation protégée, y compris en concurrence.
2. Enregistrer puis relire les gestes commerciaux ; vérifier un essai daté et la prolongation des accès manuels sans date.
3. Suspendre puis réactiver un client de test, avec un lecteur connecté pour contrôler la diffusion conservée.
4. Tester la sauvegarde des forfaits dans une copie isolée, sans changer le catalogue de production.
5. Vérifier un refus d’activation sur un véritable écran appartenant à un autre compte.
6. Vérifier la pagination au-delà de 25 clients, des revenus non nuls après raccordement du prestataire, et le parcours signé sur le domaine public.
7. Vérifier la lecture et la réception des droits sur une télévision Android réelle.

Ces tests restent à faire ; aucun traitement ne continue automatiquement après cet audit.