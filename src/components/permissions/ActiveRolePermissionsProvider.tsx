'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSession } from 'next-auth/react';
import { getMyActiveRolePermissions } from '@/lib/actions/configuracion-roles';
import {
  defaultsForRole,
  type PermissionKey,
  type RolePermissionMap,
} from '@/lib/permissions/catalog';

type PermissionsContextValue = {
  permissions: RolePermissionMap;
  loading: boolean;
  refresh: () => Promise<void>;
  can: (key: PermissionKey) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

/**
 * Provides the union of permissions for all enabled roles on the session.
 * (Name kept for import compatibility; no longer tied to a single active role.)
 */
export function ActiveRolePermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const rolesKey = (session?.user?.availableRoles ?? []).join('|');
  const [permissions, setPermissions] = useState<RolePermissionMap>(() =>
    defaultsForRole('Beneficiario')
  );
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(async () => {
    if (status === 'unauthenticated') {
      setLoading(false);
      hasLoadedOnceRef.current = true;
      return;
    }
    if (status === 'loading') return;
    if (!hasLoadedOnceRef.current) {
      setLoading(true);
    }
    const res = await getMyActiveRolePermissions();
    setPermissions(res.permissions);
    hasLoadedOnceRef.current = true;
    setLoading(false);
  }, [status]);

  useEffect(() => {
    void refresh();
  }, [refresh, rolesKey]);

  const value = useMemo<PermissionsContextValue>(
    () => ({
      permissions,
      loading,
      refresh,
      can: (key: PermissionKey) => permissions[key] === true,
    }),
    [permissions, loading, refresh]
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function useActiveRolePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    return {
      permissions: defaultsForRole('Beneficiario'),
      loading: false,
      refresh: async () => {},
      can: () => false,
    };
  }
  return ctx;
}
