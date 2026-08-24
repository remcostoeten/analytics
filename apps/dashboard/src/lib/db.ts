import { neon, neonConfig } from "@neondatabase/serverless";

// db.localtest.me resolves to 127.0.0.1 and is the host the local demo DB
// (scripts/demo-db) exposes; route the driver's HTTP calls to the local
// neon-proxy container instead of Neon's cloud endpoint.
if (process.env.DATABASE_URL?.includes("db.localtest.me")) {
	neonConfig.fetchEndpoint = (host) => `http://${host}:4444/sql`;
}

// Dashboard loaders fan out 15+ queries per render; each one is its own HTTP
// request to Neon's proxy, which hands out a limited number of connection
// permits (fewer while the compute is waking). Unthrottled bursts get
// "Failed to acquire permit" 500s and fail the build, so gate concurrency and
// retry that specific transient error at the fetch layer.
const MAX_CONCURRENT_QUERIES = 6;
const PERMIT_RETRIES = 4;

let activeQueries = 0;
const queryQueue: Array<() => void> = [];

function acquireSlot(): Promise<void> {
	if (activeQueries < MAX_CONCURRENT_QUERIES) {
		activeQueries++;
		return Promise.resolve();
	}
	return new Promise((resolve) => queryQueue.push(resolve));
}

function releaseSlot(): void {
	const next = queryQueue.shift();
	if (next) {
		next();
	} else {
		activeQueries--;
	}
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const TRANSIENT_CONNECTION_ERRORS = [
	"Failed to acquire permit",
	"Control plane request failed",
	"Couldn't connect to compute node",
];

async function isTransientConnectionError(response: Response): Promise<boolean> {
	if (response.status !== 500) return false;
	const body = await response.clone().text();
	return TRANSIENT_CONNECTION_ERRORS.some((message) => body.includes(message));
}

async function throttledFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
	await acquireSlot();
	try {
		for (let attempt = 0; ; attempt++) {
			const response = await fetch(input, init);
			if (attempt < PERMIT_RETRIES && (await isTransientConnectionError(response))) {
				await delay(250 * 2 ** attempt);
				continue;
			}
			return response;
		}
	} finally {
		releaseSlot();
	}
}

neonConfig.fetchFunction = throttledFetch;

function createClient() {
	const url = process.env.DATABASE_URL;

	if (!url) {
		throw new Error("DATABASE_URL is not set");
	}

	return neon(url);
}

type SqlClient = ReturnType<typeof createClient>;

let client: SqlClient | null = null;

function getClient(): SqlClient {
	if (!client) {
		client = createClient();
	}

	return client;
}

const sql = new Proxy(function () {} as unknown as SqlClient, {
	apply(_target, thisArg, args) {
		return Reflect.apply(getClient() as never, thisArg, args);
	},
	get(_target, prop, receiver) {
		return Reflect.get(getClient() as object, prop, receiver);
	},
});

export { sql };
