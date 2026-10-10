export type FieldKind = "string" | "number" | "boolean" | "time";

export type DatasetField = {
  name: string;
  kind: FieldKind;
};

export type Dataset = {
  name: string;
  fields: DatasetField[];
};

export type QuickQueryIcon = "list" | "trend";

export type QuickQuery = {
  label: string;
  icon: QuickQueryIcon;
};

export type AgentStepKind = "status" | "bullet" | "paragraph";

export type AgentStep = {
  kind: AgentStepKind;
  text: string;
};

export type AgentScript = {
  name: string;
  prompt: string;
  steps: AgentStep[];
  followUp: string;
  footer: string;
};

export type ConsoleData = {
  tabs: string[];
  timeRange: string;
  query: string[];
  keywords: string[];
  datasets: Dataset[];
  quickQueries: QuickQuery[];
  recentQueries: string[][];
  agent: AgentScript;
};
