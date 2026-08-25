import { notFound } from 'next/navigation';
import { TrustPageContent } from '@/app/(site)/_components/TrustPageContent';
import { getIASettings } from '@/lib/ia/settings';
import { findTrustPageSlot } from '@/lib/ia/trust-pages';
import { getPageByKey, isPageVisible } from '@/lib/ia/trust-pages-runtime';

export const revalidate = 60; // trust pages: tái render sau 60 giây, không cache lâu như layout (1800s)

export default async function AboutPage() {
  const iaSettings = await getIASettings();
  if (!iaSettings.pages.about) {
    notFound();
  }

  const slot = findTrustPageSlot('about');
  if (!slot) {
    notFound();
  }

  const page = await getPageByKey('about');
  if (!page || !isPageVisible(page)) {
    notFound();
  }

  return (
    <TrustPageContent
      title={page.title || slot.defaultTitle}
      description={page.excerpt ?? page.metaDescription ?? null}
      content={page.content}
      renderType={page.renderType ?? 'content'}
      markdownRender={page.markdownRender ?? null}
      htmlRender={page.htmlRender ?? null}
    />
  );
}
