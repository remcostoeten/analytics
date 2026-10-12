"use client";

import { Debugtools } from "@spoar/debugtools/next";

import { apiEndpoint } from "@/shared/api/endpoint";

type Props = { project: string };

export function ProjectConsole({ project }: Props) {
  return <Debugtools endpoint={apiEndpoint()} project={project} auth="session" launcher="right" />;
}
