# Database schema ownership

The PostgreSQL schema is externally managed. Its provisioning and evolution
mechanism is not part of this repository and is not required for ordinary
application builds.

MercurionWebNode connects to an already provisioned schema. It always keeps
TypeORM `synchronize` and `migrationsRun` disabled, and it does not expose
commands that create, migrate, revert, drop or otherwise mutate database
schema objects.

Entity metadata documents the application-side contract only. A mismatch
between that metadata and an environment is reported as an environment/schema
compatibility incident; the application must not attempt an automatic repair.

Database changes must be applied through the external schema owner before code
that requires them is made available in that environment.
