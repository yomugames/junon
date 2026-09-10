# Execution plans

Use a checked-in execution plan for work that spans packages, changes a persistent
or wire contract, requires a staged migration, or is likely to continue across
multiple sessions. Small, local changes only need an ephemeral task plan.

Create active plans in `active/` using a descriptive kebab-case filename. Move
them to `completed/` after verification. Plans are living artifacts: update them
as work progresses rather than writing a retrospective at the end.

Each plan must be self-contained and include:

```md
# Outcome

The user-visible result and acceptance criteria.

## Context

Relevant architecture, files, constraints, and links to repository docs.

## Progress

- [ ] Timestamped, concrete milestone

## Implementation

Ordered steps with boundaries and compatibility strategy.

## Validation

Exact commands and observable success criteria.

## Decisions

- Date: decision, alternatives considered, and reason.

## Discoveries and risks

Unexpected facts, unresolved risks, and recovery or rollback approach.

## Result

Completed behavior, validation evidence, and remaining debt.
```

Do not place secrets, transient chat transcripts, or copied issue discussions in
a plan. Summarize durable decisions and link to repository artifacts.
