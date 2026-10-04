---
"@spoar/sdk": patch
---

`createProxy` forwards the page's `Origin` (the site's own origin when the browser sent none) and the admin session cookie `ra.session_token`, plain or `__Secure-` prefixed, and no other cookie, so proxied events get their host, localhost and preview flags, and a signed-in admin's events are internal. It refuses bodies over 60 KB, the API's own limit. `createServerAnalytics` forwards the site's origin and the admin session cookie from a passed `request` or `headers`, takes an `origin` option on the client or per call for events sent without a request, sends events for different origins or sessions in separate requests, and exports `serverVisitor`, the id of events sent without a visitor or session.
