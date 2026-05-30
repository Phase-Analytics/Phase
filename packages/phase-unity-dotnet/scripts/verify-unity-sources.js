#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const runtimeRoot = path.resolve(__dirname, '../../phase-unity/Runtime');

let failed = false;

function fail(message) {
  console.error(`ERROR: ${message}`);
  failed = true;
}

function walkCs(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkCs(full, files);
      continue;
    }
    if (entry.name.endsWith('.cs')) {
      files.push(full);
    }
  }
  return files;
}

for (const file of walkCs(runtimeRoot)) {
  const rel = path.relative(runtimeRoot, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');

  if (
    content.includes('ValidationConstants') &&
    !rel.startsWith('Constants/') &&
    !content.includes('using Phase.Analytics.Constants')
  ) {
    fail(`${rel}: uses ValidationConstants without "using Phase.Analytics.Constants"`);
  }

  const usesUnityEngine =
    content.includes('using UnityEngine;') || content.includes('using UnityEngine.');
  const usesUtils = content.includes('using Phase.Analytics.Utils;');

  if (usesUnityEngine && usesUtils && /(?<!\.)\bLogger\.(Info|Warn|Error)\b/.test(content)) {
    fail(
      `${rel}: ambiguous Logger with UnityEngine — qualify as Phase.Analytics.Utils.Logger`
    );
  }
}

if (failed) {
  process.exit(1);
}

console.log('Unity Runtime source conventions OK');
