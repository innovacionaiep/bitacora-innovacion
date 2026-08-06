export {
  isRegisterableRole,
  isKnownRole,
  userHasEnabledRole,
  userHasAdminEnabled,
  anyRoleHasPermission,
  canActOnProjectWithRole,
  allowsMultipleParticipationRoles,
  MULTI_PARTICIPATION_EXCEPTION_EMAIL,
  normalizeEmail,
  canAssumeActiveRole,
  resolveActiveRoleUpdate,
} from './pure';
export {
  requireSession,
  requireAdmin,
  requirePermission,
  requireProjectAccess,
  requireSelfOrAdmin,
  type AuthzGate,
  type AuthzUser,
  type AuthzOk,
  type AuthzFail,
} from './guards';
