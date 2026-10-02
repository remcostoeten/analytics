import type { Geo, GeoLocale } from "@remcostoeten/analytics-contract";
import type { CountryCode, GeonameID, Nullable } from "@remcostoeten/analytics-shared/semantic";

import type { Network } from "../draft";

export type Location = Geo & {
  continent: Nullable<string>;
  cityId: Nullable<GeonameID>;
  regionId: Nullable<GeonameID>;
};

export type PlaceKind = "country" | "region" | "city";

export type PlaceNames = { [locale in GeoLocale]?: string };

export type GeoPlace = {
  id: GeonameID;
  kind: PlaceKind;
  country: CountryCode;
  names: PlaceNames;
};

export type GeoRecord = {
  geo: Location;
  network: Network;
  places: GeoPlace[];
};

export type GeoLookup = {
  lookup: (ip: string) => GeoRecord;
};
