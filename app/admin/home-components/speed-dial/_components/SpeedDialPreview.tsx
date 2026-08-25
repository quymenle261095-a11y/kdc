'use client';


import React from 'react';
import { SpeedDialSectionShared } from './SpeedDialSectionShared';
import { usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import type { SpeedDialAction, SpeedDialBrandMode, SpeedDialConfig, SpeedDialPosition, SpeedDialStyle } from '../_types';

interface SpeedDialPreviewProps {
  actions?: SpeedDialAction[];
  position?: SpeedDialPosition;
  style?: SpeedDialStyle;
  brandColor: string;
  secondary: string;
  mode: SpeedDialBrandMode;
  title?: string;
  selectedStyle?: SpeedDialStyle;
  onStyleChange?: (style: SpeedDialStyle) => void;
  defaultOpen?: boolean;
  enableShadow?: boolean;
  enableGlassmorphism?: boolean;
  visualEditEnabled?: boolean;
  onActionLabelChange?: (index: number, val: string) => void;
  config?: SpeedDialConfig;
  onConfigChange?: (config: SpeedDialConfig) => void;
}

export function SpeedDialPreview({
  actions: propActions,
  position: propPosition,
  style: propStyle,
  brandColor,
  secondary,
  mode,
  title = 'Speed Dial',
  selectedStyle,
  onStyleChange,
  defaultOpen: propDefaultOpen,
  enableShadow = true,
  enableGlassmorphism = false,
  visualEditEnabled,
  onActionLabelChange,
  config,
  onConfigChange,
}: SpeedDialPreviewProps) {
  const { device, setDevice } = usePreviewDevice();

  const actions = propActions ?? config?.actions ?? [];
  const position = propPosition ?? config?.position ?? 'bottom-right';
  const style = propStyle ?? config?.style ?? 'fab';
  const defaultOpen = propDefaultOpen ?? config?.defaultOpen ?? false;
  const shadow = config?.enableShadow ?? enableShadow;
  const glassmorphism = config?.enableGlassmorphism ?? enableGlassmorphism;
  const styleForRender = selectedStyle ?? style;

  const handleActionLabelChange = onActionLabelChange ?? ((index: number, val: string) => {
    if (onConfigChange && (config || propActions)) {
      const currentActions = propActions ?? config?.actions ?? [];
      const nextActions = currentActions.map((act, idx) =>
        idx === index ? { ...act, label: val } : act
      );
      if (config) {
        onConfigChange({
          ...config,
          actions: nextActions,
        });
      }
    }
  });

  return (
    <SpeedDialSectionShared
      actions={actions}
      style={styleForRender}
      position={position}
      brandColor={brandColor}
      secondary={secondary}
      mode={mode}
      sectionTitle={title}
      context="preview"
      includePreviewWrapper
      previewDevice={device}
      setPreviewDevice={setDevice}
      previewStyle={styleForRender}
      onPreviewStyleChange={onStyleChange}
      defaultOpen={defaultOpen}
      enableShadow={shadow}
      enableGlassmorphism={glassmorphism}
      visualEditEnabled={visualEditEnabled}
      onActionLabelChange={handleActionLabelChange}
    />
  );
}
