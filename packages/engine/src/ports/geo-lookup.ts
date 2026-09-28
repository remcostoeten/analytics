import type { Geo } from "@remcostoeten/analytics-contract";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

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
