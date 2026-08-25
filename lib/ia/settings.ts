import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex';
import { normalizeRouteMode, type RouteMode } from './route-mode';

export const IA_SETTINGS_KEYS = [
  'ia_route_mode',
  'ia_auto_resolve_slug',
  'ia_page_about',
  'ia_page_terms',
  'ia_page_privacy',
  'ia_page_return_policy',
  'ia_page_shipping',
  'ia_page_payment',
  'ia_page_faq',
] as const;

export type IASettings = {
  routeMode: RouteMode;
  autoResolveSlug: boolean;
  pages: {
    about: boolean;
    terms: boolean;
    privacy: boolean;
    returnPolicy: boolean;
    shipping: boolean;
    payment: boolean;
    faq: boolean;
  };
};

const resolveBoolean = (value: unknown, fallback = true): boolean => {
  if (typeof value === 'boolean') {return value;}
  return fallback;
};

export const getIASettings = async (): Promise<IASettings> => {
  const client = getConvexClient();
  const raw = await client.query(api.settings.getMultiple, { keys: [...IA_SETTINGS_KEYS] });

  return {
    autoResolveSlug: resolveBoolean(raw.ia_auto_resolve_slug, true),
    pages: {
      about: resolveBoolean(raw.ia_page_about, true),
      faq: resolveBoolean(raw.ia_page_faq, true),
      payment: resolveBoolean(raw.ia_page_payment, true),
      privacy: resolveBoolean(raw.ia_page_privacy, true),
      returnPolicy: resolveBoolean(raw.ia_page_return_policy, true),
      shipping: resolveBoolean(raw.ia_page_shipping, true),
      terms: resolveBoolean(raw.ia_page_terms, true),
    },
    routeMode: normalizeRouteMode(raw.ia_route_mode),
  };
};
