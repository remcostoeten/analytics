import { hydrateRoot } from "react-dom/client";

import Page from "@/app/stackly/page";

const root = document.getElementById("root");
if (root) hydrateRoot(root, <Page />);
