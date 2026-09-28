import { createAnalytics } from "@remcostoeten/analytics-sdk";
import { botSignals, errors, ignoreSelf, speedInsights } from "@remcostoeten/analytics-sdk/plugins";

import { apiPort, publicKey } from "../ports";

const scenario = document.body.dataset.scenario;

const analytics = createAnalytics({
  project: "site",
  key: publicKey,
  endpoint: scenario === "proxy" ? "/_ra" : `http://localhost:${apiPort}/v2/events`,
  mode: "production",
  consent: scenario === "consent" ? "required" : "optional",
  plugins: [botSignals(), ignoreSelf(), errors(), speedInsights({ sampleRate: 1 })],
});

Reflect.set(window, "analytics", analytics);

document.querySelector("#grant")?.addEventListener("click", () => analytics.consent.grant());
document.querySelector("#navigate")?.addEventListener("click", () => {
  history.pushState(null, "", `${location.pathname}/next`);
});
document.querySelector("#fail")?.addEventListener("click", () => {
  setTimeout(() => {
    throw new TypeError("fixture failure");
  });
});
