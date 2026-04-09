import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getConvexClient } from '@/lib/convex';
import { api } from '@/convex/_generated/api';
import { getContactSettings, getSEOSettings, getSiteSettings, getSocialSettings } from '@/lib/get-settings';
import { JsonLd, generateArticleSchema, generateBreadcrumbSchema } from '@/components/seo/JsonLd';
import { buildSeoMetadata } from '@/lib/seo/metadata';

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const client = getConvexClient();

  const postsModule = await client.query(api.admin.modules.getModuleByKey, { key: 'posts' });
  if (postsModule?.enabled === false) {
    const [site, seo, contact, social] = await Promise.all([
      getSiteSettings(),
      getSEOSettings(),
      getContactSettings(),
      getSocialSettings(),
    ]);
    return buildSeoMetadata({
      contact,
      descriptionOverride: 'Trang bài viết hiện không khả dụng.',
      moduleEnabled: false,
      pathname: `/posts/${slug}`,
      routeType: 'detail',
      seo,
      site,
      social,
      titleOverride: 'Không tìm thấy bài viết',
    });
  }
  
  const [post, site, seo, contact, social] = await Promise.all([
    client.query(api.posts.getBySlug, { slug }),
    getSiteSettings(),
    getSEOSettings(),
    getContactSettings(),
    getSocialSettings(),
  ]);

  if (!post) {
    return buildSeoMetadata({
      contact,
      descriptionOverride: 'Bài viết này không tồn tại hoặc đã bị xóa.',
      entityExists: false,
      pathname: `/posts/${slug}`,
      routeType: 'detail',
      seo,
      site,
      social,
      titleOverride: 'Không tìm thấy bài viết',
    });
  }

  return buildSeoMetadata({
    contact,
    entity: {
      content: post.content,
      excerpt: post.excerpt,
      metaDescription: post.metaDescription,
      metaTitle: post.metaTitle,
      thumbnail: post.thumbnail,
      title: post.title,
    },
    entityExists: true,
    openGraphType: 'article',
    pathname: `/posts/${post.slug}`,
    routeType: 'detail',
    seo,
    site,
    social,
  });
}

export default async function PostLayout({ params, children }: Props) {
  const { slug } = await params;
  const client = getConvexClient();
  const SCHEDULE_SKEW_MS = 30_000;

  const postsModule = await client.query(api.admin.modules.getModuleByKey, { key: 'posts' });
  if (postsModule?.enabled === false) {
    notFound();
  }
  
  const [post, site, seo] = await Promise.all([
    client.query(api.posts.getBySlug, { slug }),
    getSiteSettings(),
    getSEOSettings(),
  ]);

  if (!post) {return children;}
  if (post.status !== 'Published' || (post.publishedAt && post.publishedAt > Date.now() + SCHEDULE_SKEW_MS)) {
    notFound();
  }

  const baseUrl = (site.site_url || process.env.NEXT_PUBLIC_SITE_URL) ?? '';
  const postUrl = `${baseUrl}/posts/${post.slug}`;
  const image = post.thumbnail ?? seo.seo_og_image;

  const articleSchema = generateArticleSchema({
    description: (post.metaDescription ?? post.excerpt) ?? seo.seo_description,
    image,
    publishedAt: post.publishedAt,
    siteName: site.site_name,
    title: post.metaTitle ?? post.title,
    authorName: post.authorName,
    url: postUrl,
  });

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Trang chủ', url: baseUrl },
    { name: 'Bài viết', url: `${baseUrl}/posts` },
    { name: post.title, url: postUrl },
  ]);

  return (
    <>
      <JsonLd data={articleSchema} />
      <JsonLd data={breadcrumbSchema} />
      {children}
    </>
  );
}
