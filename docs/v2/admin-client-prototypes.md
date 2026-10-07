# Admin client prototypes

These examples compare two ways to manage projects and API tokens from a Bun script. The API routes already exist, but the current `createAdmin` client does not expose project or token methods yet. `createDatabaseAdmin` is also a proposed helper, not an implementation.

## API client

The API owns database access and validation. The script authenticates with an admin token.

```ts
import { createAdmin } from "@spoar/sdk/admin";

async function main() {
  const token = process.env.RA_ADMIN_TOKEN;
  if (!token) throw new Error("RA_ADMIN_TOKEN is required");

  const admin = createAdmin({
    endpoint: "https://api.analytics.remcostoeten.nl",
    token,
  });

  const listed = await admin.projects.list();
  if (!listed.ok) throw new Error(listed.error.message);

  let project = listed.value.find((item) => item.id === "docs");
  if (!project) {
    const created = await admin.projects.create({
      id: "docs",
      name: "Docs",
      domain: "docs.remcostoeten.nl",
    });
    if (!created.ok) throw new Error(created.error.message);
    project = created.value;
    console.log("Store this project secret securely:", project.secretKey);
  }

  const updated = await admin.projects.update(project.id, {
    allowedOrigins: ["https://docs.remcostoeten.nl"],
  });
  if (!updated.ok) throw new Error(updated.error.message);

  const createdToken = await admin.tokens.create({
    name: "Docs deploy",
    scope: "read",
    projectIds: [project.id],
  });
  if (!createdToken.ok) throw new Error(createdToken.error.message);
  console.log("Store this API token securely:", createdToken.value.token);
}

await main();
```

This fits a published SDK and scripts that should not have database credentials. Created secrets are returned once; token listings never include token values.

## Direct database client

The script connects to Postgres with Bun's `SQL` and `DATABASE_URL`, following the local admin script's current model.

```ts
import { SQL } from "bun";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  const admin = createDatabaseAdmin(new SQL(databaseUrl));
  const listed = await admin.projects.list();
  if (!listed.ok) throw new Error(listed.error.message);

  let project = listed.value.find((item) => item.id === "docs");
  if (!project) {
    const created = await admin.projects.create({
      id: "docs",
      name: "Docs",
      domain: "docs.remcostoeten.nl",
    });
    if (!created.ok) throw new Error(created.error.message);
    project = created.value;
    console.log("Store this project secret securely:", project.secretKey);
  }

  const updated = await admin.projects.update(project.id, {
    allowedOrigins: ["https://docs.remcostoeten.nl"],
  });
  if (!updated.ok) throw new Error(updated.error.message);

  const createdToken = await admin.tokens.create({
    name: "Docs deploy",
    scope: "read",
    projectIds: [project.id],
  });
  if (!createdToken.ok) throw new Error(createdToken.error.message);
  console.log("Store this API token securely:", createdToken.value.token);
}

await main();
```

This is suited to a local CLI that already has database access. It stays server-side and must track database schema changes.

## Shared method shape

```ts
type AdminManagement = {
  projects: {
    list(): AdminResult<Project[]>;
    create(input: CreateProjectInput): AdminResult<CreatedProject>;
    update(id: string, input: UpdateProjectInput): AdminResult<Project>;
  };
  tokens: {
    list(): AdminResult<ApiToken[]>;
    create(input: CreateTokenInput): AdminResult<CreatedToken>;
    revoke(id: string): AdminResult<void>;
  };
};
```
