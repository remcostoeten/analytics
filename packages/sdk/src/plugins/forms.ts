import { noop } from "@remcostoeten/analytics-shared/noop";

import { definePlugin } from "../core/plugin-host";

/**
 * @name forms
 * @description Sends `form_submit` with the form's id or name and the path it posts to. Nothing
 * from the fields is read.
 *
 * @example
 * createAnalytics({ ...config, plugins: [forms()] });
 */
export function forms() {
  return definePlugin({
    name: "forms",
    setup: (client) => {
      if (typeof document === "undefined") return noop;
      function onSubmit(event: SubmitEvent) {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        client.track("form_submit", {
          form: form.id || form.getAttribute("name") || "",
          action: new URL(form.action || location.href).pathname,
        });
      }
      document.addEventListener("submit", onSubmit, true);
      return () => document.removeEventListener("submit", onSubmit, true);
    },
  });
}
