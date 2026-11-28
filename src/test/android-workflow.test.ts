import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/android-player.yml", "utf8");
const sdkPackages = workflow.match(/^\s+packages:\s*'([^']+)'/m)?.[1]?.split(/\s+/) ?? [];
const retryScript = resolve("scripts/gradle-with-retry.sh");

function runGradleFixture(gradlewBody: string) {
  const directory = mkdtempSync(join(tmpdir(), "screenflow-gradle-retry-"));
  try {
    const gradlew = join(directory, "gradlew");
    writeFileSync(gradlew, `#!/usr/bin/env bash\n${gradlewBody}\n`);
    chmodSync(gradlew, 0o755);
    const sleep = join(directory, "sleep");
    writeFileSync(sleep, "#!/usr/bin/env bash\nexit 0\n");
    chmodSync(sleep, 0o755);

    const result = spawnSync("bash", [retryScript, "assembleDebug"], {
      cwd: directory,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${directory}:${process.env["PATH"] ?? ""}`,
        RUNNER_TEMP: directory,
      },
    });
    return { directory, result };
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
}

describe("Android TV build configuration", () => {
  it("excludes the obsolete SDK tools package", () => {
    expect(sdkPackages.length).toBeGreaterThan(0);
    expect(sdkPackages).not.toContain("tools");
  });

  it("installs the Capacitor 8 platform and AGP 8.13 build tools", () => {
    expect(sdkPackages).toEqual(["platform-tools", "platforms;android-36", "build-tools;35.0.0"]);
  });

  it("uses Java 21 and caches Gradle dependencies", () => {
    expect(workflow).toMatch(/java-version:\s*"21"/);
    expect(workflow).toMatch(/cache:\s*gradle/);
  });

  it("keeps manual dispatch with a required API origin", () => {
    expect(workflow).toMatch(/on:\s*\n\s+workflow_dispatch:\s*\n\s+inputs:\s*\n\s+api_origin:\s*\n\s+description:[^\n]+\n\s+required: true/);
    expect(workflow).toContain("PLAYER_ORIGIN: ${{ inputs.api_origin }}");
    expect(workflow).toContain("VITE_PLAYER_API_ORIGIN: ${{ inputs.api_origin }}");
  });

  it("still assembles and uploads the debug APK with dependency retries", () => {
    expect(workflow).toContain("bash ../scripts/gradle-with-retry.sh assembleDebug");
    expect(workflow).toContain("uses: actions/upload-artifact@v4");
    expect(workflow).toContain("path: android/app/build/outputs/apk/debug/app-debug.apk");
    expect(workflow).toContain("if-no-files-found: error");
  });

  it("uses the same dependency retries for signed production builds", () => {
    expect(workflow).toContain("bash ../scripts/gradle-with-retry.sh lintRelease assembleRelease bundleRelease");
  });

  it("retries Maven Central 429 responses until the build succeeds", () => {
    const { directory, result } = runGradleFixture(`
count=0
if [ -f count ]; then count=$(cat count); fi
count=$((count + 1))
echo "$count" > count
if [ "$count" -lt 3 ]; then
  echo "Could not GET dependency.pom. Received status code 429 from server: Too Many Requests" >&2
  exit 1
fi
echo "debug APK ready"
`);
    try {
      expect(result.status).toBe(0);
      expect(readFileSync(join(directory, "count"), "utf8").trim()).toBe("3");
      expect(result.stdout).toContain("debug APK ready");
      expect(result.stderr).toContain("Temporary Gradle dependency download failure");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("does not retry an ordinary compilation error", () => {
    const { directory, result } = runGradleFixture(`
echo "1" > count
echo "error: incompatible Java type" >&2
exit 1
`);
    try {
      expect(result.status).toBe(1);
      expect(readFileSync(join(directory, "count"), "utf8").trim()).toBe("1");
      expect(result.stderr).not.toContain("Temporary Gradle dependency download failure");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
