import type { Geo } from "@remcostoeten/analytics-contract";

import type { Network } from "../draft";

export type GeoRecord = {
  geo: Geo;
  network: Network;
};

export type GeoLookup = {
  lookup: (ip: string) => GeoRecord;
};
