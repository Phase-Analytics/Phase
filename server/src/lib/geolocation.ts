import { existsSync } from 'node:fs';
import { mkdir, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type Redis from 'ioredis';
import { type CityResponse, open, type Reader } from 'maxmind';

const GEOIP_DB_PATH =
  process.env.GEOIP_DB_PATH || '/app/geoip/GeoLite2-City.mmdb';
const GEOIP_DB_URL =
  'https://github.com/P3TERX/GeoLite.mmdb/raw/download/GeoLite2-City.mmdb';
const UPDATE_INTERVAL_MS = 4 * 24 * 60 * 60 * 1000;
const UPDATE_LOCK_KEY = 'geoip:update:lock';
const UPDATE_LOCK_TTL = 300;

type GeoLocationData = {
  countryCode: string | null;
  city: string | null;
};

class GeoIPManager {
  private reader: Reader<CityResponse> | null = null;
  private updateTimer: Timer | null = null;
  private readonly redis: Redis | null = null;

  constructor(redisClient?: Redis) {
    this.redis = redisClient || null;
  }

  async initialize() {
    await this.ensureDatabase();
    await this.loadDatabase();
    this.scheduleUpdates();
    console.log('✅ [GeoIP] Manager initialized');
  }

  private async ensureDatabase() {
    if (existsSync(GEOIP_DB_PATH)) {
      console.log('✅ [GeoIP] Database found');
      return;
    }

    console.log('📥 [GeoIP] Database not found, downloading...');
    await this.downloadDatabase();
  }

  private async downloadDatabase(retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await mkdir(dirname(GEOIP_DB_PATH), { recursive: true });

        const tempPath = `${GEOIP_DB_PATH}.tmp`;
        const response = await fetch(GEOIP_DB_URL);

        if (!response.ok) {
          throw new Error(`Failed to download: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        await writeFile(tempPath, Buffer.from(buffer));
        await rename(tempPath, GEOIP_DB_PATH);

        console.log('✅ [GeoIP] Database downloaded successfully');
        return;
      } catch (error) {
        console.error(
          `❌ [GeoIP] Download attempt ${attempt}/${retries} failed:`,
          error
        );

        if (attempt < retries) {
          const delay = attempt * 2000;
          console.log(`⏳ [GeoIP] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }
  }

  private async loadDatabase() {
    try {
      this.reader = await open<CityResponse>(GEOIP_DB_PATH);
      console.log('✅ [GeoIP] Database loaded');
    } catch (error) {
      console.error('❌ [GeoIP] Failed to load database:', error);
      this.reader = null;
    }
  }

  private scheduleUpdates() {
    this.updateTimer = setInterval(() => {
      this.updateDatabase().catch((error) => {
        console.error('❌ [GeoIP] Scheduled update failed:', error);
      });
    }, UPDATE_INTERVAL_MS);

    console.log('⏰ [GeoIP] Weekly updates scheduled');
  }

  private async acquireUpdateLock(): Promise<boolean> {
    if (!this.redis) {
      return true;
    }

    try {
      const result = await this.redis.set(
        UPDATE_LOCK_KEY,
        '1',
        'EX',
        UPDATE_LOCK_TTL,
        'NX'
      );
      return result === 'OK';
    } catch {
      return false;
    }
  }

  private async releaseUpdateLock() {
    if (!this.redis) {
      return;
    }

    try {
      await this.redis.del(UPDATE_LOCK_KEY);
    } catch (error) {
      console.error('⚠️  [GeoIP] Failed to release lock:', error);
    }
  }

  async updateDatabase() {
    console.log('🔄 [GeoIP] Starting database update...');

    const lockAcquired = await this.acquireUpdateLock();
    if (!lockAcquired) {
      console.log('⏭️  [GeoIP] Another instance is updating, skipping');
      return;
    }

    try {
      const tempPath = `${GEOIP_DB_PATH}.new`;
      const response = await fetch(GEOIP_DB_URL);

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await writeFile(tempPath, Buffer.from(buffer));

      if (this.reader) {
        this.reader = null;
      }

      await rename(tempPath, GEOIP_DB_PATH);
      await this.loadDatabase();

      console.log('✅ [GeoIP] Database updated successfully');
    } catch (error) {
      console.error('❌ [GeoIP] Update failed:', error);

      try {
        await unlink(`${GEOIP_DB_PATH}.new`);
      } catch {
        // Ignore
      }
    } finally {
      await this.releaseUpdateLock();
    }
  }

  lookup(ip: string): GeoLocationData {
    if (!this.reader) {
      return { countryCode: null, city: null };
    }

    if (
      ip === '127.0.0.1' ||
      ip === 'localhost' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('172.')
    ) {
      return { countryCode: null, city: null };
    }

    try {
      const result = this.reader.get(ip);

      if (!result) {
        return { countryCode: null, city: null };
      }

      return {
        countryCode: result.country?.iso_code || null,
        city: result.city?.names?.en || null,
      };
    } catch {
      return { countryCode: null, city: null };
    }
  }

  shutdown() {
    console.log('🛑 [GeoIP] Shutting down...');

    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    this.reader = null;
    console.log('✅ [GeoIP] Shutdown complete');
  }
}

let geoipManager: GeoIPManager | null = null;

export function initGeoIP(redisClient?: Redis) {
  geoipManager = new GeoIPManager(redisClient);
  return geoipManager;
}

export function getLocationFromIP(ip: string): GeoLocationData {
  if (!geoipManager) {
    console.warn('⚠️  [GeoIP] Manager not initialized, returning null location');
    return { countryCode: null, city: null };
  }

  return geoipManager.lookup(ip);
}

export function shutdownGeoIP() {
  if (geoipManager) {
    geoipManager.shutdown();
    geoipManager = null;
  }
}
