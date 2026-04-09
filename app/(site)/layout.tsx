import { JsonLd, generateNavigationSchema } from '@/components/seo/JsonLd';
import { SiteShell } from '@/components/site/SiteShell';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex';
import { getPublicSettings } from '@/lib/get-settings';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import { buildSiteSchemas } from '@/lib/seo/schema-policy';
import { TelemetryGate } from '@/components/telemetry/TelemetryGate';
import type { Metadata } from 'next';

export const revalidate = 60;

const resolveUrl = (url: string, baseUrl: string): string => {
  if (!url) {
    return baseUrl;
  }
  if (url.startsWith('http')) {
    return url;
  }
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

export const generateMetadata = (): Promise<Metadata> => {
  return getPublicSettings().then(({ site, seo, contact, social }) => {
    return {
      ...buildSeoMetadata({
        contact,
        pathname: '/',
        routeType: 'home',
        seo,
        site,
        titleOverride: seo.seo_title || site.site_name,
        useTitleTemplate: true,
        social,
      }),
      icons: {
        icon: `/api/favicon?v=${encodeURIComponent(site.site_favicon || '')}`,
        apple: `/api/favicon?v=${encodeURIComponent(site.site_favicon || '')}`,
      },
      manifest: '/manifest.webmanifest',
    };
  });
};

const SiteLayout = ({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> => {
  const client = getConvexClient();
  return Promise.all([
    getPublicSettings(),
    client.query(api.menus.getMenuByLocation, { location: 'header' }),
    client.query(api.settings.getMultiple, {
      keys: ['header_style', 'header_config'],
    }),
    client.query(api.admin.modules.getModuleByKey, { key: 'cart' }),
    client.query(api.admin.modules.getModuleByKey, { key: 'wishlist' }),
    client.query(api.admin.modules.getModuleByKey, { key: 'customers' }),
    client.query(api.admin.modules.getModuleByKey, { key: 'orders' }),
    client.query(api.admin.modules.getModuleByKey, { key: 'products' }),
    client.query(api.admin.modules.getModuleByKey, { key: 'posts' }),
    client.query(api.admin.modules.getModuleByKey, { key: 'services' }),
    client.query(api.admin.modules.getModuleFeature, { moduleKey: 'customers', featureKey: 'enableLogin' }),
  ]).then(async ([
    publicSettings,
    headerMenu,
    headerSettings,
    cartModule,
    wishlistModule,
    customersModule,
    ordersModule,
    productsModule,
    postsModule,
    servicesModule,
    customerLoginFeature,
  ]) => {
    const { site, seo, contact, social } = publicSettings;
    const baseUrl = (site.site_url || process.env.NEXT_PUBLIC_SITE_URL) ?? '';
    const headerItems = headerMenu
      ? await client.query(api.menus.listActiveMenuItems, { menuId: headerMenu._id })
      : [];
    const initialHeaderData = {
      contact: {
        contact_email: contact.contact_email,
        contact_phone: contact.contact_phone,
      },
      headerConfig: headerSettings.header_config as Record<string, unknown> | null,
      headerStyle: headerSettings.header_style as string | null,
      menuData: headerMenu ? { menu: headerMenu, items: headerItems } : null,
      moduleFlags: {
        cart: Boolean(cartModule?.enabled),
        wishlist: Boolean(wishlistModule?.enabled),
        customers: Boolean(customersModule?.enabled),
        orders: Boolean(ordersModule?.enabled),
        products: Boolean(productsModule?.enabled),
        posts: Boolean(postsModule?.enabled),
        services: Boolean(servicesModule?.enabled),
        customerLogin: Boolean(customerLoginFeature?.enabled),
      },
      site: {
        site_logo: site.site_logo,
        site_name: site.site_name,
        site_tagline: site.site_tagline,
      },
    };

    // Zero-config: schema engine tự quyết định Organization vs LocalBusiness
    const siteSchemas = buildSiteSchemas({ contact, seo, site, social });

    const navigationSchema = generateNavigationSchema({
      items: headerItems.map((item) => ({
        name: item.label,
        url: resolveUrl(item.url, baseUrl),
      })),
      name: `${site.site_name} Navigation`,
      url: baseUrl,
    });

    return (
      <div data-theme="light" style={{ colorScheme: 'light' }}>
        <SiteShell initialHeaderData={initialHeaderData}>
          {siteSchemas.map((schema, index) => (
            <JsonLd key={index} data={schema} />
          ))}
          {headerItems.length > 0 && <JsonLd data={navigationSchema} />}
          {children}
          <TelemetryGate includeSpeedInsights />
        </SiteShell>
      </div>
    );
  });
};

export default SiteLayout;
