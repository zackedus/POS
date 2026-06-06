import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const composeFile = path.join(root, 'docker', 'docker-compose.dev.yml');
const logPrefix = '[docker:up]';
const DOCKER_INFO_TIMEOUT_MS = 10_000;

function log(message) {
  console.log(`${logPrefix} ${message}`);
}

function warn(message) {
  console.warn(`${logPrefix} WARNING: ${message}`);
}

function run(command, args, { allowFail = false, timeoutMs } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    timeout: timeoutMs,
  });

  if (result.error) {
    if (result.error.code === 'ETIMEDOUT' && allowFail) {
      return {
        ...result,
        status: 1,
        stderr: `${(result.stderr ?? '').trim()}\n(timeout ${timeoutMs}ms)`.trim(),
      };
    }
    throw result.error;
  }

  if (result.status !== 0 && !allowFail) {
    const stderr = (result.stderr ?? '').trim();
    throw new Error(stderr || `${command} ${args.join(' ')} gagal (exit ${result.status}).`);
  }

  return result;
}

function printWindowsDockerHints(stderr) {
  if (process.platform !== 'win32') {
    return;
  }

  const text = (stderr ?? '').toLowerCase();

  warn('Windows: pastikan Docker Desktop terpasang dan engine Linux aktif (Settings > General > Use WSL 2).');

  if (text.includes('etimedout') || text.includes('timeout')) {
    warn('Docker CLI tidak merespons (daemon hang). Coba: Quit Docker Desktop (tray) > wsl --shutdown > buka Docker Desktop lagi.');
    return;
  }

  if (text.includes('dockerdesktoplinuxengine') || text.includes('500 internal server error')) {
    warn('Engine Linux Docker Desktop error (WSL backend). Coba: wsl --shutdown, lalu start Docker Desktop; cek wsl -l -v (docker-desktop harus Running).');
    return;
  }

  if (text.includes('cannot connect') || text.includes('error during connect') || text.includes('pipe')) {
    warn('Daemon belum siap. Buka Docker Desktop, tunggu status Engine running, lalu ulangi npm run docker:up.');
  }
}

function dockerProbe() {
  const result = run('docker', ['info'], { allowFail: true, timeoutMs: DOCKER_INFO_TIMEOUT_MS });
  if (result.status === 0) {
    return { ok: true };
  }
  return {
    ok: false,
    stderr: `${(result.stderr ?? '').trim()}\n${(result.stdout ?? '').trim()}`.trim(),
  };
}

function testPort(port, host = '127.0.0.1', timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (ok) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function waitForPort(name, port, attempts = 30, delayMs = 2000) {
  for (let i = 1; i <= attempts; i += 1) {
    if (await testPort(port)) {
      log(`${name} siap (port ${port}).`);
      return true;
    }
    log(`Menunggu ${name} pada port ${port}... (${i}/${attempts})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log(' Barokah Core POS — Docker Infra (Dev)');
  console.log('========================================');
  console.log('');

  const docker = dockerProbe();
  if (!docker.ok) {
    warn('Docker tidak tersedia atau daemon tidak jalan.');
    warn('Jalankan Docker Desktop, lalu ulangi: npm run docker:up');
    printWindowsDockerHints(docker.stderr);
    warn('Dev tanpa Docker: npm run dev -- -SkipDocker (Postgres lokal + REDIS_DISABLED otomatis).');
    process.exit(1);
  }

  log('Memulai postgres + redis...');
  run('docker', ['compose', '-f', composeFile, 'up', '-d', '--wait', 'postgres', 'redis']);

  const postgresOk = await waitForPort('PostgreSQL', 5433);
  const redisOk = await waitForPort('Redis', 6379);

  run('docker', ['ps', '--filter', 'name=barokah-postgres', '--filter', 'name=barokah-redis'], {
    allowFail: true,
  });

  if (!postgresOk) {
    warn('PostgreSQL belum merespons di port 5433.');
  }
  if (!redisOk) {
    warn('Redis belum merespons di port 6379.');
    process.exit(1);
  }

  log('Infra dev siap: postgres (5433) + redis (6379).');
}

main().catch((error) => {
  console.error(`${logPrefix} Gagal:`, error.message);
  process.exit(1);
});
