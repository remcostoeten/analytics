import { track, type AnalyticsOptions } from "./track";
import { isServer, now, timeSince } from "./utils";

export function observeTimeOnPage(options: AnalyticsOptions = {}): () => void {
  if (isServer()) {
    return function cleanup() {};
  }

  const startTime = now();
  let sent = false;

  function sendTimeOnPage(): void {
    if (sent) {
      return;
    }
    const timeOnPageMs = timeSince(startTime);
    if (timeOnPageMs > 0) {
      sent = true;
      track("event", { eventName: "time-on-page", timeOnPageMs }, options);
    }
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === "hidden") {
      sendTimeOnPage();
    }
  }

  function handleBeforeUnload(): void {
    sendTimeOnPage();
  }

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("beforeunload", handleBeforeUnload);

  return function cleanup() {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}
