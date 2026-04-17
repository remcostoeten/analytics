import { spawn } from "bun";

if (process.env.SKIP_PIPELINE === "1") {
  process.exit(0);
}

const THEME = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  bgCyan: "\x1b[46m",
  black: "\x1b[30m",
};

const isPrebuild = process.argv.includes("--no-build");

const tasks = [
  { name: "Lint", command: ["bun", "run", "lint"] },
  { name: "Format", command: ["bun", "run", "fmt"] },
  { name: "Typecheck", command: ["bun", "run", "typecheck"] },
  { name: "Test", command: ["bun", "run", "test"] },
];

if (!isPrebuild) {
  tasks.push({ name: "Build", command: ["bun", "run", "build"], env: { SKIP_PIPELINE: "1" } });
}

async function runTask({ name, command, env }: { name: string; command: string[]; env?: Record<string, string> }) {
  const startTime = performance.now();
  
  console.log(`\n${THEME.blue}${THEME.bold}[+] RUNNING${THEME.reset} ${name}`);
  console.log(`${THEME.dim}> ${command.join(" ")}${THEME.reset}\n`);
  
  const proc = spawn(command, {
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, ...env },
  });

  const exitCode = await proc.exited;
  const duration = (performance.now() - startTime).toFixed(0);

  if (exitCode !== 0) {
    console.log(`\n${THEME.red}${THEME.bold}[x] FAILED${THEME.reset} ${name} in ${duration}ms`);
    return { success: false, name, duration, exitCode };
  } else {
    console.log(`\n${THEME.green}${THEME.bold}[v] SUCCESS${THEME.reset} ${name} in ${duration}ms`);
    return { success: true, name, duration, exitCode: 0 };
  }
}

async function main() {
  console.log(`\n${THEME.bgCyan}${THEME.black}${THEME.bold}====================================${THEME.reset}`);
  console.log(`${THEME.bgCyan}${THEME.black}${THEME.bold}          PIPELINE START            ${THEME.reset}`);
  console.log(`${THEME.bgCyan}${THEME.black}${THEME.bold}====================================${THEME.reset}\n`);

  const results = [];
  let hasFailure = false;

  for (const task of tasks) {
    const result = await runTask(task);
    results.push(result);
    if (!result.success) {
      hasFailure = true;
      break; 
    }
  }

  console.log(`\n${THEME.cyan}${THEME.bold}====================================${THEME.reset}`);
  console.log(`${THEME.cyan}${THEME.bold}          PIPELINE SUMMARY          ${THEME.reset}`);
  console.log(`${THEME.cyan}${THEME.bold}====================================${THEME.reset}\n`);

  for (const res of results) {
    const statusText = res.success 
      ? `${THEME.green}PASS${THEME.reset}` 
      : `${THEME.red}FAIL${THEME.reset}`;
    
    const paddedName = res.name.padEnd(12, ".");
    console.log(`  ${paddedName}.... [ ${statusText} ]  ${THEME.dim}(${res.duration}ms)${THEME.reset}`);
  }

  console.log(`\n${THEME.cyan}${THEME.bold}====================================${THEME.reset}\n`);

  if (hasFailure) {
    console.error(`${THEME.red}${THEME.bold}Pipeline stopped due to a failure. Please fix the errors above.${THEME.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${THEME.green}${THEME.bold}All tasks completed successfully! Ready for deployment.${THEME.reset}\n`);
    process.exit(0);
  }
}

main().catch(err => {
  console.error(`${THEME.red}${THEME.bold}Unexpected execution error:${THEME.reset}\n`, err);
  process.exit(1);
});
