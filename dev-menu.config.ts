import { defineConfig } from '@remcostoeten/dev-menu'

export default defineConfig({
	processes: [
		{ tag: 'sdk-demo', color: '33', cmd: 'bun', args: ['run', 'dev'], cwd: 'apps/sdk-demo', port: 3001, url: 'http://localhost:3001', openKey: 'e' },
		{ tag: 'dashboard', color: '36', cmd: 'bun', args: ['run', 'dev'], cwd: 'apps/dashboard', port: 3000, url: 'http://localhost:3000', openKey: 'a' },
		{ tag: 'ingestion', color: '35', cmd: 'bun', args: ['run', 'dev'], cwd: 'apps/ingestion', openKey: 'n' },
	],
	guardedPaths: ['apps/dashboard/src/', 'packages/create-analytics/src/', 'packages/ingestion/src/', 'packages/sdk/src/'],
})
