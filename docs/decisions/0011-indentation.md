# 0011 Indentation

## Context

The repo used tabs through `.editorconfig`; Skriuw uses oxfmt's defaults.

## Decision

Adopt Skriuw's oxfmt defaults and reformat the repo once in the phase 0 lint PR, instead of keeping tabs.

## Status

Settled. Source: row 11 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- The whole repo, v1 included, was reformatted to 2 spaces and a 100-column width in one commit.
- JSON and Markdown files are not formatted by oxfmt and keep their existing style.
- Both repos read the same.
