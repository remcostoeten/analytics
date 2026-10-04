import type { WidgetSession } from "@spoar/contract";

import type { Bootstrap } from "./types";

/**
 * @name toBootstrap
 * @description Turns the `GET /v2/widget/session` answer into the panel's bootstrap.
 *
 * @example
 * toBootstrap(session).project.name; // "Noorderlicht Lease"
 */
export function toBootstrap(session: WidgetSession): Bootstrap {
  return {
    token: session.token,
    expiresAt: session.expiresAt,
    project: { id: session.project, name: session.projectName, release: session.release },
    user: { name: session.user.name },
    publicKey: session.publicKey,
    features: session.features,
  };
}
