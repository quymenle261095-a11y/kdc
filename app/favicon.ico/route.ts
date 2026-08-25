import { buildFaviconHeadResponse, buildFaviconResponse } from '@/lib/seo/favicon-response';

export const dynamic = 'force-dynamic';

export const GET = (request: Request): Promise<Response> => buildFaviconResponse(request);

export const HEAD = (request: Request): Promise<Response> => buildFaviconHeadResponse(request);
