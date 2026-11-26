---
"@spoar/client": minor
"@spoar/sdk": minor
---

Projects gain `replayEnabled` and `llmEnabled`, both off by default. They turn on session replay and LLM observability per project and are set with `PATCH /v2/projects/:project`.
