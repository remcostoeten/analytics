import { defineConfig } from '../dev-menu/scripts/dev-menu.config'

export default defineConfig({
	processes: [
		{ tag: 'example-dashboard', color: '33', cmd: 'bun', args: ['run', 'dev'], cwd: 'apps/example-dashboard', port: 3000, url: 'http://localhost:3000', openKey: 'e' },
		{ tag: 'ingestion', color: '36', cmd: 'bun', args: ['run', 'dev'], cwd: 'apps/ingestion', openKey: 'n' },
		{ tag: 'example', color: '35', cmd: 'bun', args: ['run', 'dev'], cwd: 'apps/example', port: 3001, url: 'http://localhost:3001', openKey: 'x' },
	],
	guardedPaths: ['packages/sdk/src/', 'packages/ingestion/src/', 'packages/create-analytics/src/'],
})
