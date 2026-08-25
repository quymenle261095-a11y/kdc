'use client';

import { Bell, ChevronRight, Home, Menu as MenuIcon, Moon, Sun, ShoppingBag, User, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAdminAuth } from '../auth/context';
import { AdminHeaderSearchAutocomplete } from './AdminHeaderSearchAutocomplete';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import { isValidImageSrc } from '@/lib/utils/image';

const FIRST_INDEX = 0;
const INDEX_OFFSET = 1;

function formatRemaining(remainingMs: number) {
  if (remainingMs <= 0) {
    return '00h 00m';
  }

  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h`;
  }

  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

interface HeaderProps {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setMobileMenuOpen: (open: boolean) => void;
}

function AdminUserMenu({ isDarkMode: _isDarkMode }: { isDarkMode: boolean }) {
  const router = useRouter();
  const { user, logout } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userFeatures = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: 'users' });
  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    userFeatures?.forEach((feature) => { features[feature.featureKey] = feature.enabled; });
    return features;
  }, [userFeatures]);

  const showAvatar = enabledFeatures.enableAvatar ?? true;
  const displayName = user?.name ?? 'Admin';
  const displayEmail = user?.email ?? '';
  const avatarUrl = showAvatar ? user?.avatar : undefined;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  useEffect(() => {
    setAvatarError(false);
  }, [avatarUrl]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleLogout = async () => {
    await logout();
    setOpen(false);
    router.push('/admin/auth/login');
  };

  return (
    <div className="relative ml-1" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
        aria-expanded={open}
        title={displayName}
      >
        <div className="relative">
          {avatarUrl && isValidImageSrc(avatarUrl) && !avatarError ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              onError={() => setAvatarError(true)}
              className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-slate-700 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center ring-2 ring-white dark:ring-slate-700">
              {initials || 'AD'}
            </div>
          )}
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" />
        </div>
        <span className="hidden sm:inline-block text-xs font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
          {displayName}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{displayEmail}</p>
          </div>
          <div className="py-1">
            <Link
              href="/admin/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <User size={16} className="text-slate-400" />
              Hồ sơ
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={16} className="text-red-500" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationBell({ isDarkMode }: { isDarkMode: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lastSeenOrder, setLastSeenOrder] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    return Number(localStorage.getItem('admin_notif_last_seen') ?? '0');
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lấy 10 thông báo mới nhất (type=success or warning targetType=users)
  const recentNotifs = useQuery(api.notifications.listAdminWithOffset, {
    limit: 10,
    status: 'Sent',
  });

  const unreadCount = useMemo(() => {
    if (!recentNotifs) return 0;
    return recentNotifs.filter((n) => n.order > lastSeenOrder && n.targetType === 'users').length;
  }, [recentNotifs, lastSeenOrder]);

  // Toast khi có thông báo mới
  const prevUnreadRef = useRef(0);
  useEffect(() => {
    if (recentNotifs && unreadCount > prevUnreadRef.current && prevUnreadRef.current !== 0) {
      const newest = recentNotifs.find((n) => n.order > lastSeenOrder && n.targetType === 'users');
      if (newest) {
        toast.success(newest.title, { description: newest.content, duration: 6000 });
      }
    }
    prevUnreadRef.current = unreadCount;
  }, [unreadCount, recentNotifs, lastSeenOrder]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handler);
    }
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open && recentNotifs && recentNotifs.length > 0) {
      const maxOrder = Math.max(...recentNotifs.map((n) => n.order));
      setLastSeenOrder(maxOrder);
      localStorage.setItem('admin_notif_last_seen', String(maxOrder));
    }
  };

  const bgColor = isDarkMode ? '#1e293b' : '#ffffff';
  const borderColor = isDarkMode ? '#334155' : '#e2e8f0';
  const textColor = isDarkMode ? '#f1f5f9' : '#0f172a';
  const mutedColor = isDarkMode ? '#94a3b8' : '#64748b';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-colors"
        title="Thông báo"
        aria-label="Xem thông báo"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl shadow-xl border z-50 overflow-hidden"
          style={{ backgroundColor: bgColor, borderColor }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor }}>
            <span className="font-semibold text-sm" style={{ color: textColor }}>Thông báo</span>
            <Link
              href="/admin/notifications"
              className="text-xs font-medium hover:underline"
              style={{ color: '#3b82f6' }}
              onClick={() => setOpen(false)}
            >
              Xem tất cả
            </Link>
          </div>

          <div className="max-h-[340px] overflow-y-auto">
            {!recentNotifs || recentNotifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm" style={{ color: mutedColor }}>
                Chưa có thông báo nào
              </div>
            ) : (
              recentNotifs.map((notif) => {
                const isNew = notif.order > lastSeenOrder && notif.targetType === 'users';
                const isOrder = notif.title.toLowerCase().includes('đơn') || notif.title.toLowerCase().includes('order');
                return (
                  <button
                    key={notif._id}
                    className="w-full text-left px-4 py-3 border-b hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3 items-start"
                    style={{ borderColor }}
                    onClick={() => {
                      setOpen(false);
                      router.push('/admin/orders');
                    }}
                  >
                    <div
                      className="mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: notif.type === 'success' ? '#dcfce7' : notif.type === 'warning' ? '#fef9c3' : '#fee2e2',
                        color: notif.type === 'success' ? '#16a34a' : notif.type === 'warning' ? '#ca8a04' : '#dc2626',
                      }}
                    >
                      {isOrder ? <ShoppingBag size={13} /> : <Bell size={13} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold truncate" style={{ color: textColor }}>{notif.title}</p>
                        {isNew && (
                          <span className="text-[9px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 flex-shrink-0">MỚI</span>
                        )}
                      </div>
                      <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: mutedColor }}>{notif.content}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const Header: React.FC<HeaderProps> = ({ isDarkMode, toggleTheme, setMobileMenuOpen }) => {
  const pathname = usePathname();
  const { user } = useAdminAuth();
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!user?.trial?.expiresAt) {
      setNow(0);
      return;
    }

    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60 * 1000);

    return () => window.clearInterval(timer);
  }, [user?.trial?.expiresAt]);

  const trialBadge = useMemo(() => {
    if (!user?.trial?.expiresAt) {
      return null;
    }

    return formatRemaining(Math.max(user.trial.expiresAt - now, 0));
  }, [now, user?.trial?.expiresAt]);

  let themeTitle = 'Chế độ tối';
  let ThemeIcon = Moon;
  if (isDarkMode) {
    themeTitle = 'Chế độ sáng';
    ThemeIcon = Sun;
  }

  return (
    <header className="h-[54px] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 transition-colors">
      <div className="flex items-center gap-3">
        <button className="lg:hidden p-1.5 -ml-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-md" onClick={() => { setMobileMenuOpen(true); }}>
          <MenuIcon size={24} />
        </button>
        <nav className="hidden md:flex items-center text-sm text-slate-500 dark:text-slate-400">
          <Link href="/admin/dashboard" className="hover:text-blue-600 transition-colors">Home</Link>
          <Breadcrumbs pathname={pathname} />
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:block">
          <AdminHeaderSearchAutocomplete />
        </div>

        {trialBadge && (
          <div className="hidden md:flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
            Trial còn {trialBadge}
          </div>
        )}
        
        <Link
          href="/"
          target="_blank"
          className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-colors"
          title="Mở trang chủ"
        >
          <Home size={18} />
        </Link>

        <NotificationBell isDarkMode={isDarkMode} />

        <button 
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-full transition-colors focus:outline-none"
          title={themeTitle}
        >
          <ThemeIcon size={18} />
        </button>

        <AdminUserMenu isDarkMode={isDarkMode} />
      </div>
    </header>
  );
};

import { useAdminBreadcrumb } from '../context/AdminBreadcrumbContext';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Trang chủ',
  posts: 'Bài viết',
  'post-categories': 'Danh mục bài viết',
  products: 'Sản phẩm',
  categories: 'Danh mục sản phẩm',
  'product-categories': 'Danh mục sản phẩm',
  variants: 'Biến thể',
  services: 'Dịch vụ',
  'service-categories': 'Danh mục dịch vụ',
  courses: 'Khóa học',
  'course-categories': 'Danh mục khóa học',
  resources: 'Tài nguyên',
  'resource-categories': 'Danh mục tài nguyên',
  filters: 'Bộ lọc',
  projects: 'Dự án',
  'project-categories': 'Danh mục dự án',
  catalogs: 'Catalogs',
  orders: 'Đơn hàng',
  customers: 'Khách hàng',
  'attribute-groups': 'Nhóm thuộc tính',
  'product-options': 'Tùy chọn sản phẩm',
  'product-types': 'Loại sản phẩm',
  bookings: 'Đặt lịch',
  reviews: 'Đánh giá',
  comments: 'Bình luận',
  'contact-inbox': 'Hộp thư liên hệ',
  roles: 'Phân quyền',
  subscriptions: 'Gói đăng ký',
  menus: 'Menu website',
  homepage: 'Trang chủ (Cấu hình)',
  kanban: 'Bảng công việc',
  notifications: 'Thông báo',
  'trust-pages': 'Trang uy tín',
  media: 'Thư viện Media',
  promotions: 'Khuyến mãi',
  users: 'Người dùng',
  settings: 'Cài đặt',
  modules: 'Cấu hình hệ thống',
  general: 'Cài đặt chung',
  seo: 'Cấu hình SEO',
  contact: 'Thông tin liên hệ',
  advanced: 'Cài đặt nâng cao',
  'product-supplemental-content': 'Nội dung bổ sung sản phẩm',
  'product-frames': 'Khung ảnh sản phẩm',
  edit: 'Chỉnh sửa',
  create: 'Tạo mới',
  new: 'Tạo mới',
};

const truncateBreadcrumbLabel = (str: string, maxLen = 32) => {
  if (!str) {return str;}
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
};

const Breadcrumbs = ({ pathname }: { pathname: string }): React.ReactElement => {
  const { breadcrumbTitle } = useAdminBreadcrumb();
  const segments = pathname.replace('/admin', '').split('/').filter(Boolean);
  const items: Array<{ href: string; label: string; isLast: boolean }> = [];

  const isLikelyId = (str: string) => str.length >= 15 && !str.includes('-') && !['create', 'edit', 'new'].includes(str);

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index];
    const isRootDashboard = segment === 'dashboard' && index === FIRST_INDEX;
    if (isRootDashboard) {
      continue;
    }

    const nextSegment = segments[index + 1];
    const isIdSegment = isLikelyId(segment);

    // Xử lý các phân đoạn chứa ID record (ví dụ /post-categories/[id]/edit hoặc /posts/[id]/edit)
    if (isIdSegment) {
      if (breadcrumbTitle) {
        const href = `/admin/${segments.slice(FIRST_INDEX, index + INDEX_OFFSET).join('/')}`;
        const isLast = index === segments.length - INDEX_OFFSET || nextSegment === 'edit';
        items.push({
          href,
          isLast,
          label: truncateBreadcrumbLabel(breadcrumbTitle),
        });
      }
      if (nextSegment === 'edit') {
        if (!breadcrumbTitle) {
          const href = `/admin/${segments.slice(FIRST_INDEX, index + 2).join('/')}`;
          items.push({
            href,
            isLast: true,
            label: 'Chỉnh sửa',
          });
        }
        index++; // Nhảy qua phân đoạn "edit" vì đã gom chung vào tên record hoặc nhãn Chỉnh sửa
      }
      continue;
    }

    const href = `/admin/${segments.slice(FIRST_INDEX, index + INDEX_OFFSET).join('/')}`;
    const mappedLabel = ROUTE_LABELS[segment] || segment.replaceAll('-', ' ');

    items.push({
      href,
      isLast: index === segments.length - INDEX_OFFSET,
      label: mappedLabel,
    });
  }

  return (
    <>
      {items.map((item) => {
        let linkClassName = 'hover:text-blue-600 transition-colors';
        if (item.isLast) {
          linkClassName += ' font-medium text-slate-900 dark:text-slate-100';
        }

        return (
          <React.Fragment key={item.href}>
            <ChevronRight size={14} className="mx-2 text-slate-300 shrink-0" />
            <Link href={item.href} className={linkClassName} title={item.label}>
              <span>{item.label}</span>
            </Link>
          </React.Fragment>
        );
      })}
    </>
  );
};
