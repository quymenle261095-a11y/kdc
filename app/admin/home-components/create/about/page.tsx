'use client';

import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import React from 'react';
import { ComponentFormWrapper, useComponentForm } from '../shared';
import { useTypeColorOverrideState } from '../../_shared/hooks/useTypeColorOverride';
import { useTypeFontOverrideState } from '../../_shared/hooks/useTypeFontOverride';
import { useSectionHeaderState } from '../../_shared/hooks/useSectionHeaderState';
import { HeaderConfigSection } from '../../_shared/components/HeaderConfigSection';
import { useFormSectionsState } from '../../_shared/hooks/useFormSectionsState';
import { AboutForm } from '../../about/_components/AboutForm';
import { AboutPreview } from '../../about/_components/AboutPreview';
import {
  DEFAULT_ABOUT_EDITOR_STATE,
  toAboutPersistFeatures,
  toAboutPersistStats,
} from '../../about/_lib/constants';
import {
  getAboutValidationResult,
} from '../../about/_lib/colors';
import type { AboutConfig } from '../../about/_types';

export default function AboutCreatePage() {
  const COMPONENT_TYPE = 'About';
  const { title, setTitle, active, setActive, handleSubmit, isSubmitting } = useComponentForm('Về chúng tôi', COMPONENT_TYPE);
  const { customState, effectiveColors, showCustomBlock, setCustomState, systemColors } = useTypeColorOverrideState(COMPONENT_TYPE, { seedCustomFromSettingsWhenTypeEmpty: true });
  const { customState: customFontState, effectiveFont, showCustomBlock: showFontCustomBlock, setCustomState: setCustomFontState } = useTypeFontOverrideState(COMPONENT_TYPE, { seedCustomFromSettingsWhenTypeEmpty: true });
  const { primary, secondary, mode } = effectiveColors;
  const fontStyle = { '--font-active': `var(${effectiveFont.fontVariable})` } as React.CSSProperties;

  const systemConfig = useQuery(api.homeComponentSystemConfig.getConfig);
  const isVisualEditAllowed = systemConfig?.typeVisualEditOverrides?.[COMPONENT_TYPE]?.enabled ?? true;

  const headerState = useSectionHeaderState({
    hideHeader: false,
    showTitle: true,
    showSubtitle: true,
    subtitle: '',
    headerAlign: 'left',
    titleColorPrimary: false,
    subtitleAboveTitle: false,
    uppercaseText: false,
    showBadge: true,
    badgeText: '',
  });

  const { openSections: headerOpenSections, toggleSection: toggleHeaderSection } = useFormSectionsState(['header'], true);

  const [state, setState] = React.useState(DEFAULT_ABOUT_EDITOR_STATE);

  const handleConfigChange = (nextConfig: AboutConfig) => {
    setState((prev) => {
      const nextFeatures = prev.features.map((f, idx) => {
        const incoming = nextConfig.features?.[idx];
        if (!incoming) {return f;}
        return {
          ...f,
          title: incoming.title ?? f.title,
        };
      });

      const nextStats = prev.stats.map((s, idx) => {
        const incoming = nextConfig.stats?.[idx];
        if (!incoming) {return s;}
        return {
          ...s,
          value: incoming.value ?? s.value,
          label: incoming.label ?? s.label,
        };
      });

      return {
        ...prev,
        subHeading: nextConfig.subHeading !== undefined ? nextConfig.subHeading : prev.subHeading,
        heading: nextConfig.heading !== undefined ? nextConfig.heading : prev.heading,
        highlightText: nextConfig.highlightText !== undefined ? nextConfig.highlightText : prev.highlightText,
        description: nextConfig.description !== undefined ? nextConfig.description : prev.description,
        phone: nextConfig.phone !== undefined ? nextConfig.phone : prev.phone,
        buttonText: nextConfig.buttonText !== undefined ? nextConfig.buttonText : prev.buttonText,
        features: nextFeatures,
        stats: nextStats,
      };
    });
  };

  const validation = React.useMemo(
    () => getAboutValidationResult({
      primary,
      secondary,
      mode,
      style: state.style,
    }),
    [primary, secondary, mode, state.style],
  );

  const onSubmit = (event: React.FormEvent) => {
    void handleSubmit(event, {
      subHeading: state.subHeading,
      heading: state.heading,
      highlightText: state.highlightText,
      description: state.description,
      phone: state.phone,
      image: state.image,
      images: state.images,
      imageCaption: state.imageCaption,
      buttonText: state.buttonText,
      buttonLink: state.buttonLink,
      features: toAboutPersistFeatures(state.features),
      stats: toAboutPersistStats(state.stats),
      style: state.style,
      cornerRadius: state.cornerRadius,
      noBorderRadius: state.cornerRadius === 'none',
      hideHeader: headerState.hideHeader,
      showTitle: headerState.showTitle,
      subtitle: headerState.subtitle,
      showSubtitle: headerState.showSubtitle,
      headerAlign: headerState.headerAlign,
      titleColorPrimary: headerState.titleColorPrimary,
      subtitleAboveTitle: headerState.subtitleAboveTitle,
      uppercaseText: headerState.uppercaseText,
      showBadge: headerState.showBadge,
      badgeText: headerState.badgeText,
      spacing: headerState.spacing,
      noVerticalMargin: headerState.spacing === 'none',
    });
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
      skipTitleInput={true}
    >
      <HeaderConfigSection
        hideHeader={headerState.hideHeader}
        title={title}
        showTitle={headerState.showTitle}
        subtitle={headerState.subtitle}
        showSubtitle={headerState.showSubtitle}
        headerAlign={headerState.headerAlign}
        titleColorPrimary={headerState.titleColorPrimary}
        subtitleAboveTitle={headerState.subtitleAboveTitle}
        uppercaseText={headerState.uppercaseText}
        showBadge={headerState.showBadge}
        badgeText={headerState.badgeText}
        onHideHeaderChange={headerState.setHideHeader}
        onTitleChange={setTitle}
        onShowTitleChange={headerState.setShowTitle}
        onSubtitleChange={headerState.setSubtitle}
        onShowSubtitleChange={headerState.setShowSubtitle}
        onHeaderAlignChange={headerState.setHeaderAlign}
        onTitleColorPrimaryChange={headerState.setTitleColorPrimary}
        onSubtitleAboveTitleChange={headerState.setSubtitleAboveTitle}
        onUppercaseTextChange={headerState.setUppercaseText}
        onShowBadgeChange={headerState.setShowBadge}
        onBadgeTextChange={headerState.setBadgeText}
        expanded={headerOpenSections.header}
        onExpandedChange={(open) => toggleHeaderSection('header', open)}
        className="mb-3"
        titleRequired={true}
        titleLabel="Tiêu đề hiển thị"
        titlePlaceholder="Nhập tiêu đề component..."
      />

      <AboutForm
        state={state}
        previewStyle={state.style}
        onChange={setState}
        spacing={headerState.spacing}
        onSpacingChange={headerState.setSpacing}
        cornerRadius={state.cornerRadius ?? 'lg'}
        onCornerRadiusChange={(cornerRadius) => {
          setState((prev) => ({ ...prev, cornerRadius }));
        }}
      />

      <AboutPreview
        config={{
          subHeading: state.subHeading,
          heading: state.heading,
          highlightText: state.highlightText,
          description: state.description,
          phone: state.phone,
          image: state.image,
          images: state.images,
          imageCaption: state.imageCaption,
          buttonText: state.buttonText,
          buttonLink: state.buttonLink,
          features: toAboutPersistFeatures(state.features),
          stats: toAboutPersistStats(state.stats),
          style: state.style,
          cornerRadius: state.cornerRadius,
          noBorderRadius: state.cornerRadius === 'none',
          noVerticalMargin: headerState.spacing === 'none',
        }}
        brandColor={validation.tokens.primary}
        secondary={validation.tokens.secondary}
        mode={mode}
        selectedStyle={state.style}
        onStyleChange={(style) => {
          setState((prev) => ({ ...prev, style }));
        }}
        fontStyle={fontStyle}
        fontClassName="font-active"
        title={title}
        hideHeader={headerState.hideHeader}
        showTitle={headerState.showTitle}
        subtitle={headerState.subtitle}
        showSubtitle={headerState.showSubtitle}
        headerAlign={headerState.headerAlign}
        titleColorPrimary={headerState.titleColorPrimary}
        subtitleAboveTitle={headerState.subtitleAboveTitle}
        uppercaseText={headerState.uppercaseText}
        showBadge={headerState.showBadge}
        badgeText={headerState.badgeText}
        spacing={headerState.spacing}
        cornerRadius={state.cornerRadius ?? 'lg'}
        isVisualEditAllowed={isVisualEditAllowed}
        onConfigChange={handleConfigChange}
        onTitleChange={setTitle}
        onSubtitleChange={headerState.setSubtitle}
        onBadgeTextChange={headerState.setBadgeText}
      />
    </ComponentFormWrapper>
  );
}
