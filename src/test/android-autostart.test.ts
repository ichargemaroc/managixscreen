import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const namespace = "http://schemas.android.com/apk/res/android";
function android(element: Element | null | undefined, name: string) {
  return element?.getAttributeNS(namespace, name);
}
function generatedManifest() {
  const fixture = mkdtempSync(join(tmpdir(), "screenflow-android-test-"));
  try {
    // Exercise the actual preparation script against the installed Capacitor template,
    // without building the app or creating generated native files in the checkout.
    const template = spawnSync("tar", ["-xOzf", "node_modules/@capacitor/cli/assets/android-template.tar.gz", "app/src/main/AndroidManifest.xml"], { encoding: "utf8" });
    expect(template.status).toBe(0);
    mkdirSync(join(fixture, "dist-player"));
    writeFileSync(join(fixture, "dist-player/index.html"), "");
    mkdirSync(join(fixture, "android/app/src/main/java/app/screenflow/player"), { recursive: true });
    mkdirSync(join(fixture, "android/app/src/main/res/drawable"), { recursive: true });
    symlinkSync(resolve("android-support"), join(fixture, "android-support"), "dir");
    const path = join(fixture, "android/app/src/main/AndroidManifest.xml");
    writeFileSync(path, template.stdout);
    const run = () => spawnSync("node", [resolve("scripts/prepare-android.mjs")], { cwd: fixture, encoding: "utf8" });
    expect(run().status).toBe(0);
    const first = readFileSync(path, "utf8");
    expect(run().status).toBe(0);
    expect(readFileSync(path, "utf8")).toBe(first);
    for (const name of ["MainActivity", "BootReceiver", "AutoStartPolicy", "DeviceVaultPlugin"]) {
      expect(readFileSync(join(fixture, `android/app/src/main/java/app/screenflow/player/${name}.java`), "utf8"))
        .toBe(readFileSync(`android-support/${name}.java`, "utf8"));
    }
    const doc = new DOMParser().parseFromString(first, "application/xml");
    expect(doc.querySelector("parsererror")).toBeNull();
    return doc;
  } finally { rmSync(fixture, { recursive: true, force: true }); }
}

describe("native Android boot preparation", () => {
  it("registers boot and own-update broadcasts with boot permission, only after unlock", () => {
    const doc = generatedManifest();
    expect(Array.from(doc.querySelectorAll("uses-permission")).map((e) => android(e, "name")))
      .toContain("android.permission.RECEIVE_BOOT_COMPLETED");
    const receivers = Array.from(doc.querySelectorAll("receiver"));
    expect(receivers).toHaveLength(1);
    const receiver = receivers[0];
    expect(android(receiver, "name")).toBe(".BootReceiver");
    expect(android(receiver, "exported")).toBe("false");
    expect(android(receiver, "directBootAware")).toBe("false");
    expect(android(receiver, "enabled")).toBe("true");
    expect(Array.from(receiver?.querySelectorAll("action") ?? []).map((e) => android(e, "name")))
      .toEqual(["android.intent.action.BOOT_COMPLETED", "android.intent.action.MY_PACKAGE_REPLACED"]);
  });

  it("offers Android HOME startup and preserves the single-task landscape TV launcher", () => {
    const doc = generatedManifest();
    const activity = doc.querySelector("activity");
    expect(android(activity, "name")).toBe(".MainActivity");
    expect(android(activity, "launchMode")).toBe("singleTask");
    expect(android(activity, "screenOrientation")).toBe("landscape");
    expect(android(activity, "exported")).toBe("true");
    const filters = Array.from(activity?.querySelectorAll("intent-filter") ?? []);
    const home = filters.find((f) => Array.from(f.querySelectorAll("category")).some((e) => android(e, "name") === "android.intent.category.HOME"));
    expect(Array.from(home?.querySelectorAll("category") ?? []).map((e) => android(e, "name")))
      .toEqual(["android.intent.category.HOME", "android.intent.category.DEFAULT"]);
    expect(android(home?.querySelector("action"), "name")).toBe("android.intent.action.MAIN");
    expect(Array.from(activity?.querySelectorAll("category") ?? []).map((e) => android(e, "name")))
      .toContain("android.intent.category.LEANBACK_LAUNCHER");
  });
});