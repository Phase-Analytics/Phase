export function formatDistanceToNow(iso: string): string {
  const date = new Date(iso);
  const abs = Math.abs(Date.now() - date.getTime());
  const minutes = Math.floor(abs / 60_000);
  const hours = Math.floor(abs / 3_600_000);
  const days = Math.floor(abs / 86_400_000);

  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 30) {
    return `${days}d ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function formatRelative(date: string | null | undefined): string {
  if (!date) {
    return "—";
  }
  return formatDistanceToNow(date);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "0";
  }
  return new Intl.NumberFormat("en-US", {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) {
    return "—";
  }
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rem = Math.round(seconds % 60);
  return `${minutes}m ${rem}s`;
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function lastNDaysRange(days = 30): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

/** Hidden 1-month window for overview charts (matches web "1 Month" / 30d). */
export function chartMonthRange() {
  return lastNDaysRange(30);
}

export const PAGE_SIZE = 25;
