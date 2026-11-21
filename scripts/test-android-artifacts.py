import importlib.util
import struct
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
sys.dont_write_bytecode = True

spec = importlib.util.spec_from_file_location('artifact_audit', Path(__file__).with_name('check-android-artifacts.py'))
if spec is None or spec.loader is None:
    raise RuntimeError('Missing artifact checker')
audit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(audit)
manifest_spec = importlib.util.spec_from_file_location('manifest_audit', Path(__file__).with_name('check-android-manifest.py'))
if manifest_spec is None or manifest_spec.loader is None:
    raise RuntimeError('Missing manifest checker')
manifest_audit = importlib.util.module_from_spec(manifest_spec)
manifest_spec.loader.exec_module(manifest_audit)

def elf(alignment=16384, bits=64):
    ident = b'\x7fELF' + bytes([2 if bits == 64 else 1, 1, 1]) + bytes(9)
    if bits == 64:
        return ident + struct.pack('<HHIQQQIHHHHHH', 3, 183, 1, 0, 64, 0, 0, 64, 56, 1, 0, 0, 0) + struct.pack('<IIQQQQQQ', 1, 5, 0, 0, 0, 120, 120, alignment)
    return ident + struct.pack('<HHIIIIIHHHHHH', 3, 40, 1, 0, 52, 0, 0, 52, 32, 1, 0, 0, 0) + struct.pack('<IIIIIIII', 1, 0, 0, 0, 84, 84, 5, alignment)

class ArtifactTests(unittest.TestCase):
    def test_accepts_16kb_both_bit_widths(self):
        audit.check_elf(elf(bits=32)); audit.check_elf(elf(bits=64))

    def test_rejects_4kb(self):
        with self.assertRaises(ValueError): audit.check_elf(elf(alignment=4096))

    def test_rejects_non_elf(self):
        with self.assertRaises(ValueError): audit.check_elf(b'invalid')

    def test_rejects_missing_64_bit_library(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'test.aab'
            with zipfile.ZipFile(path, 'w') as archive: archive.writestr('base/lib/armeabi-v7a/libexample.so', elf(bits=32))
            with self.assertRaises(ValueError): audit.check_archive(path)

    def test_accepts_both_arm_architectures(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'test.apk'
            with zipfile.ZipFile(path, 'w') as archive:
                archive.writestr('lib/armeabi-v7a/libexample.so', elf(bits=32))
                archive.writestr('lib/arm64-v8a/libexample.so', elf())
            audit.check_archive(path)

    def test_accepts_no_native_dependencies(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'test.aab'
            with zipfile.ZipFile(path, 'w') as archive: archive.writestr('base/assets/index.html', 'player')
            audit.check_archive(path)

    def test_rejects_unexpected_merged_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'AndroidManifest.xml'
            path.write_text('<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.CAMERA"/><application android:allowBackup="false" android:usesCleartextTraffic="false"/></manifest>')
            with self.assertRaises(ValueError): manifest_audit.check_manifest(path)

    def test_accepts_minimal_permissions_and_protected_backup(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'AndroidManifest.xml'
            path.write_text('<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application android:allowBackup="false" android:usesCleartextTraffic="false"/></manifest>')
            manifest_audit.check_manifest(path)

if __name__ == '__main__': unittest.main()