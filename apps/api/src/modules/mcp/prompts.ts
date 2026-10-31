export type PromptArgument = { name: string; description: string; required: boolean };

export type Prompt = {
  name: string;
  title: string;
  description: string;
  arguments: PromptArgument[];
  render: (values: { [name: string]: string }) => string;
};

function setupText(values: { [name: string]: string }) {
  const domain = values.domain ?? "the site's production domain";
  const directory = values.directory ?? "the current working directory";
  return `Set up Spoar analytics for the site in ${directory}, whose production domain is ${domain}. Work through these steps and report what you did after each one. This server never reads or writes files; you do that with your own tools.

1. Detect the framework. Read package.json and look for \`next\`, \`astro\`, \`@sveltejs/kit\`, \`nuxt\`, \`@remix-run/react\`, \`react-router\`, \`vite\` or a plain static site. Note whether the app has a server: Next, Astro with an adapter, SvelteKit, Nuxt, Remix and React Router framework mode do; a Vite SPA or a static export does not.

2. Find or create the project. Call \`list_projects\`. Reuse a project whose domain matches; otherwise call \`create_project\` with an id derived from the domain (lowercase host without \`www.\`), the domain, and a \`devPort\` matching the dev server (3000 for Next, 4321 for Astro, 5173 for Vite and SvelteKit, 3000 for Nuxt). The answer holds the public key and, for a new project, the secret key once; do not print the secret key, only write it to the env file.

3. Choose the env variable the SDK reads. Next: \`NEXT_PUBLIC_SPOAR_CONFIG\`. Astro and SvelteKit: \`PUBLIC_SPOAR_CONFIG\`. Vite, Remix and React Router: \`VITE_SPOAR_CONFIG\`. Its value is the JSON \`{"project":"<id>","key":"<pk_live_ key>","endpoint":"<endpoint>"}\`. Write it to the env file the framework loads for local development (\`.env.local\` for Next, \`.env\` otherwise) and make sure that file is ignored by git.

4. Decide the endpoint. With a server, add a proxy route at \`/_ra\` using \`createProxy\` from \`@spoar/sdk/proxy\` with \`secret: process.env.SPOAR_SECRET\` and \`endpoint: "${values.api ?? "https://api.analytics.remcostoeten.nl"}"\`, write \`SPOAR_SECRET=<sk_live_ key>\` to the same env file, and set \`endpoint\` in the config JSON to \`/_ra\`. Without a server, set \`endpoint\` to the API URL and skip the secret. The docs for each framework are at https://docs.analytics.remcostoeten.nl/docs/frameworks.

5. Install and mount the SDK. Add \`@spoar/sdk\` and mount the entry for the framework (\`@spoar/sdk/next\`, \`@spoar/sdk/react\`, or the core \`init\`), following https://docs.analytics.remcostoeten.nl/docs/sdk/install.

6. Verify. When you wrote a secret, call \`check_keys\` with it, which hashes the value and never stores it; expect \`secretKey: "matches"\`. The public key shows \`waiting\` until the first real pageview arrives, so ask the user to open the site, then call \`key_status\` or \`check_keys\` again and expect \`connected\`. A \`rejected\` state means events arrived from an origin that is not in \`allowedOrigins\`; fix the list with \`update_project\`.

7. Remind the user that the same env variables must be set on the host (for example with \`vercel env add\`) before the deployed site sends events.`;
}

/**
 * @name setupPrompt
 * @description The "Set up Spoar" prompt: a step list for an agent with file access that creates
 * or finds the project, writes the env file the framework reads, adds the proxy when the app has
 * a server, mounts the SDK and verifies the keys.
 *
 * @example
 * setupPrompt.render({ domain: "example.com" });
 */
export const setupPrompt: Prompt = {
  name: "setup",
  title: "Set up Spoar",
  description:
    "Walks through adding Spoar to a site: detect the framework, create or find the project, write the env file, add the proxy when there is a server, mount the SDK and check the keys.",
  arguments: [
    { name: "domain", description: "The site's production domain.", required: false },
    { name: "directory", description: "The site's root folder.", required: false },
    { name: "api", description: "The API origin; defaults to the hosted one.", required: false },
  ],
  render: setupText,
};
