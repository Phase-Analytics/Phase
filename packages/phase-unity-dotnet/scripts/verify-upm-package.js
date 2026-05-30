#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const packageRoot = path.resolve(__dirname, '../../phase-unity');

const forbiddenRootFiles = [
  'Phase.Analytics.csproj',
  'Phase.Analytics.sln',
  'Directory.Build.props',
  '.editorconfig',
];

const requiredRoots = ['package.json', 'Runtime/Phase.Analytics.asmdef'];

let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

for (const file of forbiddenRootFiles) {
  if (fs.existsSync(path.join(packageRoot, file))) {
    fail(`forbidden dotnet artifact in UPM root: ${file}`);
  }
}

if (fs.existsSync(path.join(packageRoot, 'tests'))) {
  fail('tests/ must not live under packages/phase-unity (use packages/phase-unity-dotnet/tests)');
}

for (const file of requiredRoots) {
  const full = path.join(packageRoot, file);
  if (!fs.existsSync(full)) {
    fail(`missing required file: ${file}`);
  }
  if (!fs.existsSync(`${full}.meta`)) {
    fail(`missing .meta for ${file}`);
  }
}

function shouldSkip(name) {
  return (
    name === 'bin' ||
    name === 'obj' ||
    name === 'tests' ||
    name === 'Models' ||
    name === 'PLAN.md' ||
    name.startsWith('.')
  );
}

function walk(dir, relative = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.endsWith('.meta') || shouldSkip(entry.name)) {
      continue;
    }

    const rel = relative ? `${relative}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'bin' || entry.name === 'obj') {
        continue;
      }
      if (!fs.existsSync(`${full}.meta`)) {
        fail(`missing folder .meta: ${rel}/`);
      }
      walk(full, rel);
      continue;
    }

    if (!fs.existsSync(`${full}.meta`)) {
      fail(`missing .meta: ${rel}`);
    }
  }
}

walk(packageRoot);

if (failed) {
  process.exit(1);
}

console.log('UPM package layout and .meta files OK');
