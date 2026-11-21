import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { configureAndroidManifest } from "./android-manifest.mjs";

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
copyFileSync("android-support/tv_banner.xml", "android/app/src/main/res/drawable/tv_banner.xml");
console.log("Android TV boot receiver, optional HOME, landscape/immersive activity and Keystore vault prepared.");