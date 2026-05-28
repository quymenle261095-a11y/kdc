'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { AiMenuImportDialog } from './AiMenuImportDialog';
import type { AiMenuLine } from './_ai-menu-parser';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { 
  Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label, cn
} from '../components/ui';
import { ModuleGuard } from '../components/ModuleGuard';
import { BulkActionBar, SelectCheckbox } from '../components/TableUtilities';
import { HomeComponentStickyFooter } from '@/app/admin/home-components/_shared/components/HomeComponentStickyFooter';
import { buildCategoryPath, buildDetailPath, normalizeRouteMode } from '@/lib/ia/route-mode';
import { 
  ArrowDown, ArrowUp, Bot, ChevronLeft, ChevronRight, Copy, ExternalLink, Eye, EyeOff, 
  GripVertical, Loader2, Menu, Plus, Sparkles, Trash2
} from 'lucide-react';
import { SimpleMenuPreview } from './SimpleMenuPreview';
import { MENU_MAX_LEVEL, resolveMenuMaxDepthLevel } from '@/lib/utils/menu-tree';

const MODULE_KEY = 'menus';
const MENU_ITEMS_LIMIT = 500;

type QuickRouteGroup = 'Trang cơ bản' | 'Module' | 'Danh mục';

type QuickRouteOption = {
  group: QuickRouteGroup;
  label: string;
  source: string;
  url: string;
};

const CORE_ROUTE_OPTIONS: QuickRouteOption[] = [
  { label: 'Trang chủ', url: '/', source: 'Core', group: 'Trang cơ bản' },
  { label: 'Liên hệ', url: '/contact', source: 'Core', group: 'Trang cơ bản' },
];

const MODULE_SITE_ROUTE_CATALOG: Record<string, { label: string; url: string }[]> = {
  cart: [
    { label: 'Giỏ hàng', url: '/cart' },
  ],
  customers: [
    { label: 'Đăng nhập', url: '/account/login' },
    { label: 'Đăng ký', url: '/account/register' },
    { label: 'Tài khoản', url: '/account/profile' },
    { label: 'Đơn hàng', url: '/account/orders' },
  ],
  orders: [
    { label: 'Đơn hàng', url: '/account/orders' },
    { label: 'Checkout', url: '/checkout' },
  ],
  posts: [],
  products: [],
  promotions: [
    { label: 'Khuyến mãi', url: '/promotions' },
  ],
  services: [],
  wishlist: [
    { label: 'Wishlist', url: '/wishlist' },
  ],
};


interface MenuItem {
  _id: Id<"menuItems">;
  _creationTime: number;
  menuId: Id<"menus">;
  label: string;
  url: string;
  order: number;
  depth: number;
  parentId?: Id<"menuItems">;
  icon?: string;
  openInNewTab?: boolean;
  active: boolean;
}

interface DraftMenuItem {
  id?: Id<"menuItems">;
  localId: string;
  label: string;
  url: string;
  order: number;
  depth: number;
  parentId?: Id<"menuItems">;
  icon?: string;
  openInNewTab?: boolean;
  active: boolean;
}

type SmartMenuMode = 'replace' | 'append';

type SmartMenuPlanItem = {
  depth: number;
  label: string;
  reasons: string[];
  score: number;
  url: string;
};

export default function MenuBuilderPageWrapper() {
  return (
    <ModuleGuard moduleKey="menus">
      <MenuBuilderPage />
    </ModuleGuard>
  );
}

function MenuBuilderPage() {
  const menusData = useQuery(api.menus.listMenus);
  const createMenu = useMutation(api.menus.createMenu);

  const isLoading = menusData === undefined;

  // Only get header menu
  const headerMenu = menusData?.find(m => m.location === 'header');

  const handleCreateHeaderMenu = async () => {
    try {
      await createMenu({ location: 'header', name: 'Header Menu' });
      toast.success('Đã tạo lại Header Menu');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo Header Menu');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Header Menu</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý menu điều hướng chính trên thanh header</p>
        </div>
        <div />
      </div>

      {headerMenu ? (
        <MenuItemsEditor menuId={headerMenu._id} />
      ) : (
        <Card className="p-8 text-center">
          <Menu className="w-12 h-12 mx-auto mb-4 text-slate-400" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">Chưa có Header Menu</h3>
          <p className="text-slate-500 mb-4">Chưa có dữ liệu menu.</p>
          <Button type="button" onClick={handleCreateHeaderMenu}>
            Tạo Header Menu
          </Button>
        </Card>
      )}
    </div>
  );
}

function MenuItemsEditor({ menuId }: { menuId: Id<"menus"> }) {
  const menuItemsData = useQuery(api.menus.listMenuItems, { menuId });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });
  const enabledModules = useQuery(api.admin.modules.listEnabledModules);
  const productCategories = useQuery(api.productCategories.listActive);
  const postCategories = useQuery(api.postCategories.listActive, { limit: 100 });
  const serviceCategories = useQuery(api.serviceCategories.listActive, { limit: 100 });
  const routeModeSetting = useQuery(api.settings.getValue, { key: 'ia_route_mode', defaultValue: 'unified' });
  const routeMode = useMemo(() => normalizeRouteMode(routeModeSetting), [routeModeSetting]);
  const saveMenuItemsBulk = useMutation(api.menus.saveMenuItemsBulk);

  const [draftItems, setDraftItems] = useState<DraftMenuItem[]>([]);
  const [originalItems, setOriginalItems] = useState<DraftMenuItem[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const [pendingSync, setPendingSync] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isQuickPickerOpen, setIsQuickPickerOpen] = useState(false);
  const [quickPickerTargetId, setQuickPickerTargetId] = useState<string | null>(null);
  const [quickRouteSearch, setQuickRouteSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerStep, setPickerStep] = useState<1 | 2 | 3>(1);
  const [selectedType, setSelectedType] = useState<'core' | 'module' | 'category' | 'detail' | null>(null);
  const [selectedModule, setSelectedModule] = useState<'posts' | 'products' | 'services' | null>(null);

  // AI Import state
  const [isAiImportOpen, setIsAiImportOpen] = useState(false);
  const [isSmartBuilderOpen, setIsSmartBuilderOpen] = useState(false);
  const [smartBuilderMode, setSmartBuilderMode] = useState<SmartMenuMode>('replace');
  const [isUseProductTypeLogic, setIsUseProductTypeLogic] = useState(false);

  const enableProductTypesSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableProductTypes' });
  const enableProductTypes = enableProductTypesSetting?.value === true;
  const smartMenuBuilderData = useQuery(api.menus.getSmartMenuBuilderData, isUseProductTypeLogic ? {} : 'skip');

  const detailPosts = useQuery(
    api.menus.listPostsForPicker,
    selectedModule === 'posts' && pickerStep === 3
      ? { search: quickRouteSearch, limit: 20 }
      : 'skip'
  );
  const detailProducts = useQuery(
    api.menus.listProductsForPicker,
    selectedModule === 'products' && pickerStep === 3
      ? { search: quickRouteSearch, limit: 20 }
      : 'skip'
  );
  const detailServices = useQuery(
    api.menus.listServicesForPicker,
    selectedModule === 'services' && pickerStep === 3
      ? { search: quickRouteSearch, limit: 20 }
      : 'skip'
  );

  const maxDepthLevel = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'maxDepth');
    return resolveMenuMaxDepthLevel(setting?.value);
  }, [settingsData]);

  const maxDepth = maxDepthLevel;

  // Feature toggles from System Config
  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach(f => { features[f.featureKey] = f.enabled; });
    return features;
  }, [featuresData]);

  const showNested = enabledFeatures.enableNested ?? true;
  const showNewTab = enabledFeatures.enableNewTab ?? true;

  const quickRouteOptions = useMemo(() => {
    const enabledKeys = new Set((enabledModules ?? []).map(moduleItem => moduleItem.key));
    const options: QuickRouteOption[] = [...CORE_ROUTE_OPTIONS];

    Object.entries(MODULE_SITE_ROUTE_CATALOG).forEach(([moduleKey, routes]) => {
      if (!enabledKeys.has(moduleKey)) {return;}
      routes.forEach(route => {
        options.push({ ...route, source: moduleKey, group: 'Module' });
      });
    });

    if (enabledKeys.has('products')) {
      (productCategories ?? []).forEach(category => {
        options.push({
          group: 'Danh mục',
          label: category.name,
          source: 'products',
          url: buildCategoryPath({ categorySlug: category.slug, mode: routeMode, moduleKey: 'products' }),
        });
      });
    }

    if (enabledKeys.has('posts')) {
      (postCategories ?? []).forEach(category => {
        options.push({
          group: 'Danh mục',
          label: category.name,
          source: 'posts',
          url: buildCategoryPath({ categorySlug: category.slug, mode: routeMode, moduleKey: 'posts' }),
        });
      });
    }

    if (enabledKeys.has('services')) {
      (serviceCategories ?? []).forEach(category => {
        options.push({
          group: 'Danh mục',
          label: category.name,
          source: 'services',
          url: buildCategoryPath({ categorySlug: category.slug, mode: routeMode, moduleKey: 'services' }),
        });
      });
    }

    const deduped = new Map<string, QuickRouteOption>();
    options.forEach(option => {
      if (!deduped.has(option.url)) {
        deduped.set(option.url, option);
      }
    });

    return Array.from(deduped.values());
  }, [enabledModules, postCategories, productCategories, routeMode, serviceCategories]);

  const filteredQuickRoutes = useMemo(() => {
    const keyword = quickRouteSearch.trim().toLowerCase();
    if (!keyword) {return quickRouteOptions;}
    return quickRouteOptions.filter(option =>
      option.label.toLowerCase().includes(keyword)
      || option.url.toLowerCase().includes(keyword)
      || option.source.toLowerCase().includes(keyword)
    );
  }, [quickRouteOptions, quickRouteSearch]);

  const buildDraftItems = (items: MenuItem[]) => items
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({
      id: item._id,
      localId: item._id,
      label: item.label,
      url: item.url,
      order: index,
      depth: item.depth,
      parentId: item.parentId,
      icon: item.icon,
      openInNewTab: item.openInNewTab,
      active: item.active,
    }));

  const normalizeOrders = (items: DraftMenuItem[]) => items.map((item, index) => ({ ...item, order: index }));

  const isValidMenuStructure = (items: DraftMenuItem[]) => items.every((item, index) => {
    if (index === 0) {
      return item.depth === 0;
    }
    return item.depth <= items[index - 1].depth + 1;
  });

  const canApplyDraftItems = (items: DraftMenuItem[]) => isValidMenuStructure(normalizeOrders(items));

  const createLocalItem = (partial: Partial<DraftMenuItem>): DraftMenuItem => ({
    localId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label: 'Liên kết mới',
    url: '/',
    depth: 0,
    order: 0,
    active: true,
    ...partial,
  });

  const smartMenuPlan = useMemo<SmartMenuPlanItem[]>(() => {
    const enabledKeys = new Set((enabledModules ?? []).map(moduleItem => moduleItem.key));
    const maxChildDepth = Math.max(0, maxDepth - 1);
    const seen = new Set<string>();
    const items: SmartMenuPlanItem[] = [];
    const add = (item: SmartMenuPlanItem) => {
      if (seen.has(item.url)) {return;}
      if (item.depth > maxChildDepth) {return;}
      seen.add(item.url);
      items.push(item);
    };

    if (isUseProductTypeLogic && smartMenuBuilderData && enableProductTypes) {
      const { productTypes, productCategoryTypes, attributeGroups, productTypeAttributeGroups, attributeTerms } = smartMenuBuilderData;

      add({ depth: 0, label: 'Trang chủ', reasons: ['Luôn nên có trong menu chính'], score: 100, url: '/' });
      add({ depth: 0, label: 'Sản phẩm', reasons: ['Khu vực chính'], score: 90, url: '/products' });

      if (maxChildDepth >= 1) {
        productTypes.forEach((pt, ptIndex) => {
          add({
            depth: 1,
            label: pt.name,
            reasons: ['Loại sản phẩm'],
            score: 89 - ptIndex,
            url: `/products?type=${pt.slug}`
          });

          if (maxChildDepth >= 2) {
            const ptCatIds = new Set(productCategoryTypes.filter(m => m.typeId === pt._id).map(m => m.categoryId));
            const ptCats = (productCategories ?? []).filter(c => ptCatIds.has(c._id));
            ptCats.forEach((cat, catIndex) => {
              add({
                depth: 2,
                label: cat.name,
                reasons: [`Danh mục thuộc ${pt.name}`],
                score: 80 - catIndex,
                url: buildCategoryPath({ categorySlug: cat.slug, mode: routeMode, moduleKey: 'products' })
              });
            });

            const ptGroupIds = productTypeAttributeGroups.filter(m => m.typeId === pt._id).sort((a, b) => a.order - b.order).map(m => m.groupId);
            const ptSpecialGroups = attributeGroups.filter(g => g.isSpecialFilter && ptGroupIds.includes(g._id));
            
            ptSpecialGroups.forEach((group, groupIndex) => {
              add({
                depth: 2,
                label: group.name,
                reasons: [`Bộ lọc đặc biệt của ${pt.name}`],
                score: 70 - groupIndex,
                url: `/products?type=${pt.slug}&${group.code}=all`
              });

              if (maxChildDepth >= 3) {
                const groupTerms = attributeTerms.filter(t => t.groupId === group._id);
                groupTerms.forEach((term, termIndex) => {
                  add({
                    depth: 3,
                    label: term.name,
                    reasons: [`Giá trị của ${group.name}`],
                    score: 60 - termIndex,
                    url: `/products?type=${pt.slug}&${group.code}=${term.slug}`
                  });
                });
              }
            });

            if (pt.priceRanges && pt.priceRanges.length > 0) {
              add({
                depth: 2,
                label: 'Mức giá',
                reasons: [`Khoảng giá của ${pt.name}`],
                score: 50,
                url: `/products?type=${pt.slug}&price=all`
              });
              if (maxChildDepth >= 3) {
                pt.priceRanges.forEach((range, rangeIndex) => {
                  add({
                    depth: 3,
                    label: range.label,
                    reasons: [`Mức giá`],
                    score: 40 - rangeIndex,
                    url: `/products?type=${pt.slug}&price=${range.slug}`
                  });
                });
              }
            }
          }
        });
      }

      const globalSpecialGroups = attributeGroups.filter(g => g.isSpecialFilter);
      globalSpecialGroups.forEach((group, idx) => {
        add({
          depth: 0,
          label: group.name,
          reasons: ['Bộ lọc đặc biệt'],
          score: 85 - idx,
          url: `/products?${group.code}=all`
        });
      });

      if (enabledKeys.has('services')) {
        add({ depth: 0, label: 'Dịch vụ', reasons: ['Khu vực dịch vụ'], score: 75, url: '/services' });
      }
      if (enabledKeys.has('posts')) {
        add({ depth: 0, label: 'Bài viết', reasons: ['Khu vực bài viết'], score: 70, url: '/posts' });
      }
      add({ depth: 0, label: 'Liên hệ', reasons: ['Nên đặt cuối menu'], score: 65, url: '/contact' });

      // Build tree ordering manually or rely on scores.
      // Since it's a tree, we need to sort roots, then children of roots, etc.
      // We will sort exactly like the standard logic below.
    } else {
      // STANDARD LOGIC BEGIN
      const categoryLimit = maxDepth >= 3 ? 6 : 4;
      const appendCategories = (
        categories: Array<{ name: string; slug: string }> | undefined,
        moduleKey: 'posts' | 'products' | 'services',
        scoreBase: number,
      ) => {
        if (maxChildDepth < 1) {return;}
        (categories ?? []).slice(0, categoryLimit).forEach((category, index) => {
          add({
            depth: 1,
            label: category.name,
            reasons: [
              'Danh mục đang bật',
              `Đang đứng #${index + 1} trong dữ liệu`,
            ],
            score: scoreBase - index,
            url: buildCategoryPath({ categorySlug: category.slug, mode: routeMode, moduleKey }),
          });
        });
      };

      add({
        depth: 0,
        label: 'Trang chủ',
        reasons: ['Luôn nên có trong menu chính'],
        score: 100,
        url: '/',
      });

    if (enabledKeys.has('products')) {
      add({
        depth: 0,
        label: 'Sản phẩm',
        reasons: [
          'Khu vực sản phẩm đang bật',
          `${productCategories?.length ?? 0} danh mục sản phẩm có thể làm menu con`,
        ],
        score: 96 + Math.min(12, productCategories?.length ?? 0),
        url: '#',
      });
      appendCategories(productCategories, 'products', 88);
    }

    if (enabledKeys.has('services')) {
      add({
        depth: 0,
        label: 'Dịch vụ',
        reasons: [
          'Khu vực dịch vụ đang bật',
          `${serviceCategories?.length ?? 0} danh mục dịch vụ có thể làm menu con`,
        ],
        score: 90 + Math.min(8, serviceCategories?.length ?? 0),
        url: '#',
      });
      appendCategories(serviceCategories, 'services', 78);
    }

    if (enabledKeys.has('posts')) {
      add({
        depth: 0,
        label: 'Bài viết',
        reasons: [
          'Khu vực bài viết đang bật',
          `${postCategories?.length ?? 0} danh mục bài viết có thể làm menu con`,
        ],
        score: 82 + Math.min(6, postCategories?.length ?? 0),
        url: '#',
      });
      appendCategories(postCategories, 'posts', 68);
    }

    if (enabledKeys.has('promotions')) {
      add({
        depth: 0,
        label: 'Khuyến mãi',
        reasons: ['Khu vực khuyến mãi đang bật', 'Phù hợp nếu website có chiến dịch bán hàng'],
        score: 72,
        url: '/promotions',
      });
    }

    if (enabledKeys.has('wishlist')) {
      add({
        depth: 0,
        label: 'Yêu thích',
        reasons: ['Khu vực yêu thích đang bật', 'Hữu ích cho website bán hàng'],
        score: 58,
        url: '/wishlist',
      });
    }

    if (enabledKeys.has('cart')) {
      add({
        depth: 0,
        label: 'Giỏ hàng',
        reasons: ['Khu vực giỏ hàng đang bật', 'Đưa vào khi menu còn chỗ'],
        score: 55,
        url: '/cart',
      });
    }

    add({
      depth: 0,
      label: 'Liên hệ',
      reasons: ['Nên đặt cuối menu để khách dễ liên hệ'],
      score: 76,
      url: '/contact',
    });

    }
    // END OF IF ELSE (STANDARD LOGIC / PRODUCT TYPE LOGIC)
    
    // COMMONS LOGIC for Sorting tree
    const roots = items.filter(item => item.depth === 0);
    const rootUrls = roots
      .filter(item => item.url !== '/' && item.url !== '/contact')
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.url);
    const allowedRootUrls = new Set(['/', ...rootUrls, '/contact']);

    const middleRootOrder = new Map(rootUrls.map((url, index) => [url, index]));
    const rootOrder = (url: string) => {
      if (url === '/') {return -1;}
      if (url === '/contact') {return 99;}
      return middleRootOrder.get(url) ?? 50;
    };
    const selectedRoots = items
      .filter(item => item.depth === 0 && allowedRootUrls.has(item.url))
      .sort((a, b) => rootOrder(a.url) - rootOrder(b.url));
    const selectedRootSet = new Set(selectedRoots.map(item => item.url));
    const childrenByRoot = new Map<string, SmartMenuPlanItem[]>();
    
    // For depth > 0, we need to map them properly to roots. The algorithm below is simplified and assumes depth 1 items follow their depth 0 parents, and depth 2 items follow depth 1, etc.
    // We rewrite the grouping to be strictly hierarchical based on prefix matching URL or custom logic if needed.
    
    // For now we use the existing grouping algorithm (it groups by the last seen root, so items array order is important)
    let currentRootUrl = '';
    items.forEach(item => {
      if (item.depth === 0) {
        currentRootUrl = item.url;
        return;
      }
      if (!selectedRootSet.has(currentRootUrl)) {return;}
      const children = childrenByRoot.get(currentRootUrl) ?? [];
      children.push(item);
      childrenByRoot.set(currentRootUrl, children);
    });

    return selectedRoots.flatMap(root => [
      root,
      ...(childrenByRoot.get(root.url) ?? [])
    ]).slice(0, MENU_ITEMS_LIMIT);
  }, [enabledModules, maxDepth, postCategories, productCategories, routeMode, serviceCategories, isUseProductTypeLogic, smartMenuBuilderData, enableProductTypes]);

  const hasChanges = useMemo(() => {
    const normalize = (items: DraftMenuItem[]) => items.map(item => ({
      id: item.id,
      label: item.label,
      url: item.url,
      depth: item.depth,
      active: item.active,
      icon: item.icon,
      openInNewTab: item.openInNewTab,
      parentId: item.parentId,
      order: item.order,
    }));
    return JSON.stringify(normalize(draftItems)) !== JSON.stringify(normalize(originalItems));
  }, [draftItems, originalItems]);

  useEffect(() => {
    if (!menuItemsData) {return;}
    const nextItems = buildDraftItems(menuItemsData);
    const isInitialSync = originalItems.length === 0 && draftItems.length === 0;

    if (pendingSync || isInitialSync || !hasChanges) {
      setDraftItems(nextItems);
      setOriginalItems(nextItems);
      setPendingSync(false);
    }
  }, [menuItemsData, pendingSync, originalItems.length, draftItems.length, hasChanges]);

  useEffect(() => {
    if (isQuickPickerOpen) {return;}
    if (!quickRouteSearch) {return;}
    setQuickRouteSearch('');
  }, [isQuickPickerOpen, quickRouteSearch]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(draftItems.length / MENU_ITEMS_LIMIT));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * MENU_ITEMS_LIMIT;
    return draftItems.slice(start, start + MENU_ITEMS_LIMIT);
  }, [draftItems, currentPage]);

  const allPageSelected = paginatedItems.length > 0 && paginatedItems.every(item => selectedIds.includes(item.localId));
  const somePageSelected = paginatedItems.some(item => selectedIds.includes(item.localId));

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => draftItems.some(item => item.localId === id)));
  }, [draftItems]);

  const isLoading = menuItemsData === undefined;
  const isAtMenuLimit = draftItems.length >= MENU_ITEMS_LIMIT;

  const handleMove = (index: number, direction: 'up' | 'down') => {
    setDraftItems(prev => {
      if ((direction === 'up' && index === 0) || (direction === 'down' && index === prev.length - 1)) {return prev;}
      const next = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      if (!canApplyDraftItems(next)) {return prev;}
      return normalizeOrders(next);
    });
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      const next = [...draftItems];
      const [removed] = next.splice(draggedIndex, 1);
      next.splice(index, 0, removed);
      setDragOverIndex(canApplyDraftItems(next) ? index : null);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    setDraftItems(prev => {
      const next = [...prev];
      const [removed] = next.splice(draggedIndex, 1);
      next.splice(dropIndex, 0, removed);
      if (!canApplyDraftItems(next)) {return prev;}
      return normalizeOrders(next);
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleIndent = (item: DraftMenuItem, direction: 'in' | 'out') => {
    const newDepth = direction === 'in' 
      ? Math.min(item.depth + 1, maxDepth - 1) 
      : Math.max(item.depth - 1, 0);
    
    if (newDepth === item.depth) {return;}

    setDraftItems(prev => {
      const next = prev.map(current => current.localId === item.localId ? { ...current, depth: newDepth } : current);
      if (!canApplyDraftItems(next)) {return prev;}
      return next;
    });
  };

  const handleToggleActive = (item: DraftMenuItem) => {
    setDraftItems(prev => prev.map(current => current.localId === item.localId ? { ...current, active: !current.active } : current));
  };

  const handleDelete = (item: DraftMenuItem) => {
    if (confirm('Xóa liên kết này?')) {
      setDraftItems(prev => normalizeOrders(prev.filter(current => current.localId !== item.localId)));
      setSelectedIds(prev => prev.filter(id => id !== item.localId));
    }
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedIds(prev => prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]);
  };

  const toggleSelectAllPage = () => {
    const pageIds = paginatedItems.map(item => item.localId);
    if (allPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
      return;
    }
    setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) {return;}
    if (confirm(`Xóa ${selectedIds.length} liên kết đã chọn?`)) {
      setDraftItems(prev => normalizeOrders(prev.filter(item => !selectedIds.includes(item.localId))));
      setSelectedIds([]);
      toast.success(`Đã xóa ${selectedIds.length} liên kết`);
    }
  };

  const handleAdd = () => {
    if (isAtMenuLimit) {
      toast.error(`Tối đa ${MENU_ITEMS_LIMIT} menu items`);
      return;
    }
    setDraftItems(prev => {
      const next = [...prev, createLocalItem({ order: prev.length })];
      return normalizeOrders(next);
    });
  };

  const handleAddBelow = (item: DraftMenuItem) => {
    if (isAtMenuLimit) {
      toast.error(`Tối đa ${MENU_ITEMS_LIMIT} menu items`);
      return;
    }
    setDraftItems(prev => {
      const index = prev.findIndex(current => current.localId === item.localId);
      const next = [...prev];
      const newItem = createLocalItem({
        depth: item.depth,
        parentId: item.parentId,
      });
      next.splice(index + 1, 0, newItem);
      if (!canApplyDraftItems(next)) {return prev;}
      return normalizeOrders(next);
    });
  };

  const handleCopy = (item: DraftMenuItem) => {
    if (isAtMenuLimit) {
      toast.error(`Tối đa ${MENU_ITEMS_LIMIT} menu items`);
      return;
    }
    setDraftItems(prev => {
      const index = prev.findIndex(current => current.localId === item.localId);
      const next = [...prev];
      const newItem = createLocalItem({
        label: `${item.label} (copy)`,
        url: item.url,
        depth: item.depth,
        active: item.active,
        parentId: item.parentId,
        icon: item.icon,
        openInNewTab: item.openInNewTab,
      });
      next.splice(index + 1, 0, newItem);
      if (!canApplyDraftItems(next)) {return prev;}
      return normalizeOrders(next);
    });
  };

  const handleUpdateField = (itemId: string, field: 'label' | 'url', value: string) => {
    setDraftItems(prev => prev.map(item => item.localId === itemId ? { ...item, [field]: value } : item));
  };

  const handleOpenQuickPicker = (itemId: string) => {
    setQuickPickerTargetId(itemId);
    setIsQuickPickerOpen(true);
  };

  const handleCloseQuickPicker = () => {
    setIsQuickPickerOpen(false);
    setQuickPickerTargetId(null);
    setQuickRouteSearch('');
    setPickerStep(1);
    setSelectedType(null);
    setSelectedModule(null);
  };

  const handleSelectQuickRoute = (option: QuickRouteOption) => {
    if (!quickPickerTargetId) {return;}
    handleUpdateField(quickPickerTargetId, 'url', option.url);
    handleUpdateField(quickPickerTargetId, 'label', option.label);
    handleCloseQuickPicker();
  };

  // AI Import handler
  const handleAiImportApply = (lines: AiMenuLine[]) => {
    const remaining = MENU_ITEMS_LIMIT - draftItems.length;
    if (remaining <= 0) {
      toast.error(`Đã đạt tối đa ${MENU_ITEMS_LIMIT} menu items`);
      return;
    }

    const toAdd = lines.slice(0, remaining);
    const newItems: DraftMenuItem[] = toAdd.map((line, i) => createLocalItem({
      label: line.label,
      url: '/',
      depth: Math.min(line.depth, maxDepth - 1),
      order: draftItems.length + i,
    }));

    setDraftItems(prev => normalizeOrders([...prev, ...newItems]));
    toast.success(`Đã thêm ${newItems.length} menu item`);
  };

  const handleApplySmartBuilder = () => {
    if (smartMenuPlan.length === 0) {
      toast.error('Chưa có đủ dữ liệu để tạo menu thông minh');
      return;
    }

    const existingUrls = new Set(draftItems.map(item => item.url));
    const sourcePlan = smartBuilderMode === 'append'
      ? smartMenuPlan.filter(item => !existingUrls.has(item.url))
      : smartMenuPlan;
    const remaining = smartBuilderMode === 'append'
      ? MENU_ITEMS_LIMIT - draftItems.length
      : MENU_ITEMS_LIMIT;
    const toApply = sourcePlan.slice(0, remaining);

    if (toApply.length === 0) {
      toast.info('Menu hiện tại đã có đủ các mục được gợi ý');
      return;
    }

    const newItems = toApply.map((item, index) => createLocalItem({
      active: true,
      depth: Math.min(item.depth, maxDepth - 1),
      label: item.label,
      order: smartBuilderMode === 'append' ? draftItems.length + index : index,
      url: item.url,
    }));
    const nextItems = smartBuilderMode === 'replace'
      ? normalizeOrders(newItems)
      : normalizeOrders([...draftItems, ...newItems]);

    if (!canApplyDraftItems(nextItems)) {
      toast.error('Menu gợi ý chưa hợp lệ. Vui lòng giảm số tầng menu.');
      return;
    }

    setDraftItems(nextItems);
    setCurrentPage(1);
    setSelectedIds([]);
    setIsSmartBuilderOpen(false);
    toast.success(`${smartBuilderMode === 'replace' ? 'Đã dựng lại' : 'Đã thêm'} ${newItems.length} mục menu`);
  };

  const handleSaveAll = async () => {
    if (!hasChanges) {return;}
    if (!isValidMenuStructure(draftItems)) {
      toast.error('Cấu trúc menu không hợp lệ: không được nhảy tầng và item đầu phải ở tầng 1');
      return;
    }
    setIsSavingAll(true);
    try {
      await saveMenuItemsBulk({
        menuId,
        items: draftItems.map(item => ({
          id: item.id,
          label: item.label,
          url: item.url,
          depth: item.depth,
          active: item.active,
          icon: item.icon,
          openInNewTab: item.openInNewTab,
          parentId: item.parentId,
        })),
      });
      toast.success('Đã lưu tất cả thay đổi');
      setPendingSync(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi khi lưu');
    } finally {
      setIsSavingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 size={24} className="animate-spin text-orange-500" />
      </div>
    );
  }

  // Get actual index in full items array for move operations
  const getActualIndex = (item: DraftMenuItem) => draftItems.findIndex(i => i.localId === item.localId);

  const quickRouteKeyword = quickRouteSearch.trim().toLowerCase();

  const pickerTypeOptions = [
    { type: 'core' as const, label: 'Trang cơ bản', description: 'Trang chủ, Liên hệ...' },
    { type: 'module' as const, label: 'Module', description: 'Posts, Products, Services...' },
    { type: 'category' as const, label: 'Danh mục', description: 'Category filters' },
    { type: 'detail' as const, label: 'Chi tiết', description: 'Bài viết, Sản phẩm, Dịch vụ' },
  ];

  const detailModuleOptions = [
    {
      key: 'posts' as const,
      label: 'Bài viết chi tiết',
      description: 'Chọn 1 bài viết cụ thể',
      enabled: enabledModules?.some(moduleItem => moduleItem.key === 'posts'),
    },
    {
      key: 'products' as const,
      label: 'Sản phẩm chi tiết',
      description: 'Chọn 1 sản phẩm cụ thể',
      enabled: enabledModules?.some(moduleItem => moduleItem.key === 'products'),
    },
    {
      key: 'services' as const,
      label: 'Dịch vụ chi tiết',
      description: 'Chọn 1 dịch vụ cụ thể',
      enabled: enabledModules?.some(moduleItem => moduleItem.key === 'services'),
    },
  ];

  const availableDetailModules = detailModuleOptions.filter(option => option.enabled);
  const filteredDetailModules = quickRouteKeyword
    ? availableDetailModules.filter(option =>
      option.label.toLowerCase().includes(quickRouteKeyword)
      || option.description.toLowerCase().includes(quickRouteKeyword)
    )
    : availableDetailModules;
  const resolvedDetailModules = filteredDetailModules.length > 0
    ? filteredDetailModules
    : availableDetailModules;

  const filteredPickerRoutes = filteredQuickRoutes.filter(option => {
    if (selectedType === 'core') {return option.group === 'Trang cơ bản';}
    if (selectedType === 'module') {return option.group === 'Module';}
    if (selectedType === 'category') {return option.group === 'Danh mục';}
    return false;
  });

  const isDetailLoading = pickerStep === 3 && (
    (selectedModule === 'posts' && detailPosts === undefined)
    || (selectedModule === 'products' && detailProducts === undefined)
    || (selectedModule === 'services' && detailServices === undefined)
  );

  const stats = [
    { label: 'Tổng', value: draftItems.length },
    { label: 'Hiện', value: draftItems.filter(item => item.active).length },
    { label: 'Ẩn', value: draftItems.filter(item => !item.active).length },
    { label: 'Tầng', value: maxDepth },
  ];
  const hasInvalidStructure = !isValidMenuStructure(draftItems);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(180px,1fr)] gap-4 xl:gap-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500">Chỉnh sửa menu và bấm lưu để áp dụng. Tối đa {MENU_ITEMS_LIMIT} menu items.</p>
        </div>

        <BulkActionBar
          selectedCount={selectedIds.length}
          entityLabel="liên kết"
          onDelete={handleBulkDelete}
          onClearSelection={() => { setSelectedIds([]); }}
        />

        {paginatedItems.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <SelectCheckbox
              checked={allPageSelected}
              indeterminate={!allPageSelected && somePageSelected}
              onChange={toggleSelectAllPage}
              title="Chọn tất cả trên trang"
            />
            <span className="text-slate-600 dark:text-slate-300">Chọn tất cả menu ở trang hiện tại</span>
          </div>
        )}

        {paginatedItems.map((item) => {
          const actualIndex = getActualIndex(item);
          const canMoveUp = actualIndex > 0 && canApplyDraftItems((() => {
            const next = [...draftItems];
            [next[actualIndex], next[actualIndex - 1]] = [next[actualIndex - 1], next[actualIndex]];
            return next;
          })());
          const canMoveDown = actualIndex < draftItems.length - 1 && canApplyDraftItems((() => {
            const next = [...draftItems];
            [next[actualIndex], next[actualIndex + 1]] = [next[actualIndex + 1], next[actualIndex]];
            return next;
          })());
          const canIndentOut = item.depth > 0 && canApplyDraftItems(
            draftItems.map(current => current.localId === item.localId ? { ...current, depth: Math.max(item.depth - 1, 0) } : current)
          );
          const canIndentIn = item.depth < maxDepth - 1 && canApplyDraftItems(
            draftItems.map(current => current.localId === item.localId ? { ...current, depth: Math.min(item.depth + 1, maxDepth - 1) } : current)
          );

          return (
            <div 
              key={item.localId}
              draggable
              onDragStart={(e) =>{  handleDragStart(e, actualIndex); }}
              onDragOver={(e) =>{  handleDragOver(e, actualIndex); }}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, actualIndex)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-2 p-3 bg-white dark:bg-slate-900 border rounded-lg shadow-sm transition-all min-w-0 border-slate-200 dark:border-slate-700",
                selectedIds.includes(item.localId) && "ring-2 ring-blue-500/40 border-blue-300 dark:border-blue-700",
                !item.active && "opacity-50",
                draggedIndex === actualIndex && "opacity-50 scale-[0.98]",
                dragOverIndex === actualIndex && "border-orange-500 border-2 bg-orange-50 dark:bg-orange-900/20"
              )}
              style={showNested ? { marginLeft: Math.min(item.depth, MENU_MAX_LEVEL - 1) * 24 } : undefined}
            >
              <div className="flex items-center self-start pt-1">
                <SelectCheckbox
                  checked={selectedIds.includes(item.localId)}
                  onChange={() => toggleSelectItem(item.localId)}
                  title="Chọn menu item"
                />
              </div>

              <div className="flex flex-col gap-1 text-slate-300 cursor-grab active:cursor-grabbing">
                <button type="button" onClick={ async () => handleMove(actualIndex, 'up')} className="hover:text-orange-600 disabled:opacity-30" disabled={!canMoveUp}><ArrowUp size={14}/></button>
                <GripVertical size={14} className="text-slate-400" />
                <button type="button" onClick={ async () => handleMove(actualIndex, 'down')} className="hover:text-orange-600 disabled:opacity-30" disabled={!canMoveDown}><ArrowDown size={14}/></button>
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Nhãn hiển thị</Label>
                  <Input 
                    value={item.label} 
                    onChange={(e) =>{  handleUpdateField(item.localId, 'label', e.target.value); }} 
                    className="h-8 text-sm min-w-0" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">URL</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={item.url} 
                      onChange={(e) =>{  handleUpdateField(item.localId, 'url', e.target.value); }} 
                      className="h-8 text-sm font-mono text-xs min-w-0" 
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 whitespace-nowrap"
                      onClick={() => handleOpenQuickPicker(item.localId)}
                    >
                      Gợi ý
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 border-l border-slate-100 dark:border-slate-700 pl-2">
                {showNested && (
                  <>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleIndent(item, 'out')} disabled={!canIndentOut} title="Thụt lề trái">
                      <ChevronRight size={14} className="rotate-180"/>
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleIndent(item, 'in')} disabled={!canIndentIn} title={`Thụt lề phải (tối đa ${MENU_MAX_LEVEL} tầng)`}>
                      <ChevronRight size={14}/>
                    </Button>
                  </>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddBelow(item)} title="Thêm ngay bên dưới" disabled={isAtMenuLimit}>
                  <Plus size={14}/>
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopy(item)} title="Copy menu item" disabled={isAtMenuLimit}>
                  <Copy size={14}/>
                </Button>
                {showNewTab && item.openInNewTab && (
                  <span title="Mở tab mới"><ExternalLink size={14} className="text-slate-400" /></span>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(item)} title={item.active ? 'Ẩn' : 'Hiện'}>
                  {item.active ? <Eye size={14}/> : <EyeOff size={14} className="text-slate-400"/>}
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(item)}>
                  <Trash2 size={14}/>
                </Button>
              </div>
            </div>
          );
        })}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 border-dashed" onClick={handleAdd} disabled={isAtMenuLimit}>
            <Plus size={16} className="mr-2"/> {isAtMenuLimit ? `Đã đạt tối đa ${MENU_ITEMS_LIMIT} mục menu` : 'Thêm liên kết mới'}
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setIsSmartBuilderOpen(true)} title="Tự gợi ý menu từ dữ liệu đang có">
            <Sparkles size={16} /> Gợi ý menu
          </Button>
          <Button variant="outline" className="gap-1.5" onClick={() => setIsAiImportOpen(true)} disabled={isAtMenuLimit} title="Import menu từ AI">
            <Bot size={16} /> Nhập AI
          </Button>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500">
              Hiển thị {(currentPage - 1) * MENU_ITEMS_LIMIT + 1}-{Math.min(currentPage * MENU_ITEMS_LIMIT, draftItems.length)} / {draftItems.length}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() =>{  setCurrentPage(p => Math.max(1, p - 1)); }}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Trang {currentPage} / {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() =>{  setCurrentPage(p => Math.min(totalPages, p + 1)); }}
                disabled={currentPage === totalPages}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Thống kê</CardTitle></CardHeader>
          <CardContent className="space-y-2 pt-0">
            {stats.map((stat) => (
              <div key={stat.label} className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{stat.label}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{stat.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Menu Preview Section */}
      <div className="lg:col-span-3">
        <SimpleMenuPreview
          items={draftItems.map(item => ({
            _id: (item.id ?? item.localId) as Id<"menuItems">,
            label: item.label,
            url: item.url,
            order: item.order,
            depth: item.depth,
            active: item.active,
          }))}
        />
      </div>

      <Dialog
        open={isQuickPickerOpen}
        onOpenChange={(open) =>{ if (open) { setIsQuickPickerOpen(true); } else { handleCloseQuickPicker(); } }}
      >
        <DialogContent className="max-w-2xl w-[80vw]">
          <DialogHeader>
            <DialogTitle>Chọn URL - Bước {pickerStep}/3</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              value={quickRouteSearch}
              onChange={(e) => setQuickRouteSearch(e.target.value)}
              placeholder={
                pickerStep === 1
                  ? 'Tìm theo loại...'
                  : pickerStep === 2
                    ? (selectedType === 'detail' ? 'Tìm module...' : 'Tìm theo tên hoặc URL...')
                    : 'Tìm theo tên...'
              }
              className="h-9 text-sm"
            />

            <div className="space-y-3">
              {pickerStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {pickerTypeOptions.map(option => (
                    <Button
                      key={option.type}
                      type="button"
                      variant="outline"
                      className="h-20 flex-col items-start gap-1.5 text-left"
                      onClick={() => {
                        setSelectedType(option.type);
                        setPickerStep(2);
                      }}
                    >
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-xs text-slate-500">{option.description}</span>
                    </Button>
                  ))}
                </div>
              )}

              {pickerStep === 2 && selectedType === 'detail' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPickerStep(1);
                      setSelectedType(null);
                    }}
                  >
                    ← Quay lại
                  </Button>

                  {resolvedDetailModules.length === 0 ? (
                    <div className="rounded-md border border-slate-200 px-4 py-6 text-sm text-slate-500">
                      Không có module phù hợp.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {resolvedDetailModules.map(option => (
                        <Button
                          key={option.key}
                          type="button"
                          variant="outline"
                          className="justify-start h-16"
                          onClick={() => {
                            setSelectedModule(option.key);
                            setPickerStep(3);
                          }}
                        >
                          <div className="text-left">
                            <div className="font-semibold">{option.label}</div>
                            <div className="text-xs text-slate-500">{option.description}</div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {pickerStep === 2 && selectedType && selectedType !== 'detail' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPickerStep(1);
                      setSelectedType(null);
                    }}
                  >
                    ← Quay lại
                  </Button>

                  <div className="max-h-[50vh] overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
                    {filteredPickerRoutes.length === 0 ? (
                      <div className="px-4 py-6 text-sm text-slate-500">Không có gợi ý phù hợp.</div>
                    ) : (
                      <div className="space-y-1 p-2">
                        {filteredPickerRoutes.map(option => (
                          <button
                            key={`${option.url}-${option.source}`}
                            type="button"
                            onClick={() => handleSelectQuickRoute(option)}
                            className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-700 dark:text-slate-200 truncate">
                                {option.label}
                              </div>
                              <div className="text-xs text-slate-500 font-mono truncate">{option.url}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {pickerStep === 3 && selectedModule && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPickerStep(2);
                      setSelectedModule(null);
                    }}
                  >
                    ← Quay lại
                  </Button>

                  <div className="max-h-[50vh] overflow-auto rounded-md border border-slate-200 dark:border-slate-800">
                    {isDetailLoading && (
                      <div className="px-4 py-6 text-sm text-slate-500">Đang tải dữ liệu...</div>
                    )}

                    {!isDetailLoading && selectedModule === 'posts' && (detailPosts?.length ?? 0) === 0 && (
                      <div className="px-4 py-6 text-sm text-slate-500">Không tìm thấy bài viết.</div>
                    )}

                    {!isDetailLoading && selectedModule === 'products' && (detailProducts?.length ?? 0) === 0 && (
                      <div className="px-4 py-6 text-sm text-slate-500">Không tìm thấy sản phẩm.</div>
                    )}

                    {!isDetailLoading && selectedModule === 'services' && (detailServices?.length ?? 0) === 0 && (
                      <div className="px-4 py-6 text-sm text-slate-500">Không tìm thấy dịch vụ.</div>
                    )}

                    {!isDetailLoading && selectedModule === 'posts' && (detailPosts?.length ?? 0) > 0 && (
                      <div className="space-y-1 p-2">
                        {detailPosts?.map(post => (
                          <button
                            key={post._id}
                            type="button"
                            onClick={() => {
                              handleSelectQuickRoute({
                                label: post.title,
                                url: buildDetailPath({
                                  categorySlug: post.categorySlug,
                                  mode: routeMode,
                                  moduleKey: 'posts',
                                  recordSlug: post.slug,
                                }),
                                source: 'posts',
                                group: 'Module',
                              });
                            }}
                            className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700 truncate">{post.title}</div>
                              <div className="text-xs text-slate-500 font-mono truncate">
                                {buildDetailPath({
                                  categorySlug: post.categorySlug,
                                  mode: routeMode,
                                  moduleKey: 'posts',
                                  recordSlug: post.slug,
                                })}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!isDetailLoading && selectedModule === 'products' && (detailProducts?.length ?? 0) > 0 && (
                      <div className="space-y-1 p-2">
                        {detailProducts?.map(product => (
                          <button
                            key={product._id}
                            type="button"
                            onClick={() => {
                              handleSelectQuickRoute({
                                label: product.name,
                                url: buildDetailPath({
                                  categorySlug: product.categorySlug,
                                  mode: routeMode,
                                  moduleKey: 'products',
                                  recordSlug: product.slug,
                                }),
                                source: 'products',
                                group: 'Module',
                              });
                            }}
                            className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700 truncate">{product.name}</div>
                              <div className="text-xs text-slate-500 font-mono truncate">
                                {buildDetailPath({
                                  categorySlug: product.categorySlug,
                                  mode: routeMode,
                                  moduleKey: 'products',
                                  recordSlug: product.slug,
                                })}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!isDetailLoading && selectedModule === 'services' && (detailServices?.length ?? 0) > 0 && (
                      <div className="space-y-1 p-2">
                        {detailServices?.map(service => (
                          <button
                            key={service._id}
                            type="button"
                            onClick={() => {
                              handleSelectQuickRoute({
                                label: service.title,
                                url: buildDetailPath({
                                  categorySlug: service.categorySlug,
                                  mode: routeMode,
                                  moduleKey: 'services',
                                  recordSlug: service.slug,
                                }),
                                source: 'services',
                                group: 'Module',
                              });
                            }}
                            className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-slate-700 truncate">{service.title}</div>
                              <div className="text-xs text-slate-500 font-mono truncate">
                                {buildDetailPath({
                                  categorySlug: service.categorySlug,
                                  mode: routeMode,
                                  moduleKey: 'services',
                                  recordSlug: service.slug,
                                })}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Import Dialog */}
      <AiMenuImportDialog
        open={isAiImportOpen}
        onOpenChange={setIsAiImportOpen}
        onApply={handleAiImportApply}
      />

      <Dialog open={isSmartBuilderOpen} onOpenChange={setIsSmartBuilderOpen}>
        <DialogContent className="max-w-3xl w-[88vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Tự gợi ý menu
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">
              Hệ thống sẽ đọc các khu vực đang bật, danh mục đang có và tự xếp menu ngắn gọn. Đây chỉ là bản nháp, bạn vẫn xem lại rồi mới lưu.
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSmartBuilderMode('replace')}
                className={cn(
                  'rounded-lg border p-3 text-left text-sm transition-colors',
                  smartBuilderMode === 'replace'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                )}
              >
                <div className="font-semibold">Thay menu hiện tại</div>
                <div className="mt-1 text-xs text-slate-500">Xóa bản nháp đang sửa và dùng menu được gợi ý.</div>
              </button>

              <button
                type="button"
                onClick={() => setSmartBuilderMode('append')}
                className={cn(
                  'rounded-lg border p-3 text-left text-sm transition-colors',
                  smartBuilderMode === 'append'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                )}
              >
                <div className="font-semibold">Chỉ thêm mục thiếu</div>
                <div className="mt-1 text-xs text-slate-500">Giữ menu hiện tại, chỉ thêm mục chưa có.</div>
              </button>
            </div>

            {enableProductTypes && (
              <div className="flex items-center space-x-3 mt-4 p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <input
                  type="checkbox"
                  id="useProductTypeLogic"
                  checked={isUseProductTypeLogic}
                  onChange={(e) => setIsUseProductTypeLogic(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="useProductTypeLogic" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                  Sinh menu theo cấu trúc Loại sản phẩm và Bộ lọc đặc biệt
                </label>
              </div>
            )}

            <div className="max-h-[45vh] overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              {smartMenuPlan.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">Chưa có gợi ý phù hợp.</div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {smartMenuPlan.map((item, index) => (
                    <div key={`${item.url}-${index}`} className="px-4 py-3" style={{ paddingLeft: 16 + item.depth * 24 }}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">#{index + 1}</span>
                            {item.depth > 0 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                                Tầng {item.depth + 1}
                              </span>
                            )}
                            <span className="font-medium text-slate-800 dark:text-slate-100">{item.label}</span>
                          </div>
                          <div className="mt-1 truncate font-mono text-xs text-slate-500">{item.url}</div>
                          <div className="mt-1 text-xs text-slate-500">{item.reasons.join(' • ')}</div>
                        </div>
                        <div className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300" title={`Điểm ưu tiên: ${Math.round(item.score)}`}>
                          Ưu tiên
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsSmartBuilderOpen(false)}>
                Hủy
              </Button>
              <Button type="button" onClick={handleApplySmartBuilder} disabled={smartMenuPlan.length === 0}>
                Dùng gợi ý này
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <HomeComponentStickyFooter
        isSubmitting={isSavingAll}
        hasChanges={hasChanges}
        onClickSave={handleSaveAll}
        submitType="button"
        submitLabel="Lưu tất cả"
        savedLabel="Đã lưu"
        disableSave={!hasChanges || isSavingAll || hasInvalidStructure}
        align="between"
      >
        <div className="hidden text-xs text-slate-500 md:block">
          {hasInvalidStructure ? 'Cấu trúc menu chưa hợp lệ' : `${draftItems.length}/${MENU_ITEMS_LIMIT} mục menu`}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleAdd} disabled={isAtMenuLimit || isSavingAll}>
            <Plus size={16} className="mr-1" />
            Thêm liên kết
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsAiImportOpen(true)} disabled={isAtMenuLimit || isSavingAll}>
            <Bot size={16} className="mr-1" />
            Nhập từ AI
          </Button>
          <Button type="button" variant="outline" onClick={() => setIsSmartBuilderOpen(true)} disabled={isSavingAll}>
            <Sparkles size={16} className="mr-1" />
            Gợi ý menu
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={handleSaveAll}
            disabled={!hasChanges || isSavingAll || hasInvalidStructure}
          >
            {isSavingAll ? 'Đang lưu...' : hasChanges ? 'Lưu tất cả' : 'Đã lưu'}
          </Button>
        </div>
      </HomeComponentStickyFooter>
    </div>
  );
}
