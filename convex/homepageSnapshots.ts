import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { slugify, getMimeFromExtension } from '../lib/image/uploadNaming';
import type { Doc, Id } from './_generated/dataModel';
import {
  HOMEPAGE_SNAPSHOT_VERSION,
  type HomepageSnapshotImportReport,
  type HomepageSnapshotPayload,
  type SnapshotDependencyCapture,
  type SnapshotStaticCategory,
  type SnapshotStaticItem,
  type SnapshotSystemStylePayload,
} from '../lib/homepage-snapshot/types';

const REPLACE_ALL_MODE = 'replace_all';

const getExtensionFromUrl = (value?: string) => {
  if (!value) {return 'bin';}
  const clean = value.split('?')[0]?.split('#')[0] ?? value;
  const last = clean.split('/').pop() ?? '';
  const ext = last.includes('.') ? last.split('.').pop() : undefined;
  return ext?.toLowerCase() ?? 'bin';
};

const collectUrls = (value: unknown, acc: Set<string>) => {
  if (typeof value === 'string' && /^https?:\/\//.test(value)) {
    acc.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectUrls(item, acc));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach((item) => collectUrls(item, acc));
  }
};

const toStaticPost = (post: Doc<'posts'>): SnapshotStaticItem => ({
  sourceId: post._id as string,
  sourceType: 'post',
  title: `${post.title} [tĩnh]`,
  image: post.thumbnail,
  slug: post.slug,
  subtitle: post.excerpt,
});

const toStaticProduct = (product: Doc<'products'>): SnapshotStaticItem => ({
  sourceId: product._id as string,
  sourceType: 'product',
  title: `${product.name} [tĩnh]`,
  image: product.image || product.images?.[0],
  slug: product.slug,
  subtitle: product.description,
  price: product.salePrice ?? product.price,
});

const toStaticService = (service: Doc<'services'>): SnapshotStaticItem => ({
  sourceId: service._id as string,
  sourceType: 'service',
  title: `${service.title} [tĩnh]`,
  image: service.thumbnail,
  slug: service.slug,
  subtitle: service.excerpt,
  price: service.price,
});

const toStaticCategory = (category: Doc<'productCategories'>): SnapshotStaticCategory => ({
  sourceId: category._id as string,
  title: `${category.name} [tĩnh]`,
  image: category.image,
  slug: category.slug,
  description: category.description,
});

const buildDependencyCapture = async (ctx: any, components: Array<Doc<'homeComponents'>>): Promise<SnapshotDependencyCapture> => {
  const postIds = new Set<string>();
  const productIds = new Set<string>();
  const serviceIds = new Set<string>();
  const productCategoryIds = new Set<string>();

  components.forEach((component) => {
    const config = (component.config ?? {}) as Record<string, unknown>;
    const type = component.type;

    if (type === 'Blog') {
      ((config.selectedPostIds as string[] | undefined) ?? []).forEach((id) => postIds.add(id));
    }
    if (type === 'ProductGrid') {
      ((config.selectedProductIds as string[] | undefined) ?? []).forEach((id) => productIds.add(id));
    }
    if (type === 'ProductList') {
      ((config.selectedProductIds as string[] | undefined) ?? []).forEach((id) => productIds.add(id));
      ((config.selectedServiceIds as string[] | undefined) ?? []).forEach((id) => serviceIds.add(id));
      ((config.selectedPostIds as string[] | undefined) ?? []).forEach((id) => postIds.add(id));
    }
    if (type === 'ServiceList') {
      ((config.selectedServiceIds as string[] | undefined) ?? []).forEach((id) => serviceIds.add(id));
    }
    if (type === 'ProductCategories') {
      ((config.categories as Array<{ categoryId?: string }> | undefined) ?? []).forEach((item) => {
        if (item.categoryId) {productCategoryIds.add(item.categoryId);}
      });
    }
    if (type === 'CategoryProducts') {
      ((config.sections as Array<{ categoryId?: string }> | undefined) ?? []).forEach((item) => {
        if (item.categoryId) {productCategoryIds.add(item.categoryId);}
      });
    }
    if (type === 'HomepageCategoryHero') {
      ((config.categories as Array<{ categoryId?: string; groups?: Array<{ items?: Array<{ categoryId?: string; productId?: string }> }> }> | undefined) ?? []).forEach((item) => {
        if (item.categoryId) {productCategoryIds.add(item.categoryId);}
        (item.groups ?? []).forEach((group) => (group.items ?? []).forEach((link) => {
          if (link.categoryId) {productCategoryIds.add(link.categoryId);}
          if (link.productId) {productIds.add(link.productId);}
        }));
      });
    }
  });

  const [posts, products, services, productCategories] = await Promise.all([
    Promise.all(Array.from(postIds).map((id) => ctx.db.get(id as Id<'posts'>))),
    Promise.all(Array.from(productIds).map((id) => ctx.db.get(id as Id<'products'>))),
    Promise.all(Array.from(serviceIds).map((id) => ctx.db.get(id as Id<'services'>))),
    Promise.all(Array.from(productCategoryIds).map((id) => ctx.db.get(id as Id<'productCategories'>))),
  ]);

  return {
    posts: posts.filter(Boolean).map((item) => toStaticPost(item as Doc<'posts'>)),
    products: products.filter(Boolean).map((item) => toStaticProduct(item as Doc<'products'>)),
    services: services.filter(Boolean).map((item) => toStaticService(item as Doc<'services'>)),
    productCategories: productCategories.filter(Boolean).map((item) => toStaticCategory(item as Doc<'productCategories'>)),
  };
};

const rewriteConfigWithFallback = (
  type: string,
  config: Record<string, unknown>,
  dependencies: SnapshotDependencyCapture,
) => {
  const next = { ...config } as Record<string, unknown>;

  if (type === 'Blog') {
    next.fallbackPosts = dependencies.posts;
  }
  if (type === 'ProductGrid') {
    next.fallbackProducts = dependencies.products;
  }
  if (type === 'ProductList') {
    next.fallbackProducts = dependencies.products;
    next.fallbackServices = dependencies.services;
    next.fallbackPosts = dependencies.posts;
  }
  if (type === 'ServiceList') {
    next.fallbackServices = dependencies.services;
  }
  if (type === 'ProductCategories') {
    next.fallbackCategories = dependencies.productCategories;
  }
  if (type === 'CategoryProducts') {
    next.fallbackCategories = dependencies.productCategories;
    next.fallbackProducts = dependencies.products;
  }
  if (type === 'HomepageCategoryHero') {
    next.fallbackCategories = dependencies.productCategories;
    next.fallbackProducts = dependencies.products;
  }

  return next;
};

const buildSystemStyle = async (ctx: any): Promise<SnapshotSystemStylePayload> => {
  const settingByKey = new Map((await ctx.db.query('settings').take(1000)).map((item: any) => [item.key, item.value]));
  const hiddenTypesValue = settingByKey.get('create_hidden_types');
  return {
    hiddenTypes: Array.isArray(hiddenTypesValue) ? hiddenTypesValue.filter((item): item is string => typeof item === 'string') : [],
    typeColorOverrides: (settingByKey.get('type_color_overrides') as Record<string, unknown>) ?? {},
    typeFontOverrides: (settingByKey.get('type_font_overrides') as Record<string, unknown>) ?? {},
    globalFontOverride: (settingByKey.get('global_font_override') as { enabled: boolean; fontKey: string }) ?? {
      enabled: false,
      fontKey: 'system-default',
    },
  };
};

export const captureHomepageSnapshot = query({
  args: {
    label: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<HomepageSnapshotPayload> => {
    const components = [...await ctx.db.query('homeComponents').take(5000)].sort((a, b) => a.order - b.order || a._creationTime - b._creationTime);
    const dependencies = await buildDependencyCapture(ctx, components);
    const systemStyle = await buildSystemStyle(ctx);
    const mediaIndexMap = new Map<string, { logicalPath: string; originalUrl: string; mimeType: string; sourceType: string; usedBy: string[] }>();

    const componentPayloads = components.map((component) => {
      const componentKey = `homeComponent:${component.type}:${slugify(component.title)}:${component.order}`;
      const urls = new Set<string>();
      collectUrls(component.config, urls);
      const mediaRefs = Array.from(urls).map((url, index) => {
        const ext = getExtensionFromUrl(url);
        const logicalPath = `snapshot-bundles/homepage/${slugify(component.type)}-${slugify(component.title)}-${component.order}-${index + 1}.${ext}`;
        const existing = mediaIndexMap.get(logicalPath);
        if (existing) {
          existing.usedBy.push(componentKey);
        } else {
          mediaIndexMap.set(logicalPath, {
            logicalPath,
            originalUrl: url,
            mimeType: getMimeFromExtension(ext) ?? 'application/octet-stream',
            sourceType: component.type,
            usedBy: [componentKey],
          });
        }
        return logicalPath;
      });

      return {
        componentKey,
        type: component.type,
        title: component.title,
        order: component.order,
        active: component.active,
        config: rewriteConfigWithFallback(component.type, (component.config ?? {}) as Record<string, unknown>, dependencies),
        mediaRefs,
        fallbackUsed: ['Blog', 'ProductList', 'ProductGrid', 'ServiceList', 'ProductCategories', 'CategoryProducts', 'HomepageCategoryHero'].includes(component.type),
      };
    });

    return {
      manifest: {
        snapshotVersion: HOMEPAGE_SNAPSHOT_VERSION,
        exportedAt: new Date().toISOString(),
        sourceCoreVersion: 'system-vietadmin-nextjs',
        snapshotLabel: args.label?.trim() || `Homepage Snapshot ${new Date().toISOString().slice(0, 10)}`,
        componentCount: componentPayloads.length,
        capabilities: {
          supportsZip: true,
          supportsStaticFallback: true,
          supportsAppendImport: true,
        },
      },
      homepage: {
        components: componentPayloads,
        componentOrder: componentPayloads.map((item) => item.componentKey),
        dependencies,
        systemStyle,
      },
      index: {
        mediaIndex: Array.from(mediaIndexMap.values()),
      },
    };
  },
  returns: v.any(),
});

export const saveHomepageSnapshot = mutation({
  args: {
    label: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('homeComponentSnapshots', {
      createdAt: Date.now(),
      label: args.label,
      payload: args.payload,
      version: HOMEPAGE_SNAPSHOT_VERSION,
    });
  },
  returns: v.id('homeComponentSnapshots'),
});

export const listHomepageSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query('homeComponentSnapshots').withIndex('by_createdAt').order('desc').take(100);
    return rows.map((row) => {
      const payload = row.payload as HomepageSnapshotPayload;
      return {
        _id: row._id,
        createdAt: row.createdAt,
        label: row.label,
        version: row.version,
        componentCount: payload?.homepage?.components?.length ?? 0,
      };
    });
  },
  returns: v.array(v.object({
    _id: v.id('homeComponentSnapshots'),
    createdAt: v.number(),
    label: v.string(),
    version: v.string(),
    componentCount: v.number(),
  })),
});

export const getHomepageSnapshotById = query({
  args: { snapshotId: v.id('homeComponentSnapshots') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.snapshotId);
  },
  returns: v.union(v.object({
    _id: v.id('homeComponentSnapshots'),
    _creationTime: v.number(),
    createdAt: v.number(),
    label: v.string(),
    payload: v.any(),
    version: v.string(),
  }), v.null()),
});

export const removeHomepageSnapshot = mutation({
  args: { snapshotId: v.id('homeComponentSnapshots') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.snapshotId);
    return null;
  },
  returns: v.null(),
});

const buildReport = (payload: HomepageSnapshotPayload): HomepageSnapshotImportReport => {
  const errors: HomepageSnapshotImportReport['errors'] = [];
  const warnings: HomepageSnapshotImportReport['warnings'] = [];

  if (!payload?.manifest || payload.manifest.snapshotVersion !== HOMEPAGE_SNAPSHOT_VERSION) {
    errors.push({ code: 'SNAPSHOT_VERSION_UNSUPPORTED', severity: 'blocking', message: 'Snapshot version không tương thích', file: 'manifest.json' });
  }

  payload.homepage.components.forEach((component) => {
    if (!component.type || !component.title) {
      errors.push({
        code: 'SNAPSHOT_COMPONENT_INVALID',
        severity: 'blocking',
        message: 'Component thiếu type hoặc title',
        componentKey: component.componentKey,
        file: 'homepage/components.json',
      });
    }
    if (component.fallbackUsed) {
      const hasFallback =
        Boolean((component.config as any)?.fallbackPosts?.length) ||
        Boolean((component.config as any)?.fallbackProducts?.length) ||
        Boolean((component.config as any)?.fallbackServices?.length) ||
        Boolean((component.config as any)?.fallbackCategories?.length);
      if (!hasFallback) {
        warnings.push({
          code: 'SNAPSHOT_FALLBACK_EMPTY',
          severity: 'warning',
          message: 'Component có dependency động nhưng snapshot fallback rỗng',
          componentKey: component.componentKey,
          file: 'homepage/components.json',
        });
      }
    }
  });

  return {
    summary: {
      blocking: errors.length,
      warnings: warnings.length,
    },
    errors,
    warnings,
  };
};

export const preflightHomepageSnapshot = mutation({
  args: {
    payload: v.any(),
  },
  handler: async (_ctx, args) => {
    return buildReport(args.payload as HomepageSnapshotPayload);
  },
  returns: v.any(),
});

const replaceMediaUrls = (value: unknown, uploadedMediaMap: Record<string, { url: string }>): unknown => {
  if (typeof value === 'string') {
    return uploadedMediaMap[value]?.url ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceMediaUrls(item, uploadedMediaMap));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, replaceMediaUrls(item, uploadedMediaMap)]),
    );
  }
  return value;
};

export const importHomepageSnapshot = mutation({
  args: {
    payload: v.any(),
    mode: v.optional(v.union(v.literal('append'), v.literal('replace_all'))),
    uploadedMediaMap: v.optional(v.record(v.string(), v.object({
      url: v.string(),
      storageId: v.optional(v.union(v.string(), v.null())),
    }))),
  },
  handler: async (ctx, args) => {
    const payload = args.payload as HomepageSnapshotPayload;
    const report = buildReport(payload);
    if (report.summary.blocking > 0) {
      return { applied: false, created: 0, report };
    }

    const uploadedMediaMap = args.uploadedMediaMap ?? {};
    const existing = await ctx.db.query('homeComponents').take(5000);
    if (args.mode === REPLACE_ALL_MODE) {
      for (const item of existing) {
        await ctx.db.delete(item._id);
      }
    }
    const maxOrder = existing.reduce((acc, item) => Math.max(acc, item.order), -1);
    const baseOrder = args.mode === REPLACE_ALL_MODE ? -1 : maxOrder;

    let created = 0;
    for (const [index, component] of payload.homepage.components.entries()) {
      await ctx.db.insert('homeComponents', {
        active: component.active,
        config: replaceMediaUrls(component.config, uploadedMediaMap),
        order: baseOrder + index + 1,
        title: component.title,
        type: component.type,
      });
      created += 1;
    }

    const style = payload.homepage.systemStyle;
    const upsertSetting = async (key: string, value: unknown) => {
      const existingSetting = await ctx.db.query('settings').withIndex('by_key', (q) => q.eq('key', key)).unique();
      if (existingSetting) {
        await ctx.db.patch(existingSetting._id, { group: 'home_components', value });
        return;
      }
      await ctx.db.insert('settings', { group: 'home_components', key, value });
    };

    await Promise.all([
      upsertSetting('create_hidden_types', style.hiddenTypes),
      upsertSetting('type_color_overrides', style.typeColorOverrides),
      upsertSetting('type_font_overrides', style.typeFontOverrides),
      upsertSetting('global_font_override', style.globalFontOverride),
    ]);

    return {
      applied: true,
      created,
      report,
    };
  },
  returns: v.any(),
});

export const applyHomepageSnapshot = mutation({
  args: {
    snapshotId: v.id('homeComponentSnapshots'),
    mode: v.optional(v.union(v.literal('replace_all'))),
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db.get(args.snapshotId);
    if (!snapshot) {
      throw new Error('Snapshot không tồn tại');
    }
    const payload = snapshot.payload as HomepageSnapshotPayload;
    const report = buildReport(payload);
    if (report.summary.blocking > 0) {
      return { applied: false, created: 0, report };
    }

    const existing = await ctx.db.query('homeComponents').take(5000);
    for (const item of existing) {
      await ctx.db.delete(item._id);
    }

    let created = 0;
    for (const [index, component] of payload.homepage.components.entries()) {
      await ctx.db.insert('homeComponents', {
        active: component.active,
        config: component.config,
        order: index,
        title: component.title,
        type: component.type,
      });
      created += 1;
    }

    return { applied: true, created, report };
  },
  returns: v.any(),
});
