# Seed quarantine

The `prisma/seed*.ts` scripts in this folder are **legacy and quarantined**.

## Absolute policy

- Do **not** run `prisma db seed`, `pnpm exec prisma db seed`, or any `seed*.ts` script.
- Do **not** expand these files or add new seeds.
- Many of them call `deleteMany` / insert fictitious rows and violate the project rule `no-db-destructive-or-seed`.

Load real catalog data only through authorized application flows.
