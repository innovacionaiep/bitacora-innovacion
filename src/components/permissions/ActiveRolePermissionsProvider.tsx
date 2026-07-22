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
import type { Role } from '@/lib/auth-utils';

type PermissionsContextValue = {
  permissions: RolePermissionMap;
  loading: boolean;
  refresh: () => Promise<void>;
  can: (key: PermissionKey) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function ActiveRolePermissionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const activeRole = session?.user?.activeRole ?? null;
  const [permissions, setPermissions] = useState<RolePermissionMap>(() =>
    defaultsForRole((activeRole as Role) || 'Beneficiario')
  );
  // Solo bloquear UI en la primera carga; refrescos posteriores no desmontan el layout
  const [loading, setLoading] = useState(true);
  const hasLoadedOnceRef = useRef(false);

  const refresh = useCallback(async () => {
    if (status === 'unauthenticated') {
      setLoading(false);
      hasLoadedOnceRef.current = true;
      return;
    }
    if (status === 'loading') return;
    // Evitar spinner de pantalla completa en refrescos (p. ej. tras session.update)
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
  }, [refresh, activeRole]);

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
