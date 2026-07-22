export function countryFlagEmoji(country: string | null | undefined): string | null {
  if (!country) {
    return null;
  }
  const code = country.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return null;
  }
  return String.fromCodePoint(
    ...[...code].map((char) => 127_397 + char.charCodeAt(0))
  );
}

export function countryDisplayName(
  country: string | null | undefined
): string | null {
  if (!country) {
    return null;
  }
  const code = country.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return country;
  }
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function platformLabel(
  platform: string | null | undefined
): string {
  if (!platform) {
    return "Unknown";
  }
  const normalized = platform.toLowerCase();
  if (normalized === "ios") {
    return "iOS";
  }
  if (normalized === "android") {
    return "Android";
  }
  return platform;
}

export function platformSymbol(
  platform: string | null | undefined
): "iphone" | "candybarphone" | "questionmark.circle" {
  const normalized = platform?.toLowerCase();
  if (normalized === "ios") {
    return "iphone";
  }
  if (normalized === "android") {
    return "candybarphone";
  }
  return "questionmark.circle";
}
