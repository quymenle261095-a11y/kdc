import HomePageClient from './_components/HomePageClient';
import { getConvexClient } from '@/lib/convex';
import { api } from '@/convex/_generated/api';

export default async function HomePage(): Promise<React.ReactElement> {
  const client = getConvexClient();
  const [initialComponents, homeComponentConfig, siteSettings] = await Promise.all([
    client.query(api.homeComponents.listActive),
    client.query(api.homeComponentSystemConfig.getConfig),
    client.query(api.settings.getMultiple, {
      keys: ['site_name', 'site_tagline', 'seo_title', 'site_logo', 'site_brand_primary'],
    }),
  ]);

  return (
    <HomePageClient
      initialComponents={initialComponents}
      initialHomePageChrome={homeComponentConfig.homePageChrome}
      initialSiteSettings={siteSettings as Record<string, unknown>}
    />
  );
}

