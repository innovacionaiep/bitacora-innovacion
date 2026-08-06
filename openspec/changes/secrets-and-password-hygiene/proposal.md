# secrets-and-password-hygiene

## Intent
Remove hardcoded unlock passwords and stop reversible password storage/display.

## Env (required in production)
- `CONFIG_UNLOCK_PASSWORD`
- `NOVEDADES_UNLOCK_PASSWORD`

## Rollback
Restore previous env defaults only via git revert; do not re-enable plaintext display.
