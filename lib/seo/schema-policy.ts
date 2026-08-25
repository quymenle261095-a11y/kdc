/**
 * Schema Policy Engine
 * Zero-config: tự động quyết định schema nào phát dựa trên dữ liệu thật
 */

import type { ContactSettings, SEOSettings, SiteSettings, SocialSettings } from '@/lib/get-settings';
import { shouldIncludeLocalBusiness } from './resolver';
import {
  buildSiteSearchActionUrl,
  collectBrandAliases,
  collectBrandSameAs,
  collectBrandSearchTerms,
  collectBrandServices,
  collectBrandTopics,
  mergeUniqueSeoList,
  resolveBrandDescription,
  resolveBrandEntityType,
  type BrandEntityType,
} from './brand';

type SchemaRecord = Record<string, unknown>;

const normalizeSchemaUrl = (url?: string) => {
  const trimmed = url?.trim();
  return trimmed ? trimmed.replace(/([^:]\/)\/+/g, '$1') : '';
};

const normalizeArticleKeywords = (keywords?: string[] | string) => {
  const source = Array.isArray(keywords)
    ? keywords
    : (keywords ?? '').split(',');
  const seen = new Set<string>();
  const normalized = source
    .map((keyword) => keyword.trim().replaceAll(/\s+/g, ' ').slice(0, 80))
    .filter((keyword) => {
      const key = keyword.toLocaleLowerCase('vi-VN');
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, 8);
  return normalized.length > 0 ? normalized.join(', ') : undefined;
};

// =================== Site-Level Schemas ===================

export const buildWebSiteSchema = (params: {
  name: string;
  url: string;
  description?: string;
  alternateName?: string[];
  searchActionUrl?: string;
}): SchemaRecord => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: params.name,
  url: normalizeSchemaUrl(params.url),
  ...(params.description && { description: params.description }),
  ...(params.alternateName && params.alternateName.length > 0 && { alternateName: params.alternateName }),
  ...(params.searchActionUrl && {
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: normalizeSchemaUrl(params.searchActionUrl),
      },
      'query-input': 'required name=search_term_string',
    },
  }),
});

export const buildOrganizationSchema = (params: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  sameAs?: string[];
  alternateName?: string[];
  knowsAbout?: string[];
}): SchemaRecord => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: params.name,
  url: normalizeSchemaUrl(params.url),
  ...(params.alternateName && params.alternateName.length > 0 && { alternateName: params.alternateName }),
  ...(params.logo && { logo: params.logo }),
  ...(params.description && { description: params.description }),
  ...(params.email && { email: params.email }),
  ...(params.phone && { telephone: params.phone }),
  ...(params.address && {
    address: { '@type': 'PostalAddress', streetAddress: params.address },
  }),
  ...(params.knowsAbout && params.knowsAbout.length > 0 && { knowsAbout: params.knowsAbout }),
  ...(params.sameAs && params.sameAs.length > 0 && { sameAs: params.sameAs }),
});

export const buildLocalBusinessSchema = (params: {
  type?: Exclude<BrandEntityType, 'Organization'>;
  name: string;
  url: string;
  logo?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: string;
  sameAs?: string[];
  alternateName?: string[];
  knowsAbout?: string[];
  serviceType?: string[];
}): SchemaRecord => ({
  '@context': 'https://schema.org',
  '@type': params.type ?? 'LocalBusiness',
  name: params.name,
  url: normalizeSchemaUrl(params.url),
  ...(params.alternateName && params.alternateName.length > 0 && { alternateName: params.alternateName }),
  ...(params.logo && { image: params.logo }),
  ...(params.description && { description: params.description }),
  ...(params.email && { email: params.email }),
  ...(params.phone && { telephone: params.phone }),
  ...(params.address && {
    address: { '@type': 'PostalAddress', streetAddress: params.address },
  }),
  ...(params.knowsAbout && params.knowsAbout.length > 0 && { knowsAbout: params.knowsAbout }),
  ...(params.serviceType && params.serviceType.length > 0 && { serviceType: params.serviceType }),
  ...(params.sameAs && params.sameAs.length > 0 && { sameAs: params.sameAs }),
});

// =================== Entity-Level Schemas ===================

export const buildBreadcrumbSchema = (
  items: { name: string; url: string }[]
): SchemaRecord => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    item: normalizeSchemaUrl(item.url),
    name: item.name,
    position: index + 1,
  })),
});

export const buildArticleSchema = (params: {
  title: string;
  url: string;
  siteName: string;
  description?: string;
  image?: string;
  publishedAt?: number;
  updatedAt?: number;
  authorName?: string;
  language?: string;
  keywords?: string[] | string;
}): SchemaRecord => {
  const url = normalizeSchemaUrl(params.url);
  const keywords = normalizeArticleKeywords(params.keywords);
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.title,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(params.description && { description: params.description }),
    ...(params.image && { image: normalizeSchemaUrl(params.image) }),
    ...(params.publishedAt && { datePublished: new Date(params.publishedAt).toISOString() }),
    ...(params.updatedAt && { dateModified: new Date(params.updatedAt).toISOString() }),
    ...(params.language && { inLanguage: params.language }),
    ...(keywords && { keywords }),
    ...(params.authorName && {
      author: { '@type': 'Person', name: params.authorName },
    }),
    publisher: { '@type': 'Organization', name: params.siteName },
  };
};

export const buildProductSchema = (params: {
  name: string;
  url: string;
  sku: string;
  price: number;
  inStock: boolean;
  description?: string;
  image?: string;
  images?: string[];
  salePrice?: number;
  currency?: string;
  brand?: string;
  aggregateRating?: { ratingValue: number; reviewCount: number };
  createdAt?: number;
  updatedAt?: number;
}): SchemaRecord => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: params.name,
  url: normalizeSchemaUrl(params.url),
  sku: params.sku,
  mainEntityOfPage: { '@type': 'WebPage', '@id': normalizeSchemaUrl(params.url) },
  ...(params.description && { description: params.description }),
  ...(params.images && params.images.length > 0
    ? { image: params.images.map(normalizeSchemaUrl) }
    : (params.image ? { image: normalizeSchemaUrl(params.image) } : {})),
  ...(params.createdAt && { dateCreated: new Date(params.createdAt).toISOString() }),
  ...(params.updatedAt && { dateModified: new Date(params.updatedAt).toISOString() }),
  ...(params.brand && { brand: { '@type': 'Brand', name: params.brand } }),
  offers: {
    '@type': 'Offer',
    availability: params.inStock
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
    price: params.salePrice ?? params.price,
    priceCurrency: params.currency ?? 'VND',
    url: normalizeSchemaUrl(params.url),
  },
  ...(params.aggregateRating && {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: params.aggregateRating.ratingValue,
      reviewCount: params.aggregateRating.reviewCount,
    },
  }),
});

export const buildServiceSchema = (params: {
  name: string;
  url: string;
  providerName: string;
  description?: string;
  image?: string;
  price?: number;
  currency?: string;
  providerUrl?: string;
  aggregateRating?: { ratingValue: number; reviewCount: number };
}): SchemaRecord => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: params.name,
  url: normalizeSchemaUrl(params.url),
  mainEntityOfPage: { '@type': 'WebPage', '@id': normalizeSchemaUrl(params.url) },
  ...(params.description && { description: params.description }),
  ...(params.image && { image: normalizeSchemaUrl(params.image) }),
  provider: {
    '@type': 'Organization',
    name: params.providerName,
    ...(params.providerUrl && { url: normalizeSchemaUrl(params.providerUrl) }),
  },
  ...(params.price && {
    offers: {
      '@type': 'Offer',
      price: params.price,
      priceCurrency: params.currency ?? 'VND',
    },
  }),
  ...(params.aggregateRating && {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: params.aggregateRating.ratingValue,
      reviewCount: params.aggregateRating.reviewCount,
    },
  }),
});

export const buildFaqSchema = (
  faqs: { question: string; answer: string }[]
): SchemaRecord => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs.map((faq) => ({
    '@type': 'Question',
    name: faq.question,
    acceptedAnswer: { '@type': 'Answer', text: faq.answer },
  })),
});

export const buildItemListSchema = (params: {
  name: string;
  url: string;
  items: { name: string; url: string }[];
  itemListOrder?: string;
}): SchemaRecord => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: params.name,
  url: normalizeSchemaUrl(params.url),
  numberOfItems: params.items.length,
  ...(params.itemListOrder && { itemListOrder: params.itemListOrder }),
  itemListElement: params.items.map((item, index) => ({
    '@type': 'ListItem',
    name: item.name,
    position: index + 1,
    url: normalizeSchemaUrl(item.url),
  })),
});

// =================== Composite: Site-Level Schema Pack ===================

export const buildSiteSchemas = (params: {
  site: SiteSettings;
  seo: SEOSettings;
  contact: ContactSettings;
  social?: SocialSettings;
}): SchemaRecord[] => {
  const schemas: SchemaRecord[] = [];
  const siteUrl = normalizeSchemaUrl(params.site.site_url || process.env.NEXT_PUBLIC_SITE_URL || '');
  const brandAliases = collectBrandAliases(params.seo, params.site);
  const brandTopics = collectBrandTopics(params.seo);
  const brandServices = collectBrandServices(params.seo);
  const brandSearchTerms = collectBrandSearchTerms(params.seo, params.site);
  const brandEntityType = resolveBrandEntityType(params.seo.seo_brand_entity_type);
  const brandDescription = resolveBrandDescription(params.seo, params.site);
  const sameAs = mergeUniqueSeoList([
    params.social?.social_facebook,
    params.social?.social_instagram,
    params.social?.social_youtube,
    params.social?.social_tiktok,
    params.social?.social_twitter,
    params.social?.social_linkedin,
    params.social?.social_pinterest,
    params.contact.contact_zalo,
  ].map((value) => (value || '').trim())
    .filter((value) => value && value !== '#')
    .filter((value) => value.startsWith('http')), collectBrandSameAs(params.seo));
  const knowsAbout = mergeUniqueSeoList(brandTopics, brandServices, brandSearchTerms);

  schemas.push(
    buildWebSiteSchema({
      alternateName: brandAliases,
      description: brandDescription,
      name: params.site.site_name,
      searchActionUrl: siteUrl ? buildSiteSearchActionUrl(siteUrl, params.seo.seo_site_search_path) : undefined,
      url: siteUrl,
    })
  );

  schemas.push(
    buildOrganizationSchema({
      alternateName: brandAliases,
      description: brandDescription,
      email: params.contact.contact_email,
      knowsAbout,
      logo: params.site.site_logo,
      name: params.site.site_name,
      phone: params.contact.contact_phone,
      sameAs,
      url: siteUrl,
    })
  );

  if (
    shouldIncludeLocalBusiness({ contact: params.contact, site: params.site })
    || brandEntityType !== 'Organization'
  ) {
    schemas.push(
      buildLocalBusinessSchema({
        alternateName: brandAliases,
        address: params.contact.contact_address,
        description: brandDescription,
        email: params.contact.contact_email,
        knowsAbout,
        logo: params.site.site_logo,
        name: params.site.site_name,
        phone: params.contact.contact_phone,
        sameAs,
        serviceType: brandServices,
        type: brandEntityType === 'Organization' ? 'LocalBusiness' : brandEntityType,
        url: siteUrl,
      })
    );
  }

  return schemas;
};
