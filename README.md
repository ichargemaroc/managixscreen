# Managixscreen

Je veux construire une plateforme professionnelle de Digital Signage (affichage dynamique) pour gérer à distance des téléviseurs Android.

Le site doit être une application web SaaS avec un design moderne, professionnel, minimaliste et responsive.

Nom provisoire : ScreenFlow.

Fonctionnalités principales :

1. Dashboard :
* Nombre total de TV.
* TV en ligne et hors ligne.
* Nombre de photos et vidéos.
* Playlists actives.
* Vue des écrans récemment connectés.

2. Gestion des TV :
* Ajouter une TV via un code de pairing à 6 chiffres.
* Afficher le nom de la TV.
* Afficher le statut online/offline.
* Afficher la dernière connexion.
* Afficher le contenu actuellement diffusé.
* Organiser les TV par groupes ou par lieux.
* Pouvoir supprimer, renommer et gérer chaque TV.

3. Bibliothèque Media :
* Upload de photos et vidéos.
* Prévisualisation des médias.
* Affichage du nom, type, durée et taille.
* Suppression et organisation des médias.

4. Playlists :
* Créer et modifier une playlist.
* Ajouter des photos et vidéos.
* Organiser les contenus par glisser-déposer.
* Définir la durée d’affichage des photos.
* Créer une playlist et l’affecter à une TV ou à un groupe de TV.

5. Programmation :
* Programmer les playlists par date et heure.
* Définir les horaires de diffusion.
* Gérer les calendriers de programmation.

6. Paramètres :
* Gestion du profil.
* Gestion des utilisateurs.
* Configuration du compte.

Navigation latérale :
Dashboard, Screens, Media Library, Playlists, Schedule, Groups, Settings.

Utilise React, une interface responsive et une architecture propre.

Prépare le projet pour une intégration Supabase avec authentification, base de données, stockage de médias et synchronisation en temps réel.

Pour l’instant, construis la structure visuelle et les pages fonctionnelles avec une navigation réelle entre elles. N’invente pas de fonctionnalités connectées qui ne sont pas encore implémentées.

Je veux une interface de qualité SaaS professionnel, comparable aux plateformes modernes de gestion d’affichage dynamique.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://managixscreen.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/cf76f83f-db5d-4d48-9399-bfa61ffe7eb3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
