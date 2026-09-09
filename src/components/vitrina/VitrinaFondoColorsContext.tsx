'use client';

import { createContext, useContext, type ReactNode } from 'react';

const VitrinaFondoColorsContext = createContext<Record<string, string>>({});

export function VitrinaFondoColorsProvider({
  colors,
  children,
}: {
  colors: Record<string, string>;
  children: ReactNode;
}) {
  return (
    <VitrinaFondoColorsContext.Provider value={colors}>
      {children}
    </VitrinaFondoColorsContext.Provider>
  );
}

export function useVitrinaFondoColors(): Record<string, string> {
  return useContext(VitrinaFondoColorsContext);
}
