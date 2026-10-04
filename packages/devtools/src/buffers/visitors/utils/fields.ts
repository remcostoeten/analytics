import type { OnlineVisitor } from "../../../client/types";
import type { Fields } from "../../../filter/parse";

export const visitorFields: Fields<OnlineVisitor> = {
  id: (row) => row.id,
  session: (row) => row.session,
  geo: (row) => row.country,
  country: (row) => row.country,
  city: (row) => row.city,
  device: (row) => row.device,
  bot: (row) => row.botScore,
  path: (row) => row.path,
  ref: (row) => row.referrer ?? "direct",
  pages: (row) => row.pages,
  identified: (row) => String(row.identified),
  browser: (row) => row.client.browser,
  os: (row) => row.client.os,
};

export function visitorText(row: OnlineVisitor) {
  return [row.id, row.path, row.referrer, row.city, row.country, row.device, row.client.browser]
    .filter(Boolean)
    .join(" ");
}

export function place(row: OnlineVisitor) {
  return [row.city, row.country].filter(Boolean).join(", ") || "unknown";
}

export function clientLine(row: OnlineVisitor) {
  const { os, browser } = row.client;
  return [os, browser].filter(Boolean).join(" · ") || "unknown";
}

export const visitorColumns = "92px 112px minmax(0,1fr) minmax(0,1fr) 120px 72px 56px 16px";

export const visitorHeader = ["seen", "visitor", "page", "referrer", "geo", "device", "bot", ""];
