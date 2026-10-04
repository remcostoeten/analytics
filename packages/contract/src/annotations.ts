import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { PageQuery, RangeQuery } from "./common";
import { dataOf, Day, listOf, nullable, oneOf, Timestamp } from "./schema";
import annotationList from "../fixtures/AnnotationList/valid/week.json";
import annotationResponse from "../fixtures/AnnotationResponse/valid/incident.json";
import createAnnotation from "../fixtures/CreateAnnotation/valid/release.json";
import updateAnnotation from "../fixtures/UpdateAnnotation/valid/clear-end-date.json";

export const AnnotationKind = oneOf(["release", "post", "content", "incident", "other"], {
  description: "What the label marks; `other` by default.",
});
export type AnnotationKind = Static<typeof AnnotationKind>;

const Title = Type.String({ minLength: 1, maxLength: 120 });
const Note = Type.String({ minLength: 1, maxLength: 2000, description: "Longer free text." });
const Link = Type.String({
  format: "uri",
  pattern: "^https?://",
  maxLength: 2048,
  description: "An `http://` or `https://` URL, such as the release notes or the post.",
});
const DateInput = Type.Union([Day, Timestamp], {
  description: "A calendar date such as `2026-10-01`, read as its start in UTC, or a timestamp.",
});

export const Annotation = Type.Object(
  {
    id: Type.String({
      minLength: 1,
      maxLength: 128,
      description: "The annotation id (`ann_...`).",
    }),
    project: Type.String({ minLength: 1, maxLength: 128, description: "The project id." }),
    title: Title,
    date: Type.String({
      format: "date-time",
      description: "When it happened, or when a span starts.",
    }),
    endDate: nullable(
      Type.String({ format: "date-time", description: "End of a span; null for a single moment." }),
    ),
    kind: AnnotationKind,
    note: nullable(Note),
    url: nullable(Link),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  },
  { description: "A dated label on a project's time series, such as a release or an incident." },
);
export type Annotation = Static<typeof Annotation>;

export const AnnotationList = listOf(Annotation, {
  examples: [annotationList],
});
export type AnnotationList = Static<typeof AnnotationList>;

export const AnnotationResponse = Type.Object(dataOf(Annotation).properties, {
  examples: [annotationResponse],
});
export type AnnotationResponse = Static<typeof AnnotationResponse>;

export const CreateAnnotation = Type.Object(
  {
    title: Title,
    date: DateInput,
    endDate: Type.Optional(nullable(DateInput)),
    kind: Type.Optional(AnnotationKind),
    note: Type.Optional(nullable(Note)),
    url: Type.Optional(nullable(Link)),
  },
  {
    description: "Send `endDate` to mark a span; it cannot be before `date`.",
    examples: [createAnnotation],
  },
);
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
  {
    minProperties: 1,
    description:
      "Only the fields sent are changed; `null` clears `endDate`, `note` or `url`. Send at least one.",
    examples: [updateAnnotation],
  },
);
export type UpdateAnnotation = Static<typeof UpdateAnnotation>;

export const AnnotationsQuery = Type.Intersect([RangeQuery, PageQuery]);
export type AnnotationsQuery = Static<typeof AnnotationsQuery>;
