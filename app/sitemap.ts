import type { MetadataRoute } from 'next';
import { getConvexClient } from '@/lib/convex';
import { api } from '@/convex/_generated/api';
import { collectPaginated } from '@/lib/seo/sitemap';
import { resolveSiteUrl } from '@/lib/seo/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const client = getConvexClient();
  const baseUrl = await resolveSiteUrl();

  if (!baseUrl || baseUrl === 'https://example.com') {
    return [];
  }

  const resolveLatestTimestamp = (values: Array<number | undefined>): Date | undefined => {
    const normalized = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (normalized.length === 0) {
      return undefined;
    }
    return new Date(Math.max(...normalized));
  };

  const [posts, products, services, landingPages] = await Promise.all([
    collectPaginated((cursor) => client.query(api.posts.listPublished, {
      paginationOpts: { cursor, numItems: 500 },
    })),
    collectPaginated((cursor) => client.query(api.products.listPublishedPaginated, {
      paginationOpts: { cursor, numItems: 500 },
      sortBy: 'newest',
    })),
    collectPaginated((cursor) => client.query(api.services.listPublishedPaginated, {
      paginationOpts: { cursor, numItems: 500 },
      sortBy: 'newest',
    })),
    collectPaginated((cursor) => client.query(api.landingPages.listAllPublished, {
      paginationOpts: { cursor, numItems: 500 },
    })),
  ]);

  const latestPostTimestamp = resolveLatestTimestamp(posts.map((post) => post.publishedAt ?? post._creationTime));
  const latestProductTimestamp = resolveLatestTimestamp(products.map((product) => product._creationTime));
  const latestServiceTimestamp = resolveLatestTimestamp(services.map((service) => service.publishedAt ?? service._creationTime));
  const latestLandingTimestamp = resolveLatestTimestamp(landingPages.map((page) => page.updatedAt));
  const fallbackTimestamp = resolveLatestTimestamp([
    latestPostTimestamp?.getTime(),
    latestProductTimestamp?.getTime(),
    latestServiceTimestamp?.getTime(),
    latestLandingTimestamp?.getTime(),
  ]);

  const landingByType = landingPages.reduce<Record<string, number>>((acc, page) => {
    acc[page.landingType] = (acc[page.landingType] ?? 0) + 1;
    return acc;
  }, {});

  const hasLandingType = (type: string) => (landingByType[type] ?? 0) > 0;

  const buildHubEntry = (url: string, priority: number): MetadataRoute.Sitemap[number] => ({
    changeFrequency: 'weekly',
    lastModified: latestLandingTimestamp ?? fallbackTimestamp,
    priority,
    url,
  });

  const staticWithFreshness: MetadataRoute.Sitemap = [
    {
      changeFrequency: 'daily',
      lastModified: fallbackTimestamp,
      priority: 1,
      url: baseUrl,
    },
    {
      changeFrequency: 'daily',
      lastModified: latestPostTimestamp ?? latestLandingTimestamp ?? fallbackTimestamp,
      priority: 0.8,
      url: `${baseUrl}/posts`,
    },
    {
      changeFrequency: 'daily',
      lastModified: latestProductTimestamp ?? latestLandingTimestamp ?? fallbackTimestamp,
      priority: 0.8,
      url: `${baseUrl}/products`,
    },
    {
      changeFrequency: 'weekly',
      lastModified: latestServiceTimestamp ?? latestLandingTimestamp ?? fallbackTimestamp,
      priority: 0.8,
      url: `${baseUrl}/services`,
    },
    {
      changeFrequency: 'weekly',
      lastModified: latestLandingTimestamp ?? fallbackTimestamp,
      priority: 0.7,
      url: `${baseUrl}/contact`,
    },
    {
      changeFrequency: 'daily',
      lastModified: latestProductTimestamp ?? fallbackTimestamp,
      priority: 0.7,
      url: `${baseUrl}/promotions`,
    },
    {
      changeFrequency: 'monthly',
      lastModified: fallbackTimestamp,
      priority: 0.6,
      url: `${baseUrl}/stores`,
    },
    // SaaS landing hubs (chỉ include khi có landing pages thật)
    ...(hasLandingType('feature') ? [buildHubEntry(`${baseUrl}/features`, 0.8)] : []),
    ...(hasLandingType('use-case') ? [buildHubEntry(`${baseUrl}/use-cases`, 0.8)] : []),
    ...(hasLandingType('solution') ? [buildHubEntry(`${baseUrl}/solutions`, 0.8)] : []),
    ...(hasLandingType('compare') ? [buildHubEntry(`${baseUrl}/compare`, 0.7)] : []),
    ...(hasLandingType('integration') ? [buildHubEntry(`${baseUrl}/integrations`, 0.7)] : []),
    ...(hasLandingType('template') ? [buildHubEntry(`${baseUrl}/templates`, 0.7)] : []),
    ...(hasLandingType('guide') ? [buildHubEntry(`${baseUrl}/guides`, 0.8)] : []),
  ];

  // Generate post URLs
  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    changeFrequency: 'weekly' as const,
    ...(post.publishedAt && { lastModified: new Date(post.publishedAt) }),
    priority: 0.6,
    url: `${baseUrl}/posts/${post.slug}`,
  }));

  // Generate product URLs
  const productUrls: MetadataRoute.Sitemap = products.map((product) => {
    const productUpdatedAt = (product as { updatedAt?: number }).updatedAt;
    return {
      changeFrequency: 'weekly' as const,
      lastModified: new Date(productUpdatedAt ?? product._creationTime),
      priority: 0.7,
      url: `${baseUrl}/products/${product.slug}`,
    };
  });

  // Generate service URLs
  const serviceUrls: MetadataRoute.Sitemap = services.map((service) => ({
    changeFrequency: 'monthly' as const,
    ...(service.publishedAt && { lastModified: new Date(service.publishedAt) }),
    priority: 0.7,
    url: `${baseUrl}/services/${service.slug}`,
  }));

  // Generate landing page URLs (features/use-cases/solutions/compare/integrations/templates/guides)
  const landingUrls: MetadataRoute.Sitemap = landingPages.map((page) => {
    const routeMap: Record<string, string> = {
      feature: '/features',
      'use-case': '/use-cases',
      solution: '/solutions',
      compare: '/compare',
      integration: '/integrations',
      template: '/templates',
      guide: '/guides',
    };
    const basePath = routeMap[page.landingType] || '/features';
    
    return {
      changeFrequency: 'weekly' as const,
      lastModified: new Date(page.updatedAt),
      priority: 0.7,
      url: `${baseUrl}${basePath}/${page.slug}`,
    };
  });

  return [...staticWithFreshness, ...postUrls, ...productUrls, ...serviceUrls, ...landingUrls];
}
