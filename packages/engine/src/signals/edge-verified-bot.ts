import { defineSignal } from "../define";

const truthy = new Set(["1", "true"]);

/**
 * @name edgeVerifiedBot
 * @description Vercel's `x-vercel-bot` header, or Cloudflare's verified-bot flag forwarded as
 * `cf-verified-bot`.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [edgeVerifiedBot] }, settings);
 */
export const edgeVerifiedBot = defineSignal({
  name: "edge_verified_bot",
  weight: 100,
  replayable: false,
  detect: (draft) => {
    const { headers } = draft.request;
    return (
      truthy.has(headers.get("x-vercel-bot") ?? "") ||
      truthy.has(headers.get("cf-verified-bot") ?? "")
    );
  },
});
