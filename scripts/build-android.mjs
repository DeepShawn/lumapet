import { spawn } from 'node:child_process';
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const child = spawn(npm, ['run', 'build'], { cwd: root, env: { ...process.env, VITE_BASE: './' }, stdio: 'inherit' });

child.on('exit', async (code, signal) => {
  if (code !== 0) process.exit(code || 1);
  const source = resolve(root, 'dist');
  const target = resolve(root, 'platform/android/app/src/main/assets/public');
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
  console.log(`Copied ${source} -> ${target}`);
  if (signal) process.kill(process.pid, signal);
});
