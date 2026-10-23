#!/usr/bin/env node
/**
 * Traceability check: every test case in the design sheet (fixtures/testCases.json)
 * must be automated exactly once, in the spec file the sheet plans for it.
 *
 *   npm run check:traceability
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'fixtures', 'testCases.json'), 'utf8'));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.spec.ts')) out.push(full);
  }
  return out;
}

const found = {};
for (const file of walk(path.join(root, 'tests'))) {
  const rel = path.relative(root, file).split(path.sep).join('/');
  const text = fs.readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\btc\('(TC-[A-Z]+-\d+)'\)/g)) {
    (found[match[1]] ||= []).push(rel);
  }
}

const missing = [];
const duplicated = [];
const misplaced = [];
const unknown = [];

for (const [id, meta] of Object.entries(catalog)) {
  const files = found[id] || [];
  if (files.length === 0) missing.push(id);
  if (files.length > 1) duplicated.push(`${id} (${files.join(', ')})`);
  if (files.length === 1 && files[0] !== meta.spec) misplaced.push(`${id}: in ${files[0]}, sheet plans ${meta.spec}`);
}
for (const id of Object.keys(found)) if (!catalog[id]) unknown.push(id);

const total = Object.keys(catalog).length;
const automated = total - missing.length;
console.log(`Test cases in sheet: ${total}`);
console.log(`Automated:           ${automated}`);
if (missing.length) console.log(`MISSING (${missing.length}): ${missing.join(', ')}`);
if (duplicated.length) console.log(`DUPLICATED: ${duplicated.join('; ')}`);
if (misplaced.length) console.log(`DIFFERENT FILE THAN PLANNED:\n  ${misplaced.join('\n  ')}`);
if (unknown.length) console.log(`NOT IN SHEET: ${unknown.join(', ')}`);

const ok = !missing.length && !duplicated.length && !unknown.length;
console.log(ok ? 'Traceability OK' : 'Traceability FAILED');
process.exit(ok ? 0 : 1);
