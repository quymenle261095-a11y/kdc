import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { getConvexClient } from '@/lib/convex';
import { getContactSettings, getSEOSettings, getSiteSettings, getSocialSettings } from '@/lib/get-settings';
import { buildSeoMetadata } from '@/lib/seo/metadata';
import {
  buildModuleArticleSchema,
  buildModuleDetailFaqSchema,
  buildModuleProductSchema,
  buildModuleServiceSchema,
  toModuleDetailSeoData,
} from '@/lib/seo/module-detail';
import { buildDetailPath } from '@/lib/ia/route-mode';
import {
  JsonLd,
  generateBreadcrumbSchema,
} from '@/components/seo/JsonLd';

// Import các page components trung tâm
import ProductsPage from '../_components/products/ProductsPage';
import PostsPage from '../_components/posts/PostsPage';
import ServicesPage from '../_components/services/ServicesPage';
import CoursesPage from '../_components/courses/CoursesPage';
import ProjectsPage from '@/app/(site)/projects/page';
import ResourcesPage from '../_components/resources/ResourcesPage';

import ProductDetailPage from '../_components/details/ProductDetailPage';
import PostDetailPage from '../_components/details/PostDetailPage';
import ServiceDetailPage from '../_components/details/ServiceDetailPage';
import CourseDetailPage from '@/app/(site)/_components/courses/CourseDetailPage';
import ProjectDetailPage from '@/app/(site)/projects/[slug]/page';
import ResourceDetailPage from '@/app/(site)/_components/resources/ResourceDetailPage';

interface Props {
  params: Promise<{ slugs: string[] }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slugs } = await params;
  const decodedSlugs = slugs.map(s => decodeURIComponent(s));
  const client = getConvexClient();
  const [site, seo, contact, social, resolvedContext] = await Promise.all([
    getSiteSettings(),
    getSEOSettings(),
    getContactSettings(),
    getSocialSettings(),
    client.query(api.ia.resolveProductLandingContext, { slugs: decodedSlugs }),
  ]);

  const fallbackPath = `/${decodedSlugs.join('/')}`;

  if (!resolvedContext) {
    return buildSeoMetadata({
      contact,
      descriptionOverride: 'Nội dung không tồn tại hoặc đã bị xóa.',
      entityExists: false,
      pathname: fallbackPath,
      routeType: 'detail',
      seo,
      site,
      social,
      titleOverride: 'Không tìm thấy nội dung',
    });
  }

  // A. Xử lý Metadata Category
  if (resolvedContext.type === 'category') {
    const canonicalPath = `/${resolvedContext.categorySlug}`;
    return buildSeoMetadata({
      contact,
      descriptionOverride: resolvedContext.categoryDescription || seo.seo_description,
      pathname: canonicalPath,
      routeType: 'list',
      seo,
      site,
      social,
      titleOverride: resolvedContext.categoryName,
      useTitleTemplate: true,
    });
  }

  // B. Xử lý Metadata Product Type & Filters
  if (
    resolvedContext.type === 'productType' ||
    resolvedContext.type === 'productTypeCategory' ||
    resolvedContext.type === 'productTypePriceRange' ||
    resolvedContext.type === 'productTypeAttribute'
  ) {
    let title = '';
    let description = seo.seo_description;

    if (resolvedContext.type === 'productType') {
      title = resolvedContext.productTypeName;
      description = resolvedContext.productTypeDescription || description;
    } else if (resolvedContext.type === 'productTypeCategory') {
      title = `${resolvedContext.categoryName} - ${resolvedContext.productTypeSlug.toUpperCase()}`;
      description = resolvedContext.categoryDescription || description;
    } else if (resolvedContext.type === 'productTypePriceRange') {
      title = `${resolvedContext.priceRange.label} - ${resolvedContext.productTypeSlug.toUpperCase()}`;
    } else if (resolvedContext.type === 'productTypeAttribute') {
      title = resolvedContext.termName
        ? `${resolvedContext.termName} - ${resolvedContext.productTypeSlug.toUpperCase()}`
        : `${resolvedContext.groupName} - ${resolvedContext.productTypeSlug.toUpperCase()}`;
    }

    return buildSeoMetadata({
      contact,
      descriptionOverride: description,
      pathname: fallbackPath,
      routeType: 'list',
      seo,
      site,
      social,
      titleOverride: title,
      useTitleTemplate: true,
    });
  }

  // C. Xử lý Metadata Detail
  if (resolvedContext.type === 'detail') {
    const canonicalPath = buildDetailPath({
      categorySlug: resolvedContext.categorySlug,
      mode: 'unified',
      moduleKey: resolvedContext.moduleKey,
      recordSlug: resolvedContext.recordSlug,
    });

    if (resolvedContext.moduleKey === 'products') {
      const product = await client.query(api.products.getById, { id: resolvedContext.recordId as Id<'products'> });
      if (!product) {
        return buildSeoMetadata({
          contact,
          descriptionOverride: 'Sản phẩm không tồn tại hoặc đã bị xóa.',
          entityExists: false,
          pathname: canonicalPath,
          routeType: 'detail',
          seo,
          site,
          social,
          titleOverride: 'Không tìm thấy sản phẩm',
        });
      }

      return buildSeoMetadata({
        contact,
        descriptionOverride: product.metaDescription ?? product.description ?? seo.seo_description,
        entity: toModuleDetailSeoData(product),
        entityExists: true,
        pathname: canonicalPath,
        routeType: 'detail',
        seo,
        site,
        social,
        titleOverride: product.metaTitle ?? product.name,
      });
    }

    if (resolvedContext.moduleKey === 'services') {
      const service = await client.query(api.services.getById, { id: resolvedContext.recordId as Id<'services'> });
      if (!service) {
        return buildSeoMetadata({
          contact,
          descriptionOverride: 'Dịch vụ không tồn tại hoặc đã bị xóa.',
          entityExists: false,
          pathname: canonicalPath,
          routeType: 'detail',
          seo,
          site,
          social,
          titleOverride: 'Không tìm thấy dịch vụ',
        });
      }

      return buildSeoMetadata({
        contact,
        entity: toModuleDetailSeoData(service),
        entityExists: true,
        pathname: canonicalPath,
        routeType: 'detail',
        seo,
        site,
        social,
        titleOverride: service.metaTitle ?? service.title,
      });
    }

    if (resolvedContext.moduleKey === 'courses') {
      const course = await client.query(api.courses.getById, { id: resolvedContext.recordId as Id<'courses'> });
      if (!course) {
        return buildSeoMetadata({
          contact,
          descriptionOverride: 'Khóa học không tồn tại hoặc đã bị xóa.',
          entityExists: false,
          pathname: canonicalPath,
          routeType: 'detail',
          seo,
          site,
          social,
          titleOverride: 'Không tìm thấy khóa học',
        });
      }

      return buildSeoMetadata({
        contact,
        entity: toModuleDetailSeoData(course),
        entityExists: true,
        pathname: canonicalPath,
        routeType: 'detail',
        seo,
        site,
        social,
        titleOverride: course.metaTitle ?? course.title,
      });
    }

    if (resolvedContext.moduleKey === 'resources') {
      const resource = await client.query(api.resources.getById, { id: resolvedContext.recordId as Id<'resources'> });
      if (!resource) {
        return buildSeoMetadata({
          contact,
          descriptionOverride: 'Tài nguyên không tồn tại hoặc đã bị xóa.',
          entityExists: false,
          pathname: canonicalPath,
          routeType: 'detail',
          seo,
          site,
          social,
          titleOverride: 'Không tìm thấy tài nguyên',
        });
      }
      return buildSeoMetadata({
        contact,
        descriptionOverride: (resource.metaDescription ?? resource.excerpt) ?? seo.seo_description,
        entity: toModuleDetailSeoData(resource),
        pathname: canonicalPath,
        routeType: 'detail',
        seo,
        site,
        social,
        titleOverride: resource.metaTitle ?? resource.title,
      });
    }

    if (resolvedContext.moduleKey === 'projects') {
      const project = await client.query(api.projects.getById, { id: resolvedContext.recordId as Id<'projects'> });
      if (!project) {
        return buildSeoMetadata({
          contact,
          descriptionOverride: 'Dự án không tồn tại hoặc đã bị xóa.',
          entityExists: false,
          pathname: canonicalPath,
          routeType: 'detail',
          seo,
          site,
          social,
          titleOverride: 'Không tìm thấy dự án',
        });
      }

      return buildSeoMetadata({
        contact,
        entity: toModuleDetailSeoData(project),
        entityExists: true,
        pathname: canonicalPath,
        routeType: 'detail',
        seo,
        site,
        social,
        titleOverride: project.metaTitle ?? project.title,
      });
    }

    const post = await client.query(api.posts.getById, { id: resolvedContext.recordId as Id<'posts'> });
    if (!post) {
      return buildSeoMetadata({
        contact,
        descriptionOverride: 'Bài viết không tồn tại hoặc đã bị xóa.',
        entityExists: false,
        pathname: canonicalPath,
        routeType: 'detail',
        seo,
        site,
        social,
        titleOverride: 'Không tìm thấy bài viết',
      });
    }

    return buildSeoMetadata({
      contact,
      entity: toModuleDetailSeoData(post),
      entityExists: true,
      openGraphType: 'article',
      pathname: canonicalPath,
      routeType: 'detail',
      seo,
      site,
      social,
      titleOverride: post.metaTitle ?? post.title,
    });
  }

  return {};
}

export default async function UnifiedCatchAllPage({ params }: Props) {
  const { slugs } = await params;
  const decodedSlugs = slugs.map(s => decodeURIComponent(s));
  const client = getConvexClient();
  const [site, seo, resolvedContext] = await Promise.all([
    getSiteSettings(),
    getSEOSettings(),
    client.query(api.ia.resolveProductLandingContext, { slugs: decodedSlugs }),
  ]);

  if (!resolvedContext) {
    notFound();
  }

  const baseUrl = (site.site_url || process.env.NEXT_PUBLIC_SITE_URL) ?? '';

  // 1. RENDER CATEGORY LIST
  if (resolvedContext.type === 'category') {
    if (resolvedContext.moduleKey === 'products') {
      return <ProductsPage />;
    }
    if (resolvedContext.moduleKey === 'services') {
      return <ServicesPage />;
    }
    if (resolvedContext.moduleKey === 'posts') {
      return <PostsPage />;
    }
    if (resolvedContext.moduleKey === 'courses') {
      return <CoursesPage />;
    }
    if (resolvedContext.moduleKey === 'resources') {
      return <ResourcesPage />;
    }
    if (resolvedContext.moduleKey === 'projects') {
      return <ProjectsPage />;
    }
    notFound();
  }

  // 2. RENDER PRODUCT TYPE & FILTER LANDINGS
  if (resolvedContext.type === 'productType') {
    return <ProductsPage productTypeId={resolvedContext.productTypeId} />;
  }

  if (resolvedContext.type === 'productTypeCategory') {
    return (
      <ProductsPage 
        productTypeId={resolvedContext.productTypeId} 
        categoryId={resolvedContext.categoryId} 
      />
    );
  }

  if (resolvedContext.type === 'productTypePriceRange') {
    return (
      <ProductsPage 
        productTypeId={resolvedContext.productTypeId} 
        priceRangeFilter={resolvedContext.priceRange} 
      />
    );
  }

  if (resolvedContext.type === 'productTypeAttribute') {
    return (
      <ProductsPage 
        productTypeId={resolvedContext.productTypeId} 
        attributeFilter={{ 
          groupId: resolvedContext.groupId, 
          termId: resolvedContext.termId, 
          termSlug: resolvedContext.termSlug 
        }} 
      />
    );
  }

  // 3. RENDER DETAIL PAGE
  if (resolvedContext.type === 'detail') {
    const canonicalPath = buildDetailPath({
      categorySlug: resolvedContext.categorySlug,
      mode: 'unified',
      moduleKey: resolvedContext.moduleKey,
      recordSlug: resolvedContext.recordSlug,
    });

    if (`/${decodedSlugs.join('/')}` !== canonicalPath) {
      permanentRedirect(canonicalPath);
    }

    if (resolvedContext.moduleKey === 'products') {
      const [product, category, enabledFields] = await Promise.all([
        client.query(api.products.getById, { id: resolvedContext.recordId as Id<'products'> }),
        client.query(api.productCategories.getById, { id: resolvedContext.categoryId as Id<'productCategories'> }),
        client.query(api.admin.modules.listEnabledModuleFields, { moduleKey: 'products' }),
      ]);
      if (!product) {notFound();}

      const productUrl = `${baseUrl}${canonicalPath}`;
      const image = (product.image ?? (product.images && product.images[0])) ?? seo.seo_og_image;
      const productImages = product.images && product.images.length > 0
        ? product.images
        : (product.image ? [product.image] : undefined);
      const ratingSummary = await client.query(api.comments.getRatingSummary, {
        targetId: product._id,
        targetType: 'product',
      });

      const showStock = enabledFields ? enabledFields.some((field) => field.fieldKey === 'stock') : true;

      const productSchema = buildModuleProductSchema({
        aggregateRating: ratingSummary.count > 0
          ? { ratingValue: Number(ratingSummary.average.toFixed(2)), reviewCount: ratingSummary.count }
          : undefined,
        brand: site.site_name,
        entity: {
          ...product,
          image,
          images: productImages,
        },
        fallbackDescription: seo.seo_description,
        image,
        inStock: showStock ? product.stock > 0 : true,
        url: productUrl,
      });
      const faqSchema = buildModuleDetailFaqSchema(product);

      const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Trang chủ', url: baseUrl },
        { name: category?.name ?? 'Sản phẩm', url: `${baseUrl}/${resolvedContext.categorySlug}` },
        { name: product.name, url: productUrl },
      ]);

      return (
        <>
          <JsonLd data={productSchema} />
          {faqSchema && <JsonLd data={faqSchema} />}
          <JsonLd data={breadcrumbSchema} />
          <ProductDetailPage params={Promise.resolve({ slug: resolvedContext.recordSlug })} initialProduct={product} />
        </>
      );
    }

    if (resolvedContext.moduleKey === 'services') {
      const [service, category] = await Promise.all([
        client.query(api.services.getById, { id: resolvedContext.recordId as Id<'services'> }),
        client.query(api.serviceCategories.getById, { id: resolvedContext.categoryId as Id<'serviceCategories'> }),
      ]);
      if (!service) {notFound();}

      const serviceUrl = `${baseUrl}${canonicalPath}`;
      const image = service.thumbnail ?? seo.seo_og_image;
      const ratingSummary = await client.query(api.comments.getRatingSummary, {
        targetId: service._id,
        targetType: 'service',
      });

      const serviceSchema = buildModuleServiceSchema({
        aggregateRating: ratingSummary.count > 0
          ? { ratingValue: Number(ratingSummary.average.toFixed(2)), reviewCount: ratingSummary.count }
          : undefined,
        entity: service,
        fallbackDescription: seo.seo_description,
        image,
        providerName: site.site_name,
        providerUrl: baseUrl,
        url: serviceUrl,
      });
      const faqSchema = buildModuleDetailFaqSchema(service);

      const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Trang chủ', url: baseUrl },
        { name: category?.name ?? 'Dịch vụ', url: `${baseUrl}/${resolvedContext.categorySlug}` },
        { name: service.title, url: serviceUrl },
      ]);

      return (
        <>
          <JsonLd data={serviceSchema} />
          {faqSchema && <JsonLd data={faqSchema} />}
          <JsonLd data={breadcrumbSchema} />
          <ServiceDetailPage params={Promise.resolve({ slug: resolvedContext.recordSlug })} initialService={service} />
        </>
      );
    }

    if (resolvedContext.moduleKey === 'courses') {
      const [course, category] = await Promise.all([
        client.query(api.courses.getById, { id: resolvedContext.recordId as Id<'courses'> }),
        client.query(api.courseCategories.getById, { id: resolvedContext.categoryId as Id<'courseCategories'> }),
      ]);
      if (!course) {notFound();}

      const courseUrl = `${baseUrl}${canonicalPath}`;
      const courseSchema = buildModuleArticleSchema({
        entity: course,
        fallbackDescription: seo.seo_description,
        image: course.thumbnail ?? seo.seo_og_image,
        siteName: site.site_name,
        title: course.title,
        url: courseUrl,
      });
      const faqSchema = buildModuleDetailFaqSchema(course);
      const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Trang chủ', url: baseUrl },
        { name: category?.name ?? 'Khóa học', url: `${baseUrl}/${resolvedContext.categorySlug}` },
        { name: course.title, url: courseUrl },
      ]);

      return (
        <>
          <JsonLd data={courseSchema} />
          {faqSchema && <JsonLd data={faqSchema} />}
          <JsonLd data={breadcrumbSchema} />
          <CourseDetailPage params={Promise.resolve({ slug: resolvedContext.recordSlug })} initialCourse={course} />
        </>
      );
    }

    if (resolvedContext.moduleKey === 'resources') {
      const [resource, category] = await Promise.all([
        client.query(api.resources.getById, { id: resolvedContext.recordId as Id<'resources'> }),
        client.query(api.resourceCategories.getById, { id: resolvedContext.categoryId as Id<'resourceCategories'> }),
      ]);
      if (!resource) {notFound();}

      const resourceUrl = `${baseUrl}${canonicalPath}`;
      const resourceSchema = buildModuleArticleSchema({
        entity: resource,
        fallbackDescription: seo.seo_description,
        image: resource.thumbnail ?? seo.seo_og_image,
        siteName: site.site_name,
        title: resource.title,
        url: resourceUrl,
      });
      const faqSchema = buildModuleDetailFaqSchema(resource);
      const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Trang chủ', url: baseUrl },
        { name: category?.name ?? 'Tài nguyên', url: `${baseUrl}/${resolvedContext.categorySlug}` },
        { name: resource.title, url: resourceUrl },
      ]);

      return (
        <>
          <JsonLd data={resourceSchema} />
          {faqSchema && <JsonLd data={faqSchema} />}
          <JsonLd data={breadcrumbSchema} />
          <ResourceDetailPage params={Promise.resolve({ slug: resolvedContext.recordSlug })} initialResource={resource} />
        </>
      );
    }

    if (resolvedContext.moduleKey === 'projects') {
      const [project, category] = await Promise.all([
        client.query(api.projects.getById, { id: resolvedContext.recordId as Id<'projects'> }),
        client.query(api.projectCategories.getById, { id: resolvedContext.categoryId as Id<'projectCategories'> }),
      ]);
      if (!project) {notFound();}

      const projectUrl = `${baseUrl}${canonicalPath}`;
      const projectSchema = buildModuleArticleSchema({
        entity: project,
        fallbackDescription: seo.seo_description,
        image: project.thumbnail ?? seo.seo_og_image,
        siteName: site.site_name,
        title: project.title,
        url: projectUrl,
      });
      const faqSchema = buildModuleDetailFaqSchema(project);
      const breadcrumbSchema = generateBreadcrumbSchema([
        { name: 'Trang chủ', url: baseUrl },
        { name: category?.name ?? 'Dự án', url: `${baseUrl}/${resolvedContext.categorySlug}` },
        { name: project.title, url: projectUrl },
      ]);

      return (
        <>
          <JsonLd data={projectSchema} />
          {faqSchema && <JsonLd data={faqSchema} />}
          <JsonLd data={breadcrumbSchema} />
          <ProjectDetailPage params={Promise.resolve({ slug: resolvedContext.recordSlug })} initialProject={project} />
        </>
      );
    }

    // Default posts
    const post = await client.query(api.posts.getById, { id: resolvedContext.recordId as Id<'posts'> });
    if (!post) {notFound();}

    const category = await client.query(api.postCategories.getById, { id: post.categoryId });
    const postUrl = `${baseUrl}${canonicalPath}`;
    const image = post.thumbnail ?? seo.seo_og_image;
    const articleSchema = buildModuleArticleSchema({
      entity: post,
      fallbackDescription: seo.seo_description,
      image,
      siteName: site.site_name,
      title: post.metaTitle ?? post.title,
      url: postUrl,
    });
    const faqSchema = buildModuleDetailFaqSchema(post);

    const breadcrumbSchema = generateBreadcrumbSchema([
      { name: 'Trang chủ', url: baseUrl },
      { name: category?.name ?? 'Bài viết', url: `${baseUrl}/${resolvedContext.categorySlug}` },
      { name: post.title, url: postUrl },
    ]);

    return (
      <>
        <JsonLd data={articleSchema} />
        {faqSchema && <JsonLd data={faqSchema} />}
        <JsonLd data={breadcrumbSchema} />
        <PostDetailPage params={Promise.resolve({ slug: resolvedContext.recordSlug })} initialPost={post} />
      </>
    );
  }

  notFound();
}
