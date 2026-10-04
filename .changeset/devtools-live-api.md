---
"@spoar/devtools": minor
---

The widget reads the real API: it maps the API's answers to the panel, streams events, logs, visitors and sessions over the `live` WebSocket with resume from cursors, a new token on close code 4001 and a fallback to server-sent events and polling, and posts SDK reports as `{ logs }` in batches of 20 with the project's public key. New `live` option to skip the socket. The fixtures now answer in the API's shapes. Visitor rows show whether a visitor is identified instead of a user id, consent and vitals.
