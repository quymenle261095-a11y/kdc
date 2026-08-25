'use client';

import React, { useEffect, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldOff } from 'lucide-react';
import { Button } from '../components/ui';
import { useAdminModules } from '../context/AdminModulesContext';
import { useAdminAuth } from './context';
import { ADMIN_MODULE_ENTRY_ROUTES, getAdminEntryRoute, getAdminRouteAccess } from './route-access';

export function AdminPermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hasPermission, isPermissionLoading } = useAdminAuth();
  const { isLoading: isModulesLoading, isModuleEnabled, modules } = useAdminModules();
  const routeAccess = useMemo(() => getAdminRouteAccess(pathname), [pathname]);
  const isAuthorizationLoading = isModulesLoading || isPermissionLoading;

  const fallbackRoute = useMemo(() => {
    if (isAuthorizationLoading) {return null;}
    const firstAllowed = ADMIN_MODULE_ENTRY_ROUTES.find(({ action, moduleKey }) =>
      isModuleEnabled(moduleKey) && hasPermission(moduleKey, action)
    );
    return firstAllowed ? getAdminEntryRoute(firstAllowed.moduleKey) : null;
  }, [hasPermission, isAuthorizationLoading, isModuleEnabled]);

  const canAccess = routeAccess === null || (
    !isAuthorizationLoading &&
    isModuleEnabled(routeAccess.moduleKey) &&
    hasPermission(routeAccess.moduleKey, routeAccess.action)
  );
  const shouldRedirectFromDashboard = routeAccess?.moduleKey === 'analytics' && !canAccess && Boolean(fallbackRoute);

  useEffect(() => {
    if (isAuthorizationLoading || !shouldRedirectFromDashboard || !fallbackRoute) {return;}
    router.replace(fallbackRoute);
  }, [fallbackRoute, isAuthorizationLoading, router, shouldRedirectFromDashboard]);

  if (routeAccess === null) {
    return <>{children}</>;
  }

  if (isAuthorizationLoading || shouldRedirectFromDashboard) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (canAccess) {
    return <>{children}</>;
  }

  const moduleName = modules.find((moduleItem) => moduleItem.key === routeAccess.moduleKey)?.name ?? routeAccess.moduleKey;
  const isDisabledModule = !isModuleEnabled(routeAccess.moduleKey);
  const fallbackLabel = fallbackRoute ? 'Về trang được phép' : 'Quay lại Dashboard';

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
        <ShieldOff size={40} className="text-red-500" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-slate-800 dark:text-slate-200">
        {isDisabledModule ? 'Module đã bị tắt' : 'Không có quyền truy cập'}
      </h2>
      <p className="mb-6 max-w-md text-slate-500 dark:text-slate-400">
        {isDisabledModule
          ? `Module ${moduleName} hiện chưa được bật hoặc thiếu module phụ thuộc trong /system/modules.`
          : `Tài khoản của bạn chưa được cấp quyền ${routeAccess.action} cho module ${moduleName}.`}
      </p>
      <Button onClick={() => router.push(fallbackRoute ?? '/admin/dashboard')} className="gap-2">
        <ArrowLeft size={16} />
        {fallbackLabel}
      </Button>
    </div>
  );
}
