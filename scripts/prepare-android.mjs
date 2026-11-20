import { existsSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

if (!existsSync("dist-player/index.html")) throw new Error("Build the standalone player first with bun run player:build.");
if (!existsSync("android")) {
  const result = spawnSync("bunx", ["cap", "add", "android"], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = readFileSync(manifestPath, "utf8");
if (!manifest.includes('android.software.leanback')) manifest = manifest.replace('<application', '<uses-feature android:name="android.software.leanback" android:required="false" />\n    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n    <application');
manifest = manifest.replace('android:launchMode="singleTask"', 'android:launchMode="singleTask" android:screenOrientation="landscape"');
if (!manifest.includes('android.intent.category.LEANBACK_LAUNCHER')) manifest = manifest.replace('<category android:name="android.intent.category.LAUNCHER" />', '<category android:name="android.intent.category.LAUNCHER" />\n                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />');
if (!manifest.includes('android:banner=')) manifest = manifest.replace('<application', '<application android:banner="@drawable/tv_banner"');
writeFileSync(manifestPath, manifest);
copyFileSync("android-support/MainActivity.java", "android/app/src/main/java/app/screenflow/player/MainActivity.java");
copyFileSync("android-support/DeviceVaultPlugin.java", "android/app/src/main/java/app/screenflow/player/DeviceVaultPlugin.java");
copyFileSync("android-support/tv_banner.xml", "android/app/src/main/res/drawable/tv_banner.xml");
console.log("Android TV manifest, landscape/immersive activity and Keystore vault prepared.");