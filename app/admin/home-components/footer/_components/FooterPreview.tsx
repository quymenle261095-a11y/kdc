'use client';

import React from 'react';
import { Globe, Facebook, Github, Instagram, Linkedin, Twitter, Youtube, X } from 'lucide-react';
import { cn } from '../../../components/ui';
import { PreviewWrapper } from '../../_shared/components/PreviewWrapper';
import { ColorInfoPanel } from '../../_shared/components/ColorInfoPanel';
import { PreviewImage } from '../../_shared/components/PreviewImage';
import { deviceWidths, usePreviewDevice } from '../../_shared/hooks/usePreviewDevice';
import { getPreviewDeviceClass } from '../../_shared/lib/previewResponsive';
import { getFooterLayoutColors } from '../_lib/colors';
import { getFooterCornerRadiusClassName, getFooterLogoBackgroundClassName, getFooterLogoBackgroundStyle, getFooterLogoSize, getFooterMaxWidthClass, getFooterSectionSpacingClassName } from '../_lib/constants';
import type { FooterBrandMode, FooterConfig, FooterStyle } from '../_types';

const TikTokIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const ZaloIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z"/>
  </svg>
);

const PinterestIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
  </svg>
);

const SocialIcon = ({ platform, size = 18 }: { platform: string; size?: number }) => {
  switch (platform) {
    case 'facebook': { return <Facebook size={size} />; }
    case 'instagram': { return <Instagram size={size} />; }
    case 'youtube': { return <Youtube size={size} />; }
    case 'tiktok': { return <TikTokIcon size={size} />; }
    case 'zalo': { return <ZaloIcon size={size} />; }
    case 'twitter': { return <Twitter size={size} />; }
    case 'x': { return <X size={size} />; }
    case 'pinterest': { return <PinterestIcon size={size} />; }
    case 'linkedin': { return <Linkedin size={size} />; }
    case 'github': { return <Github size={size} />; }
    default: { return <Globe size={size} />; }
  }
};

const SOCIAL_ORIGINAL_COLORS: Record<string, { bg: string; icon: string }> = {
  facebook: { bg: '#1877f2', icon: '#ffffff' },
  instagram: { bg: '#e1306c', icon: '#ffffff' },
  youtube: { bg: '#ff0000', icon: '#ffffff' },
  tiktok: { bg: '#000000', icon: '#ffffff' },
  zalo: { bg: '#0084ff', icon: '#ffffff' },
  twitter: { bg: '#1da1f2', icon: '#ffffff' },
  x: { bg: '#000000', icon: '#ffffff' },
  pinterest: { bg: '#E60023', icon: '#ffffff' },
  linkedin: { bg: '#0a66c2', icon: '#ffffff' },
  github: { bg: '#0f172a', icon: '#ffffff' },
};

const styles: { id: FooterStyle; label: string }[] = [
  { id: 'classic', label: '1. Classic Grid' },
  { id: 'modern', label: '2. Info-Rich' },
  { id: 'corporate', label: '3. Split Zones' },
  { id: 'minimal', label: '4. Compact Bar' },
  { id: 'centered', label: '5. Magazine' },
  { id: 'stacked', label: '6. Wave' },
];

export const FooterPreview = ({
  config,
  brandColor,
  secondary,
  mode = 'dual',
  selectedStyle,
  onStyleChange,
  fontStyle,
  fontClassName,
}: {
  config: FooterConfig;
  brandColor: string;
  secondary: string;
  mode?: FooterBrandMode;
  selectedStyle?: FooterStyle;
  onStyleChange?: (style: FooterStyle) => void;
  fontStyle?: React.CSSProperties;
  fontClassName?: string;
}) => {
  const { device, setDevice } = usePreviewDevice();
  const previewStyle = selectedStyle ?? 'classic';
  const setPreviewStyle = (value: string) => onStyleChange?.(value as FooterStyle);
  const colors = getFooterLayoutColors(previewStyle, brandColor, secondary, mode);
  const useOriginalSocialIconColors = config.useOriginalSocialIconColors !== false;
  const logoSizeLevel = config.logoSizeLevel ?? 1;
  const resolveLogoSize = (baseSize: number) => getFooterLogoSize(baseSize, logoSizeLevel);
  const maxWidthClass = getFooterMaxWidthClass(config.maxWidth);
  const waveMaxWidthClass = maxWidthClass === 'max-w-6xl' || maxWidthClass === 'max-w-7xl' ? 'max-w-8xl' : maxWidthClass;
  const sectionSpacingClassName = getFooterSectionSpacingClassName(config.spacing, config.noVerticalMargin);
  const cornerRadius = config.noBorderRadius === true ? 'none' : config.cornerRadius;
  const socialRadiusClassName = getFooterCornerRadiusClassName(cornerRadius, 'icon');
  const resolveSocialStyles = (platform: string, fallbackBg: string, fallbackText: string) => {
    if (!useOriginalSocialIconColors) {
      return { bg: fallbackBg, color: fallbackText, border: '' };
    }
    const original = SOCIAL_ORIGINAL_COLORS[platform];
    if (!original) {
      return { bg: fallbackBg, color: fallbackText, border: '' };
    }
    const isIconDark = original.bg.toLowerCase() <= '#333333';
    const isFooterDark = colors.bg.toLowerCase() <= '#444444';
    const border = (isIconDark && isFooterDark) ? '1.5px solid rgba(255,255,255,0.25)' : '';
    return { bg: original.bg, color: original.icon, border };
  };

  const rawSocialLinks = Array.isArray(config.socialLinks) ? config.socialLinks : [];
  const socials = rawSocialLinks.length
    ? rawSocialLinks
    : [
      { icon: 'facebook', id: 1, platform: 'facebook', url: '#' },
      { icon: 'instagram', id: 2, platform: 'instagram', url: '#' },
      { icon: 'youtube', id: 3, platform: 'youtube', url: '#' },
    ];

  const showBctLogo = config.showBctLogo === true;
  const bctLogoType = config.bctLogoType ?? 'thong-bao';
  const bctLogoLink = typeof config.bctLogoLink === 'string' ? config.bctLogoLink.trim() : '';
  const bctLogoSrc = bctLogoType === 'dang-ky'
    ? '/images/bct/logo-da-dang-ky-bct.webp'
    : '/images/bct/logo-da-thong-bao-bct.png';
  const logoName = typeof config.logoName === 'string' ? config.logoName.trim() : '';
  const logoAlt = logoName || 'Logo';
  const logoBackgroundStyle = config.logoBackgroundStyle ?? 'none';
  const renderLogoMark = (baseSize: number, imageClassName = 'object-contain') => {
    if (!config.logo) {return null;}
    const size = resolveLogoSize(baseSize);
    const content = <PreviewImage src={config.logo} alt={logoAlt} className={imageClassName} style={{ width: size, height: 'auto' }} />;

    if (logoBackgroundStyle === 'none') {
      return content;
    }

    return (
      <span
        className={getFooterLogoBackgroundClassName(logoBackgroundStyle, cornerRadius)}
        style={getFooterLogoBackgroundStyle(logoBackgroundStyle, colors.primary)}
      >
        {content}
      </span>
    );
  };
  const renderBctLogo = (baseHeight = 42) => {
    if (!showBctLogo) {return null;}
    const image = (
      <img
        src={bctLogoSrc}
        alt="Bộ Công Thương"
        className="w-auto object-contain"
        style={{ height: baseHeight * 1.2 }}
      />
    );
    if (!bctLogoLink) {return image;}
    return (
      <a href={bctLogoLink} target="_blank" rel="noopener noreferrer">
        {image}
      </a>
    );
  };

  const fallbackColumns = [
    { id: 1, links: [{ label: 'Giới thiệu', url: '/about' }, { label: 'Tuyển dụng', url: '/careers' }], title: 'Về chúng tôi' },
    { id: 2, links: [{ label: 'FAQ', url: '/faq' }, { label: 'Liên hệ', url: '/contact' }], title: 'Hỗ trợ' },
  ];
  const rawColumns = Array.isArray(config.columns) && config.columns.length
    ? config.columns
    : fallbackColumns;
  const columns = rawColumns.map((column, index) => ({
    id: column.id ?? index + 1,
    links: Array.isArray(column.links)
      ? column.links.map((link) => ({
        label: typeof link.label === 'string' ? link.label : '',
        url: typeof link.url === 'string' ? link.url : '',
      }))
      : [],
    title: typeof column.title === 'string' ? column.title : '',
  }));

  const previewShellPadding = getPreviewDeviceClass(device, {
    mobile: 'px-3',
    tablet: 'px-4',
    desktop: 'px-4',
  });
  const classicGridClassName = getPreviewDeviceClass(device, {
    mobile: 'grid gap-4 grid-cols-1',
    tablet: 'grid gap-6 grid-cols-12',
    desktop: 'grid gap-6 grid-cols-12',
  });
  const classicBrandClassName = getPreviewDeviceClass(device, {
    mobile: 'space-y-3 text-center',
    tablet: 'col-span-3 space-y-3 text-left',
    desktop: 'col-span-3 space-y-3 text-left',
  });
  const classicLinksGridClassName = getPreviewDeviceClass(device, {
    mobile: 'grid gap-4 grid-cols-2',
    tablet: 'grid gap-4 col-span-7 grid-cols-4',
    desktop: 'grid gap-4 col-span-7 grid-cols-4',
  });
  const classicSocialColClassName = getPreviewDeviceClass(device, {
    mobile: 'space-y-3 text-center',
    tablet: 'col-span-2 space-y-3 text-left',
    desktop: 'col-span-2 space-y-3 text-left',
  });
  const bottomBarClassName = getPreviewDeviceClass(device, {
    mobile: 'mt-4 pt-2 flex flex-col items-center justify-center gap-2',
    tablet: 'mt-4 pt-2 flex flex-row items-center justify-center gap-2',
    desktop: 'mt-4 pt-2 flex flex-row items-center justify-center gap-2',
  });
  const modernGridClassName = getPreviewDeviceClass(device, {
    mobile: 'grid gap-4 grid-cols-1',
    tablet: 'grid gap-6 grid-cols-12',
    desktop: 'grid gap-6 grid-cols-12',
  });
  const corporateZone1ClassName = getPreviewDeviceClass(device, {
    mobile: 'grid gap-4 grid-cols-1 pb-6',
    tablet: 'grid gap-6 grid-cols-12 pb-6',
    desktop: 'grid gap-6 grid-cols-12 pb-6',
  });
  const corporateZone2ClassName = getPreviewDeviceClass(device, {
    mobile: 'py-6 grid grid-cols-2 gap-4',
    tablet: 'py-6 grid grid-cols-4 gap-4',
    desktop: 'py-6 grid grid-cols-4 gap-4',
  });
  const stackedGridClassName = getPreviewDeviceClass(device, {
    mobile: 'grid gap-4 grid-cols-1',
    tablet: 'grid gap-6 grid-cols-12',
    desktop: 'grid gap-6 grid-cols-12',
  });

  const preview = () => {
    // Style 1: Classic — 4-Column Grid (Lofi Gym style)
    if (previewStyle === 'classic') {
      return (
        <footer className="w-full" style={{ backgroundColor: colors.classicBg }}>
          <div className={cn(maxWidthClass, 'mx-auto', sectionSpacingClassName, previewShellPadding)}>
            <div className={classicGridClassName}>
              <div className={classicBrandClassName}>
                {renderLogoMark(28)}
                {logoName && <span className="text-sm font-bold tracking-tight block mt-2" style={{ color: colors.heading }}>{logoName}</span>}
                <p className="text-xs leading-relaxed opacity-80 mt-2" style={{ color: colors.textMuted }}>{config.description || 'Đối tác tin cậy của bạn trong mọi giải pháp công nghệ.'}</p>
              </div>
              <div className={classicLinksGridClassName}>
                {columns.slice(0, 4).map((col, colIdx) => (
                  <div key={`${col.id ?? 'col'}-${colIdx}`}>
                    <h3 className="font-bold text-[10px] uppercase tracking-wider mb-3 pb-1" style={{ color: colors.heading, borderBottom: `2px solid ${colors.borderSoft}` }}>{col.title}</h3>
                    <ul className="space-y-1.5">
                      {col.links.map((link, lIdx) => (
                        <li key={lIdx}><span className="text-xs" style={{ color: colors.link }}>{link.label}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className={classicSocialColClassName}>
                <h3 className="font-bold text-[10px] uppercase tracking-wider pb-1" style={{ color: colors.heading, borderBottom: `2px solid ${colors.borderSoft}` }}>Kết nối</h3>
                {config.showSocialLinks && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {socials.map((s, index) => {
                      const socialStyles = resolveSocialStyles(s.platform, colors.socialBg, colors.socialText);
                      return (
                        <span key={`${s.id ?? 'social'}-${index}`} className={cn('h-8 w-8 flex items-center justify-center', socialRadiusClassName)} style={{ backgroundColor: socialStyles.bg, color: socialStyles.color, ...(socialStyles.border ? { border: socialStyles.border } : {}) }}>
                          <SocialIcon platform={s.platform} size={16} />
                        </span>
                      );
                    })}
                  </div>
                )}
                {renderBctLogo(42)}
              </div>
            </div>
          </div>
          {config.showCopyright !== false && (
            <div style={{ borderTop: `1px solid ${colors.borderSoft}` }}>
              <div className={cn(maxWidthClass, 'mx-auto py-3 flex items-center justify-center', previewShellPadding)}>
                <p className="text-[10px] opacity-70" style={{ color: colors.textSubtle }}>{config.copyright || '© 2024 VietAdmin. All rights reserved.'}</p>
              </div>
            </div>
          )}
        </footer>
      );
    }

    // Style 2: Modern — Info-Rich (Sudes Nest inspired)
    if (previewStyle === 'modern') {
      const pc = colors.accent.replace('#', '%23');
      const seigaihaUrl = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='28'%3E%3Cpath d='M56 26v2h-7.75c2.3-1.3 4.94-2 7.75-2zm-26 2a14 14 0 0 0-7.75-2h-4.5A14 14 0 0 0 10 28H0v-2c4.26 0 8.17 1.38 11.36 3.7A13.98 13.98 0 0 1 22 26c3.87 0 7.44 1.56 10 4.1a13.98 13.98 0 0 1 10.64-3.7A15.99 15.99 0 0 1 56 26zM56 20v2c-4.26 0-8.17 1.38-11.36 3.7A13.98 13.98 0 0 0 34 22c-3.87 0-7.44 1.56-10 4.1A13.98 13.98 0 0 0 13.36 22.4 15.99 15.99 0 0 0 0 20v2c4.26 0 8.17-1.38 11.36-3.7A13.98 13.98 0 0 1 22 14c3.87 0 7.44 1.56 10 4.1A13.98 13.98 0 0 1 42.64 14.4 15.99 15.99 0 0 1 56 14v2c-4.26 0-8.17 1.38-11.36 3.7A13.98 13.98 0 0 0 34 16c-3.87 0-7.44 1.56-10 4.1A13.98 13.98 0 0 0 13.36 16.4 15.99 15.99 0 0 0 0 14v2a14 14 0 0 1 11.36 3.7A13.98 13.98 0 0 0 22 8c3.87 0 7.44 1.56 10 4.1A13.98 13.98 0 0 0 42.64 8.4 15.99 15.99 0 0 0 56 8v2c-4.26 0-8.17 1.38-11.36 3.7A13.98 13.98 0 0 1 34 10c-3.87 0-7.44 1.56-10 4.1A13.98 13.98 0 0 1 13.36 10.4 15.99 15.99 0 0 1 0 8V6c4.26 0 8.17 1.38 11.36 3.7A13.98 13.98 0 0 0 22 2c3.87 0 7.44 1.56 10 4.1A13.98 13.98 0 0 0 42.64 2.4 15.99 15.99 0 0 0 56 2V0H0v2a14 14 0 0 1 11.36 3.7A13.98 13.98 0 0 0 22-4c3.87 0 7.44 1.56 10 4.1A13.98 13.98 0 0 0 42.64-3.6 15.99 15.99 0 0 0 56-4' fill='none' stroke='${pc}' stroke-opacity='0.12' stroke-width='0.5'/%3E%3C/svg%3E")`;

      return (
        <footer className="w-full relative" style={{ backgroundColor: colors.bg }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: seigaihaUrl, backgroundSize: '40px 20px' }} />
          <div className={cn(maxWidthClass, 'mx-auto relative', previewShellPadding, sectionSpacingClassName)}>
            <div className={modernGridClassName}>
              <div className="lg:col-span-4 md:col-span-4 space-y-3">
                <div className="flex items-center gap-2">
                  {renderLogoMark(28)}
                  {logoName && <span className="text-sm font-bold tracking-tight" style={{ color: colors.heading }}>{logoName}</span>}
                </div>
                {config.description && (
                  <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>{config.description}</p>
                )}
                {config.showSocialLinks && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {socials.map((s, index) => {
                      const socialStyles = resolveSocialStyles(s.platform, colors.socialBg, colors.socialText);
                      return (
                        <span key={`${s.id ?? 'social'}-${index}`} className={cn('h-8 w-8 flex items-center justify-center', socialRadiusClassName)} style={{ backgroundColor: socialStyles.bg, color: socialStyles.color, ...(socialStyles.border ? { border: socialStyles.border } : {}) }}>
                          <SocialIcon platform={s.platform} size={16} />
                        </span>
                      );
                    })}
                  </div>
                )}
                {renderBctLogo(42)}
              </div>
              <div className="lg:col-span-8 md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {columns.slice(0, 4).map((col, colIdx) => (
                  <div key={`${col.id ?? 'col'}-${colIdx}`}>
                    <h3 className="font-bold text-[10px] uppercase tracking-wider mb-2 pb-1 flex items-center gap-1" style={{ color: colors.heading, borderBottom: `1.5px solid ${colors.borderSoft}` }}>
                      <span style={{ color: colors.accent, fontSize: '8px' }}>◆</span> {col.title}
                    </h3>
                    <ul className="space-y-1.5">
                      {col.links.map((link, lIdx) => (
                        <li key={lIdx}><span className="text-xs" style={{ color: colors.link }}>{link.label}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Copyright dark strip */}
          {config.showCopyright !== false && (
            <div className="w-full relative" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <div className={cn(maxWidthClass, 'mx-auto px-3 py-2 flex items-center justify-center')}>
                <p className="text-[10px]" style={{ color: colors.textSubtle }}>{config.copyright || '© 2024 VietAdmin. All rights reserved.'}</p>
              </div>
            </div>
          )}
        </footer>
      );
    }

    // Style 3: Corporate — Split Horizontal Zones
    if (previewStyle === 'corporate') {
      return (
        <footer className={cn('w-full', sectionSpacingClassName)} style={{ backgroundColor: colors.bg, borderTop: `1px solid ${colors.border}` }}>
          <div className={cn(maxWidthClass, 'mx-auto', previewShellPadding)}>
            <div className={corporateZone1ClassName} style={{ borderBottom: `1px solid ${colors.border}` }}>
              <div className="md:col-span-5 space-y-2">
                <div className="flex items-center gap-2">
                  {renderLogoMark(20)}
                  {logoName && <span className="text-sm font-bold" style={{ color: colors.heading }}>{logoName}</span>}
                </div>
                <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>{config.description || 'Đối tác tin cậy của bạn.'}</p>
              </div>
              <div className="md:col-span-4">{renderBctLogo(36)}</div>
              <div className="md:col-span-3">
                {config.showSocialLinks && (
                  <>
                    <h3 className="font-bold text-[10px] uppercase tracking-wider mb-2" style={{ color: colors.heading }}>Theo dõi</h3>
                    <div className="flex flex-wrap gap-2">
                      {socials.map((s, index) => {
                        const socialStyles = resolveSocialStyles(s.platform, colors.socialBg, colors.socialText);
                        return (
                          <span key={`${s.id ?? 'social'}-${index}`} className={cn('h-8 w-8 flex items-center justify-center', socialRadiusClassName)} style={{ backgroundColor: socialStyles.bg, color: socialStyles.color, ...(socialStyles.border ? { border: socialStyles.border } : {}) }}>
                            <SocialIcon platform={s.platform} size={16} />
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className={corporateZone2ClassName}>
              {columns.slice(0, 4).map((col, colIdx) => (
                <div key={`${col.id ?? 'col'}-${colIdx}`}>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: colors.heading }}>{col.title}</h4>
                  <ul className="space-y-1">
                    {col.links.map((link, lIdx) => (
                      <li key={lIdx}><span className="text-xs" style={{ color: colors.link }}>{link.label}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {config.showCopyright !== false && (
              <div className={bottomBarClassName} style={{ borderTop: `1px solid ${colors.borderSoft}` }}>
                <p className="text-[10px]" style={{ color: colors.textSubtle }}>{config.copyright || '© 2024 VietAdmin. All rights reserved.'}</p>
              </div>
            )}
          </div>
        </footer>
      );
    }

    // Style 4: Minimal — Compact Bar (Sudes Craft inspired)
    if (previewStyle === 'minimal') {
      const stripeColor = `${colors.accent}10`;
      const stripeBg = `repeating-linear-gradient(45deg, transparent, transparent 6px, ${stripeColor} 6px, ${stripeColor} 7px)`;
      return (
        <footer className="w-full relative" style={{ backgroundColor: colors.bg }}>
          <div className="absolute inset-0 pointer-events-none opacity-40" style={{ backgroundImage: stripeBg }} />
          <div className={cn(maxWidthClass, 'mx-auto relative', previewShellPadding, sectionSpacingClassName)}>
            <div className={modernGridClassName}>
              {/* Brand + Social */}
              <div className="lg:col-span-4 md:col-span-4 space-y-2">
                <div className="flex items-center gap-2">
                  {renderLogoMark(24)}
                  {logoName && <span className="text-sm font-bold tracking-tight" style={{ color: colors.heading }}>{logoName}</span>}
                </div>
                {config.description && (
                  <p className="text-xs leading-relaxed" style={{ color: colors.textMuted }}>{config.description}</p>
                )}
                {config.showSocialLinks && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {socials.map((s, index) => {
                      const socialStyles = resolveSocialStyles(s.platform, colors.socialBg, colors.socialText);
                      return (
                        <span key={`${s.id ?? 'social'}-${index}`} className={cn('h-7 w-7 flex items-center justify-center', socialRadiusClassName)} style={{ backgroundColor: socialStyles.bg, color: socialStyles.color, ...(socialStyles.border ? { border: socialStyles.border } : {}) }}>
                          <SocialIcon platform={s.platform} size={14} />
                        </span>
                      );
                    })}
                  </div>
                )}
                {renderBctLogo(36)}
              </div>
              {/* Link columns */}
              <div className="lg:col-span-8 md:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                {columns.slice(0, 4).map((col, colIdx) => (
                  <div key={`${col.id ?? 'col'}-${colIdx}`}>
                    <h3 className="font-bold text-[10px] uppercase tracking-wider mb-2" style={{ color: colors.heading }}>{col.title}</h3>
                    <ul className="space-y-1.5">
                      {col.links.map((link, lIdx) => (
                        <li key={lIdx}><span className="text-xs" style={{ color: colors.link }}>{link.label}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Copyright dark strip */}
          {config.showCopyright !== false && (
            <div className="w-full relative" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
              <div className={cn(maxWidthClass, 'mx-auto px-3 py-2 flex items-center justify-center')}>
                <p className="text-[10px]" style={{ color: colors.textSubtle }}>{config.copyright || '© 2024 VietAdmin. All rights reserved.'}</p>
              </div>
            </div>
          )}
        </footer>
      );
    }

    // Style 5: Centered — Magazine 4-Column (Bean Cargo inspired)
    if (previewStyle === 'centered') {
      return (
        <footer className="w-full" style={{ backgroundColor: colors.magazineBg }}>
          <div className={cn(maxWidthClass, 'mx-auto', previewShellPadding, sectionSpacingClassName)}>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {renderLogoMark(24)}
                  {logoName && <span className="text-sm font-bold tracking-tight" style={{ color: colors.magazineHeading }}>{logoName}</span>}
                </div>
                {config.description && (
                  <p className="text-xs leading-relaxed" style={{ color: colors.magazineTextMuted }}>{config.description}</p>
                )}
                {config.showSocialLinks && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {socials.map((s, index) => {
                      const socialStyles = resolveSocialStyles(s.platform, colors.socialBg, colors.socialText);
                      return (
                        <span key={`${s.id ?? 'social'}-${index}`} className={cn('h-7 w-7 flex items-center justify-center', socialRadiusClassName)} style={{ backgroundColor: socialStyles.bg, color: socialStyles.color, ...(socialStyles.border ? { border: socialStyles.border } : {}) }}>
                          <SocialIcon platform={s.platform} size={14} />
                        </span>
                      );
                    })}
                  </div>
                )}
                {renderBctLogo(36)}
              </div>
              {columns.slice(0, 4).map((col, colIdx) => (
                <div key={`${col.id ?? 'col'}-${colIdx}`}>
                  <h3 className="font-bold text-[10px] tracking-wide mb-2" style={{ color: colors.magazineHeading }}>{col.title}</h3>
                  <ul className="space-y-1.5">
                    {col.links.map((link, lIdx) => (
                      <li key={lIdx}><span className="text-xs" style={{ color: colors.magazineLink }}>{link.label}</span></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          {/* Copyright — primary strip */}
          {config.showCopyright !== false && (
            <div className="w-full" style={{ backgroundColor: colors.primary }}>
              <div className={cn(maxWidthClass, 'mx-auto px-3 py-2 flex items-center justify-center')}>
                <p className="text-[10px] font-medium" style={{ color: colors.textOnPrimary }}>{config.copyright || '© 2024 VietAdmin. All rights reserved.'}</p>
              </div>
            </div>
          )}
        </footer>
      );
    }

    // Style 6: Stacked — Wave Decorative (Euro Moto parallax wave, default)
    return (
      <footer className="w-full relative overflow-x-clip" style={{ backgroundColor: 'transparent' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes previewWaveMove {
            0% { transform: translate3d(-90px, 0, 0); }
            100% { transform: translate3d(85px, 0, 0); }
          }
          .preview-wave-parallax > use {
            animation: previewWaveMove 25s cubic-bezier(.55,.5,.45,.5) infinite;
          }
          .preview-wave-parallax > use:nth-child(1) { animation-delay: -2s; animation-duration: 7s; opacity: 0.7; }
          .preview-wave-parallax > use:nth-child(2) { animation-delay: -3s; animation-duration: 10s; opacity: 0.5; }
          .preview-wave-parallax > use:nth-child(3) { animation-delay: -4s; animation-duration: 13s; opacity: 0.3; }
          .preview-wave-parallax > use:nth-child(4) { animation-delay: -5s; animation-duration: 20s; opacity: 1; }
        `}} />
        <div className="w-full relative" style={{ marginBottom: '-1px' }}>
          <svg className="w-full block h-8 md:h-12" viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto" fill={colors.stackedTopBorder}>
            <defs><path id="preview-gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" /></defs>
            <g className="preview-wave-parallax">
              <use xlinkHref="#preview-gentle-wave" x="48" y="0" />
              <use xlinkHref="#preview-gentle-wave" x="48" y="3" />
              <use xlinkHref="#preview-gentle-wave" x="48" y="5" />
              <use xlinkHref="#preview-gentle-wave" x="48" y="7" />
            </g>
          </svg>
        </div>
        <div className="relative" style={{ backgroundColor: colors.stackedTopBorder }}>
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='600' height='600' viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23fff' stroke-width='1'%3E%3Cellipse cx='300' cy='300' rx='280' ry='200'/%3E%3Cellipse cx='300' cy='300' rx='220' ry='160'/%3E%3Cellipse cx='300' cy='300' rx='160' ry='120'/%3E%3Cellipse cx='300' cy='300' rx='100' ry='80'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '300px 300px',
          }} />
          <div className={cn(waveMaxWidthClass, 'mx-auto relative z-10', sectionSpacingClassName, previewShellPadding)}>
            <div className={stackedGridClassName}>
              <div className="lg:col-span-3 md:col-span-3 space-y-2.5">
                {renderLogoMark(28, 'object-contain brightness-110')}
                {logoName && <span className="text-sm font-bold tracking-tight block" style={{ color: colors.stackedTextOnBg }}>{logoName}</span>}
                <p className="text-xs leading-relaxed opacity-85" style={{ color: colors.stackedTextOnBg }}>{config.description || 'Đối tác tin cậy của bạn trong mọi giải pháp công nghệ.'}</p>
              </div>
              <div className="lg:col-span-6 md:col-span-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {columns.slice(0, 4).map((col, colIdx) => (
                  <div key={`${col.id ?? 'col'}-${colIdx}`}>
                    <h3 className="font-bold text-[10px] uppercase tracking-wider mb-2 pb-1" style={{ color: colors.stackedTextOnBg, borderBottom: '1px solid rgba(255,255,255,0.22)' }}>{col.title}</h3>
                    <ul className="space-y-1">
                      {col.links.map((link, lIdx) => (
                        <li key={lIdx}><span className="text-xs opacity-75" style={{ color: colors.stackedTextOnBg }}>{link.label}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="lg:col-span-3 md:col-span-3 space-y-2.5">
                {config.showSocialLinks && (
                  <>
                    <h3 className="font-bold text-[10px] uppercase tracking-wider pb-1" style={{ color: colors.stackedTextOnBg, borderBottom: '1px solid rgba(255,255,255,0.22)' }}>Liên kết</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {socials.map((s, index) => {
                        const socialStyles = resolveSocialStyles(s.platform, colors.stackedSocialBg, colors.stackedSocialText);
                        return (
                          <span key={`${s.id ?? 'social'}-${index}`} className={cn('h-8 w-8 flex items-center justify-center', socialRadiusClassName)} style={{ backgroundColor: socialStyles.bg, color: socialStyles.color, ...(socialStyles.border ? { border: socialStyles.border } : {}) }}>
                            <SocialIcon platform={s.platform} size={16} />
                          </span>
                        );
                      })}
                    </div>
                  </>
                )}
                {renderBctLogo(42)}
              </div>
            </div>
          </div>
          {config.showCopyright !== false && (
            <div className="relative z-10" style={{ borderTop: '0.8px solid rgba(255,255,255,0.3)' }}>
              <div className={cn(waveMaxWidthClass, 'mx-auto py-2.5 flex items-center justify-center', previewShellPadding)}>
                <p className="text-[10px] text-center opacity-70" style={{ color: colors.stackedTextOnBg }}>{config.copyright || '© 2024 VietAdmin. All rights reserved.'}</p>
              </div>
            </div>
          )}
        </div>
      </footer>
    );
  };


  return (
    <>
      <PreviewWrapper
        title="Preview Footer"
        device={device}
        setDevice={setDevice}
        previewStyle={previewStyle}
        setPreviewStyle={setPreviewStyle}
        styles={styles}
        deviceWidthClass={deviceWidths[device]}
        info={mode === 'dual' ? '2 màu' : '1 màu'}
        fontStyle={fontStyle}
        fontClassName={fontClassName}
      >
        {preview()}
      </PreviewWrapper>
      <ColorInfoPanel brandColor={brandColor} secondary={secondary} />
    </>
  );
};
