'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useQuery } from 'convex/react';
import { ArrowRight, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { api } from '@/convex/_generated/api';
import { BrandBadge, SaleBadge } from '@/components/site/shared/BrandColorHelpers';
import { cn } from '../../../components/ui';
import { BrowserFrame } from '../../_shared/components/BrowserFrame';
import { ColorInfoPanel } from '../../_shared/components/ColorInfoPanel';
import { PreviewImage } from '../../_shared/components/PreviewImage';
import { PreviewWrapper } from '../../_shared/components/PreviewWrapper';
import { SectionHeader } from '../../_shared/components/SectionHeader';
import { deviceWidths, usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import { DEFAULT_SECTION_SPACING, getSectionSpacingClassName, type SectionSpacing } from '../../_shared/types/sectionSpacing';
import { PRODUCT_LIST_LOOKBOOK_BANNERS, PRODUCT_LIST_STYLES } from '../_lib/constants';
import { getProductListCardRadiusClassName, getProductListImageRadiusClassName, normalizeProductListCardRadius, type ProductListCardRadius, type ProductListPreviewItem, type ProductListStyle } from '../_types';
import { getProductImageAspectRatioCssValue, resolveProductImageAspectRatio } from '@/lib/products/image-aspect-ratio';

// Embla Carousel sub-component — tách riêng vì cần hooks
function CarouselPreviewInner({
  displayItems,
  device,
  brandColor,
  secondary,
  subTitle,
  displayTitle,
  displaySubtitle,
  imageAspectRatioStyle,
  getDiscount,
  effectiveShowBadge = true,
  effectiveShowTitle = true,
  effectiveShowSubtitle = true,
  effectiveHideHeader = false,
  titleStyle,
  uppercaseText = false,
  headerAlign = 'left' as const,
  subtitleAboveTitle = false,
  cardRadiusClassName,
}: {
  displayItems: ProductListPreviewItem[];
  device: 'desktop' | 'tablet' | 'mobile';
  brandColor: string;
  secondary: string;
  subTitle: string;
  displayTitle: string;
  displaySubtitle: string;
  imageAspectRatioStyle: React.CSSProperties;
  getDiscount: (price?: string, originalPrice?: string) => string | null;
  effectiveShowBadge?: boolean;
  effectiveShowTitle?: boolean;
  effectiveShowSubtitle?: boolean;
  effectiveHideHeader?: boolean;
  titleStyle?: React.CSSProperties;
  uppercaseText?: boolean;
  headerAlign?: 'left' | 'center' | 'right';
  subtitleAboveTitle?: boolean;
  cardRadiusClassName: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    loop: false,
    slidesToScroll: 1,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // Re-init khi device thay đổi (container size thay đổi)
  useEffect(() => {
    if (emblaApi) {
      // small delay to let CSS resize settle
      const t = setTimeout(() => emblaApi.reInit(), 50);
      return () => clearTimeout(t);
    }
  }, [device, emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((idx: number) => emblaApi?.scrollTo(idx), [emblaApi]);

  const slideWidth = device === 'mobile' ? '55%' : device === 'tablet' ? '38%' : '30%';
  const slideGap = device === 'mobile' ? '0.75rem' : '1.25rem';

  return (
    <section className={cn("py-8 md:py-10", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}>
      {!effectiveHideHeader && (
      <div className="mb-3 md:mb-4">
        <SectionHeader
          title={displayTitle}
          subtitle={displaySubtitle}
          badgeText={subTitle}
          hideHeader={effectiveHideHeader}
          showTitle={effectiveShowTitle}
          showSubtitle={effectiveShowSubtitle}
          showBadge={effectiveShowBadge}
          headerAlign={headerAlign}
          titleColorPrimary={!!titleStyle}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          brandColor={brandColor}
          className="mb-0"
        />
        {(canScrollPrev || canScrollNext) && (
        <div className="flex justify-end items-center gap-2 mt-2">
          <button type="button" disabled={!canScrollPrev} onClick={scrollPrev}
            className={cn("w-8 h-8 md:w-10 md:h-10 rounded-full border flex items-center justify-center transition-colors",
              canScrollPrev ? "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" : "border-slate-100 dark:border-slate-800 opacity-40 cursor-not-allowed"
            )}>
            <ChevronLeft size={16} className="md:hidden" style={{ color: canScrollPrev ? brandColor : undefined }} />
            <ChevronLeft size={18} className="hidden md:block" style={{ color: canScrollPrev ? brandColor : undefined }} />
          </button>
          <button type="button" disabled={!canScrollNext} onClick={scrollNext}
            className={cn("w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors",
              canScrollNext ? "text-white" : "opacity-40 cursor-not-allowed border border-slate-100 dark:border-slate-800"
            )}
            style={canScrollNext ? { backgroundColor: brandColor } : undefined}>
            <ChevronRight size={16} className="md:hidden" />
            <ChevronRight size={18} className="hidden md:block" />
          </button>
        </div>
        )}
      </div>
      )}

      {/* Embla viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex" style={{ gap: slideGap }}>
          {displayItems.map((item) => {
            const discount = getDiscount(item.price, item.originalPrice);
            return (
              <div
                key={item.id}
                className="flex-shrink-0 group cursor-pointer min-w-0"
                style={{ flex: `0 0 ${slideWidth}` }}
              >
                <div
                  className={cn("relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 mb-3 border border-transparent transition-all", cardRadiusClassName)}
                  onMouseEnter={(event) => { event.currentTarget.style.borderColor = `${secondary}20`; }}
                  onMouseLeave={(event) => { event.currentTarget.style.borderColor = 'transparent'; }}
                  style={imageAspectRatioStyle}
                >
                  {item.image ? (
                    <PreviewImage src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><Package size={40} className="text-slate-300" /></div>
                  )}
                  {discount && (
                    <div className="absolute top-2 left-2">
                      <SaleBadge text={discount} className="text-[10px] px-2 py-1" />
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-slate-900 dark:text-slate-100 text-sm line-clamp-2 group-hover:opacity-80 transition-colors">{item.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-sm" style={{ color: brandColor }}>{item.price}</span>
                  {item.originalPrice && <span className="text-xs text-slate-400 line-through">{item.originalPrice}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dot indicators */}
      {scrollSnaps.length > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {scrollSnaps.map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => scrollTo(i)}
              className={cn("h-2 rounded-full transition-all", i === selectedIndex ? "w-6" : "w-2 bg-slate-200 dark:bg-slate-700")}
              style={i === selectedIndex ? { backgroundColor: brandColor } : {}}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function WineCarouselPreviewInner({
  displayItems,
  device,
  brandColor,
  header,
  itemCount,
  getDiscount,
  cardRadiusClassName,
}: {
  displayItems: ProductListPreviewItem[];
  device: 'desktop' | 'tablet' | 'mobile';
  brandColor: string;
  header: React.ReactNode;
  itemCount: number;
  getDiscount: (price?: string, originalPrice?: string) => string | null;
  cardRadiusClassName: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: false,
    loop: false,
    slidesToScroll: 1,
  });
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    if (!emblaApi) {return;}
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) {return;}
    emblaApi.on('select', updateScrollState);
    emblaApi.on('reInit', updateScrollState);
    updateScrollState();
    return () => {
      emblaApi.off('select', updateScrollState);
      emblaApi.off('reInit', updateScrollState);
    };
  }, [emblaApi, updateScrollState]);

  useEffect(() => {
    if (!emblaApi) {return;}
    const timeout = setTimeout(() => emblaApi.reInit(), 50);
    return () => clearTimeout(timeout);
  }, [device, emblaApi, displayItems.length]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className={cn('bg-white py-8 md:py-10', device === 'mobile' ? 'px-3' : 'px-4 md:px-6')} style={{ fontFamily: 'var(--font-roboto), Roboto, sans-serif' }}>
      {header}
      <div className="mb-2 flex justify-end gap-2">
        <button
          type="button"
          aria-label="Cuộn trước"
          disabled={!canScrollPrev}
          onClick={scrollPrev}
          className={cn('flex h-8 w-8 items-center justify-center rounded-full border transition-colors md:h-9 md:w-9', canScrollPrev ? 'border-stone-200 hover:bg-stone-50' : 'cursor-not-allowed border-stone-100 opacity-40')}
          style={canScrollPrev ? { color: brandColor } : undefined}
        >
          <ChevronLeft size={17} />
        </button>
        <button
          type="button"
          aria-label="Cuộn sau"
          disabled={!canScrollNext}
          onClick={scrollNext}
          className={cn('flex h-8 w-8 items-center justify-center rounded-full transition-colors md:h-9 md:w-9', canScrollNext ? 'text-white' : 'cursor-not-allowed border border-stone-100 opacity-40')}
          style={canScrollNext ? { backgroundColor: brandColor } : undefined}
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3 md:gap-4">
          {displayItems.slice(0, Math.max(itemCount, 8)).map((item) => {
            const discount = getDiscount(item.price, item.originalPrice);
            return (
              <div
                key={item.id}
                className={cn(
                  'min-w-0 flex-[0_0_auto]',
                  device === 'mobile' ? 'w-[140px]' : device === 'tablet' ? 'w-[180px]' : 'w-[calc((100%-4rem)/5)] min-w-[180px]',
                )}
              >
                <div className={cn("group relative flex h-full flex-col overflow-hidden rounded-md border border-stone-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-stone-200/50", cardRadiusClassName)}>
                  <div className="relative aspect-square overflow-hidden border-b border-stone-50 bg-white">
                    {discount ? (
                      <span className="absolute left-0 top-2 z-10 rounded-r-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm sm:top-3 sm:px-2.5 sm:text-xs" style={{ backgroundColor: brandColor }}>
                        {discount}
                      </span>
                    ) : null}
                    <div className="relative h-full w-full">
                      {item.image ? (
                        <PreviewImage src={item.image} alt={item.name} className="h-full w-full object-contain p-1 transition-opacity duration-300" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-stone-50">
                          <Package size={34} className="text-stone-300" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-2 sm:p-3">
                    <h3 className="mb-1.5 line-clamp-3 text-sm font-bold leading-tight transition-colors sm:mb-2 sm:text-base" style={{ color: brandColor }}>
                      {item.name}
                    </h3>
                    <div className="mb-1.5 flex flex-col gap-0.5 sm:mb-2 sm:gap-1" />
                    <div className="mt-auto flex items-end justify-between gap-2 border-t border-stone-100 pt-1.5 sm:pt-2">
                      <div className="flex min-w-0 flex-col">
                        {item.originalPrice ? (
                          <span className="text-[10px] font-medium text-stone-400 line-through decoration-stone-400 decoration-1 sm:text-xs">{item.originalPrice}</span>
                        ) : null}
                        <span className="text-base font-bold sm:text-lg" style={{ color: brandColor }}>{item.price}</span>
                      </div>
                      <button type="button" className="shrink-0 rounded px-2 py-1 text-[10px] font-medium text-white transition-colors sm:px-3 sm:py-1.5 sm:text-xs" style={{ backgroundColor: brandColor }}>
                        Xem
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}


export const ProductListPreview = ({
  brandColor,
  secondary,
  itemCount,
  componentType,
  selectedStyle,
  onStyleChange,
  items,
  subTitle = 'Bộ sưu tập',
  sectionTitle,
  subtitle: subtitleProp,
  fontStyle,
  fontClassName,
  // Header config
  hideHeader = false,
  showTitle = true,
  showSubtitle = true,
  headerAlign = 'left',
  titleColorPrimary = false,
  subtitleAboveTitle = false,
  uppercaseText = false,
  showBadge = true,
  spacing = DEFAULT_SECTION_SPACING,
  categoryTabsSlot,
  headerRightSlot,
  styles: stylesProp,
  cardRadius = 'lg',
  desktopColumns = 4,
  lookbookDesktopColumns = 3,
  forceEmpty = false,
  emptyMessage = 'Danh mục này chưa có sản phẩm.',
}: {
  brandColor: string;
  secondary: string;
  itemCount: number;
  componentType: 'ProductList' | 'ServiceList' | 'ProductGrid';
  selectedStyle?: ProductListStyle;
  onStyleChange?: (style: ProductListStyle) => void;
  items?: ProductListPreviewItem[];
  subTitle?: string;
  sectionTitle?: string;
  subtitle?: string;
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
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
  categoryTabsSlot?: React.ReactNode;
  headerRightSlot?: React.ReactNode;
  styles?: { id: string; label: string }[];
  cardRadius?: ProductListCardRadius;
  desktopColumns?: 3 | 4;
  lookbookDesktopColumns?: 3 | 4;
  forceEmpty?: boolean;
  emptyMessage?: string;
}) => {
  const displayTitle = sectionTitle ?? (componentType === 'ServiceList' ? 'Dịch vụ nổi bật' : 'Sản phẩm nổi bật');
  const displaySubtitle = subtitleProp ?? '';
  // Effective display flags
  const effectiveShowBadge = !hideHeader && showBadge && !!subTitle;
  const effectiveShowTitle = !hideHeader && showTitle;
  const effectiveShowSubtitle = !hideHeader && showSubtitle;
  const effectiveHideHeader = hideHeader || (!effectiveShowBadge && !effectiveShowTitle);
  const titleStyle: React.CSSProperties | undefined = titleColorPrimary ? { color: brandColor } : undefined;
  const sectionSpacingClassName = getSectionSpacingClassName(spacing);
  const normalizedCardRadius = normalizeProductListCardRadius(cardRadius);
  const cardRadiusClassName = getProductListCardRadiusClassName(normalizedCardRadius);
  const imageRadiusClassName = getProductListImageRadiusClassName(normalizedCardRadius);
  const { device, setDevice } = usePreviewDevice();
  const normalizedDesktopColumns = desktopColumns === 3 ? 3 : 4;
  const normalizedLookbookColumns = lookbookDesktopColumns === 3 ? 3 : normalizedDesktopColumns;
  const responsiveGridClassName = React.useMemo(() => {
    if (device === 'mobile') {
      return normalizedDesktopColumns === 3 ? 'grid-cols-1' : 'grid-cols-2';
    }
    if (device === 'tablet') {
      return normalizedDesktopColumns === 3 ? 'grid-cols-3' : 'grid-cols-2';
    }
    return normalizedDesktopColumns === 3 ? 'grid-cols-3' : 'grid-cols-4';
  }, [device, normalizedDesktopColumns]);
  const buttonText = 'Xem tất cả';
  const [activeLookbookId, setActiveLookbookId] = React.useState<string | null>(null);
  const previewStyle: string = selectedStyle ?? 'commerce';
  const setPreviewStyle = (style: string) => onStyleChange?.(style as ProductListStyle);
  const isProduct = componentType !== 'ServiceList';
  const aspectRatioSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'defaultImageAspectRatio' });
  const imageAspectRatio = React.useMemo(
    () => resolveProductImageAspectRatio(aspectRatioSetting?.value),
    [aspectRatioSetting?.value]
  );
  const imageAspectRatioStyle = React.useMemo(
    () => ({ aspectRatio: getProductImageAspectRatioCssValue(imageAspectRatio) }),
    [imageAspectRatio]
  );

  const mockProducts: ProductListPreviewItem[] = [
    { category: 'Smartphone', id: 1, image: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&h=500&fit=crop&q=80', name: 'iPhone 15 Pro Max', originalPrice: '36.990.000đ', price: '34.990.000đ', tag: 'new' },
    { category: 'Laptop', id: 2, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca4?w=500&h=500&fit=crop&q=80', name: 'MacBook Pro M3', price: '45.990.000đ' },
    { category: 'Audio', id: 3, image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&h=500&fit=crop&q=80', name: 'Sony WH-1000XM5', originalPrice: '9.290.000đ', price: '8.490.000đ', tag: 'sale' },
    { category: 'Wearable', id: 4, image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&h=500&fit=crop&q=80', name: 'Apple Watch Ultra 2', price: '21.990.000đ', tag: 'new' },
    { category: 'Tablet', id: 5, image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&h=500&fit=crop&q=80', name: 'iPad Air 5 M1', originalPrice: '16.500.000đ', price: '14.990.000đ', tag: 'sale' },
    { category: 'Audio', id: 6, image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=500&h=500&fit=crop&q=80', name: 'Marshall Stanmore III', price: '9.890.000đ' },
    { category: 'Accessories', id: 7, image: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&h=500&fit=crop&q=80', name: 'Logitech MX Master 3S', price: '2.490.000đ' },
    { category: 'Camera', id: 8, image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500&h=500&fit=crop&q=80', name: 'Fujifilm X-T5', originalPrice: '45.000.000đ', price: '42.990.000đ', tag: 'hot' }
  ];

  const displayItems: ProductListPreviewItem[] = forceEmpty
    ? []
    : items && items.length > 0
    ? items
    : mockProducts.slice(0, Math.max(itemCount, 8));

  const getDiscount = (price?: string, originalPrice?: string) => {
    if (!price || !originalPrice) {return null;}
    const parsedPrice = Number.parseInt(price.replaceAll(/\D/g, ''));
    const parsedOriginal = Number.parseInt(originalPrice.replaceAll(/\D/g, ''));
    if (parsedOriginal <= parsedPrice) {return null;}
    return `-${Math.round(((parsedOriginal - parsedPrice) / parsedOriginal) * 100)}%`;
  };

  // Reusable header using shared SectionHeader component + "Xem tất cả" link below
  const renderSectionHeader = (opts?: { className?: string }) => {
    if (effectiveHideHeader) { return categoryTabsSlot ?? null; }

    // If headerRightSlot provided, render stacked: header on top (full width), tabs below (right-aligned)
    if (headerRightSlot) {
      return (
        <div className={cn('mb-3 md:mb-4', opts?.className)}>
          <SectionHeader
            title={displayTitle}
            subtitle={displaySubtitle}
            badgeText={subTitle}
            hideHeader={effectiveHideHeader}
            showTitle={effectiveShowTitle}
            showSubtitle={effectiveShowSubtitle}
            showBadge={effectiveShowBadge}
            headerAlign={headerAlign}
            titleColorPrimary={!!titleStyle}
            subtitleAboveTitle={subtitleAboveTitle}
            uppercaseText={uppercaseText}
            brandColor={brandColor}
            className="mb-0"
          />
          <div className="flex justify-end mt-4">
            {headerRightSlot}
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={cn('mb-3 md:mb-4', opts?.className)}>
          <SectionHeader
            title={displayTitle}
            subtitle={displaySubtitle}
            badgeText={subTitle}
            hideHeader={effectiveHideHeader}
            showTitle={effectiveShowTitle}
            showSubtitle={effectiveShowSubtitle}
            showBadge={effectiveShowBadge}
            headerAlign={headerAlign}
            titleColorPrimary={!!titleStyle}
            subtitleAboveTitle={subtitleAboveTitle}
            uppercaseText={uppercaseText}
            brandColor={brandColor}
            className="mb-0"
          />
          <div className="flex justify-end mt-2">
            <button type="button" className="flex items-center gap-1.5 text-sm font-semibold transition-colors hover:opacity-80" style={{ color: brandColor }}>
              {buttonText} <ArrowRight size={16} />
            </button>
          </div>
        </div>
        {categoryTabsSlot}
      </>
    );
  };

  const renderMinimalStyle = () => (
    <section className={cn("py-8 md:py-10", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}>
      {renderSectionHeader()}

      <div className={cn(
        "grid",
        device === 'mobile' ? 'grid-cols-2 gap-3' : (device === 'tablet' ? 'grid-cols-3 gap-4' : 'grid-cols-5 gap-5')
      )}>
        {displayItems.slice(0, device === 'mobile' ? 4 : (device === 'tablet' ? 6 : itemCount)).map((item) => {
          const discount = getDiscount(item.price, item.originalPrice);
          return (
            <div
              key={item.id}
              className={cn("group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col cursor-pointer", cardRadiusClassName)}
            >
              <div className="relative bg-slate-100 dark:bg-slate-700 overflow-hidden" style={imageAspectRatioStyle}>
                {item.image ? (
                  <PreviewImage
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package size={32} className="text-slate-300" />
                  </div>
                )}
                {discount && (
                  <div className="absolute top-2 right-2">
                    <SaleBadge text={discount} className="text-[10px] px-2 py-0.5" />
                  </div>
                )}
              </div>

              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm line-clamp-2 mb-1 group-hover:opacity-80 transition-colors">
                  {item.name}
                </h3>

                <div className="flex items-baseline gap-2 mb-3 mt-auto pt-1">
                  <span className="text-sm font-bold" style={{ color: brandColor }}>{item.price}</span>
                  {item.originalPrice && (
                    <span className="text-[10px] text-slate-400 line-through">{item.originalPrice}</span>
                  )}
                </div>

                <button
                  className="w-full gap-1 border-2 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center transition-colors whitespace-nowrap text-xs"
                  style={{ borderColor: `${brandColor}20`, color: brandColor }}
                  onMouseEnter={(event) => { event.currentTarget.style.borderColor = brandColor; event.currentTarget.style.backgroundColor = `${brandColor}08`; }}
                  onMouseLeave={(event) => { event.currentTarget.style.borderColor = `${brandColor}20`; event.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  Xem chi tiết
                  <ArrowRight className="w-3 h-3 flex-shrink-0" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* "Xem thêm" button — dark bg */}
      <div className="flex justify-center mt-8">
        <button
          type="button"
          className="px-8 py-2.5 rounded-full text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
        >
          Xem thêm
        </button>
      </div>
    </section>
  );

  const renderEmptyState = () => (
    <section className={cn("py-8 md:py-10", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}>
      {renderSectionHeader()}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
        <Package size={36} className="mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-medium text-slate-500">{emptyMessage}</p>
      </div>
    </section>
  );


  const renderCommerceStyle = () => (
    <section className={cn("py-8 md:py-10", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}>
      {renderSectionHeader()}

      <div className={cn(
        "grid gap-6",
        responsiveGridClassName,
        device === 'mobile' && 'gap-4'
      )}>
        {displayItems.slice(0, device === 'mobile' ? 4 : 4).map((item) => {
          const discount = getDiscount(item.price, item.originalPrice);
          return (
            <div
              key={item.id}
              className={cn("group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col", cardRadiusClassName)}
              style={{ '--hover-border': `${secondary}30`, '--hover-shadow': `0 10px 15px -3px ${secondary}10` } as React.CSSProperties}
            >
              <div className="relative bg-slate-100 dark:bg-slate-700 overflow-hidden" style={imageAspectRatioStyle}>
                {item.image ? (
                  <PreviewImage
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package size={40} className="text-slate-300" />
                  </div>
                )}
                {discount && (
                  <div className="absolute top-2 right-2">
                    <SaleBadge text={discount} className="text-[10px] px-2 py-1" />
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 line-clamp-2 mb-1 group-hover:opacity-80 transition-colors cursor-pointer">
                  {item.name}
                </h3>

                <div className="flex items-baseline gap-2 mb-4 mt-auto pt-2">
                  <span className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:opacity-80 transition-colors" style={{ color: brandColor }}>{item.price}</span>
                  {item.originalPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      {item.originalPrice}
                    </span>
                  )}
                </div>

                <button
                  className="w-full gap-1.5 md:gap-2 border-2 py-1.5 md:py-2 px-2 md:px-4 rounded-lg font-medium flex items-center justify-center transition-colors whitespace-nowrap text-xs md:text-sm"
                  style={{ borderColor: `${brandColor}20`, color: brandColor }}
                  onMouseEnter={(event) => { event.currentTarget.style.borderColor = brandColor; event.currentTarget.style.backgroundColor = `${brandColor}08`; }}
                  onMouseLeave={(event) => { event.currentTarget.style.borderColor = `${brandColor}20`; event.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  Xem chi tiết
                  <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderBentoStyle = () => {
    const featured = displayItems[displayItems.length > 7 ? 7 : displayItems.length - 1] || displayItems[0];
    const others = displayItems.slice(0, 4);
    const discount = getDiscount(featured?.price, featured?.originalPrice);

    return (
      <section className={cn("py-8 md:py-10", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}>
        {renderSectionHeader()}

        {device === 'mobile' ? (
          <div className="grid grid-cols-2 gap-3">
            {others.slice(0, 4).map((item) => {
              const itemDiscount = getDiscount(item.price, item.originalPrice);
              return (
                <div key={item.id} className={cn("group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex flex-col cursor-pointer hover:shadow-md transition-all", cardRadiusClassName)}>
                  <div className={cn("relative w-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-2", imageRadiusClassName)} style={imageAspectRatioStyle}>
                    {item.image ? (
                      <PreviewImage
                        src={item.image}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        alt={item.name}
                        fallback={<div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-700"><Package size={24} className="text-slate-300" /></div>}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center"><Package size={24} className="text-slate-300" /></div>
                    )}
                    {itemDiscount && (
                      <div className="absolute top-2 left-2">
                        <SaleBadge text={itemDiscount} className="text-[10px] px-1.5 py-0.5" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:opacity-80 transition-colors">{item.name}</h4>
                  <span className="text-sm font-bold mt-1" style={{ color: brandColor }}>{item.price}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={cn(
            "grid gap-4 h-auto",
            device === 'tablet' ? 'grid-cols-3 grid-rows-2' : 'grid-cols-4 grid-rows-2'
          )}>
            <div className={cn("col-span-2 row-span-2 relative group overflow-hidden cursor-pointer min-h-[400px] border border-transparent transition-colors", cardRadiusClassName)} style={{ '--hover-border': `${secondary}50`, backgroundColor: `${secondary}10` } as React.CSSProperties}>
              {featured?.image ? (
                <PreviewImage
                  src={featured.image}
                  alt={featured.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  fallback={(
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                      <Package size={64} className="text-slate-300" />
                    </div>
                  )}
                />
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                  <Package size={64} className="text-slate-300" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

              {discount && (
                <div className="absolute top-4 right-4">
                  <SaleBadge text={discount} className="text-sm px-3 py-1" />
                </div>
              )}

              <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                <h3 className="text-2xl md:text-4xl font-bold mb-3 leading-tight text-white">{featured?.name}</h3>

                <div className="flex flex-row items-center justify-between gap-4 mt-2">
                  <span className="text-2xl font-bold text-white">{featured?.price}</span>

                  <button type="button" className="rounded-full px-6 py-2 text-white border-0 shadow-lg transition-all hover:scale-105" style={{ backgroundColor: brandColor, boxShadow: `0 4px 6px ${brandColor}20` }}>
                    Xem chi tiết
                  </button>
                </div>
              </div>
            </div>

            {others.slice(0, 4).map((item) => {
              const itemDiscount = getDiscount(item.price, item.originalPrice);
              return (
                <div
                  key={item.id}
                  className={cn("col-span-1 row-span-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex flex-col group hover:shadow-lg transition-all cursor-pointer relative overflow-hidden", cardRadiusClassName)}
                  style={{ '--hover-border': `${secondary}40` } as React.CSSProperties}
                >
                  <div className={cn("relative w-full overflow-hidden mb-3", imageRadiusClassName)} style={{ ...imageAspectRatioStyle, backgroundColor: `${secondary}08` }}>
                    {item.image ? (
                      <PreviewImage
                        src={item.image}
                        className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-110"
                        alt={item.name}
                        fallback={(
                          <div className="h-full w-full flex items-center justify-center">
                            <Package size={32} className="text-slate-300" />
                          </div>
                        )}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package size={32} className="text-slate-300" />
                      </div>
                    )}

                    {itemDiscount && (
                      <div className="absolute top-2 left-2">
                        <SaleBadge text={itemDiscount} className="text-[10px] px-1.5 py-0.5" />
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="text-white p-2 rounded-full shadow-lg" style={{ backgroundColor: secondary }}>
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto px-1">
                    <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:opacity-80 transition-colors">
                      {item.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold" style={{ color: brandColor }}>
                        {item.price}
                      </span>
                      {item.originalPrice && (
                        <span className="text-[10px] text-slate-400 line-through opacity-70">
                          {item.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  const renderCarouselStyle = () => <CarouselPreviewInner displayItems={displayItems} device={device} brandColor={brandColor} secondary={secondary} subTitle={subTitle} displayTitle={displayTitle} displaySubtitle={displaySubtitle} imageAspectRatioStyle={imageAspectRatioStyle} getDiscount={getDiscount} effectiveShowBadge={effectiveShowBadge} effectiveShowTitle={effectiveShowTitle} effectiveShowSubtitle={effectiveShowSubtitle} effectiveHideHeader={effectiveHideHeader} titleStyle={titleStyle} uppercaseText={uppercaseText} headerAlign={headerAlign} subtitleAboveTitle={subtitleAboveTitle} cardRadiusClassName={cardRadiusClassName} />;

  const renderWineCarouselStyle = () => (
    <WineCarouselPreviewInner
      displayItems={displayItems}
      device={device}
      brandColor={brandColor}
      header={renderSectionHeader({ className: 'mb-1 md:mb-2' })}
      itemCount={itemCount}
      getDiscount={getDiscount}
      cardRadiusClassName={cardRadiusClassName}
    />
  );

  const renderCompactStyle = () => (
    <section className={cn("py-8 md:py-10", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}>
      {renderSectionHeader()}

      <div className={cn(
        "grid gap-3",
        responsiveGridClassName
      )}>
        {displayItems.slice(0, 8).map((item) => {
          const discount = getDiscount(item.price, item.originalPrice);
          return (
            <div
              key={item.id}
              className={cn("group cursor-pointer bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 p-2 hover:shadow-md transition-all", cardRadiusClassName)}
              onMouseEnter={(event) => { event.currentTarget.style.borderColor = `${secondary}20`; }}
              onMouseLeave={(event) => { event.currentTarget.style.borderColor = ''; }}
            >
              <div className={cn("relative overflow-hidden rounded-md bg-slate-50 dark:bg-slate-700 mb-2", imageRadiusClassName)} style={imageAspectRatioStyle}>
                {item.image ? (
                  <PreviewImage src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center"><Package size={24} className="text-slate-300" /></div>
                )}
                {discount && (
                  <div className="absolute top-1 left-1">
                    <SaleBadge text={discount} className="text-[9px] px-1.5 py-0.5" />
                  </div>
                )}
              </div>
              <h3 className="font-medium text-xs text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:opacity-80 transition-colors">{item.name}</h3>
              <span className="font-bold text-xs mt-0.5 block" style={{ color: brandColor }}>{item.price}</span>
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderShowcaseStyle = () => {
    const showcaseFeatured = displayItems[0];
    const showcaseOthers = displayItems.slice(1, 5);
    const featuredDiscount = getDiscount(showcaseFeatured?.price, showcaseFeatured?.originalPrice);

    return (
      <section className={cn("py-8 md:py-10", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}>
        {renderSectionHeader()}

        {device === 'mobile' ? (
          <div className="grid grid-cols-2 gap-3">
            {displayItems.slice(0, 4).map((item) => {
              const discount = getDiscount(item.price, item.originalPrice);
              return (
                <div key={item.id} className={cn("group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-2 flex flex-col cursor-pointer hover:shadow-md transition-all", cardRadiusClassName)}>
                  <div className={cn("relative w-full bg-slate-100 dark:bg-slate-700 overflow-hidden mb-2", imageRadiusClassName)} style={imageAspectRatioStyle}>
                    {item.image ? <PreviewImage src={item.image} className="h-full w-full object-cover" alt={item.name} /> : <div className="h-full w-full flex items-center justify-center"><Package size={24} className="text-slate-300" /></div>}
                    {discount && (
                      <div className="absolute top-2 left-2">
                        <SaleBadge text={discount} className="text-[10px] px-1.5 py-0.5" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2">{item.name}</h4>
                  <span className="text-sm font-bold mt-1" style={{ color: brandColor }}>{item.price}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={cn("grid gap-4", device === 'tablet' ? 'grid-cols-2' : 'grid-cols-3')}>
            <div className={cn("relative group overflow-hidden cursor-pointer min-h-[400px] border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-colors", cardRadiusClassName)} style={{ backgroundColor: `${secondary}05` }}>
              {showcaseFeatured?.image ? (
                <PreviewImage src={showcaseFeatured.image} alt={showcaseFeatured.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-100 dark:bg-slate-800"><Package size={64} className="text-slate-300" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {featuredDiscount && (
                <div className="absolute top-4 left-4">
                  <SaleBadge text={featuredDiscount} className="text-sm px-3 py-1" />
                </div>
              )}
              <div className="absolute bottom-0 left-0 p-6 w-full">
                <BrandBadge text="Nổi bật" variant="solid" brandColor={brandColor} secondary={secondary} className="mb-2" />
                <h3 className="text-xl md:text-2xl font-bold text-white mb-2 line-clamp-2">{showcaseFeatured?.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-white">{showcaseFeatured?.price}</span>
                  <button type="button" className="h-9 px-4 rounded-lg text-white text-sm font-medium shrink-0" style={{ backgroundColor: brandColor }}>Xem chi tiết</button>
                </div>
              </div>
            </div>

            <div className={cn("grid grid-cols-2 gap-3", device === 'desktop' && 'col-span-2')}>
              {showcaseOthers.map((item) => {
                const discount = getDiscount(item.price, item.originalPrice);
                return (
                  <div key={item.id} className={cn("group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 flex flex-col cursor-pointer hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all", cardRadiusClassName)}>
                    <div className={cn("relative w-full bg-slate-50 dark:bg-slate-700 overflow-hidden mb-3", imageRadiusClassName)} style={imageAspectRatioStyle}>
                      {item.image ? <PreviewImage src={item.image} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" alt={item.name} /> : <div className="h-full w-full flex items-center justify-center"><Package size={32} className="text-slate-300" /></div>}
                      {discount && (
                        <div className="absolute top-2 left-2">
                          <SaleBadge text={discount} className="text-[10px] px-1.5 py-0.5" />
                        </div>
                      )}
                    </div>
                    <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:opacity-80 transition-colors">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold" style={{ color: brandColor }}>{item.price}</span>
                      {item.originalPrice && <span className="text-[10px] text-slate-400 line-through">{item.originalPrice}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderMagazineStyle = () => (
    <section className={cn("py-8 md:py-10", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}>
      {renderSectionHeader()}
      <div className={cn(
        "grid gap-4",
        device === 'mobile' ? 'grid-cols-2 gap-3' : (device === 'tablet' ? 'grid-cols-3' : 'grid-cols-4')
      )}>
        {displayItems.slice(0, itemCount).map((item) => {
          const discount = getDiscount(item.price, item.originalPrice);
          return (
            <div key={item.id} className={cn("group relative overflow-hidden cursor-pointer", cardRadiusClassName)} style={imageAspectRatioStyle}>
              {item.image ? (
                <PreviewImage src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-slate-100"><Package size={40} className="text-slate-300" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
              {discount && (
                <div className="absolute top-2 left-2"><SaleBadge text={discount} className="text-[10px] px-2 py-0.5" /></div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <h3 className="text-sm md:text-base font-bold text-white line-clamp-2 mb-1">{item.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{item.price}</span>
                  {item.originalPrice && <span className="text-[10px] text-white/60 line-through">{item.originalPrice}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderMosaicStyle = () => (
    <section className={cn("py-8 md:py-10", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}>
      {renderSectionHeader()}
      <div className={cn(
        "grid gap-3 md:gap-4",
        device === 'mobile' ? 'grid-cols-2' : (device === 'tablet' ? 'grid-cols-3' : 'grid-cols-4')
      )}>
        {displayItems.slice(0, itemCount).map((item) => {
          const discount = getDiscount(item.price, item.originalPrice);
          return (
            <div key={item.id} className={cn("bg-white border border-slate-200 p-3 flex flex-col group hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer overflow-hidden", cardRadiusClassName)}>
              <div className={cn("relative w-full overflow-hidden mb-3", imageRadiusClassName)} style={{ ...imageAspectRatioStyle, backgroundColor: `${secondary}08` }}>
                {item.image ? (
                  <PreviewImage src={item.image} alt={item.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center"><Package size={32} className="text-slate-300" /></div>
                )}
                {discount && <div className="absolute top-2 left-2"><SaleBadge text={discount} className="text-[10px] px-1.5 py-0.5" /></div>}
                <div className="absolute bottom-2 right-2 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="text-white p-2 rounded-full shadow-lg" style={{ backgroundColor: brandColor }}><ArrowRight size={16} /></div>
                </div>
              </div>
              <div className="mt-auto px-1">
                <h4 className="font-medium text-sm text-slate-900 line-clamp-2 group-hover:opacity-80 transition-colors">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold" style={{ color: brandColor }}>{item.price}</span>
                  {item.originalPrice && <span className="text-[10px] text-slate-400 line-through">{item.originalPrice}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  const renderLookbookStyle = () => (
    <section
      className="bg-transparent"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="mx-auto w-full max-w-[1440px] px-3">
        {renderSectionHeader({ className: 'mb-6 md:mb-8' })}
        <div className={cn(
          "-mx-3 grid gap-y-6 text-left",
          device === 'mobile'
            ? (normalizedLookbookColumns === 3 ? 'grid-cols-1' : 'grid-cols-2')
            : device === 'tablet'
              ? (normalizedLookbookColumns === 3 ? 'grid-cols-3' : 'grid-cols-2')
              : (normalizedLookbookColumns === 3 ? 'grid-cols-3' : 'grid-cols-4')
        )}>
          {displayItems.slice(0, Math.min(itemCount, normalizedLookbookColumns)).map((item, index) => {
            const banner = PRODUCT_LIST_LOOKBOOK_BANNERS[index];
            const image = item.image ?? banner?.image;
            const hoverImage = item.image ? item.image : (banner?.hoverImage ?? image);
            const imageAlt = item.name || banner?.title || '';
            const discount = getDiscount(item.price, item.originalPrice);
            const itemKey = String(item.id);
            const isActive = activeLookbookId === itemKey;
            return (
              <div
                key={item.id}
                className={cn(
                  "relative w-full px-3 text-left"
                )}
              >
                <div
                  className={cn("group block h-full bg-white dark:bg-slate-800", cardRadiusClassName)}
                  style={{ borderColor: `${secondary}26` }}
                  title={imageAlt}
                  onClick={() => {
                    if (device === 'mobile') {
                      setActiveLookbookId((current) => current === itemKey ? null : itemKey);
                    }
                  }}
                >
                  <div className="relative isolate aspect-[380/460] overflow-visible [perspective:2500px]">
                    <div
                      className={cn(
                        "relative h-full w-full overflow-hidden bg-white shadow-sm transition duration-500",
                        "group-hover:[transform:perspective(900px)_translateY(-5%)_rotateX(25deg)_translateZ(0)] group-hover:shadow-[2px_35px_32px_-8px_rgba(0,0,0,0.55)]",
                        isActive && "[transform:perspective(900px)_translateY(-5%)_rotateX(25deg)_translateZ(0)] shadow-[2px_35px_32px_-8px_rgba(0,0,0,0.55)]",
                        imageRadiusClassName,
                      )}
                    >
                      {image ? (
                        <PreviewImage
                          src={image}
                          alt={imageAlt}
                          width={380}
                          height={460}
                          className={cn("h-full w-full object-cover transition duration-500 group-hover:brightness-95", isActive && "brightness-95")}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-700">
                          <Package size={48} className="text-slate-300" />
                        </div>
                      )}
                      <div className={cn("absolute inset-0 z-10 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-70 transition duration-500 group-hover:opacity-0", isActive && "opacity-0")} />
                      <div className={cn("absolute inset-0 z-10 bg-white opacity-0 transition duration-500 group-hover:opacity-100", isActive && "opacity-100")} />
                      {discount && (
                        <div className="absolute right-3 top-3 z-20">
                          <SaleBadge text={discount} className="text-[11px] px-3 py-1 font-bold shadow-lg" />
                        </div>
                      )}
                      <div className={cn("absolute inset-x-0 bottom-0 z-20 space-y-2 p-4 text-center transition duration-500 group-hover:translate-y-1", isActive && "translate-y-1")}>
                        {item.category ? (
                          <div className={cn("text-[11px] font-semibold uppercase tracking-wide text-white/70 transition-colors duration-500 group-hover:text-slate-500", isActive && "text-slate-500")}>
                            {item.category}
                          </div>
                        ) : null}
                        <h3 className={cn("line-clamp-2 text-base font-bold leading-snug text-white transition-colors duration-500 group-hover:text-slate-900", isActive && "text-slate-900")}>
                          {item.name}
                        </h3>
                        <div className="flex flex-wrap items-baseline justify-center gap-2">
                          {item.price && (
                            <span className="text-base font-bold" style={{ color: brandColor }}>
                              {item.price}
                            </span>
                          )}
                          {item.originalPrice && (
                            <span className={cn("text-xs text-white/55 line-through transition-colors duration-500 group-hover:text-slate-400", isActive && "text-slate-400")}>
                              {item.originalPrice}
                            </span>
                          )}
                        </div>
                        <div className="inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold text-white shadow-lg transition duration-300 group-hover:scale-105" style={{ backgroundColor: secondary }}>
                          Xem chi tiết <ArrowRight size={14} className="ml-1.5" />
                        </div>
                      </div>
                    </div>
                    {hoverImage && (
                      <PreviewImage
                        src={hoverImage}
                        alt={imageAlt}
                        width={619}
                        height={460}
                        className={cn(
                          "pointer-events-none absolute bottom-[19%] left-1/2 z-30 w-[95%] max-w-none -translate-x-1/2 translate-y-6 object-contain opacity-0 drop-shadow-2xl transition duration-500 group-hover:-translate-y-[22%] group-hover:scale-110 group-hover:opacity-100",
                          isActive && "-translate-y-[22%] scale-110 opacity-100",
                        )}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );

  const renderTabbedStyle = () => {
    const categories = [...new Set(displayItems.map((item) => item.category).filter(Boolean))];
    const displayCategories = categories.length > 0 ? categories.slice(0, 5) : ['Tất cả'];
    const visibleItems = displayItems.slice(0, device === 'mobile' ? 4 : 5);

    // Tính toán contrast text color dựa trên độ sáng background
    const getLuminance = (hex: string) => {
      const h = hex.replace('#', '');
      const r = Number.parseInt(h.slice(0, 2), 16) / 255;
      const g = Number.parseInt(h.slice(2, 4), 16) / 255;
      const b = Number.parseInt(h.slice(4, 6), 16) / 255;
      const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };
    const getReadableTextColor = (bgHex: string) => getLuminance(bgHex) > 0.4 ? '#1e293b' : '#ffffff';

    const textOnBrand = getReadableTextColor(brandColor);

    return (
      <section
        className={cn("py-8 md:py-10 rounded-xl", device === 'mobile' ? 'px-3' : 'px-4 md:px-6')}
        style={{ backgroundColor: brandColor }}
      >
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {displayCategories.map((cat, idx) => (
            <button
              key={cat}
              type="button"
              className="px-3 py-1.5 rounded-md text-xs font-bold transition-colors whitespace-nowrap"
              style={
                idx === 0
                  ? { backgroundColor: '#ffffff', color: '#1e293b' }
                  : { borderColor: `${textOnBrand}4D`, color: textOnBrand, border: `1px solid ${textOnBrand}4D` }
              }
              onMouseEnter={idx !== 0 ? (e) => { e.currentTarget.style.backgroundColor = `${textOnBrand}1A`; } : undefined}
              onMouseLeave={idx !== 0 ? (e) => { e.currentTarget.style.backgroundColor = 'transparent'; } : undefined}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid — same card style as Catalog */}
        <div
          className={cn(
            'grid gap-3 md:gap-4',
            device === 'mobile' ? 'grid-cols-2' : (device === 'tablet' ? 'grid-cols-3' : 'grid-cols-5'),
          )}
        >
          {visibleItems.map((item) => {
            const discount = getDiscount(item.price, item.originalPrice);
            return (
              <div
                key={item.id}
                className={cn("group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col", cardRadiusClassName)}
              >
                <div className="relative bg-slate-100 dark:bg-slate-700 overflow-hidden" style={imageAspectRatioStyle}>
                  {item.image ? (
                    <PreviewImage
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Package size={40} className="text-slate-300" />
                    </div>
                  )}
                  {discount && (
                    <div className="absolute top-2 right-2">
                      <SaleBadge text={discount} className="text-[10px] px-2 py-1" />
                    </div>
                  )}
                </div>

                <div className="p-3 md:p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm line-clamp-2 mb-1 group-hover:opacity-80 transition-colors cursor-pointer">
                    {item.name}
                  </h3>

                  <div className="flex items-baseline gap-2 mb-3 mt-auto pt-2">
                    <span className="text-sm font-bold" style={{ color: brandColor }}>{item.price}</span>
                    {item.originalPrice && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {item.originalPrice}
                      </span>
                    )}
                  </div>

                  <button
                    className="w-full gap-1.5 border-2 py-1.5 px-2 rounded-lg font-medium flex items-center justify-center transition-colors whitespace-nowrap text-xs"
                    style={{ borderColor: `${brandColor}20`, color: brandColor }}
                    onMouseEnter={(event) => { event.currentTarget.style.borderColor = brandColor; event.currentTarget.style.backgroundColor = `${brandColor}08`; }}
                    onMouseLeave={(event) => { event.currentTarget.style.borderColor = `${brandColor}20`; event.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    Xem chi tiết
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* View all button */}
        <div className="flex justify-center mt-6">
          <button
            type="button"
            className="px-8 py-2.5 rounded-full text-sm font-bold bg-white text-slate-900 hover:bg-slate-50 transition-colors shadow-md"
          >
            Xem tất cả
          </button>
        </div>
      </section>
    );
  };

  const renderStorefrontStyle = () => {
    const categories = [...new Set(displayItems.map((item) => item.category).filter(Boolean))];
    const displayCategories = categories.length > 0 ? categories.slice(0, 5) : ['Tất cả'];
    const visibleItems = displayItems.slice(0, device === 'mobile' ? 4 : 5);

    // Tính contrast text color cho header bar
    const sfLuminance = (hex: string) => {
      const h = hex.replace('#', '');
      const r = Number.parseInt(h.slice(0, 2), 16) / 255;
      const g = Number.parseInt(h.slice(2, 4), 16) / 255;
      const b = Number.parseInt(h.slice(4, 6), 16) / 255;
      const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };
    const sfTextOnBrand = sfLuminance(brandColor) > 0.4 ? '#1e293b' : '#ffffff';

    return (
      <section className={cn('py-0', device === 'mobile' ? '' : '')}>
        {/* Header bar with brand bg */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-t-xl overflow-x-auto"
          style={{ backgroundColor: brandColor }}
        >
          <span className="font-bold text-sm whitespace-nowrap" style={{ color: sfTextOnBrand }}>Chọn danh mục</span>
          {displayCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-slate-800 whitespace-nowrap hover:bg-slate-50 transition-colors"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid - white bg */}
        <div className={cn('px-4 py-6', device === 'mobile' ? '' : 'px-6')}>
          <div
            className={cn(
              'grid gap-4',
              device === 'mobile' ? 'grid-cols-2' : (device === 'tablet' ? 'grid-cols-3' : 'grid-cols-5'),
            )}
          >
            {visibleItems.map((item) => {
              const discount = getDiscount(item.price, item.originalPrice);
              return (
                <div
                  key={item.id}
                  className="group flex flex-col cursor-pointer"
                >
                  {/* Image + discount badge */}
                  <div className={cn("relative bg-white overflow-hidden mb-3", imageRadiusClassName)} style={imageAspectRatioStyle}>
                    {item.image ? (
                      <PreviewImage
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-slate-50">
                        <Package size={32} className="text-slate-300" />
                      </div>
                    )}
                    {discount && (
                      <div className="absolute top-1 right-1">
                        <span
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full text-white text-[10px] font-bold"
                          style={{ backgroundColor: brandColor }}
                        >
                          {discount}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <h3 className="font-medium text-slate-900 text-xs line-clamp-2 mb-1 group-hover:opacity-80 transition-colors">
                    {item.name}
                  </h3>

                  {/* Rating */}
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                    <span className="text-yellow-400">★</span>
                    <span>0.0</span>
                    <span>(0 Đánh giá)</span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-1.5 mb-2">
                    <span className="text-sm font-bold" style={{ color: brandColor }}>
                      {item.price}
                    </span>
                    {item.originalPrice && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {item.originalPrice}
                      </span>
                    )}
                  </div>

                  {/* Cart + heart */}
                  <div className="flex items-center justify-between mt-auto">
                    <span
                      className="flex items-center gap-1 text-[10px] font-medium"
                      style={{ color: brandColor }}
                    >
                      🛒 Thêm vào giỏ
                    </span>
                    <span className="text-slate-300 text-xs">♡</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View more button */}
          <div className="flex justify-center mt-6">
            <button
              type="button"
              className="px-8 py-2.5 rounded-full text-sm font-bold border-2 transition-colors hover:bg-opacity-10"
              style={{ borderColor: brandColor, color: brandColor }}
            >
              Xem thêm sản phẩm
            </button>
          </div>
        </div>
      </section>
    );
  };

  return (
    <>
      <PreviewWrapper
        title={`Preview ${isProduct ? 'Sản phẩm' : 'Dịch vụ'}`}
        device={device}
        setDevice={setDevice}
        previewStyle={previewStyle}
        setPreviewStyle={setPreviewStyle}
        styles={stylesProp ?? PRODUCT_LIST_STYLES}
        deviceWidthClass={deviceWidths[device]}
        fontStyle={fontStyle}
        fontClassName={fontClassName}
      >
        <BrowserFrame url={`yoursite.com/${isProduct ? 'products' : 'services'}`}>
          <div className={sectionSpacingClassName}>
            {forceEmpty ? renderEmptyState() : (
              <>
                {previewStyle === 'minimal' && renderMinimalStyle()}
                {previewStyle === 'commerce' && renderCommerceStyle()}
                {previewStyle === 'catalog' && renderCommerceStyle()}
                {previewStyle === 'bento' && renderBentoStyle()}
                {previewStyle === 'magazine' && renderMagazineStyle()}
                {previewStyle === 'mosaic' && renderMosaicStyle()}
                {previewStyle === 'carousel' && renderCarouselStyle()}
                {previewStyle === 'wine-carousel' && renderWineCarouselStyle()}
                {previewStyle === 'compact' && renderCompactStyle()}
                {previewStyle === 'showcase' && renderShowcaseStyle()}
                {previewStyle === 'lookbook' && renderLookbookStyle()}
                {componentType === 'ProductGrid' && previewStyle === 'tabbed' && renderTabbedStyle()}
                {componentType === 'ProductGrid' && previewStyle === 'storefront' && renderStorefrontStyle()}
              </>
            )}
          </div>
        </BrowserFrame>
      </PreviewWrapper>
      <ColorInfoPanel brandColor={brandColor} secondary={secondary} />
    </>
  );
};
