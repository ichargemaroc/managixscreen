import { describe, expect, it, vi } from "vitest";
import { recoverModuleLoad } from "@/lib/module-recovery";

describe("Module loading recovery", () => {
  it("reloads once on Safari module import failures", () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const reload = vi.fn();
    expect(recoverModuleLoad(new TypeError("Importing a module script failed."), storage, reload, 100_000)).toBe(true);
    expect(recoverModuleLoad(new TypeError("Importing a module script failed."), storage, reload, 100_100)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it("does not reload unrelated errors", () => {
    const storage = { getItem: vi.fn(), setItem: vi.fn() };
    const reload = vi.fn();
    expect(recoverModuleLoad(new Error("Unauthorized"), storage, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
  it("leaves the error screen usable when browser storage is unavailable", () => {
    const reload = vi.fn();
    expect(recoverModuleLoad(new Error("Failed to fetch dynamically imported module"), { getItem: () => { throw new Error("blocked"); }, setItem: vi.fn() }, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});