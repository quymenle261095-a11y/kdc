'use client';

import React from 'react';
import Link from 'next/link';
import { PublicImage as Image } from '@/components/shared/PublicImage';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ArrowRight, Loader2, Package } from 'lucide-react';
import { SaleBadge } from '@/components/site/shared/BrandColorHelpers';
import { ProductImageWithOverlay, useProductImageOverlayConfigs } from '@/components/shared/ProductImageWithOverlay';
import { getPublicPriceLabel } from '@/lib/products/public-price';
import { getProductImageAspectRatioCssValue, resolveProductImageAspectRatio } from '@/lib/products/image-aspect-ratio';
import { buildDetailPath, normalizeRouteMode } from '@/lib/ia/route-mode';
import { useSnapshotDemoContext } from '@/components/modules/homepage/SnapshotDemoProvider';
import { SectionHeader } from '@/app/admin/home-components/_shared/components/SectionHeader';
import { extractSectionHeaderConfig } from '@/app/admin/home-components/_shared/hooks/useSectionHeaderState';
import { getSectionSpacingClassName, normalizeSectionSpacing } from '@/app/admin/home-components/_shared/types/sectionSpacing';
import { cn } from '@/app/admin/components/ui';
import { getProductListCardRadiusClassName, getProductListImageRadiusClassName, normalizeProductListCardRadius } from '@/app/admin/home-components/product-list/_types';
import { resolveGridStyle } from '@/app/admin/home-components/product-grid/_lib/constants';


interface ProductGridSectionProps {
  config: Record<string, unknown>;
  brandColor: string;
  secondary: string;
  mode?: 'single' | 'dual';
  title: string;
  snapshotComponentKey?: string;
}

export function ProductGridSection({ config, brandColor, secondary, title, snapshotComponentKey }: ProductGridSectionProps) {
  const snapshotDemo = useSnapshotDemoContext();
  const style = resolveGridStyle(config.style as string | undefined);
  const itemCount = (config.itemCount as number) || 8;
  const sectionSpacingClassName = getSectionSpacingClassName(config.noVerticalMargin === true ? 'none' : normalizeSectionSpacing(config.spacing));
  const cardRadius = normalizeProductListCardRadius(config.cornerRadius ?? config.cardRadius, config.noBorderRadius);
  const cardRadiusClassName = getProductListCardRadiusClassName(cardRadius);
  const imageRadiusClassName = getProductListImageRadiusClassName(cardRadius);
  const desktopColumns: 3 | 4 | 5 | 6 = (config.desktopColumns === 3 || config.desktopColumns === 5 || config.desktopColumns === 6) ? config.desktopColumns : 4;
  // Responsive grid class based on desktopColumns
  const gridColsClass = desktopColumns === 3
    ? 'grid-cols-1 md:grid-cols-3 lg:grid-cols-3'
    : desktopColumns === 5
      ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'
      : desktopColumns === 6
        ? 'grid-cols-3 md:grid-cols-3 lg:grid-cols-6'
        : 'grid-cols-2 md:grid-cols-2 lg:grid-cols-4';
  const selectionMode = (config.selectionMode as 'auto' | 'manual' | 'demo') || 'auto';
  const selectedProductIds = React.useMemo(() => (config.selectedProductIds as string[]) || [], [config.selectedProductIds]);
  const demoProducts = React.useMemo(() => (config.demoProducts as Array<{ id: string; name: string; image?: string; price?: string; originalPrice?: string; description?: string; category?: string; tag?: string }>) || [], [config.demoProducts]);

  // Category tabs config
  const showCategoryTabs = config.showCategoryTabs !== false; // default true
  const categoryTabIds = React.useMemo(() => (config.categoryTabIds as string[]) || [], [config.categoryTabIds]);
  const [activeTabId, setActiveTabId] = React.useState<string | null>(null);

  // Header config
  const headerConfig = extractSectionHeaderConfig({
    ...config,
    badgeText: config.badgeText ?? config.subTitle ?? 'Bộ sưu tập',
    subtitle: config.subtitle ?? config.sectionTitle ?? title,
  });
  const displayTitle = title;

  const saleModeSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'saleMode' });
  const aspectRatioSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'defaultImageAspectRatio' });
  const routeModeSetting = useQuery(api.settings.getValue, { key: 'ia_route_mode', defaultValue: 'unified' });
  const categories = useQuery(api.productCategories.listActive);
  const saleMode = React.useMemo<'cart' | 'contact' | 'affiliate'>(() => {
    const value = saleModeSetting?.value;
    if (value === 'contact' || value === 'affiliate') return value;
    return 'cart';
  }, [saleModeSetting?.value]);
  const imageAspectRatio = React.useMemo(
    () => resolveProductImageAspectRatio(aspectRatioSetting?.value),
    [aspectRatioSetting?.value]
  );
  const imageAspectRatioStyle = React.useMemo(
    () => ({ aspectRatio: getProductImageAspectRatioCssValue(imageAspectRatio) }),
    [imageAspectRatio]
  );
  const snapshotData = React.useMemo(() => {
    if (!snapshotDemo || !snapshotComponentKey) return null;
    const data = snapshotDemo.getComponentData(snapshotComponentKey);
    return data?.kind === 'product-list' ? data : null;
  }, [snapshotDemo, snapshotComponentKey]);
  const routeMode = React.useMemo(
    () => normalizeRouteMode(snapshotData?.settings?.iaRouteMode ?? routeModeSetting),
    [routeModeSetting, snapshotData?.settings]
  );
  const categorySlugMap = React.useMemo(() => {
    if (snapshotData) {
      return new Map(snapshotData.categories.map((c) => [c.id, c.slug ?? '']));
    }
    if (!categories) return new Map<string, string>();
    return new Map(categories.map((c) => [c._id, c.slug]));
  }, [categories, snapshotData]);
  const categoryNameMap = React.useMemo(() => {
    if (!categories) return new Map<string, string>();
    return new Map(categories.map((c) => [c._id, c.name]));
  }, [categories]);
  const getProductDetailHref = React.useCallback((product?: { slug?: string | null; categoryId?: string }) => {
    if (!product?.slug) return '/products';
    return buildDetailPath({
      categorySlug: product.categoryId ? categorySlugMap.get(product.categoryId) : undefined,
      mode: routeMode,
      moduleKey: 'products',
      recordSlug: product.slug,
    });
  }, [categorySlugMap, routeMode]);
  const { frameConfig, watermarkConfig } = useProductImageOverlayConfigs(imageAspectRatio);

  // Query products
  const productsData = useQuery(
    api.products.listPublicResolved,
    selectionMode === 'demo' ? 'skip' : (selectionMode === 'auto' ? { limit: Math.min(itemCount, 20) } : { limit: 100 })
  );

  // Resolve products
  const allProducts = React.useMemo(() => {
    if (selectionMode === 'demo' && demoProducts.length > 0) {
      const parseDemoPrice = (s?: string) => {
        if (!s) return undefined;
        const n = Number.parseInt(s.replaceAll(/\D/g, ''));
        return Number.isFinite(n) ? n : undefined;
      };
      return demoProducts.map((item) => {
        const parsed = parseDemoPrice(item.price);
        const parsedOriginal = parseDemoPrice(item.originalPrice);
        const hasSale = parsedOriginal != null && parsed != null && parsedOriginal > parsed;
        return {
          _id: item.id,
          categoryId: item.category ?? '',
          categoryName: item.category ?? '',
          hasVariants: false,
          image: item.image,
          name: item.name,
          price: hasSale ? parsedOriginal : (parsed ?? 0),
          salePrice: hasSale ? parsed : undefined,
          slug: '',
          status: 'Active' as const,
        };
      });
    }
    if (snapshotData) {
      return snapshotData.items.slice(0, itemCount).map((item) => ({
        _id: item.id,
        categoryId: item.categoryId ?? '',
        categoryName: categoryNameMap.get(item.categoryId ?? '') ?? '',
        hasVariants: item.hasVariants,
        image: item.image,
        name: item.name,
        price: item.price ?? 0,
        salePrice: item.salePrice,
        slug: item.slug,
        status: 'Active' as const,
      }));
    }
    if (!productsData) return [];

    if (selectionMode === 'manual' && selectedProductIds.length > 0) {
      const productMap = new Map(productsData.map(p => [p._id, p]));
      return selectedProductIds
        .map(id => productMap.get(id as Id<"products">))
        .filter((p): p is NonNullable<typeof p> => p !== undefined && p.status === 'Active')
        .map(p => ({ ...p, categoryName: categoryNameMap.get(p.categoryId ?? '') ?? '' }));
    }

    return productsData
      .filter(p => p.status === 'Active')
      .slice(0, itemCount)
      .map(p => ({ ...p, categoryName: categoryNameMap.get(p.categoryId ?? '') ?? '' }));
  }, [productsData, selectionMode, selectedProductIds, itemCount, snapshotData, demoProducts, categoryNameMap]);

  // Category tabs to render
  const displayTabs = React.useMemo(() => {
    if (!showCategoryTabs) return [];
    // Demo mode: derive tabs from product categories
    if (selectionMode === 'demo') {
      const uniqueCats = [...new Set(demoProducts.map(p => p.category).filter(Boolean))] as string[];
      return uniqueCats.slice(0, 5).map(name => ({ id: name, name }));
    }
    // From config categoryTabIds
    if (categoryTabIds.length > 0 && categories) {
      return categoryTabIds
        .map(id => categories.find(c => c._id === id))
        .filter(Boolean)
        .slice(0, 5)
        .map(c => ({ id: c!._id, name: c!.name }));
    }
    // Fallback: show all active categories
    if (categories) {
      return categories.slice(0, 5).map(c => ({ id: c._id, name: c.name }));
    }
    return [];
  }, [showCategoryTabs, categoryTabIds, categories, selectionMode, demoProducts]);

  // Filter products by active tab
  const products = React.useMemo(() => {
    if (!activeTabId) return allProducts;
    // Demo mode: filter by category name
    if (selectionMode === 'demo') {
      return allProducts.filter(p => p.categoryName === activeTabId || p.categoryId === activeTabId);
    }
    // Normal: filter by categoryId
    return allProducts.filter(p => p.categoryId === activeTabId);
  }, [allProducts, activeTabId, selectionMode]);

  const showViewAll = allProducts.length >= 3;

  // Loading
  if (selectionMode !== 'demo' && !snapshotData && productsData === undefined) {
    return (
      <section className={cn(sectionSpacingClassName, 'px-4')}>
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </section>
    );
  }

  if (allProducts.length === 0) {
    return (
      <section className={cn(sectionSpacingClassName, 'px-4')}>
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 mb-4">{title}</h2>
          <p className="text-slate-500">Chưa có sản phẩm nào.</p>
        </div>
      </section>
    );
  }

  // Price helpers
  const isDemo = selectionMode === 'demo';
  const getPriceDisplay = (price?: number, salePrice?: number, isRangeFromVariant?: boolean) =>
    getPublicPriceLabel({ saleMode: isDemo ? 'cart' : saleMode, price, salePrice, isRangeFromVariant });
  const formatComparePrice = (price?: number) =>
    price ? getPublicPriceLabel({ saleMode: 'cart', price }).label : '';
  const getDiscount = (currentPrice?: number, comparePrice?: number, isContactPrice?: boolean) => {
    if (isContactPrice || !currentPrice || !comparePrice || comparePrice <= currentPrice) return null;
    return `-${Math.round(((comparePrice - currentPrice) / comparePrice) * 100)}%`;
  };

  // Category tabs (pill style — for non-minimal layouts)
  const renderCategoryTabs = () => {
    if (displayTabs.length === 0) return null;
    return (
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide mb-3 md:mb-4 -mx-1 px-1">
        {displayTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTabId(tab.id === activeTabId ? null : tab.id)}
            className="shrink-0 px-3.5 py-1 rounded-full text-xs md:text-sm font-semibold border transition-all whitespace-nowrap"
            style={
              activeTabId === tab.id
                ? { backgroundColor: brandColor, color: '#fff', borderColor: brandColor }
                : { backgroundColor: 'transparent', color: brandColor, borderColor: `${brandColor}40` }
            }
          >
            {tab.name}
          </button>
        ))}
      </div>
    );
  };

  // Header for E-commerce/minimal layout: header on top (full width), tabs below (right-aligned)
  const renderMinimalHeader = () => {
    return (
      <div className="mb-6 md:mb-10">
        {!headerConfig.hideHeader && (
          <SectionHeader title={displayTitle} brandColor={brandColor} {...headerConfig} className="mb-0" />
        )}
        {displayTabs.length > 0 && (
          <div className="flex justify-end gap-5 overflow-x-auto pb-1 scrollbar-hide mt-4">
            {displayTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id === activeTabId ? null : tab.id)}
                className="shrink-0 pb-1.5 text-sm font-semibold uppercase tracking-wide transition-all whitespace-nowrap border-b-2"
                style={
                  activeTabId === tab.id
                    ? { color: brandColor, borderColor: brandColor }
                    : { color: '#64748b', borderColor: 'transparent' }
                }
              >
                {tab.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Header
  const renderSiteHeader = () => {
    if (headerConfig.hideHeader) return null;
    return (
      <div className="mb-6 md:mb-10">
        <SectionHeader title={displayTitle} brandColor={brandColor} {...headerConfig} className="mb-0" />
        {showViewAll && (
          <div className="flex justify-end mt-2">
            <Link href="/products" className="flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80" style={{ color: brandColor }}>
              Xem tất cả <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    );
  };

  // Product card — reusable across layouts
  const renderProductCard = (product: typeof products[0], opts?: { size?: 'sm' | 'md' | 'lg'; showButton?: boolean }) => {
    const priceDisplay = getPriceDisplay(product.price, product.salePrice, product.hasVariants);
    const discount = getDiscount(product.price, priceDisplay.comparePrice, priceDisplay.isContactPrice);
    const size = opts?.size ?? 'md';

    return (
      <Link
        key={product._id}
        href={getProductDetailHref(product)}
        className={cn(`group cursor-pointer ${
          size === 'sm'
            ? 'bg-white rounded-lg border border-slate-100 p-2 hover:shadow-md hover:border-slate-200 transition-all'
            : size === 'lg'
              ? 'bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col'
              : 'group cursor-pointer'
        }`, size === 'sm' || size === 'lg' ? cardRadiusClassName : undefined)}
      >
        {/* Image */}
        <ProductImageWithOverlay
          frameConfig={frameConfig}
          watermarkConfig={watermarkConfig}
          className={cn(`relative overflow-hidden bg-slate-100 ${
            size === 'sm' ? 'rounded-md mb-2' : size === 'lg' ? '' : 'rounded-2xl mb-4 border border-transparent hover:border-slate-200 transition-all'
          }`, size === 'lg' ? undefined : imageRadiusClassName)}
          style={imageAspectRatioStyle}
        >
          {product.image ? (
            <Image
              mode="thumb"
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Package size={size === 'sm' ? 24 : 40} className="text-slate-300" />
            </div>
          )}
          {discount && (
            <div className={size === 'sm' ? 'absolute top-1 left-1 z-30' : 'absolute top-2 left-2 z-30'}>
              <SaleBadge text={discount} className={size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-1'} />
            </div>
          )}
          {/* Hover CTA for minimal */}
          {size === 'md' && (
            <div className="absolute inset-x-4 bottom-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-0 group-hover:opacity-100 z-30">
              <span className="block w-full bg-white/95 hover:bg-white backdrop-blur-md shadow-lg font-bold py-2 px-4 rounded-lg text-sm text-center" style={{ color: brandColor }}>
                Xem chi tiết
              </span>
            </div>
          )}
        </ProductImageWithOverlay>

        {/* Info */}
        <div className={size === 'lg' ? 'p-4 flex flex-col flex-1' : 'space-y-1'}>
          <h3 className={`font-${size === 'sm' ? 'medium' : 'bold'} text-slate-900 ${size === 'sm' ? 'text-xs' : 'text-base'} truncate group-hover:opacity-80 transition-colors`}>
            {product.name}
          </h3>
          <div className={`flex items-center gap-2 ${size === 'lg' ? 'mt-auto pt-2 mb-4' : 'mt-1'}`}>
            <span className={`font-bold ${size === 'sm' ? 'text-xs' : 'text-base'}`} style={{ color: brandColor }}>{priceDisplay.label}</span>
            {priceDisplay.comparePrice && (
              <span className={`text-slate-400 line-through ${size === 'sm' ? 'text-[10px]' : 'text-xs'}`}>
                {formatComparePrice(priceDisplay.comparePrice)}
              </span>
            )}
          </div>
          {/* Button for commerce/catalog */}
          {opts?.showButton && (
            <span
              className="w-full gap-1.5 border-2 py-1.5 px-4 rounded-lg font-medium flex items-center justify-center transition-colors hover:bg-opacity-10 whitespace-nowrap text-xs md:text-sm"
              style={{ borderColor: `${brandColor}30`, color: brandColor }}
            >
              Xem chi tiết <ArrowRight className="w-3 h-3 flex-shrink-0" />
            </span>
          )}
        </div>
      </Link>
    );
  };

  const renderEmptyCategoryState = () => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
      <Package size={40} className="mx-auto mb-3 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">Danh mục này chưa có sản phẩm.</p>
    </div>
  );

  // ── Layout Renders ──

  const renderMinimalGrid = () => (
    <>
      <div className={`grid ${desktopColumns === 3 ? 'grid-cols-1 md:grid-cols-3' : desktopColumns === 5 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : desktopColumns === 6 ? 'grid-cols-3 md:grid-cols-6' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'} gap-3 md:gap-4 lg:gap-5`}>
        {products.slice(0, itemCount).map(p => renderProductCard(p, { size: 'lg', showButton: true }))}
      </div>

      {/* "Xem thêm" button — dark bg */}
      {showViewAll && (
        <div className="flex justify-center mt-8">
          <Link
            href="/products"
            className="px-8 py-2.5 rounded-full text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            Xem thêm
          </Link>
        </div>
      )}
    </>
  );

  const renderCommerceGrid = () => (
    <div className={`grid ${gridColsClass} gap-4 md:gap-6`}>
      {products.slice(0, itemCount).map(p => renderProductCard(p, { size: 'lg', showButton: true }))}
    </div>
  );

  const renderCompactGrid = () => (
    <div className={`grid ${gridColsClass} gap-3`}>
      {products.slice(0, itemCount).map(p => renderProductCard(p, { size: 'sm' }))}
    </div>
  );

  const renderMagazineGrid = () => {
    // Magazine: editorial overlay cards — image fills card, gradient + text overlay
    return (
      <div className={`grid ${gridColsClass} gap-4 md:gap-5`}>
        {products.slice(0, itemCount).map(p => {
          const pd = getPriceDisplay(p.price, p.salePrice, p.hasVariants);
          const d = getDiscount(p.price, pd.comparePrice, pd.isContactPrice);
          return (
            <ProductImageWithOverlay
              key={p._id}
              frameConfig={frameConfig}
              watermarkConfig={watermarkConfig}
              className={cn('group relative rounded-2xl overflow-hidden cursor-pointer', cardRadiusClassName)}
              style={{ ...imageAspectRatioStyle }}
            >
              <Link
                href={getProductDetailHref(p)}
                className="absolute inset-0 block w-full h-full"
              >
                {p.image ? (
                  <Image mode="thumb" src={p.image} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-100"><Package size={40} className="text-slate-300" /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent z-30" />
                {d && (
                  <div className="absolute top-2 left-2 z-30"><SaleBadge text={d} className="text-[10px] px-2 py-0.5" /></div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 z-30">
                  <h3 className="text-sm md:text-base font-bold text-white truncate mb-1">{p.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{pd.label}</span>
                    {pd.comparePrice && <span className="text-[10px] text-white/60 line-through">{formatComparePrice(pd.comparePrice)}</span>}
                  </div>
                </div>
              </Link>
            </ProductImageWithOverlay>
          );
        })}
      </div>
    );
  };

  const renderCatalogGrid = () => (
    <div className={`grid ${gridColsClass} gap-4 md:gap-6`}>
      {products.slice(0, itemCount).map(p => renderProductCard(p, { size: 'lg', showButton: true }))}
    </div>
  );

  const renderMosaicGrid = () => {
    // Mosaic: padded cards with hover arrow icon
    return (
      <div className={`grid ${gridColsClass} gap-3 md:gap-4`}>
        {products.slice(0, itemCount).map(p => {
          const pd = getPriceDisplay(p.price, p.salePrice, p.hasVariants);
          const d = getDiscount(p.price, pd.comparePrice, pd.isContactPrice);
          return (
            <Link
              key={p._id}
              href={getProductDetailHref(p)}
              className={cn('bg-white border border-slate-200 rounded-2xl p-3 flex flex-col group hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer overflow-hidden', cardRadiusClassName)}
            >
              <ProductImageWithOverlay
                frameConfig={frameConfig}
                watermarkConfig={watermarkConfig}
                className={cn('relative w-full rounded-xl overflow-hidden mb-3', imageRadiusClassName)}
                style={{ ...imageAspectRatioStyle, backgroundColor: `${secondary}08` }}
              >
                {p.image ? (
                  <Image mode="thumb" src={p.image} alt={p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center"><Package size={32} className="text-slate-300" /></div>
                )}
                {d && <div className="absolute top-2 left-2 z-30"><SaleBadge text={d} className="text-[10px] px-1.5 py-0.5" /></div>}
                <div className="absolute bottom-2 right-2 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-30">
                  <div className="text-white p-2 rounded-full shadow-lg" style={{ backgroundColor: brandColor }}><ArrowRight size={16} /></div>
                </div>
              </ProductImageWithOverlay>
              <div className="mt-auto px-1">
                <h4 className="font-medium text-sm text-slate-900 truncate group-hover:opacity-80 transition-colors">{p.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold" style={{ color: brandColor }}>{pd.label}</span>
                  {pd.comparePrice && <span className="text-[10px] text-slate-400 line-through">{formatComparePrice(pd.comparePrice)}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  const getTextOnBrand = (hex: string) => {
    const h = hex.replace('#', '');
    const r = Number.parseInt(h.slice(0, 2), 16) / 255;
    const g = Number.parseInt(h.slice(2, 4), 16) / 255;
    const b = Number.parseInt(h.slice(4, 6), 16) / 255;
    const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return (0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)) > 0.4 ? '#1e293b' : '#ffffff';
  };
  const textOnBrand = getTextOnBrand(brandColor);
  const brandTabStyle = {
    backgroundColor: '#ffffff',
    color: '#020617',
  };
  const brandTabActiveShadow = '0 0 0 2px rgba(255,255,255,0.65)';

  // Style 7: Tabbed — full-section with brand bg, category tabs, grid cards
  const renderTabbedSection = () => {
    return (
      <section
        className={cn(sectionSpacingClassName, 'px-4 md:px-6')}
        style={{ backgroundColor: brandColor }}
      >
        <div className="max-w-7xl mx-auto">
          <SectionHeader title={displayTitle} brandColor={brandColor} {...headerConfig} className="mb-6" />

          {/* Category tabs */}
          {displayTabs.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {displayTabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id === activeTabId ? null : tab.id)}
                  className="px-4 py-2 rounded-md text-sm font-bold transition-colors hover:opacity-90 whitespace-nowrap"
                  style={{
                    ...brandTabStyle,
                    boxShadow: activeTabId === tab.id ? brandTabActiveShadow : undefined,
                  }}
                >
                  {tab.name}
                </button>
              ))}
            </div>
          )}

          {/* Product grid — same card style as Catalog */}
          {products.length === 0 ? renderEmptyCategoryState() : (
            <div className={`grid ${gridColsClass} gap-3 md:gap-4`}>
              {products.slice(0, itemCount).map(p => renderProductCard(p, { size: 'lg', showButton: true }))}
            </div>
          )}

          {/* View all */}
          {showViewAll && products.length > 0 && (
            <div className="flex justify-center mt-8">
              <Link
                href="/products"
                className="px-10 py-3 rounded-full text-sm font-bold bg-white text-slate-900 hover:bg-slate-50 transition-colors shadow-md"
              >
                Xem tất cả
              </Link>
            </div>
          )}
        </div>
      </section>
    );
  };

  // Tabbed style has its own full section (brand bg), so return early
  if (style === 'tabbed') {
    return renderTabbedSection();
  }

  // Style 8: Storefront — brand header bar + black category buttons
  const renderStorefrontSection = () => {
    return (
      <section className={cn(sectionSpacingClassName, 'px-4 md:px-6')}>
        <div className="max-w-7xl mx-auto">
          <SectionHeader title={displayTitle} brandColor={brandColor} {...headerConfig} className="mb-6" />

          {/* Header bar */}
          <div
            className="flex items-center gap-3 px-4 md:px-6 py-3 overflow-x-auto rounded-t-lg"
            style={{ backgroundColor: brandColor }}
          >
            <span className="font-bold text-sm whitespace-nowrap" style={{ color: textOnBrand }}>Chọn danh mục</span>
            {displayTabs.length > 0 && (
              <>
                {displayTabs.map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTabId(tab.id === activeTabId ? null : tab.id)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors hover:opacity-90"
                    style={{
                      ...brandTabStyle,
                      boxShadow: activeTabId === tab.id ? brandTabActiveShadow : undefined,
                    }}
                  >
                    {tab.name}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Product grid — same card style as Catalog */}
          <div className="py-8">
          {products.length === 0 ? renderEmptyCategoryState() : (
            <div className={`grid ${gridColsClass} gap-4 md:gap-6`}>
              {products.slice(0, itemCount).map(p => renderProductCard(p, { size: 'lg', showButton: true }))}
            </div>
          )}

          {/* View more */}
          {showViewAll && products.length > 0 && (
            <div className="flex justify-center mt-8">
              <Link
                href="/products"
                className="px-10 py-3 rounded-full text-sm font-bold border-2 transition-colors hover:bg-opacity-10"
                style={{ borderColor: brandColor, color: brandColor }}
              >
                Xem thêm sản phẩm
              </Link>
            </div>
          )}
        </div>
        </div>
      </section>
    );
  };

  if (style === 'storefront') {
    return renderStorefrontSection();
  }

  const renderGrid = () => {
    if (products.length === 0) return renderEmptyCategoryState();

    switch (style) {
      case 'minimal': return renderMinimalGrid();
      case 'commerce': return renderCommerceGrid();
      case 'compact': return renderCompactGrid();
      case 'magazine': return renderMagazineGrid();
      case 'catalog': return renderCatalogGrid();
      case 'mosaic': return renderMosaicGrid();
      default: return renderCommerceGrid();
    }
  };

  return (
    <section className={cn(sectionSpacingClassName, 'px-4 md:px-6')}>
      <div className="max-w-7xl mx-auto">
        {style === 'minimal' ? renderMinimalHeader() : (
          <>
            {renderSiteHeader()}
            {renderCategoryTabs()}
          </>
        )}
        {renderGrid()}
      </div>
    </section>
  );
}
