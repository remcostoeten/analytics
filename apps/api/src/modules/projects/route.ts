import {
  CreatedProject,
  CreateProject,
  ProjectList,
  ProjectResponse,
  ProjectsQuery,
  RotatedKey,
  RotateKey,
  UpdatedProject,
  UpdateProject,
} from "@remcostoeten/analytics-contract";
import { engineError } from "@remcostoeten/analytics-engine";
import type { EngineError } from "@remcostoeten/analytics-engine";
import { Elysia } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import { createProject, listProjects, rotateKey, shapeFor, updateProject } from "./service";

const tags = ["Projects"];

/**
 * @name projectsModule
 * @description `/v2/projects`: the project list and one project for readers, and creating,
 * changing and rotating the keys of projects for admins. A private project answers 404 to anyone
 * who may not read it.
 *
 * @example
 * app.use(projectsModule(deps, docsBase));
 */
export function projectsModule(deps: AccessDeps, docsBase: string) {
  function reject(
    error: EngineError,
    set: { status?: unknown; headers: { [name: string]: unknown } },
  ) {
    const failed = failure(error, set.headers, docsBase);
    set.status = failed.status;
    return failed.body;
  }

  return new Elysia({ name: "projects" })
    .use(access(deps, docsBase))
    .get(
      "/projects",
      async ({ caller, query, set }) => {
        const listed = await listProjects(deps, caller, query.visibility ?? null);
        if (listed.ok) return { data: listed.value, nextCursor: null };
        return reject(listed.error, set);
      },
      {
        access: "public",
        query: ProjectsQuery,
        response: { 200: ProjectList, ...errorResponses },
        detail: {
          summary: "List projects",
          description:
            "Public projects for anyone, plus private ones the caller's role or token lists. Organization admins see every project with its settings and may filter with `visibility`.",
          tags,
        },
      },
    )
    .post(
      "/projects",
      async ({ body, set, status }) => {
        const created = await createProject(deps, body);
        if (created.ok) return status(201, { data: created.value });
        return reject(created.error, set);
      },
      {
        access: "admin",
        body: CreateProject,
        response: { 201: CreatedProject, ...errorResponses },
        detail: {
          summary: "Create a project",
          description: "The secret key is in this response only; the API stores its hash.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project",
      ({ caller, project, set }) =>
        project
          ? { data: shapeFor(caller, project) }
          : reject(engineError("NOT_FOUND", "Project not found"), set),
      {
        access: "project",
        response: { 200: ProjectResponse, ...errorResponses },
        detail: {
          summary: "Get a project",
          description: "Settings are included for the project's admins.",
          tags,
        },
      },
    )
    .patch(
      "/projects/:project",
      async ({ body, params, set }) => {
        const updated = await updateProject(deps, params.project, body);
        if (updated.ok) return { data: updated.value };
        return reject(updated.error, set);
      },
      {
        access: "admin",
        body: UpdateProject,
        response: { 200: UpdatedProject, ...errorResponses },
        detail: {
          summary: "Change project settings",
          description:
            "Name, visibility, `publicVisitorData`, `sqlEnabled`, `widgetReports`, allowed origins and retention.",
          tags,
        },
      },
    )
    .post(
      "/projects/:project/keys",
      async ({ body, params, set }) => {
        const rotated = await rotateKey(deps, params.project, body.kind);
        if (rotated.ok) return { data: rotated.value };
        return reject(rotated.error, set);
      },
      {
        access: "admin",
        body: RotateKey,
        response: { 200: RotatedKey, ...errorResponses },
        detail: {
          summary: "Rotate a key",
          description:
            "Replaces the public or the secret key. A new secret key is returned once and the old one stops working.",
          tags,
        },
      },
    );
}
