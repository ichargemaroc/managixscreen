// Idempotent additions to Capacitor's generated Android manifest.
export function configureAndroidManifest(source) {
  let manifest = source;
  manifest = manifest.replace('android:allowBackup="true"', 'android:allowBackup="false"');
  manifest = manifest.replace(/\s+android:roundIcon="[^"]*"/g, '');
  if (!manifest.includes('android:usesCleartextTraffic=')) manifest = manifest.replace('<application', '<application android:usesCleartextTraffic="false"');
  if (!manifest.includes('android:fullBackupContent=')) manifest = manifest.replace('<application', '<application android:fullBackupContent="false" android:dataExtractionRules="@xml/data_extraction_rules"');
  if (!manifest.includes('android.permission.RECEIVE_BOOT_COMPLETED')) {
    manifest = manifest.replace('<application', '<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />\n    <application');
  }
  if (!manifest.includes('android.software.leanback')) {
    manifest = manifest.replace('<application', '<uses-feature android:name="android.software.leanback" android:required="true" />\n    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n    <application');
  }
  manifest = manifest.replace(/(<uses-feature\b[^>]*android:name="android.software.leanback"[^>]*android:required=")false"/, '$1true"');
  for (const feature of ['android.hardware.faketouch', 'android.hardware.camera', 'android.hardware.camera.autofocus', 'android.hardware.microphone', 'android.hardware.telephony', 'android.hardware.location', 'android.hardware.wifi']) {
    if (!manifest.includes(`android:name="${feature}"`)) manifest = manifest.replace('<application', `<uses-feature android:name="${feature}" android:required="false" />\n    <application`);
  }
  if (!manifest.includes('android:screenOrientation=')) manifest = manifest.replace('android:launchMode="singleTask"', 'android:launchMode="singleTask" android:screenOrientation="landscape"');
  if (!manifest.includes('android.intent.category.LEANBACK_LAUNCHER')) manifest = manifest.replace('<category android:name="android.intent.category.LAUNCHER" />', '<category android:name="android.intent.category.LAUNCHER" />\n                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />');
  if (!manifest.includes('android:banner=')) manifest = manifest.replace('<application', '<application android:banner="@drawable/tv_banner"');
  if (!manifest.includes('android.intent.category.HOME')) {
    const mainActivity = /(<activity\b[^>]*android:name="(?:\.MainActivity|app\.screenflow\.player\.MainActivity)"[^>]*>)([\s\S]*?)(<\/activity>)/;
    if (!mainActivity.test(manifest)) throw new Error('Capacitor MainActivity missing from manifest');
    manifest = manifest.replace(mainActivity, '$1$2<intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.HOME" />\n                <category android:name="android.intent.category.DEFAULT" />\n            </intent-filter>\n        $3');
  }
  if (!manifest.includes('android:name=".BootReceiver"')) {
    manifest = manifest.replace('</application>', '<receiver android:name=".BootReceiver" android:enabled="true" android:exported="false" android:directBootAware="false">\n            <intent-filter>\n                <action android:name="android.intent.action.BOOT_COMPLETED" />\n                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />\n            </intent-filter>\n        </receiver>\n    </application>');
  }
  return manifest;
}