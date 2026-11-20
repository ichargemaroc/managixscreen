import { describe, expect, it } from "vitest";
import { commandAck, deviceCommand, deviceReport } from "@/lib/player-protocol";

const device_id = "a67f4500-b2f4-4049-9a31-5433f14aad57";
describe("Native player input rules", () => {
  it("allows exactly the four requested device commands", () => {
    for (const command of ["refresh_content", "reload_playlist", "restart_player", "clear_cache"]) expect(deviceCommand.safeParse(command).success).toBe(true);
    expect(deviceCommand.safeParse("execute_shell").success).toBe(false);
  });
  it("accepts device version and playback data but rejects server-owned timestamps", () => {
    expect(deviceReport.safeParse({ device_id, player_version: "1.0.0", device_info: { model: "TV" }, playback_status: { state: "playing", position_seconds: 42 } }).success).toBe(true);
    expect(deviceReport.safeParse({ device_id, last_seen: "2026-11-20" }).success).toBe(false);
  });
  it("acknowledges only execution success or failure, not a fake pending state", () => {
    expect(commandAck.safeParse({ device_id, command_id: device_id, status: "completed" }).success).toBe(true);
    expect(commandAck.safeParse({ device_id, command_id: device_id, status: "pending" }).success).toBe(false);
  });
});