import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env }; const node22 = '/opt/homebrew/opt/node@22/bin';
if (existsSync(`${node22}/node`)) env.PATH = `${node22}:${env.PATH}`;
for (const [part, args] of [
 ['backend', ['tsc', '--noEmit', '--incremental', 'false']],
 ['backend', ['jest', '--runInBand']],
 ['backend', ['eslint', '.', '--max-warnings=0']],
 ['frontend', ['tsc', '--noEmit', '--incremental', 'false']],
 ['frontend', ['vitest', 'run']],
 ['frontend', ['eslint', '.', '--max-warnings=0']],
]) { console.log(`\nChecking ${part}: ${args.join(' ')}`); const result = spawnSync('npx', args, {cwd: `${root}/${part}`, env, stdio:'inherit'}); if (result.error) console.error(result.error.message); if (result.status !== 0) process.exit(result.status || 1); }
