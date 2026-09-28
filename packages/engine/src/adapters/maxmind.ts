import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Reader } from "mmdb-lib";
import type { AsnResponse, CityResponse } from "mmdb-lib";

import type { GeoLookup, GeoRecord } from "../ports";

type Lookup<Record> = (ip: string) => Nullable<Record>;

function safely<Record>(lookup: Lookup<Record>): Lookup<Record> {
  return (ip) => {
    try {
      return lookup(ip);
    } catch {
      // mmdb-lib throws on a malformed address, which a forwarded header can carry.
      return null;
    }
  };
}

function toRecord(city: Nullable<CityResponse>, asn: Nullable<AsnResponse>): GeoRecord {
  const subdivision = city?.subdivisions?.[0];
  return {
    geo: {
      country: city?.country?.iso_code ?? null,
      region: subdivision?.iso_code ?? subdivision?.names?.en ?? null,
      city: city?.city?.names?.en ?? null,
      postalCode: city?.postal?.code ?? null,
      timezone: city?.location?.time_zone ?? null,
      latitude: city?.location?.latitude ?? null,
      longitude: city?.location?.longitude ?? null,
      continent: city?.continent?.code ?? null,
    },
    network: {
      asn: asn?.autonomous_system_number ?? null,
      asOrg: asn?.autonomous_system_organization ?? null,
    },
  };
}

/**
 * @name maxmindGeo
 * @description A `GeoLookup` over MaxMind City and ASN databases. It takes the file contents, not
 * paths, so the engine never touches the file system; the host reads the files. A malformed
 * address gives an empty record.
 *
 * @example
 * const geo = maxmindGeo(readFileSync("GeoLite2-City.mmdb"), readFileSync("GeoLite2-ASN.mmdb"));
 * geo.lookup("81.2.69.160").geo.country; // "GB"
 */
export function maxmindGeo(city: Buffer, asn: Nullable<Buffer>): GeoLookup {
  const cityReader = new Reader<CityResponse>(city);
  const asnReader = asn ? new Reader<AsnResponse>(asn) : null;
  const findCity = safely((ip) => cityReader.get(ip));
  const findAsn = safely((ip) => asnReader?.get(ip) ?? null);
  return { lookup: (ip) => toRecord(findCity(ip), findAsn(ip)) };
}
