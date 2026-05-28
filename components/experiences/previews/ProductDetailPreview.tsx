import React, { useEffect, useState, useRef } from 'react';
import { cn } from '@/app/admin/components/ui';
import * as LucideReact from 'lucide-react';
import {
  Award,
  BadgeCheck,
  Bell,
  Bolt,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CreditCard,
  Gift,
  Globe,
  Heart,
  HeartHandshake,
  Leaf,
  Lock,
  MapPin,
  Minus,
  Phone,
  Plus,
  Package,
  RotateCcw,
  Share2,
  Shield,
  ShoppingBag,
  ShoppingCart,
  Star,
  ThumbsUp,
  Truck,
  Facebook,
  Instagram,
  Youtube,
  Send,
  Mail,
} from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { getAttributeIconComponent } from '@/app/admin/attribute-groups/_lib/iconRegistry';

const renderPremiumIcon = (iconName: string | undefined, size = 16, className = '', style = {}) => {
  if (!iconName) return null;
  const IconComponent = (LucideReact as any)[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} className={className} style={style} />;
};
import { CommentsPreview } from './DetailPreview';
import {
  getProductDetailColors,
  resolveProductDetailElementColor,
  type ProductDetailElementColorChoice,
} from '@/components/site/products/detail/_lib/colors';
import {
  getProductImageFrameConfig,
  getVerticalThumbnailSlots,
  type ProductImageAspectRatio,
} from '@/components/site/products/detail/_lib/image-aspect-ratio';
import { ProductImageLightbox } from '@/components/site/products/detail/_components/ProductImageLightbox';

type ProductDetailPreviewProps = {
  layoutStyle: 'classic' | 'modern' | 'minimal' | 'premium';
  showRating: boolean;
  showComments?: boolean;
  showCommentLikes?: boolean;
  showCommentReplies?: boolean;
  showWishlist: boolean;
  showShare: boolean;
  showAddToCart: boolean;
  showBuyNow: boolean;
  showVariants?: boolean;
  showAllProductImagesSection?: boolean;
  enableImageLightbox?: boolean;
  showHighlights: boolean;
  classicHighlights?: { icon: string; text: string }[];
  premiumBannerItems?: { title: string; subtitle: string }[];
  premiumBannerBg?: ProductDetailElementColorChoice;
  premiumBannerText?: ProductDetailElementColorChoice;
  showPremiumBanner?: boolean;
  heroStyle?: 'full' | 'split' | 'minimal';
  contentWidth?: 'narrow' | 'medium' | 'wide';
  imageAspectRatio: ProductImageAspectRatio;
  device?: 'desktop' | 'tablet' | 'mobile';
  brandColor?: string;
  secondaryColor?: string;
  colorMode?: 'single' | 'dual';
  relatedProductsMode?: 'fixed' | 'infiniteScroll' | 'pagination';
  relatedProductsPerPage?: number;
  enableCombos?: boolean;
  comboAnimateType?: 'none' | 'luxury-sheen' | 'typing' | 'letter-wave' | 'fire' | 'sparkle' | 'sparkle-gradient' | 'sparkle-black' | 'sparkle-gold' | 'sparkle-emerald' | 'sparkle-red' | 'sparkle-primary' | 'sparkle-secondary' | 'pulse' | 'bounce' | 'text-highlight' | 'border-rainbow';
  comboEffectColor?: 'black' | 'white' | 'red' | 'primary' | 'secondary' | 'gradient-1' | 'gradient-2' | 'gradient-3';
  accentColors?: {
    categoryBadge?: ProductDetailElementColorChoice;
    discountBadge?: ProductDetailElementColorChoice;
    primaryButton?: ProductDetailElementColorChoice;
    comboBadge?: ProductDetailElementColorChoice;
  };
  showSocialButtons?: boolean;
  socialButtons?: Array<{ id: string; icon: string; label: string; url: string; active: boolean }>;
  demoAttributes?: any[];
  productTypeId?: string;
  zaloText?: string;
  zaloIcon?: string;
  zaloUrl?: string;
  phoneText?: string;
  phoneIcon?: string;
  phoneUrl?: string;
  mobileFontSize?: 'xs' | 'sm' | 'base';
  priceLeftIcon?: string;
  priceRightIcon?: string;
  showPriceLeftIcon?: boolean;
  showPriceRightIcon?: boolean;
};

const formatVND = (price: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

const CLASSIC_HIGHLIGHT_ICON_MAP: Record<string, React.ElementType> = {
  Award,
  BadgeCheck,
  Bell,
  Bolt,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  Globe,
  HeartHandshake,
  Leaf,
  Lock,
  MapPin,
  Phone,
  RotateCcw,
  Shield,
  Star,
  ThumbsUp,
  Truck,
};

const PREVIEW_IMAGES = [
  '/seed_mau/tech/products/1.webp',
  '/seed_mau/tech/products/2.webp',
  '/seed_mau/tech/products/3.webp',
  '/seed_mau/tech/products/4.webp',
  '/seed_mau/tech/products/5.webp',
  '/seed_mau/tech/products/6.webp',
  '/seed_mau/tech/products/7.webp',
  '/seed_mau/tech/products/8.webp',
];

const PREVIEW_DESCRIPTION = 'Thiết kế sang trọng, hiệu năng bền bỉ và trải nghiệm màn hình sắc nét phù hợp nhu cầu cao cấp. Pin tối ưu cho cả ngày dài, camera linh hoạt và chất liệu hoàn thiện tinh tế.';
const RATING_STAR_ACTIVE_COLOR = '#f59e0b';

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

function preloadNeighborImages(images: string[], centerIndex: number) {
  if (typeof window === 'undefined' || images.length === 0) {
    return;
  }

  const candidates = [images[centerIndex], images[centerIndex - 1], images[centerIndex + 1]];
  candidates.forEach((candidate) => {
    if (!candidate) {
      return;
    }
    const image = new window.Image();
    image.src = candidate;
  });
}

function BlurredPreviewImage({ src, alt }: { src: string; alt: string }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [currentSrc, setCurrentSrc] = useState(src);
  const [incomingSrc, setIncomingSrc] = useState<string | null>(null);
  const [incomingVisible, setIncomingVisible] = useState(false);

  useEffect(() => {
    if (!src) {
      setIncomingSrc(null);
      setIncomingVisible(false);
      return;
    }

    if (!currentSrc) {
      setCurrentSrc(src);
      return;
    }

    if (currentSrc === src) {
      return;
    }

    if (prefersReducedMotion) {
      setCurrentSrc(src);
      setIncomingSrc(null);
      setIncomingVisible(false);
      return;
    }

    setIncomingSrc(src);
    setIncomingVisible(false);

    const frame = window.requestAnimationFrame(() => setIncomingVisible(true));
    const timeout = window.setTimeout(() => {
      setCurrentSrc(src);
      setIncomingSrc(null);
      setIncomingVisible(false);
    }, 160);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [currentSrc, prefersReducedMotion, src]);

  return (
    <>
      <div
        className="absolute inset-0 scale-110"
        style={{
          backgroundImage: `url(${currentSrc})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
          filter: 'blur(24px)',
        }}
      />
      <div className="absolute inset-0 bg-black/10" />
      <img src={currentSrc} alt={alt} className="relative z-10 h-full w-full object-contain" />

      {incomingSrc && (
        <div className={`absolute inset-0 transition-opacity duration-150 ease-out ${incomingVisible ? 'opacity-100' : 'opacity-0'}`}>
          <div
            className="absolute inset-0 scale-110"
            style={{
              backgroundImage: `url(${incomingSrc})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              filter: 'blur(24px)',
            }}
          />
          <div className="absolute inset-0 bg-black/10" />
          <img src={incomingSrc} alt={alt} className="relative z-10 h-full w-full object-contain" />
        </div>
      )}
    </>
  );
}

function ExpandablePreviewDescriptionBlock({
  children,
  buttonStyle,
}: {
  children: React.ReactNode;
  buttonStyle?: React.CSSProperties;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) {
      return;
    }
    const checkOverflow = () => {
      setCanExpand(element.scrollHeight > element.clientHeight + 1);
    };
    checkOverflow();
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [expanded, children]);

  return (
    <div>
      <div
        ref={contentRef}
        className={`${expanded ? '' : 'max-h-[640px] overflow-hidden md:max-h-[860px]'}`.trim()}
      >
        {children}
      </div>
      {canExpand && (
        <button
          type="button"
          className="mt-3 text-sm font-medium"
          style={buttonStyle}
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}

function PreviewMobileCarousel({
  images,
  alt,
  activeIndex,
  onActiveIndexChange,
}: {
  images: string[];
  alt: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const width = container.clientWidth;
    if (!width) {
      return;
    }
    const targetLeft = activeIndex * width;
    if (Math.abs(container.scrollLeft - targetLeft) > 2) {
      container.scrollTo({ left: targetLeft, behavior: 'smooth' });
    }
  }, [activeIndex]);

  useEffect(() => () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      const width = container.clientWidth;
      if (!width) {
        return;
      }
      const nextIndex = Math.round(container.scrollLeft / width);
      if (nextIndex !== activeIndex) {
        onActiveIndexChange(nextIndex);
      }
    }, 120);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex h-full w-full snap-x snap-mandatory overflow-x-auto no-scrollbar scroll-smooth"
    >
      {images.map((image, index) => (
        <div key={`${image}-${index}`} className="relative h-full w-full shrink-0 snap-center overflow-hidden">
          <BlurredPreviewImage src={image} alt={`${alt} ${index + 1}`} />
        </div>
      ))}
    </div>
  );
}

type PreviewThumbnailRailProps = {
  images: string[];
  activeIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  orientation: 'horizontal' | 'vertical';
  visibleSlots: number;
  tokens: ReturnType<typeof getProductDetailColors>;
  thumbnailAspectRatio: string;
  className?: string;
  listClassName?: string;
  itemClassName?: string;
};

function PreviewThumbnailRail({
  images,
  activeIndex = 0,
  onActiveIndexChange,
  orientation,
  visibleSlots,
  tokens,
  thumbnailAspectRatio,
  className,
  listClassName,
  itemClassName,
}: PreviewThumbnailRailProps) {
  const [startIndex, setStartIndex] = useState(0);
  const hasOverflow = images.length > visibleSlots;
  const maxStartIndex = Math.max(0, images.length - visibleSlots);
  const isVertical = orientation === 'vertical';

  useEffect(() => {
    if (!hasOverflow) {
      if (startIndex !== 0) {
        setStartIndex(0);
      }
      return;
    }
    if (startIndex > maxStartIndex) {
      setStartIndex(maxStartIndex);
    }
  }, [hasOverflow, maxStartIndex, startIndex]);

  useEffect(() => {
    if (!hasOverflow) {
      return;
    }
    if (activeIndex < startIndex) {
      setStartIndex(activeIndex);
      return;
    }
    if (activeIndex >= startIndex + visibleSlots) {
      setStartIndex(Math.max(0, activeIndex - visibleSlots + 1));
    }
  }, [activeIndex, hasOverflow, startIndex, visibleSlots]);

  if (images.length <= 1) {
    return null;
  }

  const visibleImages = hasOverflow ? images.slice(startIndex, startIndex + visibleSlots) : images;
  const canScrollPrev = hasOverflow && activeIndex > 0;
  const canScrollNext = hasOverflow && activeIndex < images.length - 1;
  const railClassName = `${isVertical ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2'} ${className ?? ''}`.trim();
  const listClass = `${isVertical ? 'flex flex-col gap-2' : 'flex gap-2'} ${listClassName ?? ''}`.trim();
  const arrowClassName = 'h-8 w-8 rounded-full border flex items-center justify-center transition-colors disabled:opacity-40';
  const handlePrev = () => onActiveIndexChange?.(Math.max(0, activeIndex - 1));
  const handleNext = () => onActiveIndexChange?.(Math.min(images.length - 1, activeIndex + 1));

  return (
    <div className={railClassName}>
      {hasOverflow && (
        <button
          type="button"
          aria-label={isVertical ? 'Ảnh trước' : 'Ảnh trước'}
          disabled={!canScrollPrev}
          onClick={handlePrev}
          className={arrowClassName}
          style={{ borderColor: tokens.thumbnailBorder, color: tokens.thumbnailBorderActive, backgroundColor: tokens.surface }}
        >
          {isVertical ? <ChevronUp size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}
      <div className={listClass}>
        {visibleImages.map((img, index) => {
          const actualIndex = hasOverflow ? startIndex + index : index;
          const isActive = actualIndex === activeIndex;
          return (
            <button
              key={`${img}-${actualIndex}`}
              type="button"
              onClick={() => onActiveIndexChange?.(actualIndex)}
              className={`${itemClassName ?? 'w-20 rounded-lg'} overflow-hidden border-2`}
              style={{
                aspectRatio: thumbnailAspectRatio,
                borderColor: isActive ? tokens.thumbnailBorderActive : tokens.thumbnailBorder,
                backgroundColor: tokens.surfaceMuted,
              }}
            >
              <img src={img} alt="" className="h-full w-full object-contain" />
            </button>
          );
        })}
      </div>
      {hasOverflow && (
        <button
          type="button"
          aria-label={isVertical ? 'Ảnh kế tiếp' : 'Ảnh kế tiếp'}
          disabled={!canScrollNext}
          onClick={handleNext}
          className={arrowClassName}
          style={{ borderColor: tokens.thumbnailBorder, color: tokens.thumbnailBorderActive, backgroundColor: tokens.surface }}
        >
          {isVertical ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      )}
    </div>
  );
}

function VariantPreview({ tokens }: { tokens: ReturnType<typeof getProductDetailColors> }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold" style={{ color: tokens.metaText }}>Màu sắc</p>
        <div className="flex gap-2 mt-2">
          {['#111827', '#e11d48', '#0ea5e9'].map((color, index) => (
            <span
              key={color}
              className="h-6 w-6 rounded-full border"
              style={{
                backgroundColor: color,
                borderColor: index === 0 ? tokens.variantRing : tokens.border,
              }}
            />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold" style={{ color: tokens.metaText }}>Dung lượng</p>
        <div className="flex gap-2 mt-2">
          {['128GB', '256GB', '512GB'].map((value, index) => (
            <span
              key={value}
              className="px-3 py-1 rounded-full text-xs border"
              style={index === 1
                ? { backgroundColor: tokens.variantChipActiveBg, borderColor: tokens.variantChipActiveBorder, color: tokens.variantChipActiveText }
                : { borderColor: tokens.variantChipBorder, color: tokens.variantChipText }}
            >
              {value}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PreviewAttributesBadges({
  attributes,
  tokens,
  className = "grid grid-cols-2 gap-2 md:grid-cols-3 w-full mt-2 mb-2"
}: {
  attributes?: any[];
  tokens: any;
  className?: string;
}) {
  if (!attributes || attributes.length === 0) return null;

  // 1. Nhóm các term theo groupId
  const groupMap = new Map<string, { group: any; terms: Array<{ _id: string; name: string; slug: string }> }>();
  for (const term of attributes) {
    if (!term.group) continue;
    const groupId = term.group._id;
    if (!groupMap.has(groupId)) {
      groupMap.set(groupId, {
        group: term.group,
        terms: []
      });
    }
    const groupData = groupMap.get(groupId)!;
    groupData.terms.push({ _id: term._id, name: term.name, slug: term.slug });
  }

  const mergedGroups = Array.from(groupMap.values()).map(g => ({
    _id: g.terms.map(t => t._id).join('-'),
    group: g.group,
    terms: g.terms,
  }));

  const sortedGroups = mergedGroups.sort((a, b) => (a.group.order ?? 9999) - (b.group.order ?? 9999));

  return (
    <div className={className}>
      {sortedGroups.map((groupItem) => {
        const IconComponent = getAttributeIconComponent(groupItem.group.iconPath);
        const valuesStr = groupItem.terms.map(t => t.name).join(', ');

        return (
          <div
            key={groupItem._id}
            className="flex items-center gap-1.5 text-xs font-medium py-1 px-2 rounded-lg border min-w-0"
            style={{
              borderColor: tokens.border || '#e2e8f0',
              backgroundColor: tokens.surface || '#ffffff',
              color: tokens.bodyText || '#334155'
            }}
          >
            <span style={{ color: tokens.primary }} className="flex shrink-0 items-center justify-center">
              <IconComponent size={14} />
            </span>
            <span className="truncate" title={`${groupItem.group.name}: ${valuesStr}`}>
              <span className="opacity-60 font-normal uppercase text-[10px] mr-1">{groupItem.group.name}:</span>
              <span className="font-semibold">{valuesStr}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}


export function ProductDetailPreview({
  layoutStyle,
  showRating,
  showComments,
  showCommentLikes,
  showCommentReplies,
  showWishlist,
  showShare,
  showAddToCart,
  showBuyNow,
  showVariants = true,
  showAllProductImagesSection = false,
  enableImageLightbox = false,
  showHighlights,
  classicHighlights = [],
  premiumBannerItems,
  premiumBannerBg = 'primary',
  premiumBannerText = 'white',
  showPremiumBanner = true,
  heroStyle = 'full',
  contentWidth = 'medium',
  imageAspectRatio,
  device = 'desktop',
  brandColor = '#06b6d4',
  secondaryColor,
  colorMode = 'single',
  relatedProductsMode = 'fixed',
  relatedProductsPerPage = 8,
  enableCombos = true,
  comboAnimateType = 'none',
  comboEffectColor = 'gradient-1',
  accentColors,
  showSocialButtons = false,
  socialButtons = [],
  demoAttributes = [],
  zaloText = 'MUA QUA ZALO',
  zaloIcon = 'Send',
  phoneText = 'GỌI TƯ VẤN',
  phoneIcon = 'Phone',
  mobileFontSize = 'xs',
  priceLeftIcon = 'Award',
  priceRightIcon = 'Gift',
  showPriceLeftIcon = true,
  showPriceRightIcon = true,
}: ProductDetailPreviewProps) {
  const tokens = getProductDetailColors(brandColor, secondaryColor, colorMode);
  const categoryBadgeColors = resolveProductDetailElementColor(accentColors?.categoryBadge ?? 'secondary', tokens);
  const discountBadgeColors = resolveProductDetailElementColor(accentColors?.discountBadge ?? 'primary', tokens);
  const primaryButtonColors = resolveProductDetailElementColor(accentColors?.primaryButton ?? 'primary', tokens);
  const comboBadgeColors = resolveProductDetailElementColor(accentColors?.comboBadge ?? 'black', tokens);
  const isMobile = device === 'mobile';
  const isDesktop = device === 'desktop';
  const isTablet = device === 'tablet';
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [mainImageHeight, setMainImageHeight] = useState<number | null>(null);
  const [premiumAttrRef, premiumAttrApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    loop: false
  });
  const [canScrollAttrPrev, setCanScrollAttrPrev] = useState(false);
  const [canScrollAttrNext, setCanScrollAttrNext] = useState(false);
  const [activeAttrModal, setActiveAttrModal] = useState<{ title: string; value: string } | null>(null);

  useEffect(() => {
    if (!premiumAttrApi) return;
    const onSelect = () => {
      setCanScrollAttrPrev(premiumAttrApi.canScrollPrev());
      setCanScrollAttrNext(premiumAttrApi.canScrollNext());
    };
    premiumAttrApi.on('select', onSelect);
    premiumAttrApi.on('reInit', onSelect);
    onSelect();
  }, [premiumAttrApi]);
  const mainImageRef = useRef<HTMLDivElement>(null);
  const mainImageHeightRef = useRef<number | null>(null);
  const productName = 'iPhone 15 Pro Max 256GB';
  const categoryName = 'Điện thoại';
  const sku = 'IP15PM-256';
  const stock = 12;
  const price = 34990000;
  const originalPrice = 36990000;
  const rating = 4.8;
  const reviews = 234;
  const hasRatingData = reviews > 0 && rating > 0;
  const discountPercent = Math.round((1 - price / originalPrice) * 100);
  const stockStatus = stock > 10
    ? { label: 'Còn hàng', color: tokens.stockSuccessText }
    : stock > 0
      ? { label: `Chỉ còn ${stock} sản phẩm`, color: tokens.stockWarningText }
      : { label: 'Hết hàng', color: tokens.stockDangerText };
  const stockBadge = (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{
        borderColor: tokens.quantityBorder,
        backgroundColor: tokens.surface,
        color: stockStatus.color,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stockStatus.color }} />
      {stockStatus.label}
    </span>
  );
  const fallbackHighlights = [
    { icon: 'Star', text: 'Chip A17 Pro mạnh mẽ' },
    { icon: 'Star', text: 'Camera 48MP chuyên nghiệp' },
    { icon: 'Star', text: 'Titanium siêu bền' },
  ];
  const highlightItems = classicHighlights.length > 0 ? classicHighlights : fallbackHighlights;
  const showHighlightBlock = showHighlights && highlightItems.length > 0;
  const relatedCount = relatedProductsMode === 'fixed' ? 4 : relatedProductsPerPage;
  const relatedItems = Array.from({ length: relatedCount }).map((_, index) => ({
    name: `Sản phẩm ${index + 1}`,
    price: formatVND(1250000 + index * 100000),
    image: PREVIEW_IMAGES[index % PREVIEW_IMAGES.length],
  }));
  const contentWidthClass = contentWidth === 'narrow'
    ? 'max-w-4xl'
    : contentWidth === 'wide'
      ? 'max-w-7xl'
      : 'max-w-6xl';
  const imageFrame = getProductImageFrameConfig(imageAspectRatio, layoutStyle);
  const mainImageFrameStyle: React.CSSProperties = { aspectRatio: imageFrame.frameAspectRatio };
  const thumbnailFrameStyle: React.CSSProperties = { aspectRatio: imageFrame.thumbnailAspectRatio };
  const relatedImageFrameStyle: React.CSSProperties = { aspectRatio: imageFrame.frameAspectRatio };
  const heroContainerClass = heroStyle === 'full'
    ? 'border rounded-2xl'
    : heroStyle === 'split'
      ? 'border rounded-2xl'
      : 'border rounded-xl';
  const heroContainerStyle = heroStyle === 'full'
    ? { borderColor: tokens.border, backgroundColor: tokens.surfaceMuted }
    : { borderColor: tokens.border, backgroundColor: tokens.surface };
  const heroImageWrapperClass = heroStyle === 'split'
    ? 'relative flex items-center justify-center p-6'
    : heroStyle === 'minimal'
      ? 'relative flex items-center justify-center p-3'
      : 'relative flex items-center justify-center p-6';
  const verticalVisibleSlots = mainImageHeight
    ? getVerticalThumbnailSlots({
      frameHeight: mainImageHeight,
      thumbnailWidth: 80,
      thumbnailAspectRatio: imageFrame.thumbnailAspectRatio,
      gap: 8,
      arrowHeight: 32,
      imageCount: PREVIEW_IMAGES.length,
      minSlots: 1,
    })
    : 6;
  const canOpenLightbox = enableImageLightbox && PREVIEW_IMAGES.length > 0;

  const openLightboxAt = (index: number) => {
    if (!canOpenLightbox) {
      return;
    }
    setLightboxIndex(index);
  };

  const handleLightboxKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canOpenLightbox) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openLightboxAt(activeImageIndex);
    }
  };

  useEffect(() => {
    preloadNeighborImages(PREVIEW_IMAGES, activeImageIndex);
  }, [activeImageIndex]);

  useEffect(() => {
    const element = mainImageRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const nextHeight = Math.round(entries[0]?.contentRect?.height ?? 0);
      if (!nextHeight || nextHeight === mainImageHeightRef.current) {
        return;
      }
      mainImageHeightRef.current = nextHeight;
      setMainImageHeight(nextHeight);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [layoutStyle]);

  const renderHighlights = () => (
    <div className="grid grid-cols-3 gap-4 p-4 rounded-xl" style={{ backgroundColor: tokens.highlightBg }}>
      {highlightItems.map((item, index) => {
        const Icon = CLASSIC_HIGHLIGHT_ICON_MAP[item.icon] ?? Star;
        return (
          <div key={`${item.icon}-${index}`} className="text-center">
            <Icon size={24} className="mx-auto mb-2" style={{ color: tokens.highlightIcon }} />
            <p className="text-xs" style={{ color: tokens.highlightText }}>{item.text}</p>
          </div>
        );
      })}
    </div>
  );

  const renderPreviewDescriptionImages = () => {
    if (!showAllProductImagesSection || PREVIEW_IMAGES.length === 0) {
      return null;
    }

    return (
      <div className="mt-6 border-t pt-6" style={{ borderColor: tokens.divider }}>
        <h4 className="text-base font-semibold" style={{ color: tokens.headingColor }}>Toàn bộ ảnh sản phẩm</h4>
        <p className="mt-1 text-xs" style={{ color: tokens.metaText }}>Lăn để xem chi tiết ảnh sản phẩm.</p>
        <div className="mt-3 space-y-4">
          {PREVIEW_IMAGES.map((image, index) => (
            <div
              key={`${image}-${index}`}
              className="w-full overflow-hidden rounded-2xl"
              style={{ ...mainImageFrameStyle, backgroundColor: tokens.surfaceMuted }}
            >
              <img src={image} alt={`${productName} ${index + 1}`} className="h-full w-full object-contain" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="py-6 px-4 min-h-[300px]">
      <div className="max-w-6xl mx-auto">
        {layoutStyle === 'classic' && (
          <>
            <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-8'}`}>
            <div className="space-y-3">
              <div className={imageFrame.frameWidthClassName}>
                <div
                  className={`relative rounded-xl overflow-hidden ${canOpenLightbox ? 'cursor-zoom-in' : ''}`.trim()}
                  style={{ ...mainImageFrameStyle, backgroundColor: tokens.surfaceMuted }}
                  role={canOpenLightbox ? 'button' : undefined}
                  tabIndex={canOpenLightbox ? 0 : -1}
                  onClick={canOpenLightbox ? () => openLightboxAt(activeImageIndex) : undefined}
                  onKeyDown={handleLightboxKeyDown}
                >
                  {PREVIEW_IMAGES.length > 0 ? (
                    <>
                      {isMobile ? (
                        <PreviewMobileCarousel
                          images={PREVIEW_IMAGES}
                          alt={productName}
                          activeIndex={activeImageIndex}
                          onActiveIndexChange={setActiveImageIndex}
                        />
                      ) : (
                        <BlurredPreviewImage src={PREVIEW_IMAGES[activeImageIndex]} alt={productName} />
                      )}
                      {isMobile && PREVIEW_IMAGES.length > 1 && (
                        <span className="absolute bottom-3 right-3 px-2 py-0.5 text-[11px] font-semibold rounded-full backdrop-blur-sm" style={{ backgroundColor: tokens.surface, color: tokens.headingColor }}>
                          {activeImageIndex + 1}/{PREVIEW_IMAGES.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-32 h-32 rounded-lg" style={{ backgroundColor: tokens.surfaceSoft }} />
                    </div>
                  )}
                </div>
              </div>
              {PREVIEW_IMAGES.length > 1 && (
                <>
                  {isTablet && (
                    <div className="grid grid-cols-4 gap-2">
                      {PREVIEW_IMAGES.slice(0, 4).map((img, index) => (
                        <div
                          key={img}
                          className="rounded-lg border-2 overflow-hidden relative"
                          style={{
                            ...thumbnailFrameStyle,
                            borderColor: index === 0 ? tokens.thumbnailBorderActive : tokens.thumbnailBorder,
                            backgroundColor: tokens.surfaceMuted,
                          }}
                        >
                          <img src={img} alt="" className="h-full w-full object-contain" />
                        </div>
                      ))}
                    </div>
                  )}
                  {isDesktop && (
                    <PreviewThumbnailRail
                      images={PREVIEW_IMAGES}
                      activeIndex={activeImageIndex}
                      orientation="horizontal"
                      visibleSlots={6}
                      tokens={tokens}
                      thumbnailAspectRatio={imageFrame.thumbnailAspectRatio}
                      onActiveIndexChange={setActiveImageIndex}
                      itemClassName="w-20 rounded-lg"
                    />
                  )}
                </>
              )}
            </div>
            <div className="space-y-3 md:space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] md:text-xs font-semibold"
                    style={{
                      backgroundColor: categoryBadgeColors.bg,
                      color: categoryBadgeColors.text,
                      borderColor: categoryBadgeColors.border,
                      borderWidth: 1,
                    }}
                  >
                    {categoryName}
                  </span>
                  {stockBadge}
                </div>
                <h1 className="text-lg md:text-2xl font-bold" style={{ color: tokens.headingColor }}>{productName}</h1>
                {showRating && hasRatingData && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          style={i < Math.floor(rating)
                            ? { color: RATING_STAR_ACTIVE_COLOR, fill: RATING_STAR_ACTIVE_COLOR }
                            : { color: tokens.ratingStarInactive }}
                        />
                      ))}
                    </div>
                    <span className="text-sm" style={{ color: tokens.ratingText }}>{rating} ({reviews} đánh giá)</span>
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row md:items-end gap-1 md:gap-3">
                <span className="text-xl font-bold" style={{ color: tokens.priceColor }}>{formatVND(price)}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm md:text-lg line-through italic" style={{ color: tokens.priceOriginalText }}>{formatVND(originalPrice)}</span>
                  <span className="px-2 py-0.5 text-xs md:text-sm font-medium rounded" style={{ backgroundColor: discountBadgeColors.bg, color: discountBadgeColors.text }}>-{Math.round((1 - price / originalPrice) * 100)}%</span>
                </div>
              </div>
              {showVariants && <VariantPreview tokens={tokens} />}
              {demoAttributes && demoAttributes.length > 0 && (
                <div className="mt-2 mb-2">
                  <PreviewAttributesBadges attributes={demoAttributes} tokens={tokens} />
                </div>
              )}

              {enableCombos && (
                <PreviewCombosBlock
                  combos={MOCK_COMBOS}
                  comboProductsMap={MOCK_PRODUCTS_MAP}
                  tokens={tokens}
                  comboAnimateType={comboAnimateType}
                  comboEffectColor={comboEffectColor}
                  comboBadgeColors={comboBadgeColors}
                  currentProductName={productName}
                  currentProductImage={PREVIEW_IMAGES[0]}
                />
              )}

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center border rounded-lg" style={{ borderColor: tokens.quantityBorder }}>
                  <button className="p-3" disabled>
                    <Minus size={18} style={{ color: tokens.quantityIconMuted }} />
                  </button>
                  <span className="w-12 text-center font-medium" style={{ color: tokens.quantityText }}>1</span>
                  <button className="p-3" disabled>
                    <Plus size={18} style={{ color: tokens.quantityIconMuted }} />
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  {showAddToCart && (
                    <button className="py-3.5 px-8 rounded-xl font-semibold flex items-center justify-center gap-2" style={{ backgroundColor: primaryButtonColors.bg, color: primaryButtonColors.text }}>
                      <ShoppingCart size={20} />
                      Thêm vào giỏ hàng
                    </button>
                  )}
                  {showBuyNow && (
                    <button
                      className="py-3.5 px-8 rounded-xl font-semibold flex items-center justify-center gap-2 border transition-all cursor-pointer bg-[var(--cta-secondary-bg)] shadow-sm hover:bg-[var(--cta-secondary-hover-bg)] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cta-secondary-ring)]"
                      style={{
                        borderColor: primaryButtonColors.border,
                        color: primaryButtonColors.text,
                        '--cta-secondary-bg': primaryButtonColors.bg,
                        '--cta-secondary-hover-bg': primaryButtonColors.bg,
                        '--cta-secondary-ring': tokens.inputRing,
                      } as React.CSSProperties}
                    >
                      Mua ngay
                    </button>
                  )}
                </div>

                {showWishlist && (
                  <button className="p-3.5 rounded-xl border" style={{ borderColor: tokens.wishlistBorder, backgroundColor: tokens.wishlistBg }}>
                    <Heart size={20} style={{ color: tokens.wishlistIcon }} />
                  </button>
                )}
                {showShare && (
                  <button className="p-3.5 rounded-xl border" style={{ borderColor: tokens.shareBorder, backgroundColor: tokens.shareBg }}>
                    <Share2 size={20} style={{ color: tokens.shareIcon }} />
                  </button>
                )}
              </div>

              {showSocialButtons && (
                <PreviewSocialButtons
                  buttons={socialButtons}
                  tokens={tokens}
                />
              )}

              {showHighlightBlock && renderHighlights()}
            </div>
          </div>

          <div className="border-t pt-6 mt-8 md:mt-12" style={{ borderColor: tokens.divider }}>
            <h3 className="font-semibold mb-4" style={{ color: tokens.headingColor }}>Mô tả sản phẩm</h3>
            <ExpandablePreviewDescriptionBlock buttonStyle={{ color: tokens.primary }}>
              <div className="prose prose-sm max-w-none" style={{ color: tokens.bodyText }}>
                {PREVIEW_DESCRIPTION}
              </div>
              {renderPreviewDescriptionImages()}
            </ExpandablePreviewDescriptionBlock>
          </div>

          <CommentsPreview
            showComments={showComments}
            showLikes={showCommentLikes}
            showReplies={showCommentReplies}
            brandColor={brandColor}
          />
          </>
        )}

        {layoutStyle === 'modern' && (
          <div className="space-y-5">
            <header className="border-b pb-3" style={{ borderColor: tokens.divider }}>
              <div className="flex items-center justify-between gap-4 text-sm" style={{ color: tokens.breadcrumbText }}>
                <div className={`${isMobile ? 'flex items-center gap-1 text-[11px]' : 'flex items-center gap-2'} truncate`}>
                  {isMobile ? (
                    <>
                      <span>{categoryName}</span>
                      <ChevronRight size={10} />
                      <span className="truncate" style={{ color: tokens.breadcrumbActive }}>{productName}</span>
                    </>
                  ) : (
                    <>
                      <span>Trang chủ</span>
                      <ChevronRight size={14} />
                      <span>Sản phẩm</span>
                      <ChevronRight size={14} />
                      <span className="truncate" style={{ color: tokens.breadcrumbActive }}>{productName}</span>
                    </>
                  )}
                </div>
                {showWishlist && (
                  <button className="inline-flex items-center gap-2 text-sm" style={{ color: tokens.metaText }}>
                    <Heart size={16} style={{ color: tokens.wishlistIcon }} />
                    Yêu thích
                  </button>
                )}
              </div>
            </header>

            <div className="grid md:grid-cols-2 gap-5 md:gap-6 lg:gap-10">
              <div className="space-y-3 md:space-y-4">
                {heroStyle === 'split' ? (
                  <div className={`overflow-hidden ${heroContainerClass}`} style={heroContainerStyle}>
                    <div className="grid md:grid-cols-2 gap-3 items-center p-3 md:p-5">
                      <div className={imageFrame.frameWidthClassName}>
                    <div
                      className={`relative rounded-xl overflow-hidden ${canOpenLightbox ? 'cursor-zoom-in' : ''}`.trim()}
                      style={{ ...mainImageFrameStyle, backgroundColor: tokens.surfaceMuted }}
                      role={canOpenLightbox ? 'button' : undefined}
                      tabIndex={canOpenLightbox ? 0 : -1}
                      onClick={canOpenLightbox ? () => openLightboxAt(activeImageIndex) : undefined}
                      onKeyDown={handleLightboxKeyDown}
                    >
                      {discountPercent > 0 && (
                        <span
                          className="absolute left-3 top-3 z-30 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: discountBadgeColors.bg, color: discountBadgeColors.text }}>
                          -{discountPercent}%
                        </span>
                      )}
                      {PREVIEW_IMAGES.length > 0 ? (
                        <>
                          {isMobile ? (
                            <PreviewMobileCarousel
                              images={PREVIEW_IMAGES}
                              alt={productName}
                              activeIndex={activeImageIndex}
                              onActiveIndexChange={setActiveImageIndex}
                            />
                          ) : (
                            <BlurredPreviewImage src={PREVIEW_IMAGES[activeImageIndex]} alt={productName} />
                          )}
                          {isMobile && (
                            <span className="absolute bottom-3 right-3 px-2 py-0.5 text-[11px] font-semibold rounded-full backdrop-blur-sm" style={{ backgroundColor: tokens.surface, color: tokens.headingColor }}>
                              {activeImageIndex + 1}/{PREVIEW_IMAGES.length}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-32 h-32 rounded-lg" style={{ backgroundColor: tokens.surfaceSoft }} />
                        </div>
                      )}
                    </div>
                  </div>
                    </div>
                  </div>
                ) : (
                  <div className={`overflow-hidden ${heroContainerClass}`} style={heroContainerStyle}>
                    <div className={heroImageWrapperClass}>
                  <div className={`${imageFrame.frameWidthClassName} overflow-hidden`}>
                    <div
                      className={`relative overflow-hidden rounded-xl ${canOpenLightbox ? 'cursor-zoom-in' : ''}`.trim()}
                      style={{ ...mainImageFrameStyle, backgroundColor: tokens.surfaceMuted }}
                      role={canOpenLightbox ? 'button' : undefined}
                      tabIndex={canOpenLightbox ? 0 : -1}
                      onClick={canOpenLightbox ? () => openLightboxAt(activeImageIndex) : undefined}
                      onKeyDown={handleLightboxKeyDown}
                    >
                      {discountPercent > 0 && (
                        <span
                          className="absolute left-3 top-3 z-30 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: discountBadgeColors.bg, color: discountBadgeColors.text }}>
                          -{discountPercent}%
                        </span>
                      )}
                      {PREVIEW_IMAGES.length > 0 ? (
                        <>
                          {isMobile ? (
                            <PreviewMobileCarousel
                              images={PREVIEW_IMAGES}
                              alt={productName}
                              activeIndex={activeImageIndex}
                              onActiveIndexChange={setActiveImageIndex}
                            />
                          ) : (
                            <BlurredPreviewImage src={PREVIEW_IMAGES[activeImageIndex]} alt={productName} />
                          )}
                          {isMobile && (
                            <span className="absolute bottom-3 right-3 px-2 py-0.5 text-[11px] font-semibold rounded-full backdrop-blur-sm" style={{ backgroundColor: tokens.surface, color: tokens.headingColor }}>
                              {activeImageIndex + 1}/{PREVIEW_IMAGES.length}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="w-40 h-40 rounded-xl" style={{ backgroundColor: tokens.surfaceSoft }} />
                      )}
                    </div>
                  </div>
                </div>
                  </div>
                )}

                {heroStyle !== 'minimal' && PREVIEW_IMAGES.length > 1 && (
                  <>
                    {isDesktop && (
                      <PreviewThumbnailRail
                        images={PREVIEW_IMAGES}
                        activeIndex={activeImageIndex}
                        orientation="horizontal"
                        visibleSlots={5}
                        tokens={tokens}
                        thumbnailAspectRatio={imageFrame.thumbnailAspectRatio}
                        onActiveIndexChange={setActiveImageIndex}
                        itemClassName="w-20 rounded-xl"
                      />
                    )}
                  </>
                )}
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: categoryBadgeColors.bg,
                      color: categoryBadgeColors.text,
                      borderColor: categoryBadgeColors.border,
                      borderWidth: 1,
                    }}
                  >
                    {categoryName}
                  </span>
                  {stockBadge}
                </div>

                <h1 className="text-lg md:text-3xl font-light tracking-tight" style={{ color: tokens.headingColor }}>{productName}</h1>

                {showRating && hasRatingData && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: tokens.ratingText }}>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          style={star <= Math.round(rating)
                            ? { color: RATING_STAR_ACTIVE_COLOR, fill: RATING_STAR_ACTIVE_COLOR }
                            : { color: tokens.ratingStarInactive }}
                        />
                      ))}
                    </div>
                    <span>{rating} ({reviews})</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-xl md:text-3xl font-light" style={{ color: tokens.priceColor }}>{formatVND(price)}</span>
                    <span className="text-base line-through" style={{ color: tokens.priceOriginalText }}>{formatVND(originalPrice)}</span>
                  </div>
                </div>

                {showVariants && <VariantPreview tokens={tokens} />}
                {demoAttributes && demoAttributes.length > 0 && (
                  <div className="mt-2 mb-2">
                    <PreviewAttributesBadges attributes={demoAttributes} tokens={tokens} />
                  </div>
                )}

                <div className="h-px w-full" style={{ backgroundColor: tokens.divider }} />

                {enableCombos && (
                  <PreviewCombosBlock
                    combos={MOCK_COMBOS}
                    comboProductsMap={MOCK_PRODUCTS_MAP}
                    tokens={tokens}
                    comboAnimateType={comboAnimateType}
                    comboEffectColor={comboEffectColor}
                    comboBadgeColors={comboBadgeColors}
                    currentProductName={productName}
                    currentProductImage={PREVIEW_IMAGES[0]}
                  />
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" style={{ color: tokens.bodyText }}>Số lượng</label>
                  <div className="flex items-center gap-3">
                    <button type="button" className="h-10 w-10 border rounded-full flex items-center justify-center" style={{ borderColor: tokens.quantityBorder }}>
                      <Minus className="w-4 h-4" style={{ color: tokens.quantityIcon }} />
                    </button>
                    <div className="w-16 text-center">
                      <span className="text-lg font-medium" style={{ color: tokens.quantityText }}>1</span>
                    </div>
                    <button type="button" className="h-10 w-10 border rounded-full flex items-center justify-center" style={{ borderColor: tokens.quantityBorder }}>
                      <Plus className="w-4 h-4" style={{ color: tokens.quantityIcon }} />
                    </button>
                  </div>
                </div>

                {(showAddToCart || showBuyNow || showWishlist) && (
                  <div className="space-y-2.5">
                    {showAddToCart && (
                      <button className="w-full h-12 text-base font-semibold" style={{ backgroundColor: primaryButtonColors.bg, color: primaryButtonColors.text }}>
                        <ShoppingBag className="w-5 h-5 mr-2 inline-block" />
                        Thêm vào giỏ hàng
                      </button>
                    )}
                    {showBuyNow && (
                      <button
                        className="w-full h-12 text-base font-semibold border transition-all cursor-pointer bg-[var(--cta-secondary-bg)] shadow-sm hover:bg-[var(--cta-secondary-hover-bg)] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cta-secondary-ring)]"
                        style={{
                          borderColor: primaryButtonColors.border,
                          color: primaryButtonColors.text,
                          '--cta-secondary-bg': primaryButtonColors.bg,
                          '--cta-secondary-hover-bg': primaryButtonColors.bg,
                          '--cta-secondary-ring': tokens.inputRing,
                        } as React.CSSProperties}
                      >
                        Mua ngay
                      </button>
                    )}
                    {showWishlist && (
                      <button className="w-full h-12 text-base border" style={{ borderColor: tokens.wishlistBorder, color: tokens.metaText, backgroundColor: tokens.wishlistBg }}>
                        <Heart className="w-5 h-5 mr-2 inline-block" style={{ color: tokens.wishlistIcon }} />
                        Thêm vào yêu thích
                      </button>
                    )}
                  </div>
                )}

                {showSocialButtons && (
                  <PreviewSocialButtons
                    buttons={socialButtons}
                    tokens={tokens}
                  />
                )}

                {showHighlightBlock && renderHighlights()}
              </div>
            </div>

            <div className="mt-8 md:mt-12 space-y-6">
              <div className="border rounded-2xl p-6" style={{ borderColor: tokens.border }}>
                <ExpandablePreviewDescriptionBlock buttonStyle={{ color: tokens.primary }}>
                  <div className="prose prose-sm max-w-none" style={{ color: tokens.bodyText }}>
                    {PREVIEW_DESCRIPTION}
                  </div>
                  {renderPreviewDescriptionImages()}
                </ExpandablePreviewDescriptionBlock>
              </div>

              <CommentsPreview
                showComments={showComments}
                showLikes={showCommentLikes}
                showReplies={showCommentReplies}
                brandColor={brandColor}
              />
            </div>
          </div>
        )}

        {layoutStyle === 'minimal' && (
          <div className={`space-y-5 ${contentWidthClass} mx-auto`}>
            <div className={`${isMobile ? 'flex items-center gap-1 text-[11px]' : 'text-xs flex items-center gap-2'}`} style={{ color: tokens.breadcrumbText }}>
              {isMobile ? (
                <>
                  <span>{categoryName}</span>
                  <ChevronRight size={10} />
                  <span className="truncate max-w-[180px]" style={{ color: tokens.breadcrumbActive }}>{productName}</span>
                </>
              ) : (
                <>
                  <span>Trang chủ</span>
                  <ChevronRight size={12} />
                  <span>Sản phẩm</span>
                  <ChevronRight size={12} />
                  <span className="truncate max-w-[160px]" style={{ color: tokens.breadcrumbActive }}>{productName}</span>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              <div className="lg:col-span-7">
                <div className="flex flex-col-reverse md:flex-row gap-3 md:gap-4 items-start">
                  {PREVIEW_IMAGES.length > 1 && isDesktop && (
                    <div className="hidden md:flex md:flex-col md:w-20 shrink-0">
                      <PreviewThumbnailRail
                        images={PREVIEW_IMAGES}
                        activeIndex={activeImageIndex}
                        orientation="vertical"
                        visibleSlots={verticalVisibleSlots}
                        tokens={tokens}
                        thumbnailAspectRatio={imageFrame.thumbnailAspectRatio}
                        onActiveIndexChange={setActiveImageIndex}
                        itemClassName="w-20 rounded-sm"
                      />
                    </div>
                  )}

                  <div className={`flex-1 ${imageFrame.frameWidthClassName}`}>
                    <div
                      ref={mainImageRef}
                      className={`relative w-full rounded-sm overflow-hidden ${canOpenLightbox ? 'cursor-zoom-in' : ''}`.trim()}
                      style={{ ...mainImageFrameStyle, backgroundColor: tokens.surfaceMuted }}
                      role={canOpenLightbox ? 'button' : undefined}
                      tabIndex={canOpenLightbox ? 0 : -1}
                      onClick={canOpenLightbox ? () => openLightboxAt(activeImageIndex) : undefined}
                      onKeyDown={handleLightboxKeyDown}
                    >
                      {discountPercent > 0 && (
                        <span
                          className="absolute left-3 top-3 z-30 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                          style={{ backgroundColor: discountBadgeColors.bg, color: discountBadgeColors.text }}>
                          -{discountPercent}%
                        </span>
                      )}
                      {PREVIEW_IMAGES.length > 0 ? (
                        <>
                          {isMobile ? (
                            <PreviewMobileCarousel
                              images={PREVIEW_IMAGES}
                              alt={productName}
                              activeIndex={activeImageIndex}
                              onActiveIndexChange={setActiveImageIndex}
                            />
                          ) : (
                            <BlurredPreviewImage src={PREVIEW_IMAGES[activeImageIndex]} alt={productName} />
                          )}
                          {isMobile && (
                            <span className="absolute bottom-3 right-3 px-2 py-0.5 text-[11px] font-semibold rounded-full backdrop-blur-sm" style={{ backgroundColor: tokens.surface, color: tokens.headingColor }}>
                                {activeImageIndex + 1}/{PREVIEW_IMAGES.length}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-32 h-32 rounded-lg" style={{ backgroundColor: tokens.surfaceSoft }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 px-0 md:px-2 py-2 lg:py-0 flex flex-col justify-center">
                <div className="mb-3 md:mb-5 space-y-2 md:space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] md:text-xs font-semibold"
                      style={{
                        backgroundColor: categoryBadgeColors.bg,
                        color: categoryBadgeColors.text,
                        borderColor: categoryBadgeColors.border,
                        borderWidth: 1,
                      }}
                    >
                      {categoryName}
                    </span>
                    {stockBadge}
                  </div>
                  <h1 className="text-xl md:text-3xl lg:text-[2rem] font-medium leading-tight tracking-tight" style={{ color: tokens.headingColor }}>{productName}</h1>
                  {showRating && hasRatingData && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: tokens.ratingText }}>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={14}
                            style={star <= Math.round(rating)
                              ? { color: RATING_STAR_ACTIVE_COLOR, fill: RATING_STAR_ACTIVE_COLOR }
                              : { color: tokens.ratingStarInactive }}
                          />
                        ))}
                      </div>
                      <span>{rating} ({reviews})</span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <p className="text-lg md:text-2xl font-semibold" style={{ color: tokens.priceColor }}>
                      {formatVND(price)}
                    </p>
                    <span className="text-sm md:text-base line-through" style={{ color: tokens.priceOriginalText }}>
                      {formatVND(originalPrice)}
                    </span>
                  </div>
                  <div className="mt-3 md:mt-4">
                    {showVariants && <VariantPreview tokens={tokens} />}
                    {demoAttributes && demoAttributes.length > 0 && (
                      <div className="mt-2 mb-2">
                        <PreviewAttributesBadges attributes={demoAttributes} tokens={tokens} />
                      </div>
                    )}
                  </div>
                </div>

                {enableCombos && (
                  <PreviewCombosBlock
                    combos={MOCK_COMBOS}
                    comboProductsMap={MOCK_PRODUCTS_MAP}
                    tokens={tokens}
                    comboAnimateType={comboAnimateType}
                    comboEffectColor={comboEffectColor}
                    comboBadgeColors={comboBadgeColors}
                    currentProductName={productName}
                    currentProductImage={PREVIEW_IMAGES[0]}
                  />
                )}

                {(showAddToCart || showBuyNow || showWishlist) && (
                  <div className="flex flex-col gap-2.5 md:gap-3 mb-4 md:mb-5 border-t pt-4 md:pt-5" style={{ borderColor: tokens.divider }}>
                    <div className="flex gap-4">
                      {showAddToCart && (
                        <button className="flex-1 h-14 uppercase tracking-wider text-sm font-medium" style={{ backgroundColor: primaryButtonColors.bg, color: primaryButtonColors.text }}>
                          Thêm vào giỏ
                        </button>
                      )}
                      {showWishlist && (
                        <button className="w-14 h-14 border flex items-center justify-center" style={{ borderColor: tokens.wishlistBorder, backgroundColor: tokens.wishlistBg }}>
                          <Heart size={20} style={{ color: tokens.wishlistIcon }} />
                        </button>
                      )}
                    </div>
                    {showBuyNow && (
                      <button
                        className="h-12 uppercase tracking-wider text-xs font-medium border transition-all cursor-pointer bg-[var(--cta-secondary-bg)] shadow-sm hover:bg-[var(--cta-secondary-hover-bg)] hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--cta-secondary-ring)]"
                        style={{
                          borderColor: primaryButtonColors.border,
                          color: primaryButtonColors.text,
                          '--cta-secondary-bg': primaryButtonColors.bg,
                          '--cta-secondary-hover-bg': primaryButtonColors.bg,
                          '--cta-secondary-ring': tokens.inputRing,
                        } as React.CSSProperties}
                      >
                        Mua ngay
                      </button>
                    )}
                  </div>
                )}

                {showSocialButtons && (
                  <PreviewSocialButtons
                    buttons={socialButtons}
                    tokens={tokens}
                  />
                )}

                {showHighlightBlock && renderHighlights()}

                <div className="space-y-4 text-sm font-light" style={{ color: tokens.metaText }}>
                  <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: tokens.divider }}>
                    <span>SKU</span>
                    <span className="font-mono" style={{ color: tokens.bodyText }}>{sku}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border px-6 py-8" style={{ borderColor: tokens.border }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: tokens.headingColor }}>Mô tả sản phẩm</h2>
              <ExpandablePreviewDescriptionBlock buttonStyle={{ color: tokens.primary }}>
                <div className="leading-relaxed" style={{ color: tokens.bodyText }}>
                  {PREVIEW_DESCRIPTION}
                </div>
                {renderPreviewDescriptionImages()}
              </ExpandablePreviewDescriptionBlock>
            </div>

            <CommentsPreview
              showComments={showComments}
              showLikes={showCommentLikes}
              showReplies={showCommentReplies}
              brandColor={brandColor}
            />

            <section className="mt-12 pt-8 border-t" style={{ borderColor: tokens.divider }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold" style={{ color: tokens.headingColor }}>Sản phẩm liên quan</h2>
                <span className="text-xs" style={{ color: tokens.metaText }}>
                  {relatedProductsMode === 'fixed' && '4 sản phẩm'}
                  {relatedProductsMode === 'infiniteScroll' && `Cuộn vô hạn · ${relatedProductsPerPage}/lần`}
                  {relatedProductsMode === 'pagination' && `Phân trang · ${relatedProductsPerPage}/trang`}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {relatedItems.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rounded-xl border overflow-hidden" style={{ borderColor: tokens.relatedCardBorder, backgroundColor: tokens.relatedCardBg }}>
                    <div className="overflow-hidden" style={{ ...relatedImageFrameStyle, backgroundColor: tokens.surfaceMuted }}>
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium line-clamp-2" style={{ color: tokens.relatedTitle }}>{item.name}</p>
                      <p className="text-xs font-semibold mt-2" style={{ color: tokens.relatedPrice }}>{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              {relatedProductsMode === 'infiniteScroll' && (
                <div className="text-center mt-5 text-xs" style={{ color: tokens.metaText }}>Cuộn để xem thêm...</div>
              )}
              {relatedProductsMode === 'pagination' && (
                <div className="flex items-center justify-center gap-2 mt-5">
                  {[1, 2, 3].map((page) => (
                    <span
                      key={page}
                      className="h-7 w-7 rounded-md border flex items-center justify-center text-xs"
                      style={page === 1
                        ? { backgroundColor: tokens.primary, borderColor: tokens.primary, color: '#fff' }
                        : { borderColor: tokens.border, color: tokens.metaText }}
                    >
                      {page}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {layoutStyle === 'premium' && (
          <div className="space-y-6">
            <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-2 gap-8'}`}>
              {/* Cột trái: Gallery Ảnh */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  {/* Thumbnail dạng dọc bên trái trên Desktop */}
                  {PREVIEW_IMAGES.length > 1 && isDesktop && (
                    <div className="hidden md:block w-20 shrink-0">
                      <PreviewThumbnailRail
                        images={PREVIEW_IMAGES}
                        activeIndex={activeImageIndex}
                        orientation="vertical"
                        visibleSlots={4}
                        tokens={tokens}
                        thumbnailAspectRatio={imageFrame.thumbnailAspectRatio}
                        onActiveIndexChange={setActiveImageIndex}
                        itemClassName="w-full rounded-lg"
                      />
                    </div>
                  )}

                  {/* Ảnh chính */}
                  <div className="flex-1">
                    <div
                      className={`relative rounded-2xl overflow-hidden ${canOpenLightbox ? 'cursor-zoom-in' : ''}`.trim()}
                      style={{ ...mainImageFrameStyle, backgroundColor: tokens.surfaceMuted }}
                      onClick={canOpenLightbox ? () => openLightboxAt(activeImageIndex) : undefined}
                      onKeyDown={handleLightboxKeyDown}
                      role={canOpenLightbox ? 'button' : undefined}
                      tabIndex={canOpenLightbox ? 0 : -1}
                    >
                      {PREVIEW_IMAGES.length > 0 ? (
                        <>
                          {isMobile ? (
                            <PreviewMobileCarousel
                              images={PREVIEW_IMAGES}
                              alt={productName}
                              activeIndex={activeImageIndex}
                              onActiveIndexChange={setActiveImageIndex}
                            />
                          ) : (
                            <BlurredPreviewImage src={PREVIEW_IMAGES[activeImageIndex]} alt={productName} />
                          )}
                          {discountPercent > 0 && (
                            <span
                              className="absolute top-3 left-3 px-2.5 py-1 text-xs font-semibold rounded-lg z-30"
                              style={{ backgroundColor: discountBadgeColors.bg, color: discountBadgeColors.text }}
                            >
                              -{discountPercent}%
                            </span>
                          )}
                          {isMobile && PREVIEW_IMAGES.length > 1 && (
                            <span className="absolute bottom-3 right-3 px-2 py-0.5 text-[11px] font-semibold rounded-full backdrop-blur-sm" style={{ backgroundColor: tokens.surface, color: tokens.headingColor }}>
                              {activeImageIndex + 1}/{PREVIEW_IMAGES.length}
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-32 h-32 rounded-lg" style={{ backgroundColor: tokens.surfaceSoft }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Thumbnail ngang cho Tablet/Mobile */}
                {PREVIEW_IMAGES.length > 1 && !isDesktop && (
                  <div className="grid grid-cols-4 gap-2">
                    {PREVIEW_IMAGES.slice(0, 4).map((img, index) => (
                      <div
                        key={img}
                        onClick={() => setActiveImageIndex(index)}
                        className="rounded-lg border-2 overflow-hidden cursor-pointer"
                        style={{
                          ...thumbnailFrameStyle,
                          borderColor: index === activeImageIndex ? tokens.thumbnailBorderActive : tokens.thumbnailBorder,
                          backgroundColor: tokens.surfaceMuted,
                        }}
                      >
                        <img src={img} alt="" className="h-full w-full object-contain" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Highlights cài đặt dưới ảnh */}
                {showHighlightBlock && (
                  <div className="grid grid-cols-3 gap-2 border-t pt-4" style={{ borderColor: tokens.divider }}>
                    {highlightItems.map((item, index) => {
                      const Icon = CLASSIC_HIGHLIGHT_ICON_MAP[item.icon] || Star;
                      return (
                        <div key={`${item.icon}-${index}`} className="flex flex-col items-center text-center p-2 rounded-xl" style={{ backgroundColor: tokens.surfaceMuted }}>
                          <Icon size={18} style={{ color: tokens.primary }} />
                          <span className="text-[10px] md:text-xs font-medium mt-1 line-clamp-1" style={{ color: tokens.bodyText }}>{item.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cột phải: Thông tin & Giá */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className="inline-block px-2.5 py-0.5 text-[10px] md:text-xs font-semibold rounded-full border"
                        style={{
                          backgroundColor: categoryBadgeColors.bg,
                          color: categoryBadgeColors.text,
                          borderColor: categoryBadgeColors.border,
                        }}
                      >
                        {categoryName}
                      </span>
                      {stockBadge}
                    </div>
                    <h1 className="text-xl md:text-3xl font-bold" style={{ color: tokens.headingColor }}>{productName}</h1>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {showWishlist && (
                      <button className="p-2.5 rounded-full border transition-colors" style={{ borderColor: tokens.wishlistBorder, backgroundColor: tokens.wishlistBg }}>
                        <Heart size={16} style={{ color: tokens.wishlistIcon }} />
                      </button>
                    )}
                    {showShare && (
                      <button className="p-2.5 rounded-full border transition-colors" style={{ borderColor: tokens.shareBorder, backgroundColor: tokens.shareBg }}>
                        <Share2 size={16} style={{ color: tokens.shareIcon }} />
                      </button>
                    )}
                  </div>
                </div>

                {showRating && hasRatingData && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: tokens.ratingText }}>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          style={i < Math.floor(rating)
                            ? { color: RATING_STAR_ACTIVE_COLOR, fill: RATING_STAR_ACTIVE_COLOR }
                            : { color: tokens.ratingStarInactive }}
                        />
                      ))}
                    </div>
                    <span>{rating} ({reviews} đánh giá)</span>
                  </div>
                )}

                {/* Box Giá Premium sử dụng Dynamic Color từ Tokens */}
                <div
                  className="rounded-2xl border p-4 relative overflow-hidden"
                  style={{
                    backgroundColor: tokens.surfaceMuted,
                    borderColor: tokens.border,
                  }}
                >
                  {showPriceRightIcon !== false && (
                    <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none" style={{ color: tokens.primary }}>
                      {renderPremiumIcon(priceRightIcon, 120) || <Gift size={120} />}
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    {showPriceLeftIcon !== false && (
                      <div className="p-2 rounded-lg" style={{ backgroundColor: tokens.surface, color: tokens.primary }}>
                        {renderPremiumIcon(priceLeftIcon, 18) || <Award size={18} />}
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: tokens.metaText }}>GIÁ ƯU ĐÃI HÔM NAY</p>
                      <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-3">
                        <span className="text-2xl md:text-3xl font-extrabold" style={{ color: tokens.priceColor }}>{formatVND(price)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm line-through italic" style={{ color: tokens.priceOriginalText }}>{formatVND(originalPrice)}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded" style={{ backgroundColor: discountBadgeColors.bg, color: discountBadgeColors.text }}>-{discountPercent}%</span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold" style={{ color: tokens.priceColor }}>
                        Tiết kiệm {formatVND(originalPrice - price)} so với giá gốc
                      </p>
                    </div>
                  </div>
                </div>

                {showVariants && <VariantPreview tokens={tokens} />}

                {/* Box Combo dạng so sánh song song chuyên nghiệp */}
                {enableCombos && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.metaText }}>ƯU ĐÃI COMBO – MUA NHIỀU, TIẾT KIỆM HƠN</p>
                    <div className="grid grid-cols-2 gap-3 pt-3">
                      {/* Combo 6 Chai */}
                      <div
                        className="rounded-xl border p-4 flex flex-col justify-between transition-all cursor-pointer relative"
                        style={{
                          backgroundColor: tokens.surface,
                          borderColor: tokens.border,
                        }}
                      >
                        <div>
                          <div className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-md text-white" style={{ backgroundColor: brandColor }}>
                            COMBO 6 CHAI
                          </div>
                          <p className="text-[10px] mt-1.5" style={{ color: tokens.metaText }}>Phù hợp dùng thử / biếu tặng</p>
                          <p className="text-sm font-bold mt-2" style={{ color: tokens.headingColor }}>{formatVND(1450000)}</p>
                          <p className="text-[10px] font-semibold" style={{ color: tokens.priceColor }}>Chi ~241.000đ / chai</p>
                        </div>
                        <div className="border-t pt-2 mt-3 flex items-center gap-1 text-[9px] font-medium" style={{ borderColor: tokens.divider, color: tokens.priceColor }}>
                          <Gift size={10} />
                          <span>Tiết kiệm 340.000đ</span>
                        </div>
                        <div className="absolute right-2 top-2 h-4 w-4 rounded-full border flex items-center justify-center" style={{ borderColor: tokens.border }}>
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: 'transparent' }} />
                        </div>
                      </div>

                      {/* Combo 12 Chai - Best Seller */}
                      <div
                        className="rounded-xl border-2 p-4 flex flex-col justify-between transition-all cursor-pointer relative shadow-sm"
                        style={{
                          backgroundColor: tokens.surface,
                          borderColor: brandColor,
                        }}
                      >
                        <div className="absolute -top-2.5 right-2 px-1.5 py-0.5 rounded text-[8px] font-bold text-white flex items-center gap-0.5 z-10" style={{ backgroundColor: '#eab308' }}>
                          ★ BÁN CHẠY
                        </div>
                        <div>
                          <div className="inline-block px-2 py-0.5 text-[11px] font-bold rounded-md text-white" style={{ backgroundColor: '#eab308' }}>
                            COMBO 12 CHAI
                          </div>
                          <p className="text-[10px] mt-1.5" style={{ color: tokens.metaText }}>Lời nhất – Tiết kiệm nhiều nhất</p>
                          <p className="text-sm font-bold mt-2" style={{ color: tokens.headingColor }}>{formatVND(2800000)}</p>
                          <p className="text-[10px] font-semibold" style={{ color: tokens.priceColor }}>Chi ~233.000đ / chai</p>
                        </div>
                        <div className="border-t pt-2 mt-3 flex items-center gap-1 text-[9px] font-medium" style={{ borderColor: tokens.divider, color: tokens.priceColor }}>
                          <Gift size={10} />
                          <span>Tiết kiệm 680.000đ</span>
                        </div>
                        <div className="absolute right-2 top-2 h-4 w-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: brandColor }}>
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: brandColor }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bộ nút CTA */}
                <div className="space-y-2 pt-2">
                  <div className="flex gap-2">
                    <button className={cn(
                      "flex-1 font-bold rounded-xl flex items-center justify-center gap-1.5 text-white transition-transform hover:scale-[1.01]",
                      isMobile ? "h-9 px-2.5" : "h-11 px-4",
                      isMobile && (mobileFontSize === 'xs' ? 'text-[10px]' : mobileFontSize === 'sm' ? 'text-xs' : 'text-sm') || 'text-xs'
                    )} style={{ backgroundColor: brandColor }}>
                      {renderPremiumIcon(zaloIcon, 14, "-mt-0.5") || <Send size={14} className="-mt-0.5" />}
                      {zaloText}
                    </button>
                    <button className={cn(
                      "flex-1 font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01]",
                      isMobile ? "h-9 px-2.5" : "h-11 px-4",
                      isMobile && (mobileFontSize === 'xs' ? 'text-[10px]' : mobileFontSize === 'sm' ? 'text-xs' : 'text-sm') || 'text-xs'
                    )} style={{ borderColor: brandColor, color: brandColor, backgroundColor: tokens.surface }}>
                      {renderPremiumIcon(phoneIcon, 14) || <Phone size={14} />}
                      {phoneText}
                    </button>
                  </div>
                  {showAddToCart && (
                    <button className="w-full h-11 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-transform hover:scale-[1.01]" style={{ borderColor: brandColor, color: brandColor, backgroundColor: tokens.surface }}>
                      <ShoppingCart size={14} />
                      THÊM VÀO GIỎ HÀNG
                    </button>
                  )}
                </div>

                {showSocialButtons && (
                  <PreviewSocialButtons
                    buttons={socialButtons}
                    tokens={tokens}
                  />
                )}


              </div>
            </div>

            {/* Khối Attributes hàng ngang tinh tế ở chân trang */}
            {(() => {
              const attributesToRender = demoAttributes && demoAttributes.length > 0 ? demoAttributes : [
                { _id: '1', group: { _id: 'g1', name: 'THƯƠNG HIỆU', iconPath: 'Wine', order: 1 }, name: 'Vinicola Vedovato', slug: 'vedovato' },
                { _id: '2', group: { _id: 'g2', name: 'XUẤT XỨ', iconPath: 'Globe', order: 2 }, name: 'Ý (Italia)', slug: 'y' },
                { _id: '3', group: { _id: 'g3', name: 'DUNG TÍCH', iconPath: 'GlassWater', order: 3 }, name: '750ml', slug: '750ml' },
                { _id: '4', group: { _id: 'g4', name: 'NỒNG ĐỘ', iconPath: 'Flame', order: 4 }, name: '16% ABV', slug: '16' },
                { _id: '5', group: { _id: 'g5', name: 'HƯƠNG VỊ', iconPath: 'Utensils', order: 5 }, name: 'Gỗ sồi, Tiêu đen, Vani, Trái chín', slug: 'go-soi' },
                { _id: '6', group: { _id: 'g6', name: 'GIỐNG NHO', iconPath: 'Grape', order: 6 }, name: 'Primitivo', slug: 'primitivo' }
              ];

              // 1. Nhóm các term theo groupId
              const groupMap = new Map<string, { group: any; terms: Array<{ _id: string; name: string; slug: string }> }>();
              for (const term of attributesToRender) {
                if (!term.group) continue;
                const groupId = term.group._id || term.group.name;
                if (!groupMap.has(groupId)) {
                  groupMap.set(groupId, {
                    group: term.group,
                    terms: []
                  });
                }
                const groupData = groupMap.get(groupId)!;
                groupData.terms.push({ _id: term._id, name: term.name, slug: term.slug });
              }

              const mergedGroups = Array.from(groupMap.values()).map(g => ({
                _id: g.terms.map(t => t._id).join('-'),
                group: g.group,
                terms: g.terms,
              }));

              const sortedGroups = mergedGroups.sort((a, b) => (a.group.order ?? 9999) - (b.group.order ?? 9999));
              if (sortedGroups.length === 0) return null;

              const limit = device === 'mobile' ? 3 : device === 'tablet' ? 3 : 4;
              const hasOverflow = sortedGroups.length > limit;

              return (
                <div className="border-t pt-6 mt-8" style={{ borderColor: tokens.divider }}>
                  <div 
                    className="rounded-2xl py-3 px-2 md:p-5 relative border"
                    style={{ 
                      backgroundColor: tokens.surfaceMuted || '#f8fafc',
                      borderColor: tokens.border || '#e2e8f0'
                    }}
                  >
                    <div className="relative">
                      {/* Nút Prev/Next */}
                      {hasOverflow && (
                        <>
                          <button
                            type="button"
                            onClick={() => premiumAttrApi?.scrollPrev()}
                            disabled={!canScrollAttrPrev}
                            className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center transition-all opacity-70 hover:opacity-100 disabled:opacity-10 hover:scale-105 active:scale-95 z-20"
                            style={{ color: tokens.headingColor, backgroundColor: `${tokens.surface}aa` }}
                            aria-label="Thuộc tính trước"
                          >
                            <ChevronLeft size={14} strokeWidth={3} />
                          </button>
                          <button
                            type="button"
                            onClick={() => premiumAttrApi?.scrollNext()}
                            disabled={!canScrollAttrNext}
                            className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center transition-all opacity-70 hover:opacity-100 disabled:opacity-10 hover:scale-105 active:scale-95 z-20"
                            style={{ color: tokens.headingColor, backgroundColor: `${tokens.surface}aa` }}
                            aria-label="Thuộc tính tiếp theo"
                          >
                            <ChevronRight size={14} strokeWidth={3} />
                          </button>
                        </>
                      )}

                      {/* Carousel or Grid */}
                      {hasOverflow ? (
                        <div className="overflow-hidden mx-6 md:mx-10" ref={premiumAttrRef}>
                          <div className="flex gap-0">
                            {sortedGroups.map((groupItem, index) => {
                              const IconComponent = getAttributeIconComponent(groupItem.group.iconPath);
                              const valuesStr = groupItem.terms.map(t => t.name).join(', ');
                              const isMobile = device === 'mobile';
                              const isTablet = device === 'tablet';

                              return (
                                <div
                                  key={groupItem._id}
                                  onClick={() => setActiveAttrModal({ title: groupItem.group.name, value: valuesStr })}
                                  className={`flex-shrink-0 select-none min-w-0 px-2.5 md:px-6 flex items-center gap-2 md:gap-3.5 cursor-pointer hover:opacity-80 active:opacity-60 transition-all ${
                                    index < sortedGroups.length - 1 ? 'border-r' : ''
                                  }`}
                                  style={{
                                    borderColor: tokens.divider || '#e2e8f0',
                                    flexBasis: isMobile
                                      ? 'calc(100% / 3)'
                                      : isTablet
                                        ? 'calc(100% / 3)'
                                        : 'calc(100% / 4)',
                                  }}
                                >
                                  <span style={{ color: tokens.primary }} className="flex shrink-0 items-center justify-center">
                                    <IconComponent size={18} className="md:w-[26px] md:h-[26px] md:size-auto" />
                                  </span>
                                  <div className="flex flex-col text-left min-w-0 flex-1">
                                    <span className="text-[9px] font-bold block uppercase tracking-wider leading-none mb-1 break-words" style={{ color: tokens.metaText }}>
                                      {groupItem.group.name}
                                    </span>
                                    <p className="text-[11px] md:text-sm font-bold break-words line-clamp-2 leading-tight" style={{ color: tokens.headingColor }}>
                                      {valuesStr}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div 
                          className="grid gap-0 divide-x"
                          style={{ 
                            borderColor: tokens.divider || '#e2e8f0',
                            gridTemplateColumns: `repeat(${sortedGroups.length}, minmax(0, 1fr))` 
                          }}
                        >
                          {sortedGroups.map((groupItem) => {
                            const IconComponent = getAttributeIconComponent(groupItem.group.iconPath);
                            const valuesStr = groupItem.terms.map(t => t.name).join(', ');

                            return (
                              <div
                                key={groupItem._id}
                                onClick={() => setActiveAttrModal({ title: groupItem.group.name, value: valuesStr })}
                                className="px-2.5 md:px-6 flex items-center gap-2 md:gap-3.5 min-w-0 first:pl-0 last:pr-0 cursor-pointer hover:opacity-80 active:opacity-60 transition-all"
                              >
                                <span style={{ color: tokens.primary }} className="flex shrink-0 items-center justify-center">
                                  <IconComponent size={18} className="md:w-[26px] md:h-[26px] md:size-auto" />
                                </span>
                                <div className="flex flex-col text-left min-w-0 flex-1">
                                  <span className="text-[9px] font-bold block uppercase tracking-wider leading-none mb-1 break-words" style={{ color: tokens.metaText }}>
                                    {groupItem.group.name}
                                  </span>
                                  <p className="text-[11px] md:text-sm font-bold break-words line-clamp-2 leading-tight" style={{ color: tokens.headingColor }}>
                                    {valuesStr}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Glassmorphism Modal xem full thuộc tính */}
                  {activeAttrModal && (
                    <div 
                      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
                      onClick={() => setActiveAttrModal(null)}
                    >
                      <div 
                        className="rounded-2xl p-6 max-w-sm w-full border text-center relative shadow-2xl"
                        style={{ 
                          backgroundColor: tokens.surface || '#ffffff',
                          borderColor: tokens.border || '#e2e8f0'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button 
                          className="absolute top-3 right-3 opacity-60 hover:opacity-100 transition-all text-sm font-bold"
                          style={{ color: tokens.bodyText }}
                          onClick={() => setActiveAttrModal(null)}
                        >
                          ✕
                        </button>
                        <h3 className="text-xs font-extrabold uppercase tracking-wider mb-2" style={{ color: tokens.metaText }}>
                          {activeAttrModal.title}
                        </h3>
                        <p className="text-sm font-bold break-words leading-relaxed" style={{ color: tokens.headingColor }}>
                          {activeAttrModal.value}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Dải banner cam kết động từ cài đặt - chân trang Premium */}
            {showPremiumBanner && premiumBannerItems && premiumBannerItems.length > 0 && (() => {
              const BANNER_COLOR_MAP: Record<string, string> = {
                primary: tokens.primary,
                secondary: tokens.secondary,
                black: '#111111',
                white: '#ffffff',
              };
              const bgColor = BANNER_COLOR_MAP[premiumBannerBg] ?? tokens.primary;
              const textColor = BANNER_COLOR_MAP[premiumBannerText] ?? '#ffffff';
              return (
                <div className="rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center" style={{ backgroundColor: bgColor, color: textColor }}>
                  {premiumBannerItems.map((item, idx) => (
                    <div key={idx} className={`space-y-0.5${idx > 0 ? ' border-l' : ''}`} style={{ borderColor: `${textColor}33` }}>
                      <p className="text-xs font-extrabold uppercase tracking-wide">{item.title}</p>
                      <p className="text-[10px] opacity-80">{item.subtitle}</p>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div className="border-t pt-6 mt-8" style={{ borderColor: tokens.divider }}>
              <h3 className="font-semibold mb-4" style={{ color: tokens.headingColor }}>Mô tả sản phẩm</h3>
              <ExpandablePreviewDescriptionBlock buttonStyle={{ color: tokens.primary }}>
                <div className="prose prose-sm max-w-none" style={{ color: tokens.bodyText }}>
                  {PREVIEW_DESCRIPTION}
                </div>
                {renderPreviewDescriptionImages()}
              </ExpandablePreviewDescriptionBlock>
            </div>

            <CommentsPreview
              showComments={showComments}
              showLikes={showCommentLikes}
              showReplies={showCommentReplies}
              brandColor={brandColor}
            />
          </div>
        )}
      </div>
      <ProductImageLightbox
        images={PREVIEW_IMAGES}
        currentIndex={lightboxIndex ?? activeImageIndex}
        open={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={(nextIndex) => setLightboxIndex(nextIndex)}
        useNativeImage
        overlayUrl={null}
      />
    </div>
  );
}

const MOCK_COMBOS = [
  {
    name: 'Combo mua 5 tặng 1 (Standard)',
    price: 174950000,
    type: 'standard',
    standardConfig: {
      minQty: 5,
      rewardType: 'gift_self',
      giftQty: 1
    }
  },
  {
    name: 'Set sỉ kèm củ sạc nhanh (Mix)',
    price: 35500000,
    type: 'mix',
    mixConfig: {
      currentProductQty: 1,
      items: [
        { productId: 'mock-charger', quantity: 1 }
      ],
      rewardType: 'discount_amount',
      rewardValue: 500000
    }
  }
];

const MOCK_PRODUCTS_MAP = new Map<string, any>([
  ['mock-charger', { name: 'Củ sạc nhanh Type-C 20W', image: '' }]
]);

function PreviewCombosBlock({
  combos,
  comboProductsMap,
  tokens,
  comboAnimateType = 'none',
  comboEffectColor = 'gradient-1',
  comboBadgeColors,
  currentProductName,
  currentProductImage,
}: {
  combos: typeof MOCK_COMBOS;
  comboProductsMap: typeof MOCK_PRODUCTS_MAP;
  tokens: ReturnType<typeof getProductDetailColors>;
  comboAnimateType?: string;
  comboEffectColor?: 'black' | 'white' | 'red' | 'primary' | 'secondary' | 'gradient-1' | 'gradient-2' | 'gradient-3';
  comboBadgeColors: ReturnType<typeof resolveProductDetailElementColor>;
  currentProductName: string;
  currentProductImage?: string;
}) {
  if (!combos || combos.length === 0) return null;

  const [expandedCombos, setExpandedCombos] = useState<Record<number, boolean>>({});

  let animateClass = '';
  let titleEffectClass = '';
  let isGradientEffect = false;
  let effectColorVal = '';
  const titleEffectStyle: React.CSSProperties & Record<string, string> = {};

  const applyEffectColor = () => {
    let colorVal = '';
    let isGradient = false;

    if (comboEffectColor === 'black') {
      titleEffectStyle['--combo-sparkle-a'] = '#020617';
      titleEffectStyle['--combo-sparkle-b'] = '#64748b';
      titleEffectStyle['--combo-sparkle-c'] = '#cbd5e1';
      colorVal = '#020617';
    } else if (comboEffectColor === 'white') {
      titleEffectStyle['--combo-sparkle-a'] = '#f8fafc';
      titleEffectStyle['--combo-sparkle-b'] = '#ffffff';
      titleEffectStyle['--combo-sparkle-c'] = '#cbd5e1';
      colorVal = '#ffffff';
    } else if (comboEffectColor === 'red') {
      titleEffectStyle['--combo-sparkle-a'] = '#dc2626';
      titleEffectStyle['--combo-sparkle-b'] = '#f97316';
      titleEffectStyle['--combo-sparkle-c'] = '#991b1b';
      colorVal = '#dc2626';
    } else if (comboEffectColor === 'primary') {
      titleEffectStyle['--combo-sparkle-a'] = tokens.primary;
      titleEffectStyle['--combo-sparkle-b'] = tokens.secondary;
      titleEffectStyle['--combo-sparkle-c'] = comboBadgeColors.text;
      colorVal = tokens.primary;
    } else if (comboEffectColor === 'secondary') {
      titleEffectStyle['--combo-sparkle-a'] = tokens.secondary;
      titleEffectStyle['--combo-sparkle-b'] = tokens.primary;
      titleEffectStyle['--combo-sparkle-c'] = comboBadgeColors.text;
      colorVal = tokens.secondary;
    } else if (comboEffectColor === 'gradient-2') {
      titleEffectStyle['--combo-sparkle-a'] = '#bf953f';
      titleEffectStyle['--combo-sparkle-b'] = '#fcf6ba';
      titleEffectStyle['--combo-sparkle-c'] = '#b38728';
      isGradient = true;
    } else if (comboEffectColor === 'gradient-3') {
      titleEffectStyle['--combo-sparkle-a'] = '#00c6ff';
      titleEffectStyle['--combo-sparkle-b'] = '#0072ff';
      titleEffectStyle['--combo-sparkle-c'] = '#7928ca';
      isGradient = true;
    } else {
      // gradient-1 (default)
      titleEffectStyle['--combo-sparkle-a'] = '#ff007a';
      titleEffectStyle['--combo-sparkle-b'] = '#7928ca';
      titleEffectStyle['--combo-sparkle-c'] = '#00dfd8';
      isGradient = true;
    }

    isGradientEffect = isGradient;
    effectColorVal = colorVal;

    if (isGradient) {
      titleEffectStyle.backgroundImage = `linear-gradient(90deg, ${titleEffectStyle['--combo-sparkle-a']}, ${titleEffectStyle['--combo-sparkle-b']}, ${titleEffectStyle['--combo-sparkle-c']})`;
      titleEffectStyle.WebkitBackgroundClip = 'text';
      titleEffectStyle.backgroundClip = 'text';
      titleEffectStyle.WebkitTextFillColor = 'transparent';
      titleEffectStyle.color = 'transparent';
    } else if (colorVal) {
      titleEffectStyle.backgroundImage = 'none';
      titleEffectStyle.WebkitBackgroundClip = 'initial';
      titleEffectStyle.backgroundClip = 'initial';
      titleEffectStyle.WebkitTextFillColor = 'initial';
      titleEffectStyle.color = colorVal;
    }
  };

  // Luôn áp dụng màu hiệu ứng để mọi hiệu ứng chữ đều nhận màu
  applyEffectColor();

  if (comboAnimateType === 'luxury-sheen' || comboAnimateType === 'pulse' || comboAnimateType === 'bounce') {
    animateClass = 'animate-combo-luxury-sheen';
  } else if (comboAnimateType === 'typing') {
    titleEffectClass = 'animate-combo-typing-text';
  } else if (comboAnimateType === 'letter-wave') {
    titleEffectClass = 'animate-combo-letter-wave';
  } else if (comboAnimateType === 'fire') {
    animateClass = 'animate-combo-fire';
    titleEffectClass = 'animate-combo-fire-text';
  } else if (comboAnimateType === 'sparkle' || comboAnimateType.startsWith('sparkle-')) {
    animateClass = 'animate-combo-sparkle';
    titleEffectClass = 'animate-combo-sparkle-text';
  } else if (comboAnimateType === 'text-highlight') {
    animateClass = 'animate-combo-text-highlight';
  } else if (comboAnimateType === 'border-rainbow') {
    animateClass = 'animate-combo-border-rainbow';
  }

  const renderEffectText = (text: string) => {
    if (comboAnimateType !== 'letter-wave') {
      return <span className={`combo-title-text ${titleEffectClass}`.trim()} style={titleEffectStyle}>{text}</span>;
    }

    return (
      <span className="combo-title-text inline-block">
        {Array.from(text).map((char, index, arr) => {
          const L = arr.length;
          const charStyle: React.CSSProperties = {
            animationDelay: `${index * 0.06}s`,
            display: 'inline-block',
          };

          if (isGradientEffect) {
            charStyle.backgroundImage = `linear-gradient(90deg, ${titleEffectStyle['--combo-sparkle-a']}, ${titleEffectStyle['--combo-sparkle-b']}, ${titleEffectStyle['--combo-sparkle-c']})`;
            charStyle.backgroundSize = `${L * 100}% 100%`;
            charStyle.backgroundPosition = `${(index / (L - 1 || 1)) * 100}% 0`;
            charStyle.WebkitBackgroundClip = 'text';
            charStyle.backgroundClip = 'text';
            charStyle.WebkitTextFillColor = 'transparent';
            charStyle.color = 'transparent';
          } else if (effectColorVal) {
            charStyle.color = effectColorVal;
          }

          return (
            <span
              key={`${char}-${index}`}
              className="animate-combo-letter-wave"
              style={charStyle}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          );
        })}
      </span>
    );
  };

  const getComboDetails = (combo: any) => {
    let title = typeof combo.name === 'string' ? combo.name.trim() : '';
    let conditionText = '';
    let rewardText = '';
    let iconType: 'gift' | 'percent' | 'amount' = 'gift';

    if (combo.type === 'standard') {
      const cfg = combo.standardConfig;
      const minQty = cfg?.minQty || 1;
      conditionText = `Mua từ ${minQty} sản phẩm`;
      
      if (cfg?.rewardType === 'discount_percent') {
        rewardText = `Giảm ${cfg.rewardValue}%`;
        iconType = 'percent';
      } else if (cfg?.rewardType === 'discount_amount') {
        rewardText = `Giảm ${formatVND(cfg.rewardValue || 0)}`;
        iconType = 'amount';
      } else if (cfg?.rewardType === 'gift_self') {
        rewardText = `Tặng thêm ${cfg.giftQty || 1} sản phẩm này`;
        iconType = 'gift';
      } else if (cfg?.rewardType === 'gift_other' && cfg.giftProductId) {
        const giftProduct = comboProductsMap.get(cfg.giftProductId);
        rewardText = `Tặng kèm ${cfg.giftQty || 1} ${giftProduct?.name || 'Sản phẩm khác'}`;
        iconType = 'gift';
      }
    } else if (combo.type === 'mix') {
      const cfg = combo.mixConfig;
      const itemsLabel = cfg?.items?.map((item: any) => {
        const p = comboProductsMap.get(item.productId);
        return `${item.quantity}x ${p?.name || 'sản phẩm đi kèm'}`;
      }).join(', ');
      
      const curQty = cfg?.currentProductQty || 1;
      conditionText = itemsLabel 
        ? `Mua ${curQty} sản phẩm này kèm ${itemsLabel}` 
        : `Mua ${curQty} sản phẩm này`;
      
      if (cfg?.rewardType === 'discount_percent') {
        rewardText = `Giảm ${cfg.rewardValue}%`;
        iconType = 'percent';
      } else if (cfg?.rewardType === 'discount_amount') {
        rewardText = `Giảm ${formatVND(cfg.rewardValue || 0)}`;
        iconType = 'amount';
      } else if (cfg?.rewardType === 'gift_other' && cfg.giftProductId) {
        const giftProduct = comboProductsMap.get(cfg.giftProductId);
        rewardText = `Tặng kèm ${cfg.giftQty || 1} ${giftProduct?.name || 'Sản phẩm khác'}`;
        iconType = 'gift';
      }
    }

    if (!title) {
      title = combo.type === 'mix' ? 'Combo trọn bộ' : 'Combo mua nhiều';
    }

    return {
      title,
      conditionText,
      rewardText,
      priceText: combo.price ? formatVND(combo.price) : 'Liên hệ',
      iconType,
    };
  };

  return (
    <div className="mt-2.5 mb-3.5 space-y-2">
      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: tokens.headingColor }}>
        Combo ưu đãi đặc biệt
      </div>
      <div className="space-y-2">
        {combos.map((combo, index) => {
          const details = getComboDetails(combo);
          const isExpanded = expandedCombos[index] ?? false;

          return (
            <div
              key={index}
              className={`group relative flex flex-col overflow-hidden rounded-md border p-3 transition-all hover:border-slate-300 dark:hover:border-slate-700 ${animateClass} ${combo.type === 'mix' ? 'cursor-pointer' : ''}`}
              style={{
                borderColor: tokens.border,
                backgroundColor: tokens.surface,
              }}
              onClick={() => {
                if (combo.type === 'mix') {
                  setExpandedCombos(prev => ({ ...prev, [index]: !prev[index] }));
                }
              }}
            >
              <div className="flex items-center justify-between gap-2.5 min-w-0 w-full">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Content */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-bold text-[15px] leading-snug flex items-center gap-1.5 flex-wrap" style={{ color: tokens.headingColor }}>
                      {renderEffectText(details.title)}
                      {combo.type === 'mix' && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-sm font-bold uppercase tracking-wider shrink-0">Theo bộ</span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      {details.conditionText && (
                        <span className="font-medium text-slate-500 dark:text-slate-400 truncate max-w-[240px] md:max-w-[360px]">
                          {details.conditionText}
                        </span>
                      )}
                      {details.conditionText && details.rewardText && (
                        <span className="text-slate-300">•</span>
                      )}
                      {details.rewardText && (
                        <span className="font-bold text-emerald-600 dark:text-emerald-500 shrink-0">
                          {details.rewardText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Price block */}
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: tokens.softText }}>
                      Giá combo
                    </span>
                    <span className="text-sm font-bold tracking-tight" style={{ color: tokens.primary }}>
                      {details.priceText}
                    </span>
                  </div>
                  {combo.type === 'mix' && (
                    <div className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors ml-1">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                  )}
                </div>
              </div>

              {/* Danh sách chi tiết các sản phẩm trong Combo Mix */}
              {combo.type === 'mix' && isExpanded && combo.mixConfig?.items && (
                <div 
                  className="mt-2.5 pt-2.5 border-t border-dashed space-y-1.5 text-xs w-full" 
                  style={{ borderColor: tokens.border }}
                  onClick={(e) => e.stopPropagation()} // tránh trigger click cha
                >
                  <div className="font-semibold text-slate-400 uppercase tracking-wider text-[9px] mb-1">
                    Danh sách sản phẩm trong combo:
                  </div>
                  
                  {/* Sản phẩm chủ thể hiện tại */}
                  <div className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 p-1.5 rounded gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {currentProductImage ? (
                        <img src={currentProductImage} alt={currentProductName} className="h-7 w-7 object-cover rounded border shrink-0 bg-white" />
                      ) : (
                        <div className="h-7 w-7 rounded border shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                          <Package size={12} />
                        </div>
                      )}
                      <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{currentProductName} <span className="text-[10px] text-slate-400 font-normal">(Sản phẩm này)</span></span>
                    </div>
                    <span className="shrink-0 text-slate-500 font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">x{combo.mixConfig.currentProductQty || 1}</span>
                  </div>

                  {/* Các sản phẩm mua kèm thêm */}
                  {combo.mixConfig.items.map((item: any, idx: number) => {
                    const pInfo = comboProductsMap.get(item.productId);
                    return (
                      <div key={idx} className="flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 p-1.5 rounded gap-2">
                        {pInfo ? (
                          <div className="flex items-center gap-2 min-w-0">
                            {pInfo.image ? (
                              <img src={pInfo.image} alt={pInfo.name} className="h-7 w-7 object-cover rounded border shrink-0 bg-white" />
                            ) : (
                              <div className="h-7 w-7 rounded border shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                <Package size={12} />
                              </div>
                            )}
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{pInfo.name}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="h-7 w-7 rounded border shrink-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                              <Package size={12} />
                            </div>
                            <span className="font-medium text-slate-400 truncate">Sản phẩm không có sẵn</span>
                          </div>
                        )}
                        <span className="shrink-0 text-slate-500 font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[10px]">x{item.quantity}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ZaloSvg = ({ size = 18 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
  </svg>
);

const TikTokSvg = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const XSvg = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

const ShopeeSvg = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M15.9414 17.9633c.229-1.879-.981-3.077-4.1758-4.0969-1.548-.528-2.277-1.22-2.26-2.1719.065-1.056 1.048-1.825 2.352-1.85a5.2898 5.2898 0 0 1 2.8838.89c.116.072.197.06.263-.039.09-.145.315-.494.39-.62.051-.081.061-.187-.068-.281-.185-.1369-.704-.4149-.983-.5319a6.4697 6.4697 0 0 0-2.5118-.514c-1.909.008-3.4129 1.215-3.5389 2.826-.082 1.1629.494 2.1078 1.73 2.8278.262.152 1.6799.716 2.2438.892 1.774.552 2.695 1.5419 2.478 2.6969-.197 1.047-1.299 1.7239-2.818 1.7439-1.2039-.046-2.2878-.537-3.1278-1.19l-.141-.11c-.104-.08-.218-.075-.287.03-.05.077-.376.547-.458.67-.077.108-.035.168.045.234.35.293.817.613 1.134.775a6.7097 6.7097 0 0 0 2.8289.727 4.9048 4.9048 0 0 0 2.0759-.354c1.095-.465 1.8029-1.394 1.9449-2.554zM11.9986 1.4009c-2.068 0-3.7539 1.95-3.8329 4.3899h7.6657c-.08-2.44-1.765-4.3899-3.8328-4.3899zm7.8516 22.5981-.08.001-15.7843-.002c-1.074-.04-1.863-.91-1.971-1.991l-.01-.195L1.298 6.2858a.459.459 0 0 1 .45-.494h4.9748C6.8448 2.568 9.1607 0 11.9996 0c2.8388 0 5.1537 2.5689 5.2757 5.7898h4.9678a.459.459 0 0 1 .458.483l-.773 15.5883-.007.131c-.094 1.094-.979 1.9769-2.0709 2.0059z"/>
  </svg>
);

const MessengerSvg = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13"/>
  </svg>
);

interface SocialIconDef {
  value: string;
  label: string;
  brandColor: string;
  suggestedLabel: string;
  suggestedUrl: string;
  imageSrc?: string;
}

const SOCIAL_ICON_DEFS: SocialIconDef[] = [
  { value: 'zalo', label: 'Zalo', brandColor: '#0084ff', suggestedLabel: 'Chat Zalo', suggestedUrl: 'https://zalo.me/yourpage' },
  { value: 'shopee', label: 'Shopee', brandColor: '#ee4d2d', suggestedLabel: 'Shopee', suggestedUrl: 'https://shopee.vn/yourshop' },
  { value: 'lazada', label: 'Lazada', brandColor: '#0f1689', suggestedLabel: 'Lazada', suggestedUrl: 'https://lazada.vn/shop/yourshop', imageSrc: '/icons/lazada-logo.png' },
  { value: 'facebook', label: 'Facebook', brandColor: '#1877f2', suggestedLabel: 'Facebook', suggestedUrl: 'https://facebook.com/yourpage' },
  { value: 'instagram', label: 'Instagram', brandColor: '#e1306c', suggestedLabel: 'Instagram', suggestedUrl: 'https://instagram.com/yourpage' },
  { value: 'tiktok', label: 'TikTok', brandColor: '#000000', suggestedLabel: 'TikTok', suggestedUrl: 'https://tiktok.com/@yourpage' },
  { value: 'youtube', label: 'Youtube', brandColor: '#ff0000', suggestedLabel: 'Youtube', suggestedUrl: 'https://youtube.com/@yourchannel' },
  { value: 'phone', label: 'Điện thoại', brandColor: '#ef4444', suggestedLabel: 'Gọi ngay', suggestedUrl: 'tel:0123456789' },
  { value: 'messenger', label: 'Messenger', brandColor: '#0084ff', suggestedLabel: 'Messenger', suggestedUrl: 'https://m.me/yourpage' },
  { value: 'tiki', label: 'Tiki', brandColor: '#1a94ff', suggestedLabel: 'Tiki', suggestedUrl: 'https://tiki.vn/cua-hang/yourshop', imageSrc: '/icons/tiki-logo.png' },
  { value: 'mail', label: 'Email', brandColor: '#ea580c', suggestedLabel: 'Email', suggestedUrl: 'mailto:contact@example.com' },
];

const getSocialIconDef = (value: string): SocialIconDef =>
  SOCIAL_ICON_DEFS.find((d) => d.value === value) ?? SOCIAL_ICON_DEFS[0];

const renderSocialIcon = (value: string, size = 16) => {
  if (value === 'zalo') return <ZaloSvg size={size} />;
  if (value === 'tiktok') return <TikTokSvg size={size} />;
  if (value === 'x') return <XSvg size={size} />;
  if (value === 'shopee') return <ShopeeSvg size={size} />;
  if (value === 'messenger') return <MessengerSvg size={size} />;

  const def = SOCIAL_ICON_DEFS.find((d) => d.value === value);
  if (def?.imageSrc) {
    return <img src={def.imageSrc} alt={def.label} width={size} height={size} className="object-contain" style={{ borderRadius: '50%' }} />;
  }

  // Fallback map cho preview
  const map: Record<string, React.ElementType> = {
    phone: Phone,
    facebook: Facebook,
    instagram: Instagram,
    youtube: Youtube,
    telegram: Send,
    mail: Mail,
  };
  const Icon = map[value] ?? Phone;
  return <Icon size={size} />;
};

function PreviewSocialButtons({
  buttons,
  tokens,
}: {
  buttons: Array<{ id: string; icon: string; label: string; url: string; active: boolean }>;
  tokens: ReturnType<typeof getProductDetailColors>;
}) {
  const activeButtons = buttons.filter(b => b.active);
  if (activeButtons.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t" style={{ borderColor: tokens.divider }}>
      <p className="text-xs font-semibold mb-2" style={{ color: tokens.headingColor }}>
        Liên hệ & Mua hàng:
      </p>
      <div className="flex flex-wrap gap-2">
        {activeButtons.map((btn) => {
          const def = getSocialIconDef(btn.icon);
          return (
            <a
              key={btn.id}
              href={btn.url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border shadow-sm transition-all hover:scale-105 active:scale-[0.98] text-white hover:brightness-110"
              style={{
                backgroundColor: def.brandColor,
                borderColor: def.brandColor,
              }}
            >
              {renderSocialIcon(btn.icon, 13)}
              <span>{btn.label || def.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
