import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const compiler = fileURLToPath(new URL('../node_modules/typescript/bin/tsc', import.meta.url));
const outputDir = mkdtempSync(join(tmpdir(), 'nhhi-player-tests-'));

const runNode = args => {
  const result = spawnSync(process.execPath, args, { cwd: projectRoot, stdio: 'inherit' });
  if (result.error) throw result.error;
  return result.status ?? 1;
};

try {
  writeFileSync(join(outputDir, 'package.json'), '{"type":"commonjs"}\n');
  const compileStatus = runNode([
    compiler,
    'tests/playerService.test.ts',
    'tests/historyService.test.ts',
    '--module', 'commonjs',
    '--moduleResolution', 'node',
    '--target', 'es2022',
    '--esModuleInterop',
    '--skipLibCheck',
    '--outDir', outputDir,
  ]);
  process.exitCode = compileStatus || runNode([
    '--test',
    join(outputDir, 'tests', 'playerService.test.js'),
    join(outputDir, 'tests', 'historyService.test.js'),
  ]);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}
