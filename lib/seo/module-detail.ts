import {
  buildArticleSchema,
  buildFaqSchema,
  buildProductSchema,
  buildServiceSchema,
} from '@/lib/seo/schema-policy';

type SeoFaqItem = { answer?: string; question?: string };

export type ModuleDetailSeoEntity = {
  authorName?: string;
  content?: string;
  description?: string;
  excerpt?: string;
  faqItems?: SeoFaqItem[];
  focusKeyword?: string;
  image?: string;
  images?: string[];
  metaDescription?: string;
  metaTitle?: string;
  name?: string;
  publishedAt?: number;
  relatedQueries?: string[];
  tags?: string[];
  thumbnail?: string;
  title?: string;
  updatedAt?: number;
};

export const normalizeSeoStringList = (items: Array<string | undefined>, limit = 8) => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of items) {
    const value = item?.trim().replaceAll(/\s+/g, ' ');
    const key = value?.toLocaleLowerCase('vi-VN');
    if (!value || !key || seen.has(key)) {continue;}
    seen.add(key);
    normalized.push(value.slice(0, 80));
    if (normalized.length >= limit) {break;}
  }

  return normalized;
};

export const normalizeSeoFaqItems = (items?: SeoFaqItem[], limit = 10) => (items ?? [])
  .map((item) => ({
    answer: item.answer?.trim() ?? '',
    question: item.question?.trim() ?? '',
  }))
  .filter((item) => item.answer && item.question)
  .slice(0, limit);

export const resolveModuleDetailSeoKeywords = (entity: ModuleDetailSeoEntity) => normalizeSeoStringList([
  entity.focusKeyword,
  ...(entity.tags ?? []),
  ...(entity.relatedQueries ?? []),
]);

export const toModuleDetailSeoData = (entity: ModuleDetailSeoEntity) => ({
  content: entity.content,
  description: entity.description,
  excerpt: entity.excerpt,
  image: entity.image,
  images: entity.images,
  keywords: resolveModuleDetailSeoKeywords(entity).join(', '),
  metaDescription: entity.metaDescription,
  metaTitle: entity.metaTitle,
  name: entity.name,
  thumbnail: entity.thumbnail,
  title: entity.title,
});

export const buildModuleDetailFaqSchema = (entity: ModuleDetailSeoEntity) => {
  const faqItems = normalizeSeoFaqItems(entity.faqItems);
  return faqItems.length > 0 ? buildFaqSchema(faqItems) : undefined;
};

export const buildModuleArticleSchema = (params: {
  entity: ModuleDetailSeoEntity;
  fallbackDescription: string;
  image?: string;
  siteName: string;
  title: string;
  url: string;
}) => buildArticleSchema({
  authorName: params.entity.authorName,
  description: params.entity.metaDescription ?? params.entity.excerpt ?? params.entity.description ?? params.fallbackDescription,
  image: params.image ?? params.entity.thumbnail ?? params.entity.image,
  keywords: resolveModuleDetailSeoKeywords(params.entity),
  publishedAt: params.entity.publishedAt,
  siteName: params.siteName,
  title: params.entity.metaTitle ?? params.title,
  updatedAt: params.entity.updatedAt,
  url: params.url,
});

export const buildModuleProductSchema = (params: {
  aggregateRating?: { ratingValue: number; reviewCount: number };
  brand: string;
  currency?: string;
  entity: ModuleDetailSeoEntity & {
    price: number;
    salePrice?: number;
    sku: string;
    stock?: number;
  };
  fallbackDescription: string;
  image?: string;
  inStock: boolean;
  url: string;
}) => buildProductSchema({
  aggregateRating: params.aggregateRating,
  brand: params.brand,
  currency: params.currency,
  description: params.entity.metaDescription ?? params.entity.description ?? params.fallbackDescription,
  image: params.image ?? params.entity.image,
  images: params.entity.images,
  inStock: params.inStock,
  name: params.entity.metaTitle ?? params.entity.name ?? '',
  price: params.entity.price,
  salePrice: params.entity.salePrice,
  sku: params.entity.sku,
  url: params.url,
});

export const buildModuleServiceSchema = (params: {
  aggregateRating?: { ratingValue: number; reviewCount: number };
  entity: ModuleDetailSeoEntity & { price?: number };
  fallbackDescription: string;
  image?: string;
  providerName: string;
  providerUrl: string;
  url: string;
}) => buildServiceSchema({
  aggregateRating: params.aggregateRating,
  description: params.entity.metaDescription ?? params.entity.excerpt ?? params.fallbackDescription,
  image: params.image ?? params.entity.thumbnail,
  name: params.entity.metaTitle ?? params.entity.title ?? '',
  price: params.entity.price,
  providerName: params.providerName,
  providerUrl: params.providerUrl,
  url: params.url,
});
