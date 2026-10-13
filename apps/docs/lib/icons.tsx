import {
  BookOpen,
  Boxes,
  Bug,
  Cable,
  CircleHelp,
  Cloud,
  Code,
  Component,
  Cpu,
  FileCode,
  Gauge,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Plug,
  Puzzle,
  Rocket,
  Server,
  Settings2,
  Shield,
  Terminal,
  TriangleAlert,
  Users,
  Wrench,
  Zap,
} from "lucide-react";
import { createElement } from "react";

const icons = {
  BookOpen,
  Boxes,
  Bug,
  Cable,
  CircleHelp,
  Cloud,
  Code,
  Component,
  Cpu,
  FileCode,
  Gauge,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Plug,
  Puzzle,
  Rocket,
  Server,
  Settings2,
  Shield,
  Terminal,
  TriangleAlert,
  Users,
  Wrench,
  Zap,
};

type IconName = keyof typeof icons;

function isIconName(name: string): name is IconName {
  return name in icons;
}

export function resolveIcon(name: string | undefined) {
  if (!name || !isIconName(name)) return undefined;
  return createElement(icons[name]);
}
