// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/android-player.yml", "utf8");
const sdkPackages = workflow.match(/^\s+packages:\s*'([^']+)'/m)?.[1]?.split(/\s+/) ?? [];

describe("Android TV build configuration", () => {
  it("excludes the obsolete SDK tools package", () => {
    expect(sdkPackages.length).toBeGreaterThan(0);
    expect(sdkPackages).not.toContain("tools");
  });

  it("installs the Capacitor 8 platform and AGP 8.13 build tools", () => {
    expect(sdkPackages).toEqual(["platform-tools", "platforms;android-36", "build-tools;35.0.0"]);
  });

  it("uses Java 21 for Capacitor and Gradle 8.14.3", () => {
    expect(workflow).toMatch(/java-version:\s*"21"/);
  });

  it("keeps manual dispatch with a required API origin", () => {
    expect(workflow).toMatch(/on:\s*\n\s+workflow_dispatch:\s*\n\s+inputs:\s*\n\s+api_origin:\s*\n\s+description:[^\n]+\n\s+required: true/);
    expect(workflow).toContain("PLAYER_ORIGIN: ${{ inputs.api_origin }}");
    expect(workflow).toContain("VITE_PLAYER_API_ORIGIN: ${{ inputs.api_origin }}");
  });

  it("still assembles and uploads the debug APK", () => {
    expect(workflow).toContain("./gradlew assembleDebug");
    expect(workflow).toContain("uses: actions/upload-artifact@v4");
    expect(workflow).toContain("path: android/app/build/outputs/apk/debug/app-debug.apk");
    expect(workflow).toContain("if-no-files-found: error");
  });
});