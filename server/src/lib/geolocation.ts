type GeoLocationData = {
  countryCode: string | null;
  city: string | null;
};

export async function getLocationFromIP(ip: string): Promise<GeoLocationData> {
  try {
    if (ip === '127.0.0.1' || ip === 'localhost' || ip.startsWith('192.168.')) {
      return { countryCode: null, city: null };
    }

    const response = await fetch(
      `https://api.ipwho.org/ip/${ip}?get=countryCode,city`
    );

    if (!response.ok) {
      return { countryCode: null, city: null };
    }

    const result = (await response.json()) as {
      success?: boolean;
      data?: {
        countryCode?: string;
        city?: string;
      };
    };

    if (!(result.success && result.data)) {
      return { countryCode: null, city: null };
    }

    return {
      countryCode: result.data.countryCode || null,
      city: result.data.city || null,
    };
  } catch {
    return { countryCode: null, city: null };
  }
}
