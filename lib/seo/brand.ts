import type { SEOSettings, SiteSettings } from '@/lib/get-settings';

export type BrandEntityType = 'Organization' | 'LocalBusiness' | 'ProfessionalService';

export const splitSeoList = (value?: string): string[] => {
  if (!value) {
    return [];
  }

  const seen = new Set<string>();
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const normalized = item.toLowerCase();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
};

export const mergeUniqueSeoList = (...groups: string[][]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  groups.flat().forEach((item) => {
    const normalized = item.trim();
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) {
      return;
    }
    seen.add(key);
    result.push(normalized);
  });

  return result;
};

export const collectBrandAliases = (seo: SEOSettings, site: SiteSettings): string[] => {
  const primaryName = site.site_name.trim().toLowerCase();
  return splitSeoList(seo.seo_brand_aliases)
    .filter((alias) => alias.toLowerCase() !== primaryName);
};

export const collectBrandSearchTerms = (seo: SEOSettings, site: SiteSettings): string[] => mergeUniqueSeoList(
  splitSeoList(site.site_name),
  collectBrandAliases(seo, site),
  splitSeoList(seo.seo_brand_search_queries)
);

export const collectBrandTopics = (seo: SEOSettings): string[] => splitSeoList(seo.seo_brand_topics);

export const collectBrandServices = (seo: SEOSettings): string[] => splitSeoList(seo.seo_brand_services);

export const collectBrandSameAs = (seo: SEOSettings): string[] => splitSeoList(seo.seo_brand_same_as)
  .filter((url) => url.startsWith('http://') || url.startsWith('https://'));

export const resolveBrandDescription = (seo: SEOSettings, site: SiteSettings): string => (
  seo.seo_brand_summary
  || seo.seo_description
  || site.site_tagline
  || ''
);

export const resolveBrandEntityType = (value?: string): BrandEntityType => {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'localbusiness' || normalized === 'local business' || normalized === 'local_business') {
    return 'LocalBusiness';
  }
  if (normalized === 'professionalservice' || normalized === 'professional service' || normalized === 'professional_service') {
    return 'ProfessionalService';
  }
  return 'Organization';
};

export const buildSiteSearchActionUrl = (baseUrl: string, searchPath?: string): string => {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const rawPath = searchPath?.trim() || '/search?q={search_term_string}';
  const pathWithToken = rawPath.includes('{search_term_string}')
    ? rawPath
    : `${rawPath}${rawPath.includes('?') ? '&' : '?'}q={search_term_string}`;

  if (pathWithToken.startsWith('http://') || pathWithToken.startsWith('https://')) {
    return pathWithToken;
  }

  return `${normalizedBaseUrl}/${pathWithToken.replace(/^\//, '')}`;
};
