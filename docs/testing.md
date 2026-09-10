# Testing and validation

## Current state

Jest 24 is installed in the `junon-io` workspace and tests live beneath
`packages/junon-io/test/`. There is currently no root or workspace `test` npm
script and no repository-level lint command. Do not claim `npm test` or a lint
suite passed unless those scripts are added and run.

Some suites are focused simulation tests; directories named `load_testing` and
`memleak` may be slow, stateful, or resource-intensive. Inspect a test before
running it.

## Commands

From the repository root, run one focused suite:

```sh
npm exec --workspace packages/junon-io -- jest test/pressure/pressure.test.js --runInBand
```

Run the ordinary test tree while excluding explicitly heavy suites:

```sh
npm exec --workspace packages/junon-io -- jest test --runInBand \
  --testPathIgnorePatterns=/load_testing/ /memleak/
```

Run all discovered Jest tests only when the environment and task justify the
heavier checks:

```sh
npm exec --workspace packages/junon-io -- jest test --runInBand
```

Validate client bundling after browser, shared-game, asset, protocol, or Gulp
changes:

```sh
npm run client:build
```

## Validation by change type

| Change | Minimum useful validation |
| --- | --- |
| Pure server/game logic | Closest focused Jest suite; add a regression test |
| Client UI or assets | Client build plus manual browser flow when available |
| Shared game entity/interface | Focused tests and client build; inspect both sides |
| Protobuf contract | Client build and affected server/client message flow |
| Save serialization | Round-trip fixtures across relevant format versions |
| Database model/migration | Migration on a disposable database and model path |
| Matchmaker/API | Focused request/socket reproduction with isolated dependencies |
| Startup/configuration | Start the affected service in the intended `NODE_ENV` |

## Writing tests

- Reproduce the failure before fixing a bug when practical.
- Keep unit-like tests deterministic; avoid timers, public networks, and shared
  production services.
- Test contract boundaries and compatibility, not private implementation details.
- Place tests near the existing subsystem directory under `test/`.
- Do not weaken or skip an existing assertion merely to make a change pass.

## Reporting

At handoff, name the exact commands run and their outcomes. If MySQL, credentials,
native modules, browsers, or external services prevented validation, state that
constraint and the narrower checks that did run.
