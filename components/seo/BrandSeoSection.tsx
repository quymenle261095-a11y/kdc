import type { ContactSettings, SEOSettings, SiteSettings, SocialSettings } from '@/lib/get-settings';
import {
  collectBrandAliases,
  collectBrandSameAs,
  collectBrandSearchTerms,
  collectBrandServices,
  collectBrandTopics,
  mergeUniqueSeoList,
  resolveBrandDescription,
} from '@/lib/seo/brand';

type BrandSeoSectionProps = {
  contact: ContactSettings;
  seo: SEOSettings;
  site: SiteSettings;
  social?: SocialSettings;
};

const take = (items: string[], limit: number) => items.slice(0, limit);

const splitLines = (value: string): string[] => value
  .split(/\n+/)
  .map((item) => item.trim())
  .filter(Boolean);

const getHostLabel = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

const collectOfficialLinks = (params: BrandSeoSectionProps): string[] => mergeUniqueSeoList([
  params.social?.social_facebook,
  params.social?.social_instagram,
  params.social?.social_youtube,
  params.social?.social_tiktok,
  params.social?.social_twitter,
  params.social?.social_linkedin,
  params.social?.social_pinterest,
  params.contact.contact_zalo,
].map((value) => value?.trim() ?? '')
  .filter((value) => value.startsWith('http')), collectBrandSameAs(params.seo));

export function BrandSeoSection({ contact, seo, site, social }: BrandSeoSectionProps) {
  const siteName = site.site_name || 'Website';
  const hasExplicitBrandContent = Boolean(
    seo.seo_brand_summary.trim()
    || seo.seo_brand_aliases.trim()
    || seo.seo_brand_search_queries.trim()
    || seo.seo_brand_topics.trim()
    || seo.seo_brand_services.trim()
    || seo.seo_brand_audience.trim()
    || seo.seo_brand_differentiators.trim()
    || seo.seo_brand_proof_points.trim()
    || seo.seo_brand_same_as.trim()
  );
  const summary = (hasExplicitBrandContent ? resolveBrandDescription(seo, site) : '').trim();
  const aliases = take(collectBrandAliases(seo, site), 10);
  const searchTerms = take(collectBrandSearchTerms(seo, site), 12);
  const topics = take(collectBrandTopics(seo), 10);
  const services = take(collectBrandServices(seo), 10);
  const officialLinks = take(collectOfficialLinks({ contact, seo, site, social }), 6);
  const audience = seo.seo_brand_audience.trim();
  const differentiators = splitLines(seo.seo_brand_differentiators);
  const proofPoints = splitLines(seo.seo_brand_proof_points);

  if (!hasExplicitBrandContent) {
    return null;
  }

  return (
    <section
      aria-labelledby="brand-seo-heading"
      className="bg-white px-4 py-12 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Thông tin thương hiệu
              </p>
              <h2 id="brand-seo-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
                Về {siteName}
              </h2>
              {summary && (
                <p className="max-w-3xl text-base leading-7 text-slate-700 dark:text-slate-300">
                  {summary}
                </p>
              )}
              {audience && (
                <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {audience}
                </p>
              )}
            </div>

            {services.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Sản phẩm, dịch vụ chính
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {services.map((service) => (
                    <li key={service} className="rounded-full bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:ring-slate-800">
                      {service}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {differentiators.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Điểm khác biệt
                </h3>
                <ul className="grid gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  {differentiators.map((item) => (
                    <li key={item} className="rounded-2xl bg-white p-3 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="space-y-5">
            {searchTerms.length > 1 && (
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Cách khách thường tìm {siteName}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {searchTerms.join(', ')}
                </p>
                {aliases.length > 0 && (
                  <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-500">
                    Tên gọi khác: {aliases.join(', ')}
                  </p>
                )}
              </div>
            )}

            {topics.length > 0 && (
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Chủ đề chính
                </h3>
                <ul className="mt-3 grid gap-2 text-sm text-slate-700 dark:text-slate-300">
                  {topics.map((topic) => (
                    <li key={topic}>• {topic}</li>
                  ))}
                </ul>
              </div>
            )}

            {(proofPoints.length > 0 || officialLinks.length > 0) && (
              <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Bằng chứng tin cậy
                </h3>
                {proofPoints.length > 0 && (
                  <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                    {proofPoints.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                )}
                {officialLinks.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {officialLinks.map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        {getHostLabel(url)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
