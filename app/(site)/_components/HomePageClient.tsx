'use client';

import { HomeComponentRenderer } from '@/components/site/home/HomeComponentRenderer';
import type { SharedSystemData } from '@/components/site/home/HomeComponentRenderer';
import { HomePageLoading } from '@/components/site/loading/HomePageLoading';
import { useBrandColors, useSiteSettings } from '@/components/site/hooks';
import { api } from '@/convex/_generated/api';
import type { Doc } from '@/convex/_generated/dataModel';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import React, { useMemo } from 'react';

const EMPTY_COMPONENTS_COUNT = 0;

export default function HomePageClient({
  initialComponents,
  initialHomePageChrome,
  initialSiteSettings,
}: {
  initialComponents?: Doc<'homeComponents'>[];
  initialHomePageChrome?: { showSpeedDial: boolean };
  initialSiteSettings?: Record<string, unknown>;
}): React.ReactElement {
  const components = useQuery(api.homeComponents.listActive);
  const resolvedComponents = components ?? initialComponents;

  const systemConfig = useQuery(api.homeComponentSystemConfig.getConfig);
  const systemColors = useBrandColors();
  const { isDark } = useSiteSettings();

  const siteSettingsQuery = useQuery(api.settings.getMultiple, {
    keys: ['site_name', 'site_tagline', 'seo_title', 'site_logo', 'site_brand_primary'],
  });
  const siteSettings = siteSettingsQuery ?? initialSiteSettings;

  const h1Text = useMemo(() => {
    if (!siteSettings) return 'Chào mừng!';
    const siteName = (siteSettings.site_name as string)?.trim();
    const seoTitle = (siteSettings.seo_title as string)?.trim();
    const siteTagline = (siteSettings.site_tagline as string)?.trim();

    if (seoTitle) return seoTitle;
    if (siteName && siteTagline) return `${siteName} - ${siteTagline}`;
    return siteName || 'Chào mừng!';
  }, [siteSettings]);

  const sharedData: SharedSystemData = useMemo(() => ({
    systemConfig: systemConfig ?? null,
    systemColors,
    isDark,
  }), [systemConfig, systemColors, isDark]);

  const bgStyle = useMemo(() => {
    if (!systemConfig?.homePageBackground) return {};
    const { enabled, type, customColor } = systemConfig.homePageBackground as { enabled?: boolean; type?: string; customColor?: string };
    if (!enabled || isDark) return {};
    let color = '';
    switch (type) {
      case 'white':
        color = '#ffffff';
        break;
      case 'black':
        color = '#000000';
        break;
      case 'primary':
        color = systemColors.primary;
        break;
      case 'secondary':
        color = systemColors.secondary || systemColors.primary;
        break;
      case 'custom':
        color = customColor || '#ffffff';
        break;
      default:
        color = '#ffffff';
    }
    return { backgroundColor: color };
  }, [systemConfig?.homePageBackground, systemColors, isDark]);

  // Nếu chưa có dữ liệu từ cả SSR lẫn Client: Hiển thị Skeleton chuẩn
  if (!resolvedComponents) {
    return <HomePageLoading />;
  }

  // Trường hợp chưa có component nào được cấu hình
  if (resolvedComponents.length === EMPTY_COMPONENTS_COUNT) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{h1Text}</h1>
          <p className="text-slate-500">
            Chưa có nội dung trang chủ. Vui lòng thêm components trong{' '}
            <Link href="/admin/home-components" className="text-blue-600 hover:underline">
              Admin Panel
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Lọc và sắp xếp toàn bộ components theo đúng thứ tự (Order)
  const mainComponents = [...resolvedComponents]
    .filter((c) => c.type !== 'Footer' && c.type !== 'Popup' && c.type !== 'SpeedDial')
    .sort((a, b) => a.order - b.order);

  const popupComponents = resolvedComponents.filter((c) => c.type === 'Popup');
  const showHomePageSpeedDial = systemConfig?.homePageChrome?.showSpeedDial ?? initialHomePageChrome?.showSpeedDial ?? true;

  const speedDialComponents = resolvedComponents.filter((c) => {
    if (!showHomePageSpeedDial) return false;
    if (c.type !== 'SpeedDial' || !c.active) return false;
    const config = c.config as Record<string, unknown>;
    return config.showOnAllPages !== true;
  });

  return (
    <div style={bgStyle} className="min-h-screen transition-colors duration-300 home-page-marker">
      {/* Render 100% tất cả các section theo đúng thứ tự order ngay lập tức */}
      {mainComponents.map((component, index) => (
        <div
          key={component._id}
          style={index > 1 ? ({ contentVisibility: 'auto', containIntrinsicSize: '0 450px' } as React.CSSProperties) : undefined}
        >
          <HomeComponentRenderer
            component={{
              _id: component._id,
              active: component.active,
              config: component.config as Record<string, unknown>,
              order: component.order,
              title: component.title,
              type: component.type,
            }}
            sharedData={sharedData}
          />
        </div>
      ))}

      {/* Popups */}
      {popupComponents.map((component) => (
        <HomeComponentRenderer
          key={component._id}
          component={{
            _id: component._id,
            active: component.active,
            config: component.config as Record<string, unknown>,
            order: component.order,
            title: component.title,
            type: component.type,
          }}
          sharedData={sharedData}
        />
      ))}

      {/* Speed Dial */}
      {speedDialComponents.map((component) => (
        <HomeComponentRenderer
          key={component._id}
          component={{
            _id: component._id,
            active: component.active,
            config: component.config as Record<string, unknown>,
            order: component.order,
            title: component.title,
            type: component.type,
          }}
          sharedData={sharedData}
        />
      ))}
    </div>
  );
}
