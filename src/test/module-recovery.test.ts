import { describe, expect, it, vi } from "vitest";
import { isModuleLoadFailure, recoverModuleLoad, moduleRecoveryBootstrap } from "@/lib/module-recovery";

describe("Module loading recovery", () => {
  const staleLayout = 'Element type is invalid: expected a string but got: undefined. Check the render method of `AuthenticatedLayout`.';
  it('reloads an already mounted stale authenticated layout once per minute', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    const reload = vi.fn();
    expect(recoverModuleLoad(new Error(staleLayout), storage, reload, 100_000)).toBe(true);
    expect(recoverModuleLoad(new Error(staleLayout), storage, reload, 100_001)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(recoverModuleLoad(new Error(staleLayout), storage, reload, 160_001)).toBe(true);
  });
  it('does not classify undefined components elsewhere as stale authenticated layouts', () => {
    expect(isModuleLoadFailure(staleLayout.replace('AuthenticatedLayout', 'MediaPage'))).toBe(false);
    expect(isModuleLoadFailure('Element type is invalid: got: object. Check the render method of `AuthenticatedLayout`.')).toBe(false);
  });
  it('offers document reload for stale layouts when automatic recovery is throttled', () => {
    sessionStorage.setItem('screenflow-module-recovery', String(Date.now()));
    window.eval(moduleRecoveryBootstrap);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error(staleLayout) }));
    expect(document.getElementById('module-startup-recovery')).not.toBeNull();
    document.getElementById('module-startup-recovery')?.remove();
    sessionStorage.clear();
  });
  it("cancels Vite's rethrow for a failed lazy route import", () => {
    sessionStorage.setItem("screenflow-module-recovery", String(Date.now()));
    window.eval(moduleRecoveryBootstrap);
    const event = new Event("vite:preloadError", { cancelable: true });
    Object.assign(event, { payload: new TypeError("Importing a module script failed.") });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    document.getElementById("module-startup-recovery")?.remove(); sessionStorage.clear();
  });
  it("handles failed entry modules before React can mount without a reload loop", () => {
    sessionStorage.setItem("screenflow-module-recovery", String(Date.now()));
    window.eval(moduleRecoveryBootstrap);
    const script = document.createElement("script"); script.type = "module"; document.body.append(script);
    script.dispatchEvent(new Event("error"));
    expect(document.getElementById("module-startup-recovery")).not.toBeNull();
    expect(Number(sessionStorage.getItem("screenflow-module-recovery"))).toBeGreaterThan(Date.now() - 60000);
    script.remove(); document.getElementById("module-startup-recovery")?.remove(); sessionStorage.clear();
  });
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