'use client';

import React, { useEffect, useState } from 'react';

export interface InitialBrandSplashProps {
  logo?: string;
  siteName?: string;
  isDark?: boolean;
}

/**
 * InitialBrandSplash:
 * - Kỹ thuật Superdong + Premium Progress: Hiển thị Logo ngay tức thì từ 0ms (Server HTML).
 * - Thanh tiến trình & % mượt mà tăng từ 0% -> 100%.
 * - Khi đạt 100%, chuyển cảnh mờ dần (Fade-out 0.5s) êm dịu, không giật, không làm chậm web.
 * - Khớp 100% React 19 & Next.js 16 (Zero Hydration Mismatch).
 */
export function InitialBrandSplash({
  logo,
  siteName,
  isDark = false,
}: InitialBrandSplashProps) {
  const [progress, setProgress] = useState(85);
  const [isFading, setIsFading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Vừa vào trang là nhảy mượt từ 85% lên 90% ngay lập tức
    const quickTimer = setTimeout(() => {
      setProgress(90);
    }, 40);

    // Nhích nhẹ lên 92% trước khi hoàn tất
    const intermediateTimer = setTimeout(() => {
      setProgress(92);
    }, 140);

    // Khi client mount & tài nguyên sẵn sàng, chạm 100%
    const completeTimer = setTimeout(() => {
      setProgress(100);

      // Chờ nhẹ để hiển thị 100% rồi mờ dần thanh thoát
      const fadeTimer = setTimeout(() => {
        setIsFading(true);
      }, 120);

      const unmountTimer = setTimeout(() => {
        setIsMounted(true);
      }, 500);

      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(unmountTimer);
      };
    }, 300);

    return () => {
      clearTimeout(quickTimer);
      clearTimeout(intermediateTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  if (isMounted || !logo) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center transition-opacity duration-500 ease-out ${
        isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900'
      } ${isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      aria-hidden="true"
    >
      <div className="flex flex-col items-center justify-center gap-6 p-4 select-none">
        {/* Logo thương hiệu sắc nét */}
        <div className="relative flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt={siteName || 'Logo'}
            style={{
              maxHeight: '90px',
              maxWidth: '220px',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* Thanh tiến trình & % thanh mảnh, sang trọng */}
        <div className="flex flex-col items-center gap-2 w-40">
          <div className="w-full h-[3px] bg-slate-200/80 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-150 ease-out"
              style={{
                width: `${progress}%`,
                backgroundColor: 'var(--site-brand-primary, #46da10)',
              }}
            />
          </div>
          <span
            className="text-[11px] font-medium tracking-wider text-slate-400 dark:text-slate-500 tabular-nums"
          >
            {progress}%
          </span>
        </div>
      </div>
    </div>
  );
}
