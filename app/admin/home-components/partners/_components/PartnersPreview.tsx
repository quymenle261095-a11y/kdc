import React from 'react';
import { Building2 } from 'lucide-react';
import { BrowserFrame } from '../../_shared/components/BrowserFrame';
import { ColorInfoPanel } from '../../_shared/components/ColorInfoPanel';
import { PreviewImage } from '../../_shared/components/PreviewImage';
import { PreviewWrapper } from '../../_shared/components/PreviewWrapper';
import { SectionHeader } from '../../_shared/components/SectionHeader';
import { Button, cn } from '../../../components/ui';
import { deviceWidths, usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import { getPreviewDeviceClass } from '../../_shared/lib/previewResponsive';
import { PARTNERS_STYLES } from '../_lib/constants';
import { DEFAULT_PARTNERS_DISPLAY_MODE, DEFAULT_PARTNERS_LOGO_SIZE, DEFAULT_PARTNERS_SHOW_BORDER, DEFAULT_PARTNERS_SPACING, getPartnersSectionSpacingClassName, type PartnerItem, type PartnersAlign, type PartnersCornerRadius, type PartnersDisplayMode, type PartnersLogoSize, type PartnersSpacing, type PartnersStyle } from '../_types';
import { getPartnersColors, type PartnersBrandMode } from '../_lib/colors';
import { PartnersMarqueeShared } from './PartnersMarqueeShared';
import { PartnersBadgeShared } from './PartnersBadgeShared';
import { PartnersCarouselShared } from './PartnersCarouselShared';
import { PartnersCleanShared } from './PartnersCleanShared';
import { PartnersDividerShared } from './PartnersDividerShared';
import { PartnersGridShared } from './PartnersGridShared';
import { PartnersLogoCloudShared } from './PartnersLogoCloudShared';

export const PartnersPreview = ({
  items,
  brandColor,
  secondary,
  mode = 'dual',
  selectedStyle = 'grid',
  onStyleChange,
  title,
  subheading,
  align = 'center',
  displayMode = DEFAULT_PARTNERS_DISPLAY_MODE,
  cornerRadius = 'lg',
  logoSize = DEFAULT_PARTNERS_LOGO_SIZE,
  showBorder = DEFAULT_PARTNERS_SHOW_BORDER,
  spacing = DEFAULT_PARTNERS_SPACING,
  onDisplayModeChange,
  fontStyle,
  fontClassName,
  // Shared header config
  hideHeader,
  showTitle,
  showSubtitle,
  headerAlign,
  titleColorPrimary,
  subtitleAboveTitle,
  uppercaseText,
  showBadge,
  badgeText,
}: {
  items: PartnerItem[];
  brandColor: string;
  secondary: string;
  mode?: PartnersBrandMode;
  selectedStyle?: PartnersStyle;
  onStyleChange?: (style: PartnersStyle) => void;
  title?: string;
  subheading?: string;
  align?: PartnersAlign;
  displayMode?: PartnersDisplayMode;
  cornerRadius?: PartnersCornerRadius;
  logoSize?: PartnersLogoSize;
  showBorder?: boolean;
  spacing?: PartnersSpacing;
  onDisplayModeChange?: (mode: PartnersDisplayMode) => void;
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
  // Shared header config
  hideHeader?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  headerAlign?: 'left' | 'center' | 'right';
  titleColorPrimary?: boolean;
  subtitleAboveTitle?: boolean;
  uppercaseText?: boolean;
  showBadge?: boolean;
  badgeText?: string;
}) => {
  const { device, setDevice } = usePreviewDevice();
  const previewStyle = selectedStyle ?? 'grid';
  const setPreviewStyle = (style: string) => onStyleChange?.(style as PartnersStyle);
  const colors = React.useMemo(() => getPartnersColors(brandColor, secondary, mode), [brandColor, secondary, mode]);

  // Determine if we should use shared SectionHeader (when header config props are provided)
  const hasSharedHeaderConfig = hideHeader !== undefined || showBadge !== undefined;

  const renderEmptyState = () => (
    <section className={cn('w-full bg-white dark:bg-slate-900', getPartnersSectionSpacingClassName(spacing, 'empty'))}>
      <div className={cn('flex flex-col items-center justify-center text-center', getPartnersSectionSpacingClassName(spacing, 'empty'))}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: colors.iconBg }}>
          <Building2 size={28} style={{ color: colors.iconColor }} />
        </div>
        <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-1">Chưa có đối tác nào</h3>
        <p className="text-sm text-slate-500">Thêm logo đối tác đầu tiên</p>
      </div>
    </section>
  );

  const renderGridStyle = () => {
    if (items.length === 0) {return renderEmptyState();}

    const maxVisible = device === 'mobile' ? 8 : 20;
    const columnsClassName = getPreviewDeviceClass(device, {
      mobile: 'grid-cols-2',
      tablet: 'grid-cols-3',
      desktop: 'grid-cols-4',
    });

    return (
      <PartnersGridShared
        items={items}
        title={title ?? 'Đối tác'}
        subheading={subheading}
        align={align}
        displayMode={displayMode}
        cornerRadius={cornerRadius}
        logoSize={logoSize}
        showBorder={showBorder}
        spacing={spacing}
        brandColor={brandColor}
        secondary={secondary}
        mode={mode}
        maxVisible={maxVisible}
        columnsClassName={columnsClassName}
        openInNewTab
        renderImage={(item, className) => (
          <PreviewImage src={item.url ?? ''} alt={item.name ?? ''} className={className} />
        )}
        className="dark:bg-slate-900 dark:border-slate-700"
        skipHeader={hasSharedHeaderConfig}
      />
    );
  };

  const renderMarqueeStyle = () => {
    if (items.length === 0) {return renderEmptyState();}

    return (
      <PartnersMarqueeShared
        items={items}
        brandColor={brandColor}
        secondary={secondary}
        mode={mode}
        title={title ?? 'Đối tác'}
        subheading={subheading}
        align={align}
        displayMode={displayMode}
        logoSize={logoSize}
        spacing={spacing}
        speed={1.15}
        openInNewTab
        renderImage={(item, className) => (
          <PreviewImage src={item.url} alt={item.name ?? ''} className={className} />
        )}
        className="dark:bg-slate-900 dark:border-slate-700/40"
        skipHeader={false}
      />
    );
  };

  const renderCleanStyle = () => {
    if (items.length === 0) {return renderEmptyState();}

    return (
      <PartnersCleanShared
        items={items}
        brandColor={brandColor}
        secondary={secondary}
        mode={mode}
        title={title ?? 'Đối tác'}
        subheading={subheading}
        align={align}
        displayMode={displayMode}
        logoSize={logoSize}
        spacing={spacing}
        openInNewTab
        renderImage={(item, className) => (
          <PreviewImage src={item.url} alt={item.name ?? ''} className={className} />
        )}
        className="dark:bg-slate-900 dark:border-slate-700/40"
        skipHeader={hasSharedHeaderConfig}
      />
    );
  };

  const renderBadgeStyle = () => {
    if (items.length === 0) {return renderEmptyState();}

    return (
      <PartnersBadgeShared
        items={items}
        brandColor={brandColor}
        secondary={secondary}
        mode={mode}
        title={title ?? 'Đối tác'}
        subheading={subheading}
        align={align}
        displayMode={displayMode}
        cornerRadius={cornerRadius}
        logoSize={logoSize}
        showBorder={showBorder}
        spacing={spacing}
        maxVisible={items.length}
        openInNewTab
        renderImage={(item, className) => (
          <PreviewImage src={item.url} alt={item.name ?? ''} className={className} />
        )}
        skipHeader={hasSharedHeaderConfig}
      />
    );
  };

  const renderCarouselStyle = () => (
    <PartnersCarouselShared
      items={items}
      brandColor={brandColor}
      secondary={secondary}
      mode={mode}
      title={title ?? 'Đối tác'}
      subheading={subheading}
      align={align}
      displayMode={displayMode}
      cornerRadius={cornerRadius}
      logoSize={logoSize}
      showBorder={showBorder}
      spacing={spacing}
      openInNewTab
      renderImage={(item, className) => (
        <PreviewImage src={item.url} alt={item.name ?? ''} className={className} />
      )}
      className="dark:bg-slate-900 dark:border-slate-700/40"
      skipHeader={hasSharedHeaderConfig}
    />
  );

  const renderLogoCloudStyle = () => {
    if (items.length === 0) {return renderEmptyState();}

    return (
      <div className={cn('w-full bg-white dark:bg-slate-900', getPartnersSectionSpacingClassName(spacing, 'logoCloud'))}>
        <PartnersLogoCloudShared
          items={items}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          cornerRadius={cornerRadius}
          logoSize={logoSize}
          showBorder={showBorder}
          spacing={spacing}
          openInNewTab
          renderImage={(item, className) => (
            <PreviewImage src={item.url} alt={item.name ?? 'Hình ảnh'} className={className} />
          )}
        />
      </div>
    );
  };

  const renderDividerStyle = () => {
    if (items.length === 0) {return renderEmptyState();}

    const columnsClassName = getPreviewDeviceClass(device, {
      mobile: 'grid-cols-2',
      tablet: 'grid-cols-3',
      desktop: 'grid-cols-4',
    });

    return (
      <PartnersDividerShared
        items={items}
        brandColor={brandColor}
        secondary={secondary}
        mode={mode}
        title={title ?? 'Đối tác'}
        subheading={subheading}
        align={align}
        displayMode={displayMode}
        cornerRadius={cornerRadius}
        logoSize={logoSize}
        showBorder={showBorder}
        spacing={spacing}
        openInNewTab
        columnsClassName={columnsClassName}
        renderImage={(item, className) => (
          <PreviewImage src={item.url ?? ''} alt={item.name ?? ''} className={className} />
        )}
        className="dark:bg-slate-900 dark:border-slate-700/40"
        skipHeader={hasSharedHeaderConfig}
      />
    );
  };

  const renderSharedHeader = () => {
    if (!hasSharedHeaderConfig || hideHeader) {return null;}
    return (
      <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6', spacing === 'none' ? 'pt-0' : spacing === 'compact' ? 'pt-4 md:pt-6' : 'pt-8 md:pt-12')}>
        <SectionHeader
          title={title}
          subtitle={subheading}
          badgeText={badgeText}
          hideHeader={hideHeader}
          showTitle={showTitle}
          showSubtitle={showSubtitle}
          showBadge={showBadge}
          headerAlign={headerAlign ?? align}
          titleColorPrimary={titleColorPrimary}
          subtitleAboveTitle={subtitleAboveTitle}
          uppercaseText={uppercaseText}
          brandColor={brandColor}
          className={cn('mb-0', spacing === 'none' && 'gap-0')}
        />
      </div>
    );
  };

  return (
    <>
      <PreviewWrapper
        title="Preview Partners"
        device={device}
        setDevice={setDevice}
        previewStyle={previewStyle}
        setPreviewStyle={setPreviewStyle}
        styles={PARTNERS_STYLES}
        deviceWidthClass={deviceWidths[device]}
        info={`${items.length} logo • ${mode === 'dual' ? '2 màu' : '1 màu'}`}
        fontStyle={fontStyle}
        fontClassName={fontClassName}
      >
        <div className="mb-3 flex justify-end gap-2">
          <Button
            type="button"
            variant={displayMode === 'withName' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDisplayModeChange?.('withName')}
          >
            Hiện tên logo
          </Button>
          <Button
            type="button"
            variant={displayMode === 'logoOnly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDisplayModeChange?.('logoOnly')}
          >
            Chỉ logo
          </Button>
        </div>
        <BrowserFrame>
          {previewStyle !== 'marquee' && renderSharedHeader()}
          {previewStyle === 'grid' && renderGridStyle()}
          {previewStyle === 'marquee' && renderMarqueeStyle()}
          {previewStyle === 'badge' && renderBadgeStyle()}
          {previewStyle === 'carousel' && renderCarouselStyle()}
          {previewStyle === 'logoCloud' && renderLogoCloudStyle()}
          {previewStyle === 'clean' && renderCleanStyle()}
          {previewStyle === 'divider' && renderDividerStyle()}
        </BrowserFrame>
      </PreviewWrapper>
      <ColorInfoPanel brandColor={brandColor} secondary={secondary} />
    </>
  );
};
