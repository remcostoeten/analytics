import { type ScaffoldFile, type ScaffoldOptions } from "./types";

function webLayout(projectId: string): string {
	return `import { Analytics } from "@remcostoeten/analytics";

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body>
				{children}
				<Analytics projectId="${projectId}" />
			</body>
		</html>
	);
}
`;
}

function webPage(): string {
	return `export default function Home() {
	return (
		<main>
			<h1>Analytics wired</h1>
			<p>Pageviews track automatically via the Analytics component in layout.tsx.</p>
		</main>
	);
}
`;
}

function webEnvExample(ingestUrl: string): string {
	return `# Base URL of your ingestion service (no path suffix)
NEXT_PUBLIC_ANALYTICS_URL=${ingestUrl}
`;
}

function webPackageJson(): string {
	return JSON.stringify(
		{
			name: "web",
			private: true,
			scripts: {
				dev: "next dev",
				build: "next build",
				start: "next start",
			},
			dependencies: {
				"@remcostoeten/analytics": "^1.4.0",
				next: "^15.0.0",
				react: "^19.0.0",
				"react-dom": "^19.0.0",
			},
			devDependencies: {
				"@types/node": "^20.0.0",
				"@types/react": "^19.0.0",
				typescript: "^5.6.0",
			},
		},
		null,
		"\t",
	);
}

function webTsConfig(): string {
	return JSON.stringify(
		{
			compilerOptions: {
				target: "ES2022",
				lib: ["dom", "dom.iterable", "esnext"],
				allowJs: true,
				skipLibCheck: true,
				strict: true,
				noEmit: true,
				module: "esnext",
				moduleResolution: "bundler",
				isolatedModules: true,
				jsx: "preserve",
				incremental: true,
				plugins: [{ name: "next" }],
				paths: { "@/*": ["./*"] },
			},
			include: ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
			exclude: ["node_modules"],
		},
		null,
		"\t",
	);
}

function apiPackageJson(): string {
	return JSON.stringify(
		{
			name: "analytics-api",
			private: true,
			type: "module",
			dependencies: {
				"@remcostoeten/ingestion": "^0.1.0",
				"@neondatabase/serverless": "^0.10.0",
				"drizzle-orm": "^0.36.0",
				hono: "^4.6.0",
				"ua-parser-js": "^2.0.0",
				zod: "^3.22.0",
			},
			devDependencies: {
				"drizzle-kit": "^0.31.0",
				typescript: "^5.6.0",
			},
		},
		null,
		"\t",
	);
}

function apiEnvExample(): string {
	return `DATABASE_URL=postgres://user:password@host/db
IP_HASH_SECRET=replace-with-at-least-32-characters
`;
}

function apiHandler(): string {
	return `export { default } from "@remcostoeten/ingestion/vercel";
`;
}

function apiVercelJson(): string {
	return JSON.stringify(
		{
			rewrites: [{ source: "/(.*)", destination: "/api" }],
		},
		null,
		"\t",
	);
}

function ingestRoute(): string {
	return `import { app } from "@remcostoeten/ingestion";

async function handle(request: Request) {
	return app.fetch(request);
}

export const GET = handle;
export const POST = handle;
`;
}

function colocatedPackageJson(projectName: string): string {
	return JSON.stringify(
		{
			name: projectName,
			private: true,
			scripts: {
				dev: "next dev",
				build: "next build",
				start: "next start",
			},
			dependencies: {
				"@remcostoeten/analytics": "^1.4.0",
				"@remcostoeten/ingestion": "^0.1.0",
				"@neondatabase/serverless": "^0.10.0",
				"drizzle-orm": "^0.36.0",
				hono: "^4.6.0",
				next: "^15.0.0",
				react: "^19.0.0",
				"react-dom": "^19.0.0",
				"ua-parser-js": "^2.0.0",
				zod: "^3.22.0",
			},
			devDependencies: {
				"@types/node": "^20.0.0",
				"@types/react": "^19.0.0",
				"drizzle-kit": "^0.31.0",
				typescript: "^5.6.0",
			},
		},
		null,
		"\t",
	);
}

function colocatedEnvExample(): string {
	return `NEXT_PUBLIC_ANALYTICS_URL=http://localhost:3000
DATABASE_URL=postgres://user:password@host/db
IP_HASH_SECRET=replace-with-at-least-32-characters
`;
}

function readmeSeparate(projectName: string, projectId: string): string {
	return `# ${projectName}

Tier 1 setup: SDK in \`apps/web\`, ingestion in \`apps/analytics-api\` (separate deploy).

## 1. Web app

\`\`\`bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
\`\`\`

## 2. Analytics API

\`\`\`bash
cd apps/analytics-api
npm install
cp .env.example .env
\`\`\`

Create a Neon database, set \`DATABASE_URL\` and \`IP_HASH_SECRET\` (min 32 chars).

Run migrations:

\`\`\`bash
npx drizzle-kit up:pg --config node_modules/@remcostoeten/ingestion/drizzle.config.ts
\`\`\`

Deploy \`apps/analytics-api\` to Vercel, then set \`NEXT_PUBLIC_ANALYTICS_URL\` in the web app to that URL.

## Project ID

Events use \`projectId="${projectId}"\`. Change in \`apps/web/app/layout.tsx\` if needed.
`;
}

function readmeColocated(projectName: string, projectId: string): string {
	return `# ${projectName}

Tier 2 setup: SDK and ingestion in one Next.js app.

Warning: this adds server-side ingestion dependencies to your app deploy (larger serverless bundle).

Ingestion routes: \`app/e/route.ts\` and \`app/ingest/route.ts\` (SDK posts to \`/e\`).

## Setup

\`\`\`bash
npm install
cp .env.example .env.local
\`\`\`

Set \`DATABASE_URL\`, \`IP_HASH_SECRET\`, and \`NEXT_PUBLIC_ANALYTICS_URL\` (your app URL in production).

Run migrations:

\`\`\`bash
npx drizzle-kit up:pg --config node_modules/@remcostoeten/ingestion/drizzle.config.ts
\`\`\`

\`\`\`bash
npm run dev
\`\`\`

## Project ID

Events use \`projectId="${projectId}"\`. Change in \`app/layout.tsx\` if needed.
`;
}

function readmeSdkOnly(projectName: string, projectId: string): string {
	return `# ${projectName}

Tier 3 setup: SDK only. Point at an existing ingestion URL.

## Setup

\`\`\`bash
npm install
cp .env.example .env.local
\`\`\`

Set \`NEXT_PUBLIC_ANALYTICS_URL\` to your ingestion base URL (posts to \`/e\`).

\`\`\`bash
npm run dev
\`\`\`

## Project ID

Events use \`projectId="${projectId}"\`. Change in \`app/layout.tsx\` if needed.
`;
}

export function buildFiles(options: ScaffoldOptions): ScaffoldFile[] {
	const ingestPlaceholder = "https://your-analytics-api.vercel.app";

	if (options.tier === "separate") {
		return [
			{ path: "README.md", content: readmeSeparate(options.projectName, options.projectId) },
			{ path: "apps/web/package.json", content: webPackageJson() },
			{ path: "apps/web/tsconfig.json", content: webTsConfig() },
			{ path: "apps/web/next.config.mjs", content: "export default {};\n" },
			{ path: "apps/web/.env.example", content: webEnvExample(ingestPlaceholder) },
			{ path: "apps/web/app/layout.tsx", content: webLayout(options.projectId) },
			{ path: "apps/web/app/page.tsx", content: webPage() },
			{ path: "apps/analytics-api/package.json", content: apiPackageJson() },
			{ path: "apps/analytics-api/api/index.ts", content: apiHandler() },
			{ path: "apps/analytics-api/vercel.json", content: apiVercelJson() },
			{ path: "apps/analytics-api/.env.example", content: apiEnvExample() },
		];
	}

	if (options.tier === "colocated") {
		return [
			{ path: "README.md", content: readmeColocated(options.projectName, options.projectId) },
			{ path: "package.json", content: colocatedPackageJson(options.projectName) },
			{ path: "tsconfig.json", content: webTsConfig() },
			{ path: "next.config.mjs", content: "export default {};\n" },
			{ path: ".env.example", content: colocatedEnvExample() },
			{ path: "app/layout.tsx", content: webLayout(options.projectId) },
			{ path: "app/page.tsx", content: webPage() },
			{ path: "app/e/route.ts", content: ingestRoute() },
			{ path: "app/ingest/route.ts", content: ingestRoute() },
		];
	}

	return [
		{ path: "README.md", content: readmeSdkOnly(options.projectName, options.projectId) },
		{ path: "package.json", content: webPackageJson().replace('"name": "web"', `"name": "${options.projectName}"`) },
		{ path: "tsconfig.json", content: webTsConfig() },
		{ path: "next.config.mjs", content: "export default {};\n" },
		{ path: ".env.example", content: webEnvExample(ingestPlaceholder) },
		{ path: "app/layout.tsx", content: webLayout(options.projectId) },
		{ path: "app/page.tsx", content: webPage() },
	];
}
