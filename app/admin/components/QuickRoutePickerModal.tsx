'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/admin/components/ui';
import { InputWithClear } from '@/app/admin/home-components/stats/_components/InputWithClear';
import { Loader2 } from 'lucide-react';
import { buildCategoryPath } from '@/lib/ia/route-mode';

export type QuickRouteGroup = 'Trang cơ bản' | 'Module' | 'Danh mục';

export type QuickRouteOption = {
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
  promotions: [
    { label: 'Khuyến mãi', url: '/promotions' },
  ],
  wishlist: [
    { label: 'Wishlist', url: '/wishlist' },
  ],
};

interface QuickRoutePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (option: QuickRouteOption) => void;
  title?: string;
}

export function QuickRoutePickerModal({ open, onOpenChange, onSelect, title }: QuickRoutePickerModalProps) {
  const [quickRouteSearch, setQuickRouteSearch] = useState('');
  const [pickerStep, setPickerStep] = useState(1);
  const [selectedType, setSelectedType] = useState<'core' | 'module' | 'category' | 'detail' | null>(null);
  const [selectedModule, setSelectedModule] = useState<'posts' | 'products' | 'services' | null>(null);

  const productCategories = useQuery(api.productCategories.listActive);
  const serviceCategories = useQuery(api.serviceCategories.listActive, { limit: 100 });
  const postCategories = useQuery(api.postCategories.listActive, { limit: 100 });
  const enabledModules = useQuery(api.admin.modules.listEnabledModules);

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

  const quickRouteOptions = useMemo(() => {
    const enabledKeys = new Set((enabledModules ?? []).map((m: any) => m.key));
    const options: QuickRouteOption[] = [...CORE_ROUTE_OPTIONS];

    Object.entries(MODULE_SITE_ROUTE_CATALOG).forEach(([moduleKey, routes]) => {
      if (!enabledKeys.has(moduleKey)) return;
      routes.forEach((route) => {
        options.push({ ...route, source: moduleKey, group: 'Module' });
      });
    });

    if (enabledKeys.has('products')) {
      (productCategories ?? []).forEach((category: any) => {
        options.push({
          group: 'Danh mục',
          label: category.name,
          source: 'products',
          url: buildCategoryPath({ categorySlug: category.slug, mode: 'unified', moduleKey: 'products' }),
        });
      });
    }

    if (enabledKeys.has('posts')) {
      (postCategories ?? []).forEach((category: any) => {
        options.push({
          group: 'Danh mục',
          label: category.name,
          source: 'posts',
          url: buildCategoryPath({ categorySlug: category.slug, mode: 'unified', moduleKey: 'posts' }),
        });
      });
    }

    if (enabledKeys.has('services')) {
      (serviceCategories ?? []).forEach((category: any) => {
        options.push({
          group: 'Danh mục',
          label: category.name,
          source: 'services',
          url: buildCategoryPath({ categorySlug: category.slug, mode: 'unified', moduleKey: 'services' }),
        });
      });
    }

    const deduped = new Map<string, QuickRouteOption>();
    options.forEach((option) => {
      if (!deduped.has(option.url)) {
        deduped.set(option.url, option);
      }
    });

    return Array.from(deduped.values());
  }, [enabledModules, postCategories, productCategories, serviceCategories]);

  const quickRouteKeyword = quickRouteSearch.trim().toLowerCase();

  const filteredQuickRoutes = useMemo(() => {
    if (!quickRouteKeyword) return quickRouteOptions;
    return quickRouteOptions.filter((option) =>
      option.label.toLowerCase().includes(quickRouteKeyword) ||
      option.url.toLowerCase().includes(quickRouteKeyword) ||
      option.source.toLowerCase().includes(quickRouteKeyword)
    );
  }, [quickRouteOptions, quickRouteKeyword]);

  const pickerTypeOptions = [
    { type: 'core' as const, label: 'Trang cơ bản', description: 'Trang chủ, liên hệ...' },
    { type: 'module' as const, label: 'Module', description: 'Posts, Products, Services...' },
    { type: 'category' as const, label: 'Danh mục', description: 'Danh mục thật từ dữ liệu' },
    { type: 'detail' as const, label: 'Chi tiết', description: 'Bài viết, sản phẩm, dịch vụ cụ thể' },
  ];

  const detailModuleOptions = [
    {
      key: 'posts' as const,
      label: 'Bài viết chi tiết',
      description: 'Chọn 1 bài viết cụ thể',
      enabled: enabledModules?.some((m: any) => m.key === 'posts'),
    },
    {
      key: 'products' as const,
      label: 'Sản phẩm chi tiết',
      description: 'Chọn 1 sản phẩm cụ thể',
      enabled: enabledModules?.some((m: any) => m.key === 'products'),
    },
    {
      key: 'services' as const,
      label: 'Dịch vụ chi tiết',
      description: 'Chọn 1 dịch vụ cụ thể',
      enabled: enabledModules?.some((m: any) => m.key === 'services'),
    },
  ];

  const availableDetailModules = detailModuleOptions.filter((option) => option.enabled);
  const filteredDetailModules = quickRouteKeyword
    ? availableDetailModules.filter((option) =>
        option.label.toLowerCase().includes(quickRouteKeyword) ||
        option.description.toLowerCase().includes(quickRouteKeyword)
      )
    : availableDetailModules;
  const resolvedDetailModules = filteredDetailModules.length > 0 ? filteredDetailModules : availableDetailModules;

  const filteredPickerRoutes = filteredQuickRoutes.filter((option) => {
    if (selectedType === 'core') return option.group === 'Trang cơ bản';
    if (selectedType === 'module') return option.group === 'Module';
    if (selectedType === 'category') return option.group === 'Danh mục';
    return false;
  });

  const isDetailLoading =
    pickerStep === 3 &&
    ((selectedModule === 'posts' && detailPosts === undefined) ||
      (selectedModule === 'products' && detailProducts === undefined) ||
      (selectedModule === 'services' && detailServices === undefined));

  const handleClose = () => {
    setQuickRouteSearch('');
    setPickerStep(1);
    setSelectedType(null);
    setSelectedModule(null);
    onOpenChange(false);
  };

  const handleSelect = (option: QuickRouteOption) => {
    onSelect(option);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else onOpenChange(true); }}>
      <DialogContent className="w-[90vw] max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {title || 'Chọn link gợi ý'} - Bước {pickerStep}/3
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <InputWithClear
            value={quickRouteSearch}
            onChange={(v) => setQuickRouteSearch(v)}
            placeholder={
              pickerStep === 1
                ? 'Tìm theo loại...'
                : pickerStep === 2
                ? selectedType === 'detail'
                  ? 'Tìm module...'
                  : 'Tìm theo tên hoặc URL...'
                : 'Tìm theo tên...'
            }
            className="h-9 text-sm"
          />

          <div className="space-y-3">
            {pickerStep === 1 && (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {pickerTypeOptions.map((option) => (
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
                  <div className="rounded-md border border-slate-200 px-4 py-6 text-sm text-slate-500 dark:border-slate-800">
                    Không có module phù hợp.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {resolvedDetailModules.map((option) => (
                      <Button
                        key={option.key}
                        type="button"
                        variant="outline"
                        className="h-16 justify-start"
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
                      {filteredPickerRoutes.map((option) => (
                        <button
                          key={`${option.url}-${option.source}`}
                          type="button"
                          onClick={() => handleSelect(option)}
                          className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <div className="min-w-0">
                            <div className="break-words font-semibold text-slate-700 dark:text-slate-200">
                              {option.label}
                            </div>
                            <div className="break-all font-mono text-xs text-slate-500">{option.url}</div>
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
                    <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                      <Loader2 size={14} className="animate-spin" /> Đang tải dữ liệu...
                    </div>
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
                      {detailPosts?.map((post) => (
                        <button
                          key={post._id}
                          type="button"
                          onClick={() =>
                            handleSelect({
                              label: post.title,
                              url: `/${post.categorySlug || 'chua-phan-loai'}/${post.slug}`,
                              source: 'posts',
                              group: 'Module',
                            })
                          }
                          className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="break-words font-semibold text-slate-700 dark:text-slate-200">
                              {post.title}
                            </div>
                            <div className="break-all font-mono text-xs text-slate-500">
                              {`/${post.categorySlug || 'chua-phan-loai'}/${post.slug}`}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!isDetailLoading && selectedModule === 'products' && (detailProducts?.length ?? 0) > 0 && (
                    <div className="space-y-1 p-2">
                      {detailProducts?.map((product) => (
                        <button
                          key={product._id}
                          type="button"
                          onClick={() =>
                            handleSelect({
                              label: product.name,
                              url: `/${product.categorySlug || 'chua-phan-loai'}/${product.slug}`,
                              source: 'products',
                              group: 'Module',
                            })
                          }
                          className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="break-words font-semibold text-slate-700 dark:text-slate-200">
                              {product.name}
                            </div>
                            <div className="break-all font-mono text-xs text-slate-500">
                              {`/${product.categorySlug || 'chua-phan-loai'}/${product.slug}`}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!isDetailLoading && selectedModule === 'services' && (detailServices?.length ?? 0) > 0 && (
                    <div className="space-y-1 p-2">
                      {detailServices?.map((service) => (
                        <button
                          key={service._id}
                          type="button"
                          onClick={() =>
                            handleSelect({
                              label: service.title,
                              url: `/${service.categorySlug || 'chua-phan-loai'}/${service.slug}`,
                              source: 'services',
                              group: 'Module',
                            })
                          }
                          className="flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="break-words font-semibold text-slate-700 dark:text-slate-200">
                              {service.title}
                            </div>
                            <div className="break-all font-mono text-xs text-slate-500">
                              {`/${service.categorySlug || 'chua-phan-loai'}/${service.slug}`}
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
  );
}
