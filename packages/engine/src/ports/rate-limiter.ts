export type RateDecision = {
  allowed: boolean;
  hits: number;
  retryAfterSeconds: number;
};

export type RateLimiter = {
  hit: (key: string, limit: number, windowSeconds: number) => Promise<RateDecision>;
};
