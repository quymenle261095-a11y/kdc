import type { MetadataRoute } from 'next';
import { getSiteSettings } from '@/lib/get-settings';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = await getSiteSettings();
  const name = site.site_name || 'Website';
  const themeColor = site.site_brand_primary || '#3b82f6';

  return {
    name,
    short_name: name,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: themeColor,
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
      },
    ],
  };
}
