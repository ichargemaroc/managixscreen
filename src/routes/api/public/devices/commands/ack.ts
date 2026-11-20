import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/devices/commands/ack")({
  server: { handlers: { POST: async ({ request }) => {
    const { handleDeviceRequest } = await import("@/lib/device-api.server");
    return handleDeviceRequest(request, "ack");
  } } },
});