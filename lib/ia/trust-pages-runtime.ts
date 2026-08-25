import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex';
import type { TrustPageKey } from './trust-pages';

export type TrustPageDoc = Exclude<FunctionReturnType<typeof api.pages.getByKeyPublic>, null>;

export const getPageByKey = async (key: TrustPageKey) => {
  const client = getConvexClient();
  return client.query(api.pages.getByKeyPublic, { key });
};

export const isPageVisible = (page: TrustPageDoc | null): page is TrustPageDoc =>
  Boolean(page && page.status === 'Published' && (!page.publishedAt || page.publishedAt <= Date.now()));
