import { afterEach, expect, test } from 'bun:test';
import { copyFile, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { GeoIPManager } from './geolocation';

const countryFixture = join(import.meta.dir, '__fixtures__/geoip/country.mmdb');
const cityFixture = join(import.meta.dir, '__fixtures__/geoip/city.mmdb');
let directory: string | undefined;
let manager: GeoIPManager | undefined;

afterEach(async () => {
  manager?.shutdown();
  manager = undefined;
  if (directory) {
    await rm(directory, { recursive: true, force: true });
    directory = undefined;
  }
});

async function waitForCountry(
  reader: GeoIPManager,
  countryCode: string | null
) {
  const deadline = Date.now() + 10_000;
  while (reader.lookup('214.0.0.1').countryCode !== countryCode) {
    if (Date.now() >= deadline) {
      throw new Error('GeoIP did not reload within 10 seconds');
    }
    await sleep(50);
  }
}

test('reloads atomic replacements, preserves the last valid database, and stops on shutdown', async () => {
  directory = await mkdtemp(join(tmpdir(), 'phase-geoip-'));
  const database = join(directory, 'country.mmdb');
  const replacement = `${database}.tmp`;
  await copyFile(countryFixture, database);
  manager = new GeoIPManager(database);
  await manager.initialize();
  expect(manager.lookup('81.2.69.160').countryCode).toBe('GB');
  expect(manager.lookup('214.0.0.1').countryCode).toBeNull();

  await copyFile(cityFixture, replacement);
  await rename(replacement, database);
  await waitForCountry(manager, 'SG');
  expect(manager.lookup('214.0.0.1').countryCode).toBe('SG');

  await writeFile(replacement, 'invalid database');
  await rename(replacement, database);
  await sleep(6000);
  expect(manager.lookup('214.0.0.1').countryCode).toBe('SG');

  await copyFile(countryFixture, replacement);
  await rename(replacement, database);
  await waitForCountry(manager, null);
  expect(manager.lookup('81.2.69.160').countryCode).toBe('GB');

  manager.shutdown();
  await copyFile(cityFixture, replacement);
  await rename(replacement, database);
  await sleep(6000);
  expect(manager.lookup('214.0.0.1').countryCode).toBeNull();
}, 35_000);

test('recovers when the database is installed after startup', async () => {
  directory = await mkdtemp(join(tmpdir(), 'phase-geoip-'));
  const database = join(directory, 'country.mmdb');
  manager = new GeoIPManager(database);
  await manager.initialize();
  expect(manager.lookup('214.0.0.1').countryCode).toBeNull();
  await copyFile(cityFixture, `${database}.tmp`);
  await rename(`${database}.tmp`, database);
  await waitForCountry(manager, 'SG');
  expect(manager.lookup('214.0.0.1').countryCode).toBe('SG');
}, 15_000);
