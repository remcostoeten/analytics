import { trackPageView, type AnalyticsOptions } from "./track";

const NAVIGATION_EVENT = "remco-analytics:navigate";

function dispatchNavigationEvent(): void {
  window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

function trackPathChange(
  currentPath: { value: string },
  options: AnalyticsOptions
): void {
  const nextPath = window.location.pathname;

  if (nextPath === currentPath.value) {
    return;
  }

  currentPath.value = nextPath;
  trackPageView(undefined, options);
}

export function observePageViews(options: AnalyticsOptions = {}): () => void {
  if (typeof window === "undefined") {
    return function cleanup() { };
  }

  const currentPath = { value: window.location.pathname };
  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  function handleNavigation(): void {
    trackPathChange(currentPath, options);
  }

  function pushState(...args: Parameters<History["pushState"]>): void {
    originalPushState(...args);
    dispatchNavigationEvent();
  }

  function replaceState(...args: Parameters<History["replaceState"]>): void {
    originalReplaceState(...args);
    dispatchNavigationEvent();
  }

  trackPageView(undefined, options);

  window.history.pushState = pushState;
  window.history.replaceState = replaceState;
  window.addEventListener("popstate", handleNavigation);
  window.addEventListener(NAVIGATION_EVENT, handleNavigation);

  return function cleanup() {
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
    window.removeEventListener("popstate", handleNavigation);
    window.removeEventListener(NAVIGATION_EVENT, handleNavigation);
  };
}
