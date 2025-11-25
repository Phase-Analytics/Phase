export async function getCountryFromIP(ip: string): Promise<string | null> {
  try {
    if (
      ip === '127.0.0.1' ||
      ip === 'localhost' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.')
    ) {
      return null;
    }

    const response = await fetch(`https://ipwho.is/${ip}?fields=country_code`);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { country_code?: string };

    return data.country_code || null;
  } catch {
    return null;
  }
}
