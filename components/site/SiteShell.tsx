'use client';

import React from 'react';
import { useQuery } from 'convex/react';
import { usePathname } from 'next/navigation';
import { DynamicFooter } from '@/components/site/DynamicFooter';
import { Header, type HeaderInitialData } from '@/components/site/Header';
import { CartDrawer } from '@/components/site/CartDrawer';
import { SiteProviders } from '@/components/site/SiteProviders';
import { GlobalSpeedDial } from '@/components/site/GlobalSpeedDial';
import { OfflineDinoOverlay } from '@/components/site/OfflineDinoOverlay';
import { AiChatbotWidget } from '@/components/site/AiChatbotWidget';
import { api } from '@/convex/_generated/api';

export type HomePageChromeConfig = {
  showFooter: boolean;
  showHeader: boolean;
  showSpeedDial: boolean;
};

const DEFAULT_HOME_PAGE_CHROME: HomePageChromeConfig = {
  showFooter: true,
  showHeader: true,
  showSpeedDial: true,
};

const normalizeHomePageChrome = (value: Partial<HomePageChromeConfig> | null | undefined): HomePageChromeConfig => ({
  showFooter: value?.showFooter !== false,
  showHeader: value?.showHeader !== false,
  showSpeedDial: value?.showSpeedDial !== false,
});

export function SiteShell({
  children,
  initialHeaderData,
  initialHomePageChrome,
}: {
  children: React.ReactNode;
  initialHeaderData?: HeaderInitialData;
  initialHomePageChrome?: HomePageChromeConfig;
}) {
  return (
    <SiteProviders>
      <SiteShellFrame initialHeaderData={initialHeaderData} initialHomePageChrome={initialHomePageChrome}>
        {children}
      </SiteShellFrame>
    </SiteProviders>
  );
}

function SiteShellFrame({
  children,
  initialHeaderData,
  initialHomePageChrome,
}: {
  children: React.ReactNode;
  initialHeaderData?: HeaderInitialData;
  initialHomePageChrome?: HomePageChromeConfig;
}) {
  const pathname = usePathname();
  const systemConfig = useQuery(api.homeComponentSystemConfig.getConfig);
  const isHomePage = pathname === '/';
  const homePageChrome = normalizeHomePageChrome(systemConfig?.homePageChrome ?? initialHomePageChrome ?? DEFAULT_HOME_PAGE_CHROME);
  const showHeader = !isHomePage || homePageChrome.showHeader;
  const showFooter = !isHomePage || homePageChrome.showFooter;
  const showSpeedDial = !isHomePage || homePageChrome.showSpeedDial;

  return (
    <div className="min-h-screen flex flex-col">
      {showHeader && <Header initialData={initialHeaderData} />}
      <CartDrawer />
      <main className="flex-1 overflow-x-hidden flex flex-col">
        {children}
      </main>
      {showFooter && <DynamicFooter />}
      {showSpeedDial && <GlobalSpeedDial />}
      <AiChatbotWidget />
      <OfflineDinoOverlay initialSite={initialHeaderData?.site} />
    </div>
  );
}
