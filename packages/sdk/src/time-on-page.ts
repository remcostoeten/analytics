import { track } from "./track";

type TimeOnPageOptions = {
  projectId?: string;
  ingestUrl?: string;
  debug?: boolean;
};

export function observeTimeOnPage(options: TimeOnPageOptions = {}): () => void {
  if (typeof window === "undefined") {
    return function cleanup() {};
  }

  const startTime = Date.now();
  let sent = false;

  function sendTimeOnPage(): void {
    if (sent) {
      return;
    }
    const timeOnPageMs = Date.now() - startTime;
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
