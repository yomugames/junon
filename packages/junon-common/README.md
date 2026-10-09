Junon Common
======

Code shared by the game server and client: protobuf wire and save schemas
(`protocol/`), world-save reading and writing, hosted-save import, the SQLite
models (`db/`), socket framing, logging and error reporting. See
[ARCHITECTURE.md](../../ARCHITECTURE.md).

The database has no migrations: `db/standalone_schema.js` creates missing tables
and columns from the models when the server starts.
