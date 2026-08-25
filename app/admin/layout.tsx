'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CustomToaster } from '@/components/shared/CustomToaster';
import { AdminModulesProvider } from './context/AdminModulesContext';
import { SidebarProvider } from './context/SidebarContext';
import { AdminAuthProvider } from './auth/context';
import { AdminAuthGuard } from './auth/AdminAuthGuard';
import { AdminPermissionGuard } from './auth/AdminPermissionGuard';

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') {return false;}
    return localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', newMode);
  };

  return (
    <div className="admin-shell min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 flex font-sans">
      <CustomToaster position="top-right" richColors theme={isDarkMode ? 'dark' : 'light'} />
      
      <SidebarProvider>
        <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          <Header 
            isDarkMode={isDarkMode} 
            toggleTheme={toggleTheme} 
            setMobileMenuOpen={setMobileMenuOpen} 
          />

          <main className="flex-1 px-4 pt-3 pb-4 lg:px-8 lg:pt-4 lg:pb-8 overflow-x-hidden w-full max-w-[1800px] mx-auto">
            <AdminPermissionGuard>
              {children}
            </AdminPermissionGuard>
          </main>
        </div>
      </SidebarProvider>
    </div>
  );
}

import { AdminBreadcrumbProvider } from './context/AdminBreadcrumbContext';

function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Login page doesn't need full layout
  if (pathname === '/admin/auth/login') {
    return <>{children}</>;
  }
  
  return (
    <AdminAuthGuard>
      <AdminModulesProvider>
        <AdminBreadcrumbProvider>
          <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminBreadcrumbProvider>
      </AdminModulesProvider>
    </AdminAuthGuard>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthProvider>
      <AdminLayoutWrapper>{children}</AdminLayoutWrapper>
    </AdminAuthProvider>
  );
}
