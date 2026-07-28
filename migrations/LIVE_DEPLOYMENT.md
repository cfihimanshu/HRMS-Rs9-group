# Live database deployment

Never point the development `.env` at production. Keep production credentials in
an uncommitted `.env.production` file on the deployment machine.

## Pre-deployment

1. Put the application in maintenance/read-only mode.
2. Confirm the target database name and host.
3. Create and verify a backup:

```bash
DB_ENV_FILE=.env.production npm run db:backup
```

4. Run the read-only audit:

```bash
DB_ENV_FILE=.env.production npm run db:audit
```

5. List pending migrations without applying them:

```bash
DB_ENV_FILE=.env.production npm run db:migrate:check
```

## Apply

```bash
DB_ENV_FILE=.env.production npm run db:migrate
npm run typecheck
npm run lint
npm run build
```

After deployment, verify login, attendance punch, task creation, legal-work
submission, notice history, audit trail and exports before ending maintenance.

## Rollback

Stop the application, create a copy of the failed database for investigation,
then restore the most recent verified SQL backup into a fresh database. Point
the application to the restored database and redeploy the previous application
version. Do not attempt partial manual rollback on the live database.
