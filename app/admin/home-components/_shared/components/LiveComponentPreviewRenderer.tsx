'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { SectionSpacing } from '../types/sectionSpacing';

// Previews imports
import { HeroPreview } from '../../hero/_components/HeroPreview';
import { HomepageCategoryHeroPreview } from '../../homepage-category-hero/_components/HomepageCategoryHeroPreview';
import { StatsPreview } from '../../stats/_components/StatsPreview';
import { AboutPreview } from '../../about/_components/AboutPreview';
import { ServicesPreview } from '../../services/_components/ServicesPreview';
import { BenefitsPreview } from '../../benefits/_components/BenefitsPreview';
import { FaqPreview } from '../../faq/_components/FaqPreview';
import { CTAPreview } from '../../cta/_components/CTAPreview';
import { TestimonialsPreview } from '../../testimonials/_components/TestimonialsPreview';
import { ContactPreview } from '../../contact/_components/ContactPreview';
import { GalleryPreview } from '../../gallery/_components/GalleryPreview';
import { PartnersPreview } from '../../partners/_components/PartnersPreview';
import { TrustBadgesPreview } from '../../gallery/_components/TrustBadgesPreview';
import { PricingPreview } from '../../pricing/_components/PricingPreview';
import { ProductListPreview } from '../../product-list/_components/ProductListPreview';
import { ProductGridPreview } from '../../product-grid/_components/ProductGridPreview';
import { ServiceListPreview } from '../../service-list/_components/ServiceListPreview';
import { BlogPreview } from '../../blog/_components/BlogPreview';
import { CareerPreview } from '../../career/_components/CareerPreview';
import { CaseStudyPreview } from '../../case-study/_components/CaseStudyPreview';
import { SpeedDialPreview } from '../../speed-dial/_components/SpeedDialPreview';
import { ProductCategoriesPreview } from '../../product-categories/_components/ProductCategoriesPreview';
import { CategoryProductsPreview } from '../../category-products/_components/CategoryProductsPreview';
import { TeamPreview } from '../../team/_components/TeamPreview';
import { FeaturesPreview } from '../../features/_components/FeaturesPreview';
import { ProcessPreview } from '../../process/_components/ProcessPreview';
import { ClientsPreview } from '../../clients/_components/ClientsPreview';
import { VideoPreview } from '../../video/_components/VideoPreview';
import { CountdownPreview } from '../../countdown/_components/CountdownPreview';
import { VoucherPromotionsPreview } from '../../voucher-promotions/_components/VoucherPromotionsPreview';
import { PopupPreview } from '../../popup/_components/PopupPreview';
import { MarqueePreview } from '../../marquee/_components/MarqueePreview';
import { FooterPreview } from '../../footer/_components/FooterPreview';
import { CustomHomePreview } from '../../custom-home/_components/CustomHomePreview';

// Cast all component to any to bypass strict type checking for diverse props mapping
const HeroPreviewAny = HeroPreview as any;
const HomepageCategoryHeroPreviewAny = HomepageCategoryHeroPreview as any;
const StatsPreviewAny = StatsPreview as any;
const AboutPreviewAny = AboutPreview as any;
const ServicesPreviewAny = ServicesPreview as any;
const BenefitsPreviewAny = BenefitsPreview as any;
const FaqPreviewAny = FaqPreview as any;
const CTAPreviewAny = CTAPreview as any;
const TestimonialsPreviewAny = TestimonialsPreview as any;
const ContactPreviewAny = ContactPreview as any;
const GalleryPreviewAny = GalleryPreview as any;
const PartnersPreviewAny = PartnersPreview as any;
const TrustBadgesPreviewAny = TrustBadgesPreview as any;
const PricingPreviewAny = PricingPreview as any;
const ProductListPreviewAny = ProductListPreview as any;
const ProductGridPreviewAny = ProductGridPreview as any;
const ServiceListPreviewAny = ServiceListPreview as any;
const BlogPreviewAny = BlogPreview as any;
const CareerPreviewAny = CareerPreview as any;
const CaseStudyPreviewAny = CaseStudyPreview as any;
const SpeedDialPreviewAny = SpeedDialPreview as any;
const ProductCategoriesPreviewAny = ProductCategoriesPreview as any;
const CategoryProductsPreviewAny = CategoryProductsPreview as any;
const TeamPreviewAny = TeamPreview as any;
const FeaturesPreviewAny = FeaturesPreview as any;
const ProcessPreviewAny = ProcessPreview as any;
const ClientsPreviewAny = ClientsPreview as any;
const VideoPreviewAny = VideoPreview as any;
const CountdownPreviewAny = CountdownPreview as any;
const VoucherPromotionsPreviewAny = VoucherPromotionsPreview as any;
const PopupPreviewAny = PopupPreview as any;
const MarqueePreviewAny = MarqueePreview as any;
const FooterPreviewAny = FooterPreview as any;
const CustomHomePreviewAny = CustomHomePreview as any;

interface LiveComponentPreviewRendererProps {
  component: {
    _id: string;
    type: string;
    title: string;
    active: boolean;
    config?: Record<string, any>;
  };
  brandColor: string;
  secondary: string;
  mode?: 'single' | 'dual';
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
  onConfigChange: (nextConfig: Record<string, any>) => void;
  onTitleChange: (nextTitle: string) => void;
}

export function LiveComponentPreviewRenderer({
  component,
  brandColor,
  secondary,
  mode = 'dual',
  fontStyle,
  fontClassName,
  onConfigChange,
  onTitleChange,
}: LiveComponentPreviewRendererProps) {
  const servicesData = useQuery(api.services.listAll, { limit: 100 });
  const productCategoriesData = useQuery(api.productCategories.listActive);
  const { type, title, config = {} } = component;
  const categoryProductsSections = Array.isArray(config.sections) ? config.sections : [];
  const categoryProductIds = categoryProductsSections
    .map((section: any) => section.categoryId)
    .filter(Boolean);
  const categoryProductsData = useQuery(
    api.products.listProductsForCategories,
    categoryProductIds.length > 0 ? { categoryIds: categoryProductIds as any } : 'skip'
  );

  // Lấy các header config chung từ config
  const hideHeader = config.hideHeader ?? false;
  const showTitle = config.showTitle ?? true;
  const subtitle = config.subtitle ?? '';
  const showSubtitle = config.showSubtitle ?? true;
  const headerAlign = config.headerAlign ?? 'left';
  const titleColorPrimary = config.titleColorPrimary ?? false;
  const subtitleAboveTitle = config.subtitleAboveTitle ?? false;
  const uppercaseText = config.uppercaseText ?? false;
  const showBadge = config.showBadge ?? true;
  const badgeText = config.badgeText ?? '';
  const spacing = (config.spacing as SectionSpacing) ?? 'md';
  const cornerRadius = config.cornerRadius ?? 'lg';

  const handleHeaderConfigChange = (key: string, value: any) => {
    onConfigChange({
      ...config,
      [key]: value,
    });
  };

  switch (type) {
    case 'Hero': {
      const slides = (config.slides as any[]) || [];
      const heroSlides = slides.map((slide, index) => ({
        id: index + 1,
        image: slide.url || slide.image || '',
        link: slide.link || '',
        mediaType: slide.mediaType,
      }));
      return (
        <HeroPreviewAny
          slides={heroSlides}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style || 'slider'}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          content={config.content || {}}
          onContentChange={(content: any) => onConfigChange({ ...config, content })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          isVisualEditAllowed={true}
        />
      );
    }
    case 'HomepageCategoryHero': {
      return (
        <HomepageCategoryHeroPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode as any}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
        />
      );
    }
    case 'Stats': {
      const items = (config.items as any[]) || [];
      return (
        <StatsPreviewAny
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style || 'cards'}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={config.spacing}
          cornerRadius={config.cornerRadius}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          isVisualEditAllowed={true}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
          onItemsChange={(nextItems: any) => onConfigChange({ ...config, items: nextItems })}
          desktopColumns={config.desktopColumns}
          mediaPlacement={config.mediaPlacement}
          mediaAlign={config.mediaAlign}
          backgroundImage={config.backgroundImage}
          fullWidth={config.fullWidth}
          enableAnimation={config.enableAnimation}
        />
      );
    }
    case 'About': {
      return (
        <AboutPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          cornerRadius={cornerRadius}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Services': {
      const items = (config.items as any[]) || [];
      return (
        <ServicesPreviewAny
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={config.spacing}
          cornerRadius={config.cornerRadius}
          isVisualEditAllowed={true}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
          onItemsChange={(nextItems: any) => onConfigChange({ ...config, items: nextItems })}
          mediaPlacement={config.mediaPlacement}
          mediaAlign={config.mediaAlign}
          desktopColumns={config.desktopColumns}
        />
      );
    }
    case 'Benefits': {
      const items = (config.items as any[]) || [];
      return (
        <BenefitsPreviewAny
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          isVisualEditAllowed={true}
          config={config as any}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
          onItemsChange={(nextItems: any) => onConfigChange({ ...config, items: nextItems })}
        />
      );
    }
    case 'FAQ': {
      const items = (config.items as any[]) || [];
      const handleItemTextChange = (id: any, field: 'question' | 'answer', value: string) => {
        const nextItems = items.map((item) =>
          item.id === id ? { ...item, [field]: value } : item
        );
        onConfigChange({
          ...config,
          items: nextItems,
        });
      };
      return (
        <FaqPreviewAny
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          config={config as any}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={config.spacing}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
          onItemTextChange={handleItemTextChange}
        />
      );
    }
    case 'CTA': {
      return (
        <CTAPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
        />
      );
    }
    case 'Testimonials': {
      const items = (config.items as any[]) || [];
      return (
        <TestimonialsPreviewAny
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          subtitle={subtitle}
          hideHeader={hideHeader}
          showTitle={showTitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={config.spacing}
          cornerRadius={config.cornerRadius}
          desktopColumns={config.desktopColumns}
          splitBackgroundImage={config.splitBackgroundImage}
          splitBackgroundOverlayOpacity={config.splitBackgroundOverlayOpacity}
          isVisualEditAllowed={true}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
          onItemsChange={(nextItems: any) => onConfigChange({ ...config, items: nextItems })}
        />
      );
    }
    case 'Contact': {
      return (
        <ContactPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
        />
      );
    }
    case 'Gallery': {
      const items = (config.items as any[]) || [];
      return (
        <GalleryPreviewAny
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          harmony={config.harmony}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          fullWidthDesktop={config.fullWidthDesktop}
          desktopColumns={config.desktopColumns}
          cornerRadius={config.cornerRadius}
          spacing={config.spacing}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Partners': {
      const items = (config.items as any[]) || [];
      return (
        <PartnersPreviewAny
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          title={title}
          subheading={config.subheading}
          align={config.align}
          displayMode={config.displayMode}
          cornerRadius={config.cornerRadius}
          logoSize={config.logoSize}
          showBorder={config.showBorder}
          spacing={config.spacing}
          onDisplayModeChange={(val: any) => handleHeaderConfigChange('displayMode', val)}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          logoColorMode={config.logoColorMode}
          logoColorIntensity={config.logoColorIntensity}
          hideHeader={hideHeader}
          showTitle={showTitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          isVisualEditAllowed={true}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'TrustBadges': {
      const items = (config.items as any[]) || [];
      return (
        <TrustBadgesPreviewAny
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          isVisualEditAllowed={true}
          config={config as any}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subHeading', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
          desktopColumns={config.desktopColumns}
        />
      );
    }
    case 'Pricing': {
      const plans = (config.plans as any[]) || [];
      return (
        <PricingPreviewAny
          config={config as any}
          plans={plans}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'ProductList': {
      return (
        <ProductListPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'ProductGrid': {
      return (
        <ProductGridPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'ServiceList': {
      const selectionMode = config.selectionMode || 'auto';
      const demoServices = (config.demoServices as any[]) || [];
      const itemCount = Number(config.itemCount) || 6;
      const selectedServiceIds = (config.selectedServiceIds as string[]) || [];

      const displayItems = (() => {
        if (selectionMode === 'demo' && demoServices.length > 0) {
          return demoServices.map((d: any) => ({
            id: d.id,
            name: d.name,
            image: d.image,
            price: d.price,
            description: d.description,
            tag: d.tag
          }));
        }
        if (!servicesData) {
          return [];
        }
        const published = (servicesData as any[]).filter((s: any) => s.status === 'Published');
        if (selectionMode === 'manual' && selectedServiceIds.length > 0) {
          const serviceMap = new Map(published.map((s: any) => [s._id, s]));
          return selectedServiceIds
            .map(id => serviceMap.get(id as any))
            .filter((s: any) => s !== undefined && s !== null)
            .slice(0, itemCount)
            .map((s: any) => ({
              description: s.excerpt,
              id: s._id,
              image: s.thumbnail,
              name: s.title,
              price: s.price ? s.price.toLocaleString('vi-VN') + 'đ' : 'Liên hệ'
            }));
        }
        return published.slice(0, itemCount).map((s: any) => ({
          description: s.excerpt,
          id: s._id,
          image: s.thumbnail,
          name: s.title,
          price: s.price ? s.price.toLocaleString('vi-VN') + 'đ' : 'Liên hệ'
        }));
      })();

      return (
        <ServiceListPreviewAny
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          cardRadius={config.cardRadius}
          desktopColumns={config.desktopColumns}
          itemCount={itemCount}
          items={displayItems}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
          onItemChange={(index: number, updatedItem: any) => {
            if (selectionMode === 'demo') {
              const nextDemo = [...demoServices];
              if (nextDemo[index]) {
                nextDemo[index] = { ...nextDemo[index], ...updatedItem };
                onConfigChange({ ...config, demoServices: nextDemo });
              }
            }
          }}
        />
      );
    }
    case 'Blog': {
      return (
        <BlogPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Career': {
      return (
        <CareerPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'CaseStudy': {
      const projects = (config.projects as any[]) || [];
      return (
        <CaseStudyPreviewAny
          config={config as any}
          projects={projects}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'SpeedDial': {
      return (
        <SpeedDialPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'ProductCategories': {
      return (
        <ProductCategoriesPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          categoriesData={productCategoriesData ?? []}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          selectionMode={config.selectionMode}
          demoCategories={config.demoCategories}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'CategoryProducts': {
      return (
        <CategoryProductsPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          categoriesData={productCategoriesData ?? []}
          productsData={categoryProductsData ?? []}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Team': {
      const members = (config.members as any[]) || [];
      return (
        <TeamPreviewAny
          members={members}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          texts={config.texts || {}}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          desktopColumns={config.desktopColumns}
          cornerRadius={cornerRadius}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
          onMembersChange={(nextMembers: any) => onConfigChange({ ...config, members: nextMembers })}
        />
      );
    }
    case 'Features': {
      const items = (config.items as any[]) || [];
      return (
        <FeaturesPreviewAny
          config={config as any}
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Process': {
      return (
        <ProcessPreviewAny
          config={config}
          onConfigChange={onConfigChange}
          steps={config.steps}
          onItemsChange={(nextSteps: any) => onConfigChange({ ...config, steps: nextSteps })}
          circularCtaText={config.circularCtaText}
          circularCtaLink={config.circularCtaLink}
          desktopColumns={config.desktopColumns}
          cornerRadius={config.cornerRadius}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Clients': {
      const items = (config.items as any[]) || [];
      return (
        <ClientsPreviewAny
          config={config as any}
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          cornerRadius={cornerRadius}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Video': {
      return (
        <VideoPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Countdown': {
      return (
        <CountdownPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'VoucherPromotions': {
      return (
        <VoucherPromotionsPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Popup': {
      return (
        <PopupPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Marquee': {
      return (
        <MarqueePreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          title={title}
          hideHeader={hideHeader}
          showTitle={showTitle}
          subtitle={subtitle}
          showSubtitle={showSubtitle}
          headerAlign={headerAlign}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          showBadge={showBadge}
          badgeText={badgeText}
          spacing={spacing}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
          onTitleChange={onTitleChange}
          onSubtitleChange={(val: string) => handleHeaderConfigChange('subtitle', val)}
          onBadgeTextChange={(val: string) => handleHeaderConfigChange('badgeText', val)}
        />
      );
    }
    case 'Footer': {
      return (
        <FooterPreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          selectedStyle={config.style}
          onStyleChange={(style: any) => onConfigChange({ ...config, style })}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          isVisualEditAllowed={true}
          onConfigChange={onConfigChange}
        />
      );
    }
    case 'CustomHome': {
      return (
        <CustomHomePreviewAny
          config={config as any}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          fontStyle={fontStyle}
          fontClassName={fontClassName}
          onChange={onConfigChange}
          title={title}
        />
      );
    }
    default: {
      return (
        <div className="p-8 border rounded-lg bg-slate-50 text-center text-slate-500 dark:bg-slate-900">
          Component type &quot;{type}&quot; chưa được hỗ trợ xem trước ở Live Editor.
        </div>
      );
    }
  }
}
