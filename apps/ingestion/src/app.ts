import { Hono } from "hono";
import { type MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { handleIngest } from "./handlers/ingest.js";
import { handleMetrics } from "./handlers/metrics.js";
import { handleAdminCleanup, handleAdminStats } from "./handlers/admin.js";
import { execSync } from "child_process";

const app = new Hono();

let requestCount = 0;

const listeners = new Set<(data: string) => void>();

function incrementRequestCount(req: Request) {
	requestCount++;

	const payload = JSON.stringify({
		type: "request",
		count: requestCount,
		method: req.method,
		path: new URL(req.url).pathname,
		timestamp: Date.now(),
	});

	for (const send of listeners) {
		send(payload);
	}
}

function requestCounter() {
	return async function (c, next) {
		incrementRequestCount(c.req.raw);
		await next();
	} satisfies MiddlewareHandler;
}

function getCorsOrigin(origin: string | undefined): string | undefined {
	return origin;
}

app.use(
	"*",
	cors({
		origin: getCorsOrigin,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "X-Requested-With"],
		credentials: true,
	}),
);

app.use("*", requestCounter());

let commitHash = "unknown";
let commitMsg = "development setup";
let commitDate = new Date().toISOString().split("T")[0];

try {
	commitHash =
		process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
		execSync("git rev-parse --short HEAD", { stdio: "pipe" }).toString().trim();
	commitMsg =
		process.env.VERCEL_GIT_COMMIT_MESSAGE ||
		execSync("git log -1 --pretty=%B", { stdio: "pipe" }).toString().trim().split("\n")[0];
	commitDate = execSync("git log -1 --format=%cd --date=short", { stdio: "pipe" })
		.toString()
		.trim();
} catch {
	// Fallback when git is unavailable
}

app.get("/", (c) => {
	const repoLink = `https://github.com/remcostoeten/analytics`;
	const commitLink = `${repoLink}/commit/${commitHash}`;
	const npmLink = `https://www.npmjs.com/package/@remcostoeten/analytics`;

	return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>remco-analytics-ingestion</title>

<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
	font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI;
	background: #0a0a0a;
	color: #e5e5e5;
	padding: 32px;
	max-width: 900px;
	margin: 0 auto;
}

h1 { font-size: 20px; font-weight: 600; }

.meta {
	color: #777;
	font-size: 12px;
	margin: 8px 0 24px;
	display: flex;
	gap: 16px;
}

.block {
	border-top: 1px solid #1a1a1a;
}

.row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 0;
	border-bottom: 1px solid #1a1a1a;
}

.left {
	display: flex;
	align-items: center;
	gap: 12px;
}

.method {
	font-family: monospace;
	font-size: 11px;
	padding: 3px 6px;
	border: 1px solid #2a2a2a;
	color: #aaa;
	width: 54px;
	text-align: center;
}

.method.post { color: #7aa2f7; }
.method.get { color: #9ece6a; }

.path {
	font-family: monospace;
	color: #fff;
}

.desc {
	color: #777;
	font-size: 13px;
}

footer {
	margin-top: 32px;
	padding-top: 24px;
	border-top: 1px solid #1a1a1a;
	color: #555;
	font-size: 13px;
	line-height: 1.6;
}

.small {
	color: #777;
}

a {
    color: #7aa2f7;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

.metadata-grid {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 4px 16px;
    margin-top: 12px;
}

.lbl { color: #888; }
.val { color: #ccc; }
</style>
</head>

<body>

<h1>remco-analytics-ingestion</h1>

<div class="meta">
	<span>Requests: <strong style="color:#fff" id="req">0</strong></span>
    <span>Live: <strong style="color:#9ece6a">Online</strong></span>
</div>

<div class="block">

	<div class="row">
		<div class="left">
			<div class="method get">GET</div>
			<div class="path">/</div>
		</div>
		<div class="desc">API overview</div>
	</div>

	<div class="row">
		<div class="left">
			<div class="method get">GET</div>
			<div class="path">/health</div>
		</div>
		<div class="desc">Health check</div>
	</div>

	<div class="row">
		<div class="left">
			<div class="method post">POST</div>
			<div class="path">/e</div>
		</div>
		<div class="desc">Ingest analytics events (short alias)</div>
	</div>

	<div class="row">
		<div class="left">
			<div class="method post">POST</div>
			<div class="path">/ingest</div>
		</div>
		<div class="desc">Ingest analytics events</div>
	</div>

	<div class="row">
		<div class="left">
			<div class="method get">GET</div>
			<div class="path">/metrics</div>
		</div>
		<div class="desc">Get metrics</div>
	</div>

	<div class="row">
		<div class="left">
			<div class="method get">GET</div>
			<div class="path">/admin/stats</div>
		</div>
		<div class="desc">Admin statistics</div>
	</div>

	<div class="row">
		<div class="left">
			<div class="method post">POST</div>
			<div class="path">/admin/cleanup</div>
		</div>
		<div class="desc">Trigger cleanup</div>
	</div>

	<div class="row">
		<div class="left">
			<div class="method get">GET</div>
			<div class="path">/events</div>
		</div>
		<div class="desc">Live SSE stream</div>
	</div>

</div>

<footer>
    <strong>System State</strong>
    <div class="metadata-grid">
        <span class="lbl">NPM Version</span>
        <span class="val"><a href="${npmLink}" target="_blank" rel="noopener">v<span id="npm-ver">fetching...</span></a></span>
        
        <span class="lbl">Last Commit</span>
        <span class="val"><a href="${commitLink}" target="_blank" rel="noopener">${commitHash}</a></span>
        
        <span class="lbl">Commit Message</span>
        <span class="val">"${commitMsg}"</span>
        
        <span class="lbl">Commit Date</span>
        <span class="val">${commitDate}</span>
        
        <span class="lbl">Repository</span>
        <span class="val"><a href="${repoLink}" target="_blank" rel="noopener">${repoLink.replace("https://", "")}</a></span>
    </div>
</footer>

<script>
const es = new EventSource("/events");

es.onmessage = (e) => {
	const data = JSON.parse(e.data);
	if (data.count !== undefined) {
		document.getElementById("req").textContent = data.count;
	}
};

fetch("https://registry.npmjs.org/@remcostoeten/analytics/latest")
  .then(res => res.json())
  .then(data => {
     document.getElementById("npm-ver").textContent = data.version;
  })
  .catch(() => {
     document.getElementById("npm-ver").textContent = "unavailable";
  });
</script>

</body>
</html>`);
});

app.get("/health", (c) => {
	return c.json({
		ok: true,
		timestamp: new Date().toISOString(),
		requests: requestCount,
	});
});

app.get("/metrics", handleMetrics);

app.post("/e", handleIngest);
app.post("/ingest", handleIngest);

app.get("/admin/stats", handleAdminStats);
app.post("/admin/cleanup", handleAdminCleanup);

app.get("/events", (c) => {
	return new Response(
		new ReadableStream({
			start(controller) {
				const encoder = new TextEncoder();

				function send(data: string) {
					controller.enqueue(encoder.encode(`data: ${data}\n\n`));
				}

				listeners.add(send);

				send(
					JSON.stringify({
						type: "connected",
						count: requestCount,
					}),
				);

				c.req.raw.signal.addEventListener("abort", () => {
					listeners.delete(send);
					controller.close();
				});
			},
		}),
		{
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		},
	);
});

export default app;
export { app };
