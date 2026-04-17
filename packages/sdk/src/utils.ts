export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isServer(): boolean {
  return typeof window === "undefined";
}

export function now(): number {
  return Date.now();
}

export function timeSince(startTime: number): number {
  return Date.now() - startTime;
}
