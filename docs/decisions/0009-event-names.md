# 0009 Event names

## Context

v1 has two axes for naming: `type` and `meta.eventName`, and the dashboard filters on `meta->>'eventName'` in many places.

## Decision

Recommended default: one `name` field with snake_case built-in names. During the transition, ingest maps names onto the legacy `type` and `meta.eventName` columns.

## Status

Open, default. Source: row 9 of the decisions table in [`docs/v2/plan.md`](../v2/plan.md#decisions-needed).

## Consequences

- Migration 0010 adds `events.name`.
- Built-in names are a literal union in the contract; custom names are any string of 1 to 64 characters.
- Legacy queries keep working until the dashboard moves to the v2 API.
