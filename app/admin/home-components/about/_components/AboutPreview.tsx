'use client';

import React from 'react';
import { BrowserFrame } from '../../_shared/components/BrowserFrame';
import { ColorInfoPanel } from '../../_shared/components/ColorInfoPanel';
import { PreviewWrapper } from '../../_shared/components/PreviewWrapper';
import { SectionHeader } from '../../_shared/components/SectionHeader';
import { deviceWidths, usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import { getSectionSpacingClassName, type SectionSpacing } from '../../_shared/types/sectionSpacing';
import { ABOUT_STYLES } from '../_lib/constants';
import {
  getAboutSectionColors,
  getAboutValidationResult,
} from '../_lib/colors';
import { AboutSectionShared } from './AboutSectionShared';
import type { AboutBrandMode, AboutConfig, AboutCornerRadius, AboutStyle } from '../_types';

interface AboutPreviewProps {
  config: AboutConfig;
  brandColor: string;
  secondary: string;
  mode?: AboutBrandMode;
  selectedStyle?: AboutStyle;
  onStyleChange?: (style: AboutStyle) => void;
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
  // Header config
  title?: string;
  hideHeader?: boolean;
  showTitle?: boolean;
  subtitle?: string;
  showSubtitle?: boolean;
  headerAlign?: 'left' | 'center' | 'right';
  titleColorPrimary?: boolean;
  subtitleAboveTitle?: boolean;
  uppercaseText?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  spacing?: SectionSpacing;
  cornerRadius?: AboutCornerRadius;
}

export const AboutPreview = ({
  config,
  brandColor,
  secondary,
  mode = 'dual',
  selectedStyle,
  onStyleChange,
  fontStyle,
  fontClassName,
  title,
  hideHeader,
  showTitle,
  subtitle,
  showSubtitle,
  headerAlign,
  titleColorPrimary,
  subtitleAboveTitle,
  uppercaseText,
  showBadge,
  badgeText,
  spacing,
  cornerRadius,
}: AboutPreviewProps) => {
  const { device, setDevice } = usePreviewDevice();

  const previewStyle = selectedStyle ?? config.style ?? 'bento';
  const setPreviewStyle = (nextStyle: string) => {
    onStyleChange?.(nextStyle as AboutStyle);
  };

  const validation = React.useMemo(
    () => getAboutValidationResult({
      primary: brandColor,
      secondary,
      mode,
      style: previewStyle,
    }),
    [brandColor, secondary, mode, previewStyle],
  );

  const tokens = React.useMemo(
    () => getAboutSectionColors({
      primary: brandColor,
      secondary,
      mode,
    }),
    [brandColor, secondary, mode],
  );

  return (
    <>
      <PreviewWrapper
        title="Preview Về chúng tôi"
        device={device}
        setDevice={setDevice}
        previewStyle={previewStyle}
        setPreviewStyle={setPreviewStyle}
        styles={ABOUT_STYLES}
        info={`${config.features?.length ?? 0} điểm nổi bật • ${mode === 'dual' ? '2 màu' : '1 màu'}`}
        deviceWidthClass={deviceWidths[device]}
        fontStyle={fontStyle}
        fontClassName={fontClassName}
      >
        <BrowserFrame url="yoursite.com/about">
          <div className="container mx-auto px-4">
            <div className={getSectionSpacingClassName(spacing)}>
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
                brandColor={tokens.primary}
              />
              <AboutSectionShared
                context="preview"
                mode={mode}
                style={previewStyle}
                title={title || config.heading || 'Về chúng tôi'}
                subHeading={config.subHeading}
                heading={config.heading}
                highlightText={config.highlightText}
                description={config.description}
                phone={config.phone}
                image={config.image}
                images={config.images}
                imageCaption={config.imageCaption}
                buttonText={config.buttonText}
                buttonLink={config.buttonLink}
                features={config.features ?? []}
                stats={config.stats ?? []}
                tokens={tokens}
                device={device}
                cornerRadius={cornerRadius ?? config.cornerRadius ?? 'lg'}
              />
            </div>
          </div>
        </BrowserFrame>
      </PreviewWrapper>

      {mode === 'dual' ? (
        <ColorInfoPanel
          brandColor={validation.tokens.primary}
          secondary={validation.tokens.secondary}
          description="Màu phụ áp dụng cho badge, timeline dot, chỉ số phụ và điểm nhấn điều hướng trong About."
        />
      ) : null}
    </>
  );
};
