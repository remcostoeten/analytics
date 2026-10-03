import type { Geo } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";

import type { Network } from "../draft";

export type Location = Geo & {
  continent: Nullable<string>;
};

export type GeoRecord = {
  geo: Location;
  network: Network;
};

export type GeoLookup = {
  lookup: (ip: string) => GeoRecord;
};
