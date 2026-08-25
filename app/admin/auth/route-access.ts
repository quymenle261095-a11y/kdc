export type AdminRouteAction = 'view' | 'create' | 'edit' | 'delete';

export interface AdminRouteAccess {
  action: AdminRouteAction;
  moduleKey: string;
}

interface AdminRouteRule {
  exact?: boolean;
  moduleKey: string;
  prefix: string;
}

const ADMIN_ROUTE_RULES: AdminRouteRule[] = [
  { exact: true, moduleKey: 'analytics', prefix: '/admin' },
  { moduleKey: 'analytics', prefix: '/admin/dashboard' },
  { moduleKey: 'posts', prefix: '/admin/posts' },
  { moduleKey: 'posts', prefix: '/admin/post-categories' },
  { moduleKey: 'comments', prefix: '/admin/comments' },
  { moduleKey: 'courses', prefix: '/admin/courses' },
  { moduleKey: 'courses', prefix: '/admin/course-categories' },
  { moduleKey: 'resources', prefix: '/admin/resources' },
  { moduleKey: 'resources', prefix: '/admin/resource-categories' },
  { moduleKey: 'projects', prefix: '/admin/projects' },
  { moduleKey: 'projects', prefix: '/admin/project-categories' },
  { moduleKey: 'catalogs', prefix: '/admin/catalogs' },
  { moduleKey: 'services', prefix: '/admin/services' },
  { moduleKey: 'services', prefix: '/admin/service-categories' },
  { moduleKey: 'bookings', prefix: '/admin/bookings' },
  { moduleKey: 'products', prefix: '/admin/products' },
  { moduleKey: 'products', prefix: '/admin/categories' },
  { moduleKey: 'products', prefix: '/admin/product-categories' },
  { moduleKey: 'products', prefix: '/admin/product-types' },
  { moduleKey: 'products', prefix: '/admin/attribute-groups' },
  { moduleKey: 'products', prefix: '/admin/product-options' },
  { moduleKey: 'orders', prefix: '/admin/orders' },
  { moduleKey: 'cart', prefix: '/admin/cart' },
  { moduleKey: 'wishlist', prefix: '/admin/wishlist' },
  { moduleKey: 'comments', prefix: '/admin/reviews' },
  { moduleKey: 'customers', prefix: '/admin/customers' },
  { moduleKey: 'media', prefix: '/admin/media' },
  { moduleKey: 'notifications', prefix: '/admin/notifications' },
  { moduleKey: 'promotions', prefix: '/admin/promotions' },
  { moduleKey: 'users', prefix: '/admin/users' },
  { moduleKey: 'roles', prefix: '/admin/roles' },
  { moduleKey: 'menus', prefix: '/admin/menus' },
  { moduleKey: 'homepage', prefix: '/admin/home-components' },
  { moduleKey: 'homepage', prefix: '/admin/homepage' },
  { moduleKey: 'settings', prefix: '/admin/trust-pages' },
  { moduleKey: 'contactInbox', prefix: '/admin/contact-inbox' },
  { moduleKey: 'miniApps', prefix: '/admin/mini-apps' },
  { moduleKey: 'miniApps', prefix: '/admin/kanban' },
  { moduleKey: 'subscriptions', prefix: '/admin/subscriptions' },
  { moduleKey: 'settings', prefix: '/admin/settings' },
];

export const ADMIN_MODULE_ENTRY_ROUTES: AdminRouteAccess[] = [
  { action: 'view', moduleKey: 'analytics' },
  { action: 'view', moduleKey: 'posts' },
  { action: 'view', moduleKey: 'comments' },
  { action: 'view', moduleKey: 'products' },
  { action: 'view', moduleKey: 'courses' },
  { action: 'view', moduleKey: 'resources' },
  { action: 'view', moduleKey: 'projects' },
  { action: 'view', moduleKey: 'catalogs' },
  { action: 'view', moduleKey: 'services' },
  { action: 'view', moduleKey: 'bookings' },
  { action: 'view', moduleKey: 'orders' },
  { action: 'view', moduleKey: 'cart' },
  { action: 'view', moduleKey: 'wishlist' },
  { action: 'view', moduleKey: 'customers' },
  { action: 'view', moduleKey: 'media' },
  { action: 'view', moduleKey: 'notifications' },
  { action: 'view', moduleKey: 'promotions' },
  { action: 'view', moduleKey: 'users' },
  { action: 'view', moduleKey: 'roles' },
  { action: 'view', moduleKey: 'menus' },
  { action: 'view', moduleKey: 'homepage' },
  { action: 'view', moduleKey: 'contactInbox' },
  { action: 'view', moduleKey: 'miniApps' },
  { action: 'view', moduleKey: 'subscriptions' },
  { action: 'view', moduleKey: 'settings' },
];

const ENTRY_ROUTE_BY_MODULE: Record<string, string> = {
  analytics: '/admin/dashboard',
  bookings: '/admin/bookings',
  cart: '/admin/cart',
  catalogs: '/admin/catalogs',
  comments: '/admin/comments',
  contactInbox: '/admin/contact-inbox',
  courses: '/admin/courses',
  customers: '/admin/customers',
  homepage: '/admin/home-components',
  media: '/admin/media',
  menus: '/admin/menus',
  miniApps: '/admin/mini-apps',
  notifications: '/admin/notifications',
  orders: '/admin/orders',
  posts: '/admin/posts',
  products: '/admin/products',
  projects: '/admin/projects',
  promotions: '/admin/promotions',
  resources: '/admin/resources',
  roles: '/admin/roles',
  services: '/admin/services',
  settings: '/admin/settings/general',
  subscriptions: '/admin/subscriptions',
  users: '/admin/users',
  wishlist: '/admin/wishlist',
};

function normalizePath(pathname: string) {
  const cleanPath = pathname.split(/[?#]/)[0] || '/admin';
  if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
    return cleanPath.slice(0, -1);
  }
  return cleanPath;
}

function matchesRule(pathname: string, rule: AdminRouteRule) {
  if (rule.exact) {
    return pathname === rule.prefix;
  }
  return pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`);
}

function inferAction(pathname: string): AdminRouteAction {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.includes('create') || segments.includes('clone')) {
    return 'create';
  }
  if (segments.includes('edit')) {
    return 'edit';
  }
  return 'view';
}

export function getAdminRouteAccess(pathname: string): AdminRouteAccess | null {
  const normalizedPath = normalizePath(pathname);
  if (normalizedPath === '/admin/auth/login' || normalizedPath === '/admin/profile') {
    return null;
  }

  const rule = [...ADMIN_ROUTE_RULES]
    .sort((a, b) => b.prefix.length - a.prefix.length)
    .find((item) => matchesRule(normalizedPath, item));

  if (!rule) {
    return null;
  }

  return {
    action: inferAction(normalizedPath),
    moduleKey: rule.moduleKey,
  };
}

export function getAdminEntryRoute(moduleKey: string) {
  return ENTRY_ROUTE_BY_MODULE[moduleKey] ?? '/admin/dashboard';
}
