import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { events, visitors } from "./schema";

function createDb(databaseUrl: string) {
	const sql = neon(databaseUrl);
	return drizzle(sql, { schema: { events, visitors } });
}

type DbClient = ReturnType<typeof createDb>;

function createFallbackDb(): DbClient {
	return {
		select() {
			return {
				from() {
					return [];
				},
			};
		},
		insert() {
			return {
				values() {
					return {
						returning() {
							return [];
						},
					};
				},
			};
		},
		async execute() {
			return { rows: [] };
		},
	} as unknown as DbClient;
}

function getDbClient(): DbClient {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		return createFallbackDb();
	}

	return createDb(databaseUrl);
}

export const db = getDbClient();
