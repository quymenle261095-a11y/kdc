'use client';

import React from 'react';
import { BrowserFrame } from '../../_shared/components/BrowserFrame';
import { ColorInfoPanel } from '../../_shared/components/ColorInfoPanel';
import { PreviewWrapper } from '../../_shared/components/PreviewWrapper';
import { SectionHeader } from '../../_shared/components/SectionHeader';
import { deviceWidths, usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import type { SectionSpacing } from '../../_shared/types/sectionSpacing';
import { ServicesSectionCore } from '@/components/site/ServicesSectionCore';
import { getServicesColors } from '../_lib/colors';
import { DEFAULT_SERVICES_CORNER_RADIUS, DEFAULT_SERVICES_SPACING, getServicesSectionSpacingClassName, type ServiceItem, type ServiceItemMediaAlign, type ServiceItemMediaPlacement, type ServicesBrandMode, type ServicesCornerRadius, type ServicesSpacing, type ServicesStyle } from '../_types';

const SERVICES_STYLES: Array<{ id: ServicesStyle; label: string }> = [
  { id: 'elegantGrid', label: 'Layout 1' },
  { id: 'modernList', label: 'Layout 2' },
  { id: 'bigNumber', label: 'Layout 3' },
  { id: 'cards', label: 'Layout 4' },
  { id: 'carousel', label: 'Layout 5' },
  { id: 'timeline', label: 'Layout 6' },
  { id: 'builderPolicy', label: 'Layout 7' },
  { id: 'builderFeatureCircle', label: 'Layout 8' },
];

export const ServicesPreview = ({
  items,
  mediaPlacement = 'top',
  mediaAlign = 'center',
  headerAlign = 'left',
  desktopColumns = 3,
  subtitle,
  showTitle = true,
  showSubtitle = true,
  showBadge = true,
  badgeText,
  hideHeader = false,
  titleColorPrimary = false,
  subtitleAboveTitle = false,
  uppercaseText = false,
  spacing = DEFAULT_SERVICES_SPACING,
  cornerRadius = DEFAULT_SERVICES_CORNER_RADIUS,
  brandColor,
  secondary,
  title = 'Dịch vụ',
  selectedStyle = 'elegantGrid',
  onStyleChange,
  mode = 'dual',
  fontStyle,
  fontClassName,
}: {
  items: ServiceItem[];
  mediaPlacement?: ServiceItemMediaPlacement;
  mediaAlign?: ServiceItemMediaAlign;
  headerAlign?: ServiceItemMediaAlign;
  desktopColumns?: 3 | 4;
  subtitle?: string;
  showTitle?: boolean;
  showSubtitle?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  spacing?: SectionSpacing  ;
  cornerRadius?: ServicesCornerRadius;
  hideHeader?: boolean;
  titleColorPrimary?: boolean;
  subtitleAboveTitle?: boolean;
  uppercaseText?: boolean;
  brandColor: string;
  secondary: string;
  title?: string;
  selectedStyle?: ServicesStyle;
  onStyleChange?: (style: ServicesStyle) => void;
  mode?: ServicesBrandMode;
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
}) => {
  const { device, setDevice } = usePreviewDevice();

  const previewStyle = selectedStyle;
  const colors = React.useMemo(
    () => getServicesColors(brandColor, secondary, mode),
    [brandColor, secondary, mode],
  );

  return (
    <>
      <PreviewWrapper
        title="Preview Services"
        device={device}
        setDevice={setDevice}
        previewStyle={previewStyle}
        setPreviewStyle={(next) => onStyleChange?.(next as ServicesStyle)}
        styles={SERVICES_STYLES}
        info={`${items.length} mục`}
        fontStyle={fontStyle}
        fontClassName={fontClassName ?? 'font-active'}
        deviceWidthClass={deviceWidths[device]}
      >
        <BrowserFrame>
          <div className={getServicesSectionSpacingClassName(spacing as ServicesSpacing)}>
            <div className="px-4">
              <SectionHeader
                title={title}
                subtitle={subtitle}
                badgeText={badgeText}
                hideHeader={hideHeader}
                showTitle={showTitle}
                showSubtitle={showSubtitle}
                showBadge={showBadge}
                headerAlign={headerAlign}
                titleColorPrimary={titleColorPrimary}
                subtitleAboveTitle={subtitleAboveTitle}
                uppercaseText={uppercaseText}
                brandColor={brandColor}
              />
            </div>
            <ServicesSectionCore
              items={items}
              style={previewStyle}
              mediaPlacement={mediaPlacement}
              mediaAlign={mediaAlign}
              headerAlign={headerAlign}
              desktopColumns={desktopColumns}
              subtitle={''}
              showTitle={false}
              showSubtitle={false}
              title={''}
              colors={colors}
              device={device}
              spacing="none"
              cornerRadius={cornerRadius}
              isPreview
              carouselId={`services-preview-carousel-${device}`}
            />
          </div>
        </BrowserFrame>
      </PreviewWrapper>
      <ColorInfoPanel brandColor={colors.primary} secondary={colors.secondary} />
    </>
  );
};

