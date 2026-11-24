"""Audit merged manifest, including permissions added by dependencies."""
import sys
import xml.etree.ElementTree as ET

def check_manifest(path):
    root = ET.parse(path).getroot()
    key = '{http://schemas.android.com/apk/res/android}'
    allowed = {'android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.REQUEST_INSTALL_PACKAGES'}
    permissions = {e.get(key + 'name') for e in root if e.tag.startswith('uses-permission')}
    # AndroidX adds this signature permission to protect dynamically registered receivers.
    permissions = {p for p in permissions if p and not p.endswith('.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION')}
    if not permissions.issubset(allowed):
        raise ValueError(f'Unexpected permissions: {permissions - allowed}')
    app = root.find('application')
    if app is None or app.get(key + 'allowBackup') != 'false' or app.get(key + 'usesCleartextTraffic') != 'false':
        raise ValueError('Backup or cleartext protection missing')
    print('Merged manifest: permission whitelist, backup and cleartext protection OK')

if __name__ == '__main__':
    check_manifest(sys.argv[1])