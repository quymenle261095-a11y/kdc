'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSiteSettings } from '@/components/site/hooks';

export interface BrandLogoLoadingRevealProps {
  className?: string;
  logoUrl?: string;
  siteName?: string;
  brandColor?: string;
  maxLogoSize?: number;
  fadeOut?: boolean;
}

export function BrandLogoLoadingReveal({
  className = '',
  logoUrl: propLogoUrl,
  siteName: propSiteName,
  maxLogoSize = 220,
  fadeOut = false,
}: BrandLogoLoadingRevealProps) {
  const { logo: clientLogo, siteName: clientSiteName } = useSiteSettings();

  const logoSrc = (propLogoUrl || clientLogo || '').trim();
  const brandName = propSiteName || clientSiteName || '';

  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [isSvgMode, setIsSvgMode] = useState(false);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  // Tự động kiểm tra và fetch SVG để bóc tách nét vẽ như SVG Artista
  useEffect(() => {
    if (!logoSrc) return;

    const isSvgUrl = logoSrc.toLowerCase().includes('.svg') || logoSrc.startsWith('data:image/svg+xml');
    
    if (isSvgUrl) {
      let isMounted = true;
      if (logoSrc.startsWith('data:image/svg+xml')) {
        try {
          const rawSvg = decodeURIComponent(logoSrc.split(',')[1] || '');
          if (rawSvg && isMounted) {
            setSvgContent(rawSvg);
            setIsSvgMode(true);
          }
        } catch {
          setIsSvgMode(false);
        }
      } else {
        fetch(logoSrc)
          .then((res) => {
            if (res.ok) return res.text();
            throw new Error('Failed to fetch SVG');
          })
          .then((text) => {
            if (text.includes('<svg') && isMounted) {
              setSvgContent(text);
              setIsSvgMode(true);
            }
          })
          .catch(() => {
            if (isMounted) setIsSvgMode(false);
          });
      }

      return () => {
        isMounted = false;
      };
    } else {
      setIsSvgMode(false);
    }
  }, [logoSrc]);

  // Tự động tính toán getTotalLength() và áp dụng vẽ nét theo màu gốc của Logo (Chuẩn SVG Artista)
  useEffect(() => {
    if (!isSvgMode || !svgContainerRef.current) return;

    const container = svgContainerRef.current;
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    // Giữ nguyên kích thước và tỷ lệ của Logo gốc
    svgEl.setAttribute('style', `width: auto; height: 100%; max-height: 100px; max-width: ${maxLogoSize}px; display: block; margin: 0 auto;`);

    const pathElements = svgEl.querySelectorAll<SVGGeometryElement>(
      'path, line, polyline, polygon, circle, ellipse, rect'
    );

    pathElements.forEach((el, index) => {
      let length = 800;
      try {
        if (typeof el.getTotalLength === 'function') {
          length = Math.ceil(el.getTotalLength()) || 800;
        }
      } catch {
        length = 800;
      }

      // Giữ đúng 100% màu gốc của từng nét trong Logo, tuyệt đối không gán màu khác
      const computedFill = el.getAttribute('fill') || el.style.fill || 'currentColor';
      const computedStroke = el.getAttribute('stroke') || el.style.stroke || (computedFill !== 'none' ? computedFill : 'currentColor');
      const origFill = computedFill === 'none' ? 'transparent' : computedFill;
      const strokeColor = computedStroke === 'none' ? (origFill !== 'transparent' ? origFill : 'currentColor') : computedStroke;

      el.style.setProperty('--orig-fill', origFill);
      el.style.stroke = strokeColor;
      el.style.strokeWidth = '1.2px';
      el.style.strokeDasharray = `${length}`;
      el.style.strokeDashoffset = `${length}`;
      el.style.fill = 'transparent';

      // Nhanh, dứt khoát: Mỗi nét vẽ trong 0.45s, đổ màu trong 0.25s
      const delay = index * 0.04;
      el.style.animation = `
        svgArtistaStroke 0.45s cubic-bezier(0.4, 0, 0.2, 1) ${delay}s forwards,
        svgArtistaFill 0.25s ease-out ${0.35 + delay}s forwards
      `;
    });
  }, [isSvgMode, svgContent, maxLogoSize]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-slate-950 transition-opacity duration-300 ease-out ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${className}`}
      aria-label="Đang tải trang..."
    >
      {/* Khung vẽ Logo nguyên bản (Không viền ngoài, không màu lạ) */}
      <div className="relative flex items-center justify-center">
        {logoSrc ? (
          isSvgMode && svgContent ? (
            /* Chế độ 1: SVG Vector Path Drawing tự động chuẩn SVG Artista */
            <div
              ref={svgContainerRef}
              className="relative flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            /* Chế độ 2: Logo Raster (PNG/WebP) - Xuất hiện nhanh và quét tia sáng lướt qua */
            <div className="relative flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={brandName}
                className="max-h-[95px] w-auto object-contain animate-[logoFastFade_0.35s_ease-out_forwards]"
              />

              {/* Dải sáng Shimmer góc 45 độ lướt qua logo nhanh 0.4s */}
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
                style={{
                  WebkitMaskImage: `url("${logoSrc}")`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskImage: `url("${logoSrc}")`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                }}
              >
                <div
                  className="h-full w-[160%] animate-[shimmerLight_0.5s_ease-in-out_forwards]"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%)',
                  }}
                />
              </div>
            </div>
          )
        ) : (
          /* Fallback tên thương hiệu tối giản khi chưa có logo */
          <span className="text-xl font-semibold tracking-wider text-slate-800 dark:text-slate-200">
            {brandName || 'Trang chủ'}
          </span>
        )}
      </div>

      {/* Global Keyframes tối giản và tốc độ cao */}
      <style jsx global>{`
        /* 1. Nét vẽ vector SVG chạy từ 0% đến 100% */
        @keyframes svgArtistaStroke {
          0% {
            stroke-dashoffset: 800;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        /* 2. Đổ màu gốc của từng path */
        @keyframes svgArtistaFill {
          0% {
            fill: transparent;
            stroke-width: 1.2px;
          }
          100% {
            fill: var(--orig-fill, currentColor);
            stroke-width: 0px;
          }
        }

        /* 3. Logo Raster fade in nhanh */
        @keyframes logoFastFade {
          0% {
            opacity: 0.2;
            transform: scale(0.97);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        /* 4. Tia sáng lướt qua logo */
        @keyframes shimmerLight {
          0% {
            transform: translateX(-100%) rotate(25deg);
          }
          100% {
            transform: translateX(100%) rotate(25deg);
          }
        }
      `}</style>
    </div>
  );
}
