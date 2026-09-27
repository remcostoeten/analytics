import { beforeAll, describe, expect, test } from "bun:test";

import { lintCases } from "./lint";
import type { LintCase } from "./lint";

const code = "house(local-type-name)";

const cases: LintCase[] = [
  {
    name: "single local props type with another name",
    source:
      "type RowProps = { title: string };\nfunction Row({ title }: RowProps) {\n  return <li>{title}</li>;\n}",
    codes: [code],
  },
  {
    name: "arrow component",
    source:
      "type RowProps = { title: string };\nconst Row = ({ title }: RowProps) => <li>{title}</li>;",
    codes: [code],
  },
  {
    name: "exported component",
    source:
      "type RowProps = { title: string };\nexport function Row(props: RowProps) {\n  return <li>{props.title}</li>;\n}",
    codes: [code],
  },
  {
    name: "type named Props",
    source:
      "type Props = { title: string };\nfunction Row({ title }: Props) {\n  return <li>{title}</li>;\n}",
    codes: [],
  },
  {
    name: "exported type",
    source:
      "export type RowProps = { title: string };\nfunction Row({ title }: RowProps) {\n  return <li>{title}</li>;\n}",
    codes: [],
  },
  {
    name: "two local types",
    source:
      "type Item = { title: string };\ntype RowProps = { item: Item };\nfunction Row({ item }: RowProps) {\n  return <li>{item.title}</li>;\n}",
    codes: [],
  },
  {
    name: "type not used as component props",
    source:
      "type Entry = { title: string };\nfunction format(entry: Entry) {\n  return entry.title;\n}",
    codes: [],
  },
];

describe("house/local-type-name", () => {
  let results: string[][] = [];

  beforeAll(async () => {
    results = await lintCases(cases, "tsx", "local-type-name");
  });

  for (const [index, { name, codes }] of cases.entries()) {
    test(name, () => {
      expect(results[index]).toEqual(codes);
    });
  }
});
