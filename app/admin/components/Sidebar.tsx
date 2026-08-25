'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from 'convex/react';
import { 
  Bell, Briefcase, CalendarDays, ChevronRight, ChevronsLeft, GraduationCap,
  ChevronsRight, FileText, Globe, Image as ImageIcon, Inbox, LayoutDashboard, LayoutGrid, Loader2,
  Settings, ShoppingCart, Ticket, Users, X, BookOpen
} from 'lucide-react';
import { cn } from './ui';
import { api } from '@/convex/_generated/api';
import { useAdminModules } from '../context/AdminModulesContext';
import { useSidebarState } from '../context/SidebarContext';
import { useAdminAuth } from '../auth/context';

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  active: boolean;
  subItems?: { label: string, href: string, moduleKey?: string, visible?: boolean }[];
  isCollapsed: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  pathname: string;
  isModuleEnabled: (key: string) => boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: Icon, 
  label, 
  href, 
  active, 
  subItems, 
  isCollapsed, 
  isExpanded, 
  onToggle,
  pathname,
  isModuleEnabled
}) => {
  const { hasPermission } = useAdminAuth();
  const filteredSubItems = useMemo(() => {
    if (!subItems) {return [];}
    return subItems.filter((sub) =>
      (sub.visible ?? true) &&
      (!sub.moduleKey || (isModuleEnabled(sub.moduleKey) && hasPermission(sub.moduleKey, 'view')))
    );
  }, [hasPermission, subItems, isModuleEnabled]);

  const hasSub = filteredSubItems.length > 0;

  const handleClick = (e: React.MouseEvent) => {
    if (hasSub) {
      e.preventDefault();
      onToggle();
    }
  };

  if (subItems && filteredSubItems.length === 0) {
    return null;
  }

  return (
    <div className="mb-1 group relative">
      {hasSub ? (
        <button 
          onClick={handleClick}
          className={cn(
            "w-full flex items-center transition-all duration-200 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            isCollapsed ? "justify-center p-2" : "justify-between px-3 py-2",
            active 
              ? "bg-blue-50/90 text-blue-600 font-semibold border-l-4 border-blue-600 rounded-l-none dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500" 
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
          )}
          title={isCollapsed ? label : undefined}
        >
          <div className={cn("flex items-center", isCollapsed ? "gap-0" : "gap-2.5")}>
            <Icon size={isCollapsed ? 20 : 19} className={cn("shrink-0 transition-transform duration-200 group-hover:scale-105", active ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400")} />
            <span className={cn("text-sm font-medium whitespace-nowrap transition-all duration-300 origin-left", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
              {label}
            </span>
          </div>
          {!isCollapsed && (
            <ChevronRight size={15} className={cn("transition-transform duration-200 opacity-80", active ? "text-blue-600 dark:text-blue-400" : "text-slate-400", isExpanded && "rotate-90")} />
          )}
        </button>
      ) : (
        <Link 
          href={href} 
          className={cn(
            "flex items-center transition-all duration-200 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            isCollapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2",
            active 
              ? "bg-blue-50/90 text-blue-600 font-semibold border-l-4 border-blue-600 rounded-l-none dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-500" 
              : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100"
          )}
          title={isCollapsed ? label : undefined}
        >
          <Icon size={isCollapsed ? 20 : 19} className={cn("shrink-0 transition-transform duration-200 group-hover:scale-105", active ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400")} />
          <span className={cn("text-sm font-medium whitespace-nowrap transition-all duration-300 origin-left", isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100")}>
            {label}
          </span>
        </Link>
      )}
      
      {hasSub && (
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isExpanded && !isCollapsed ? "max-h-[500px] opacity-100 mt-0.5" : "max-h-0 opacity-0"
        )}>
          <div className="ml-3.5 border-l-2 border-slate-200 dark:border-slate-800 pl-2.5 space-y-0.5 my-1">
            {filteredSubItems.map((sub) => (
              <Link 
                key={sub.href} 
                href={sub.href}
                className={cn(
                  "block px-2.5 py-1.5 rounded-md text-xs sm:text-sm transition-colors truncate relative font-medium",
                  pathname === sub.href || pathname.startsWith(sub.href + '/')
                    ? "text-blue-600 bg-blue-50/90 font-semibold dark:text-blue-400 dark:bg-blue-950/30" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/60"
                )}
              >
                {sub.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileMenuOpen, setMobileMenuOpen }) => {
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useSidebarState();
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const pathname = usePathname();
  const { isModuleEnabled, isLoading } = useAdminModules();
  const { hasPermission, isPermissionLoading } = useAdminAuth();
  const productSettings = useQuery(api.admin.modules.listModuleSettings, { moduleKey: 'products' });
  const trustPagesFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: 'settings', featureKey: 'enableTrustPages' });
  const courseFiltersFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: 'courses', featureKey: 'enableCourseFilters' });
  const resourceFiltersFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: 'resources', featureKey: 'enableResourceFilters' });
  const miniAppsAdminFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: 'miniApps', featureKey: 'enableAdminWorkspace' });
  const miniApps = useQuery(api.miniApps.listEnabledForAdmin);

  const isActive = (route: string) => pathname.startsWith(route);

  const activeMenu = useMemo(() => {
    if (pathname.startsWith('/admin/posts') || pathname.startsWith('/admin/post-categories') || pathname.startsWith('/admin/comments')) {
      return 'Quản lý bài viết';
    }
    if (pathname.startsWith('/admin/courses') || pathname.startsWith('/admin/course-categories')) {
      return 'Khóa học';
    }
    if (pathname.startsWith('/admin/resources') || pathname.startsWith('/admin/resource-categories')) {
      return 'Tài nguyên';
    }
    if (pathname.startsWith('/admin/projects') || pathname.startsWith('/admin/project-categories')) {
      return 'Dự án';
    }
    if (
      pathname.startsWith('/admin/products') ||
      pathname.startsWith('/admin/categories') ||
      pathname.startsWith('/admin/product-options') ||
      pathname.startsWith('/admin/customers') ||
      pathname.startsWith('/admin/reviews') ||
      pathname.startsWith('/admin/orders') ||
      pathname.startsWith('/admin/wishlist')
    ) {
      return 'Bán hàng & sản phẩm';
    }
    if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles')) {
      return 'Người dùng';
    }
    if (pathname.startsWith('/admin/menus') || pathname.startsWith('/admin/home-components') || pathname.startsWith('/admin/trust-pages')) {
      return 'Website';
    }
    if (pathname.startsWith('/admin/settings')) {
      return 'Cài đặt';
    }
    if (pathname.startsWith('/admin/mini-apps') || pathname.startsWith('/admin/kanban')) {
      return 'Mini Apps';
    }
    if (pathname.startsWith('/admin/bookings')) {
      return 'Dịch vụ';
    }
    return null;
  }, [pathname]);

  const currentExpandedMenu = expandedMenu ?? activeMenu;

  const handleMenuToggle = (label: string) => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      setExpandedMenu(label);
    } else {
      setExpandedMenu(expandedMenu === label ? null : label);
    }
  };

  const canViewModule = useCallback((moduleKey: string) =>
    isModuleEnabled(moduleKey) && hasPermission(moduleKey, 'view'),
  [hasPermission, isModuleEnabled]);

  const showAnalyticsSection = canViewModule('analytics');
  const showPostsSection = canViewModule('posts');
  const showPostComments = canViewModule('posts') && canViewModule('comments');
  const showCoursesSection = canViewModule('courses');
  const showResourcesSection = canViewModule('resources');
  const showProjectsSection = canViewModule('projects');
  const showCatalogsSection = canViewModule('catalogs');
  const showServicesSection = canViewModule('services');
  const showBookingsSection = canViewModule('bookings');
  const showCommerceSection = canViewModule('products') || canViewModule('customers') || canViewModule('orders') || canViewModule('cart') || canViewModule('wishlist');
  const showProductReviews = canViewModule('products') && canViewModule('comments');
  const showMediaSection = canViewModule('media');
  const showUsersSection = canViewModule('users') || canViewModule('roles');
  const showWebsiteSection = canViewModule('menus') || canViewModule('homepage') || canViewModule('settings');
  const showMiniAppsSection = canViewModule('miniApps') && (miniAppsAdminFeature?.enabled ?? true);
  const showSubscriptionsSection = canViewModule('subscriptions');
  const showSettingsSection = canViewModule('settings');
  const showContactInboxSection = canViewModule('contactInbox');
  const showNotificationsSection = canViewModule('notifications');
  const showPromotionsSection = canViewModule('promotions');
  const variantEnabled = Boolean(productSettings?.find(setting => setting.settingKey === 'variantEnabled')?.value);
  const productTypesEnabled = Boolean(productSettings?.find(setting => setting.settingKey === 'enableProductTypes')?.value);

  const miniAppSubItems = useMemo(() => [
    { href: '/admin/mini-apps', label: 'Tổng quan' },
    ...(miniApps ?? [])
      .filter(app => app.adminEnabled && app.key !== 'cv-builder')
      .map(app => ({
        href: `/admin/mini-apps/${app.key}`,
        label: app.name.replace(/\s+Mini App$/i, ''),
      })),
  ], [miniApps]);

  return (
    <>
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-r border-slate-200/80 dark:border-slate-800 z-50 transition-all duration-300 ease-in-out flex flex-col shadow-sm lg:shadow-none",
        isSidebarCollapsed ? "lg:w-[72px]" : "lg:w-[255px]",
        mobileMenuOpen ? "translate-x-0 w-[255px]" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Mobile menu close bar */}
        <div className="lg:hidden flex items-center justify-between h-12 px-4 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Menu</span>
          <button onClick={() => setMobileMenuOpen(false)}>
            <X size={18} className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" />
          </button>
        </div>

        {isLoading || isPermissionLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={22} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="admin-sidebar-scroll flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {/* Dashboard / Analytics */}
            {showAnalyticsSection && (
              <SidebarItem 
                icon={LayoutDashboard} 
                label="Tổng quan" 
                href="/admin/dashboard" 
                active={pathname === '/admin/dashboard' || pathname === '/admin'} 
                isCollapsed={isSidebarCollapsed}
                isExpanded={false}
                onToggle={() => {}}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
              />
            )}

            {/* Posts Section */}
            {showPostsSection && (
              <SidebarItem 
                icon={FileText} 
                label="Quản lý bài viết" 
                href="/admin/posts" 
                active={isActive('/admin/posts') || isActive('/admin/post-categories') || isActive('/admin/comments')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Quản lý bài viết'}
                onToggle={() => handleMenuToggle('Quản lý bài viết')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={[
                  { href: '/admin/posts', label: 'Tất cả bài viết', moduleKey: 'posts' },
                  { href: '/admin/post-categories', label: 'Danh mục bài viết', moduleKey: 'posts' },
                  ...(showPostComments ? [{ href: '/admin/comments', label: 'Bình luận', moduleKey: 'comments' }] : []),
                ]}
              />
            )}

            {/* Courses Section */}
            {showCoursesSection && (
              <SidebarItem
                icon={GraduationCap}
                label="Khóa học"
                href="/admin/courses"
                active={isActive('/admin/courses') || isActive('/admin/course-categories') || isActive('/admin/courses/filters')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Khóa học'}
                onToggle={() => handleMenuToggle('Khóa học')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={[
                  { href: '/admin/courses', label: 'Tất cả khóa học', moduleKey: 'courses' },
                  { href: '/admin/course-categories', label: 'Danh mục khóa học', moduleKey: 'courses' },
                  ...(courseFiltersFeature?.enabled ? [{ href: '/admin/courses/filters', label: 'Bộ lọc khóa học', moduleKey: 'courses' }] : []),
                  { href: '/admin/courses/students', label: 'Học viên', moduleKey: 'courses' },
                ]}
              />
            )}

            {/* Resources Section */}
            {showResourcesSection && (
              <SidebarItem
                icon={FileText}
                label="Tài nguyên"
                href="/admin/resources"
                active={isActive('/admin/resources') || isActive('/admin/resource-categories')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Tài nguyên'}
                onToggle={() => handleMenuToggle('Tài nguyên')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={[
                  { href: '/admin/resources', label: 'Tất cả tài nguyên', moduleKey: 'resources' },
                  { href: '/admin/resource-categories', label: 'Danh mục tài nguyên', moduleKey: 'resources' },
                  ...(resourceFiltersFeature?.enabled ? [{ href: '/admin/resources/filters', label: 'Bộ lọc tài nguyên', moduleKey: 'resources' }] : []),
                  { href: '/admin/resources/customers', label: 'Người mua và tải', moduleKey: 'resources' },
                ]}
              />
            )}

            {/* Projects Section */}
            {showProjectsSection && (
              <SidebarItem
                icon={Briefcase}
                label="Dự án"
                href="/admin/projects"
                active={isActive('/admin/projects') || isActive('/admin/project-categories')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Dự án'}
                onToggle={() => handleMenuToggle('Dự án')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={[
                  { href: '/admin/projects', label: 'Tất cả dự án', moduleKey: 'projects' },
                  { href: '/admin/project-categories', label: 'Danh mục dự án', moduleKey: 'projects' },
                ]}
              />
            )}

            {/* Catalogs Section */}
            {showCatalogsSection && (
              <SidebarItem
                icon={BookOpen}
                label="Catalog"
                href="/admin/catalogs"
                active={isActive('/admin/catalogs')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Catalog'}
                onToggle={() => handleMenuToggle('Catalog')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
              />
            )}

            {/* Services Section */}
            {showServicesSection && (
              <SidebarItem 
                icon={Briefcase} 
                label="Dịch vụ" 
                href="/admin/services" 
                active={isActive('/admin/services') || isActive('/admin/service-categories') || isActive('/admin/bookings')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Dịch vụ'}
                onToggle={() => handleMenuToggle('Dịch vụ')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={[
                  { href: '/admin/services', label: 'Tất cả dịch vụ', moduleKey: 'services' },
                  { href: '/admin/service-categories', label: 'Danh mục dịch vụ', moduleKey: 'services' },
                  ...(showBookingsSection ? [{ href: '/admin/bookings', label: 'Đặt lịch', moduleKey: 'bookings' }] : []),
                  ...(showBookingsSection ? [{ href: '/admin/bookings/settings', label: 'Cài đặt lịch', moduleKey: 'bookings' }] : []),
                ]}
              />
            )}

            {/* Commerce Section */}
            {showCommerceSection && (
              <SidebarItem 
                icon={ShoppingCart} 
                label="Bán hàng & sản phẩm" 
                href="/admin/products"
                active={isActive('/admin/products') || isActive('/admin/categories') || isActive('/admin/product-options') || isActive('/admin/customers') || isActive('/admin/reviews') || isActive('/admin/orders') || isActive('/admin/wishlist')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Bán hàng & sản phẩm'}
                onToggle={() => handleMenuToggle('Bán hàng & sản phẩm')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={[
                  { href: '/admin/products', label: 'Sản phẩm', moduleKey: 'products' },
                  { href: '/admin/categories', label: 'Danh mục sản phẩm', moduleKey: 'products' },
                  ...(productTypesEnabled ? [{ href: '/admin/product-types', label: 'Loại sản phẩm', moduleKey: 'products' }] : []),
                  ...(productTypesEnabled ? [{ href: '/admin/attribute-groups', label: 'Thuộc tính lọc', moduleKey: 'products' }] : []),
                  ...(variantEnabled ? [{ href: '/admin/product-options', label: 'Loại tùy chọn', moduleKey: 'products' }] : []),
                  { href: '/admin/orders', label: 'Đơn hàng', moduleKey: 'orders' },
                  { href: '/admin/cart', label: 'Giỏ hàng', moduleKey: 'cart' },
                  { href: '/admin/wishlist', label: 'Wishlist', moduleKey: 'wishlist' },
                  ...(showProductReviews ? [{ href: '/admin/reviews', label: 'Đánh giá sản phẩm', moduleKey: 'comments' }] : []),
                  { href: '/admin/customers', label: 'Khách hàng', moduleKey: 'customers' },
                ]}
              />
            )}

            {/* Media Section */}
            {showMediaSection && (
              <SidebarItem 
                icon={ImageIcon} 
                label="Thư viện Media" 
                href="/admin/media" 
                active={isActive('/admin/media')} 
                isCollapsed={isSidebarCollapsed}
                isExpanded={false}
                onToggle={() => {}}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
              />
            )}

            {/* Notifications Section */}
            {showNotificationsSection && (
              <SidebarItem 
                icon={Bell} 
                label="Thông báo" 
                href="/admin/notifications" 
                active={isActive('/admin/notifications')} 
                isCollapsed={isSidebarCollapsed}
                isExpanded={false}
                onToggle={() => {}}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
              />
            )}

            {/* Promotions Section */}
            {showPromotionsSection && (
              <SidebarItem 
                icon={Ticket} 
                label="Khuyến mãi" 
                href="/admin/promotions" 
                active={isActive('/admin/promotions')} 
                isCollapsed={isSidebarCollapsed}
                isExpanded={false}
                onToggle={() => {}}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
              />
            )}

            {/* Users Section */}
            {showUsersSection && (
              <SidebarItem 
                icon={Users} 
                label="Người dùng" 
                href="/admin/users"
                active={isActive('/admin/users') || isActive('/admin/roles')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Người dùng'}
                onToggle={() => handleMenuToggle('Người dùng')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={[
                  { href: '/admin/users', label: 'Danh sách User', moduleKey: 'users' },
                  { href: '/admin/roles', label: 'Phân quyền', moduleKey: 'roles' },
                ]}
              />
            )}

            {/* Website Section */}
            {showWebsiteSection && (
              <SidebarItem 
                icon={Globe} 
                label="Website" 
                href="/admin/menus"
                active={isActive('/admin/menus') || isActive('/admin/home-components') || isActive('/admin/trust-pages')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Website'}
                onToggle={() => handleMenuToggle('Website')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={[
                  { href: '/admin/menus', label: 'Menu', moduleKey: 'menus' },
                  { href: '/admin/home-components', label: 'Giao diện trang chủ', moduleKey: 'homepage' },
                  { href: '/admin/trust-pages', label: 'Trang tin cậy', moduleKey: 'settings', visible: trustPagesFeature?.enabled ?? true },
                ]}
              />
            )}

            {/* Contact Inbox */}
            {showContactInboxSection && (
              <SidebarItem
                icon={Inbox}
                label="Tin nhắn liên hệ"
                href="/admin/contact-inbox"
                active={isActive('/admin/contact-inbox')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={false}
                onToggle={() => {}}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
              />
            )}

            {/* Mini Apps Section */}
            {showMiniAppsSection && (
              <SidebarItem
                icon={LayoutGrid}
                label="Mini Apps"
                href="/admin/mini-apps"
                active={isActive('/admin/mini-apps') || isActive('/admin/kanban')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Mini Apps'}
                onToggle={() => handleMenuToggle('Mini Apps')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={miniAppSubItems}
              />
            )}

            {/* Subscriptions Section */}
            {showSubscriptionsSection && (
              <SidebarItem
                icon={CalendarDays}
                label="Subscriptions"
                href="/admin/subscriptions"
                active={isActive('/admin/subscriptions')}
                isCollapsed={isSidebarCollapsed}
                isExpanded={false}
                onToggle={() => {}}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
              />
            )}

            {/* Settings Section */}
            {showSettingsSection && (
              <SidebarItem 
                icon={Settings} 
                label="Cài đặt" 
                href="/admin/settings" 
                active={isActive('/admin/settings')} 
                isCollapsed={isSidebarCollapsed}
                isExpanded={currentExpandedMenu === 'Cài đặt'}
                onToggle={() => handleMenuToggle('Cài đặt')}
                pathname={pathname}
                isModuleEnabled={isModuleEnabled}
                subItems={[
                  { href: '/admin/settings/general', label: 'Thông tin chung', moduleKey: 'settings' },
                  { href: '/admin/settings/contact', label: 'Liên hệ', moduleKey: 'settings' },
                  { href: '/admin/settings/seo', label: 'SEO', moduleKey: 'settings' },
                  { href: '/admin/settings/advanced', label: 'Nâng cao', moduleKey: 'settings' },
                ]}
              />
            )}
          </div>
        )}

        <div className="p-2.5 border-t border-slate-200/80 dark:border-slate-800">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-full h-7 rounded-md bg-slate-200/60 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title={isSidebarCollapsed ? "Mở rộng" : "Thu gọn"}
          >
            {isSidebarCollapsed ? <ChevronsRight size={17} /> : <ChevronsLeft size={17} />}
          </button>
        </div>
      </aside>
    </>
  );
};

