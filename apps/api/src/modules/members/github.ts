import type { GithubProfile } from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type { EngineError } from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export type GithubSource = {
  send: (url: string, init?: RequestInit) => Promise<Response>;
  token: Nullable<string>;
};

export type GithubDirectory = {
  lookup: (login: string) => Promise<Result<Nullable<GithubProfile>, EngineError>>;
};

const GithubUser = Type.Object({
  id: Type.Integer(),
  login: Type.String(),
  name: Type.Union([Type.String(), Type.Null()]),
  avatar_url: Type.String(),
  type: Type.String(),
});

/**
 * @name githubDirectory
 * @description Looks logins up on GitHub's public users endpoint. An existing user gives its
 * profile with the login in GitHub's casing and the numeric id as text; an unknown login and an
 * organization account, which cannot sign in, give `null`. A rate limit, another status, a
 * network failure and a malformed body are `UNAVAILABLE`. A `token` raises the rate limit from 60
 * to 5000 requests an hour.
 *
 * @example
 * const directory = githubDirectory({ send: fetch, token: null });
 * const found = await directory.lookup("octocat");
 */
export function githubDirectory(source: GithubSource): GithubDirectory {
  return {
    lookup: async (login) => {
      try {
        const response = await source.send(
          `https://api.github.com/users/${encodeURIComponent(login)}`,
          {
            headers: {
              accept: "application/vnd.github+json",
              "user-agent": "spoar-api",
              ...(source.token ? { authorization: `Bearer ${source.token}` } : {}),
            },
          },
        );
        if (response.status === 404) return ok(null);
        if (response.status === 403 || response.status === 429) {
          return err(engineError("UNAVAILABLE", "GitHub's rate limit is reached, try again later"));
        }
        if (response.status !== 200) {
          return err(engineError("UNAVAILABLE", `GitHub answered ${response.status}`));
        }
        const body: unknown = await response.json();
        if (!Value.Check(GithubUser, body)) {
          return err(engineError("UNAVAILABLE", "GitHub's answer was not a user"));
        }
        if (body.type !== "User") return ok(null);
        return ok({
          login: body.login,
          id: String(body.id),
          name: body.name,
          avatarUrl: body.avatar_url,
        });
      } catch {
        return err(engineError("UNAVAILABLE", "GitHub could not be reached"));
      }
    },
  };
}
