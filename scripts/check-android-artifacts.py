"""Inspect actual APK/AAB ELF libraries; configuration alone does not prove 16 KB compatibility."""
import struct
import sys
import zipfile

def check_elf(data):
    if data[:4] != b'\x7fELF' or data[4] not in (1, 2) or data[5] not in (1, 2):
        raise ValueError('Invalid ELF library')
    endian = '<' if data[5] == 1 else '>'
    is64 = data[4] == 2
    header = struct.unpack_from(endian + ('HHIQQQIHHHHHH' if is64 else 'HHIIIIIHHHHHH'), data, 16)
    offset, size, count = header[4], header[8], header[9]
    loads = 0
    for index in range(count):
        segment = struct.unpack_from(endian + ('IIQQQQQQ' if is64 else 'IIIIIIII'), data, offset + index * size)
        if segment[0] != 1:
            continue
        loads += 1
        alignment = segment[7]
        file_offset, address = (segment[2], segment[3]) if is64 else (segment[1], segment[2])
        if alignment < 16384 or alignment & (alignment - 1) or (file_offset - address) % 16384:
            raise ValueError('ELF LOAD segment is not 16 KB compatible')
    if not loads:
        raise ValueError('ELF has no LOAD segments')

def check_archive(path):
    with zipfile.ZipFile(path) as archive:
        libraries = [name for name in archive.namelist() if name.endswith('.so')]
        names = set(libraries)
        for name in libraries:
            check_elf(archive.read(name))
            for abi32, abi64 in [('armeabi-v7a', 'arm64-v8a'), ('x86', 'x86_64')]:
                if f'/{abi32}/' in name and name.replace(f'/{abi32}/', f'/{abi64}/') not in names:
                    raise ValueError(f'Missing 64-bit counterpart: {name}')
        print(f'{path}: {len(libraries)} native libraries checked; ' +
              ('ELF 16 KB and 64-bit counterparts OK' if libraries else 'no embedded native ELF libraries (WebView is supplied by Android)'))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Usage: python3 scripts/check-android-artifacts.py file.apk [file.aab]')
    for path in sys.argv[1:]:
        check_archive(path)