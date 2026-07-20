import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { events, visitors, sessions } from "./schema";

function createDb(databaseUrl: string) {
	const sql = neon(databaseUrl);
	return drizzle(sql, { schema: { events, visitors, sessions } });
}

type DbClient = ReturnType<typeof createDb>;

function createFallbackDb(): DbClient {
	const chain: Record<string, unknown> = {};

	function chainMethod() {
		return chain;
	}

	Object.assign(chain, {
		from: chainMethod,
		where: chainMethod,
		values: chainMethod,
		set: chainMethod,
		groupBy: chainMethod,
		orderBy: chainMethod,
		limit: chainMethod,
		onConflictDoUpdate: chainMethod,
		onConflictDoNothing: chainMethod,
		returning() {
			return Promise.resolve([]);
		},
		then(resolve: (value: unknown[]) => unknown) {
			return resolve([]);
		},
	});

	return {
		select: chainMethod,
		insert: chainMethod,
		update: chainMethod,
		delete: chainMethod,
		async execute() {
			return { rows: [], rowCount: 0 };
		},
	} as unknown as DbClient;
}

function getDbClient(): DbClient {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		console.error("[DB] DATABASE_URL not set — ingestion running without persistence");
		return createFallbackDb();
	}

	return createDb(databaseUrl);
}

export const db = getDbClient();
