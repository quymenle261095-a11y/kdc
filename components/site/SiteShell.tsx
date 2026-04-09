'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Header, type HeaderInitialData } from '@/components/site/Header';
import { SiteProviders } from '@/components/site/SiteProviders';
import { useCart } from '@/lib/cart';

const DynamicFooter = dynamic(
  () => import('@/components/site/DynamicFooter').then((mod) => ({ default: mod.DynamicFooter })),
  { ssr: false, loading: () => null }
);

const CartDrawer = dynamic(
  () => import('@/components/site/CartDrawer').then((mod) => ({ default: mod.CartDrawer })),
  { ssr: false, loading: () => null }
);

function SiteShellInner({
  children,
  initialHeaderData,
}: {
  children: React.ReactNode;
  initialHeaderData?: HeaderInitialData;
}) {
  const pathname = usePathname();
  const isHomepage = pathname === '/';
  const { isDrawerOpen } = useCart();
  const [enableCartDrawer, setEnableCartDrawer] = useState(!isHomepage);
  const [enableFooter, setEnableFooter] = useState(!isHomepage);

  useEffect(() => {
    if (!isHomepage) {
      setEnableFooter(true);
      return;
    }
    if (enableFooter) {
      return;
    }
    const activate = () => setEnableFooter(true);
    const canIdle = typeof window.requestIdleCallback === 'function';
    const handle = canIdle
      ? window.requestIdleCallback(activate, { timeout: 1500 })
      : window.setTimeout(activate, 1500);
    window.addEventListener('scroll', activate, { once: true, passive: true });
    window.addEventListener('pointerdown', activate, { once: true });
    window.addEventListener('keydown', activate, { once: true });
    return () => {
      if (canIdle) {
        window.cancelIdleCallback(handle as number);
      } else {
        window.clearTimeout(handle as number);
      }
      window.removeEventListener('scroll', activate);
      window.removeEventListener('pointerdown', activate);
      window.removeEventListener('keydown', activate);
    };
  }, [enableFooter, isHomepage]);

  useEffect(() => {
    if (!isHomepage) {
      return;
    }
    if (isDrawerOpen) {
      setEnableCartDrawer(true);
    }
  }, [isDrawerOpen, isHomepage]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header initialData={initialHeaderData} deferInteractive={isHomepage} />
      {enableCartDrawer && <CartDrawer />}
      <main className="flex-1 overflow-x-hidden">
        {children}
      </main>
      {enableFooter && <DynamicFooter />}
    </div>
  );
}

export function SiteShell({
  children,
  initialHeaderData,
}: {
  children: React.ReactNode;
  initialHeaderData?: HeaderInitialData;
}) {
  return (
    <SiteProviders>
      <SiteShellInner initialHeaderData={initialHeaderData}>
        {children}
      </SiteShellInner>
    </SiteProviders>
  );
}
