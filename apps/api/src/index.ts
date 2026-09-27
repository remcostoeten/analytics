import { createApp } from "./app";
import { candidatePaths, openCityDatabase } from "./geo";

const database = openCityDatabase(
  candidatePaths(process.env.GEOIP_CITY_PATH ?? null, import.meta.dir, process.cwd()),
);

export default createApp(database);
