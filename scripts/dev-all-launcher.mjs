import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extraArgs = process.argv.slice(2);

const isWindows = process.platform === 'win32';
const script = isWindows
  ? path.join(root, 'scripts', 'dev-all.ps1')
  : path.join(root, 'scripts', 'dev-all.sh');

const command = isWindows ? 'powershell' : 'bash';
const args = isWindows
  ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script, ...extraArgs]
  : [script, ...extraArgs];

const child = spawn(command, args, {
  cwd: root,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('[dev-all] Gagal menjalankan launcher:', error.message);
  process.exit(1);
});
