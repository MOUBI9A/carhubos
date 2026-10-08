import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const project = process.argv[2];
if (!['backend', 'frontend'].includes(project)) throw new Error('Use audit.mjs backend|frontend');
const cwd = resolve(project);
const lock = JSON.parse(readFileSync(resolve(cwd, 'package-lock.json'), 'utf8'));
const audit = spawnSync('npm', ['audit', '--json'], { cwd, encoding: 'utf8' });
if (audit.error) throw audit.error;
let result;
try { result = JSON.parse(audit.stdout); } catch { throw new Error('npm audit did not return a valid report'); }
if (result.error || !result.metadata || !result.vulnerabilities) throw new Error('npm audit could not complete');
const exceptions = JSON.parse(readFileSync(new URL('./audit-exceptions.json', import.meta.url)));
const failures = [];
const allowed = new Set();
for (const [name, vulnerability] of Object.entries(result.vulnerabilities)) {
  for (const advisory of vulnerability.via.filter((entry) => typeof entry === 'object')) {
    if (!['high', 'critical'].includes(advisory.severity)) continue;
    const exception = exceptions.find((entry) => entry.project === project && entry.package === name && entry.url === advisory.url);
    const onlyDev = vulnerability.nodes.length > 0 && vulnerability.nodes.every((path) => lock.packages[path]?.dev === true);
    if (exception && onlyDev && Date.now() < Date.parse(exception.expires)) {
      allowed.add(`${name}: ${advisory.url} (development only; expires ${exception.expires})`);
    } else failures.push(`${name}: ${advisory.url}`);
  }
}
// Runtime dependencies retain the standard npm gate, independently of exceptions.
const runtime = spawnSync('npm', ['audit', '--omit=dev', '--audit-level=high'], { cwd, stdio: 'inherit' });
if (runtime.error || runtime.status !== 0) failures.push('Production dependency audit failed');
for (const message of allowed) console.log(`Reviewed exception: ${message}`);
for (const failure of failures) console.error(failure);
console.log(`${project}: ${result.metadata.vulnerabilities.total} audit findings; ${allowed.size} reviewed advisories; ${failures.length} blocking findings`);
process.exitCode = failures.length ? 1 : 0;
