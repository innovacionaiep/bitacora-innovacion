# Spec: server-action-authz

## Requirements

### R1 — Session required for mutations
Server Action mutations MUST reject unauthenticated callers with a structured error.

### R2 — Project mutations require participation
Given a user with activeRole R and permission `view.proyectos`, When they mutate project content, Then they MUST be a participant with role R (Admin exempt).

### R3 — JWT activeRole update
Given a session.update({ activeRole }), When the role is not in the user's availableRoles from DB, Then the token activeRole MUST remain unchanged.

### R4 — Profile IDOR
Given user A, When A calls profile mutators with userId of B, Then the action MUST fail unless A is Admin.

### R5 — Sign-up roles
Given public registration, When initialRole is Admin or unknown, Then signUp MUST fail.

## Scenarios

### S1 JWT escalation rejected
- Given availableRoles = [Coordinador]
- When update requests activeRole=Admin
- Then resolveActiveRoleUpdate returns null

### S2 Register Admin rejected
- Given initialRole=Admin
- When signUp is called
- Then success is false
