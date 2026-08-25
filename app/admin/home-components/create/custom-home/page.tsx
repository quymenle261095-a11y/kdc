'use client';

import React from 'react';
import { ComponentFormWrapper, useComponentForm } from '../shared';
import { useTypeColorOverrideState } from '../../_shared/hooks/useTypeColorOverride';
import { useTypeFontOverrideState } from '../../_shared/hooks/useTypeFontOverride';
import { CustomHomeFields } from '../../custom-home/_components/CustomHomeFields';
import { CustomHomePreview } from '../../custom-home/_components/CustomHomePreview';
import {
  DEFAULT_CUSTOM_HOME_CONFIG,
  getCustomHomePreviewText,
  normalizeCustomHomeConfig,
  type CustomHomeConfig,
} from '../../custom-home/_lib/customHomeDocument';

const COMPONENT_TYPE = 'CustomHome';

export default function CustomHomeCreatePage() {
  const { title, setTitle, active, setActive, handleSubmit, isSubmitting } = useComponentForm('Custom Home', COMPONENT_TYPE);
  const {
    customState,
    effectiveColors,
    setCustomState,
    showCustomBlock,
    systemColors,
  } = useTypeColorOverrideState(COMPONENT_TYPE, { seedCustomFromSettingsWhenTypeEmpty: true });
  const {
    customState: customFontState,
    effectiveFont,
    setCustomState: setCustomFontState,
    showCustomBlock: showFontCustomBlock,
  } = useTypeFontOverrideState(COMPONENT_TYPE, { seedCustomFromSettingsWhenTypeEmpty: true });
  const [config, setConfig] = React.useState<CustomHomeConfig>(() => normalizeCustomHomeConfig(DEFAULT_CUSTOM_HOME_CONFIG));

  const onSubmit = (event: React.FormEvent) => {
    const normalized = normalizeCustomHomeConfig({
      ...config,
      preview: getCustomHomePreviewText(config.source ?? ''),
    });
    void handleSubmit(event, normalized);
  };

  return (
    <ComponentFormWrapper
      type={COMPONENT_TYPE}
      title={title}
      setTitle={setTitle}
      active={active}
      setActive={setActive}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      customState={customState}
      showCustomBlock={showCustomBlock}
      setCustomState={setCustomState}
      systemColors={systemColors}
      customFontState={customFontState}
      showFontCustomBlock={showFontCustomBlock}
      setCustomFontState={setCustomFontState}
    >
      <CustomHomeFields config={config} onChange={setConfig} />
      <div className="mt-4">
        <CustomHomePreview
          title={title}
          config={config}
          onChange={setConfig}
          brandColor={effectiveColors.primary}
          secondary={effectiveColors.secondary}
          mode={effectiveColors.mode}
          fontKey={effectiveFont.fontKey}
        />
      </div>
    </ComponentFormWrapper>
  );
}
