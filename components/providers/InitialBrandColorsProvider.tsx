'use client';

import React, { createContext, useContext } from 'react';
import { useServerInsertedHTML } from 'next/navigation';

type BrandMode = 'single' | 'dual';

type InitialBrandColors = {
  primary: string;
  secondary: string;
  mode: BrandMode;
};

const InitialBrandColorsContext = createContext<InitialBrandColors | null>(null);

export function InitialBrandColorsProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: InitialBrandColors;
}) {
  useServerInsertedHTML(() => {
    return (
      <script
        id="theme-initializer"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var override = localStorage.getItem('site_theme_override');
                if (override === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.setAttribute('data-theme', 'dark');
                } else if (override === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.setAttribute('data-theme', 'light');
                }
              } catch (e) {}
            })();
          `,
        }}
      />
    );
  });

  return (
    <InitialBrandColorsContext.Provider value={value}>
      {children}
    </InitialBrandColorsContext.Provider>
  );
}

export function useInitialBrandColors() {
  return useContext(InitialBrandColorsContext);
}
