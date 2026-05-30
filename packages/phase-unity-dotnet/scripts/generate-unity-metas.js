#!/usr/bin/env node
/**
 * Generates stable Unity .meta files for the UPM package at packages/phase-unity.
 * Re-run after adding Runtime/ or Samples~/ assets, then commit the metas.
 */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const packageRoot = path.resolve(__dirname, '../../phase-unity');

function guidFor(relativePath) {
  return crypto
    .createHash('sha1')
    .update(`Phase.Analytics.UPM\0${relativePath.replace(/\\/g, '/')}`)
    .digest('hex')
    .slice(0, 32);
}

function folderMeta(guid) {
  return `fileFormatVersion: 2
guid: ${guid}
folderAsset: yes
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
}

function monoImporterMeta(guid) {
  return `fileFormatVersion: 2
guid: ${guid}
MonoImporter:
  externalObjects: {}
  serializedVersion: 2
  defaultReferences: []
  executionOrder: 0
  icon: {instanceID: 0}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
}

function asmdefMeta(guid) {
  return `fileFormatVersion: 2
guid: ${guid}
AssemblyDefinitionImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
}

function textMeta(guid) {
  return `fileFormatVersion: 2
guid: ${guid}
TextScriptImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
}

function defaultMeta(guid) {
  return `fileFormatVersion: 2
guid: ${guid}
DefaultImporter:
  externalObjects: {}
  userData: 
  assetBundleName: 
  assetBundleVariant: 
`;
}

function metaForFile(relativePath) {
  const base = path.basename(relativePath);
  if (base.endsWith('.asmdef')) {
    return asmdefMeta(guidFor(relativePath));
  }
  if (base.endsWith('.cs')) {
    return monoImporterMeta(guidFor(relativePath));
  }
  if (
    base.endsWith('.json') ||
    base.endsWith('.xml') ||
    base.endsWith('.md') ||
    base.endsWith('.rsp')
  ) {
    return textMeta(guidFor(relativePath));
  }
  return defaultMeta(guidFor(relativePath));
}

function shouldSkipEntry(name) {
  return (
    name === 'bin' ||
    name === 'obj' ||
    name === 'tests' ||
    name === 'Models' ||
    name === 'PLAN.md' ||
    name === '.git' ||
    name.startsWith('.')
  );
}

function shouldSkipDir(name) {
  return shouldSkipEntry(name);
}

function walk(dir, relative = '') {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.name.endsWith('.meta') || shouldSkipEntry(entry.name)) {
      continue;
    }

    const rel = relative ? `${relative}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) {
        continue;
      }
      writeMeta(`${rel}/`, folderMeta(guidFor(`${rel}/`)));
      walk(path.join(dir, entry.name), rel);
      continue;
    }

    writeMeta(rel, metaForFile(rel));
  }
}

function writeMeta(relativePath, content) {
  const metaPath = path.join(
    packageRoot,
    `${relativePath.replace(/\/$/, '')}.meta`
  );
  fs.mkdirSync(path.dirname(metaPath), { recursive: true });
  fs.writeFileSync(metaPath, content, 'utf8');
}

walk(packageRoot);
console.log('Unity .meta files written under', packageRoot);
