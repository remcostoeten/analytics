import { $ } from 'bun'
import { mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'

const outputDir = join('.vercel', 'output')
const funcDir = join(outputDir, 'functions', 'index.func')

rmSync(outputDir, { recursive: true, force: true })
mkdirSync(funcDir, { recursive: true })

console.log('Building bundle...')
await $`bun build src/handler.ts --outfile ${funcDir}/index.js --target node --format cjs --bundle`

writeFileSync(join(funcDir, 'package.json'), JSON.stringify({ type: 'commonjs' }))

writeFileSync(
  `${funcDir}/.vc-config.json`,
  JSON.stringify({
    runtime: 'nodejs20.x',
    handler: 'index.js',
    launcherType: 'Nodejs',
  })
)

writeFileSync(
  join(outputDir, 'config.json'),
  JSON.stringify({
    version: 3,
    routes: [{ src: '/(.*)', dest: '/index' }],
  })
)

console.log('Build complete!')
