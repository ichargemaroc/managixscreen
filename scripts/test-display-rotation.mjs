import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const output = mkdtempSync(join(tmpdir(), 'screenflow-rotation-'));
try {
  for (const [command, args] of [
    ['javac', ['-d', output, 'android-support/DisplayRotationLayout.java', 'android-support/tests/DisplayRotationLayoutTest.java']],
    ['java', ['-cp', output, 'app.screenflow.player.DisplayRotationLayoutTest']],
  ]) {
    const result = spawnSync(command, args, { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${command} failed (${result.status})`);
  }
} finally { rmSync(output, { recursive: true, force: true }); }