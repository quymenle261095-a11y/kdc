'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface AdminBreadcrumbContextType {
  breadcrumbTitle: string | null;
  setBreadcrumbTitle: (title: string | null) => void;
}

const AdminBreadcrumbContext = createContext<AdminBreadcrumbContextType>({
  breadcrumbTitle: null,
  setBreadcrumbTitle: () => {},
});

export function AdminBreadcrumbProvider({ children }: { children: React.ReactNode }) {
  const [breadcrumbTitle, setBreadcrumbTitle] = useState<string | null>(null);

  return (
    <AdminBreadcrumbContext.Provider value={{ breadcrumbTitle, setBreadcrumbTitle }}>
      {children}
    </AdminBreadcrumbContext.Provider>
  );
}

export function useAdminBreadcrumb() {
  return useContext(AdminBreadcrumbContext);
}

/**
 * Custom hook giúp một trang Create/Edit đăng ký tên Record hiển thị trên Breadcrumb
 */
export function useSetAdminBreadcrumb(title?: string | null) {
  const { setBreadcrumbTitle } = useAdminBreadcrumb();

  useEffect(() => {
    if (title) {
      setBreadcrumbTitle(title);
    }
    return () => {
      setBreadcrumbTitle(null);
    };
  }, [title, setBreadcrumbTitle]);
}
