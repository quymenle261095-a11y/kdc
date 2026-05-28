'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Image as ImageIcon, Phone } from 'lucide-react';
import { cn } from '../../../components/ui';
import type { PreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import { DEFAULT_ABOUT_CORNER_RADIUS, getAboutCornerRadiusClassName } from '../_lib/constants';
import { getAboutIconComponent } from '../_lib/iconRegistry';
import type { AboutBrandMode, AboutCornerRadius, AboutPersistFeature, AboutPersistStat, AboutStyle } from '../_types';
import type { AboutColorTokens } from '../_lib/colors';

type AboutSectionContext = 'preview' | 'site';

export interface AboutSectionSharedProps {
  context: AboutSectionContext;
  mode: AboutBrandMode;
  style: AboutStyle;
  title: string;
  subHeading?: string;
  heading?: string;
  highlightText?: string;
  description?: string;
  phone?: string;
  image?: string;
  images?: string[];
  imageCaption?: string;
  buttonText?: string;
  buttonLink?: string;
  features: AboutPersistFeature[];
  stats?: AboutPersistStat[];
  tokens: AboutColorTokens;
  device?: PreviewDevice;
  imagePriority?: boolean;
  cornerRadius?: AboutCornerRadius;
}

const sanitizeText = (value?: string) => (typeof value === 'string' ? value : '').trim();

const AboutImage = ({
  src,
  alt,
  className,
  context,
  imagePriority,
}: {
  src: string;
  alt: string;
  className: string;
  context: AboutSectionContext;
  imagePriority: boolean;
}) => {
  if (!src.trim()) {
    return null;
  }

  if (context === 'preview') {
    return <img src={src} alt={alt} className={className} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={imagePriority ? 'eager' : 'lazy'}
    />
  );
};

const AboutButton = ({
  context,
  href,
  text,
  className,
  style,
  withArrow = false,
}: {
  context: AboutSectionContext;
  href: string;
  text: string;
  className: string;
  style: React.CSSProperties;
  withArrow?: boolean;
}) => {
  if (context === 'site') {
    return (
      <Link href={href} className={className} style={style}>
        <span>{text}</span>
        {withArrow ? <ArrowRight size={16} /> : null}
      </Link>
    );
  }

  return (
    <span className={className} style={style}>
      <span>{text}</span>
      {withArrow ? <ArrowRight size={16} /> : null}
    </span>
  );
};

export function AboutSectionShared({
  context,
  mode,
  style,
  title,
  subHeading,
  heading,
  highlightText,
  description,
  phone,
  image,
  images,
  imageCaption: _imageCaption,
  buttonText,
  buttonLink,
  features,
  stats,
  tokens,
  device = 'desktop',
  imagePriority = false,
  cornerRadius = DEFAULT_ABOUT_CORNER_RADIUS,
}: AboutSectionSharedProps) {
  const isPreview = context === 'preview';
  const isMobilePreview = isPreview && device === 'mobile';
  const isTabletPreview = isPreview && device === 'tablet';
  const isNarrowPreview = isPreview && device !== 'desktop';

  const resolvedHeading = sanitizeText(heading) || sanitizeText(title) || 'Về chúng tôi';
  const resolvedDescription = sanitizeText(description);
  const resolvedSubHeading = sanitizeText(subHeading);
  const resolvedHighlightText = sanitizeText(highlightText);
  const resolvedPhone = sanitizeText(phone);
  const resolvedButtonText = sanitizeText(buttonText);
  const resolvedButtonLink = sanitizeText(buttonLink) || '/about';
  const resolvedImages = (Array.isArray(images) ? images : [])
    .map((value) => sanitizeText(value))
    .filter(Boolean);
  const primaryImage = sanitizeText(image) || resolvedImages[0] || '';
  const galleryImages = [primaryImage, resolvedImages[1] || primaryImage, resolvedImages[2] || resolvedImages[1] || primaryImage];
  const visibleFeatures = features.filter((feature) => sanitizeText(feature.title));
  const solarStat = Array.isArray(stats) ? stats.find((stat) => sanitizeText(stat.value) || sanitizeText(stat.label)) : undefined;
  const solarStatValue = sanitizeText(solarStat?.value) || '18+';
  const solarStatLabel = sanitizeText(solarStat?.label) || 'năm kinh nghiệm';

  const brandInfo = mode === 'single' ? '1 màu (single)' : '2 màu (dual)';
  const cornerRadiusClass = getAboutCornerRadiusClassName(cornerRadius);
  const cornerRadiusSoftClass = cornerRadius === 'none' ? 'rounded-none' : cornerRadius === 'sm' ? 'rounded' : 'rounded-xl';
  const cornerRadiusButtonClass = cornerRadius === 'none' ? 'rounded-none' : cornerRadius === 'sm' ? 'rounded-md' : 'rounded-full';
  const headingLgClass = isMobilePreview ? 'text-2xl' : isTabletPreview ? 'text-3xl' : 'text-3xl lg:text-5xl';
  const sectionXClass = isPreview ? (isMobilePreview ? 'px-3' : 'px-4') : 'px-4 md:px-8';
  const gridTwoColClass = isNarrowPreview ? 'grid-cols-1' : 'lg:grid-cols-2';
  const flexRowClass = isNarrowPreview ? 'flex-col' : 'flex-col lg:flex-row';
  const flexRowReverseClass = isNarrowPreview ? 'flex-col-reverse' : 'flex-col-reverse lg:flex-row';
  const halfWidthClass = isNarrowPreview ? 'w-full' : 'w-full lg:w-1/2';

  const renderEmptyImage = (size = 44) => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: tokens.imageFallbackBg }}
    >
      <ImageIcon size={size} style={{ color: tokens.imageFallbackIcon }} />
    </div>
  );

  const renderIcon = (name: string, className = 'w-4 h-4') => {
    const IconComponent = getAboutIconComponent(name);
    return <IconComponent className={className} />;
  };

  const renderFeatureMedia = (feature: AboutPersistFeature, className = 'w-4 h-4') => {
    if (feature.mediaType === 'image' && sanitizeText(feature.image)) {
      return (
        <AboutImage
          src={sanitizeText(feature.image)}
          alt={sanitizeText(feature.title) || 'feature'}
          className="w-full h-full object-cover"
          context={context}
          imagePriority={imagePriority}
        />
      );
    }

    return renderIcon(feature.iconName || 'CheckCircle2', className);
  };

  const renderSolarBadgeIcon = (className = 'h-[27px] w-[27px]') => (
    <svg viewBox="0 0 27 27" fill="none" className={className} aria-hidden="true">
      <path
        d="M21.6001 6.11887C21.0028 5.87086 20.5285 5.39582 20.2814 4.79819L20.2817 4.80182L19.414 2.7069C19.1664 2.10938 18.6916 1.63466 18.094 1.38714C17.4965 1.13962 16.8251 1.13957 16.2276 1.387L14.1325 2.25112C13.5352 2.49897 12.8639 2.49948 12.2662 2.25252L10.1735 1.38566C9.57583 1.13809 8.90431 1.13809 8.30666 1.38566C7.709 1.63322 7.23417 2.10808 6.98661 2.70575L6.11915 4.80005C5.87097 5.39662 5.39624 5.87035 4.79915 6.11724L2.70643 6.98411C2.41034 7.10664 2.1413 7.28633 1.91467 7.51288C1.68805 7.73944 1.50829 8.00844 1.38566 8.3045C1.26303 8.60056 1.19994 8.91789 1.19999 9.23834C1.20004 9.55879 1.26324 9.8761 1.38596 10.1721L2.25155 12.2679C2.49939 12.8652 2.4999 13.5365 2.25295 14.1342L1.38612 16.227C1.13907 16.8246 1.1394 17.4958 1.38705 18.0932C1.6347 18.6905 2.10939 19.1651 2.70679 19.4125L4.80101 20.28C5.39824 20.528 5.87255 21.0031 6.11965 21.6007L6.98737 23.6956C7.23509 24.2926 7.70966 24.7669 8.30683 25.0143C8.904 25.2617 9.57494 25.2619 10.1723 25.0149L12.2665 24.1486C12.8638 23.9008 13.5351 23.9003 14.1327 24.1472L16.2254 25.0141C16.8231 25.2617 17.4946 25.2617 18.0923 25.0141C18.6899 24.7665 19.1648 24.2917 19.4123 23.694L20.2798 21.5997C20.5278 21.0025 21.0028 20.5281 21.6004 20.281L23.6931 19.4142C23.9892 19.2916 24.2583 19.1119 24.4849 18.8854C24.7115 18.6588 24.8913 18.3898 25.0139 18.0938C25.1365 17.7977 25.1996 17.4804 25.1996 17.1599C25.1995 16.8395 25.1363 16.5222 25.0136 16.2261L24.1483 14.134C23.8995 13.5363 23.8998 12.8641 24.1475 12.2661L25.0143 10.1734C25.2619 9.57567 25.2619 8.90413 25.0143 8.30645C24.7668 7.70877 24.2919 7.23392 23.6943 6.98635L21.6001 6.11887Z"
        fill={tokens.primary}
        stroke={tokens.primary}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.91467 13.6246L11.429 17.3146L18.4575 9.93457" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );

  const renderClassic = () => (
    <section className={cn('py-8', sectionXClass)}>
      <div className={cn('max-w-7xl mx-auto overflow-hidden border relative font-[family-name:var(--font-be-vietnam-pro)]', cornerRadiusClass)} style={{ backgroundColor: '#f9f7f4', borderColor: tokens.neutralBorder }}>
        <div className="absolute top-0 right-0 w-48 h-48 -translate-y-8 translate-x-8 opacity-[0.03] pointer-events-none">
          <svg viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path d="M50 0 C70 0 100 20 100 50 C100 80 80 100 50 100 C20 100 0 70 0 50 C0 20 30 0 50 0 Z" />
          </svg>
        </div>
        <div className={cn('grid gap-4 items-center relative z-10 p-4', gridTwoColClass, !isNarrowPreview && 'md:gap-8 md:p-8')}>
          <div className="flex justify-center w-full">
            <div className={cn('relative w-full overflow-hidden shadow-lg', isNarrowPreview ? 'aspect-video' : 'aspect-video md:aspect-[4/3]', cornerRadiusClass)}>
              {primaryImage
                ? <AboutImage src={primaryImage} alt={resolvedHeading} className="w-full h-full object-cover" context={context} imagePriority={imagePriority} />
                : renderEmptyImage(48)}
              {resolvedPhone ? (
                <div className={cn('absolute bottom-4 left-4 flex items-center p-1.5 shadow-xl w-max', cornerRadiusSoftClass)} style={{ backgroundColor: tokens.primary, opacity: 0.95 }}>
                  <div className={cn('w-8 h-8 flex items-center justify-center shrink-0', cornerRadius === 'none' ? 'rounded-none' : 'rounded-md')} style={{ backgroundColor: tokens.secondary }}>
                    <Phone className="w-4 h-4" style={{ color: tokens.ctaSolidText }} />
                  </div>
                  <div className="px-2.5" style={{ color: tokens.ctaSolidText }}>
                    <p className="text-[9px] uppercase font-bold opacity-90 tracking-wider">Gọi ngay</p>
                    <p className="text-sm font-extrabold leading-none mt-0.5">{resolvedPhone}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col w-full">
            <div className="inline-block bg-white px-4 py-1.5 rounded-full text-xs font-black tracking-wider mb-3 self-start shadow-sm text-gray-900">
              {resolvedSubHeading || 'VỀ CHÚNG TÔI'}
            </div>
            <h2 className={cn('font-black mb-3 text-gray-950 tracking-tight', headingLgClass)}>
              {resolvedHeading} {resolvedHighlightText ? <span style={{ color: tokens.primary }}>{resolvedHighlightText}</span> : null}
            </h2>
            {resolvedDescription ? (
              <p className={cn('text-gray-900 font-medium leading-relaxed mb-6 text-sm bg-white/80 shadow-sm p-4 border border-white', cornerRadiusSoftClass)}>
                {resolvedDescription}
              </p>
            ) : null}

            {visibleFeatures.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {visibleFeatures.slice(0, 4).map((feature) => (
                  <div key={feature.title} className={cn('flex items-center gap-3 bg-white/60 p-2 border border-white/50', cornerRadiusSoftClass)}>
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm overflow-hidden" style={{ color: tokens.primary }}>
                      {renderFeatureMedia(feature, 'w-4 h-4 stroke-[2.5]')}
                    </div>
                    <span className="font-extrabold text-gray-950 text-sm leading-tight">{feature.title}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {resolvedButtonText ? (
              <AboutButton
                context={context}
                href={resolvedButtonLink}
                text={resolvedButtonText}
                withArrow
                className={cn('self-start inline-flex items-center gap-2 px-8 py-3 shadow-md font-bold text-sm', cornerRadiusButtonClass)}
                style={{ backgroundColor: tokens.primary, color: tokens.ctaSolidText }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );

  const renderBento = () => (
    <section className="py-8 px-0">
      <div className={cn('max-w-7xl mx-auto w-full overflow-hidden flex relative', flexRowReverseClass, cornerRadiusClass)} style={{ backgroundColor: '#f9fafb' }}>
        <div className={cn('w-full p-4 flex flex-col justify-center z-10 bg-white/80 backdrop-blur-md', !isNarrowPreview && 'lg:w-3/5 md:p-8 xl:p-10 lg:bg-transparent lg:backdrop-blur-none')}>
          <div className="flex items-center gap-2 font-semibold text-sm mb-3" style={{ color: tokens.primary }}>
            <span className="w-6 h-px bg-current"></span>
            {resolvedSubHeading || 'VỀ CHÚNG TÔI'}
          </div>
          <h2 className={cn('font-bold text-gray-900 mb-5 leading-tight tracking-tight', isNarrowPreview ? 'text-2xl' : 'text-3xl lg:text-4xl')}>
            {resolvedHeading} {resolvedHighlightText}
          </h2>
          {visibleFeatures.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              {visibleFeatures.slice(0, 4).map((feature) => (
                <div key={feature.title} className={cn('flex items-center gap-3 bg-white/60 p-2', !isNarrowPreview && 'lg:bg-transparent lg:p-0', cornerRadius === 'none' ? 'rounded-none' : 'rounded')}>
                  <div className={cn('w-6 h-6 flex items-center justify-center shrink-0 overflow-hidden', cornerRadius === 'none' ? 'rounded-none' : 'rounded')} style={{ backgroundColor: tokens.sectionAltBg, color: tokens.primary }}>
                    {renderFeatureMedia(feature, 'w-3.5 h-3.5')}
                  </div>
                  <span className={cn('font-semibold text-gray-800 text-xs leading-tight', !isNarrowPreview && 'lg:text-sm')}>{feature.title}</span>
                </div>
              ))}
            </div>
          ) : null}

          <div className={cn('grid grid-cols-1 items-center gap-4', !isNarrowPreview && 'lg:flex lg:gap-6')}>
            {resolvedButtonText ? (
              <AboutButton
                context={context}
                href={resolvedButtonLink}
                text={resolvedButtonText}
                withArrow
                className={cn('text-white px-6 py-3 text-sm font-bold inline-flex items-center justify-center gap-2 uppercase tracking-wide w-full', !isNarrowPreview && 'lg:w-auto', cornerRadiusSoftClass)}
                style={{ backgroundColor: '#111827' }}
              />
            ) : null}
            {resolvedPhone ? (
              <div className={cn('flex items-center justify-center gap-3 group cursor-pointer bg-white/50 p-2', !isNarrowPreview && 'lg:justify-start lg:bg-transparent lg:p-0', cornerRadiusSoftClass)}>
                <div className="w-10 h-10 shrink-0 rounded-full border border-gray-300 flex items-center justify-center transition-colors" style={{ color: tokens.primary }}>
                  <Phone className="w-4 h-4" />
                </div>
                <div className={cn('min-w-0 flex-1', !isNarrowPreview && 'lg:flex-none')}>
                  <p className="text-[10px] text-gray-500 font-medium truncate uppercase tracking-wide">Gọi ngay cho chúng tôi</p>
                  <p className="font-bold text-gray-900 text-sm truncate">{resolvedPhone}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
        <div className={cn('w-full min-h-[250px] top-0 bottom-0 relative', !isNarrowPreview && 'lg:w-2/5 lg:min-h-full lg:absolute lg:right-0')}>
          {primaryImage
            ? <AboutImage src={primaryImage} alt={resolvedHeading} className="w-full h-full object-cover object-center absolute inset-0" context={context} imagePriority={imagePriority} />
            : renderEmptyImage(48)}
          <div className={cn('absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent', !isNarrowPreview && 'lg:bg-gradient-to-r lg:from-[#f9fafb] lg:via-[#f9fafb]/50 lg:to-transparent')}></div>
        </div>
      </div>
    </section>
  );

  const renderMinimal = () => (
    <section className="py-8 px-0">
      <div className={cn('max-w-7xl mx-auto w-full bg-[#fdfaf6] flex gap-4 p-3 relative overflow-hidden border', flexRowClass, !isNarrowPreview && 'lg:gap-8 lg:p-8', cornerRadiusClass)} style={{ borderColor: tokens.neutralBorder }}>
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #d1d5db 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
        <div className={cn(halfWidthClass, 'relative z-10 grid grid-cols-2 gap-3 shrink-0')}>
          <div className={cn('w-full min-h-[220px] overflow-hidden shadow-md', !isNarrowPreview && 'lg:min-h-[320px]', cornerRadiusSoftClass)}>
            {galleryImages[0] ? <AboutImage src={galleryImages[0]} alt="img1" className="w-full h-full object-cover" context={context} imagePriority={imagePriority} /> : renderEmptyImage(40)}
          </div>
          <div className="flex flex-col gap-3">
            <div className={cn('w-full h-[120px] overflow-hidden shadow-md', !isNarrowPreview && 'lg:h-[150px]', cornerRadiusSoftClass)}>
              {galleryImages[1] ? <AboutImage src={galleryImages[1]} alt="img2" className="w-full h-full object-cover" context={context} imagePriority={imagePriority} /> : renderEmptyImage(32)}
            </div>
            <div className={cn('w-full flex-1 min-h-[120px] overflow-hidden shadow-md', cornerRadiusSoftClass)}>
              {galleryImages[2] ? <AboutImage src={galleryImages[2]} alt="img3" className="w-full h-full object-cover" context={context} imagePriority={imagePriority} /> : renderEmptyImage(32)}
            </div>
          </div>
        </div>
        <div className={cn(halfWidthClass, 'flex flex-col z-10 justify-center py-2', !isNarrowPreview && 'lg:py-4')}>
          <h2 className={cn('text-xl font-black mb-3 uppercase tracking-tight text-gray-950', !isNarrowPreview && 'lg:text-3xl')} style={{ color: tokens.secondary }}>
            {resolvedHeading} {!isNarrowPreview ? <br className="hidden lg:block" /> : null} {resolvedHighlightText}
          </h2>
          {resolvedDescription ? <p className={cn('text-gray-900 mb-5 text-xs leading-relaxed text-justify font-semibold', !isNarrowPreview && 'lg:text-sm')}>{resolvedDescription}</p> : null}
          {visibleFeatures.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 mb-5">
              {visibleFeatures.slice(0, 4).map((feature) => (
                <div key={feature.title} className="flex items-center gap-2">
                  <div className="shrink-0 w-5 h-5 overflow-hidden flex items-center justify-center" style={{ color: tokens.primary }}>
                    {renderFeatureMedia(feature, 'w-5 h-5 stroke-[2.5]')}
                  </div>
                  <span className="text-gray-950 font-extrabold text-xs xl:text-[13px]">{feature.title}</span>
                </div>
              ))}
            </div>
          ) : null}
          {resolvedButtonText ? (
            <div className="mt-auto pt-2">
              <AboutButton
                context={context}
                href={resolvedButtonLink}
                text={resolvedButtonText}
                className={cn('text-white px-6 py-2.5 font-black shadow-md uppercase text-[11px] tracking-widest self-start inline-flex', cornerRadiusSoftClass)}
                style={{ backgroundColor: tokens.primary, color: tokens.ctaSolidText }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );

  const renderSplit = () => (
    <section className="py-8 px-0">
      <div className={cn('max-w-7xl mx-auto w-full bg-[#fafafa] overflow-hidden flex relative items-center shadow-sm border', flexRowClass, cornerRadiusClass)} style={{ borderColor: tokens.neutralBorder }}>
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
          <svg viewBox="0 0 24 24" fill="currentColor" className={cn('w-[150%] h-auto text-gray-900 -rotate-12 scale-150', !isNarrowPreview && 'lg:w-[100%]')}>
            <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
          </svg>
        </div>
        <div className={cn('w-full relative flex justify-center items-end min-h-[220px] pt-6', !isNarrowPreview && 'lg:w-5/12 lg:min-h-[350px] lg:pt-8')}>
          {primaryImage
            ? <AboutImage src={primaryImage} alt="Professional" className="w-auto h-full max-h-[350px] object-contain relative z-10 px-4 drop-shadow-xl" context={context} imagePriority={imagePriority} />
            : renderEmptyImage(48)}
        </div>
        <div className={cn('w-full p-5 flex flex-col justify-center relative z-10', !isNarrowPreview && 'lg:w-7/12 lg:p-10 xl:p-12')}>
          <div className="text-gray-950 font-extrabold mb-2 text-sm tracking-wide">{resolvedSubHeading || 'VỀ CHÚNG TÔI'}</div>
          <h2 className={cn('text-3xl leading-[1.2] text-[#112338] font-black mb-4 tracking-tight', !isNarrowPreview && 'lg:text-[34px]')}>{resolvedHeading} {resolvedHighlightText}</h2>
          <div className="flex flex-col gap-3 text-gray-800 text-sm leading-relaxed mb-6 font-medium">
            {resolvedDescription ? <p>{resolvedDescription}</p> : null}
            {visibleFeatures.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 mt-2">
                {visibleFeatures.slice(0, 4).map((feature) => (
                  <div key={feature.title} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tokens.secondary }}></div>
                    <span className="text-gray-950 font-bold text-xs">{feature.title}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {resolvedButtonText ? (
            <AboutButton
              context={context}
              href={resolvedButtonLink}
              text={resolvedButtonText}
              className={cn('px-6 py-3 font-extrabold text-xs tracking-widest uppercase w-max shadow-md inline-flex', cornerRadius === 'none' ? 'rounded-none' : 'rounded-sm')}
              style={{ backgroundColor: tokens.secondary, color: '#ffffff' }}
            />
          ) : null}
        </div>
      </div>
    </section>
  );

  const renderTimeline = () => (
    <section className="py-8 px-0">
      <div className={cn('max-w-7xl mx-auto w-full bg-white flex gap-4 relative overflow-hidden py-2 border shadow-sm', flexRowClass, !isNarrowPreview && 'lg:gap-6 lg:overflow-visible', cornerRadiusClass)} style={{ borderColor: tokens.neutralBorder }}>
        <div className={cn('w-full flex flex-col justify-center pt-3 pl-3 pr-3 relative z-10', !isNarrowPreview && 'lg:w-[55%] lg:py-4 lg:pl-8 xl:pl-10 lg:pr-0')}>
          <div className="inline-block mb-2 self-start">
            <span className="font-extrabold tracking-[0.1em] text-[10px] uppercase pb-0.5 border-b-2" style={{ color: tokens.primary, borderBottomColor: tokens.primary }}>
              {resolvedSubHeading || 'VỀ CHÚNG TÔI'}
            </span>
          </div>
          <h2 className={cn('text-2xl font-black text-gray-950 mb-3 leading-[1.1] tracking-tight', !isNarrowPreview && 'lg:text-[34px]')}>
            {resolvedHeading} {!isNarrowPreview ? <br className="hidden sm:block" /> : ' '}{resolvedHighlightText}
          </h2>
          {resolvedDescription ? <p className={cn('text-gray-700 mb-4 leading-snug text-[11px] font-semibold max-w-xl text-justify', !isNarrowPreview && 'lg:text-xs sm:text-left')}>{resolvedDescription}</p> : null}
          {visibleFeatures.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {visibleFeatures.slice(0, 4).map((feature) => (
                <div key={feature.title} className="flex items-center gap-1.5">
                  <div className="shrink-0 w-3.5 h-3.5 overflow-hidden flex items-center justify-center" style={{ color: tokens.primary }}>
                    {renderFeatureMedia(feature, 'w-3.5 h-3.5 stroke-[3]')}
                  </div>
                  <span className="text-gray-950 font-extrabold text-[10px] uppercase">{feature.title}</span>
                </div>
              ))}
            </div>
          ) : null}
          {resolvedButtonText ? (
            <div className="pt-2">
              <AboutButton
                context={context}
                href={resolvedButtonLink}
                text={resolvedButtonText}
                className={cn('px-6 py-2.5 font-bold text-xs uppercase tracking-wide inline-flex', cornerRadiusSoftClass)}
                style={{ backgroundColor: tokens.primary, color: tokens.ctaSolidText }}
              />
            </div>
          ) : null}
        </div>
        <div className={cn('w-full relative min-h-[200px] p-3', !isNarrowPreview && 'lg:w-[45%] lg:min-h-[320px] lg:py-4 lg:pr-6')}>
          <div className="w-full h-full relative">
            {primaryImage ? <AboutImage src={primaryImage} alt="Interior" className={cn('w-full h-full object-cover shadow-sm', cornerRadiusSoftClass)} context={context} imagePriority={imagePriority} /> : renderEmptyImage(40)}
            {resolvedButtonText ? (
              <div className={cn('absolute -left-2 -bottom-2 z-20', !isNarrowPreview && 'lg:-left-6 lg:-bottom-2')}>
                <div className={cn('w-12 h-12 flex items-center justify-center p-1 shadow-sm border border-white', !isNarrowPreview && 'lg:w-16 lg:h-16', cornerRadiusButtonClass)} style={{ backgroundColor: tokens.sectionAltBg }}>
                  <AboutButton
                    context={context}
                    href={resolvedButtonLink}
                    text=""
                    className={cn('w-full h-full border flex items-center justify-center group', cornerRadiusButtonClass)}
                    style={{ backgroundColor: 'transparent', borderColor: tokens.primary, color: tokens.primary }}
                    withArrow
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );

  const renderShowcase = () => (
    <section className="py-8 px-0">
      <div className={cn('max-w-7xl mx-auto w-full bg-white overflow-hidden relative flex shadow-sm border', flexRowClass, cornerRadiusClass)}>
        <div className={cn('absolute top-0 left-0 w-[150%] flex overflow-hidden pointer-events-none select-none z-0 -ml-8', !isNarrowPreview && 'lg:w-full lg:ml-0')}>
          <span className={cn('text-[120px] font-black tracking-tighter leading-none text-gray-50 uppercase', !isNarrowPreview && 'lg:text-[220px] xl:text-[260px]')}>
            {resolvedHighlightText || 'ABOUT'}
          </span>
        </div>
        <div className={cn('w-full flex flex-col justify-center p-4 relative z-10 pt-10', !isNarrowPreview && 'lg:w-[45%] xl:w-5/12 lg:p-8 xl:p-10 lg:pt-10')}>
          <div className={cn('text-gray-800 font-bold mb-1.5 text-[10px] tracking-wider uppercase', !isNarrowPreview && 'lg:text-[11px]')}>
            {resolvedSubHeading || 'VỀ CHÚNG TÔI'}
          </div>
          <h2 className={cn('text-2xl font-black text-gray-950 mb-3 tracking-tight uppercase leading-[1.1]', !isNarrowPreview && 'lg:text-[28px]')}>
            {resolvedHeading}
          </h2>
          {resolvedDescription ? <p className={cn('text-gray-700 text-[11px] leading-relaxed mb-4 font-semibold text-justify', !isNarrowPreview && 'lg:text-[12px]')}>{resolvedDescription}</p> : null}
          {visibleFeatures.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 mb-5">
              {visibleFeatures.slice(0, 4).map((feature) => (
                <div key={feature.title} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tokens.primary }}></div>
                  <span className={cn('text-gray-900 text-[10px] font-extrabold', !isNarrowPreview && 'lg:text-[11px]')}>{feature.title}</span>
                </div>
              ))}
            </div>
          ) : null}
          {resolvedButtonText ? (
            <AboutButton
              context={context}
              href={resolvedButtonLink}
              text={resolvedButtonText}
              className={cn('px-6 py-2.5 font-bold text-[10px] hover:bg-opacity-90 transition-all w-max shadow-md inline-flex', cornerRadius === 'none' ? 'rounded-none' : 'rounded-sm')}
              style={{ backgroundColor: tokens.primary, color: tokens.ctaSolidText }}
            />
          ) : null}
        </div>
        <div className={cn('w-full relative min-h-[260px]', !isNarrowPreview && 'lg:w-[55%] xl:w-7/12 lg:min-h-[330px]')}>
          {primaryImage ? <AboutImage src={primaryImage} alt="Garden Nature" className={cn('w-full h-full object-cover object-center', !isNarrowPreview && 'lg:object-left')} context={context} imagePriority={imagePriority} /> : renderEmptyImage(48)}
        </div>
      </div>
    </section>
  );

  const renderSpaCollage = () => (
    <section className="py-8 px-0">
      <div
        className={cn(
          'max-w-7xl mx-auto w-full overflow-hidden border shadow-sm',
          'grid grid-cols-1 gap-4 p-4',
          !isNarrowPreview && 'lg:grid-cols-[0.95fr_2.1fr] lg:gap-5 md:p-5 lg:p-6',
          cornerRadiusClass,
        )}
        style={{ backgroundColor: '#f5ecdc', borderColor: '#eadbc5' }}
      >
        <div className="relative z-10 flex flex-col justify-center">
          <div className="mb-2 flex items-center gap-3">
            <span className="text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: tokens.secondary }}>
              {resolvedSubHeading || 'VỀ CHÚNG TÔI'}
            </span>
            <span className="h-px w-12 bg-[#c9ad8a]" />
          </div>
          <h2 className={cn('text-2xl font-black leading-[1.12] tracking-tight text-[#523a2a]', !isNarrowPreview && 'md:text-3xl lg:text-[34px]')}>
            {resolvedHeading}
            {resolvedHighlightText ? (
              <>
                {!isNarrowPreview ? <span className="hidden sm:inline"> </span> : null}
                <span className="block sm:inline" style={{ color: tokens.secondary }}>{resolvedHighlightText}</span>
              </>
            ) : null}
          </h2>
          <div className="my-3 text-[#c9a36d]/55" aria-hidden="true">
            <svg viewBox="0 0 180 18" className="h-4 w-36" fill="none">
              <path d="M2 9h52" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M126 9h52" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              <path d="M64 9c7-7 16-7 26 0s19 7 26 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M86 7c-2-5 3-7 6-3 2 4-2 7-6 3Z" fill="currentColor" opacity="0.45" />
              <path d="M94 11c2 5-3 7-6 3-2-4 2-7 6-3Z" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          {resolvedDescription ? (
            <p className={cn('max-w-md text-[13px] font-semibold leading-relaxed text-[#6a5444]', !isNarrowPreview && 'md:text-sm')}>
              {resolvedDescription}
            </p>
          ) : null}
          {visibleFeatures.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {visibleFeatures.slice(0, 4).map((feature) => (
                <div key={feature.title} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#efe1cc] text-[#8b6a48]">
                    {renderFeatureMedia(feature, 'w-3.5 h-3.5 stroke-[2.8]')}
                  </span>
                  <span className={cn('text-xs font-extrabold leading-snug text-[#5f4938]', !isNarrowPreview && 'md:text-[13px]')}>{feature.title}</span>
                </div>
              ))}
            </div>
          ) : null}
          {resolvedButtonText ? (
            <AboutButton
              context={context}
              href={resolvedButtonLink}
              text={resolvedButtonText}
              className={cn('mt-5 inline-flex w-max items-center gap-2 px-6 py-3 text-sm font-black shadow-sm transition-colors', cornerRadiusSoftClass)}
              style={{ backgroundColor: '#c89f62', color: '#2b1c12' }}
            />
          ) : null}
        </div>

        <div className={cn('grid min-h-[280px] grid-cols-1 gap-3', !isNarrowPreview && 'md:grid-cols-[1.75fr_1fr] lg:min-h-[330px]')}>
          <div className={cn('min-h-[240px] overflow-hidden border-2 border-[#fff8ed] shadow-md', cornerRadiusSoftClass)}>
            {galleryImages[0]
              ? <AboutImage src={galleryImages[0]} alt={resolvedHeading} className="h-full w-full object-cover" context={context} imagePriority={imagePriority} />
              : renderEmptyImage(48)}
          </div>
          <div className={cn('grid grid-cols-2 gap-3', !isNarrowPreview && 'md:grid-cols-1')}>
            <div className={cn('min-h-[130px] overflow-hidden border-2 border-[#fff8ed] shadow-md', cornerRadiusSoftClass)}>
              {galleryImages[1]
                ? <AboutImage src={galleryImages[1]} alt={`${resolvedHeading} 2`} className="h-full w-full object-cover" context={context} imagePriority={imagePriority} />
                : renderEmptyImage(36)}
            </div>
            <div className={cn('min-h-[130px] overflow-hidden border-2 border-[#fff8ed] shadow-md', cornerRadiusSoftClass)}>
              {galleryImages[2]
                ? <AboutImage src={galleryImages[2]} alt={`${resolvedHeading} 3`} className="h-full w-full object-cover" context={context} imagePriority={imagePriority} />
                : renderEmptyImage(36)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderSolarFeature = () => (
    <section className="py-8 px-0 font-[family-name:var(--font-be-vietnam-pro)]">
      <div className={cn('mx-auto flex max-w-7xl flex-col items-center gap-7', !isNarrowPreview && 'lg:flex-row lg:gap-0')}>
        <div className={cn('relative order-1 w-full px-2.5', !isNarrowPreview && 'lg:w-1/2')}>
          <div className="relative mx-auto text-center">
            <div className={cn('mx-auto mt-2 w-full max-w-[557px] overflow-hidden', !isNarrowPreview && 'lg:mt-[30px]', cornerRadiusClass)}>
              {primaryImage
                ? <AboutImage src={primaryImage} alt={resolvedHeading} className="h-auto w-full object-cover" context={context} imagePriority={imagePriority} />
                : <div className={cn('aspect-[557/476] w-full', cornerRadiusClass)}>{renderEmptyImage(48)}</div>}
            </div>
            <div
              className={cn('absolute right-0 top-0 border-[2.4px] border-white px-4 py-4 text-center text-white shadow-lg', !isNarrowPreview && 'sm:px-6 sm:py-6', cornerRadiusSoftClass)}
              style={{ backgroundColor: tokens.secondary }}
            >
              <div className={cn('text-3xl font-bold leading-tight', !isNarrowPreview && 'sm:text-[38px]')}>{solarStatValue}</div>
              <div className={cn('max-w-[92px] text-xs font-semibold leading-snug', !isNarrowPreview && 'sm:text-sm')}>{solarStatLabel}</div>
            </div>
          </div>
        </div>

        <div className={cn('order-2 w-full px-2.5', !isNarrowPreview && 'lg:w-1/2')}>
          <div className={cn(!isNarrowPreview && 'lg:pl-[38px]')}>
            <h2 className={cn('mb-4 text-3xl font-bold leading-tight', !isNarrowPreview && 'lg:text-[38px] lg:leading-[58px]')} style={{ color: tokens.primary }}>
              {resolvedHeading}
              {resolvedHighlightText ? (
                <>
                  {!isNarrowPreview ? <span className="hidden sm:inline"> </span> : null}
                  <span className="block sm:inline">{resolvedHighlightText}</span>
                </>
              ) : null}
            </h2>
            {resolvedDescription ? (
              <p className={cn('mb-6 text-sm font-medium leading-relaxed text-justify', !isNarrowPreview && 'md:text-[15px]')} style={{ color: tokens.bodyText }}>
                {resolvedDescription}
              </p>
            ) : null}
            {visibleFeatures.length > 0 ? (
              <ul className="mb-6 space-y-4">
                {visibleFeatures.slice(0, 4).map((feature) => (
                  <li key={feature.title} className={cn('relative pl-[38px] text-sm font-semibold leading-relaxed', !isNarrowPreview && 'md:text-[15px]')} style={{ color: tokens.primary }}>
                    <span className="absolute left-0 top-0 flex h-[27px] w-[27px] items-center justify-center overflow-hidden">
                      {feature.mediaType === 'image' && sanitizeText(feature.image)
                        ? renderFeatureMedia(feature, 'h-[27px] w-[27px]')
                        : renderSolarBadgeIcon()}
                    </span>
                    {feature.title}
                  </li>
                ))}
              </ul>
            ) : null}
            {resolvedButtonText ? (
              <AboutButton
                context={context}
                href={resolvedButtonLink}
                text={resolvedButtonText}
                withArrow
                className={cn('inline-flex items-center gap-2 overflow-hidden px-5 py-2.5 text-center text-base font-medium capitalize shadow-[0_0_40px_5px_rgba(0,0,0,0.05)] [&>svg]:h-6 [&>svg]:w-6 [&>svg]:-rotate-45', cornerRadiusSoftClass)}
                style={{ backgroundColor: tokens.secondary, color: '#ffffff' }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );

  const renderEmpty = () => (
    <section className="py-16">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: tokens.emptyStatBg }}>
          <ImageIcon size={30} style={{ color: tokens.primary }} />
        </div>
        <h3 className="font-medium mb-1" style={{ color: tokens.bodyText }}>Chưa có nội dung</h3>
        <p className="text-sm" style={{ color: tokens.mutedText }}>Nhập tiêu đề và mô tả để bắt đầu</p>
      </div>
    </section>
  );

  const hasContent = resolvedHeading || resolvedDescription || sanitizeText(image) || visibleFeatures.length > 0;

  return (
    <div data-mode={mode} data-brand-info={brandInfo}>
      {!hasContent
        ? renderEmpty()
        : (
          <>
            {style === 'classic' && renderClassic()}
            {style === 'bento' && renderBento()}
            {style === 'minimal' && renderMinimal()}
            {style === 'split' && renderSplit()}
            {style === 'timeline' && renderTimeline()}
            {style === 'showcase' && renderShowcase()}
            {style === 'spaCollage' && renderSpaCollage()}
            {style === 'solarFeature' && renderSolarFeature()}
          </>
        )}
    </div>
  );
}
