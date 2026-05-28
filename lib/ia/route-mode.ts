export type RouteMode = 'unified' | 'namespace';

export const normalizeRouteMode = (value?: unknown): RouteMode => (
  value === 'namespace' ? 'namespace' : 'unified'
);

export const buildModuleListPath = (moduleKey: 'posts' | 'products' | 'services'): string => `/${moduleKey}`;

export const buildCategoryPath = (params: {
  mode: RouteMode;
  moduleKey: 'posts' | 'products' | 'services';
  categorySlug: string;
}): string => {
  return `/${params.categorySlug}`;
};

export const buildDetailPath = (params: {
  mode: RouteMode;
  moduleKey: 'posts' | 'products' | 'services';
  recordSlug: string;
  categorySlug?: string | null;
}): string => {
  if (params.categorySlug) {
    return `/${params.categorySlug}/${params.recordSlug}`;
  }
  return `/${params.moduleKey}/${params.recordSlug}`;
};

export const buildCategorySearchParamKey = (moduleKey: 'posts' | 'products' | 'services'): string => (
  moduleKey === 'posts' ? 'catpost' : 'category'
);
