export type MiniAppRouteMode = 'none' | 'namespaced' | 'root';
export type MiniAppVisibility = 'private' | 'public';

export type MiniAppDefinition = {
  adminEnabled: boolean;
  config: Record<string, unknown>;
  description: string;
  icon: string;
  key: string;
  moduleKey?: string;
  name: string;
  noindex: boolean;
  order: number;
  routeMode: MiniAppRouteMode;
  routeSlug: string;
  siteEnabled: boolean;
  type: string;
  visibility: MiniAppVisibility;
};

export const MINI_APP_DEFINITIONS: MiniAppDefinition[] = [
  {
    adminEnabled: true,
    config: {
      accent: '#18181b',
      defaultColumns: ['Yêu cầu', 'Cần làm', 'Đang làm', 'Đã xong'],
      layout: 'compact',
    },
    description: 'Mini app Kanban độc lập để thử nghiệm và quản lý công việc nhỏ.',
    icon: 'LayoutGrid',
    key: 'kanban',
    moduleKey: 'miniApps',
    name: 'Kanban Mini App',
    noindex: true,
    order: 1,
    routeMode: 'root',
    routeSlug: 'kanban',
    siteEnabled: true,
    type: 'kanban',
    visibility: 'public',
  },
  {
    adminEnabled: true,
    config: {
      accent: '#2563eb',
      templates: ['modern', 'professional', 'creative', 'elegant', 'technical', 'bold', 'bordered', 'sidebar', 'retro', 'accent'],
    },
    description: 'Mini app thiết kế CV / sơ yếu lý lịch chuyên nghiệp.',
    icon: 'FileText',
    key: 'cv-builder',
    moduleKey: 'miniApps',
    name: 'CV Builder Mini App',
    noindex: true,
    order: 2,
    routeMode: 'root',
    routeSlug: 'cv-builder',
    siteEnabled: true,
    type: 'cv-builder',
    visibility: 'public',
  },
  {
    adminEnabled: true,
    config: {
      accent: '#ef4444',
      homeComponent: {
        enabled: false,
        maxItems: 8,
        style: 'spotlight',
      },
      routeSurface: 'site-layout',
    },
    description: 'Order items game Pokemon Champions.',
    icon: 'Gamepad2',
    key: 'pokemon-champions',
    moduleKey: 'miniApps',
    name: 'Pokemon Champions',
    noindex: true,
    order: 3,
    routeMode: 'root',
    routeSlug: 'pokemon-champions',
    siteEnabled: true,
    type: 'pokemon-champions',
    visibility: 'public',
  },
  {
    adminEnabled: true,
    config: {
      accent: '#7c3aed',
      gameSource: {
        type: 'CustomHome',
      },
    },
    description: 'Cổng trò chơi mini game HTML5 chạy độc lập với cơ sở dữ liệu riêng.',
    icon: 'Gamepad2',
    key: 'mini-game',
    moduleKey: 'miniApps',
    name: 'Mini Game',
    noindex: true,
    order: 4,
    routeMode: 'root',
    routeSlug: 'mini-game',
    siteEnabled: true,
    type: 'mini-game',
    visibility: 'public',
  },
  {
    adminEnabled: true,
    config: {
      accent: '#18181b',
      modelPath: '/models/samsung_s23_ultra.glb',
    },
    description: 'Trải nghiệm tương tác Galaxy S23 Ultra 3D với Three.js, model GLB và UI phong cách macOS.',
    icon: 'Smartphone',
    key: 'galaxy-s23-3d',
    moduleKey: 'miniApps',
    name: 'Galaxy S23 Ultra 3D',
    noindex: true,
    order: 5,
    routeMode: 'namespaced',
    routeSlug: 'galaxy-s23-3d',
    siteEnabled: true,
    type: 'galaxy-s23-3d',
    visibility: 'public',
  },
  {
    adminEnabled: true,
    config: {
      accent: '#229ED9',
      adminIds: '0',
      botDisplayName: 'DienShopBot',
      botUsername: 'DienShopBot',
      dbPath: './data.sqlite',
      deployDomain: '',
      deployMode: 'vercel-convex-webhook',
      webhookPath: '/api/telegram/webhook',
    },
    description: '',
    icon: 'Bot',
    key: 'telegram-bot',
    moduleKey: 'miniApps',
    name: 'Telegram Bot',
    noindex: true,
    order: 6,
    routeMode: 'namespaced',
    routeSlug: 'telegram-bot',
    siteEnabled: true,
    type: 'telegram-bot',
    visibility: 'public',
  },
];

export const MINI_APP_TYPE_LABELS: Record<string, string> = {
  'cv-builder': 'CV Builder',
  'galaxy-s23-3d': 'Galaxy S23 Ultra 3D',
  kanban: 'Kanban',
  'mini-game': 'Mini Game',
  'pokemon-champions': 'Pokemon Champions',
  'telegram-bot': 'Telegram Bot',
};

export const MINI_APP_DEFAULT_ROUTE_SLUGS = MINI_APP_DEFINITIONS.map((app) => app.routeSlug);
