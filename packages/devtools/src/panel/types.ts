import type { ID } from "@remcostoeten/analytics-shared/semantic";
import type { RefObject } from "react";

import type { Link } from "../json/tree";
import type { Tab } from "./layout";
import type { Runtime } from "./runtime";

export type Controller = {
  move: (delta: number) => void;
  activate: () => void;
  menu: () => void;
};

export type Jump = {
  tab: Tab;
  open?: ID;
  filter?: string;
};

export type BufferProps = {
  runtime: Runtime;
  filterRef: RefObject<HTMLInputElement | null>;
  register: (controller: Controller) => void;
  jump: (target: Jump) => void;
  follow: (link: Link) => void;
};
