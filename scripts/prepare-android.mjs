import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, cpSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { configureAndroidManifest } from "./android-manifest.mjs";
import { configurePlayGradle } from "./android-play.mjs";

if (!existsSync("dist-player/index.html")) throw new Error("Build the standalone player first with bun run player:build.");
if (!existsSync("android")) {
  const result = spawnSync("bunx", ["cap", "add", "android"], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const manifestPath = "android/app/src/main/AndroidManifest.xml";
writeFileSync(manifestPath, configureAndroidManifest(readFileSync(manifestPath, "utf8")));
copyFileSync("android-support/MainActivity.java", "android/app/src/main/java/app/screenflow/player/MainActivity.java");
copyFileSync("android-support/BootReceiver.java", "android/app/src/main/java/app/screenflow/player/BootReceiver.java");
copyFileSync("android-support/AutoStartPolicy.java", "android/app/src/main/java/app/screenflow/player/AutoStartPolicy.java");
copyFileSync("android-support/DeviceVaultPlugin.java", "android/app/src/main/java/app/screenflow/player/DeviceVaultPlugin.java");
copyFileSync("android-support/WebpagePlayerPlugin.java", "android/app/src/main/java/app/screenflow/player/WebpagePlayerPlugin.java");
copyFileSync("android-support/ApkUpdaterPlugin.java", "android/app/src/main/java/app/screenflow/player/ApkUpdaterPlugin.java");
copyFileSync("android-support/ApkUpdatePolicy.java", "android/app/src/main/java/app/screenflow/player/ApkUpdatePolicy.java");
const resources = "android/app/src/main/res";
mkdirSync(`${resources}/xml`, { recursive: true });
copyFileSync("android-support/data_extraction_rules.xml", `${resources}/xml/data_extraction_rules.xml`);
copyFileSync("android-support/update_paths.xml", `${resources}/xml/update_paths.xml`);
// Replace Capacitor's generic launcher with the existing brand, including adaptive icons.
cpSync("android-support/res", resources, { recursive: true });
if (existsSync(`${resources}/drawable/tv_banner.xml`)) {
  const { unlinkSync } = await import("node:fs");
  unlinkSync(`${resources}/drawable/tv_banner.xml`);
}
copyFileSync("android-support/play-release.gradle", "android/app/play-release.gradle");
const gradlePath = "android/app/build.gradle";
writeFileSync(gradlePath, configurePlayGradle(readFileSync(gradlePath, "utf8")));
console.log("Android TV launcher, backup protection, release signing, optional HOME and native boot prepared.");