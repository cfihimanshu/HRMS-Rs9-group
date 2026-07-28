# Database migration policy

Production request handlers must never call `sync({ alter: true })`, drop
columns, or run ad-hoc `ALTER TABLE` statements.

Schema changes must be:

1. written as an idempotent, reviewed migration;
2. backed up before execution;
3. tested against a staging copy of the production schema;
4. executed separately from the web server deployment;
5. recorded with a unique migration identifier.

Never run migrations automatically against the live database during application
startup or an HTTP request.
