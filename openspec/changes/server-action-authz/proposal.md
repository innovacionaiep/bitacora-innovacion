# server-action-authz

## Intent
Close Critical authz gaps: unauthenticated mutations, JWT activeRole escalation, IDOR on profile actions, unrestricted signUp roles.

## Capabilities
- server-action-authz

## Rollback
Revert `src/lib/authz/**`, JWT callback changes, and auth gates on actions. No schema migration.

## Status
Applied (implementation in tree).
