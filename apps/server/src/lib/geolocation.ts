import { type CityResponse, open, type Reader } from 'maxmind';

const GEOIP_DB_PATH =
  process.env.GEOIP_DB_PATH || '/app/geoip/GeoLite2-City.mmdb';

type GeoLocationData = {
  countryCode: string | null;
  city: string | null;
};

class GeoIPManager {
  private reader: Reader<CityResponse> | null = null;

  async initialize() {
    await this.loadDatabase();
    console.log('✅ [GeoIP] Manager initialized');
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
    this.reader = null;
    console.log('✅ [GeoIP] Shutdown complete');
  }
}

let geoipManager: GeoIPManager | null = null;

export function initGeoIP() {
  geoipManager = new GeoIPManager();
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
