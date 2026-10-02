import { $ } from "bun";

const app = `${import.meta.dir}/..`;
const outDir = `${app}/out/standalone`;
const [css] = Array.from(new Bun.Glob("_next/static/chunks/*.css").scanSync({ cwd: `${app}/out` }));
if (!css) throw new Error("Run next build first: no stylesheet in out/");

await $`bun build ${app}/scripts/client.tsx --target browser --production --outfile ${outDir}/app.js`;
await $`bun ${app}/scripts/render.tsx ${app}/out/${css} ${outDir}/index.html`;
console.log(`Standalone page in ${outDir}`);
