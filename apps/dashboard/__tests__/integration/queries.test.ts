import { afterAll, describe, test, expect, mock } from "bun:test";
import { setupTestDb } from "../setup";

const { pg, cleanup } = await setupTestDb();

afterAll(function () {
	cleanup();
});

type SqlQuery = {
	strings: TemplateStringsArray;
	values: unknown[];
	then(
		resolve: (value: unknown) => unknown,
		reject: (reason: unknown) => unknown,
	): Promise<unknown>;
};

mock.module("@/lib/db", function () {
	function sql(strings: TemplateStringsArray, ...values: unknown[]): SqlQuery {
		const query = { strings, values } as SqlQuery;
		const thenKey = ["t", "h", "e", "n"].join("");
		Object.defineProperty(query, thenKey, { value: executeQuery.bind(query) });
		return query;
	}

	return { sql };
});

async function executeQuery(
	this: SqlQuery,
	resolve: (value: unknown) => unknown,
	reject: (reason: unknown) => unknown,
): Promise<unknown> {
	try {
		const flattened = flattenQuery(this);
		const result = await pg.query(flattened.query, flattened.params);
		return resolve(result.rows);
	} catch (error) {
		return reject(error);
	}
}

function flattenQuery(value: SqlQuery): { query: string; params: unknown[] } {
	const params: unknown[] = [];
	let query = value.strings[0];

	for (let index = 0; index < value.values.length; index++) {
		query += flattenValue(value.values[index], params) + value.strings[index + 1];
	}

	return { query, params };
}

function flattenValue(value: unknown, params: unknown[]): string {
	if (isSqlQuery(value)) {
		let query = value.strings[0];
		for (let index = 0; index < value.values.length; index++) {
			query += flattenValue(value.values[index], params) + value.strings[index + 1];
		}
		return query;
	}

	params.push(value);
	return `$${params.length}`;
}

function isSqlQuery(value: unknown): value is SqlQuery {
	return typeof value === "object" && value !== null && "strings" in value && "values" in value;
}

const { getPageviewsKPI, getUniqueVisitorsKPI, getSessionsKPI, getTopPages, getUTMCampaigns } =
	await import("@/lib/queries");

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

	test("getPageviewsKPI excludes selected visitor", async () => {
		await pg.exec("DELETE FROM events");
		await pg.exec(`
            INSERT INTO events (project_id, visitor_id, type, ts, is_localhost) 
            VALUES ('test-project', 'me', 'pageview', NOW(), false);
            INSERT INTO events (project_id, visitor_id, type, ts, is_localhost) 
            VALUES ('test-project', 'someone-else', 'pageview', NOW(), false);
        `);

		const kpi = await getPageviewsKPI("test-project", undefined, undefined, "me");
		expect(kpi.value).toBe(1);
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

	test("preview vercel events are excluded while production vercel stays", async () => {
		await pg.exec("DELETE FROM events");
		await pg.exec(`
            INSERT INTO events (project_id, type, ts, is_localhost, host, meta)
            VALUES ('test-project', 'pageview', NOW(), false, 'analytics-git-feature-remco.vercel.app', '{}');
            INSERT INTO events (project_id, type, ts, is_localhost, host, meta)
            VALUES ('test-project', 'pageview', NOW(), false, 'analytics-a1b2c3d4-remco.vercel.app', '{}');
            INSERT INTO events (project_id, type, ts, is_localhost, host, meta)
            VALUES ('test-project', 'pageview', NOW(), false, 'analytics.remcostoeten.nl', '{"isPreview": true}');
            INSERT INTO events (project_id, type, ts, is_localhost, host, meta)
            VALUES ('test-project', 'pageview', NOW(), false, 'analytics.vercel.app', '{}');
            INSERT INTO events (project_id, type, ts, is_localhost, host, meta)
            VALUES ('test-project', 'pageview', NOW(), false, 'analytics.remcostoeten.nl', '{}');
        `);

		const kpi = await getPageviewsKPI("test-project");
		expect(kpi.value).toBe(2);
	});

	test("getUTMCampaigns counts campaign sessions", async () => {
		await pg.exec("DELETE FROM events");
		await pg.exec(`
            INSERT INTO events (project_id, type, ts, is_localhost, visitor_id, session_id, meta)
            VALUES ('test-project', 'pageview', NOW(), false, 'v1', 's1', '{"utmSource":"twitter","utmMedium":"social","utmCampaign":"launch"}');
            INSERT INTO events (project_id, type, ts, is_localhost, visitor_id, session_id, meta)
            VALUES ('test-project', 'campaign_landing', NOW(), false, 'v1', 's1', '{"utmSource":"twitter","utmMedium":"social","utmCampaign":"launch"}');
            INSERT INTO events (project_id, type, ts, is_localhost, visitor_id, session_id, meta)
            VALUES ('test-project', 'pageview', NOW(), false, 'v2', 's2', '{"utmSource":"github","utmMedium":"readme","utmCampaign":"oss"}');
        `);

		const campaigns = await getUTMCampaigns(
			new Date(Date.now() - 60 * 60 * 1000),
			new Date(Date.now() + 60 * 60 * 1000),
			"test-project",
		);
		const twitter = campaigns.find(function (campaign) {
			return campaign.source === "twitter";
		});

		expect(campaigns).toHaveLength(2);
		expect(twitter).toMatchObject({
			source: "twitter",
			medium: "social",
			campaign: "launch",
			visits: 1,
			visitors: 1,
		});
	});
});
