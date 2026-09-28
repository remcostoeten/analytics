import type { Dimension } from "../define";
import { botReasonDimension } from "./bot-reason";
import { browserDimension } from "./browser";
import { browserVersionDimension } from "./browser-version";
import { channelDimension } from "./channel";
import { cityDimension } from "./city";
import { connectionDimension } from "./connection";
import { continentDimension } from "./continent";
import { countryDimension } from "./country";
import { deviceDimension } from "./device";
import { entryPageDimension } from "./entry-page";
import { eventDimension } from "./event";
import { exitPageDimension } from "./exit-page";
import { hostDimension } from "./host";
import { languageDimension } from "./language";
import { osDimension } from "./os";
import { osVersionDimension } from "./os-version";
import { pageDimension } from "./page";
import { projectDimension } from "./project";
import { referrerDimension } from "./referrer";
import { referrerDomainDimension } from "./referrer-domain";
import { regionDimension } from "./region";
import { releaseDimension } from "./release";
import { routeDimension } from "./route";
import { screenDimension } from "./screen";
import { timezoneDimension } from "./timezone";
import { utmCampaignDimension } from "./utm-campaign";
import { utmContentDimension } from "./utm-content";
import { utmMediumDimension } from "./utm-medium";
import { utmSourceDimension } from "./utm-source";
import { utmTermDimension } from "./utm-term";
import { viewportDimension } from "./viewport";
import { visitorTypeDimension } from "./visitor-type";
import { propDimension, traitDimension } from "./keyed";

export const defaultDimensions: Dimension[] = [
  hostDimension,
  pageDimension,
  routeDimension,
  entryPageDimension,
  exitPageDimension,
  referrerDimension,
  referrerDomainDimension,
  channelDimension,
  utmSourceDimension,
  utmMediumDimension,
  utmCampaignDimension,
  utmTermDimension,
  utmContentDimension,
  countryDimension,
  regionDimension,
  cityDimension,
  continentDimension,
  timezoneDimension,
  deviceDimension,
  browserDimension,
  browserVersionDimension,
  osDimension,
  osVersionDimension,
  screenDimension,
  viewportDimension,
  languageDimension,
  connectionDimension,
  visitorTypeDimension,
  eventDimension,
  botReasonDimension,
  releaseDimension,
  projectDimension,
];

const byName = new Map(defaultDimensions.map((dimension) => [dimension.name, dimension]));

/**
 * @name findDimension
 * @description Looks a dimension up by the name a route received: a registered one, `prop:<key>`
 * or `trait:<key>`. Returns null for anything else.
 *
 * @example
 * findDimension("prop:plan");
 */
export function findDimension(name: string): Dimension | null {
  if (name.startsWith("prop:")) return propDimension(name.slice(5));
  if (name.startsWith("trait:")) return traitDimension(name.slice(6));
  return byName.get(name) ?? null;
}

export { propDimension, traitDimension };
