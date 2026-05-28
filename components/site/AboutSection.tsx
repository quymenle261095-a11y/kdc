'use client';

import React from 'react';
import { AboutSectionShared } from '@/app/admin/home-components/about/_components/AboutSectionShared';
import { SectionHeader } from '@/app/admin/home-components/_shared/components/SectionHeader';
import { extractSectionHeaderConfig } from '@/app/admin/home-components/_shared/hooks/useSectionHeaderState';
import { getSectionSpacingClassName, normalizeSectionSpacing } from '@/app/admin/home-components/_shared/types/sectionSpacing';
import { getAboutSectionColors } from '@/app/admin/home-components/about/_lib/colors';
import {
  normalizeAboutCornerRadius,
  normalizeAboutImages,
  normalizeAboutPersistFeatures,
  normalizeAboutPersistStats,
  normalizeAboutStyle,
} from '@/app/admin/home-components/about/_lib/constants';
import type {
  AboutBrandMode,
  AboutConfig,
} from '@/app/admin/home-components/about/_types';

interface AboutSectionProps {
  config: Record<string, unknown>;
  brandColor: string;
  secondary: string;
  mode: AboutBrandMode;
  title: string;
}

export function AboutSection({ config, brandColor, secondary, mode, title }: AboutSectionProps) {
  const safeConfig = config as Partial<AboutConfig>;
  const style = normalizeAboutStyle(safeConfig.style);
  const images = normalizeAboutImages(safeConfig.images, typeof safeConfig.image === 'string' ? safeConfig.image : '');
  const headerConfig = extractSectionHeaderConfig(config);
  const spacing = safeConfig.noVerticalMargin === true ? 'none' : normalizeSectionSpacing(headerConfig.spacing);
  const cornerRadius = normalizeAboutCornerRadius(safeConfig.cornerRadius, safeConfig.noBorderRadius);

  const tokens = getAboutSectionColors({
    primary: brandColor,
    secondary,
    mode,
  });

  return (
    <section className={`${getSectionSpacingClassName(spacing)} px-3`}>
      <div className="mx-auto max-w-7xl">
        <SectionHeader
          title={title}
          subtitle={headerConfig.subtitle}
          badgeText={headerConfig.badgeText}
          hideHeader={headerConfig.hideHeader}
          showTitle={headerConfig.showTitle}
          showSubtitle={headerConfig.showSubtitle}
          showBadge={headerConfig.showBadge}
          headerAlign={headerConfig.headerAlign}
          titleColorPrimary={headerConfig.titleColorPrimary}
          subtitleAboveTitle={headerConfig.subtitleAboveTitle}
          uppercaseText={headerConfig.uppercaseText}
          brandColor={brandColor}
        />
        <AboutSectionShared
          context="site"
          mode={mode}
          style={style}
          title={title}
          subHeading={typeof safeConfig.subHeading === 'string' ? safeConfig.subHeading : ''}
          heading={typeof safeConfig.heading === 'string' ? safeConfig.heading : title}
          highlightText={typeof safeConfig.highlightText === 'string' ? safeConfig.highlightText : ''}
          description={typeof safeConfig.description === 'string' ? safeConfig.description : ''}
          phone={typeof safeConfig.phone === 'string' ? safeConfig.phone : ''}
          image={images[0] ?? ''}
          images={images}
          imageCaption={typeof safeConfig.imageCaption === 'string' ? safeConfig.imageCaption : ''}
          buttonText={typeof safeConfig.buttonText === 'string' ? safeConfig.buttonText : ''}
          buttonLink={typeof safeConfig.buttonLink === 'string' ? safeConfig.buttonLink : '/about'}
          features={normalizeAboutPersistFeatures(safeConfig.features)}
          stats={normalizeAboutPersistStats(safeConfig.stats)}
          tokens={tokens}
          cornerRadius={cornerRadius}
          imagePriority
        />
      </div>
    </section>
  );
}
