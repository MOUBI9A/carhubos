import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env };
const node22 = '/opt/homebrew/opt/node@22/bin';
if (existsSync(`${node22}/node`)) env.PATH = `${node22}:${env.PATH}`;
const children = ['backend', 'frontend'].map((part) => spawn('npm', ['run', part === 'backend' ? 'start:dev' : 'dev'], {cwd: `${root}/${part}`, env, stdio: 'inherit'}));
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill('SIGTERM'); process.exitCode = code; }
for (const child of children) { child.on('error', (err) => { console.error(err.message); stop(1); }); child.on('exit', (code) => { if (!stopping) stop(code || 0); }); }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
