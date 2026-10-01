import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";

type Reply<Value> = Promise<Result<Value, EngineError>>;

export type AnnotationKind = "release" | "post" | "content" | "incident" | "other";

export type AnnotationRecord = {
  id: string;
  projectId: ProjectID;
  title: string;
  date: Date;
  endDate: Nullable<Date>;
  kind: AnnotationKind;
  note: Nullable<string>;
  url: Nullable<string>;
  createdAt: Date;
  updatedAt: Date;
};

export type NewAnnotation = Pick<
  AnnotationRecord,
  "title" | "date" | "endDate" | "kind" | "note" | "url"
>;

export type AnnotationPatch = Partial<NewAnnotation>;

export type AnnotationWindow = { from: Date; to: Date; limit: number; offset: number };

export type AnnotationStore = {
  list: (
    project: ProjectID,
    window: AnnotationWindow,
  ) => Reply<{ rows: AnnotationRecord[]; total: number }>;
  get: (project: ProjectID, id: string) => Reply<Nullable<AnnotationRecord>>;
  create: (project: ProjectID, annotation: NewAnnotation) => Reply<AnnotationRecord>;
  update: (
    project: ProjectID,
    id: string,
    patch: AnnotationPatch,
  ) => Reply<Nullable<AnnotationRecord>>;
  remove: (project: ProjectID, id: string) => Reply<boolean>;
};
