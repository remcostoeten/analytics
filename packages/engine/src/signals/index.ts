import type { Signal } from "../define";
import { asnDatacenter } from "./asn-datacenter";
import { clientHeadless } from "./client-headless";
import { clientNoInput } from "./client-no-input";
import { clientWebdriver } from "./client-webdriver";
import { edgeVerifiedBot } from "./edge-verified-bot";
import { headersInconsistent } from "./headers-inconsistent";
import { headersMissing } from "./headers-missing";
import { ipFanout } from "./ip-fanout";
import { sessionVelocity } from "./session-velocity";
import { uaAutomation } from "./ua-automation";
import { uaCrawler } from "./ua-crawler";

export { ipFanout } from "./ip-fanout";
export { sessionVelocity } from "./session-velocity";

export const defaultSignals: Signal[] = [
  uaCrawler,
  uaAutomation,
  edgeVerifiedBot,
  asnDatacenter,
  headersInconsistent,
  headersMissing,
  clientWebdriver,
  clientHeadless,
  clientNoInput,
  sessionVelocity,
  ipFanout,
];
