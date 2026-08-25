'use client';
import { usePreviewVisualEdit } from '../../_shared/components/PreviewWrapper';


import React from 'react';
import { BrowserFrame } from '../../_shared/components/BrowserFrame';
import { ColorInfoPanel } from '../../_shared/components/ColorInfoPanel';
import { PreviewWrapper } from '../../_shared/components/PreviewWrapper';
import { deviceWidths, usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import type { SectionSpacing } from '../../_shared/types/sectionSpacing';
import { FeaturesSectionShared } from './FeaturesSectionShared';
import type {
  FeatureItem,
  FeaturesBrandMode,
  FeaturesCornerRadius,
  FeaturesDesktopColumns,
  FeaturesStyle,
} from '../_types';

const styles: Array<{ id: FeaturesStyle; label: string }> = [
  { id: 'carousel6', label: 'Carousel 6' },
  { id: 'iconGrid', label: 'Icon Grid' },
  { id: 'alternating', label: 'Alternating' },
  { id: 'compact', label: 'Compact' },
  { id: 'cards', label: 'Cards' },
  { id: 'carousel', label: 'Carousel' },
  { id: 'timeline', label: 'Media Carousel' },
];

interface FeaturesPreviewProps {
  items: FeatureItem[];
  brandColor: string;
  secondary: string;
  mode: FeaturesBrandMode;
  sectionTitle?: string;
  selectedStyle?: FeaturesStyle;
  onStyleChange?: (style: FeaturesStyle) => void;
  showIcons?: boolean;
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
  // Shared header config
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
  desktopColumns?: FeaturesDesktopColumns;
  cornerRadius?: FeaturesCornerRadius;
  isVisualEditAllowed?: boolean;
  onTitleChange?: (value: string) => void;
  onSubtitleChange?: (value: string) => void;
  onBadgeTextChange?: (value: string) => void;
  onItemsChange?: (value: FeatureItem[]) => void;
}

export function FeaturesPreview({
  items = [],
  brandColor,
  secondary,
  mode,
  sectionTitle,
  selectedStyle,
  onStyleChange,
  showIcons = true,
  fontStyle,
  fontClassName,
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
  desktopColumns,
  cornerRadius,
  isVisualEditAllowed = true,
  onTitleChange,
  onSubtitleChange,
  onBadgeTextChange,
  onItemsChange,
}: FeaturesPreviewProps) {
  const { device, setDevice } = usePreviewDevice();
  const [visualEditEnabled, setVisualEditEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!isVisualEditAllowed) {
      setVisualEditEnabled(false);
    }
  }, [isVisualEditAllowed]);

  const visualEditContext = usePreviewVisualEdit();
  const isVisualEditActive = isVisualEditAllowed && (visualEditContext.active || visualEditEnabled);

  const previewStyle = selectedStyle ?? 'carousel6';
  const info = (() => {
    const modeLabel = mode === 'dual' ? '2 màu' : '1 màu';
    if (items.length === 0) {return `Chưa có tính năng • ${modeLabel}`;}
    const sizeLabel = previewStyle === 'carousel'
      ? 'Icon: 56×56px • Card rộng'
      : previewStyle === 'carousel6'
        ? 'Icon: 48×48px • Carousel 6'
        : previewStyle === 'timeline'
          ? 'Ảnh + icon • Media Carousel'
          : 'Icon: 40-56px';
    return `${items.length} tính năng • ${sizeLabel} • ${modeLabel}`;
  })();

  const handleToggleVisualEdit = () => {
    setVisualEditEnabled((prev) => !prev);
  };

  const handleItemTextUpdate = (idx: number, field: 'title' | 'description', nextText: string) => {
    if (!onItemsChange) return;
    const nextItems = items.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          [field]: nextText,
        };
      }
      return item;
    });
    onItemsChange(nextItems);
  };

  return (
    <>
      <PreviewWrapper
        title="Preview Features"
        device={device}
        setDevice={setDevice}
        previewStyle={previewStyle}
        visualEditActive={isVisualEditActive}
        visualEditAllowed={isVisualEditAllowed}
        onVisualEditToggle={handleToggleVisualEdit}
        setPreviewStyle={(next) => onStyleChange?.(next as FeaturesStyle)}
        styles={styles}
        info={info}
        fontStyle={fontStyle}
        fontClassName={fontClassName}
        deviceWidthClass={deviceWidths[device]}
      >
        <div className="space-y-3">

          <BrowserFrame url="yoursite.com/features">
            <FeaturesSectionShared
              context="preview"
              device={device}
              items={items}
              style={previewStyle}
              showIcons={showIcons}
              title={sectionTitle}
              brandColor={brandColor}
              secondary={secondary}
              mode={mode}
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
              desktopColumns={desktopColumns}
              cornerRadius={cornerRadius}
              isVisualEditActive={isVisualEditActive}
              onItemTextUpdate={handleItemTextUpdate}
              onTitleChange={onTitleChange}
              onSubtitleChange={onSubtitleChange}
              onBadgeTextChange={onBadgeTextChange}
            />
          </BrowserFrame>
        </div>
      </PreviewWrapper>

      {mode === 'dual' ? (
        <ColorInfoPanel
          brandColor={brandColor}
          secondary={secondary}
          description="Màu phụ được áp dụng cho badge, icon, accent và điều hướng trong Features."
        />
      ) : null}
    </>
  );
}

export type { FeaturesStyle } from '../_types';
