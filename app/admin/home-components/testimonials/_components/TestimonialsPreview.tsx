'use client';

import React from 'react';
import { BrowserFrame } from '../../_shared/components/BrowserFrame';
import { PreviewWrapper } from '../../_shared/components/PreviewWrapper';
import { deviceWidths, usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import type { SectionSpacing } from '../../_shared/types/sectionSpacing';
import { getTestimonialsSectionColors } from '../_lib/colors';
import { TestimonialsSectionShared } from './TestimonialsSectionShared';
import type {
  TestimonialsBrandMode,
  TestimonialsCornerRadius,
  TestimonialsDesktopColumns,
  TestimonialsItem,
  TestimonialsStyle,
} from '../_types';

const TESTIMONIAL_STYLES: Array<{ id: TestimonialsStyle; label: string }> = [
  { id: 'cards', label: 'Cards' },
  { id: 'slider', label: 'Slider' },
  { id: 'marquee', label: 'Marquee' },
  { id: 'showcase', label: 'Showcase' },
  { id: 'quote', label: 'Quote' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'split-carousel', label: 'Split' },
  { id: 'overlap-carousel', label: 'Overlap' },
  { id: 'builder-cards', label: 'Builder' },
  { id: 'builder-carousel', label: 'Builder Slide' },
];

export const TestimonialsPreview = ({
  items,
  brandColor,
  secondary,
  mode = 'dual',
  selectedStyle,
  onStyleChange,
  fontStyle,
  fontClassName,
  // header props
  title,
  subtitle,
  hideHeader,
  showTitle,
  showSubtitle,
  headerAlign,
  titleColorPrimary,
  subtitleAboveTitle,
  uppercaseText,
  showBadge,
  badgeText,
  desktopColumns = 3,
  splitBackgroundImage,
  splitBackgroundOverlayOpacity,
  spacing = 'normal',
  cornerRadius = 'lg',
}: {
  items: TestimonialsItem[];
  brandColor: string;
  secondary: string;
  mode?: TestimonialsBrandMode;
  selectedStyle?: TestimonialsStyle;
  onStyleChange?: (style: TestimonialsStyle) => void;
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  headerAlign?: 'left' | 'center' | 'right';
  titleColorPrimary?: boolean;
  subtitleAboveTitle?: boolean;
  uppercaseText?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  spacing?: SectionSpacing;
  desktopColumns?: TestimonialsDesktopColumns;
  splitBackgroundImage?: string;
  splitBackgroundOverlayOpacity?: number;
  cornerRadius?: TestimonialsCornerRadius;
}) => {
  const { device, setDevice } = usePreviewDevice();
  const previewStyle = selectedStyle ?? 'cards';
  const itemCount = items.length;

  const setPreviewStyle = (style: string) => {
    if (['cards', 'slider', 'marquee', 'showcase', 'quote', 'minimal', 'split-carousel', 'overlap-carousel', 'builder-cards', 'builder-carousel'].includes(style)) {
      onStyleChange?.(style as TestimonialsStyle);
    }
  };

  const colors = getTestimonialsSectionColors({ mode, primary: brandColor, secondary });

  return (
    <PreviewWrapper
      title="Preview Testimonials"
      device={device}
      setDevice={setDevice}
      previewStyle={previewStyle}
      setPreviewStyle={setPreviewStyle}
      styles={TESTIMONIAL_STYLES}
      deviceWidthClass={deviceWidths[device]}
      info={`${itemCount} đánh giá`}
      fontStyle={fontStyle}
      fontClassName={fontClassName}
    >
      <BrowserFrame>
        <div className="@container/preview">
          <TestimonialsSectionShared
            items={items}
            style={previewStyle}
            title={title}
            subtitle={subtitle}
            tokens={colors}
            mode={mode}
            context="preview"
            device={device}
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
            badgeText={badgeText}
            desktopColumns={desktopColumns}
            splitBackgroundImage={splitBackgroundImage}
            splitBackgroundOverlayOpacity={splitBackgroundOverlayOpacity}
            spacing={spacing}
            cornerRadius={cornerRadius}
          />
        </div>
      </BrowserFrame>
    </PreviewWrapper>
  );
};
