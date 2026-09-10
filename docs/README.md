# Documentation index

The repository is the system of record for engineering knowledge. `AGENTS.md` is
the short navigation layer; these documents contain detail that should evolve
with the code.

## Core documents

- [Architecture](../ARCHITECTURE.md): components, responsibilities, contracts,
  and dependency guidance.
- [Development](development.md): prerequisites, setup, and run/build commands.
- [Testing](testing.md): test layout, focused commands, and validation strategy.
- [Production deployment](deployment.md): automatic production deployment and
  its required GitHub configuration.
- [Execution plans](exec-plans/README.md): format and lifecycle for substantial
  work.

## Documentation rules

- Prefer facts that can be checked against code, scripts, or configuration.
- State whether a rule is enforced by tooling or is only a convention.
- Link to a canonical document instead of duplicating long instructions.
- Update documentation in the same change as the behavior it describes.
- Move completed execution plans to `exec-plans/completed/`; keep decisions and
  surprising discoveries because they are durable context.
- Do not store credentials, private user data, or copied production logs here.

## Known documentation gaps

These areas should gain documents when related work makes the knowledge concrete:

- public WebSocket events and payload contracts;
- save-format versioning and upgrade procedure;
- observability queries and service-level expectations;
- an automated architecture and documentation validation suite.
