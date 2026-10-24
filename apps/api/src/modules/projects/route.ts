import {
  CheckKeys,
  CreatedProject,
  CreateProject,
  KeyStatus,
  ProjectList,
  ProjectParams,
  KeyUsageResponse,
  ProjectResponse,
  ProjectsQuery,
  RotatedKey,
  RotateKey,
  UpdatedProject,
  UpdateProject,
} from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type { EngineError, LogStore } from "@spoar/engine";
import type { Nullable } from "@spoar/shared/semantic";
import { Elysia, t } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { errorResponses } from "../../plugins/error-responses";
import {
  checkKeys,
  createProject,
  keyStatus,
  listProjects,
  removeProject,
  rotateKey,
  keyUsageOf,
  shapeFor,
  updateProject,
} from "./service";

const tags = ["Projects"];

/**
 * @name projectsModule
 * @description `/v2/projects`: the project list and one project for readers, creating, changing
 * and rotating and checking the keys of projects for admins, and deleting one for the owner. A
 * private project answers 404 to anyone who may not read it. Key checks read the ingest log, so
 * without `logs` a project always checks as waiting.
 *
 * @example
 * app.use(projectsModule(deps, docsBase, logs));
 */
export function projectsModule(deps: AccessDeps, docsBase: string, logs: Nullable<LogStore>) {
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
        params: ProjectParams,
        access: "project",
        response: { 200: ProjectResponse, ...errorResponses },
        detail: {
          summary: "Get a project",
          description: "Settings are included for the project's admins.",
          tags,
        },
      },
    )
    .get(
      "/projects/:project/key-usage",
      ({ project, set }) =>
        project
          ? { data: keyUsageOf(project) }
          : reject(engineError("NOT_FOUND", "Project not found"), set),
      {
        params: ProjectParams,
        access: "logs",
        response: { 200: KeyUsageResponse, ...errorResponses },
        detail: {
          summary: "Read when the keys were last used",
          description:
            "When and from which origin the public and the secret key last authorized an ingest batch. For project admins and the debug console's widget token.",
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
        params: ProjectParams,
        access: "admin",
        body: UpdateProject,
        response: { 200: UpdatedProject, ...errorResponses },
        detail: {
          summary: "Change project settings",
          description:
            "Name, visibility, `publicVisitorData`, `sqlEnabled`, `widgetReports`, `debugConsole`, allowed origins and retention.",
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
        params: ProjectParams,
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
    )
    .get(
      "/projects/:project/keys",
      async ({ params, set }) => {
        const status = await keyStatus(deps, params.project);
        if (status.ok) return { data: status.value };
        return reject(status.error, set);
      },
      {
        params: ProjectParams,
        access: "admin",
        response: { 200: KeyStatus, ...errorResponses },
        detail: {
          summary: "Get the key status",
          description:
            "When the current public and secret keys were generated and the last key check, which is null until one has run and after a key is rotated.",
          tags,
        },
      },
    )
    .post(
      "/projects/:project/keys/check",
      async ({ body, params, set }) => {
        const checked = await checkKeys(deps, logs, params.project, body.secretKey ?? null);
        if (checked.ok) return { data: checked.value };
        return reject(checked.error, set);
      },
      {
        params: ProjectParams,
        access: "admin",
        body: CheckKeys,
        response: { 200: KeyStatus, ...errorResponses },
        detail: {
          summary: "Check the keys",
          description:
            "Reports whether events were accepted with the current public key since it was generated, within the 7 days the log keeps, and stores the result. A secret key in the body is compared by hash and never stored; without one the secret key is `not-tested`, since only its hash is kept.",
          tags,
        },
      },
    )
    .delete(
      "/projects/:project",
      async ({ caller, params, set, status }) => {
        const removed = await removeProject(deps, caller, params.project);
        return removed.ok ? status(204, undefined) : reject(removed.error, set);
      },
      {
        params: ProjectParams,
        access: "admin",
        response: { 204: t.Void(), ...errorResponses },
        detail: {
          summary: "Delete a project",
          description:
            "Owner only. The keys stop working and every route answers 404 at once; the cleanup job then purges the project's events, sessions and other rows in batches, and the id cannot be reused until that is done.",
          tags,
        },
      },
    );
}
