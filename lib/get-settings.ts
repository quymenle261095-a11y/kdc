import { cache } from 'react';
import { api } from "../convex/_generated/api";
import { getConvexClient } from "./convex";

export interface SiteSettings {
  site_name: string;
  site_tagline: string;
  site_url: string;
  site_logo: string;
  site_favicon: string;
  site_brand_primary: string;
  site_brand_secondary: string;
  site_brand_mode: 'single' | 'dual';
  site_timezone: string;
  site_language: string;
  site_dark_mode?: 'light' | 'dark' | 'system';
}

export interface SEOSettings {
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  seo_og_image: string;
  seo_google_verification: string;
  seo_bing_verification: string;
  seo_brand_aliases: string;
  seo_brand_summary: string;
  seo_brand_entity_type: string;
  seo_brand_search_queries: string;
  seo_brand_topics: string;
  seo_brand_services: string;
  seo_brand_audience: string;
  seo_brand_differentiators: string;
  seo_brand_proof_points: string;
  seo_brand_same_as: string;
  seo_site_search_path: string;
}

export interface ContactSettings {
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  contact_zalo: string;
  contact_map_provider: string;
  contact_google_map_embed_iframe: string;
}

export interface SocialSettings {
  social_facebook: string;
  social_instagram: string;
  social_youtube: string;
  social_tiktok: string;
  social_twitter: string;
  social_linkedin: string;
  social_pinterest: string;
}

export interface PublicSettings {
  contact: ContactSettings;
  social: SocialSettings;
  seo: SEOSettings;
  site: SiteSettings;
}

const SETTINGS_KEYS = {
  contact: [
    "contact_email",
    "contact_phone",
    "contact_address",
    "contact_zalo",
    "contact_map_provider",
    "contact_google_map_embed_iframe",
  ],
  seo: [
    "seo_title",
    "seo_description",
    "seo_keywords",
    "seo_og_image",
    "seo_google_verification",
    "seo_bing_verification",
    "seo_brand_aliases",
    "seo_brand_summary",
    "seo_brand_entity_type",
    "seo_brand_search_queries",
    "seo_brand_topics",
    "seo_brand_services",
    "seo_brand_audience",
    "seo_brand_differentiators",
    "seo_brand_proof_points",
    "seo_brand_same_as",
    "seo_site_search_path",
  ],
  social: [
    "social_facebook",
    "social_instagram",
    "social_youtube",
    "social_tiktok",
    "social_twitter",
    "social_linkedin",
    "social_pinterest",
  ],
  site: [
    "site_name",
    "site_tagline",
    "site_url",
    "site_logo",
    "site_favicon",
    "site_brand_primary",
    "site_brand_secondary",
    "site_brand_mode",
    "site_timezone",
    "site_language",
    "site_dark_mode",
  ],
};

const ALL_PUBLIC_KEYS = [
  ...SETTINGS_KEYS.site,
  ...SETTINGS_KEYS.seo,
  ...SETTINGS_KEYS.contact,
  ...SETTINGS_KEYS.social,
];

const normalizeSiteSettings = (settings: Record<string, unknown>): SiteSettings => ({
  site_brand_primary: (settings.site_brand_primary as string) || "#3b82f6",
  site_brand_secondary: (settings.site_brand_secondary as string) || "",
  site_brand_mode: settings.site_brand_mode === 'single' ? 'single' : 'dual',
  site_favicon: (settings.site_favicon as string) || "",
  site_language: (settings.site_language as string) || "vi",
  site_logo: (settings.site_logo as string) || "",
  site_name: (settings.site_name as string) || "Website",
  site_tagline: (settings.site_tagline as string) || "",
  site_timezone: (settings.site_timezone as string) || "Asia/Ho_Chi_Minh",
  site_url: (settings.site_url as string) || "",
  site_dark_mode: (settings.site_dark_mode as any) || "light",
});

const normalizeSEOSettings = (settings: Record<string, unknown>): SEOSettings => ({
  seo_bing_verification: (settings.seo_bing_verification as string) || "",
  seo_brand_aliases: (settings.seo_brand_aliases as string) || "",
  seo_brand_audience: (settings.seo_brand_audience as string) || "",
  seo_brand_differentiators: (settings.seo_brand_differentiators as string) || "",
  seo_brand_entity_type: (settings.seo_brand_entity_type as string) || "Organization",
  seo_brand_proof_points: (settings.seo_brand_proof_points as string) || "",
  seo_brand_same_as: (settings.seo_brand_same_as as string) || "",
  seo_brand_search_queries: (settings.seo_brand_search_queries as string) || "",
  seo_brand_services: (settings.seo_brand_services as string) || "",
  seo_brand_summary: (settings.seo_brand_summary as string) || "",
  seo_brand_topics: (settings.seo_brand_topics as string) || "",
  seo_description: (settings.seo_description as string) || "",
  seo_google_verification: (settings.seo_google_verification as string) || "",
  seo_keywords: (settings.seo_keywords as string) || "",
  seo_og_image: (settings.seo_og_image as string) || "",
  seo_site_search_path: (settings.seo_site_search_path as string) || "/search?q={search_term_string}",
  seo_title: (settings.seo_title as string) || "",
});

const normalizeContactSettings = (settings: Record<string, unknown>): ContactSettings => ({
  contact_address: (settings.contact_address as string) || "",
  contact_email: (settings.contact_email as string) || "",
  contact_google_map_embed_iframe: (settings.contact_google_map_embed_iframe as string) || "",
  contact_map_provider: (settings.contact_map_provider as string) || "openstreetmap",
  contact_phone: (settings.contact_phone as string) || "",
  contact_zalo: (settings.contact_zalo as string) || "",
});

const normalizeSocialSettings = (settings: Record<string, unknown>): SocialSettings => ({
  social_facebook: (settings.social_facebook as string) || "",
  social_instagram: (settings.social_instagram as string) || "",
  social_linkedin: (settings.social_linkedin as string) || "",
  social_pinterest: (settings.social_pinterest as string) || "",
  social_tiktok: (settings.social_tiktok as string) || "",
  social_twitter: (settings.social_twitter as string) || "",
  social_youtube: (settings.social_youtube as string) || "",
});

const getSettingsGroup = async (keys: string[]): Promise<Record<string, unknown>> => {
  try {
    const client = getConvexClient();
    return await client.query(api.settings.getMultiple, { keys });
  } catch {
    return {};
  }
};

export const getAllPublicSettings = cache(async (): Promise<PublicSettings> => {
  const allSettings = await getSettingsGroup(ALL_PUBLIC_KEYS);
  return {
    contact: normalizeContactSettings(allSettings),
    seo: normalizeSEOSettings(allSettings),
    site: normalizeSiteSettings(allSettings),
    social: normalizeSocialSettings(allSettings),
  };
});

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const settings = await getAllPublicSettings();
  return settings.site;
});

export const getSEOSettings = cache(async (): Promise<SEOSettings> => {
  const settings = await getAllPublicSettings();
  return settings.seo;
});

export const getContactSettings = cache(async (): Promise<ContactSettings> => {
  const settings = await getAllPublicSettings();
  return settings.contact;
});

export const getSocialSettings = cache(async (): Promise<SocialSettings> => {
  const settings = await getAllPublicSettings();
  return settings.social;
});

export const getPublicSettings = async (): Promise<PublicSettings> => getAllPublicSettings();
