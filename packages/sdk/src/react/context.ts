import { createContext } from "react";

import type { Analytics } from "../core/types";

export const AnalyticsContext = createContext<Analytics | null>(null);
