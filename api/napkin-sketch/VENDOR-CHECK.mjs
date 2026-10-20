#!/usr/bin/env node
// Checks this folder against the VENDOR.json beside it: every file it records
// is here with the same sha256, and nothing else is. It needs no install and
// no network. Written by `napkin-sketch vendor`, which also runs this check as
// `napkin-sketch vendor --check <dir>`. Exits 0 when the folder matches, and
// 1, naming each file, when it does not.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const record = JSON.parse(readFileSync(join(here, 'VENDOR.json'), 'utf8'));
const found = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else found.push(relative(here, path).split(sep).join('/'));
  }
};
walk(here);

const problems = [];
for (const [file, sha256] of Object.entries(record.files)) {
  let bytes;
  try {
    bytes = readFileSync(join(here, ...file.split('/')));
  } catch {
    problems.push(`missing: ${file}`);
    continue;
  }
  if (createHash('sha256').update(bytes).digest('hex') !== sha256) problems.push(`differs: ${file}`);
}
for (const file of found) if (file !== 'VENDOR.json' && !(file in record.files)) problems.push(`added: ${file}`);

if (problems.length > 0) {
  console.error(`${record.name} ${record.version}, vendored here, does not match VENDOR.json:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`${record.name} ${record.version}: ${Object.keys(record.files).length} files match VENDOR.json.`);
