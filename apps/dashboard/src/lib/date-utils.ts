export type DateRange = {
  start: Date;
  end: Date;
};

export type RangePreset = "24h" | "7d" | "30d" | "90d";

const MS_HOUR = 60 * 60 * 1000;
const MS_DAY = 24 * MS_HOUR;

const PRESET_MAP: Record<RangePreset, number> = {
  "24h": MS_HOUR * 24,
  "7d": MS_DAY * 7,
  "30d": MS_DAY * 30,
  "90d": MS_DAY * 90,
};

export function rangeFromPreset(preset: RangePreset): DateRange {
  const end = new Date();
  const start = new Date(end.getTime() - PRESET_MAP[preset]);
  return { start, end };
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRangeLabel(range: DateRange): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  return `${fmt.format(range.start)} - ${fmt.format(range.end)}`;
}

export function formatCompact(num: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}

export function granularityForRange(range: DateRange): "hour" | "day" {
  const diff = range.end.getTime() - range.start.getTime();
  return diff <= MS_DAY * 2 ? "hour" : "day";
}
