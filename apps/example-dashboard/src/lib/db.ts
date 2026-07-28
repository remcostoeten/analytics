import { neon, neonConfig } from "@neondatabase/serverless";

// db.localtest.me resolves to 127.0.0.1 and is the host the local demo DB
// (scripts/demo-db) exposes; route the driver's HTTP calls to the local
// neon-proxy container instead of Neon's cloud endpoint.
if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
	neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

const sql = neon(process.env.DATABASE_URL!);

export { sql };
