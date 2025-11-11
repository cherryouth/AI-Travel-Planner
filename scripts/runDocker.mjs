import { spawn } from 'node:child_process';
import process from 'node:process';

const tasks = [];
let shuttingDown = false;

function terminate(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of tasks) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  const killTimer = setTimeout(() => {
    for (const child of tasks) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
  }, 5000);
  killTimer.unref();

  Promise.allSettled(tasks.map(child => new Promise(resolve => child.once('exit', resolve)))).then(
    () => {
      process.exit(code);
    },
  );
}

function startTask(name, command, args = [], options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    ...options,
  });

  tasks.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (signal) {
      terminate(0);
      return;
    }

    if (typeof code === 'number' && code !== 0) {
      console.error(`[docker] ${name} exited with code ${code}`);
      terminate(code);
      return;
    }

    terminate(0);
  });

  child.on('error', error => {
    if (!shuttingDown) {
      console.error(`[docker] Failed to start ${name}:`, error);
      terminate(1);
    }
  });
}

process.on('SIGINT', () => terminate(0));
process.on('SIGTERM', () => terminate(0));
process.on('uncaughtException', error => {
  console.error('[docker] Uncaught exception:', error);
  terminate(1);
});

startTask('hunyuan proxy', process.execPath, ['/server/hunyuanProxy.mjs'], {
  cwd: process.cwd(),
  env: process.env,
});

startTask('nginx', 'nginx', ['-g', 'daemon off;']);
