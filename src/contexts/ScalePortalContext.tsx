'use client';

import React, { createContext, useContext } from 'react';

const ScalePortalContext = createContext<HTMLElement | null>(null);

export function useScalePortalContainer(): HTMLElement | null {
  return useContext(ScalePortalContext);
}

interface ScalePortalProviderProps {
  children: React.ReactNode;
  container: HTMLElement | null;
}

export function ScalePortalProvider({ children, container }: ScalePortalProviderProps) {
  return (
    <ScalePortalContext.Provider value={container}>
      {children}
    </ScalePortalContext.Provider>
  );
}
