import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Google Play native release rules', () => {
  const gradle = readFileSync('android-support/play-release.gradle', 'utf8');
  it('targets SDK 36 and retains Android 7 as the Capacitor minimum', () => {
    expect(gradle).toMatch(/compileSdk = 36/);
    expect(gradle).toMatch(/targetSdkVersion 36/);
    expect(gradle).toMatch(/minSdkVersion 24/);
  });
  it('includes both ARM and emulator 32/64-bit ABI families', () => {
    expect(gradle).toContain("abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'");
  });
  it('refuses release without an upload key and never uses debug signing for release', () => {
    expect(gradle).toContain('if (releaseRequested && !signingReady) throw');
    expect(gradle).toContain('signingConfig signingConfigs.playUpload');
    expect(gradle).not.toContain('signingConfigs.debug');
  });
  it('packages native libraries uncompressed for modern 16 KB zip alignment', () => {
    expect(gradle).toContain('useLegacyPackaging = false');
  });
});