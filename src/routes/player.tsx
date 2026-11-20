import { createFileRoute } from "@tanstack/react-router";
import { TVPlayer } from "@/player/player";

export const Route = createFileRoute("/player")({
  head: () => ({ meta: [
    { title: "Lecteur TV — ScreenFlow" },
    { name: "description", content: "Jumelage et lecture plein écran de vos playlists sur TV." },
    { property: "og:title", content: "Lecteur TV — ScreenFlow" },
    { property: "og:description", content: "Votre lecteur d’affichage dynamique ScreenFlow." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TVPlayer,
});