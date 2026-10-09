import type { Annotation, AnnotationKind } from "@spoar/contract";

export type PlacedAnnotation = {
  annotation: Annotation;
  index: number;
  endIndex: number | null;
};

export const kindLabels: { [Kind in AnnotationKind]: string } = {
  release: "Release",
  post: "Post",
  content: "Content",
  incident: "Incident",
  other: "Note",
};

export const annotationKinds = [
  "release",
  "post",
  "content",
  "incident",
  "other",
] as const satisfies readonly AnnotationKind[];

export type CalendarDate = `${number}-${number}-${number}`;

/**
 * @name isCalendarDate
 * @description Whether a date input's value is a `YYYY-MM-DD` calendar date, which the API reads
 * as the start of that day in UTC.
 *
 * @example
 * isCalendarDate("2026-10-09"); // true
 */
export function isCalendarDate(value: string): value is CalendarDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function bucketWidth(buckets: string[]) {
  const first = buckets[0];
  const second = buckets[1];
  if (first !== undefined && second !== undefined) return Date.parse(second) - Date.parse(first);
  return 86_400_000;
}

/**
 * @name placeAnnotations
 * @description Where each annotation sits on a chart whose x axis is a list of bucket starts: a
 * fractional bucket index for its date, and one for its end date on a span. Annotations outside
 * the charted range are left out, and a span is clipped to the range.
 *
 * @example
 * placeAnnotations(annotations, series.data.map((point) => point.bucket));
 * // [{ annotation, index: 2.5, endIndex: null }]
 */
export function placeAnnotations(annotations: Annotation[], buckets: string[]): PlacedAnnotation[] {
  const first = buckets[0];
  if (first === undefined) return [];
  const start = Date.parse(first);
  const width = bucketWidth(buckets);
  const last = buckets.length - 1;
  const end = start + (last + 1) * width;
  const placed: PlacedAnnotation[] = [];
  for (const annotation of annotations) {
    const at = Date.parse(annotation.date);
    const until = annotation.endDate === null ? null : Date.parse(annotation.endDate);
    if (Number.isNaN(at) || at >= end || (until ?? at) < start) continue;
    const index = Math.max(0, (at - start) / width);
    const endIndex = until === null ? null : Math.min(last, (until - start) / width);
    placed.push({ annotation, index: Math.min(last, index), endIndex });
  }
  return placed.sort((left, right) => left.index - right.index);
}

/**
 * @name calendarDay
 * @description The UTC calendar date of a timestamp, as a date input value.
 *
 * @example
 * calendarDay("2026-10-09T14:05:00Z"); // "2026-10-09"
 */
export function calendarDay(timestamp: string) {
  return timestamp.slice(0, 10);
}
