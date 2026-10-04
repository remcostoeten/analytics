import { ok } from "@spoar/shared/result";

import { defineStage } from "../define";
import { isLocalhost, isPreview } from "../utilities/hosts";

/**
 * @name flagsStage
 * @description Marks local development, preview deployments and internal traffic. An event is
 * internal when it comes from localhost or carries a signed-in admin session; a visitor marked
 * internal earlier makes it internal when the sessions stage upserts the visitor.
 *
 * @example
 * createEngine(ports, { ...registry, stages: [enrichStage, botScoreStage, flagsStage] }, settings);
 */
export const flagsStage = defineStage({
  name: "flags",
  rescores: false,
  run: (draft) => {
    const localhost = isLocalhost(draft.host);
    return ok({
      ...draft,
      flags: {
        localhost,
        preview: isPreview(draft.host),
        internal: localhost || draft.request.adminSession,
      },
    });
  },
});
