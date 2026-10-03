# @spoar/shared

Semantic types, `Result`, `noop`, the record helpers and the JSON HTTP helpers for every v2 package. Private: it is never published, and its `exports` point at `src/`, so there is no build step.

| Import | Contains |
| --- | --- |
| `@spoar/shared/semantic` | `ID`, `Timestamp`, `Day`, `Milliseconds`, `Nullable`, `Entity`, `CreateInput`, `UpdateInput` and the per-entity ids |
| `@spoar/shared/result` | `Result`, `ok`, `err` |
| `@spoar/shared/noop` | `noop`, for intentionally swallowed errors |
| `@spoar/shared/records` | `hasKeys` and `orNull`, for objects that may be empty |
| `@spoar/shared/http` | `request`, `getJson`, `postJson`, `putJson`, `patchJson`, `deleteJson` and their types |

## HTTP

Every outgoing JSON call goes through one helper that never throws:

```ts
import { getJson, postJson } from "@spoar/shared/http";

const sent = await postJson("https://api.resend.com/emails", mail, {
  headers: { authorization: `Bearer ${key}` },
  timeoutMs: 5000,
});
if (!sent.ok) return sent;

const project = await getJson(`${api}/v2/projects/remcostoeten.nl`, { parse: projectBody });
if (project.ok) project.value.body.visibility;
```

- The answer is `{ ok: true, value: { status, headers, body } }` or `{ ok: false, error }`.
- `error.kind` is one of `url`, `timeout`, `aborted`, `network`, `status`, `parse` (the answer is not JSON) or `schema` (`parse` rejected it). `error.status` and a 500-character `error.body` excerpt are there when the server answered.
- Without `parse` the body is `Json`; with `parse`, a function from `Json` to `Result<Body, string>`, it is `Body`. A type argument alone cannot claim a shape the server did not prove.
- `query` appends parameters and skips `null` and `undefined`; `timeoutMs` defaults to 10 seconds; `signal` aborts; `fetch` replaces the global one in tests.
- Error messages name the URL without its query string, so keys in a query never reach logs.
- Nothing retries. A caller that needs retries, such as the alert delivery queue, owns them.

This package imports nothing else from the repo; `bun run boundaries` checks that.
