import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const textAttributes = new Set(['placeholder', 'title', 'aria-label', 'alt', 'description']);

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(filename) : [filename];
  });
}

const findings = [];
for (const filename of sourceFiles(path.join(root, 'src'))) {
  if (!filename.endsWith('.tsx') || /\.(test|spec)\.tsx$/.test(filename)) continue;
  const source = ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const candidates = [];

  function visit(node) {
    let value;
    if (ts.isJsxText(node)) value = node.text.trim();
    if (ts.isJsxAttribute(node) && textAttributes.has(node.name.getText(source)) && node.initializer && ts.isStringLiteral(node.initializer)) {
      value = node.initializer.text;
    }
    if (value && /[A-Za-z]{3,}/.test(value)) {
      candidates.push({
        line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        text: value.replace(/\s+/g, ' '),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  if (candidates.length) findings.push({ file: path.relative(root, filename), count: candidates.length, candidates });
}

findings.sort((first, second) => second.count - first.count || first.file.localeCompare(second.file));
const report = {
  scope: 'Literal JSX text and text attributes only. Includes brands and other false positives; excludes dynamic strings, toasts and API content. Not a translation-completion percentage.',
  files: findings.length,
  candidates: findings.reduce((total, finding) => total + finding.count, 0),
  findings,
};

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(report.scope);
  console.log(`\n${report.candidates} candidates across ${report.files} files\n`);
  for (const finding of findings) console.log(`${String(finding.count).padStart(4)}  ${finding.file}`);
}
