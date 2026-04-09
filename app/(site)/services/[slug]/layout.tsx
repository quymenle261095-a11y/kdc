import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getConvexClient } from '@/lib/convex';
import { api } from '@/convex/_generated/api';
import { getContactSettings, getSEOSettings, getSiteSettings, getSocialSettings } from '@/lib/get-settings';
import { JsonLd, generateBreadcrumbSchema, generateServiceSchema } from '@/components/seo/JsonLd';
import { buildSeoMetadata } from '@/lib/seo/metadata';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const client = getConvexClient();
  const servicesModule = await client.query(api.admin.modules.getModuleByKey, { key: 'services' });

  if (servicesModule?.enabled === false) {
    const [site, seo, contact, social] = await Promise.all([
      getSiteSettings(),
      getSEOSettings(),
      getContactSettings(),
      getSocialSettings(),
    ]);
    return buildSeoMetadata({
      contact,
      descriptionOverride: 'Trang dịch vụ hiện không khả dụng.',
      moduleEnabled: false,
      pathname: `/services/${slug}`,
      routeType: 'detail',
      seo,
      site,
      social,
      titleOverride: 'Không tìm thấy dịch vụ',
    });
  }
  
  const [service, site, seo, contact, social] = await Promise.all([
    client.query(api.services.getBySlug, { slug }),
    getSiteSettings(),
    getSEOSettings(),
    getContactSettings(),
    getSocialSettings(),
  ]);

  if (!service) {
    return buildSeoMetadata({
      contact,
      descriptionOverride: 'Dịch vụ này không tồn tại hoặc đã bị xóa.',
      entityExists: false,
      pathname: `/services/${slug}`,
      routeType: 'detail',
      seo,
      site,
      social,
      titleOverride: 'Không tìm thấy dịch vụ',
    });
  }

  return buildSeoMetadata({
    contact,
    entity: {
      excerpt: service.excerpt,
      metaDescription: service.metaDescription,
      metaTitle: service.metaTitle,
      thumbnail: service.thumbnail,
      title: service.title,
    },
    entityExists: true,
    pathname: `/services/${service.slug}`,
    routeType: 'detail',
    seo,
    site,
    social,
  });
}

export default async function ServiceLayout({ params, children }: Props) {
  const { slug } = await params;
  const client = getConvexClient();
  const servicesModule = await client.query(api.admin.modules.getModuleByKey, { key: 'services' });

  if (servicesModule?.enabled === false) {
    notFound();
  }
  
  const [service, site, seo] = await Promise.all([
    client.query(api.services.getBySlug, { slug }),
    getSiteSettings(),
    getSEOSettings(),
  ]);

  if (!service) {return children;}

  const baseUrl = (site.site_url || process.env.NEXT_PUBLIC_SITE_URL) ?? '';
  const serviceUrl = `${baseUrl}/services/${service.slug}`;
  const image = service.thumbnail ?? seo.seo_og_image;

  const ratingSummary = await client.query(api.comments.getRatingSummary, {
    targetId: service._id,
    targetType: 'service',
  });

  const serviceSchema = generateServiceSchema({
    aggregateRating: ratingSummary.count > 0
      ? { ratingValue: Number(ratingSummary.average.toFixed(2)), reviewCount: ratingSummary.count }
      : undefined,
    description: (service.metaDescription ?? service.excerpt) ?? seo.seo_description,
    image,
    name: service.metaTitle ?? service.title,
    price: service.price,
    providerName: site.site_name,
    providerUrl: baseUrl,
    url: serviceUrl,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Trang chủ', url: baseUrl },
    { name: 'Dịch vụ', url: `${baseUrl}/services` },
    { name: service.title, url: serviceUrl },
  ]);

  return (
    <>
      <JsonLd data={serviceSchema} />
      <JsonLd data={breadcrumbSchema} />
      {children}
    </>
  );
}
