'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { ArrowRight, Package } from 'lucide-react';
import { api } from '@/convex/_generated/api';
import { cn } from '../../../components/ui';
import type { SectionSpacing } from '../../_shared/types/sectionSpacing';
import { DEFAULT_SECTION_SPACING, getSectionSpacingClassName, normalizeSectionSpacing } from '../../_shared/types/sectionSpacing';
import { getProductListCardRadiusClassName, normalizeProductListCardRadius, type ProductListCardRadius, type ProductListPreviewItem, type ProductListStyle } from '../../product-list/_types';
import { ProductListPreview } from '../../product-list/_components/ProductListPreview';
import type { ProductGridStyle } from '../_types';
import { PRODUCT_GRID_STYLES } from '../_lib/constants';
import type { CategoryTabItem } from './ProductGridForm';
import { BrowserFrame } from '../../_shared/components/BrowserFrame';
import { ColorInfoPanel } from '../../_shared/components/ColorInfoPanel';
import { PreviewImage } from '../../_shared/components/PreviewImage';
import { PreviewWrapper } from '../../_shared/components/PreviewWrapper';
import { SectionHeader } from '../../_shared/components/SectionHeader';
import { deviceWidths, usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import { SaleBadge } from '@/components/site/shared/BrandColorHelpers';
import { getProductImageAspectRatioCssValue, resolveProductImageAspectRatio } from '@/lib/products/image-aspect-ratio';

export const ProductGridPreview = ({
  brandColor,
  secondary,
  itemCount,
  selectedStyle,
  onStyleChange,
  items,
  subTitle,
  sectionTitle,
  subtitle,
  fontStyle,
  fontClassName,
  categoryTabs,
  desktopColumns = 4,
  // Header config pass-through
  hideHeader,
  showTitle,
  showSubtitle,
  headerAlign,
  titleColorPrimary,
  subtitleAboveTitle,
  uppercaseText,
  showBadge,
  spacing = DEFAULT_SECTION_SPACING,
  cornerRadius,
}: {
  brandColor: string;
  secondary: string;
  itemCount: number;
  selectedStyle?: ProductGridStyle;
  onStyleChange?: (style: ProductGridStyle) => void;
  items?: ProductListPreviewItem[];
  subTitle?: string;
  sectionTitle?: string;
  subtitle?: string;
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
  categoryTabs?: CategoryTabItem[];
  desktopColumns?: 3 | 4 | 5 | 6;
  // Header config
  hideHeader?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  headerAlign?: 'left' | 'center' | 'right';
  titleColorPrimary?: boolean;
  subtitleAboveTitle?: boolean;
  uppercaseText?: boolean;
  showBadge?: boolean;
  spacing?: SectionSpacing;
  cornerRadius?: ProductListCardRadius;
}) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const { device, setDevice } = usePreviewDevice();
  const aspectRatioSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'defaultImageAspectRatio' });
  const visibleCategoryTabs = categoryTabs ?? [];
  const hasTabs = visibleCategoryTabs.length > 0;
  const isMinimalStyle = (selectedStyle ?? 'commerce') === 'minimal';
  const previewStyle = selectedStyle ?? 'commerce';
  const sectionSpacingClassName = getSectionSpacingClassName(normalizeSectionSpacing(spacing));
  const cardRadiusClassName = getProductListCardRadiusClassName(normalizeProductListCardRadius(cornerRadius));
  const imageAspectRatio = useMemo(
    () => resolveProductImageAspectRatio(aspectRatioSetting?.value),
    [aspectRatioSetting?.value]
  );
  const imageAspectRatioStyle = useMemo(
    () => ({ aspectRatio: getProductImageAspectRatioCssValue(imageAspectRatio) }),
    [imageAspectRatio]
  );

  // Filter items by active tab (match by category name or _id)
  const filteredItems = useMemo(() => {
    if (!items || !activeTab) return items;
    return items.filter(item => item.category === activeTab);
  }, [items, activeTab]);

  const fallbackItems: ProductListPreviewItem[] = [
    { category: 'Smartphone', id: 1, image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop&q=80', name: 'iPhone 15 Pro Max', originalPrice: '36.990.000đ', price: '34.990.000đ' },
    { category: 'Laptop', id: 2, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=500&h=500&fit=crop&q=80', name: 'MacBook Pro M3', price: '45.990.000đ' },
    { category: 'Audio', id: 3, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&h=500&fit=crop&q=80', name: 'Sony WH-1000XM5', originalPrice: '9.290.000đ', price: '8.490.000đ' },
    { category: 'Wearable', id: 4, image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&h=500&fit=crop&q=80', name: 'Apple Watch Ultra 2', price: '21.990.000đ' },
    { category: 'Tablet', id: 5, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&h=500&fit=crop&q=80', name: 'iPad Air 5 M1', originalPrice: '16.500.000đ', price: '14.990.000đ' },
    { category: 'Audio', id: 6, image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&h=500&fit=crop&q=80', name: 'Marshall Stanmore III', price: '9.890.000đ' },
    { category: 'Accessories', id: 7, image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&h=500&fit=crop&q=80', name: 'Logitech MX Master 3S', price: '2.490.000đ' },
    { category: 'Camera', id: 8, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&h=500&fit=crop&q=80', name: 'Fujifilm X-T5', originalPrice: '45.000.000đ', price: '42.990.000đ' },
  ];

  const displayItems = filteredItems ?? fallbackItems.slice(0, Math.max(itemCount, 8));
  const selectedCategoryEmpty = activeTab !== null && filteredItems?.length === 0;

  const getDiscount = (price?: string, originalPrice?: string) => {
    if (!price || !originalPrice) return null;
    const parsedPrice = Number.parseInt(price.replaceAll(/\D/g, ''));
    const parsedOriginal = Number.parseInt(originalPrice.replaceAll(/\D/g, ''));
    if (!Number.isFinite(parsedPrice) || !Number.isFinite(parsedOriginal) || parsedOriginal <= parsedPrice) return null;
    return `-${Math.round(((parsedOriginal - parsedPrice) / parsedOriginal) * 100)}%`;
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

  const renderEmptyCategoryState = () => (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <Package size={36} className="mx-auto mb-3 text-slate-300" />
      <p className="text-sm font-medium text-slate-500">Danh mục này chưa có sản phẩm.</p>
    </div>
  );

  const renderPreviewHeader = (className = 'mb-6') => (
    <SectionHeader
      title={sectionTitle ?? 'Sản phẩm nổi bật'}
      subtitle={subtitle ?? ''}
      badgeText={subTitle}
      hideHeader={hideHeader}
      showTitle={showTitle}
      showSubtitle={showSubtitle}
      showBadge={showBadge}
      headerAlign={headerAlign}
      titleColorPrimary={titleColorPrimary}
      subtitleAboveTitle={subtitleAboveTitle}
      uppercaseText={uppercaseText}
      brandColor={brandColor}
      className={className}
    />
  );

  const gridColsClass = device === 'mobile'
    ? (desktopColumns === 6 ? 'grid-cols-3' : 'grid-cols-2')
    : device === 'tablet'
      ? (desktopColumns === 3 ? 'grid-cols-3' : desktopColumns === 6 ? 'grid-cols-3' : 'grid-cols-2')
      : desktopColumns === 3
        ? 'grid-cols-3'
        : desktopColumns === 5
          ? 'grid-cols-5'
          : desktopColumns === 6
            ? 'grid-cols-6'
            : 'grid-cols-4';


  const renderStorefrontStyle = () => {
    if (previewStyle === 'tabbed') {
      return (
        <>
          <PreviewWrapper
            title="Preview Sản phẩm"
            device={device}
            setDevice={setDevice}
            previewStyle={previewStyle}
            setPreviewStyle={(style) => onStyleChange?.(style as ProductGridStyle)}
            styles={PRODUCT_GRID_STYLES as { id: string; label: string }[]}
            deviceWidthClass={deviceWidths[device]}
            fontStyle={fontStyle}
            fontClassName={fontClassName}
          >
            <BrowserFrame url="yoursite.com/products">
              <section
                className={cn(sectionSpacingClassName, 'px-4 md:px-6')}
                style={{ backgroundColor: brandColor }}
              >
                <div className="max-w-7xl mx-auto">
                  {renderPreviewHeader('mb-6')}

                  {hasTabs && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {visibleCategoryTabs.slice(0, 5).map(tab => (
                        <button
                          key={tab._id}
                          type="button"
                          onClick={() => setActiveTab(tab._id === activeTab ? null : tab._id)}
                          className="px-4 py-2 rounded-md text-sm font-bold transition-colors hover:opacity-90 whitespace-nowrap"
                          style={{
                            ...brandTabStyle,
                            boxShadow: activeTab === tab._id ? brandTabActiveShadow : undefined,
                          }}
                        >
                          {tab.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedCategoryEmpty ? renderEmptyCategoryState() : (
                    <div className={`grid ${gridColsClass} gap-3 md:gap-4`}>
                      {displayItems.slice(0, itemCount).map((item) => {
                    const discount = getDiscount(item.price, item.originalPrice);
                    return (
                      <div
                        key={item.id}
                        className={cn('group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col cursor-pointer', cardRadiusClassName)}
                      >
                        <div className="relative overflow-hidden bg-slate-100" style={imageAspectRatioStyle}>
                          {item.image ? (
                            <PreviewImage
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package size={40} className="text-slate-300" />
                            </div>
                          )}
                          {discount && (
                            <div className="absolute top-2 left-2">
                              <SaleBadge text={discount} className="text-[10px] px-2 py-1" />
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-bold text-slate-900 text-base truncate group-hover:opacity-80 transition-colors">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-auto pt-2 mb-4">
                            <span className="font-bold text-base" style={{ color: brandColor }}>{item.price}</span>
                            {item.originalPrice && (
                              <span className="text-xs text-slate-400 line-through">
                                {item.originalPrice}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="w-full gap-1.5 border-2 py-1.5 px-4 rounded-lg font-medium flex items-center justify-center transition-colors hover:bg-opacity-10 whitespace-nowrap text-xs md:text-sm"
                            style={{ borderColor: `${brandColor}30`, color: brandColor }}
                          >
                            Xem chi tiết <ArrowRight className="w-3 h-3 flex-shrink-0" />
                          </button>
                        </div>
                      </div>
                    );
                      })}
                    </div>
                  )}

                  {displayItems.length >= 3 && (
                    <div className="flex justify-center mt-8">
                      <button
                        type="button"
                        className="px-10 py-3 rounded-full text-sm font-bold bg-white text-slate-900 hover:bg-slate-50 transition-colors shadow-md"
                      >
                        Xem tất cả
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </BrowserFrame>
          </PreviewWrapper>
          <ColorInfoPanel brandColor={brandColor} secondary={secondary} />
        </>
      );
    }

    return (
    <>
      <PreviewWrapper
        title="Preview Sản phẩm"
        device={device}
        setDevice={setDevice}
        previewStyle={previewStyle}
        setPreviewStyle={(style) => onStyleChange?.(style as ProductGridStyle)}
        styles={PRODUCT_GRID_STYLES as { id: string; label: string }[]}
        deviceWidthClass={deviceWidths[device]}
        fontStyle={fontStyle}
        fontClassName={fontClassName}
      >
        <BrowserFrame url="yoursite.com/products">
          <section className={cn(sectionSpacingClassName, 'px-4 md:px-6')}>
            <div className="max-w-7xl mx-auto">
              {renderPreviewHeader('mb-6')}

              <div
                className="flex items-center gap-3 px-4 md:px-6 py-3 overflow-x-auto rounded-t-lg"
                style={{ backgroundColor: brandColor }}
              >
                <span className="font-bold text-sm whitespace-nowrap" style={{ color: textOnBrand }}>Chọn danh mục</span>
                {hasTabs && (
                  <>
                    {visibleCategoryTabs.slice(0, 5).map(tab => (
                      <button
                        key={tab._id}
                        type="button"
                        onClick={() => setActiveTab(tab._id === activeTab ? null : tab._id)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors hover:opacity-90"
                        style={{
                          ...brandTabStyle,
                          boxShadow: activeTab === tab._id ? brandTabActiveShadow : undefined,
                        }}
                      >
                        {tab.name}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="py-8">
                {selectedCategoryEmpty ? renderEmptyCategoryState() : (
                  <div className={`grid ${gridColsClass} gap-4 md:gap-6`}>
                    {displayItems.slice(0, itemCount).map((item) => {
                    const discount = getDiscount(item.price, item.originalPrice);
                    return (
                      <div
                        key={item.id}
                        className={cn('group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 flex flex-col cursor-pointer', cardRadiusClassName)}
                      >
                        <div className="relative overflow-hidden bg-slate-100" style={imageAspectRatioStyle}>
                          {item.image ? (
                            <PreviewImage
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package size={40} className="text-slate-300" />
                            </div>
                          )}
                          {discount && (
                            <div className="absolute top-2 left-2">
                              <SaleBadge text={discount} className="text-[10px] px-2 py-1" />
                            </div>
                          )}
                        </div>

                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-bold text-slate-900 text-base truncate group-hover:opacity-80 transition-colors">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-auto pt-2 mb-4">
                            <span className="font-bold text-base" style={{ color: brandColor }}>{item.price}</span>
                            {item.originalPrice && (
                              <span className="text-xs text-slate-400 line-through">
                                {item.originalPrice}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="w-full gap-1.5 border-2 py-1.5 px-4 rounded-lg font-medium flex items-center justify-center transition-colors hover:bg-opacity-10 whitespace-nowrap text-xs md:text-sm"
                            style={{ borderColor: `${brandColor}30`, color: brandColor }}
                          >
                            Xem chi tiết <ArrowRight className="w-3 h-3 flex-shrink-0" />
                          </button>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                )}

                {displayItems.length >= 3 && (
                  <div className="flex justify-center mt-8">
                    <button
                      type="button"
                      className="px-10 py-3 rounded-full text-sm font-bold border-2 transition-colors hover:bg-opacity-10"
                      style={{ borderColor: brandColor, color: brandColor }}
                    >
                      Xem thêm sản phẩm
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>
        </BrowserFrame>
      </PreviewWrapper>
      <ColorInfoPanel brandColor={brandColor} secondary={secondary} />
    </>
    );
  };

  if (previewStyle === 'tabbed' || previewStyle === 'storefront') {
    return renderStorefrontStyle();
  }

  // Pill tabs — for non-minimal layouts
  const pillTabsSlot = hasTabs ? (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide mb-3 md:mb-4 -mx-1 px-1">
      {visibleCategoryTabs.map(tab => (
        <button
          key={tab._id}
          type="button"
          onClick={() => setActiveTab(tab._id === activeTab ? null : tab._id)}
          className="shrink-0 px-3.5 py-1 rounded-full text-xs md:text-sm font-semibold border transition-all whitespace-nowrap"
          style={
            activeTab === tab._id
              ? { backgroundColor: brandColor, color: '#fff', borderColor: brandColor }
              : { backgroundColor: 'transparent', color: brandColor, borderColor: `${brandColor}40` }
          }
        >
          {tab.name}
        </button>
      ))}
    </div>
  ) : undefined;

  // Text+underline tabs — for minimal/E-commerce (inline with header right)
  const minimalTabsSlot = hasTabs ? (
    <div className="flex gap-5 overflow-x-auto pb-1 scrollbar-hide shrink-0">
      {visibleCategoryTabs.map(tab => (
        <button
          key={tab._id}
          type="button"
          onClick={() => setActiveTab(tab._id === activeTab ? null : tab._id)}
          className="shrink-0 pb-1.5 text-sm font-semibold uppercase tracking-wide transition-all whitespace-nowrap border-b-2"
          style={
            activeTab === tab._id
              ? { color: brandColor, borderColor: brandColor }
              : { color: '#64748b', borderColor: 'transparent' }
          }
        >
          {tab.name}
        </button>
      ))}
    </div>
  ) : undefined;

  return (
    <ProductListPreview
      brandColor={brandColor}
      secondary={secondary}
      itemCount={itemCount}
      componentType="ProductGrid"
      selectedStyle={(selectedStyle ?? 'commerce') as ProductListStyle}
      onStyleChange={(s) => {
        onStyleChange?.(s as ProductGridStyle);
      }}
      styles={PRODUCT_GRID_STYLES as { id: string; label: string }[]}
      items={filteredItems}
      subTitle={subTitle}
      sectionTitle={sectionTitle}
      subtitle={subtitle}
      fontStyle={fontStyle}
      fontClassName={fontClassName}
      hideHeader={hideHeader}
      showTitle={showTitle}
      showSubtitle={showSubtitle}
      headerAlign={headerAlign}
      titleColorPrimary={titleColorPrimary}
      subtitleAboveTitle={subtitleAboveTitle}
      uppercaseText={uppercaseText}
      showBadge={showBadge}
      categoryTabsSlot={isMinimalStyle ? undefined : pillTabsSlot}
      headerRightSlot={isMinimalStyle ? minimalTabsSlot : undefined}
      forceEmpty={selectedCategoryEmpty}
      emptyMessage="Danh mục này chưa có sản phẩm."
      spacing={spacing}
      cardRadius={cornerRadius}
    />
  );
};
