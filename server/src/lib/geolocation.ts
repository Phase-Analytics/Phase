type GeoLocationData = {
  countryCode: string | null;
  city: string | null;
};

export async function getLocationFromIP(ip: string): Promise<GeoLocationData> {
  try {
    if (
      ip === '127.0.0.1' ||
      ip === 'localhost' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.')
    ) {
      return { countryCode: null, city: null };
    }

    const response = await fetch(
      `https://ipwho.org/${ip}?fields=country_code,city`
    );

    if (!response.ok) {
      return { countryCode: null, city: null };
    }

    const data = (await response.json()) as {
      country_code?: string;
      city?: string;
    };

    return {
      countryCode: data.country_code || null,
      city: data.city || null,
    };
  } catch {
    return { countryCode: null, city: null };
  }
}
