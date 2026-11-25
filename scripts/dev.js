import { spawn } from 'node:child_process';

function launch(name, npmArgs) {
  const isWin = process.platform === 'win32';
  const command = isWin ? 'cmd.exe' : 'npm';
  const args = isWin ? ['/c', 'npm.cmd', ...npmArgs] : npmArgs;

  const child = spawn(command, args, {
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] exited with code ${code}`);
    }
  });
  return child;
}

console.log('Starting Railway AI Assistant (Backend + Frontend)...');
const backend = launch('backend', ['--prefix', 'backend', 'run', 'dev']);
const frontend = launch('frontend', ['--prefix', 'frontend', 'run', 'dev']);

function shutdown() {
  backend.kill();
  frontend.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
