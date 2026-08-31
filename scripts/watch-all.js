import { spawn } from 'node:child_process';

const isWindows = process.platform === 'win32';

console.log('[SRemote] Starting watch mode for both Userscript and Wrapper...\n');

const runNpm = args => {
  if (isWindows) {
    return spawn('cmd.exe', ['/c', 'npm', ...args], { stdio: 'inherit' });
  }
  return spawn('npm', args, { stdio: 'inherit' });
};

const processes = [
  { name: 'USERSCRIPT', proc: runNpm(['run', 'dev:userscript']) },
  { name: 'WRAPPER', proc: runNpm(['run', 'dev:wrapper']) },
];

function cleanup() {
  console.log('\n[SRemote] Stopping watch processes...');
  for (const { proc } of processes) {
    if (proc && !proc.killed) {
      proc.kill();
    }
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
