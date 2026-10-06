export type Json = string | number | boolean | null | Json[] | JsonRecord;

export type JsonRecord = { [key: string]: Json };

export function isRecord(value: Json | undefined): value is JsonRecord {
  return (
    value !== null && value !== undefined && !Array.isArray(value) && value.constructor === Object
  );
}

export function text(value: Json | undefined, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export function list(value: Json | undefined): Json[] {
  return Array.isArray(value) ? value : [];
}

export function record(value: Json | undefined): JsonRecord {
  return isRecord(value) ? value : {};
}

export function parseJson(raw: string): Json | undefined {
  try {
    const parsed: Json = JSON.parse(raw);
    return parsed;
  } catch {
    return undefined;
  }
}
