import { createFileRoute } from "@tanstack/react-router";
import { ScreenMonitoring } from "@/components/screen-monitoring";

export const Route = createFileRoute("/_authenticated/monitoring")({
  head: () => ({ meta: [
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { title: "Supervision — ScreenFlow" },
    { name: "description", content: "Surveillez en direct l'état et la diffusion de toutes vos TV." },
    { property: "og:title", content: "Supervision — ScreenFlow" },
    { property: "og:description", content: "Surveillez en direct l'état et la diffusion de toutes vos TV." },
  ] }),
  component: MonitoringPage,
});

function MonitoringPage() {
  return <ScreenMonitoring />;
}
