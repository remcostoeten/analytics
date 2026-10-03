import { noop } from "@spoar/shared/noop";

import { definePlugin } from "../core/plugin-host";

const downloads =
  /\.(pdf|zip|gz|dmg|exe|msi|pkg|deb|rpm|csv|xlsx?|docx?|pptx?|mp3|mp4|mov|epub|apk)$/i;

/**
 * @name outboundLinks
 * @description Sends `outbound_click` for links to another host and `file_download` for links to
 * a file by extension (pdf, zip, dmg, csv, docx and similar), with the URL without its query.
 *
 * @example
 * createAnalytics({ ...config, plugins: [outboundLinks()] });
 */
export function outboundLinks() {
  return definePlugin({
    name: "outbound-links",
    setup: (client) => {
      if (typeof document === "undefined") return noop;
      function onClick(event: MouseEvent) {
        const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
        if (!(link instanceof HTMLAnchorElement) || !/^https?:$/.test(link.protocol)) return;
        const url = link.origin + link.pathname;
        const file = downloads.exec(link.pathname);
        if (file) client.track("file_download", { url, extension: (file[1] ?? "").toLowerCase() });
        else if (link.host !== location.host)
          client.track("outbound_click", { url, host: link.host });
      }
      document.addEventListener("click", onClick, true);
      return () => document.removeEventListener("click", onClick, true);
    },
  });
}
