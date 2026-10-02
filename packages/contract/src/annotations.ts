import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { PageQuery, RangeQuery } from "./common";
import { dataOf, Day, Id, listOf, nullable, oneOf, Timestamp } from "./schema";

export const AnnotationKind = oneOf(["release", "post", "content", "incident", "other"]);
export type AnnotationKind = Static<typeof AnnotationKind>;

const Title = Type.String({ minLength: 1, maxLength: 120 });
const Note = Type.String({ minLength: 1, maxLength: 2000 });
const Link = Type.String({
  format: "uri",
  pattern: "^https?://",
  maxLength: 2048,
  description: "An `http://` or `https://` URL, such as the release notes or the post.",
});
const DateInput = Type.Union([Day, Timestamp], {
  description: "A calendar date such as `2026-10-01`, read as its start in UTC, or a timestamp.",
});

export const Annotation = Type.Object({
  id: Id,
  project: Id,
  title: Title,
  date: Timestamp,
  endDate: nullable(Timestamp),
  kind: AnnotationKind,
  note: nullable(Note),
  url: nullable(Link),
  createdAt: Timestamp,
  updatedAt: Timestamp,
});
export type Annotation = Static<typeof Annotation>;

export const AnnotationList = listOf(Annotation);
export type AnnotationList = Static<typeof AnnotationList>;

export const AnnotationResponse = dataOf(Annotation);
export type AnnotationResponse = Static<typeof AnnotationResponse>;

export const CreateAnnotation = Type.Object({
  title: Title,
  date: DateInput,
  endDate: Type.Optional(nullable(DateInput)),
  kind: Type.Optional(AnnotationKind),
  note: Type.Optional(nullable(Note)),
  url: Type.Optional(nullable(Link)),
});
export type CreateAnnotation = Static<typeof CreateAnnotation>;

export const UpdateAnnotation = Type.Object(
  {
    title: Type.Optional(Title),
    date: Type.Optional(DateInput),
    endDate: Type.Optional(nullable(DateInput)),
    kind: Type.Optional(AnnotationKind),
    note: Type.Optional(nullable(Note)),
    url: Type.Optional(nullable(Link)),
  },
  { minProperties: 1 },
);
export type UpdateAnnotation = Static<typeof UpdateAnnotation>;

export const AnnotationsQuery = Type.Intersect([RangeQuery, PageQuery]);
export type AnnotationsQuery = Static<typeof AnnotationsQuery>;
