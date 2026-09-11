'use client';

import { createContext, useContext, type ReactNode } from 'react';

const PublicProjectViewContext = createContext(false);

export function PublicProjectViewProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PublicProjectViewContext.Provider value={true}>
      {children}
    </PublicProjectViewContext.Provider>
  );
}

export function usePublicReadOnly(): boolean {
  return useContext(PublicProjectViewContext);
}
