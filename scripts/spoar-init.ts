import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

type PackageJSON = {
  packageManager?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type InitOptions = {
  directory: string;
  endpoint: string;
  force: boolean;
  framework: Framework | null;
  appDirectory: string | null;
  libDirectory: string | null;
  noInstall: boolean;
  project: string;
  publicKey: string;
  secretKey: string | null;
  writeEnv: boolean;
  dryRun: boolean;
};

type Framework =
  | "next-app"
  | "next-pages"
  | "vite-react"
  | "react"
  | "astro"
  | "sveltekit"
  | "vue"
  | "unknown";

type Detection = {
  framework: Framework;
  appDirectory: string | null;
  pagesDirectory: string | null;
  libDirectory: string;
  environmentName: "NEXT_PUBLIC_RA_CONFIG" | "PUBLIC_RA_CONFIG" | "VITE_RA_CONFIG";
  directEndpoint: boolean;
};

type FileChange = {
  path: string;
  content: string;
  allowExisting?: boolean;
};

type PackageManager = {
  command: string;
  args: string[];
};

const usage = `Usage: bun run spoar:init -- --project <id> --public-key <pk_...> [options]

Options:
  --endpoint <url>       Spoar API URL (default: https://api.analytics.remcostoeten.nl)
  --framework <name>     Override detection: next-app, next-pages, vite-react, react, astro, sveltekit or vue
  --app-directory <path> App Router or pages directory when it is not conventional
  --lib-directory <path> Directory for the generated analytics client
  --secret-key <key>     Write the secret to .env.local when used with --write-env
  --write-env             Write .env.local as well as .env.local.example
  --directory <path>     App directory (default: current directory)
  --no-install           Do not install @spoar/sdk@latest
  --force                Replace generated files
  --dry-run              Show changes without writing or installing
  --help                 Show this help`;

function flagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) return undefined;
  return argv[index + 1];
}

function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

function frameworkValue(value: string | undefined): Framework | null {
  if (value === undefined) return null;
  const frameworks: Framework[] = [
    "next-app",
    "next-pages",
    "vite-react",
    "react",
    "astro",
    "sveltekit",
    "vue",
    "unknown",
  ];
  return frameworks.includes(value as Framework) ? (value as Framework) : null;
}

/**
 * @name parseInitOptions
 * @description Parses the project credentials and filesystem options for the Next.js initializer.
 * Credentials may come from command-line flags or SPOAR_* environment variables.
 *
 * @example
 * parseInitOptions(["--project", "example.com", "--public-key", "pk_live_demo"], {});
 */
export function parseInitOptions(
  argv: string[],
  environment: Record<string, string | undefined> = process.env,
): { ok: true; value: InitOptions } | { ok: false; error: string } {
  if (hasFlag(argv, "--help")) return { ok: false, error: usage };
  const frameworkFlag = flagValue(argv, "--framework");
  if (frameworkFlag !== undefined && frameworkValue(frameworkFlag) === null) {
    return { ok: false, error: `Unknown framework: ${frameworkFlag}.\n\n${usage}` };
  }
  const project = flagValue(argv, "--project") ?? environment.SPOAR_PROJECT;
  const publicKey = flagValue(argv, "--public-key") ?? environment.SPOAR_PUBLIC_KEY;
  if (!project) return { ok: false, error: `--project is required.\n\n${usage}` };
  if (!publicKey) return { ok: false, error: `--public-key is required.\n\n${usage}` };
  const directory = resolve(flagValue(argv, "--directory") ?? ".");
  const appDirectoryFlag = flagValue(argv, "--app-directory");
  const libDirectoryFlag = flagValue(argv, "--lib-directory");

  return {
    ok: true,
    value: {
      directory,
      endpoint:
        flagValue(argv, "--endpoint") ??
        environment.SPOAR_ENDPOINT ??
        "https://api.analytics.remcostoeten.nl",
      force: hasFlag(argv, "--force"),
      framework: frameworkValue(frameworkFlag),
      appDirectory: appDirectoryFlag ? resolve(directory, appDirectoryFlag) : null,
      libDirectory: libDirectoryFlag ? resolve(directory, libDirectoryFlag) : null,
      noInstall: hasFlag(argv, "--no-install"),
      project,
      publicKey,
      secretKey: flagValue(argv, "--secret-key") ?? environment.SPOAR_SECRET_KEY ?? null,
      writeEnv: hasFlag(argv, "--write-env"),
      dryRun: hasFlag(argv, "--dry-run"),
    },
  };
}

function packageHas(packageJSON: PackageJSON, name: string): boolean {
  return Boolean(packageJSON.dependencies?.[name] ?? packageJSON.devDependencies?.[name]);
}

function conventionalDirectory(directory: string, names: string[]): string | null {
  for (const name of names) {
    const candidate = join(directory, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function detectFramework(
  directory: string,
  packageJSON: PackageJSON,
  options: InitOptions,
): Detection {
  const sourceRoot = existsSync(join(directory, "src")) ? join(directory, "src") : directory;
  const appDirectory = options.appDirectory ?? conventionalDirectory(directory, ["src/app", "app"]);
  const pagesDirectory = conventionalDirectory(directory, ["src/pages", "pages"]);
  const hasNext = packageHas(packageJSON, "next");
  const framework =
    options.framework ??
    (hasNext && appDirectory
      ? "next-app"
      : hasNext && pagesDirectory
        ? "next-pages"
        : packageHas(packageJSON, "astro")
          ? "astro"
          : packageHas(packageJSON, "@sveltejs/kit")
            ? "sveltekit"
            : packageHas(packageJSON, "vue")
              ? "vue"
              : packageHas(packageJSON, "react") && packageHas(packageJSON, "vite")
                ? "vite-react"
                : packageHas(packageJSON, "react")
                  ? "react"
                  : "unknown");
  const environmentName =
    framework === "next-app" || framework === "next-pages"
      ? "NEXT_PUBLIC_RA_CONFIG"
      : framework === "astro" || framework === "sveltekit"
        ? "PUBLIC_RA_CONFIG"
        : "VITE_RA_CONFIG";
  return {
    framework,
    appDirectory: framework === "next-app" ? appDirectory : null,
    pagesDirectory: framework === "next-pages" ? (options.appDirectory ?? pagesDirectory) : null,
    libDirectory: options.libDirectory ?? join(sourceRoot, "lib"),
    environmentName,
    directEndpoint: framework !== "next-app" && framework !== "next-pages",
  };
}

function frameworkLabel(framework: Framework): string {
  return framework === "next-app"
    ? "Next.js App Router"
    : framework === "next-pages"
      ? "Next.js Pages Router"
      : framework === "vite-react"
        ? "Vite + React"
        : framework === "sveltekit"
          ? "SvelteKit"
          : framework === "unknown"
            ? "unknown project"
            : framework[0].toUpperCase() + framework.slice(1);
}

function packageManager(directory: string, packageJSON: PackageJSON): PackageManager {
  if (existsSync(join(directory, "pnpm-lock.yaml"))) return { command: "pnpm", args: ["add"] };
  if (existsSync(join(directory, "yarn.lock"))) return { command: "yarn", args: ["add"] };
  if (packageJSON.packageManager?.startsWith("npm@")) return { command: "npm", args: ["install"] };
  return { command: "bun", args: ["add"] };
}

function packageJSONPath(directory: string): string {
  return join(directory, "package.json");
}

function relativeImport(from: string, target: string): string {
  const path = relative(dirname(from), target)
    .replace(/\\/g, "/")
    .replace(/\.tsx?$/, "");
  return path.startsWith(".") ? path : `./${path}`;
}

function indent(content: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return content
    .trim()
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

function providersFile(analyticsImport: string, nextAdapter: boolean): string {
  const tracker = nextAdapter ? "      <Analytics />\n" : "";
  const nextImport = nextAdapter ? 'import { Analytics } from "@spoar/sdk/next";\n' : "";
  return `"use client";

import type { ReactNode } from "react";
import { AnalyticsProvider } from "@spoar/sdk/react";
${nextImport}
import { analytics } from "${analyticsImport}";


type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <AnalyticsProvider client={analytics}>
${tracker}      
      {children}
    </AnalyticsProvider>
  );
}
`;
}

function analyticsFile(nextAdapter: boolean): string {
  const pageviews = nextAdapter ? "  pageviews: false,\n" : "";
  return `import { createAnalytics } from "@spoar/sdk";
import { errors, speedInsights } from "@spoar/sdk/plugins";

export const analytics = createAnalytics({
${pageviews}  plugins: [speedInsights(), errors()],
});
`;
}

function proxyFile(): string {
  return `import { createProxy } from "@spoar/sdk/proxy";

export const POST = createProxy({
  secret: process.env.RA_SECRET,
  endpoint: process.env.RA_ENDPOINT,
});
`;
}

function pagesProxyFile(): string {
  return `import type { NextApiRequest, NextApiResponse } from "next";
import { createProxy } from "@spoar/sdk/proxy";

const proxy = createProxy({
  secret: process.env.RA_SECRET,
  endpoint: process.env.RA_ENDPOINT,
});

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    if (Array.isArray(value)) headers.set(name, value.join(", "));
  }
  const body = request.method === "POST" ? JSON.stringify(request.body) : undefined;
  const result = await proxy(
    new Request(\`https://\${request.headers.host ?? "localhost"}\${request.url ?? "/_ra"}\`, {
      method: request.method,
      headers,
      body,
    }),
  );
  response.status(result.status);
  result.headers.forEach((value, name) => response.setHeader(name, value));
  response.send(await result.text());
}
`;
}

function environmentFile(
  options: InitOptions,
  detection: Detection,
  includeSecret: boolean,
): string {
  const secret = includeSecret && options.secretKey ? options.secretKey : "sk_live_...";
  const endpoint = detection.directEndpoint
    ? `${options.endpoint}/v2/events`
    : detection.framework === "next-pages"
      ? "/api/_ra"
      : "/_ra";
  const config = JSON.stringify({
    project: options.project,
    key: options.publicKey,
    endpoint,
  });
  const browser = `${detection.environmentName}='${config}'`;
  return detection.directEndpoint
    ? `${browser}\n`
    : `${browser}\nRA_SECRET=${secret}\nRA_ENDPOINT=${options.endpoint}\n`;
}

function patchLayout(content: string, providersPath: string): string | null {
  if (content.includes("<Providers>") || content.includes("<Providers ")) return content;
  const body = content.match(/(<body\b[^>]*>)([\s\S]*?)(<\/body>)/);
  if (!body) return null;
  const importLine = `import { Providers } from "${relativeImport(providersPath, providersPath)}";`;
  const nextImport = content.includes("import { Providers }")
    ? content
    : `${importLine}\n${content}`;
  const bodyContent = body[2].trim();
  const wrapped = `${body[1]}\n        <Providers>\n${indent(bodyContent, 10)}\n        </Providers>\n      ${body[3]}`;
  return nextImport.replace(body[0], wrapped);
}

async function layoutChanges(app: string, providers: string): Promise<FileChange[]> {
  const layout = join(app, "layout.tsx");
  if (!existsSync(layout)) return [];
  const content = await readFile(layout, "utf8");
  const patched = patchLayout(content, providers);
  return patched && patched !== content
    ? [{ path: layout, content: patched, allowExisting: true }]
    : [];
}

function pagesAppFile(providersImport: string): string {
  return `import type { AppProps } from "next/app";

import { Providers } from "${providersImport}";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <Component {...pageProps} />
    </Providers>
  );
}
`;
}

async function pagesAppChanges(pages: string, providers: string): Promise<FileChange[]> {
  const app = join(pages, "_app.tsx");
  if (!existsSync(app)) {
    return [{ path: app, content: pagesAppFile(relativeImport(app, providers)) }];
  }
  const content = await readFile(app, "utf8");
  if (content.includes("<Providers>")) return [];
  const component = content.match(/<Component\s+\{\.\.\.pageProps\}\s*\/>/);
  if (!component) return [];
  const imported = content.includes("import { Providers }")
    ? content
    : `import { Providers } from "${relativeImport(app, providers)}";\n${content}`;
  const wrapped = `<Providers>\n        ${component[0]}\n      </Providers>`;
  return [
    {
      path: app,
      content: imported.replace(component[0], wrapped),
      allowExisting: true,
    },
  ];
}

async function readPackageJSON(directory: string): Promise<PackageJSON> {
  return JSON.parse(await readFile(packageJSONPath(directory), "utf8")) as PackageJSON;
}

async function changesFor(
  directory: string,
  options: InitOptions,
  detection: Detection,
): Promise<FileChange[]> {
  const nextApp = detection.framework === "next-app";
  const nextPages = detection.framework === "next-pages";
  const app = detection.appDirectory;
  const pages = detection.pagesDirectory;
  const analytics = join(detection.libDirectory, "analytics.ts");
  const files: FileChange[] = [
    { path: analytics, content: analyticsFile(nextApp) },
    {
      path: join(directory, ".env.local.example"),
      content: environmentFile(options, detection, false),
    },
  ];
  if (nextApp && app) {
    const providers = join(app, "providers.tsx");
    files.push({
      path: providers,
      content: providersFile(relativeImport(providers, analytics), true),
    });
    files.push({ path: join(app, "%5Fra/route.ts"), content: proxyFile() });
    files.push(...(await layoutChanges(app, providers)));
  }
  if (nextPages && pages) {
    const providers = join(pages, "providers.tsx");
    files.push({
      path: providers,
      content: providersFile(relativeImport(providers, analytics), false),
    });
    files.push({ path: join(pages, "api/_ra.ts"), content: pagesProxyFile() });
    files.push(...(await pagesAppChanges(pages, providers)));
  }
  return files;
}

function relativeLabel(directory: string, path: string): string {
  return relative(directory, path) || ".";
}

async function writeChanges(directory: string, files: FileChange[], force: boolean) {
  for (const file of files) {
    if (existsSync(file.path) && !force && !file.allowExisting) {
      throw new Error(
        `${relativeLabel(directory, file.path)} already exists. Use --force to replace it.`,
      );
    }
  }
  for (const file of files) {
    await mkdir(dirname(file.path), { recursive: true });
    await writeFile(file.path, file.content);
  }
}

async function installSDK(directory: string, packageJSON: PackageJSON) {
  if (packageHas(packageJSON, "@spoar/sdk")) return "@spoar/sdk is already installed";
  const manager = packageManager(directory, packageJSON);
  const result = Bun.spawnSync([manager.command, ...manager.args, "@spoar/sdk@latest"], {
    cwd: directory,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) throw new Error("Could not install @spoar/sdk@latest");
  return `Installed @spoar/sdk@latest with ${manager.command}`;
}

function nextInstructions(detection: Detection): string {
  if (detection.framework === "next-app") {
    return "Next: copy .env.local.example to .env.local, then start Next.js.";
  }
  if (detection.framework === "next-pages") {
    return "Next: copy .env.local.example to .env.local, then start Next.js.";
  }
  if (detection.framework === "astro") {
    return "Next: import the generated analytics client from a browser <script> in your shared Astro layout.";
  }
  if (detection.framework === "sveltekit") {
    return "Next: import the generated analytics client from your root SvelteKit layout.";
  }
  if (detection.framework === "vite-react" || detection.framework === "react") {
    return "Next: import the generated analytics client from your browser entry, then wrap your app with AnalyticsProvider if it uses the React hooks.";
  }
  if (detection.framework === "vue") {
    return "Next: import the generated analytics client from your browser entry.";
  }
  return "Next: import the generated analytics client from the browser entry that owns your app.";
}

async function main() {
  const parsed = parseInitOptions(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(parsed.error);
    process.exitCode = parsed.error === usage ? 0 : 1;
    return;
  }
  const options = parsed.value;
  const packageJSON = await readPackageJSON(options.directory);
  const detection = detectFramework(options.directory, packageJSON, options);
  const files = await changesFor(options.directory, options, detection);
  console.log(`Detected ${frameworkLabel(detection.framework)}.`);
  console.log(options.dryRun ? "Would create or update:" : "Creating or updating:");
  for (const file of files) console.log(`  ${relativeLabel(options.directory, file.path)}`);

  if (options.dryRun) {
    if (!options.noInstall) console.log("  install @spoar/sdk@latest");
    console.log(`\n${nextInstructions(detection)}`);
    return;
  }
  const envPath = join(options.directory, ".env.local");
  if (options.writeEnv && options.secretKey && existsSync(envPath) && !options.force) {
    throw new Error(".env.local already exists. Use --force to replace it.");
  }
  await writeChanges(options.directory, files, options.force);
  if (!options.noInstall) console.log(await installSDK(options.directory, packageJSON));
  if (options.writeEnv && options.secretKey) {
    await writeFile(envPath, environmentFile(options, detection, true));
    console.log("Wrote .env.local");
  } else if (options.secretKey) {
    console.log("Secret key was not written. Use --write-env to create .env.local.");
  }
  if (!options.writeEnv || !options.secretKey) {
    console.log(`\n${nextInstructions(detection)}`);
  } else {
    console.log(
      `\n${nextInstructions(detection).replace("copy .env.local.example to .env.local, then ", "")}`,
    );
  }
}

if (import.meta.main) await main();
