#!/usr/bin/env bun

import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { $ } from 'bun';

const VERSION_FILE = 'VERSION';

async function setGitHubOutput(name: string, value: string): Promise<void> {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    await appendFile(outputFile, `${name}=${value}\n`);
  }
  console.log(`Output: ${name}=${value}`);
}

async function getVersion(): Promise<string> {
  const content = await readFile(VERSION_FILE, 'utf-8');
  return content.trim();
}

async function setVersion(version: string): Promise<void> {
  await writeFile(VERSION_FILE, `${version}\n`);
}

async function getCommitMessage(): Promise<string> {
  const result = await $`git log -1 --pretty=%B`.text();
  return result.trim();
}

async function getChangedFiles(): Promise<string[]> {
  const result =
    await $`git diff-tree --no-commit-id --name-only -r HEAD`.text();
  return result
    .trim()
    .split('\n')
    .filter((f) => f.length > 0);
}

function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid version format: ${version}`);
  }
  return parts as [number, number, number];
}

function bumpVersion(
  version: string,
  type: 'major' | 'minor' | 'patch'
): string {
  const [major, minor, patch] = parseVersion(version);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump type: ${type satisfies never}`);
  }
}

async function main() {
  try {
    const currentVersion = await getVersion();
    const commitMsg = await getCommitMessage();
    const changedFiles = await getChangedFiles();

    console.log(`Current version: ${currentVersion}`);
    console.log(`Commit message: ${commitMsg}`);
    console.log(`Changed files: ${changedFiles.length} file(s)`);

    if (commitMsg.includes('[skip-v]')) {
      console.log('⏭️  Skipping version bump ([skip-v] tag found)');
      process.exit(1);
    }

    const nonSdkFiles = changedFiles.filter((f) => !f.startsWith('sdk/'));
    if (changedFiles.length > 0 && nonSdkFiles.length === 0) {
      console.log('⏭️  Skipping version bump (SDK-only changes)');
      process.exit(1);
    }

    let bumpType: 'major' | 'minor' | 'patch' = 'patch';
    if (commitMsg.includes('[major]')) {
      bumpType = 'major';
    } else if (commitMsg.includes('[minor]')) {
      bumpType = 'minor';
    }

    const newVersion = bumpVersion(currentVersion, bumpType);

    console.log(
      `📦 Bumping version: ${currentVersion} → ${newVersion} (${bumpType})`
    );

    await setVersion(newVersion);

    console.log(`✅ Version bumped to ${newVersion}`);
    console.log(`Tag: v${newVersion}`);

    await setGitHubOutput('version', newVersion);
    await setGitHubOutput('tag', `v${newVersion}`);
    await setGitHubOutput('bump_type', bumpType);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(2);
  }
}

main();
