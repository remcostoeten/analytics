import { describe, test, expect, mock } from "bun:test";
import { setupTestDb } from "../setup";

// Initialize test DB
const { pg } = await setupTestDb();

// Mock the dashboard's db client
mock.module("../../lib/db.ts", () => {
	class SqlQuery {
		constructor(
			public strings: TemplateStringsArray,
			public values: any[],
		) {}

		/* eslint-disable-next-line unicorn/no-thenable */
		async then(resolve: any, reject: any) {
			try {
				const { query, params } = this.flatten();
				const res = await pg.query(query, params);
				return resolve(res.rows);
			} catch (err) {
				return reject(err);
			}
		}

		flatten() {
			let query = this.strings[0];
			const params: any[] = [];

			const process = (val: any) => {
				if (val instanceof SqlQuery) {
					let q = val.strings[0];
					for (let i = 0; i < val.values.length; i++) {
						q += process(val.values[i]) + val.strings[i + 1];
					}
					return q;
				} else {
					params.push(val);
					return `$${params.length}`;
				}
			};

			for (let i = 0; i < this.values.length; i++) {
				query += process(this.values[i]) + this.strings[i + 1];
			}
			return { query, params };
		}
	}

	const sql = (strings: TemplateStringsArray, ...values: any[]) => {
		return new SqlQuery(strings, values);
	};

	return { sql };
});

// Import queries after mocking
const { getPageviewsKPI, getUniqueVisitorsKPI, getSessionsKPI, getTopPages } =
	await import("../../lib/queries");

describe("Dashboard Queries Integration", () => {
	test("getPageviewsKPI returns correct count", async () => {
		await pg.exec("DELETE FROM events");
		await pg.exec(`
            INSERT INTO events (project_id, type, ts, is_localhost) 
            VALUES ('test-project', 'pageview', NOW(), false);
            INSERT INTO events (project_id, type, ts, is_localhost) 
            VALUES ('test-project', 'pageview', NOW(), false);
        `);

		const kpi = await getPageviewsKPI("test-project");
		expect(kpi.value).toBe(2);
	});

	test("getUniqueVisitorsKPI counts unique visitors", async () => {
		await pg.exec("DELETE FROM events");
		await pg.exec(`
            INSERT INTO events (project_id, visitor_id, ts, is_localhost) 
            VALUES ('test-project', 'v1', NOW(), false);
            INSERT INTO events (project_id, visitor_id, ts, is_localhost) 
            VALUES ('test-project', 'v1', NOW(), false);
            INSERT INTO events (project_id, visitor_id, ts, is_localhost) 
            VALUES ('test-project', 'v2', NOW(), false);
        `);

		const kpi = await getUniqueVisitorsKPI("test-project");
		expect(kpi.value).toBe(2);
	});

	test("getSessionsKPI counts unique sessions", async () => {
		await pg.exec("DELETE FROM events");
		await pg.exec(`
            INSERT INTO events (project_id, session_id, ts, is_localhost) 
            VALUES ('test-project', 's1', NOW(), false);
            INSERT INTO events (project_id, session_id, ts, is_localhost) 
            VALUES ('test-project', 's1', NOW(), false);
            INSERT INTO events (project_id, session_id, ts, is_localhost) 
            VALUES ('test-project', 's2', NOW(), false);
        `);

		const kpi = await getSessionsKPI("test-project");
		expect(kpi.value).toBe(2);
	});

	test("getTopPages returns sorted pages", async () => {
		await pg.exec("DELETE FROM events");
		await pg.exec(`
            INSERT INTO events (project_id, path, type, ts, is_localhost) VALUES ('p', '/home', 'pageview', NOW(), false);
            INSERT INTO events (project_id, path, type, ts, is_localhost) VALUES ('p', '/home', 'pageview', NOW(), false);
            INSERT INTO events (project_id, path, type, ts, is_localhost) VALUES ('p', '/about', 'pageview', NOW(), false);
        `);

		const top = await getTopPages("p");
		expect(top).toHaveLength(2);
		expect(top[0].path).toBe("/home");
		expect(top[0].views).toBe(2);
		expect(top[1].path).toBe("/about");
		expect(top[1].views).toBe(1);
	});
});
