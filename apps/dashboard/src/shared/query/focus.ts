import { focusManager } from "@tanstack/react-query";

/**
 * @name pageFocused
 * @description Whether the dashboard counts as in use: visible and holding the window focus, so
 * a tab left open behind another window stops polling just like a hidden one.
 *
 * @example
 * pageFocused(document.visibilityState, document.hasFocus());
 */
export function pageFocused(visibility: DocumentVisibilityState, hasFocus: boolean) {
  return visibility === "visible" && hasFocus;
}

/**
 * @name watchPageFocus
 * @description Points TanStack Query's focus manager at window focus as well as visibility, so
 * every `refetchInterval` pauses while the window is blurred and focus refetches run on return.
 *
 * @example
 * useEffect(() => watchPageFocus(), []);
 */
export function watchPageFocus() {
  focusManager.setEventListener((setFocused) => {
    function update() {
      setFocused(pageFocused(document.visibilityState, document.hasFocus()));
    }
    window.addEventListener("focus", update);
    window.addEventListener("blur", update);
    document.addEventListener("visibilitychange", update);
    update();
    return () => {
      window.removeEventListener("focus", update);
      window.removeEventListener("blur", update);
      document.removeEventListener("visibilitychange", update);
    };
  });
}
