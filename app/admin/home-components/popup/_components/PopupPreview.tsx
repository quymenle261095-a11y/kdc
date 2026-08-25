'use client';
import { usePreviewVisualEdit } from '../../_shared/components/PreviewWrapper';


import React from 'react';

import { usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import { usePreviewDark } from '../../_shared/components/PreviewWrapper';
import { PopupSectionShared } from './PopupSectionShared';
import type { PopupConfig, PopupStyle } from '../_types';

interface PopupPreviewProps {
  config: PopupConfig;
  brandColor: string;
  secondary?: string;
  mode?: 'single' | 'dual';
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
  title: string;
  selectedStyle: PopupStyle;
  onStyleChange: (style: PopupStyle) => void;
  isVisualEditAllowed?: boolean;
  onConfigChange?: (config: PopupConfig) => void;
  onTitleChange?: (val: string) => void;
}

export function PopupPreview({
  config,
  brandColor,
  secondary,
  mode,
  fontStyle,
  fontClassName,
  title,
  selectedStyle,
  onStyleChange,
  isVisualEditAllowed = true,
  onConfigChange,
  onTitleChange,
}: PopupPreviewProps) {
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

  return (
    <div className="space-y-3">

      <PopupSectionShared
        config={{ ...config, style: selectedStyle }}
        brandColor={brandColor}
        secondary={secondary}
        mode={mode}
        fontStyle={fontStyle}
        fontClassName={fontClassName}
        sectionTitle={title}
        context="preview"
        includePreviewWrapper
        previewDevice={device}
        setPreviewDevice={setDevice}
        previewStyle={selectedStyle}
        onPreviewStyleChange={onStyleChange}
        isDark={isDark}
        isVisualEditActive={isVisualEditActive}
        onVisualEditToggle={handleToggleVisualEdit}
        onConfigChange={onConfigChange}
        onTitleChange={onTitleChange}
      />
    </div>
  );
}

