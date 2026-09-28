import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Reader } from "mmdb-lib";
import type { AsnResponse, CityResponse } from "mmdb-lib";

import type { GeoLookup } from "../ports";

/**
 * @name maxmindGeo
 * @description A `GeoLookup` over MaxMind City and ASN databases. It takes the file contents, not
 * paths, so the engine never touches the file system; the host reads the files.
 *
 * @example
 * const geo = maxmindGeo(readFileSync("GeoLite2-City.mmdb"), readFileSync("GeoLite2-ASN.mmdb"));
 * geo.lookup("81.2.69.160").geo.country; // "GB"
 */
export function maxmindGeo(city: Buffer, asn: Nullable<Buffer>): GeoLookup {
  const cityReader = new Reader<CityResponse>(city);
  const asnReader = asn ? new Reader<AsnResponse>(asn) : null;
  return {
    lookup: (ip) => {
      const record = cityReader.get(ip);
      const network = asnReader?.get(ip);
      return {
        geo: {
          country: record?.country?.iso_code ?? null,
          region: record?.subdivisions?.[0]?.names?.en ?? null,
          city: record?.city?.names?.en ?? null,
          postalCode: record?.postal?.code ?? null,
          timezone: record?.location?.time_zone ?? null,
          latitude: record?.location?.latitude ?? null,
          longitude: record?.location?.longitude ?? null,
        },
        network: {
          asn: network?.autonomous_system_number ?? null,
          asOrg: network?.autonomous_system_organization ?? null,
        },
      };
    },
  };
}
