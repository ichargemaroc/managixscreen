# Rotation des écrans

Dans **Écrans → Gérer / renommer**, ou les détails d’un écran, choisir **Rotation de l’écran**, puis **Enregistrer** :

- **0°** : standard.
- **90°** : sens horaire, vers la droite.
- **180°** : inversé.
- **270°** : vers la gauche.

Le réglage concerne la surface de diffusion, y compris les compositions et les pages Web. Les commandes de lecture restent accessibles sans rotation. Les fichiers sources, le jumelage et les identifiants de l’appareil ne changent pas. Les anciennes versions du lecteur ignorent ce nouveau réglage ; une nouvelle version APK est nécessaire sur Android TV.

## Implémentation

- Réglage propriétaire dans `screens.display_rotation`, limité aux quatre valeurs avec défaut 0 ; permissions existantes conservées.
- Champ inclus dans `device_content` après revalidation du jeton et dans l’empreinte du contenu ; sauvegarde déclenchant une actualisation best-effort.
- Dimensions logiques inversées pour 90°/270° avant rotation ; dimensions internes du canvas des murs utilisées pour éviter une déformation.
- Pages natives : placement et rotation par session, géométrie bornée, écoute du redimensionnement nettoyée à la fermeture, sans pont vers les identifiants. Un changement de rotation recharge la page Web concernée.
- Rotation conservée dans le manifeste local, sans entrer dans les clés des médias.

## Vérifications

260 tests Vitest réussis ; 11 calculs natifs validés par `nix shell nixpkgs#jdk21 -c node scripts/test-display-rotation.mjs`.

Parcours connecté : import d’une image portrait, création d’une playlist et d’un écran de test, jumelage réel, affectation et diffusion aux quatre rotations ; relecture du réglage après rechargement. Reprise depuis le cache avec les appels de synchronisation et de stockage bloqués. Formats 1280×720, 852×536 et 390×844 vérifiés sans erreur navigateur ni débordement. Écran, image et playlist temporaires supprimés, sans modifier les écrans existants.

La compilation APK complète et le rendu des WebViews/vidéos tournées sur TV physique restent à vérifier. Le lecteur web nécessite toujours le chargement initial de la page ; aucun cache d’application hors réseau n’a été ajouté. Publier le site et reconstruire l’APK avec la clé de signature d’origine avant déploiement ; ne jamais désinstaller le lecteur pour changer sa rotation.