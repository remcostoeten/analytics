import { buildApi } from "./build";
import { candidatePaths, openGeo } from "./geo";

const where = { explicit: null, sourceDirectory: import.meta.dir, cwd: process.cwd() };

export default buildApi({
  geo: openGeo(
    candidatePaths("GeoLite2-City.mmdb", {
      ...where,
      explicit: process.env.GEOIP_CITY_PATH ?? null,
    }),
    candidatePaths("GeoLite2-ASN.mmdb", { ...where, explicit: process.env.GEOIP_ASN_PATH ?? null }),
  ),
  liveSocket: true,
  commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
});
