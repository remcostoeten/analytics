const hostTag = "spoar-debugtools-notice";
const visibleMs = 8000;

const style =
  "position:fixed;bottom:16px;left:16px;z-index:2147483002;display:flex;align-items:center;gap:10px;max-width:min(360px,calc(100vw - 32px));padding:8px 8px 8px 12px;border:1px solid #333;border-radius:8px;background:#0a0a0a;color:#e5e5e5;font:12px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px -12px rgba(0,0,0,.6)";
const buttonStyle =
  "flex:none;border:0;border-radius:4px;background:transparent;color:#a3a3a3;font:inherit;cursor:pointer;padding:2px 6px";

/**
 * @name showConsoleNotice
 * @description Shows a short dismissible message at the bottom left of the page, for a console
 * start that an admin asked for and the API refused. It replaces an earlier notice, goes away by
 * itself after eight seconds and is announced to screen readers. Returns a function that removes it.
 *
 * @example
 * showConsoleNotice("The debug console is off for site");
 */
export function showConsoleNotice(message: string): () => void {
  document.querySelector(hostTag)?.remove();
  const host = document.createElement(hostTag);
  host.setAttribute("role", "status");
  host.setAttribute("style", style);
  const text = document.createElement("span");
  text.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("style", buttonStyle);
  close.setAttribute("aria-label", "Dismiss");
  close.textContent = "Dismiss";
  host.append(text, close);
  const timer = setTimeout(remove, visibleMs);
  function remove() {
    clearTimeout(timer);
    host.remove();
  }
  close.addEventListener("click", remove);
  document.body.append(host);
  return remove;
}
