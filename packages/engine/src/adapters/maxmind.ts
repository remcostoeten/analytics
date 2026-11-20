import type { Nullable } from "@spoar/shared/semantic";
import { Reader } from "mmdb-lib";
import type { AsnResponse, CityResponse } from "mmdb-lib";

import type { Network } from "../draft";
import type { GeoLookup, Location } from "../ports";

type Lookup<Record> = (ip: string) => Nullable<Record>;

const noNetwork: Network = { asn: null, asOrg: null };

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

function rememberLast<Value>(find: (ip: string) => Value): (ip: string) => Value {
  const last: { ip: Nullable<string>; value: Nullable<Value> } = { ip: null, value: null };
  return (ip) => {
    if (last.ip === ip && last.value !== null) return last.value;
    const value = find(ip);
    last.ip = ip;
    last.value = value;
    return value;
  };
}

function toLocation(city: Nullable<CityResponse>): Location {
  const subdivision = city?.subdivisions?.[0];
  return {
    country: city?.country?.iso_code ?? null,
    region: subdivision?.iso_code ?? subdivision?.names?.en ?? null,
    city: city?.city?.names?.en ?? null,
    postalCode: city?.postal?.code ?? null,
    timezone: city?.location?.time_zone ?? null,
    latitude: city?.location?.latitude ?? null,
    longitude: city?.location?.longitude ?? null,
    continent: city?.continent?.code ?? null,
  };
}

function toNetwork(asn: Nullable<AsnResponse>): Network {
  return {
    asn: asn?.autonomous_system_number ?? null,
    asOrg: asn?.autonomous_system_organization ?? null,
  };
}

/**
 * @name maxmindLocation
 * @description The location lookup over a MaxMind City database. A malformed address gives an
 * empty location, and the last address is remembered, because every event of a batch shares one.
 *
 * @example
 * maxmindLocation(readFileSync("GeoLite2-City.mmdb"))("81.2.69.160").country; // "GB"
 */
export function maxmindLocation(city: Buffer): GeoLookup["location"] {
  const reader = new Reader<CityResponse>(city);
  const find = safely((ip) => reader.get(ip));
  return rememberLast((ip) => toLocation(find(ip)));
}

/**
 * @name maxmindNetwork
 * @description The network lookup over a MaxMind ASN database, with the same handling of malformed
 * and repeated addresses as `maxmindLocation`.
 *
 * @example
 * maxmindNetwork(readFileSync("GeoLite2-ASN.mmdb"))("81.2.69.160").asn;
 */
export function maxmindNetwork(asn: Buffer): GeoLookup["network"] {
  const reader = new Reader<AsnResponse>(asn);
  const find = safely((ip) => reader.get(ip));
  return rememberLast((ip) => toNetwork(find(ip)));
}

/**
 * @name maxmindGeo
 * @description A `GeoLookup` over MaxMind City and ASN databases. It takes the file contents, not
 * paths, so the engine never touches the file system; the host reads the files. Without an ASN
 * database every network is empty.
 *
 * @example
 * const geo = maxmindGeo(readFileSync("GeoLite2-City.mmdb"), readFileSync("GeoLite2-ASN.mmdb"));
 * geo.location("81.2.69.160").country; // "GB"
 */
export function maxmindGeo(city: Buffer, asn: Nullable<Buffer>): GeoLookup {
  return {
    location: maxmindLocation(city),
    network: asn ? maxmindNetwork(asn) : () => noNetwork,
  };
}
