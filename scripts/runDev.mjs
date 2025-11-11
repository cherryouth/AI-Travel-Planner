import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const tasks = [];
let shuttingDown = false;
const exitSignal = process.platform === 'win32' ? 'SIGINT' : 'SIGTERM';
const forwardedArgs = process.argv.slice(2).filter(arg => arg !== '--');

function terminate(code = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  for (const child of tasks) {
    if (!child.killed) {
      child.kill(exitSignal);
    }
  }

  setTimeout(() => {
    process.exit(code);
  }, 500).unref();
}

function startTask(name, command, args) {
  // Spawn child processes so Vite and the proxy run together during development.
  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
    shell: false,
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
      terminate(code);
      return;
    }

    terminate(0);
  });

  child.on('error', error => {
    if (!shuttingDown) {
      console.error(`[dev] Failed to start ${name}:`, error);
      terminate(1);
    }
  });
}

process.on('SIGINT', () => terminate(0));
process.on('SIGTERM', () => terminate(0));
process.on('exit', () => terminate(0));

startTask('hunyuan proxy', process.execPath, ['server/hunyuanProxy.mjs']);

const viteBin = path.resolve(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
startTask('vite', process.execPath, [viteBin, ...forwardedArgs]);
