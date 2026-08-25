import type { ContactSettings, SEOSettings, SiteSettings, SocialSettings } from '@/lib/get-settings';
import {
  collectBrandAliases,
  collectBrandSameAs,
  collectBrandSearchTerms,
  collectBrandServices,
  collectBrandTopics,
  mergeUniqueSeoList,
  resolveBrandDescription,
} from './brand';

type LlmsParams = {
  baseUrl: string;
  contact: ContactSettings;
  seo: SEOSettings;
  site: SiteSettings;
  social?: SocialSettings;
};

const normalizeUrl = (value: string, baseUrl: string): string => {
  if (!value) {
    return baseUrl;
  }
  if (value.startsWith('http')) {
    return value;
  }
  return `${baseUrl.replace(/\/$/, '')}/${value.replace(/^\//, '')}`;
};

const collectSameAs = (params: LlmsParams): string[] => {
  const raw = [
    params.social?.social_facebook,
    params.social?.social_instagram,
    params.social?.social_youtube,
    params.social?.social_tiktok,
    params.social?.social_twitter,
    params.social?.social_linkedin,
    params.social?.social_pinterest,
    params.contact.contact_zalo,
  ];

  return mergeUniqueSeoList(raw
    .map((value) => (value || '').trim())
    .filter((value) => value && value !== '#')
    .filter((value) => value.startsWith('http')), collectBrandSameAs(params.seo));
};

export const buildLlmsText = (params: LlmsParams): string => {
  const baseUrl = params.baseUrl.replace(/\/$/, '');
  const summary = resolveBrandDescription(params.seo, params.site);
  const sameAs = collectSameAs(params);
  const brandAliases = collectBrandAliases(params.seo, params.site);
  const brandSearchTerms = collectBrandSearchTerms(params.seo, params.site);
  const brandTopics = collectBrandTopics(params.seo);
  const brandServices = collectBrandServices(params.seo);
  const brandAudience = params.seo.seo_brand_audience.trim();
  const brandDifferentiators = params.seo.seo_brand_differentiators.trim();
  const brandProofPoints = params.seo.seo_brand_proof_points.trim();
  const brandEntityType = params.seo.seo_brand_entity_type.trim() || 'Organization';

  const priorityUrls = [
    { url: baseUrl, note: 'Homepage' },
    { url: `${baseUrl}/features`, note: 'Tính năng' },
    { url: `${baseUrl}/use-cases`, note: 'Use cases' },
    { url: `${baseUrl}/solutions`, note: 'Giải pháp' },
    { url: `${baseUrl}/compare`, note: 'So sánh' },
    { url: `${baseUrl}/integrations`, note: 'Tích hợp' },
    { url: `${baseUrl}/templates`, note: 'Templates' },
    { url: `${baseUrl}/guides`, note: 'Guides' },
    { url: `${baseUrl}/posts`, note: 'Bài viết' },
    { url: `${baseUrl}/products`, note: 'Sản phẩm' },
    { url: `${baseUrl}/services`, note: 'Dịch vụ' },
    { url: `${baseUrl}/contact`, note: 'Liên hệ' },
  ];

  return [
    '# llms.txt',
    '',
    '## Summary',
    `Site: ${params.site.site_name || 'Website'}`,
    summary ? `Description: ${summary}` : 'Description: ',
    `Base URL: ${baseUrl}`,
    `Language: ${params.site.site_language || 'vi'}`,
    '',
    '## Brand Entity',
    `Primary name: ${params.site.site_name || 'Website'}`,
    `Entity type: ${brandEntityType}`,
    `Aliases: ${brandAliases.length > 0 ? brandAliases.join(', ') : '(none)'}`,
    `Target brand queries: ${brandSearchTerms.length > 0 ? brandSearchTerms.join(', ') : '(none)'}`,
    brandTopics.length > 0 ? `Topics: ${brandTopics.join(', ')}` : 'Topics: (none)',
    brandServices.length > 0 ? `Core offers: ${brandServices.join(', ')}` : 'Core offers: (none)',
    brandAudience ? `Audience: ${brandAudience}` : 'Audience: ',
    brandDifferentiators ? `Differentiators: ${brandDifferentiators}` : 'Differentiators: ',
    brandProofPoints ? `Proof points: ${brandProofPoints}` : 'Proof points: ',
    '',
    '## Priority URLs',
    ...priorityUrls.map((item) => `- ${item.url} - ${item.note}`),
    '',
    '## Sitemaps',
    `- ${baseUrl}/sitemap.xml`,
    '',
    '## Policies',
    `- Robots: ${baseUrl}/robots.txt`,
    '- Crawl friendly: ưu tiên HTML server-rendered, tránh chặn AI crawler chính.',
    '',
    '## Entity Links',
    ...(sameAs.length > 0 ? sameAs.map((url) => `- ${normalizeUrl(url, baseUrl)}`) : ['- (none)']),
  ].join('\n');
};
