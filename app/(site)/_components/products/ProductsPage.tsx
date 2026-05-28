'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { PublicImage as Image } from '@/components/shared/PublicImage';
import { useMutation, usePaginatedQuery, useQuery } from 'convex/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { api } from '@/convex/_generated/api';
import { useBrandColors } from '@/components/site/hooks';
import { getProductsListColors, type ProductsListColors } from '@/components/site/products/colors';
import { useCartConfig, useCheckoutConfig, useProductsListConfig } from '@/lib/experiences';
import { useCustomerAuth } from '@/app/(site)/auth/context';
import { notifyAddToCart, useCart } from '@/lib/cart';
import { buildCategoryPath, buildDetailPath, buildModuleListPath, normalizeRouteMode } from '@/lib/ia/route-mode';
import { QuickAddVariantModal } from '@/components/products/QuickAddVariantModal';
import { ProductImageWithOverlay, useProductImageOverlayConfigs } from '@/components/shared/ProductImageWithOverlay';
import type { WatermarkConfig, ProductFrameConfig } from '@/components/shared/ProductImageWithOverlay';
import { ChevronDown, Heart, Package, Search, ShoppingCart, SlidersHorizontal, X, Check } from 'lucide-react';
import type { Id } from '@/convex/_generated/dataModel';
import { getPublicPriceLabel } from '@/lib/products/public-price';
import { getProductImageAspectRatioCssValue, resolveProductImageAspectRatio } from '@/lib/products/image-aspect-ratio';
import { RichContent } from '@/components/common/RichContent';
import { toRichTextContent } from '@/lib/products/product-supplemental-content';
import { RangeSlider } from '@/components/shared/RangeSlider';
import { getAttributeIconComponent } from '@/app/admin/attribute-groups/_lib/iconRegistry';

type ProductSortOption = 'newest' | 'oldest' | 'popular' | 'price_asc' | 'price_desc' | 'name';
type ProductsListLayout = 'grid' | 'list' | 'catalog';
type ProductsSaleMode = 'cart' | 'contact' | 'affiliate';
type ProductListCornerRadius = 'none' | 'sm' | 'lg';

const getProductListRadiusClass = (cornerRadius: ProductListCornerRadius = 'lg') => {
  if (cornerRadius === 'none') return 'rounded-none';
  if (cornerRadius === 'sm') return 'rounded-md';
  return 'rounded-xl';
};

function useProductImageAspectRatioSetting() {
  const setting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'defaultImageAspectRatio' });
  return useMemo(() => resolveProductImageAspectRatio(setting?.value), [setting?.value]);
}

function useEnabledProductFields(): Set<string> {
  const fields = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: 'products' });
  return useMemo(() => {
    if (!fields) {return new Set<string>();}
    return new Set(fields.map(f => f.fieldKey));
  }, [fields]);
}

function useProductImagePlaceholder() {
  const productImagePlaceholderSetting = useQuery(api.settings.getValue, { key: 'product_image_placeholder', defaultValue: '' });
  return typeof productImagePlaceholderSetting === 'string' ? productImagePlaceholderSetting : '';
}


function ProductsListSkeleton() {
  const brandColors = useBrandColors();
  const imageAspectRatio = useProductImageAspectRatioSetting();
  const tokens = useMemo(
    () => getProductsListColors(brandColors.primary, brandColors.secondary, brandColors.mode || 'single'),
    [brandColors.primary, brandColors.secondary, brandColors.mode]
  );
  const imageAspectRatioStyle = useMemo(
    () => ({ aspectRatio: getProductImageAspectRatioCssValue(imageAspectRatio) }),
    [imageAspectRatio]
  );

  return (
    <div className="py-8 md:py-12 px-4 animate-pulse">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="h-10 w-64 rounded mx-auto" style={{ backgroundColor: tokens.filterChipBg }} />
        </div>
        <div
          className="rounded-xl border p-4 mb-8"
          style={{ backgroundColor: tokens.filterBarBackground, borderColor: tokens.filterBarBorder }}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="h-10 flex-1 max-w-xs rounded-lg" style={{ backgroundColor: tokens.filterChipBg }} />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-8 w-20 rounded-full" style={{ backgroundColor: tokens.filterChipBg }} />
              ))}
            </div>
          </div>
        </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="rounded-xl overflow-hidden border"
              style={{ backgroundColor: tokens.cardBackground, borderColor: tokens.cardBorder }}
            >
              <div style={{ ...imageAspectRatioStyle, backgroundColor: tokens.filterChipBg }} />
              <div className="p-4 space-y-3">
                <div className="h-4 w-full rounded" style={{ backgroundColor: tokens.filterChipBg }} />
                <div className="h-5 w-24 rounded" style={{ backgroundColor: tokens.filterChipBg }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function generatePaginationItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const items: (number | 'ellipsis')[] = [];
  const siblingCount = 1;

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      items.push(i);
    }
    return items;
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const shouldShowLeftDots = leftSiblingIndex > 2;
  const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

  const firstPageIndex = 1;
  const lastPageIndex = totalPages;

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftRange = 3 + 2 * siblingCount;
    for (let i = 1; i <= leftRange; i++) {
      items.push(i);
    }
    items.push('ellipsis');
    items.push(totalPages);
    return items;
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    items.push(firstPageIndex);
    items.push('ellipsis');
    const rightRange = 3 + 2 * siblingCount;
    for (let i = totalPages - rightRange + 1; i <= totalPages; i++) {
      items.push(i);
    }
    return items;
  }

  items.push(firstPageIndex);
  items.push('ellipsis');
  for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
    items.push(i);
  }
  items.push('ellipsis');
  items.push(lastPageIndex);

  return items;
}

function ProductsGridSkeleton({ count = 8, tokens }: { count?: number; tokens: ProductsListColors }) {
  const imageAspectRatio = useProductImageAspectRatioSetting();
  const imageAspectRatioStyle = useMemo(
    () => ({ aspectRatio: getProductImageAspectRatioCssValue(imageAspectRatio) }),
    [imageAspectRatio]
  );
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl overflow-hidden border"
          style={{ backgroundColor: tokens.cardBackground, borderColor: tokens.cardBorder }}
        >
          <div style={{ ...imageAspectRatioStyle, backgroundColor: tokens.filterChipBg }} />
          <div className="p-4 space-y-3">
            <div className="h-4 w-full rounded" style={{ backgroundColor: tokens.filterChipBg }} />
            <div className="h-5 w-24 rounded" style={{ backgroundColor: tokens.filterChipBg }} />
          </div>
        </div>
      ))}
    </div>
  );
}

interface PriceRange {
  label: string;
  slug: string;
  minPrice?: number;
  maxPrice?: number;
}

interface ProductsPageProps {
  productTypeId?: Id<"productTypes">;
  categoryId?: Id<"productCategories">;
  priceRangeFilter?: PriceRange;
  attributeFilter?: {
    groupId: Id<"attributeGroups">;
    termId?: Id<"attributeTerms">;
    termSlug?: string;
  };
}

export default function ProductsPage(props: ProductsPageProps) {
  return (
    <Suspense fallback={<ProductsListSkeleton />}>
      <ProductsContent {...props} />
    </Suspense>
  );
}

function ProductsContent(props: ProductsPageProps) {
  const brandColors = useBrandColors();
  const brandColor = brandColors.primary;
  const tokens = useMemo(
    () => getProductsListColors(brandColors.primary, brandColors.secondary, brandColors.mode || 'single'),
    [brandColors.primary, brandColors.secondary, brandColors.mode]
  );
  const imageAspectRatio = useProductImageAspectRatioSetting();
  const imageAspectRatioStyle = useMemo(
    () => ({ aspectRatio: getProductImageAspectRatioCssValue(imageAspectRatio) }),
    [imageAspectRatio]
  );
  const { frameConfig, watermarkConfig } = useProductImageOverlayConfigs(imageAspectRatio);
  const listConfig = useProductsListConfig();
  const layout: ProductsListLayout = listConfig.layoutStyle === 'sidebar' ? 'catalog' : listConfig.layoutStyle;
  const radiusClass = getProductListRadiusClass(listConfig.cornerRadius);
  const enableQuickAddVariant = listConfig.enableQuickAddVariant ?? true;
  const showWishlistButton = listConfig.showWishlistButton ?? true;
  const checkoutConfig = useCheckoutConfig();
  const showPromotionBadge = listConfig.showPromotionBadge ?? true;
  const { customer, isAuthenticated, openLoginModal } = useCustomerAuth();
  const { addItem, openDrawer } = useCart();
  const cartConfig = useCartConfig();
  const wishlistModule = useQuery(api.admin.modules.getModuleByKey, { key: 'wishlist' });
  const toggleWishlist = useMutation(api.wishlist.toggle);
  const enabledFields = useEnabledProductFields();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const saleModeSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'saleMode' });
  const routeModeSetting = useQuery(api.settings.getValue, { key: 'ia_route_mode', defaultValue: 'unified' });
  const routeMode = useMemo(() => normalizeRouteMode(routeModeSetting), [routeModeSetting]);
  const saleMode = useMemo<ProductsSaleMode>(() => {
    const value = saleModeSetting?.value;
    if (value === 'contact' || value === 'affiliate') {
      return value;
    }
    return 'cart';
  }, [saleModeSetting?.value]);

  const showAddToCartButton = saleMode === 'cart' && (listConfig.showAddToCartButton ?? true);
  const showBuyNowButton = saleMode === 'cart'
    ? (listConfig.showBuyNowButton ?? true) && checkoutConfig.showBuyNow
    : true;
  const buyNowLabel = saleMode === 'contact' ? 'Liên hệ' : 'Mua ngay';

  const [quickAddTarget, setQuickAddTarget] = useState<null | {
    product: ProductCardProps['product'];
    action: 'addToCart' | 'buyNow';
  }>(null);

  const urlPage = Number(searchParams.get('page')) || 1;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<ProductSortOption>('newest');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const isSearching = searchQuery.trim() !== debouncedSearchQuery.trim();
  const [pageSizeOverride, setPageSizeOverride] = useState<number | null>(null);
  const postsPerPage = pageSizeOverride ?? (listConfig.postsPerPage ?? 12);

  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchQuery]);

  const categories = useQuery(api.productCategories.listActive);
  const nonEmptyCategoryIds = useQuery(api.productCategories.listNonEmptyCategoryIds);

  const visibleCategories = useMemo(() => {
    if (!categories) {return undefined;}
    if (!listConfig.hideEmptyCategories) {return categories;}
    if (!nonEmptyCategoryIds) {return categories;}
    const nonEmptySet = new Set(nonEmptyCategoryIds);
    return categories.filter((category) => nonEmptySet.has(category._id));
  }, [categories, listConfig.hideEmptyCategories, nonEmptyCategoryIds]);

  const showCategorySubtitleSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'showCategorySubtitle' });
  const enableCategoryFilterFooterContentSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableCategoryFilterFooterContent' });
  const enableProductTypesSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableProductTypes' });

  const showCategorySubtitle = showCategorySubtitleSetting?.value === true;
  const enableCategoryFilterFooterContent = enableCategoryFilterFooterContentSetting?.value === true;
  const enableProductTypes = enableProductTypesSetting?.value === true;

  const categoryIds = useMemo(() => {
    return categories?.map((c) => c._id) ?? [];
  }, [categories]);

  const categoryTypes = useQuery(
    api.productTypes.listAssignedTypesForCategories,
    enableProductTypes && categoryIds.length > 0 ? { categoryIds } : 'skip'
  );

  const categoryToTypeMap = useMemo(() => {
    const map = new Map<Id<"productCategories">, { slug: string; name: string }>();
    if (!categoryTypes) return map;
    categoryTypes.forEach((row) => {
      if (row.types && row.types.length > 0) {
        map.set(row.categoryId, {
          slug: row.types[0].slug,
          name: row.types[0].name,
        });
      }
    });
    return map;
  }, [categoryTypes]);

  const productType = useQuery(api.productTypes.getById, props.productTypeId ? { id: props.productTypeId } : 'skip');
  const assignedCategories = useQuery(
    api.productTypes.listAssignedCategories,
    enableProductTypes && props.productTypeId ? { typeId: props.productTypeId } : 'skip'
  );
  const assignedGroups = useQuery(
    api.productTypes.listAssignedGroups,
    enableProductTypes && props.productTypeId ? { typeId: props.productTypeId } : 'skip'
  );

  const categoryOptions = useMemo(() => {
    const baseCategories = visibleCategories ?? categories ?? [];
    if (!enableProductTypes || !props.productTypeId) {
      return baseCategories;
    }
    if (!assignedCategories) {
      return [];
    }
    const assignedSet = new Set(assignedCategories.map((category) => category._id));
    return baseCategories.filter((category) => assignedSet.has(category._id));
  }, [assignedCategories, categories, enableProductTypes, props.productTypeId, visibleCategories]);

  const categorySlugFromPath = useMemo(() => {
    if (routeMode !== 'unified') {return null;}
    const segment = pathname.split('/').filter(Boolean)[0];
    if (!segment || segment === 'products') {return null;}
    return segment;
  }, [pathname, routeMode]);

  const isTaxonomyContext = enableProductTypes && Boolean(props.productTypeId || props.priceRangeFilter || props.attributeFilter);

  const categoryFromUrl = useMemo(() => {
    if (props.categoryId) return props.categoryId;
    const catSlug = isTaxonomyContext ? searchParams.get('category') : (categorySlugFromPath ?? searchParams.get('category'));
    if (!catSlug || categoryOptions.length === 0) {return null;}
    const matchedCategory = categoryOptions.find((c) => c.slug === catSlug);
    return matchedCategory?._id ?? null;
  }, [props.categoryId, isTaxonomyContext, searchParams, categorySlugFromPath, categoryOptions]);

  const activeCategory = categoryFromUrl;

  const rawFilterableGroups = useQuery(api.attributeGroups.listFilterable, enableProductTypes ? {} : 'skip');
  const filterableGroups = useMemo(() => {
    if (!rawFilterableGroups) return undefined;
    if (!enableProductTypes) {
      return [];
    }
    if (!props.productTypeId) {
      return [];
    }
    if (!assignedGroups) {
      return [];
    }
    const assignedSet = new Set(assignedGroups.map((group) => group._id));
    return rawFilterableGroups.filter((group) => assignedSet.has(group._id));
  }, [assignedGroups, enableProductTypes, props.productTypeId, rawFilterableGroups]);
  const productTypesData = useQuery(api.productTypes.listAll, enableProductTypes ? {} : 'skip');
  const productTypes = useMemo(() => productTypesData?.filter((t) => t.active) ?? [], [productTypesData]);

  // Load price range from URL or props
  const [selectedPriceRange, setSelectedPriceRange] = useState<PriceRange | null>(null);

  useEffect(() => {
    if (props.priceRangeFilter) {
      setSelectedPriceRange(props.priceRangeFilter);
    } else {
      const urlRangeSlug = searchParams.get('priceRange');
      if (urlRangeSlug && productType?.priceRanges) {
        const matched = productType.priceRanges.find(r => r.slug === urlRangeSlug);
        if (matched) setSelectedPriceRange(matched);
      } else {
        setSelectedPriceRange(null);
      }
    }
  }, [props.priceRangeFilter, searchParams, productType]);

  const selectedAttributes = useMemo(() => {
    const filters: Record<string, string[]> = {};
    if (!filterableGroups) return filters;

    // Tải từ props.attributeFilter nếu có (props.attributeFilter.termSlug)
    if (props.attributeFilter) {
      filters[props.attributeFilter.groupId] = props.attributeFilter.termSlug
        ? props.attributeFilter.termSlug.split(',')
        : [];
    }

    filterableGroups.forEach(group => {
      const param = searchParams.get(`attr_${group.slug}`);
      if (param) {
        filters[group._id] = param.split(',');
      }
    });
    return filters;
  }, [searchParams, filterableGroups, props.attributeFilter]);

  const attributeTermIds = useMemo(() => {
    const arr: Id<"attributeTerms">[][] = [];
    Object.entries(selectedAttributes).forEach(([groupId, termSlugs]) => {
      if (termSlugs.length > 0) {
        const group = filterableGroups?.find(g => g._id === groupId);
        if (group) {
          const matchedIds = group.terms
            .filter((t: any) => termSlugs.includes(t.slug))
            .map((t: any) => t._id as Id<"attributeTerms">);
          if (matchedIds.length > 0) {
            arr.push(matchedIds);
          }
        }
      }
    });
    return arr;
  }, [selectedAttributes, filterableGroups]);

  const isFilterActive = attributeTermIds.length > 0 || selectedPriceRange !== null;
  const hasActiveProductFilters = Boolean(
    activeCategory ||
    searchQuery.trim() ||
    debouncedSearchQuery.trim() ||
    selectedPriceRange ||
    attributeTermIds.length > 0 ||
    sortBy !== 'newest'
  );

  const activeCategoryDoc = useMemo(() => {
    if (!activeCategory || categoryOptions.length === 0) {return null;}
    return categoryOptions.find((c) => c._id === activeCategory) ?? null;
  }, [activeCategory, categoryOptions]);

  const paginatedSortBy = sortBy === 'popular' ? 'popular' : (sortBy === 'oldest' ? 'oldest' : 'newest');

  // Lấy giá trị min/max price thực tế
  const minPrice = selectedPriceRange?.minPrice ?? props.priceRangeFilter?.minPrice ?? undefined;
  const maxPrice = selectedPriceRange?.maxPrice ?? props.priceRangeFilter?.maxPrice ?? undefined;
  const queryProductTypeId = props.productTypeId;

  const {
    results: infiniteResults,
    status: infiniteStatus,
    loadMore,
  } = usePaginatedQuery(
    api.products.listPublishedPaginated,
    {
      categoryId: activeCategory ?? undefined,
      productTypeId: queryProductTypeId ?? undefined,
      minPrice,
      maxPrice,
      sortBy: paginatedSortBy,
      attributeTermIds,
    },
    { initialNumItems: postsPerPage }
  );

  const isSearchActive = Boolean(debouncedSearchQuery?.trim());
  const isPaginationMode = listConfig.paginationType === 'pagination' || isSearchActive || isFilterActive;

  const offset = (urlPage - 1) * postsPerPage;
  const paginatedProducts = useQuery(
    api.products.listPublishedWithOffset,
    isPaginationMode
      ? {
          categoryId: activeCategory ?? undefined,
          productTypeId: queryProductTypeId ?? undefined,
          minPrice,
          maxPrice,
          limit: postsPerPage,
          offset,
          search: debouncedSearchQuery || undefined,
          sortBy,
          attributeTermIds,
        }
      : 'skip'
  );

  const products = useMemo(() => {
    if (isPaginationMode) {
      return paginatedProducts ?? [];
    }
    return infiniteResults;
  }, [infiniteResults, isPaginationMode, paginatedProducts]);

  const productIds = useMemo(() => products.map((product) => product._id), [products]);

  const productAttributesData = useQuery(
    api.attributeTerms.getTermsForProducts,
    enableProductTypes && productIds.length > 0
      ? { productIds }
      : 'skip'
  );

  const productAttributesMap = useMemo(() => {
    const map = new Map<string, any[]>();
    if (!productAttributesData) return map;
    for (const item of productAttributesData) {
      map.set(item.productId, item.terms);
    }
    return map;
  }, [productAttributesData]);

  const displayFilterableGroups = useMemo(() => {
    if (!filterableGroups) return undefined;
    if (!enableProductTypes) return filterableGroups;

    return filterableGroups.filter((group) => {
      const filterType = group.filterType || 'single';

      if (filterType === 'range') {
        // Dùng terms gốc để tính dải min/max
        const numericValues = (group.terms || [])
          .map((t: any) => parseNumericValue(t.name))
          .filter((v: number | null): v is number => v !== null);
        if (numericValues.length <= 1) return false;
        return Math.min(...numericValues) !== Math.max(...numericValues);
      }

      // Giữ tất cả thuộc tính của nhóm để không bị biến mất khi qua trang khác
      return group.terms.length > 0;
    });
  }, [filterableGroups, enableProductTypes]);

  const wishlistProductIds = useQuery(
    api.wishlist.listCustomerProductIds,
    isAuthenticated && customer && productIds.length > 0 && (wishlistModule?.enabled ?? false)
      ? { customerId: customer.id as Id<'customers'>, productIds }
      : 'skip'
  );
  const wishlistIdSet = useMemo(() => new Set<Id<'products'>>(wishlistProductIds ?? []), [wishlistProductIds]);

  const totalCount = useQuery(api.products.countPublished, {
    categoryId: activeCategory ?? undefined,
    productTypeId: queryProductTypeId ?? undefined,
    minPrice,
    maxPrice,
    search: debouncedSearchQuery || undefined,
    attributeTermIds,
  });

  const categoryMap = useMemo(() => {
    if (!categories) {return new Map<string, string>();}
    return new Map(categories.map((c) => [c._id, c.name]));
  }, [categories]);

  const categorySlugMap = useMemo(() => {
    if (!categories) {return new Map<string, string>();}
    return new Map(categories.map((c) => [c._id, c.slug]));
  }, [categories]);

  const getProductDetailHref = useCallback((product: ProductCardProps['product']) => buildDetailPath({
    categorySlug: categorySlugMap.get(product.categoryId),
    mode: routeMode,
    moduleKey: 'products',
    recordSlug: product.slug,
  }), [categorySlugMap, routeMode]);

  useEffect(() => {
    if (isPaginationMode) {
      return;
    }
    if (inView && infiniteStatus === 'CanLoadMore') {
      loadMore(postsPerPage);
    }
  }, [inView, infiniteStatus, loadMore, postsPerPage, isPaginationMode]);

  const navigateWithFilters = useCallback((options: {
    nextCategoryId?: Id<"productCategories"> | null;
    nextPriceRange?: PriceRange | null;
    nextAttributes?: Record<string, string[]>;
    primary?: 'category' | 'priceRange' | 'attribute' | 'type';
    clickedGroupId?: string;
  }) => {
    const targetCategoryId = options.nextCategoryId !== undefined ? options.nextCategoryId : activeCategory;
    const targetPriceRange = options.nextPriceRange !== undefined ? options.nextPriceRange : selectedPriceRange;
    const targetAttributes = options.nextAttributes !== undefined ? options.nextAttributes : { ...selectedAttributes };

    // 1. Feature Toggle bảo vệ: Nếu tắt tính năng Phân loại & Thuộc tính, phục hồi 100% cơ chế URL danh mục truyền thống
    if (!enableProductTypes) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      params.delete('priceRange');
      // Xóa các attr_* params
      Array.from(params.keys()).forEach(key => {
        if (key.startsWith('attr_')) params.delete(key);
      });

      if (targetCategoryId && categoryOptions.length > 0) {
        const category = categoryOptions.find(c => c._id === targetCategoryId);
        if (category) {
          if (routeMode === 'unified') {
            router.push(buildCategoryPath({ categorySlug: category.slug, mode: routeMode, moduleKey: 'products' }), { scroll: false });
            return;
          }
          params.set('category', category.slug);
        }
      } else {
        params.delete('category');
      }

      const newUrl = params.toString()
        ? `${buildModuleListPath('products')}?${params.toString()}`
        : buildModuleListPath('products');
      router.push(newUrl, { scroll: false });
      return;
    }

    // 2. Khi bật: Phân giải SEO Catch-all URLs thông minh theo primary filter và fallback đôn filter
    const assignedType = targetCategoryId ? categoryToTypeMap.get(targetCategoryId) : null;
    const effectiveProductTypeSlug = assignedType ? assignedType.slug : (productType ? productType.slug : null);
    const hasEffectiveProductType = !!effectiveProductTypeSlug;

    // Dữ liệu filter active mới
    const hasCategory = !!targetCategoryId;
    const hasPriceRange = !!targetPriceRange;

    // Phân tích các attribute terms đang hoạt động
    const activeAttrs: { groupId: string; groupSlug: string; termId: string; termSlug: string }[] = [];
    if (filterableGroups) {
      filterableGroups.forEach(group => {
        const termSlugs = targetAttributes[group._id] || [];
        termSlugs.forEach((termSlug: string) => {
          const term = group.terms.find((t: any) => t.slug === termSlug);
          if (term) {
            activeAttrs.push({
              groupId: group._id,
              groupSlug: group.slug,
              termId: term._id,
              termSlug: term.slug
            });
          }
        });
      });
    }

    // Nhóm activeAttrs theo groupSlug
    const activeGroupsMap = new Map<string, { groupId: string; groupSlug: string; termSlugs: string[] }>();
    activeAttrs.forEach(attr => {
      if (!activeGroupsMap.has(attr.groupSlug)) {
        activeGroupsMap.set(attr.groupSlug, { groupId: attr.groupId, groupSlug: attr.groupSlug, termSlugs: [] });
      }
      activeGroupsMap.get(attr.groupSlug)!.termSlugs.push(attr.termSlug);
    });
    const activeGroups = Array.from(activeGroupsMap.values());
    const hasAttributes = activeGroups.length > 0;

    // Xác định primary path
    let primaryPath: 'category' | 'priceRange' | 'attribute' | 'type' = 'type';
    if (options.primary) {
      if (options.primary === 'category' && hasCategory) {
        primaryPath = 'category';
      } else if (options.primary === 'priceRange' && hasPriceRange) {
        primaryPath = 'priceRange';
      } else if (options.primary === 'attribute' && hasAttributes) {
        primaryPath = 'attribute';
      }
    } else {
      // Trường hợp xóa filter hoặc thay đổi gián tiếp (đôn filter)
      const currentPrimary: 'category' | 'priceRange' | 'attribute' | 'type' = props.categoryId
        ? 'category'
        : (props.priceRangeFilter ? 'priceRange' : (props.attributeFilter ? 'attribute' : 'type'));

      if (currentPrimary === 'category' && hasCategory) {
        primaryPath = 'category';
      } else if (currentPrimary === 'priceRange' && hasPriceRange) {
        primaryPath = 'priceRange';
      } else if (currentPrimary === 'attribute' && hasAttributes) {
        // Đảm bảo group làm primary trước đó vẫn còn term hoạt động
        const currentGroupId = props.attributeFilter?.groupId;
        const isCurrentGroupActive = currentGroupId && targetAttributes[currentGroupId]?.length > 0;
        if (isCurrentGroupActive) {
          primaryPath = 'attribute';
        } else {
          // Đôn filter khác
          if (hasCategory) primaryPath = 'category';
          else if (hasPriceRange) primaryPath = 'priceRange';
          else if (hasAttributes) primaryPath = 'attribute';
        }
      } else {
        // Đôn filter theo thứ tự fallback: category -> price -> attribute -> type
        if (hasCategory) primaryPath = 'category';
        else if (hasPriceRange) primaryPath = 'priceRange';
        else if (hasAttributes) primaryPath = 'attribute';
      }
    }

    let path = `/products`;
    const params = new URLSearchParams();

    // Giữ nguyên các params hệ thống như search, sort (xóa page khi filter thay đổi)
    const searchVal = searchParams.get('search');
    if (searchVal) params.set('search', searchVal);
    const sortVal = searchParams.get('sort');
    if (sortVal) params.set('sort', sortVal);

    if (!hasEffectiveProductType) {
      // Nếu chưa có product type cụ thể (fallback /products), không dựng URL đẹp
      path = `/products`;
      if (hasCategory) {
        const category = (categories ?? []).find(c => c._id === targetCategoryId);
        if (category) params.set('category', category.slug);
      }
      if (hasPriceRange) {
        params.set('priceRange', targetPriceRange!.slug);
      }
      activeGroups.forEach(g => {
        params.set(`attr_${g.groupSlug}`, g.termSlugs.join(','));
      });
    } else {
      const baseSlug = effectiveProductTypeSlug!;
      // Dựng URL đẹp theo primary path
      if (primaryPath === 'category' && hasCategory) {
        const category = (categories ?? []).find(c => c._id === targetCategoryId);
        if (category) {
          path = `/${baseSlug}/${category.slug}`;
        }
        if (hasPriceRange) {
          params.set('priceRange', targetPriceRange!.slug);
        }
        activeGroups.forEach(g => {
          params.set(`attr_${g.groupSlug}`, g.termSlugs.join(','));
        });
      } else if (primaryPath === 'priceRange' && hasPriceRange) {
        path = `/${baseSlug}/${targetPriceRange!.slug}`;
        if (hasCategory) {
          const category = (categories ?? []).find(c => c._id === targetCategoryId);
          if (category) params.set('category', category.slug);
        }
        activeGroups.forEach(g => {
          params.set(`attr_${g.groupSlug}`, g.termSlugs.join(','));
        });
      } else if (primaryPath === 'attribute' && hasAttributes) {
        // Tìm group làm primary path
        let primaryGroup = activeGroups[0];
        if (options.primary === 'attribute' && options.clickedGroupId) {
          const clicked = activeGroups.find(g => g.groupId === options.clickedGroupId);
          if (clicked) primaryGroup = clicked;
        } else if (props.attributeFilter && props.attributeFilter.groupId) {
          const filterGroupId = props.attributeFilter.groupId;
          const current = activeGroups.find(g => g.groupId === filterGroupId);
          if (current) primaryGroup = current;
        }

        // Range filterType không thể làm primary path (Convex resolver reject range trong URL path)
        // → dùng query param cho range group, đôn primary lên group khác nếu có
        const primaryGroupFilterType = filterableGroups?.find(g => g._id === primaryGroup.groupId)?.filterType;
        const isRangeGroup = primaryGroupFilterType === 'range';

        if (isRangeGroup) {
          // Tìm group không phải range để làm primary path
          const nonRangePrimary = activeGroups.find(g => {
            const ft = filterableGroups?.find(fg => fg._id === g.groupId)?.filterType;
            return ft !== 'range';
          });
          if (nonRangePrimary) {
            path = `/${baseSlug}/${nonRangePrimary.groupSlug}/${nonRangePrimary.termSlugs.join(',')}`;
            if (hasCategory) {
              const category = (categories ?? []).find(c => c._id === targetCategoryId);
              if (category) params.set('category', category.slug);
            }
            if (hasPriceRange) params.set('priceRange', targetPriceRange!.slug);
            activeGroups.forEach(g => {
              if (g.groupId !== nonRangePrimary.groupId) {
                params.set(`attr_${g.groupSlug}`, g.termSlugs.join(','));
              }
            });
          } else {
            // Tất cả groups đều là range → dùng base type path + query params
            path = `/${baseSlug}`;
            if (hasCategory) {
              const category = (categories ?? []).find(c => c._id === targetCategoryId);
              if (category) params.set('category', category.slug);
            }
            if (hasPriceRange) params.set('priceRange', targetPriceRange!.slug);
            activeGroups.forEach(g => {
              params.set(`attr_${g.groupSlug}`, g.termSlugs.join(','));
            });
          }
        } else {
          path = `/${baseSlug}/${primaryGroup.groupSlug}/${primaryGroup.termSlugs.join(',')}`;

          if (hasCategory) {
            const category = (categories ?? []).find(c => c._id === targetCategoryId);
            if (category) params.set('category', category.slug);
          }
          if (hasPriceRange) {
            params.set('priceRange', targetPriceRange!.slug);
          }
          activeGroups.forEach(g => {
            if (g.groupId !== primaryGroup.groupId) {
              params.set(`attr_${g.groupSlug}`, g.termSlugs.join(','));
            }
          });
        }
      } else {
        path = `/${baseSlug}`;
        if (hasCategory) {
          const category = (categories ?? []).find(c => c._id === targetCategoryId);
          if (category) params.set('category', category.slug);
        }
        if (hasPriceRange) {
          params.set('priceRange', targetPriceRange!.slug);
        }
        activeGroups.forEach(g => {
          params.set(`attr_${g.groupSlug}`, g.termSlugs.join(','));
        });
      }
    }

    const queryStr = params.toString();
    const finalUrl = queryStr ? `${path}?${queryStr}` : path;
    router.push(finalUrl, { scroll: false });
  }, [enableProductTypes, productType, activeCategory, selectedPriceRange, selectedAttributes, categoryOptions, filterableGroups, searchParams, routeMode, router, props.categoryId, props.priceRangeFilter, props.attributeFilter, categoryToTypeMap, categories]);

  const handleCategoryChange = useCallback((categoryId: Id<"productCategories"> | null) => {
    navigateWithFilters({ nextCategoryId: categoryId, primary: 'category' });
  }, [navigateWithFilters]);

  const handleAttributeChange = useCallback((groupSlug: string, termSlug: any, checked: boolean) => {
    const group = filterableGroups?.find(g => g.slug === groupSlug);
    if (!group) return;

    const groupId = group._id;
    let nextTermSlugs: string[] = [];

    if (Array.isArray(termSlug)) {
      nextTermSlugs = termSlug;
    } else if (termSlug === '') {
      nextTermSlugs = [];
    } else if (group.filterType === 'single') {
      nextTermSlugs = checked ? [termSlug] : [];
    } else {
      const currentTermSlugs = selectedAttributes[groupId] || [];
      nextTermSlugs = [...currentTermSlugs];
      if (checked) {
        if (!nextTermSlugs.includes(termSlug)) nextTermSlugs.push(termSlug);
      } else {
        nextTermSlugs = nextTermSlugs.filter(slug => slug !== termSlug);
      }
    }

    const nextAttributes = {
      ...selectedAttributes,
      [groupId]: nextTermSlugs
    };

    navigateWithFilters({ nextAttributes, primary: 'attribute', clickedGroupId: groupId });
  }, [filterableGroups, selectedAttributes, navigateWithFilters]);

  const handlePriceRangeChange = useCallback((priceRange: PriceRange | null) => {
    navigateWithFilters({ nextPriceRange: priceRange, primary: 'priceRange' });
  }, [navigateWithFilters]);

  const handleProductTypeChange = useCallback((typeSlug: string | null) => {
    if (typeSlug) {
      router.push(`/${typeSlug}`, { scroll: false });
    } else {
      router.push(buildModuleListPath('products'), { scroll: false });
    }
  }, [router]);

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setSortBy('newest');
    setSelectedPriceRange(null);
    const basePath = enableProductTypes && productType?.slug ? `/${productType.slug}` : buildModuleListPath('products');
    router.push(basePath, { scroll: false });
  }, [enableProductTypes, productType?.slug, router]);

  const handlePageSizeChange = useCallback((value: number) => {
    setPageSizeOverride(value);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, pathname, router]);

  const handlePageChange = useCallback((page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', page.toString());
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams, pathname, router]);

  useEffect(() => {
    if (isTaxonomyContext) {
      return;
    }
    const catSlug = categorySlugFromPath ?? searchParams.get('category');
    if (!catSlug || categoryOptions.length === 0) {return;}
    const hasMatch = categoryOptions.some((category) => category.slug === catSlug);
    if (hasMatch) {return;}
    if (routeMode === 'unified' && categorySlugFromPath) {
      router.replace(buildModuleListPath('products'), { scroll: false });
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('category');
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [categoryOptions, categorySlugFromPath, pathname, router, routeMode, searchParams, isTaxonomyContext]);


  const filterKey = `${activeCategory ?? ''}|${debouncedSearchQuery}|${sortBy}|${postsPerPage}|${JSON.stringify(attributeTermIds)}`;
  const prevFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    if (listConfig.paginationType !== 'pagination') {
      prevFilterKeyRef.current = filterKey;
      return;
    }

    const hasFilterChanged = prevFilterKeyRef.current !== filterKey;
    if (hasFilterChanged && urlPage !== 1) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page');
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    prevFilterKeyRef.current = filterKey;
  }, [filterKey, listConfig.paginationType, pathname, router, searchParams, urlPage]);
  const isLoadingProducts = isSearching || (isSearchActive && paginatedProducts === undefined) || (listConfig.paginationType === 'pagination' ? paginatedProducts === undefined : infiniteStatus === 'LoadingFirstPage');

  if (categories === undefined) {
    return <ProductsListSkeleton />;
  }

  const showPrice = enabledFields.has('price') || enabledFields.size === 0;
  const showSalePrice = enabledFields.has('salePrice');
  const showStock = enabledFields.has('stock');
  const canUseWishlist = showWishlistButton && (wishlistModule?.enabled ?? false);

  const handleWishlistToggle = async (productId: Id<'products'>) => {
    if (!isAuthenticated || !customer) {
      openLoginModal();
      return;
    }
    await toggleWishlist({ customerId: customer.id as Id<'customers'>, productId });
  };

  const openQuickAdd = (product: ProductCardProps['product'], action: 'addToCart' | 'buyNow') => {
    setQuickAddTarget({ product, action });
  };

  const closeQuickAdd = () => setQuickAddTarget(null);

  const handleQuickAddConfirm = async (variantId: Id<'productVariants'>, quantity: number) => {
    if (!quickAddTarget) {
      return;
    }

    const { product, action } = quickAddTarget;

    if (action === 'addToCart') {
      await addItem(product._id, quantity, variantId);
      notifyAddToCart();
      if (cartConfig.layoutStyle === 'drawer') {
        openDrawer();
      } else {
        router.push('/cart');
      }
    } else {
      router.push(`/checkout?productId=${product._id}&quantity=${quantity}&variantId=${variantId}`);
    }

    setQuickAddTarget(null);
  };

  const handleAddToCart = async (product: ProductCardProps['product']) => {
    if (showStock && product.stock <= 0) {
      return;
    }

    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    if (product.hasVariants) {
      if (enableQuickAddVariant) {
        openQuickAdd(product, 'addToCart');
        return;
      }
      router.push(getProductDetailHref(product));
      return;
    }

    await addItem(product._id, 1);
    notifyAddToCart();
    if (cartConfig.layoutStyle === 'drawer') {
      openDrawer();
    } else {
      router.push('/cart');
    }
  };

  const handleBuyNow = (product: ProductCardProps['product']) => {
    if (showStock && product.stock <= 0) {
      return;
    }

    if (!isAuthenticated) {
      openLoginModal();
      return;
    }

    if (product.hasVariants) {
      if (enableQuickAddVariant) {
        openQuickAdd(product, 'buyNow');
        return;
      }
      router.push(getProductDetailHref(product));
      return;
    }

    router.push(`/checkout?productId=${product._id}&quantity=1`);
  };

  const handlePrimaryAction = (product: ProductCardProps['product']) => {
    if (showStock && product.stock <= 0) {
      return;
    }

    if (saleMode === 'contact') {
      router.push('/contact');
      return;
    }

    if (saleMode === 'affiliate') {
      const affiliateLink = product.affiliateLink?.trim();
      if (affiliateLink) {
        window.open(affiliateLink, '_blank', 'noopener,noreferrer');
        return;
      }
      router.push(getProductDetailHref(product));
      return;
    }

    handleBuyNow(product);
  };

  const paginationNode = (
    <>
      {listConfig.paginationType === 'pagination' && !!totalCount && totalCount > postsPerPage && (
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            className="order-2 flex w-full items-center justify-between text-sm sm:order-1 sm:w-auto sm:justify-start sm:gap-6"
            style={{ color: tokens.metaText }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color: tokens.bodyText }}>Hiển thị</span>
              <select
                value={postsPerPage}
                onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                className="h-8 w-[70px] appearance-none rounded-md border px-2 text-sm font-medium shadow-sm focus:outline-none"
                style={{
                  borderColor: tokens.inputBorder,
                  backgroundColor: tokens.inputBackground,
                  color: tokens.inputText,
                }}
                aria-label="Số bài mỗi trang"
              >
                {[12, 20, 24, 48, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span>bài/trang</span>
            </div>

            <div className="text-right sm:text-left">
              <span className="font-medium" style={{ color: tokens.bodyText }}>
                {totalCount ? ((urlPage - 1) * postsPerPage) + 1 : 0}–{Math.min(urlPage * postsPerPage, totalCount ?? 0)}
              </span>
              <span className="mx-1" style={{ color: tokens.paginationEllipsisText }}>/</span>
              <span className="font-medium" style={{ color: tokens.bodyText }}>{totalCount ?? 0}</span>
              <span className="ml-1" style={{ color: tokens.metaText }}>sản phẩm</span>
            </div>
          </div>

          <div className="order-1 flex w-full justify-center sm:order-2 sm:w-auto sm:justify-end">
            <nav className="flex items-center space-x-1 sm:space-x-2" aria-label="Phân trang">
              <button
                onClick={() => handlePageChange(urlPage - 1)}
                disabled={urlPage === 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={urlPage === 1
                  ? { color: tokens.paginationDisabledText, borderColor: tokens.inputBorder, backgroundColor: tokens.paginationButtonBg }
                  : { color: tokens.paginationButtonText, borderColor: tokens.paginationButtonBorder, backgroundColor: tokens.paginationButtonBg }
                }
                aria-label="Trang trước"
              >
                <ChevronDown className="h-4 w-4 rotate-90" />
              </button>

              {generatePaginationItems(urlPage, Math.ceil(totalCount / postsPerPage)).map((item, index) => {
                if (item === 'ellipsis') {
                  return (
                    <div
                      key={`ellipsis-${index}`}
                      className="flex h-8 w-8 items-center justify-center"
                      style={{ color: tokens.paginationEllipsisText }}
                    >
                      …
                    </div>
                  );
                }

                const pageNum = item as number;
                const isActive = pageNum === urlPage;
                const isMobileHidden = !isActive && pageNum !== 1 && pageNum !== Math.ceil(totalCount / postsPerPage);

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm transition-all duration-200 border ${isMobileHidden ? 'hidden sm:inline-flex' : ''}`}
                    style={isActive
                      ? {
                          backgroundColor: tokens.paginationActiveBg,
                          borderColor: tokens.paginationActiveBorder,
                          color: tokens.paginationActiveText,
                        }
                      : {
                          backgroundColor: tokens.paginationButtonBg,
                          borderColor: tokens.paginationButtonBorder,
                          color: tokens.paginationButtonText,
                        }
                    }
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(urlPage + 1)}
                disabled={totalCount ? urlPage >= Math.ceil(totalCount / postsPerPage) : true}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={totalCount && urlPage < Math.ceil(totalCount / postsPerPage)
                  ? { color: tokens.paginationButtonText, borderColor: tokens.paginationButtonBorder, backgroundColor: tokens.paginationButtonBg }
                  : { color: tokens.paginationDisabledText, borderColor: tokens.inputBorder, backgroundColor: tokens.paginationButtonBg }
                }
                aria-label="Trang sau"
              >
                <ChevronDown className="h-4 w-4 -rotate-90" />
              </button>
            </nav>
          </div>
        </div>
      )}

      {listConfig.paginationType === 'infiniteScroll' && infiniteStatus !== 'Exhausted' && (
        <div ref={loadMoreRef} className="text-center mt-6 py-8">
          {infiniteStatus === 'LoadingMore' ? (
            <div className="flex justify-center gap-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: tokens.loadingDotStrong }} />
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: tokens.loadingDotMedium }} />
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: tokens.loadingDotSoft }} />
            </div>
          ) : infiniteStatus === 'CanLoadMore' ? (
            <p className="text-sm" style={{ color: tokens.neutralTextLight }}>Cuộn để xem thêm...</p>
          ) : null}
        </div>
      )}

      {listConfig.paginationType === 'infiniteScroll' && infiniteStatus === 'Exhausted' && products.length > 0 && (
        <div className="text-center mt-6">
          <p className="text-sm" style={{ color: tokens.neutralTextLight }}>Đã hiển thị tất cả {products.length} sản phẩm</p>
        </div>
      )}
    </>
  );

  const quickAddModal = quickAddTarget ? (
    <QuickAddVariantModal
      key={`${quickAddTarget.product._id}-${quickAddTarget.action}`}
      isOpen={Boolean(quickAddTarget)}
      product={quickAddTarget.product}
      brandColor={brandColor}
      actionLabel={quickAddTarget.action === 'buyNow' ? 'Mua ngay' : 'Thêm vào giỏ'}
      onClose={closeQuickAdd}
      onConfirm={handleQuickAddConfirm}
    />
  ) : null;

  // Render based on layout setting
  if (layout === 'catalog') {
    return (
      <>
        <CatalogLayout
          isLoadingProducts={isLoadingProducts}
          postsPerPage={postsPerPage}
          products={isLoadingProducts ? [] : products}
          categories={categoryOptions}
          categoryMap={categoryMap}
          selectedCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          tokens={tokens}
          showPrice={showPrice}
          showSalePrice={showSalePrice}
          showStock={showStock}
          saleMode={saleMode}
          totalCount={totalCount}
          paginationNode={paginationNode}
          showWishlistButton={showWishlistButton}
          showAddToCartButton={showAddToCartButton}
          showBuyNowButton={showBuyNowButton}
          buyNowLabel={buyNowLabel}
          showPromotionBadge={showPromotionBadge}
          wishlistIdSet={wishlistIdSet}
          onToggleWishlist={handleWishlistToggle}
          onAddToCart={handleAddToCart}
          onBuyNow={handlePrimaryAction}
          canUseWishlist={canUseWishlist}
          imageAspectRatioStyle={imageAspectRatioStyle}
          frameConfig={frameConfig}
          watermarkConfig={watermarkConfig}
          getDetailHref={getProductDetailHref}
          activeCategoryDoc={activeCategoryDoc}
          showCategorySubtitle={showCategorySubtitle}
          enableCategoryFilterFooterContent={enableCategoryFilterFooterContent}
          filterableGroups={displayFilterableGroups}
          selectedAttributes={selectedAttributes}
          onAttributeChange={handleAttributeChange}
          productType={productType}
          selectedPriceRange={selectedPriceRange}
          onPriceRangeChange={handlePriceRangeChange}
          enableProductTypes={enableProductTypes}
          productTypes={productTypes}
          onProductTypeChange={handleProductTypeChange}
          attributeFilter={props.attributeFilter}
          hasActiveFilters={hasActiveProductFilters}
          onClearFilters={handleClearAllFilters}
          radiusClass={radiusClass}
          productAttributesMap={productAttributesMap}
        />
        {quickAddModal}
      </>
    );
  }

  if (layout === 'list') {
    return (
      <>
        <ListLayout
          isLoadingProducts={isLoadingProducts}
          postsPerPage={postsPerPage}
          products={isLoadingProducts ? [] : products}
          categories={categoryOptions}
          categoryMap={categoryMap}
          selectedCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          tokens={tokens}
          showPrice={showPrice}
          showSalePrice={showSalePrice}
          showStock={showStock}
          saleMode={saleMode}
          totalCount={totalCount}
          paginationNode={paginationNode}
          showWishlistButton={showWishlistButton}
          showAddToCartButton={showAddToCartButton}
          showBuyNowButton={showBuyNowButton}
          buyNowLabel={buyNowLabel}
          showPromotionBadge={showPromotionBadge}
          wishlistIdSet={wishlistIdSet}
          onToggleWishlist={handleWishlistToggle}
          onAddToCart={handleAddToCart}
          onBuyNow={handlePrimaryAction}
          canUseWishlist={canUseWishlist}
          imageAspectRatioStyle={imageAspectRatioStyle}
          frameConfig={frameConfig}
          watermarkConfig={watermarkConfig}
          getDetailHref={getProductDetailHref}
          activeCategoryDoc={activeCategoryDoc}
          showCategorySubtitle={showCategorySubtitle}
          enableCategoryFilterFooterContent={enableCategoryFilterFooterContent}
          filterableGroups={displayFilterableGroups}
          selectedAttributes={selectedAttributes}
          onAttributeChange={handleAttributeChange}
          productType={productType}
          selectedPriceRange={selectedPriceRange}
          onPriceRangeChange={handlePriceRangeChange}
          enableProductTypes={enableProductTypes}
          productTypes={productTypes}
          onProductTypeChange={handleProductTypeChange}
          attributeFilter={props.attributeFilter}
          hasActiveFilters={hasActiveProductFilters}
          onClearFilters={handleClearAllFilters}
          radiusClass={radiusClass}
          productAttributesMap={productAttributesMap}
        />
        {quickAddModal}
      </>
    );
  }

  // Default: Grid Layout
  return (
    <>
      <div className="py-8 md:py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: tokens.headingColor }}>
              {activeCategoryDoc?.name ?? (enableProductTypes ? productType?.name : null) ?? 'Sản phẩm'}
            </h1>
            {showCategorySubtitle && activeCategoryDoc?.description && (
              <p className="mt-2 text-base max-w-2xl mx-auto opacity-80" style={{ color: tokens.bodyText }}>
                {activeCategoryDoc.description}
              </p>
            )}
          </div>

        <MobileProductsFilters
          categories={categoryOptions}
          selectedCategory={activeCategory}
          onCategoryChange={handleCategoryChange}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={sortBy}
          onSortChange={setSortBy}
          tokens={tokens}
          filterableGroups={displayFilterableGroups}
          selectedAttributes={selectedAttributes}
          onAttributeChange={handleAttributeChange}
          productType={productType}
          selectedPriceRange={selectedPriceRange}
          onPriceRangeChange={handlePriceRangeChange}
          enableProductTypes={enableProductTypes}
          productTypes={productTypes}
          onProductTypeChange={handleProductTypeChange}
          attributeFilter={props.attributeFilter}
          hasActiveFilters={hasActiveProductFilters}
          onClearFilters={handleClearAllFilters}
          radiusClass={radiusClass}
        />

        <div
          className={`hidden lg:block ${radiusClass} border p-3 mb-5`}
          style={{ backgroundColor: tokens.filterBarBackground, borderColor: tokens.filterBarBorder }}
        >
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: tokens.inputIcon }} />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); }}
                className="w-full h-10 pl-10 pr-9 rounded-lg border outline-none transition-colors placeholder:text-[var(--placeholder-color)]"
                style={{
                  borderColor: tokens.inputBorder,
                  backgroundColor: tokens.inputBackground,
                  color: tokens.inputText,
                  '--placeholder-color': tokens.inputPlaceholder,
                } as React.CSSProperties}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: tokens.inputIcon }}
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {enableProductTypes && productTypes && productTypes.length > 0 && (
              <div className="hidden lg:flex items-center gap-2">
                <div className="relative">
                  <select
                    value={productType?.slug ?? ''}
                    onChange={(e) => { handleProductTypeChange(e.target.value || null); }}
                    className="h-10 w-[200px] pl-3 pr-8 rounded-lg border text-sm outline-none appearance-none truncate"
                    style={{
                      borderColor: tokens.inputBorder,
                      backgroundColor: tokens.inputBackground,
                      color: tokens.inputText,
                    }}
                  >
                    <option value="">Tất cả nhóm sản phẩm</option>
                    {productTypes.map((t) => (
                      <option key={t._id} value={t.slug}>{t.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.inputIcon }} />
                </div>
              </div>
            )}

            <div className="hidden lg:flex items-center gap-2">
              <div className="relative">
                <select
                  value={activeCategory ?? ''}
                  onChange={(e) => { handleCategoryChange(e.target.value ? e.target.value as Id<"productCategories"> : null); }}
                  className="h-10 w-[220px] pl-3 pr-8 rounded-lg border text-sm outline-none appearance-none truncate"
                  style={{
                    borderColor: tokens.inputBorder,
                    backgroundColor: tokens.inputBackground,
                    color: tokens.inputText,
                  }}
                >
                  <option value="">Tất cả danh mục</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.inputIcon }} />
              </div>
            </div>

            {enableProductTypes && productType?.priceRanges && productType.priceRanges.length > 0 && (
              <div className="hidden lg:flex items-center gap-2">
                <div className="relative">
                  <select
                    value={selectedPriceRange?.slug ?? ''}
                    onChange={(e) => {
                      const matched = productType?.priceRanges?.find((r: PriceRange) => r.slug === e.target.value);
                      handlePriceRangeChange(matched ?? null);
                    }}
                    className="h-10 w-[200px] pl-3 pr-8 rounded-lg border text-sm outline-none appearance-none truncate"
                    style={{
                      borderColor: tokens.inputBorder,
                      backgroundColor: tokens.inputBackground,
                      color: tokens.inputText,
                    }}
                  >
                    <option value="">Tất cả khoảng giá</option>
                    {productType.priceRanges.map((range: PriceRange) => (
                      <option key={range.slug} value={range.slug}>{range.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: tokens.inputIcon }} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <select
                value={sortBy}
                onChange={(e) =>{  setSortBy(e.target.value as ProductSortOption); }}
                className="h-10 px-3 rounded-lg border text-sm outline-none"
                style={{
                  borderColor: tokens.inputBorder,
                  backgroundColor: tokens.inputBackground,
                  color: tokens.inputText,
                }}
              >
                <option value="newest">Mới nhất</option>
                <option value="popular">Bán chạy</option>
                <option value="price_asc">Giá thấp → cao</option>
                <option value="price_desc">Giá cao → thấp</option>
                <option value="name">Tên A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm" style={{ color: tokens.metaText }}>
            Hiển thị <span className="font-medium" style={{ color: tokens.bodyText }}>{products.length}</span>
            {totalCount !== undefined && products.length > 0 && totalCount > products.length && <> / {totalCount}</>} sản phẩm
          </p>
          {hasActiveProductFilters && (
            <ClearFiltersButton tokens={tokens} onClear={handleClearAllFilters} />
          )}
        </div>

        {/* Products Grid/List */}
        {isLoadingProducts ? (
          <ProductsGridSkeleton count={postsPerPage} tokens={tokens} />
        ) : products.length === 0 ? (
          <EmptyState tokens={tokens} onReset={handleClearAllFilters} />
        ) : (
          <ProductGrid
            products={products}
            categoryMap={categoryMap}
            tokens={tokens}
            showPrice={showPrice}
            showSalePrice={showSalePrice}
            showStock={showStock}
            saleMode={saleMode}
            showWishlistButton={showWishlistButton}
            showAddToCartButton={showAddToCartButton}
            showBuyNowButton={showBuyNowButton}
            buyNowLabel={buyNowLabel}
            showPromotionBadge={showPromotionBadge}
            wishlistIdSet={wishlistIdSet}
            onToggleWishlist={handleWishlistToggle}
            onAddToCart={handleAddToCart}
            onBuyNow={handlePrimaryAction}
            canUseWishlist={canUseWishlist}
            imageAspectRatioStyle={imageAspectRatioStyle}
            frameConfig={frameConfig}
            watermarkConfig={watermarkConfig}
            getDetailHref={getProductDetailHref}
            radiusClass={radiusClass}
            productAttributesMap={productAttributesMap}
            onAttributeChange={handleAttributeChange}
            selectedAttributes={selectedAttributes}
          />
        )}

          {paginationNode}

          {enableCategoryFilterFooterContent && activeCategoryDoc?.filterFooterContent && (
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 max-w-4xl mx-auto text-left">
              <RichContent content={toRichTextContent(activeCategoryDoc.filterFooterContent)} />
            </div>
          )}
        </div>
      </div>
      {quickAddModal}
    </>
  );
}

// ========== SHARED COMPONENTS ==========

interface ProductCardProps {
  product: {
    _id: Id<'products'>;
    name: string;
    slug: string;
    image?: string;
    affiliateLink?: string;
    price: number;
    salePrice?: number;
    stock: number;
    hasVariants?: boolean;
    categoryId: string;
    description?: string;
    productTypeId?: string;
  };
  categoryMap: Map<string, string>;
  showPrice: boolean;
  showSalePrice: boolean;
  showStock: boolean;
}

function ProductCardActions({ product, tokens, showStock, showAddToCartButton, showBuyNowButton, buyNowLabel, onAddToCart, onBuyNow }: { product: ProductCardProps['product']; tokens: ProductsListColors; showStock: boolean; showAddToCartButton: boolean; showBuyNowButton: boolean; buyNowLabel: string; onAddToCart: (product: ProductCardProps['product']) => void; onBuyNow: (product: ProductCardProps['product']) => void }) {
  if (!showAddToCartButton && !showBuyNowButton) {
    return null;
  }

  const isOutOfStock = showStock && product.stock <= 0;
  const secondaryLabel = isOutOfStock ? 'Hết hàng' : buyNowLabel;
  const actionHeightClass = showAddToCartButton && showBuyNowButton ? 'min-h-[76px]' : 'min-h-[36px]';

  return (
    <div className={`mt-3 grid grid-cols-1 gap-2 ${actionHeightClass}`}>
      {showAddToCartButton && (
        <button
          className="w-full rounded-lg py-2 text-sm font-medium transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-55 disabled:cursor-not-allowed hover:brightness-95 hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
          style={{ backgroundColor: tokens.primaryActionBg, color: tokens.primaryActionText }}
          onClick={(event) => { event.preventDefault(); onAddToCart(product); }}
          disabled={isOutOfStock}
        >
          <ShoppingCart size={14} />
          Thêm vào giỏ
        </button>
      )}
      {showBuyNowButton && (
        <button
          className="w-full rounded-lg py-2 text-sm font-medium border transition-all duration-300 disabled:opacity-55 disabled:cursor-not-allowed hover:bg-[var(--btn-hover-bg)] hover:scale-[1.02] active:scale-[0.98] shadow-sm hover:shadow-md"
          style={{
            borderColor: tokens.secondaryActionBorder,
            color: tokens.secondaryActionText,
            '--btn-hover-bg': tokens.secondaryActionHoverBg,
          } as React.CSSProperties}
          onClick={(event) => { event.preventDefault(); onBuyNow(product); }}
          disabled={isOutOfStock}
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}

type AttributeBadgeTokens = {
  primary: string;
  cardBorder?: string;
  border?: string;
};

export function ProductAttributesBadges({
  productId,
  productAttributesMap,
  tokens,
  className = "flex flex-col gap-1.5 w-full mt-2 mb-2",
  onAttributeChange,
  selectedAttributes,
  productTypeId,
  limit,
  itemClassName = "text-xs",
  iconClassName = "h-[15px] w-[15px]"
}: {
  productId: string;
  productAttributesMap?: Map<string, any[]>;
  tokens: AttributeBadgeTokens;
  className?: string;
  onAttributeChange?: (groupSlug: string, termSlug: any, checked: boolean) => void;
  selectedAttributes?: Record<string, string[]>;
  productTypeId?: string;
  limit?: number;
  itemClassName?: string;
  iconClassName?: string;
}) {
  const router = useRouter();
  const enableProductTypesSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableProductTypes' });
  const enableProductTypes = enableProductTypesSetting?.value === true;
  const productTypesData = useQuery(api.productTypes.listAll, enableProductTypes ? {} : 'skip');

  const productTypeSlugMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!productTypesData) return map;
    productTypesData.forEach(t => {
      if (t.active) {
        map.set(t._id, t.slug);
      }
    });
    return map;
  }, [productTypesData]);

  const productTypeAttributeOrderMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    if (!productTypesData) return map;
    productTypesData.forEach((type) => {
      const orderMap = new Map<string, number>();
      type.attributeGroupIds?.forEach((groupId, index) => {
        orderMap.set(groupId, index);
      });
      map.set(type._id, orderMap);
    });
    return map;
  }, [productTypesData]);

  if (!enableProductTypes || !productAttributesMap) return null;
  const terms = productAttributesMap.get(productId);
  if (!terms || terms.length === 0) return null;

  // 1. Nhóm các term theo groupId để tránh trùng lặp badge cùng loại và gộp tên
  const groupMap = new Map<string, { group: any; terms: Array<{ _id: string; name: string; slug: string; order?: number }> }>();
  for (const term of terms) {
    if (!term.group) continue;
    const groupId = term.group._id;
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, {
        group: term.group,
        terms: []
      });
    }
    const groupData = groupMap.get(groupId)!;
    groupData.terms.push({ _id: term._id, name: term.name, slug: term.slug, order: term.order });
  }

  // 2. Chuyển đổi thành danh sách các nhóm đã gộp
  const mergedGroups = Array.from(groupMap.values()).map(g => ({
    _id: g.terms.map(t => t._id).join('-'),
    group: g.group,
    terms: g.terms.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)),
  }));

  // 3. Sắp xếp các nhóm theo thứ tự cấu hình của Loại sản phẩm
  const configuredOrder = productTypeId ? productTypeAttributeOrderMap.get(productTypeId) : undefined;
  const sortedGroups = mergedGroups.sort((a, b) => {
    const aOrder = configuredOrder?.get(a.group._id) ?? a.group.order ?? 9999;
    const bOrder = configuredOrder?.get(b.group._id) ?? b.group.order ?? 9999;
    return aOrder - bOrder;
  });

  return (
    <div className={className}>
      {(limit ? sortedGroups.slice(0, limit) : sortedGroups).map((groupItem) => {
        const IconComponent = getAttributeIconComponent(groupItem.group.iconPath);
        const groupId = groupItem.group._id;

        const isAnyTermChecked = groupItem.terms.some(term => {
          const currentTermSlugs = selectedAttributes?.[groupId] || [];
          return currentTermSlugs.includes(term.slug);
        });

        return (
          <div
            key={groupItem._id}
            className={`flex min-w-0 max-w-full items-start gap-1.5 font-medium leading-5 transition-colors duration-300 ${itemClassName}`}
            style={{
              color: isAnyTermChecked ? tokens.primary : undefined,
            } as React.CSSProperties}
            title={groupItem.group.name}
          >
            <span style={{ color: tokens.primary }} className="mt-0.5 flex shrink-0 items-center justify-center">
              <IconComponent size={15} className={iconClassName} />
            </span>
            <div className="flex min-w-0 max-h-5 flex-1 flex-wrap overflow-hidden">
              {groupItem.terms.slice(0, 2).map((term) => {
                const currentTermSlugs = selectedAttributes?.[groupId] || [];
                const isChecked = currentTermSlugs.includes(term.slug);

                return (
                  <span
                    key={term._id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      if (enableProductTypes && productTypeId) {
                        const productTypeSlug = productTypeSlugMap.get(productTypeId);
                        if (productTypeSlug) {
                          if (groupItem.group.filterType === 'range') {
                            router.push(`/${productTypeSlug}?attr_${groupItem.group.slug}=${term.slug}`, { scroll: false });
                          } else {
                            router.push(`/${productTypeSlug}/${groupItem.group.slug}/${term.slug}`, { scroll: false });
                          }
                          return;
                        }
                      }

                      onAttributeChange?.(groupItem.group.slug, term.slug, !isChecked);
                    }}
                    className={`min-w-0 max-w-full cursor-pointer truncate transition-colors before:content-[',_'] first:before:content-none hover:underline ${
                      isChecked
                        ? 'font-semibold'
                        : 'font-normal text-slate-600 dark:text-slate-400'
                    }`}
                    style={isChecked ? { color: tokens.primary } : undefined}
                    title={`Lọc theo ${groupItem.group.name.toLowerCase()}: ${term.name}`}
                  >
                    {term.name}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProductGrid({ products, categoryMap, tokens, showPrice, showSalePrice, showStock, saleMode, showWishlistButton, showAddToCartButton, showBuyNowButton, buyNowLabel, showPromotionBadge, wishlistIdSet, onToggleWishlist, onAddToCart, onBuyNow, canUseWishlist, imageAspectRatioStyle, frameConfig, watermarkConfig, getDetailHref, radiusClass, productAttributesMap, onAttributeChange, selectedAttributes }: { products: ProductCardProps['product'][]; categoryMap: Map<string, string>; tokens: ProductsListColors; showPrice: boolean; showSalePrice: boolean; showStock: boolean; saleMode: ProductsSaleMode; showWishlistButton: boolean; showAddToCartButton: boolean; showBuyNowButton: boolean; buyNowLabel: string; showPromotionBadge: boolean; wishlistIdSet: Set<Id<'products'>>; onToggleWishlist: (id: Id<'products'>) => void; onAddToCart: (product: ProductCardProps['product']) => void; onBuyNow: (product: ProductCardProps['product']) => void; canUseWishlist: boolean; imageAspectRatioStyle: React.CSSProperties; frameConfig?: ProductFrameConfig | null; watermarkConfig?: WatermarkConfig | null; getDetailHref: (product: ProductCardProps['product']) => string; radiusClass: string; productAttributesMap?: Map<string, any[]>; onAttributeChange?: (groupSlug: string, termSlug: any, checked: boolean) => void; selectedAttributes?: Record<string, string[]> }) {
  const productImagePlaceholder = useProductImagePlaceholder();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
      {products.map((product) => (
        (() => {
          const priceDisplay = getPublicPriceLabel({ saleMode, price: product.price, salePrice: product.salePrice, isRangeFromVariant: product.hasVariants });
          return (
        <Link
          key={product._id}
          href={getDetailHref(product)}
          className={`group ${radiusClass} overflow-hidden border transition-all duration-300 flex flex-col h-full hover:border-[var(--card-hover-border)] hover:shadow-lg hover:shadow-[var(--card-hover-shadow)] hover:-translate-y-1`}
          style={{
            backgroundColor: tokens.cardBackground,
            borderColor: tokens.cardBorder,
            '--card-hover-border': tokens.primary,
            '--card-hover-shadow': `${tokens.primary}15`,
          } as React.CSSProperties}
        >
          <ProductImageWithOverlay
            frameConfig={frameConfig}
            watermarkConfig={watermarkConfig}
            className="overflow-hidden relative"
            style={{ ...imageAspectRatioStyle, backgroundColor: tokens.filterChipBg }}
          >
            {product.image || productImagePlaceholder ? (
                <Image mode="thumb" src={product.image || productImagePlaceholder} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Package size={48} style={{ color: tokens.neutralTextLight }} /></div>
            )}
            {showPromotionBadge && showSalePrice && priceDisplay.comparePrice && !priceDisplay.isContactPrice && (
              <span
                className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded z-30"
                style={{ backgroundColor: tokens.promotionBadgeBg, color: tokens.promotionBadgeText }}
              >
                -{Math.round((1 - product.price / priceDisplay.comparePrice) * 100)}%
              </span>
            )}
            {showWishlistButton && canUseWishlist && (
              <button
                className="absolute top-2 right-2 p-2 rounded-full border transition-all duration-300 z-30 hover:bg-[var(--wishlist-hover-bg)] hover:border-[var(--wishlist-hover-border)] hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: tokens.wishlistButtonBg,
                  borderColor: tokens.wishlistButtonBorder,
                  color: wishlistIdSet.has(product._id) ? tokens.wishlistIconActive : tokens.wishlistIcon,
                  '--wishlist-hover-bg': wishlistIdSet.has(product._id) ? `${tokens.wishlistIconActive}15` : `${tokens.primary}10`,
                  '--wishlist-hover-border': wishlistIdSet.has(product._id) ? tokens.wishlistIconActive : tokens.primary,
                } as React.CSSProperties}
                onClick={(event) => { event.preventDefault(); onToggleWishlist(product._id); }}
                aria-label="Thêm vào yêu thích"
              >
                <Heart size={16} />
              </button>
            )}
          </ProductImageWithOverlay>
          <div className="p-4 flex flex-1 flex-col">
            <div className="flex mb-1.5">
              <span
                className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border transition-all duration-300"
                style={{
                  backgroundColor: tokens.categoryBadgeBg,
                  color: tokens.categoryBadgeText,
                  borderColor: tokens.categoryBadgeBorder
                }}
              >
                {categoryMap.get(product.categoryId) ?? 'Sản phẩm'}
              </span>
            </div>
            <h3 className="font-medium line-clamp-2 transition-colors mb-2 group-hover:text-[var(--title-hover-color)]" style={{ color: tokens.bodyText, '--title-hover-color': tokens.primary } as React.CSSProperties}>{product.name}</h3>
            {showPrice && (
              <div className="flex items-center gap-2">
                <span className="font-bold" style={{ color: tokens.priceColor }}>{priceDisplay.label}</span>
                {showSalePrice && priceDisplay.comparePrice && (
                  <span className="text-sm line-through" style={{ color: tokens.priceOriginalText }}>
                    {getPublicPriceLabel({ saleMode: 'cart', price: priceDisplay.comparePrice }).label}
                  </span>
                )}
              </div>
            )}
            <ProductAttributesBadges
              productId={product._id}
              productAttributesMap={productAttributesMap}
              tokens={tokens}
              onAttributeChange={onAttributeChange}
              selectedAttributes={selectedAttributes}
              productTypeId={product.productTypeId}
              limit={4}
              itemClassName="text-xs md:text-[13.2px]"
              iconClassName="h-[15px] w-[15px] md:h-[16.5px] md:w-[16.5px]"
            />
            <div className="min-h-[20px] mt-2">
              {showStock && product.stock <= 5 && product.stock > 0 && <p className="text-xs" style={{ color: tokens.stockLowText }}>Chỉ còn {product.stock} sản phẩm</p>}
              {showStock && product.stock === 0 && <p className="text-xs" style={{ color: tokens.stockOutText }}>Hết hàng</p>}
            </div>
            <div className="mt-auto">
              <ProductCardActions
                product={product}
                tokens={tokens}
                showStock={showStock}
                showAddToCartButton={showAddToCartButton}
                showBuyNowButton={showBuyNowButton}
                buyNowLabel={buyNowLabel}
                onAddToCart={onAddToCart}
                onBuyNow={onBuyNow}
              />
            </div>
          </div>
        </Link>
          );
        })()
      ))}
    </div>
  );
}

function ProductList({ products, categoryMap, tokens, showPrice, showSalePrice, showStock, saleMode, showWishlistButton, showAddToCartButton, showBuyNowButton, buyNowLabel, showPromotionBadge: _showPromotionBadge, wishlistIdSet, onToggleWishlist, onAddToCart, onBuyNow, canUseWishlist, imageAspectRatioStyle, frameConfig, watermarkConfig, getDetailHref, radiusClass, productAttributesMap, onAttributeChange, selectedAttributes }: { products: ProductCardProps['product'][]; categoryMap: Map<string, string>; tokens: ProductsListColors; showPrice: boolean; showSalePrice: boolean; showStock: boolean; saleMode: ProductsSaleMode; showWishlistButton: boolean; showAddToCartButton: boolean; showBuyNowButton: boolean; buyNowLabel: string; showPromotionBadge: boolean; wishlistIdSet: Set<Id<'products'>>; onToggleWishlist: (id: Id<'products'>) => void; onAddToCart: (product: ProductCardProps['product']) => void; onBuyNow: (product: ProductCardProps['product']) => void; canUseWishlist: boolean; imageAspectRatioStyle: React.CSSProperties; frameConfig?: ProductFrameConfig | null; watermarkConfig?: WatermarkConfig | null; getDetailHref: (product: ProductCardProps['product']) => string; radiusClass: string; productAttributesMap?: Map<string, any[]>; onAttributeChange?: (groupSlug: string, termSlug: any, checked: boolean) => void; selectedAttributes?: Record<string, string[]> }) {
  const productImagePlaceholder = useProductImagePlaceholder();
  return (
    <div className="space-y-4">
      {products.map((product) => (
        (() => {
          const priceDisplay = getPublicPriceLabel({ saleMode, price: product.price, salePrice: product.salePrice, isRangeFromVariant: product.hasVariants });
          return (
        <Link
          key={product._id}
          href={getDetailHref(product)}
          className={`group flex gap-4 ${radiusClass} overflow-hidden border transition-all duration-300 p-4 hover:border-[var(--card-hover-border)] hover:shadow-lg hover:shadow-[var(--card-hover-shadow)] hover:-translate-y-0.5`}
          style={{
            backgroundColor: tokens.cardBackground,
            borderColor: tokens.cardBorder,
            '--card-hover-border': tokens.primary,
            '--card-hover-shadow': `${tokens.primary}10`,
          } as React.CSSProperties}
        >
          <ProductImageWithOverlay
            frameConfig={frameConfig}
            watermarkConfig={watermarkConfig}
            className="w-32 md:w-40 shrink-0 overflow-hidden rounded-lg relative"
            style={{ ...imageAspectRatioStyle, backgroundColor: tokens.filterChipBg }}
          >
            {product.image || productImagePlaceholder ? (
                <Image mode="thumb" src={product.image || productImagePlaceholder} alt={product.name} fill sizes="160px" className="object-cover group-hover:scale-110 transition-transform duration-500" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Package size={32} style={{ color: tokens.neutralTextLight }} /></div>
            )}
            {showWishlistButton && canUseWishlist && (
              <button
                className="absolute top-2 right-2 p-2 rounded-full border transition-all duration-300 z-30 hover:bg-[var(--wishlist-hover-bg)] hover:border-[var(--wishlist-hover-border)] hover:scale-110 active:scale-95"
                style={{
                  backgroundColor: tokens.wishlistButtonBg,
                  borderColor: tokens.wishlistButtonBorder,
                  color: wishlistIdSet.has(product._id) ? tokens.wishlistIconActive : tokens.wishlistIcon,
                  '--wishlist-hover-bg': wishlistIdSet.has(product._id) ? `${tokens.wishlistIconActive}15` : `${tokens.primary}10`,
                  '--wishlist-hover-border': wishlistIdSet.has(product._id) ? tokens.wishlistIconActive : tokens.primary,
                } as React.CSSProperties}
                onClick={(event) => { event.preventDefault(); onToggleWishlist(product._id); }}
                aria-label="Thêm vào yêu thích"
              >
                <Heart size={16} />
              </button>
            )}
          </ProductImageWithOverlay>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex mb-1.5">
              <span
                className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border transition-all duration-300"
                style={{
                  backgroundColor: tokens.categoryBadgeBg,
                  color: tokens.categoryBadgeText,
                  borderColor: tokens.categoryBadgeBorder
                }}
              >
                {categoryMap.get(product.categoryId) ?? 'Sản phẩm'}
              </span>
            </div>
            <h3 className="font-semibold text-lg transition-colors mb-2 group-hover:text-[var(--title-hover-color)]" style={{ color: tokens.bodyText, '--title-hover-color': tokens.primary } as React.CSSProperties}>{product.name}</h3>
            {product.description && <p className="text-sm line-clamp-2 mb-2" style={{ color: tokens.metaText }} dangerouslySetInnerHTML={{ __html: product.description.slice(0, 150) }} />}
            <ProductAttributesBadges
              productId={product._id}
              productAttributesMap={productAttributesMap}
              tokens={tokens}
              className="flex flex-col gap-1.5 w-full mb-3"
              onAttributeChange={onAttributeChange}
              selectedAttributes={selectedAttributes}
              productTypeId={product.productTypeId}
              limit={4}
              itemClassName="text-xs md:text-[13.2px]"
              iconClassName="h-[15px] w-[15px] md:h-[16.5px] md:w-[16.5px]"
            />
            <div className="flex items-center gap-4">
              {showPrice && (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold" style={{ color: tokens.priceColor }}>{priceDisplay.label}</span>
                  {showSalePrice && priceDisplay.comparePrice && (
                    <span className="text-sm line-through" style={{ color: tokens.priceOriginalText }}>
                      {getPublicPriceLabel({ saleMode: 'cart', price: priceDisplay.comparePrice }).label}
                    </span>
                  )}
                </div>
              )}
              {showStock && product.stock <= 5 && product.stock > 0 && <span className="text-xs" style={{ color: tokens.stockLowText }}>Chỉ còn {product.stock}</span>}
              {showStock && product.stock === 0 && <span className="text-xs" style={{ color: tokens.stockOutText }}>Hết hàng</span>}
            </div>
          </div>
          {(showAddToCartButton || showBuyNowButton) && (
            <div className="hidden md:flex items-center gap-2">
              {showAddToCartButton && (
                <button
                  className="p-3 rounded-full border transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
                  style={{ borderColor: tokens.secondaryActionBorder, color: tokens.secondaryActionText, backgroundColor: tokens.cardBackground }}
                  onClick={(e) => { e.preventDefault(); onAddToCart(product); }}
                  disabled={showStock && product.stock <= 0}
                >
                  <ShoppingCart size={20} />
                </button>
              )}
              {showBuyNowButton && (
                <button
                  className="px-3 py-2 rounded-full border text-xs font-medium transition-colors disabled:opacity-55 disabled:cursor-not-allowed"
                  style={{ borderColor: tokens.secondaryActionBorder, color: tokens.secondaryActionText }}
                  onClick={(e) => { e.preventDefault(); onBuyNow(product); }}
                  disabled={showStock && product.stock <= 0}
                >
                  {showStock && product.stock <= 0 ? 'Hết hàng' : buyNowLabel}
                </button>
              )}
            </div>
          )}
        </Link>
          );
        })()
      ))}
    </div>
  );
}

function EmptyState({ tokens, onReset }: { tokens: ProductsListColors; onReset: () => void }) {
  return (
    <div className="text-center py-16">
      <div
        className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
        style={{ backgroundColor: tokens.emptyStateIconBg }}
      >
        <Package size={32} style={{ color: tokens.emptyStateIconColor }} />
      </div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: tokens.emptyStateTitle }}>Không tìm thấy sản phẩm</h3>
      <p className="mb-6" style={{ color: tokens.emptyStateText }}>Thử thay đổi từ khóa hoặc bộ lọc khác</p>
      <button
        onClick={onReset}
        className="px-6 py-2 rounded-lg font-medium transition-colors"
        style={{ backgroundColor: tokens.emptyStateButtonBg, color: tokens.emptyStateButtonText }}
      >
        Xóa bộ lọc
      </button>
    </div>
  );
}

function ClearFiltersButton({ tokens, onClear }: { tokens: ProductsListColors; onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors hover:opacity-85"
      style={{
        backgroundColor: tokens.filterChipBg,
        borderColor: tokens.filterChipActiveBorder,
        color: tokens.filterChipActiveBg,
      }}
      title="Xóa toàn bộ bộ lọc"
    >
      <X size={14} />
      Xóa lọc
    </button>
  );
}

// Helper functions for double slider range filter
function parseNumericValue(name: string): number | null {
  const match = name.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : null;
}

interface AttributeFilterGroupWidgetProps {
  group: any;
  selectedAttributes: Record<string, string[]> | undefined;
  onAttributeChange: ((groupSlug: string, termId: any, checked: boolean) => void) | undefined;
  tokens: ProductsListColors;
}

function AttributeFilterGroupWidget({
  group,
  selectedAttributes,
  onAttributeChange,
  tokens
}: AttributeFilterGroupWidgetProps) {
  const inputType = group.inputType || 'radio';
  const filterType = group.filterType || 'single';

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const toggleDropdown = (open: boolean) => {
    setIsDropdownOpen(open);
  };

  // Range Slider logic
  const numericTerms = useMemo(() => {
    return (group.terms || [])
      .map((t: any) => ({ term: t, value: parseNumericValue(t.name) }))
      .filter((item: any) => item.value !== null)
      .sort((a: any, b: any) => a.value - b.value);
  }, [group.terms]);

  const { minLimit, maxLimit } = useMemo(() => {
    if (numericTerms.length === 0) {
      return { minLimit: 0, maxLimit: 100 };
    }
    return {
      minLimit: numericTerms[0].value,
      maxLimit: numericTerms[numericTerms.length - 1].value
    };
  }, [numericTerms]);

  const step = useMemo(() => {
    const diff = maxLimit - minLimit;
    if (diff <= 0) return 1;
    if (diff <= 2) return 0.1;
    if (diff <= 20) return 0.5;
    return 1;
  }, [minLimit, maxLimit]);

  const [sliderMin, setSliderMin] = useState(minLimit);
  const [sliderMax, setSliderMax] = useState(maxLimit);
  const lastAppliedSlugsRef = useRef<string[] | null>(null);

  // Sync slider state khi URL thay đổi từ bên ngoài
  const currentSelectedTermIds = selectedAttributes?.[group._id] || [];

  useEffect(() => {
    if (filterType === 'range' && numericTerms.length > 0) {
      const isSelfChange = lastAppliedSlugsRef.current &&
        lastAppliedSlugsRef.current.length === currentSelectedTermIds.length &&
        lastAppliedSlugsRef.current.every(slug => currentSelectedTermIds.includes(slug));

      if (isSelfChange) return;

      if (currentSelectedTermIds.length > 0) {
        const selectedValues = numericTerms
          .filter((item: any) => currentSelectedTermIds.includes(item.term.slug))
          .map((item: any) => item.value);
        if (selectedValues.length > 0) {
          setSliderMin(Math.min(...selectedValues));
          setSliderMax(Math.max(...selectedValues));
          return;
        }
      }
      setSliderMin(minLimit);
      setSliderMax(maxLimit);
    }
  }, [currentSelectedTermIds, minLimit, maxLimit, numericTerms, filterType]);

  const applyRangeFilter = useCallback((newMin: number, newMax: number) => {
    setSliderMin(newMin);
    setSliderMax(newMax);
    if (newMin === minLimit && newMax === maxLimit) {
      lastAppliedSlugsRef.current = [];
      onAttributeChange?.(group.slug, [], false);
    } else {
      const matchedTermSlugs = numericTerms
        .filter((item: any) => item.value >= newMin && item.value <= newMax)
        .map((item: any) => item.term.slug);
      lastAppliedSlugsRef.current = matchedTermSlugs;
      onAttributeChange?.(group.slug, matchedTermSlugs, true);
    }
  }, [minLimit, maxLimit, numericTerms, onAttributeChange, group.slug]);

  const unit = useMemo(() => {
    if (group.terms && group.terms.length > 0) {
      const name = group.terms[0].name;
      const clean = name.replace(/[\d\s.-]/g, '');
      return clean || '';
    }
    return '';
  }, [group.terms]);

  // RENDER DUAL RANGE SLIDER (dùng Radix UI Slider)
  if (filterType === 'range') {
    if (numericTerms.length === 0) {
      return <div className="text-xs italic opacity-60">Không có dữ liệu số để lọc theo khoảng.</div>;
    }

    return (
      <RangeSlider
        minLimit={minLimit}
        maxLimit={maxLimit}
        valueMin={sliderMin}
        valueMax={sliderMax}
        step={step}
        primaryColor={tokens.filterChipActiveBg}
        trackColor={tokens.filterChipBg}
        thumbBorderColor="#ffffff"
        unit={unit}
        onValueCommit={applyRangeFilter}
      />
    );
  }

  // RENDER CUSTOM DROPDOWN SELECT
  if (inputType === 'select') {
    const handleSelectTerm = (slug: string) => {
      if (!slug) {
        onAttributeChange?.(group.slug, '', false);
        return;
      }
      if (filterType === 'single') {
        onAttributeChange?.(group.slug, slug, true);
      } else {
        const isChecked = selectedAttributes?.[group._id]?.includes(slug) ?? false;
        onAttributeChange?.(group.slug, slug, !isChecked);
      }
    };

    const getDropdownLabel = () => {
      const selectedSlugs = selectedAttributes?.[group._id] || [];
      if (selectedSlugs.length === 0) {
        return filterType === 'single' ? `Chọn ${group.name}` : `Thêm ${group.name}...`;
      }
      const found = (group.terms || []).filter((t: any) => selectedSlugs.includes(t.slug));
      if (found.length === 0) {
        return filterType === 'single' ? `Chọn ${group.name}` : `Thêm ${group.name}...`;
      }
      return found.map((f: any) => f.name).join(', ');
    };

    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => toggleDropdown(!isDropdownOpen)}
          className="w-full flex items-center justify-between h-10 px-3 py-2 text-sm rounded-lg border bg-white dark:bg-slate-800 transition-all font-medium"
          style={{ borderColor: tokens.inputBorder, color: tokens.inputText }}
        >
          <span className="truncate">{getDropdownLabel()}</span>
          <ChevronDown size={16} className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} style={{ color: tokens.inputIcon }} />
        </button>

        {isDropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => toggleDropdown(false)} />
            <div className="absolute left-0 right-0 mt-1 z-20 max-h-60 overflow-y-auto rounded-lg border bg-white dark:bg-slate-800 shadow-lg p-1 space-y-0.5" style={{ borderColor: tokens.inputBorder }}>
              {filterType === 'single' && (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectTerm('');
                    toggleDropdown(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-md text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Tất cả
                </button>
              )}
              {group.terms.map((term: any) => {
                const isSelected = selectedAttributes?.[group._id]?.includes(term.slug) ?? false;
                return (
                  <button
                    key={term._id}
                    type="button"
                    onClick={() => {
                      handleSelectTerm(term.slug);
                      if (filterType !== 'multiple') toggleDropdown(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md text-left transition-colors ${
                      isSelected
                        ? 'font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    style={isSelected ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText } : {}}
                  >
                    <span>{term.name}</span>
                    {isSelected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Selected tags list for multiple filter select */}
        {filterType === 'multiple' && currentSelectedTermIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {currentSelectedTermIds.map((termSlug: string) => {
              const term = group.terms.find((t: any) => t.slug === termSlug);
              if (!term) return null;
              return (
                <span
                  key={termSlug}
                  onClick={() => onAttributeChange?.(group.slug, termSlug, false)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm cursor-pointer border hover:opacity-85 transition-opacity"
                  style={{
                    backgroundColor: tokens.filterChipBg,
                    color: tokens.filterChipText,
                    borderColor: tokens.filterChipBorder,
                  }}
                >
                  {term.name}
                  <X size={10} />
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // RENDER BUTTONS (Chips)
  if (inputType === 'buttons') {
    return (
      <div className="flex flex-wrap gap-2">
        {group.terms.map((term: any) => {
          const isChecked = selectedAttributes?.[group._id]?.includes(term.slug) ?? false;
          const handleButtonClick = () => {
            onAttributeChange?.(group.slug, term.slug, !isChecked);
          };
          return (
            <button
              key={term._id}
              type="button"
              onClick={handleButtonClick}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
              style={isChecked
                ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
              }
            >
              {term.name}
            </button>
          );
        })}
      </div>
    );
  }

  // RENDER RADIO / CHECKBOX
  return (
    <div className="space-y-2">
      {group.terms.map((term: any) => {
        const isChecked = selectedAttributes?.[group._id]?.includes(term.slug) ?? false;
        const isRadio = filterType === 'single' || inputType === 'radio';
        const handleLabelClick = () => {
          onAttributeChange?.(group.slug, term.slug, !isChecked);
        };

        return (
          <button
            key={term._id}
            type="button"
            onClick={handleLabelClick}
            className="w-full min-h-9 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-left leading-5 transition-colors group hover:opacity-85"
            style={{ color: tokens.bodyText }}
          >
            <div
              className={`w-4 h-4 flex shrink-0 items-center justify-center transition-all ${
                isRadio ? 'rounded-full' : 'rounded border'
              }`}
              style={{
                borderWidth: '1px',
                borderColor: isChecked ? tokens.filterChipActiveBg : tokens.inputBorder,
                backgroundColor: isChecked ? tokens.filterChipActiveBg : tokens.inputBackground,
                color: tokens.filterChipActiveText
              }}
            >
              {isChecked && (
                isRadio ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" style={{ backgroundColor: tokens.filterChipActiveText }} />
                ) : (
                  <Check size={11} className="stroke-[3]" style={{ color: tokens.filterChipActiveText }} />
                )
              )}
            </div>
            <span className={isChecked ? 'font-semibold' : 'font-normal'}>
              {term.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ========== CATALOG LAYOUT ==========

interface LayoutProps {
  isLoadingProducts: boolean;
  postsPerPage: number;
  products: ProductCardProps['product'][];
  categories: { _id: Id<"productCategories">; name: string; slug: string; description?: string; filterFooterContent?: string }[];
  categoryMap: Map<string, string>;
  selectedCategory: Id<"productCategories"> | null;
  onCategoryChange: (id: Id<"productCategories"> | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: ProductSortOption;
  onSortChange: (s: ProductSortOption) => void;
  tokens: ProductsListColors;
  showPrice: boolean;
  showSalePrice: boolean;
  showStock: boolean;
  saleMode: ProductsSaleMode;
  totalCount: number | undefined;
  paginationNode?: React.ReactNode;
  showWishlistButton: boolean;
  showAddToCartButton: boolean;
  showBuyNowButton: boolean;
  buyNowLabel: string;
  showPromotionBadge: boolean;
  wishlistIdSet: Set<Id<'products'>>;
  onToggleWishlist: (id: Id<'products'>) => void;
  onAddToCart: (product: ProductCardProps['product']) => void;
  onBuyNow: (product: ProductCardProps['product']) => void;
  canUseWishlist: boolean;
  imageAspectRatioStyle: React.CSSProperties;
  frameConfig?: ProductFrameConfig | null;
  watermarkConfig?: WatermarkConfig | null;
  getDetailHref: (product: ProductCardProps['product']) => string;
  activeCategoryDoc?: { name: string; description?: string; filterFooterContent?: string } | null;
  showCategorySubtitle?: boolean;
  enableCategoryFilterFooterContent?: boolean;
  filterableGroups?: any[];
  selectedAttributes?: Record<string, string[]>;
  onAttributeChange?: (groupSlug: string, termId: any, checked: boolean) => void;
  productType?: any;
  selectedPriceRange: PriceRange | null;
  onPriceRangeChange: (priceRange: PriceRange | null) => void;
  enableProductTypes: boolean;
  productTypes?: { _id: Id<"productTypes">; name: string; slug: string }[];
  onProductTypeChange?: (slug: string | null) => void;
  attributeFilter?: { groupId: string; termId?: string; termSlug?: string };
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  radiusClass: string;
  productAttributesMap?: Map<string, any[]>;
}

interface MobileProductsFiltersProps {
  categories: { _id: Id<'productCategories'>; name: string; slug: string }[];
  selectedCategory: Id<'productCategories'> | null;
  onCategoryChange: (categoryId: Id<'productCategories'> | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: ProductSortOption;
  onSortChange: (sort: ProductSortOption) => void;
  tokens: ProductsListColors;
  filterableGroups?: any[];
  selectedAttributes?: Record<string, string[]>;
  onAttributeChange?: (groupSlug: string, termId: any, checked: boolean) => void;
  productType?: any;
  selectedPriceRange: PriceRange | null;
  onPriceRangeChange: (priceRange: PriceRange | null) => void;
  enableProductTypes: boolean;
  productTypes?: { _id: Id<"productTypes">; name: string; slug: string }[];
  onProductTypeChange?: (slug: string | null) => void;
  attributeFilter?: { groupId: string; termId?: string; termSlug?: string };
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  radiusClass: string;
}

function MobileProductsFilters({
  categories,
  selectedCategory,
  onCategoryChange,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  tokens,
  filterableGroups,
  selectedAttributes,
  onAttributeChange,
  productType,
  selectedPriceRange,
  onPriceRangeChange,
  enableProductTypes,
  productTypes,
  onProductTypeChange,
  hasActiveFilters: externalHasActiveFilters,
  onClearFilters,
  radiusClass,
}: MobileProductsFiltersProps) {
  const [open, setOpen] = useState(false);
  const hasSelectedAttributes = Object.values(selectedAttributes ?? {}).some((items) => items.length > 0);
  const hasActiveFilters = externalHasActiveFilters ?? (Boolean(selectedCategory || searchQuery || selectedPriceRange || hasSelectedAttributes) || sortBy !== 'newest');

  return (
    <div className={`lg:hidden ${radiusClass} border p-3 mb-3`} style={{ backgroundColor: tokens.filterBarBackground, borderColor: tokens.filterBarBorder }}>
      <button
        onClick={() => { setOpen(prev => !prev); }}
        className="flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm font-medium"
        style={{
          borderColor: tokens.filterButtonBorder,
          backgroundColor: tokens.filterButtonBg,
          color: tokens.filterButtonText,
        }}
        aria-expanded={open}
        aria-label="Bật tắt bộ lọc sản phẩm"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={16} />
          Bộ lọc sản phẩm
          {hasActiveFilters && (
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tokens.filterChipActiveBg }} />
          )}
        </span>
        <span className="flex items-center gap-2">
          {hasActiveFilters && onClearFilters && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onClearFilters();
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  event.stopPropagation();
                  onClearFilters();
                }
              }}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors hover:opacity-85"
              style={{ borderColor: tokens.filterChipActiveBorder, color: tokens.filterChipActiveBg, backgroundColor: tokens.filterChipBg }}
              aria-label="Xóa toàn bộ bộ lọc"
              title="Xóa toàn bộ bộ lọc"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t pt-3" style={{ borderColor: tokens.filterBarBorder }}>
          <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: tokens.inputIcon }} />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => { onSearchChange(e.target.value); }}
                className="w-full h-10 pl-9 pr-9 rounded-lg border text-sm outline-none placeholder:text-[var(--placeholder-color)]"
                style={{
                  borderColor: tokens.inputBorder,
                  backgroundColor: tokens.inputBackground,
                  color: tokens.inputText,
                  '--placeholder-color': tokens.inputPlaceholder,
                } as React.CSSProperties}
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearchChange(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: tokens.inputIcon }}
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={16} />
                </button>
              )}
          </div>

          {enableProductTypes && productTypes && productTypes.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: tokens.metaText }}>Nhóm sản phẩm</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { onProductTypeChange?.(null); }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                  style={!productType
                    ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                    : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                  }
                >
                  Tất cả nhóm
                </button>
                {productTypes.map((t) => (
                  <button
                    key={t._id}
                    onClick={() => { onProductTypeChange?.(t.slug); }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                    style={productType?.slug === t.slug
                      ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                      : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                    }
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: tokens.metaText }}>Danh mục</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { onCategoryChange(null); }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                  style={selectedCategory === null
                    ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                    : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                  }
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => { onCategoryChange(cat._id); }}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                    style={selectedCategory === cat._id
                      ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                      : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                    }
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
          </div>

          {enableProductTypes && productType?.priceRanges && productType.priceRanges.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: tokens.metaText }}>Khoảng giá</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => onPriceRangeChange(null)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                  style={selectedPriceRange === null
                    ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                    : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                  }
                >
                  Tất cả
                </button>
                {productType.priceRanges.map((range: PriceRange) => (
                  <button
                    key={range.slug}
                    onClick={() => onPriceRangeChange(range)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                    style={selectedPriceRange?.slug === range.slug
                      ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                      : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                    }
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* Mobile Attribute Filters */}
          {filterableGroups?.map(group => (
            <div key={group._id} className="space-y-3">
              <h3 className="font-semibold" style={{ color: tokens.bodyText }}>{group.name}</h3>
              <div className="pl-1">
                <AttributeFilterGroupWidget group={group} selectedAttributes={selectedAttributes} onAttributeChange={onAttributeChange} tokens={tokens} />
              </div>
            </div>
          ))}

          <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-wider" style={{ color: tokens.metaText }}>
                Sắp xếp
              </label>
              <select
                value={sortBy}
              onChange={(e) => { onSortChange(e.target.value as ProductSortOption); }}
              className="w-full h-10 rounded-lg border px-3 text-sm outline-none"
              style={{
                borderColor: tokens.inputBorder,
                backgroundColor: tokens.inputBackground,
                color: tokens.inputText,
              }}
            >
              <option value="newest">Mới nhất</option>
              <option value="popular">Bán chạy</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
              <option value="name">Tên A-Z</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function CatalogLayout({ isLoadingProducts, postsPerPage, products, categories, categoryMap: _categoryMap, selectedCategory, onCategoryChange, searchQuery, onSearchChange, sortBy, onSortChange, tokens, showPrice, showSalePrice, showStock, saleMode, totalCount, paginationNode, showWishlistButton, showAddToCartButton, showBuyNowButton, buyNowLabel, showPromotionBadge, wishlistIdSet, onToggleWishlist, onAddToCart, onBuyNow, canUseWishlist, imageAspectRatioStyle, frameConfig, watermarkConfig, getDetailHref, activeCategoryDoc, showCategorySubtitle, enableCategoryFilterFooterContent, filterableGroups, selectedAttributes, onAttributeChange, productType, selectedPriceRange, onPriceRangeChange, enableProductTypes, productTypes, onProductTypeChange, attributeFilter, hasActiveFilters, onClearFilters, radiusClass, productAttributesMap }: LayoutProps) {
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const productImagePlaceholder = useProductImagePlaceholder();

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    if (categories.length <= 8) {
      return categories;
    }
    if (!categorySearchQuery.trim()) {
      return categories;
    }
    const query = categorySearchQuery.toLowerCase().trim();
    const removeDiacritics = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };
    const normalizedQuery = removeDiacritics(query);
    return categories.filter(cat =>
      removeDiacritics(cat.name).includes(normalizedQuery)
    );
  }, [categories, categorySearchQuery]);

  return (
    <div className="py-8 md:py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: tokens.headingColor }}>
            {activeCategoryDoc?.name ?? (enableProductTypes ? productType?.name : null) ?? 'Sản phẩm'}
          </h1>
          {showCategorySubtitle && activeCategoryDoc?.description && (
            <p className="mt-2 text-base max-w-2xl mx-auto opacity-80" style={{ color: tokens.bodyText }}>
              {activeCategoryDoc.description}
            </p>
          )}
        </div>

        <MobileProductsFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          sortBy={sortBy}
          onSortChange={onSortChange}
          tokens={tokens}
          filterableGroups={filterableGroups}
          selectedAttributes={selectedAttributes}
          onAttributeChange={onAttributeChange}
          productType={productType}
          selectedPriceRange={selectedPriceRange}
          onPriceRangeChange={onPriceRangeChange}
          enableProductTypes={enableProductTypes}
          productTypes={productTypes}
          onProductTypeChange={onProductTypeChange}
          attributeFilter={attributeFilter}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
          radiusClass={radiusClass}
        />

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="hidden lg:block w-64 shrink-0 space-y-3 text-sm">
            <div className={`${radiusClass} border p-3`} style={{ backgroundColor: tokens.filterBarBackground, borderColor: tokens.filterBarBorder }}>
                <h3 className="text-sm font-semibold leading-5 mb-3" style={{ color: tokens.bodyText }}>Tìm kiếm</h3>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: tokens.inputIcon }} />
                  <input
                    type="text"
                    placeholder="Tìm sản phẩm..."
                    value={searchQuery}
                    onChange={(e) => { onSearchChange(e.target.value); }}
                    className="w-full h-10 pl-9 pr-9 rounded-lg border text-sm leading-5 outline-none placeholder:text-[var(--placeholder-color)]"
                    style={{
                      borderColor: tokens.inputBorder,
                      backgroundColor: tokens.inputBackground,
                      color: tokens.inputText,
                      '--placeholder-color': tokens.inputPlaceholder,
                    } as React.CSSProperties}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => { onSearchChange(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: tokens.inputIcon }}
                      aria-label="Xóa tìm kiếm"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
            </div>

            {enableProductTypes && productTypes && productTypes.length > 0 && (
              <div className={`${radiusClass} border p-3`} style={{ backgroundColor: tokens.filterBarBackground, borderColor: tokens.filterBarBorder }}>
                <h3 className="text-sm font-semibold leading-5 mb-3" style={{ color: tokens.bodyText }}>Nhóm sản phẩm</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => { onProductTypeChange?.(null); }}
                    className="w-full min-h-9 text-left px-3 py-2 rounded-lg text-sm leading-5 transition-colors border"
                    style={!productType
                      ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                      : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                    }
                  >
                    Tất cả nhóm
                  </button>
                  {productTypes.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => { onProductTypeChange?.(t.slug); }}
                      className="w-full min-h-9 text-left px-3 py-2 rounded-lg text-sm leading-5 transition-colors border truncate"
                      style={productType?.slug === t.slug
                        ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                        : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                      }
                      title={t.name}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={`${radiusClass} border p-3`} style={{ backgroundColor: tokens.filterBarBackground, borderColor: tokens.filterBarBorder }}>
                <h3 className="text-sm font-semibold leading-5 mb-3" style={{ color: tokens.bodyText }}>Danh mục</h3>
                {categories.length > 8 && (
                  <div className="relative mb-2.5">
                    <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: tokens.inputIcon }} />
                    <input
                      type="text"
                      placeholder="Tìm nhanh danh mục..."
                      value={categorySearchQuery}
                      onChange={(e) => { setCategorySearchQuery(e.target.value); }}
                      className="w-full h-8 pl-8 pr-7 rounded-lg border text-xs outline-none placeholder:text-[var(--placeholder-color)]"
                      style={{
                        borderColor: tokens.inputBorder,
                        backgroundColor: tokens.inputBackground,
                        color: tokens.inputText,
                        '--placeholder-color': tokens.inputPlaceholder,
                      } as React.CSSProperties}
                    />
                    {categorySearchQuery && (
                      <button
                        onClick={() => { setCategorySearchQuery(''); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2"
                        style={{ color: tokens.inputIcon }}
                        aria-label="Xóa tìm danh mục"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}
                <div className="space-y-1">
                  <button
                    onClick={() => { onCategoryChange(null); }}
                    className="w-full min-h-9 text-left px-3 py-2 rounded-lg text-sm leading-5 transition-colors border"
                    style={selectedCategory === null
                      ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                      : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                    }
                  >
                    Tất cả sản phẩm
                  </button>
                  <div
                    className="space-y-1 pr-0.5"
                    style={categories.length > 8 ? {
                      maxHeight: '240px',
                      overflowY: 'auto',
                      scrollbarWidth: 'thin',
                    } : undefined}
                  >
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat._id}
                        onClick={() => { onCategoryChange(cat._id); }}
                        className="w-full min-h-9 text-left px-3 py-2 rounded-lg text-sm leading-5 transition-colors border truncate"
                        style={selectedCategory === cat._id
                          ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                          : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                        }
                        title={cat.name}
                      >
                        {cat.name}
                      </button>
                    ))}
                    {filteredCategories.length === 0 && (
                      <p className="text-xs text-center py-4 italic opacity-60" style={{ color: tokens.bodyText }}>
                        Không tìm thấy danh mục
                      </p>
                    )}
                  </div>
                </div>
            </div>

            {enableProductTypes && productType?.priceRanges && productType.priceRanges.length > 0 && (
              <div className={`${radiusClass} border p-3`} style={{ backgroundColor: tokens.filterBarBackground, borderColor: tokens.filterBarBorder }}>
                <h3 className="text-sm font-semibold leading-5 mb-3" style={{ color: tokens.bodyText }}>Khoảng giá</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => onPriceRangeChange(null)}
                    className="w-full min-h-9 text-left px-3 py-2 rounded-lg text-sm leading-5 transition-colors border"
                    style={selectedPriceRange === null
                      ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                      : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                    }
                  >
                    Tất cả khoảng giá
                  </button>
                  {productType.priceRanges.map((range: PriceRange) => (
                    <button
                      key={range.slug}
                      onClick={() => onPriceRangeChange(range)}
                      className="w-full min-h-9 text-left px-3 py-2 rounded-lg text-sm leading-5 transition-colors border"
                      style={selectedPriceRange?.slug === range.slug
                        ? { backgroundColor: tokens.filterChipActiveBg, color: tokens.filterChipActiveText, borderColor: tokens.filterChipActiveBorder }
                        : { backgroundColor: tokens.filterChipBg, color: tokens.filterChipText, borderColor: tokens.filterChipBorder }
                      }
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Desktop Attribute Filters */}
            {filterableGroups?.map(group => (
              <div key={group._id} className={`${radiusClass} border p-3`} style={{ backgroundColor: tokens.filterBarBackground, borderColor: tokens.filterBarBorder }}>
                <h3 className="text-sm font-semibold leading-5 mb-3" style={{ color: tokens.bodyText }}>{group.name}</h3>
                <div>
                  <AttributeFilterGroupWidget group={group} selectedAttributes={selectedAttributes} onAttributeChange={onAttributeChange} tokens={tokens} />
                </div>
              </div>
            ))}

          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <p className="text-sm" style={{ color: tokens.metaText }}>
                Hiển thị <span className="font-medium" style={{ color: tokens.bodyText }}>{products.length}</span>
                {totalCount !== undefined && products.length > 0 && totalCount > products.length && <> / {totalCount}</>} sản phẩm
              </p>
              <div className="flex items-center gap-2">
                {hasActiveFilters && onClearFilters && (
                  <ClearFiltersButton tokens={tokens} onClear={onClearFilters} />
                )}
                <span className="text-sm font-medium" style={{ color: tokens.metaText }}>Sắp xếp</span>
                <select
                  value={sortBy}
                  onChange={(e) =>{  onSortChange(e.target.value as ProductSortOption); }}
                  className="h-10 min-w-[160px] rounded-lg border px-3 text-sm leading-5 outline-none"
                  style={{
                    borderColor: tokens.inputBorder,
                    backgroundColor: tokens.inputBackground,
                    color: tokens.inputText,
                  }}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="popular">Bán chạy</option>
                  <option value="price_asc">Giá thấp → cao</option>
                  <option value="price_desc">Giá cao → thấp</option>
                  <option value="name">Tên A-Z</option>
                </select>
              </div>
            </div>

            {isLoadingProducts ? (
              <ProductsGridSkeleton count={postsPerPage} tokens={tokens} />
            ) : products.length === 0 ? (
              <EmptyState tokens={tokens} onReset={onClearFilters ?? (() => { onSearchChange(''); onCategoryChange(null); })} />
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {products.map((product) => (
                  (() => {
                    const priceDisplay = getPublicPriceLabel({ saleMode, price: product.price, salePrice: product.salePrice, isRangeFromVariant: product.hasVariants });
                    return (
                  <Link
                    key={product._id}
                    href={getDetailHref(product)}
                    className={`group ${radiusClass} overflow-hidden border transition-all duration-300 flex flex-col h-full hover:border-[var(--card-hover-border)] hover:shadow-lg hover:shadow-[var(--card-hover-shadow)] hover:-translate-y-1`}
                    style={{
                      backgroundColor: tokens.cardBackground,
                      borderColor: tokens.cardBorder,
                      '--card-hover-border': tokens.primary,
                      '--card-hover-shadow': `${tokens.primary}15`,
                    } as React.CSSProperties}
                  >
                  <ProductImageWithOverlay
                    frameConfig={frameConfig}
                    watermarkConfig={watermarkConfig}
                    className="overflow-hidden relative"
                    style={{ ...imageAspectRatioStyle, backgroundColor: tokens.filterChipBg }}
                  >
                    {product.image || productImagePlaceholder ? (
                      <Image mode="thumb" src={product.image || productImagePlaceholder} alt={product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package size={32} style={{ color: tokens.neutralTextLight }} /></div>
                    )}
                    {showPromotionBadge && showSalePrice && priceDisplay.comparePrice && !priceDisplay.isContactPrice && (
                      <span
                        className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold rounded z-30"
                        style={{ backgroundColor: tokens.promotionBadgeBg, color: tokens.promotionBadgeText }}
                      >
                        -{Math.round((1 - product.price / priceDisplay.comparePrice) * 100)}%
                      </span>
                    )}
                    {showWishlistButton && canUseWishlist && (
                      <button
                        className="absolute top-2 right-2 p-2 rounded-full border transition-all duration-300 z-30 hover:bg-[var(--wishlist-hover-bg)] hover:border-[var(--wishlist-hover-border)] hover:scale-110 active:scale-95"
                        style={{
                          backgroundColor: tokens.wishlistButtonBg,
                          borderColor: tokens.wishlistButtonBorder,
                          color: wishlistIdSet.has(product._id) ? tokens.wishlistIconActive : tokens.wishlistIcon,
                          '--wishlist-hover-bg': wishlistIdSet.has(product._id) ? `${tokens.wishlistIconActive}15` : `${tokens.primary}10`,
                          '--wishlist-hover-border': wishlistIdSet.has(product._id) ? tokens.wishlistIconActive : tokens.primary,
                        } as React.CSSProperties}
                        onClick={(event) => { event.preventDefault(); onToggleWishlist(product._id); }}
                        aria-label="Thêm vào yêu thích"
                      >
                        <Heart size={16} />
                      </button>
                    )}
                  </ProductImageWithOverlay>
                    <div className="p-3 flex flex-1 flex-col">
                      <div className="flex mb-1.5">
                        <span
                          className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full border transition-all duration-300"
                          style={{
                            backgroundColor: tokens.categoryBadgeBg,
                            color: tokens.categoryBadgeText,
                            borderColor: tokens.categoryBadgeBorder
                          }}
                        >
                          {_categoryMap.get(product.categoryId) ?? 'Sản phẩm'}
                        </span>
                      </div>
                      <h3 className="font-medium text-sm line-clamp-2 transition-colors group-hover:text-[var(--title-hover-color)]" style={{ color: tokens.bodyText, '--title-hover-color': tokens.primary } as React.CSSProperties}>{product.name}</h3>
                      {showPrice && <span className="font-bold text-sm block mt-1" style={{ color: tokens.priceColor }}>{priceDisplay.label}</span>}
                      <ProductAttributesBadges
                        productId={product._id}
                        productAttributesMap={productAttributesMap}
                        tokens={tokens}
                        onAttributeChange={onAttributeChange}
                        selectedAttributes={selectedAttributes}
                        productTypeId={product.productTypeId}
                        limit={4}
                        itemClassName="text-xs md:text-[13.2px]"
                        iconClassName="h-[15px] w-[15px] md:h-[16.5px] md:w-[16.5px]"
                      />
                      <div className="min-h-[20px] mt-2">
                        {showStock && product.stock <= 5 && product.stock > 0 && <span className="text-xs block" style={{ color: tokens.stockLowText }}>Chỉ còn {product.stock} sản phẩm</span>}
                        {showStock && product.stock === 0 && <span className="text-xs block" style={{ color: tokens.stockOutText }}>Hết hàng</span>}
                      </div>
                      <div className="mt-auto">
                        <ProductCardActions
                          product={product}
                          tokens={tokens}
                          showStock={showStock}
                          showAddToCartButton={showAddToCartButton}
                          showBuyNowButton={showBuyNowButton}
                          buyNowLabel={buyNowLabel}
                          onAddToCart={onAddToCart}
                          onBuyNow={onBuyNow}
                        />
                      </div>
                    </div>
                  </Link>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </div>

        {paginationNode}

        {enableCategoryFilterFooterContent && activeCategoryDoc?.filterFooterContent && (
          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 max-w-4xl mx-auto text-left">
            <RichContent content={toRichTextContent(activeCategoryDoc.filterFooterContent)} />
          </div>
        )}
      </div>
    </div>
  );
}

// ========== LIST LAYOUT (Full width list view) ==========

function ListLayout({ isLoadingProducts, postsPerPage, products, categories, categoryMap, selectedCategory, onCategoryChange, searchQuery, onSearchChange, sortBy, onSortChange, tokens, showPrice, showSalePrice, showStock, saleMode, totalCount, paginationNode, showWishlistButton, showAddToCartButton, showBuyNowButton, buyNowLabel, showPromotionBadge, wishlistIdSet, onToggleWishlist, onAddToCart, onBuyNow, canUseWishlist, imageAspectRatioStyle, frameConfig, watermarkConfig, getDetailHref, activeCategoryDoc, showCategorySubtitle, enableCategoryFilterFooterContent, filterableGroups, selectedAttributes, onAttributeChange, productType, selectedPriceRange, onPriceRangeChange, enableProductTypes, productTypes, onProductTypeChange, hasActiveFilters, onClearFilters, radiusClass }: LayoutProps) {
  return (
    <div className="py-8 md:py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold" style={{ color: tokens.headingColor }}>
            {activeCategoryDoc?.name ?? (enableProductTypes ? productType?.name : null) ?? 'Sản phẩm'}
          </h1>
          {showCategorySubtitle && activeCategoryDoc?.description && (
            <p className="mt-2 text-base max-w-2xl mx-auto opacity-80" style={{ color: tokens.bodyText }}>
              {activeCategoryDoc.description}
            </p>
          )}
        </div>

        <MobileProductsFilters
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          sortBy={sortBy}
          onSortChange={onSortChange}
          tokens={tokens}
          filterableGroups={filterableGroups}
          selectedAttributes={selectedAttributes}
          onAttributeChange={onAttributeChange}
          productType={productType}
          selectedPriceRange={selectedPriceRange}
          onPriceRangeChange={onPriceRangeChange}
          enableProductTypes={enableProductTypes}
          productTypes={productTypes}
          onProductTypeChange={onProductTypeChange}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
          radiusClass={radiusClass}
        />

        <div
          className={`hidden md:block ${radiusClass} border p-3 mb-5`}
          style={{ backgroundColor: tokens.filterBarBackground, borderColor: tokens.filterBarBorder }}
        >
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: tokens.inputIcon }} />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchQuery}
                onChange={(e) => { onSearchChange(e.target.value); }}
                className="w-full h-10 pl-10 pr-9 rounded-lg border outline-none placeholder:text-[var(--placeholder-color)]"
                style={{
                  borderColor: tokens.inputBorder,
                  backgroundColor: tokens.inputBackground,
                  color: tokens.inputText,
                  '--placeholder-color': tokens.inputPlaceholder,
                } as React.CSSProperties}
              />
              {searchQuery && (
                <button
                  onClick={() => { onSearchChange(''); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: tokens.inputIcon }}
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {enableProductTypes && productTypes && productTypes.length > 0 && (
              <select
                value={productType?.slug ?? ''}
                onChange={(e) => { onProductTypeChange?.(e.target.value || null); }}
                className="h-10 px-3 rounded-lg border text-sm max-w-[200px]"
                style={{
                  borderColor: tokens.inputBorder,
                  backgroundColor: tokens.inputBackground,
                  color: tokens.inputText,
                }}
              >
                <option value="">Tất cả nhóm sản phẩm</option>
                {productTypes.map((t) => (
                  <option key={t._id} value={t.slug}>{t.name}</option>
                ))}
              </select>
            )}

            <select
              value={selectedCategory ?? ''}
              onChange={(e) => { onCategoryChange(e.target.value ? e.target.value as Id<"productCategories"> : null); }}
              className="h-10 px-3 rounded-lg border text-sm"
              style={{
                borderColor: tokens.inputBorder,
                backgroundColor: tokens.inputBackground,
                color: tokens.inputText,
              }}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((cat) => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>

            {enableProductTypes && productType?.priceRanges && productType.priceRanges.length > 0 && (
              <select
                value={selectedPriceRange?.slug ?? ''}
                onChange={(e) => {
                  const matched = productType?.priceRanges?.find((r: PriceRange) => r.slug === e.target.value);
                  onPriceRangeChange(matched ?? null);
                }}
                className="h-10 px-3 rounded-lg border text-sm"
                style={{
                  borderColor: tokens.inputBorder,
                  backgroundColor: tokens.inputBackground,
                  color: tokens.inputText,
                }}
              >
                <option value="">Tất cả khoảng giá</option>
                {productType.priceRanges.map((range: PriceRange) => (
                  <option key={range.slug} value={range.slug}>{range.label}</option>
                ))}
              </select>
            )}

            <select
              value={sortBy}
              onChange={(e) => { onSortChange(e.target.value as ProductSortOption); }}
              className="h-10 px-3 rounded-lg border text-sm"
              style={{
                borderColor: tokens.inputBorder,
                backgroundColor: tokens.inputBackground,
                color: tokens.inputText,
              }}
            >
              <option value="newest">Mới nhất</option>
              <option value="popular">Bán chạy</option>
              <option value="price_asc">Giá thấp → cao</option>
              <option value="price_desc">Giá cao → thấp</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm" style={{ color: tokens.metaText }}>
            Hiển thị <span className="font-medium" style={{ color: tokens.bodyText }}>{products.length}</span>
            {totalCount !== undefined && products.length > 0 && totalCount > products.length && <> / {totalCount}</>} sản phẩm
          </p>
          {hasActiveFilters && onClearFilters && (
            <ClearFiltersButton tokens={tokens} onClear={onClearFilters} />
          )}
        </div>

        {isLoadingProducts ? (
          <ProductsGridSkeleton count={postsPerPage} tokens={tokens} />
        ) : products.length === 0 ? (
          <EmptyState tokens={tokens} onReset={onClearFilters ?? (() => { onSearchChange(''); onCategoryChange(null); })} />
        ) : (
          <ProductList
            products={products}
            categoryMap={categoryMap}
            tokens={tokens}
            showPrice={showPrice}
            showSalePrice={showSalePrice}
            showStock={showStock}
            saleMode={saleMode}
            showWishlistButton={showWishlistButton}
            showAddToCartButton={showAddToCartButton}
            showBuyNowButton={showBuyNowButton}
            buyNowLabel={buyNowLabel}
            showPromotionBadge={showPromotionBadge}
            wishlistIdSet={wishlistIdSet}
            onToggleWishlist={onToggleWishlist}
            onAddToCart={onAddToCart}
            onBuyNow={onBuyNow}
            canUseWishlist={canUseWishlist}
            imageAspectRatioStyle={imageAspectRatioStyle}
            frameConfig={frameConfig}
            watermarkConfig={watermarkConfig}
            getDetailHref={getDetailHref}
            radiusClass={radiusClass}
            onAttributeChange={onAttributeChange}
            selectedAttributes={selectedAttributes}
          />
        )}

        {paginationNode}

        {enableCategoryFilterFooterContent && activeCategoryDoc?.filterFooterContent && (
          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 max-w-4xl mx-auto text-left">
            <RichContent content={toRichTextContent(activeCategoryDoc.filterFooterContent)} />
          </div>
        )}
      </div>
    </div>
  );
}
