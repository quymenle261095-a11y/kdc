'use client';
import { usePreviewVisualEdit } from '../../_shared/components/PreviewWrapper';

import type { SectionSpacing } from '../../_shared/types/sectionSpacing';

import React from 'react';

import { ProcessSectionShared } from './ProcessSectionShared';
import { normalizeProcessRenderSteps } from '../_lib/normalize';
import type { ProcessBrandMode, ProcessCornerRadius, ProcessStyle } from '../_types';
import { usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import { usePreviewDark } from '../../_shared/components/PreviewWrapper';

interface ProcessPreviewProps {
  steps: unknown;
  brandColor: string;
  secondary: string;
  mode: ProcessBrandMode;
  selectedStyle?: ProcessStyle;
  onStyleChange?: (style: ProcessStyle) => void;
  title?: string;
  hideHeader?: boolean;
  showTitle?: boolean;
  showSubtitle?: boolean;
  subtitle?: string;
  headerAlign?: 'left' | 'center' | 'right';
  titleColorPrimary?: boolean;
  subtitleAboveTitle?: boolean;
  uppercaseText?: boolean;
  showBadge?: boolean;
  badgeText?: string;
  spacing?: SectionSpacing;
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
  desktopColumns?: 3 | 4;
  cornerRadius?: ProcessCornerRadius;
  circularCtaText?: string;
  circularCtaLink?: string;
  isVisualEditAllowed?: boolean;
  onTitleChange?: (value: string) => void;
  onSubtitleChange?: (value: string) => void;
  onBadgeTextChange?: (value: string) => void;
  onItemsChange?: (value: any[]) => void;
  config?: any;
  onConfigChange?: (cfg: any) => void;
}

export const ProcessPreview = ({
  steps,
  brandColor,
  secondary,
  mode,
  selectedStyle = 'horizontal',
  onStyleChange,
  title = 'Quy trình làm việc',
  hideHeader,
  showTitle,
  showSubtitle,
  subtitle,
  headerAlign,
  titleColorPrimary,
  subtitleAboveTitle,
  uppercaseText,
  showBadge,
  badgeText,
  fontStyle,
  fontClassName,
  desktopColumns = 4,
  spacing,
  cornerRadius,
  circularCtaText,
  circularCtaLink,
  isVisualEditAllowed = true,
  onTitleChange,
  onSubtitleChange,
  onBadgeTextChange,
  onItemsChange,
  config,
  onConfigChange,
}: ProcessPreviewProps) => {
  const { device, setDevice } = usePreviewDevice();
  const { isDark } = usePreviewDark();
  const [visualEditEnabled, setVisualEditEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!isVisualEditAllowed) {
      setVisualEditEnabled(false);
    }
  }, [isVisualEditAllowed]);

  const visualEditContext = usePreviewVisualEdit();
  const isVisualEditActive = isVisualEditAllowed && (visualEditContext.active || visualEditEnabled);

  const handleToggleVisualEdit = () => {
    setVisualEditEnabled((prev) => !prev);
  };

  const normalizedSteps = React.useMemo(() => normalizeProcessRenderSteps(steps), [steps]);

  return (
    <div className="space-y-3">

      <ProcessSectionShared
        steps={normalizedSteps}
        sectionTitle={title}
        style={selectedStyle}
        brandColor={brandColor}
        secondary={secondary}
        mode={mode}
        context="preview"
        previewDevice={device}
        setPreviewDevice={setDevice}
        includePreviewWrapper
        previewStyle={selectedStyle}
        onPreviewStyleChange={onStyleChange}
        hideHeader={hideHeader}
        showTitle={showTitle}
        showSubtitle={showSubtitle}
        subtitle={subtitle}
        headerAlign={headerAlign}
        titleColorPrimary={titleColorPrimary}
        subtitleAboveTitle={subtitleAboveTitle}
        uppercaseText={uppercaseText}
        showBadge={showBadge}
        badgeText={badgeText}
        fontStyle={fontStyle}
        fontClassName={fontClassName}
        desktopColumns={desktopColumns}
        spacing={spacing}
        cornerRadius={cornerRadius}
        circularCtaText={circularCtaText}
        circularCtaLink={circularCtaLink}
        isDark={isDark}
        visualEditActive={isVisualEditActive}
        onVisualEditToggle={handleToggleVisualEdit}
        onTitleChange={onTitleChange}
        onSubtitleChange={onSubtitleChange}
        onBadgeTextChange={onBadgeTextChange}
        onItemsChange={onItemsChange}
        onCircularCtaTextChange={(val) => onConfigChange?.({ ...config, circularCtaText: val })}
      />
    </div>
  );
};
