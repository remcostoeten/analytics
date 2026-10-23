---
"@spoar/sdk": minor
---

Reads the Spoar names next to the old `ra` ones: `NEXT_PUBLIC_SPOAR_CONFIG`, `PUBLIC_SPOAR_CONFIG`, `VITE_SPOAR_CONFIG` and `SPOAR_CONFIG`, the `?spoar=` URL flags, `data-spoar-click` and `data-spoar-prop-*`, `<meta name="spoar-not-found">`, and `x-spoar-signature` and `x-spoar-timestamp` in `verifyAlert`. The old names keep working, and the Spoar names win when both are set. Console lines start with `[spoar]`. A 1.x session id in `sessionStorage` is no longer carried over; the 1.x visitor id still is.
