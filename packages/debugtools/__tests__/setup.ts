import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register({ url: "https://site.example/cars" });

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
