import type { Enricher } from "../define";
import { forwardedProxy } from "./forwarded-proxy";
import { geo } from "./geo";
import { ipHash } from "./ip-hash";
import { network } from "./network";
import { userAgent } from "./user-agent";
import { utm } from "./utm";

export { forwardedHeaders } from "./forwarded-proxy";

export const defaultEnrichers: Enricher[] = [forwardedProxy, ipHash, geo, network, userAgent, utm];
