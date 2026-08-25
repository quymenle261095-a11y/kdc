import { api } from '@/convex/_generated/api';
import { getConvexClient } from '@/lib/convex';

const FALLBACK_COLOR = '#3b82f6';
const IMAGE_CONTENT_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/svg+xml',
  'image/vnd.microsoft.icon',
  'image/webp',
  'image/x-icon',
]);

const resolvePublicUrl = (value: string, requestUrl: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return null;
  }

  try {
    const url = new URL(trimmed, requestUrl);
    const currentUrl = new URL(requestUrl);
    if (
      url.origin === currentUrl.origin
      && (url.pathname === '/favicon.ico' || url.pathname === '/api/favicon')
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
};

const resolveBrandColor = (value?: string): string => {
  const trimmed = value?.trim();
  return trimmed && /^#[\da-f]{3,8}$/i.test(trimmed) ? trimmed : FALLBACK_COLOR;
};

const escapeXml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const buildFallbackSvg = (params: {
  brandColor?: string;
  siteName?: string;
}): string => {
  const initial = escapeXml((params.siteName || 'V').trim().charAt(0).toUpperCase() || 'V');
  const brandColor = resolveBrandColor(params.brandColor);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="${brandColor}"/><text x="24" y="32" font-size="26" font-weight="700" fill="white" text-anchor="middle" font-family="Arial,sans-serif">${initial}</text></svg>`;
};

const buildHeaders = (contentType: string): Headers => new Headers({
  'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
  'Content-Type': contentType,
  'X-Content-Type-Options': 'nosniff',
});

const buildFallbackResponse = (params: {
  brandColor?: string;
  siteName?: string;
}): Response => new Response(buildFallbackSvg(params), {
  headers: buildHeaders('image/svg+xml'),
});

interface CachedFaviconRecord {
  buffer: ArrayBuffer;
  contentType: string;
  timestamp: number;
}

let memoryFaviconCache: CachedFaviconRecord | null = null;
const FAVICON_CACHE_TTL_MS = 60_000; // 60 giây cache trên server

export const buildFaviconResponse = async (request: Request): Promise<Response> => {
  const now = Date.now();
  if (memoryFaviconCache && (now - memoryFaviconCache.timestamp < FAVICON_CACHE_TTL_MS)) {
    return new Response(memoryFaviconCache.buffer.slice(0), {
      headers: buildHeaders(memoryFaviconCache.contentType),
    });
  }

  try {
    const client = getConvexClient();
    const settings = await client.query(api.settings.getMultiple, {
      keys: ['site_favicon', 'site_brand_primary', 'site_name'],
    });

    const faviconUrl = resolvePublicUrl((settings.site_favicon as string | null) ?? '', request.url);
    if (!faviconUrl) {
      const fallbackSvg = buildFallbackSvg({
        brandColor: (settings.site_brand_primary as string | undefined) ?? undefined,
        siteName: (settings.site_name as string | undefined) ?? undefined,
      });
      const buffer = new TextEncoder().encode(fallbackSvg).buffer as ArrayBuffer;
      memoryFaviconCache = { buffer, contentType: 'image/svg+xml', timestamp: now };
      return new Response(buffer, {
        headers: buildHeaders('image/svg+xml'),
      });
    }

    const upstream = await fetch(faviconUrl, { cache: 'default' });
    const contentType = upstream.headers.get('content-type')?.split(';')[0]?.toLowerCase() ?? '';

    if (!upstream.ok || !IMAGE_CONTENT_TYPES.has(contentType)) {
      const fallbackSvg = buildFallbackSvg({
        brandColor: (settings.site_brand_primary as string | undefined) ?? undefined,
        siteName: (settings.site_name as string | undefined) ?? undefined,
      });
      const buffer = new TextEncoder().encode(fallbackSvg).buffer as ArrayBuffer;
      memoryFaviconCache = { buffer, contentType: 'image/svg+xml', timestamp: now };
      return new Response(buffer, {
        headers: buildHeaders('image/svg+xml'),
      });
    }

    const buffer = await upstream.arrayBuffer();
    memoryFaviconCache = { buffer, contentType, timestamp: now };

    return new Response(buffer.slice(0), {
      headers: buildHeaders(contentType),
    });
  } catch {
    return buildFallbackResponse({});
  }
};

export const buildFaviconHeadResponse = async (request: Request): Promise<Response> => {
  const response = await buildFaviconResponse(request);
  return new Response(null, {
    headers: response.headers,
    status: response.status,
  });
};
