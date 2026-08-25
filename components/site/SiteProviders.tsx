'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CustomerAuthProvider } from '@/app/(site)/auth/context';
import { CartProvider } from '@/lib/cart';
import { CustomToaster } from '@/components/shared/CustomToaster';

import { useSiteSettings } from './hooks';


export function SiteProviders({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { siteDarkMode, isLoading } = useSiteSettings();
  const previousThemeRef = useRef<{
    colorScheme: string;
    dataTheme: string | null;
    hasDarkClass: boolean;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (isLoading) return;

    const root = document.documentElement;
    previousThemeRef.current = {
      colorScheme: root.style.colorScheme,
      dataTheme: root.getAttribute('data-theme'),
      hasDarkClass: root.classList.contains('dark'),
    };

    if (typeof window !== 'undefined') {
      try {
        const lastDefault = localStorage.getItem('site_theme_last_default');
        if (lastDefault && lastDefault !== siteDarkMode) {
          localStorage.removeItem('site_theme_override');
        }
        localStorage.setItem('site_theme_last_default', siteDarkMode);
      } catch (e) {
        console.warn('Failed to sync theme override with database defaults:', e);
      }
    }

    const applyTheme = (isFromEvent?: boolean) => {
      let isDark = false;
      
      try {
        const themeOverride = localStorage.getItem('site_theme_override');
        if (themeOverride === 'dark') {
          isDark = true;
        } else if (themeOverride === 'light') {
          isDark = false;
        } else {
          isDark = siteDarkMode === 'dark' || (siteDarkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
      } catch {
        isDark = siteDarkMode === 'dark' || (siteDarkMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      }

      const currentlyDark = root.classList.contains('dark');
      const currentlyTheme = root.getAttribute('data-theme');

      if (currentlyDark !== isDark || currentlyTheme !== (isDark ? 'dark' : 'light')) {
        root.setAttribute('data-theme', isDark ? 'dark' : 'light');
        root.style.colorScheme = isDark ? 'dark' : 'light';
        root.classList.toggle('dark', isDark);

        if (!isFromEvent) {
          window.dispatchEvent(new Event('site-theme-change'));
        }
      }
    };

    applyTheme(false);

    const handleThemeChangeEvent = () => {
      applyTheme(true);
    };

    window.addEventListener('site-theme-change', handleThemeChangeEvent);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      applyTheme(false);
    };
    if (siteDarkMode === 'system') {
      mediaQuery.addEventListener('change', handleSystemChange);
    }

    return () => {
      window.removeEventListener('site-theme-change', handleThemeChangeEvent);
      if (siteDarkMode === 'system') {
        mediaQuery.removeEventListener('change', handleSystemChange);
      }
      const previous = previousThemeRef.current;
      if (!previous) {return;}
      if (previous.dataTheme) {
        root.setAttribute('data-theme', previous.dataTheme);
      } else {
        root.removeAttribute('data-theme');
      }
      root.style.colorScheme = previous.colorScheme;
      root.classList.toggle('dark', previous.hasDarkClass);
    };
  }, [siteDarkMode, isLoading]);

  return (
    <CustomerAuthProvider>
      <CartProvider>
        {children}
        {mounted && <CustomToaster richColors position="top-right" />}
      </CartProvider>
    </CustomerAuthProvider>
  );
}
