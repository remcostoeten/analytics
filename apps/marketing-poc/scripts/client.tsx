import { hydrateRoot } from "react-dom/client";

import StacklyPage from "@/app/stackly/page";
import TerminalPage from "@/app/terminal/page";

const root = document.getElementById("root");
const variant = root?.getAttribute("data-variant");
if (root) hydrateRoot(root, variant === "terminal" ? <TerminalPage /> : <StacklyPage />);
