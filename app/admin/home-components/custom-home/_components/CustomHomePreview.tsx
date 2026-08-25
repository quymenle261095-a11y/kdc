'use client';

import React from 'react';
import { usePreviewVisualEdit } from '../../_shared/components/PreviewWrapper';
import { toast } from 'sonner';
import { CustomHomeRuntimeSection } from '@/components/site/home/sections/CustomHomeRuntimeSection';
import { PreviewWrapper, usePreviewDark } from '../../_shared/components/PreviewWrapper';
import { deviceWidths, usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import { getCustomHomePreviewText, type CustomHomeConfig } from '../_lib/customHomeDocument';
import {
  updateCustomHomeTextNode,
  getEditableTextNodes,
  getElementLabel,
  type CustomHomeTextSelection,
} from '../_lib/customHomeTextEditing';

type CustomHomePreviewProps = {
  brandColor: string;
  config: CustomHomeConfig;
  fontKey?: string;
  mode: 'single' | 'dual';
  onChange?: (next: CustomHomeConfig) => void;
  secondary: string;
  title: string;
};

const CUSTOM_HOME_STYLES = [
  { id: 'sandbox', label: 'Sandbox' },
];

export function CustomHomePreview({
  brandColor,
  config,
  fontKey,
  mode,
  onChange,
  secondary,
  title,
}: CustomHomePreviewProps) {
  const { device, setDevice } = usePreviewDevice();
  const { isDark } = usePreviewDark();
  const [previewStyle, setPreviewStyle] = React.useState('sandbox');
  const [visualEditEnabled, setVisualEditEnabled] = React.useState(false);
  const visualEditContext = usePreviewVisualEdit();
  const modeLabel = mode === 'dual' ? '2 màu' : '1 màu';
  const canVisualEdit = Boolean(onChange);
  const isVisualEditActive = canVisualEdit && (visualEditContext.active || visualEditEnabled);

  const handleTextUpdate = React.useCallback((textIndex: number, newText: string) => {
    if (!onChange) {
      return;
    }
    if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
      return;
    }
    const source = config.source ?? '';
    const sourceWasFullDocument = /<!doctype\b/i.test(source) || /<html\b/i.test(source);
    const parser = new DOMParser();
    const parsedDoc = parser.parseFromString(sourceWasFullDocument ? source : `<body>${source}</body>`, 'text/html');
    const nodes = getEditableTextNodes(parsedDoc.body);
    const node = nodes[textIndex];
    if (!node) {
      toast.error('Không tìm thấy phần tử tương ứng trong HTML gốc.');
      return;
    }
    const oldText = node.nodeValue ?? '';
    if (oldText === newText) {
      return;
    }

    const selection: CustomHomeTextSelection = {
      elementLabel: getElementLabel(node.parentElement),
      text: oldText,
      textIndex,
    };

    const result = updateCustomHomeTextNode(source, selection, newText);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    onChange({
      ...config,
      preview: getCustomHomePreviewText(result.source),
      source: result.source,
    });
    toast.success('Đã cập nhật text trong HTML');
  }, [config, onChange]);

  const editorBridge = React.useMemo(() => ({
    enabled: isVisualEditActive,
    onTextUpdate: handleTextUpdate,
  }), [handleTextUpdate, isVisualEditActive]);

  const handleToggleVisualEdit = () => {
    setVisualEditEnabled((enabled) => !enabled);
  };

  return (
    <PreviewWrapper
      title="Preview Custom Home"
      device={device}
      setDevice={setDevice}
      previewStyle={previewStyle}
      setPreviewStyle={setPreviewStyle}
      styles={CUSTOM_HOME_STYLES}
      deviceWidthClass={deviceWidths[device]}
      info={`iframe sandbox • ${modeLabel} • ${config.heightMode ?? 'auto'}`}
      visualEditActive={isVisualEditActive}
      visualEditAllowed={canVisualEdit}
      onVisualEditToggle={handleToggleVisualEdit}
    >
      <div className="space-y-3">

        <CustomHomeRuntimeSection
          config={config as Record<string, unknown>}
          brandColor={brandColor}
          secondary={secondary}
          mode={mode}
          title={title}
          isDark={isDark}
          fontKey={fontKey}
          editorBridge={editorBridge}
        />
      </div>
    </PreviewWrapper>
  );
}
