const ADJECTIVES = [
  "Swift",
  "Bright",
  "Calm",
  "Bold",
  "Quiet",
  "Lucky",
  "Noble",
  "Keen",
  "Rapid",
  "Soft",
  "Wild",
  "Clear",
  "Prime",
  "Vivid",
  "Steady",
  "Clever",
  "Gentle",
  "Sharp",
  "Warm",
  "Cool",
  "Fresh",
  "Grand",
  "Nimble",
  "True",
] as const;

const FIRST_NAMES = [
  "River",
  "Nova",
  "Ash",
  "Sky",
  "Lane",
  "Reed",
  "Blair",
  "Quinn",
  "Rowan",
  "Morgan",
  "Casey",
  "Drew",
  "Jamie",
  "Alex",
  "Sam",
  "Taylor",
  "Jordan",
  "Riley",
  "Avery",
  "Parker",
  "Cameron",
  "Harper",
  "Finley",
  "Elliot",
] as const;

function hashSeed(seed: string): number {
  let hash = 216_613_626_1;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** Deterministic friendly name — avoids showing raw device IDs. */
export function getDisplayName(seed: string | null | undefined): string {
  if (!seed) {
    return "Anonymous";
  }
  const hash = hashSeed(seed);
  const adjective = ADJECTIVES[hash % ADJECTIVES.length];
  const name = FIRST_NAMES[(hash >>> 8) % FIRST_NAMES.length];
  return `${adjective} ${name}`;
}

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

export function platformLabel(platform: string | null | undefined): string {
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

export type RowSymbol =
  | "person.fill"
  | "play.square.fill"
  | "bolt.fill"
  | "eye.fill"
  | "hand.tap.fill"
  | "link"
  | "iphone"
  | "candybarphone"
  | "questionmark.circle";

export function userRowSymbol(): RowSymbol {
  return "person.fill";
}

export function sessionRowSymbol(): RowSymbol {
  return "play.square.fill";
}

export function eventRowSymbol(isScreen?: boolean): RowSymbol {
  return isScreen ? "eye.fill" : "hand.tap.fill";
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

export function topEntries(
  stats: Record<string, number> | null | undefined,
  limit = 5,
  options?: { excludeKeys?: string[] }
): { key: string; count: number }[] {
  if (!stats) {
    return [];
  }
  const excluded = new Set(
    (options?.excludeKeys ?? ["unknown"]).map((key) => key.toLowerCase())
  );
  return Object.entries(stats)
    .filter(
      ([key, count]) => count > 0 && !excluded.has(key.trim().toLowerCase())
    )
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
