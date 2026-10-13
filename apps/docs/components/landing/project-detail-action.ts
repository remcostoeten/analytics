"use server";

import { readProjectDetail, type ProjectDetail } from "@/lib/showcase";
import type { Nullable } from "@spoar/shared/semantic";

/**
 * @name openProjectDetail
 * @description The action behind a project card on the landing page: reads that project's
 * detail on the server once the card is opened. Anything but a public project id answers null.
 *
 * @example
 * const detail = await openProjectDetail(project.id);
 */
export async function openProjectDetail(id: string): Promise<Nullable<ProjectDetail>> {
  return readProjectDetail(id);
}
