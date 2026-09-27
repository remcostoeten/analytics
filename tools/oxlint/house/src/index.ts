import { eslintCompatPlugin } from "@oxlint/plugins";

import { localTypeName } from "./rules/local-type-name.ts";
import { noSilentCatch } from "./rules/no-silent-catch.ts";

const housePlugin = eslintCompatPlugin({
  meta: { name: "house" },
  rules: {
    "local-type-name": localTypeName,
    "no-silent-catch": noSilentCatch,
  },
});

export default housePlugin;
