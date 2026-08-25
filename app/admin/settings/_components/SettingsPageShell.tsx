'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, ExternalLink, Eye, FileText, Globe, Image as ImageIcon, Layers, LayoutTemplate, Loader2, Lock, Mail, MapPin, Palette, Phone, PhoneCall, Plus, RotateCw, Search, Send, Share2, ShoppingBag, Square, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery } from 'convex/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { revalidateSeoPaths, revalidateSiteLayout } from '@/app/actions/seo-revalidate';
import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label, cn } from '../../components/ui';
import { ModuleGuard } from '../../components/ModuleGuard';
import { SettingsImageUploader } from '../../components/SettingsImageUploader';
import { TagInput } from '../../components/TagInput';
import MapLocationPicker from '../MapLocationPicker';
import { HomeComponentStickyFooter } from '@/app/admin/home-components/_shared/components/HomeComponentStickyFooter';
import { AiSeoImportDialog, type AiSeoImportPayload } from './AiSeoImportDialog';
import { SeoBuilderDialog } from './SeoBuilderDialog';
import { ProductSupplementalContentManager } from './ProductSupplementalContentManager';
import { ShopConfigAdminContainer } from '@/components/modules/orders/ShopConfigAdminContainer';
import { getEmailConfigurationStatus } from '@/lib/email-config-status';
import { FONT_REGISTRY, resolveFontVariable } from '@/lib/fonts/registry';
import { getImageDimensionsFromUrl } from '@/lib/image/uploadPipeline';
import { isAspectRatioMatch } from '@/lib/products/image-aspect-ratio';
import {
  DEFAULT_PRODUCT_CONTACT_SALE_LINK_TYPE,
  PRODUCT_CONTACT_SALE_CUSTOM_URL_KEY,
  PRODUCT_CONTACT_SALE_LINK_TYPE_KEY,
  isValidProductContactSaleCustomUrl,
  normalizeProductContactSaleLinkType,
  resolveProductContactSaleHref,
} from '@/lib/products/contact-sale-link';

type SettingsSection = 'site' | 'contact' | 'seo' | 'advanced';
type SettingsFormValue = string | boolean;
type FaviconCheckStatus = 'empty' | 'checking' | 'valid' | 'invalid-aspect' | 'invalid-size' | 'unavailable';
type SeoTab = 'basic' | 'brand';
type AdvancedTab = 'product-placeholder' | 'product-frame' | 'watermark' | 'header' | 'product-supplemental' | 'shop-config' | 'contact-link' | 'email-config';
const ADVANCED_TAB_ORDER: AdvancedTab[] = ['product-placeholder', 'product-frame', 'watermark', 'header', 'product-supplemental', 'shop-config', 'contact-link', 'email-config'];
type HeaderConfig = {
  showBrandName?: boolean;
  logoSizeLevel?: number;
  headerSpacingLevel?: number;
  logoBackgroundStyle?: string;
  headerSticky?: boolean;
  headerStickyDesktop?: boolean;
  headerStickyMobile?: boolean;
  cta?: {
    show?: boolean;
    text?: string;
    url?: string;
  };
  [key: string]: unknown;
};
type SettingsToSave = {
  group: string;
  key: string;
  storageId?: Id<'_storage'> | null;
  value: unknown;
};

const MODULE_KEY = 'settings';
const FAVICON_DIMENSION = 512;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SECTION_LABELS: Record<SettingsSection, string> = {
  contact: 'Thông tin liên hệ',
  seo: 'Cài đặt SEO',
  site: 'Thông tin chung',
  advanced: 'Cài đặt nâng cao',
};

// Color utilities
const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {return { h: 0, l: 0, s: 0 };}
  const r = Number.parseInt(result[1], 16) / 255;
  const g = Number.parseInt(result[2], 16) / 255;
  const b = Number.parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: { h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      }
      case g: { h = ((b - r) / d + 2) / 6; break;
      }
      case b: { h = ((r - g) / d + 4) / 6; break;
      }
    }
  }
  return { h: Math.round(h * 360), l: Math.round(l * 100), s: Math.round(s * 100) };
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

const generateTintsShades = (hex: string): string[] => {
  const { h, s } = hexToHSL(hex);
  const lightnesses = [95, 85, 75, 65, 55, 45, 35, 25, 15, 5];
  return lightnesses.map(newL => hslToHex(h, s, newL));
};

const generateComplementary = (hex: string): string => {
  const { h, s, l } = hexToHSL(hex);
  return hslToHex((h + 180) % 360, s, l);
};

const isValidHexColor = (color: string): boolean => /^#[0-9A-Fa-f]{6}$/.test(color);

const GROUP_LABELS: Record<string, string> = {
  contact: 'Thông tin liên hệ',
  seo: 'Cài đặt SEO',
  site: 'Thông tin chung',
  social: 'Mạng xã hội',
  advanced: 'Cài đặt nâng cao',
};

const SEO_META_LIMITS: Record<string, number> = {
  seo_description: 160,
  seo_title: 60,
};

const SEO_BRAND_FIELD_KEYS = [
  'seo_brand_aliases',
  'seo_brand_summary',
  'seo_brand_entity_type',
  'seo_brand_search_queries',
  'seo_brand_topics',
  'seo_brand_services',
  'seo_brand_audience',
  'seo_brand_differentiators',
  'seo_brand_proof_points',
  'seo_brand_same_as',
  'seo_site_search_path',
] as const;

const SEO_BRAND_FIELD_KEY_SET = new Set<string>(SEO_BRAND_FIELD_KEYS);

const SEO_FIELD_HELP: Record<string, { help: string; placeholder: string }> = {
  seo_brand_aliases: {
    help: 'Tên gọi khác, viết liền/viết rời/viết tắt. Ví dụ: Dohy, Dohy Studio, DOHY Media, dohystudio, dohy studio.',
    placeholder: 'Dohy, Dohy Studio, DOHY Media, dohystudio, dohy studio',
  },
  seo_brand_audience: {
    help: 'Nói rõ ai là khách chính và họ thường cần gì khi tìm đến website.',
    placeholder: 'Doanh nghiệp, marketer, chủ dự án cần hình ảnh 3D để bán hàng và thuyết trình...',
  },
  seo_brand_differentiators: {
    help: 'Điểm khiến thương hiệu khác đối thủ, nên viết bằng lợi ích thật, dễ kiểm chứng.',
    placeholder: 'Quy trình rõ ràng, hình ảnh sắc nét, tư vấn theo mục tiêu kinh doanh...',
  },
  seo_brand_entity_type: {
    help: 'Chọn kiểu gần nhất: Thương hiệu/công ty chung, cửa hàng có địa chỉ, hoặc đơn vị chuyên cung cấp dịch vụ.',
    placeholder: 'ProfessionalService',
  },
  seo_brand_proof_points: {
    help: 'Bằng chứng tin cậy như portfolio, số năm kinh nghiệm, chứng nhận, khách hàng, cam kết.',
    placeholder: 'Portfolio dự án thực tế, quy trình minh bạch, kênh liên hệ chính thức...',
  },
  seo_brand_same_as: {
    help: 'Mỗi dòng một link kênh chính thức như Google Business, YouTube, TikTok, LinkedIn, Facebook.',
    placeholder: 'https://www.youtube.com/@brand\nhttps://www.tiktok.com/@brand',
  },
  seo_brand_search_queries: {
    help: 'Các cách khách có thể gõ tên thương hiệu, gồm viết liền, viết rời hoặc tên cũ. Không thêm tên đối thủ.',
    placeholder: 'dohy, dohystudio, dohy studio, dohy media',
  },
  seo_brand_services: {
    help: 'Những sản phẩm hoặc dịch vụ quan trọng nhất muốn Google hiểu và gợi ý.',
    placeholder: 'dựng hình 3D, render kiến trúc, animation 3D',
  },
  seo_brand_summary: {
    help: 'Viết 1-2 câu nói thương hiệu là ai, làm gì và dành cho ai.',
    placeholder: 'Dohy Studio là studio hình ảnh 3D chuyên render kiến trúc, diễn họa sản phẩm và visual marketing...',
  },
  seo_brand_topics: {
    help: 'Các chủ đề chính mà website muốn được ghi nhớ.',
    placeholder: '3D visualization, architectural rendering, product rendering, visual marketing',
  },
  seo_site_search_path: {
    help: 'Đường dẫn ô tìm kiếm của website. Giữ {search_term_string} để hệ thống thay bằng từ khóa.',
    placeholder: '/search?q={search_term_string}',
  },
};

const SEO_FIELD_DEFAULTS: Partial<Record<(typeof SEO_BRAND_FIELD_KEYS)[number], string>> = {
  seo_brand_entity_type: 'Organization',
  seo_site_search_path: '/search?q={search_term_string}',
};

const REMOVED_SEO_KEYS = new Set([
  'seo_robots',
  'seo_business_type',
  'seo_opening_hours',
  'seo_price_range',
  'seo_geo_lat',
  'seo_geo_lng',
  'seo_hreflang',
]);

const HIDDEN_ADMIN_SEO_KEYS = new Set([
  ...REMOVED_SEO_KEYS,
  'seo_google_verification',
  'seo_bing_verification',
  'seo_site_search_path',
  'seo_brand_same_as',
]);

const REMOVED_CONTACT_KEYS = new Set([
  'contact_hotline',
  'social_zalo',
]);

/* ------------------------------------------------------------------ */
/*  Custom Brand & Social SVG Icons for Inputs                        */
/* ------------------------------------------------------------------ */

const FacebookSvg = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const ZaloSvg = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="#0068FF">
    <path d="M12.49 10.2722v-.4496h1.3467v6.3218h-.7704a.576.576 0 01-.5763-.5729l-.0006.0005a3.273 3.273 0 01-1.9372.6321c-1.8138 0-3.2844-1.4697-3.2844-3.2823 0-1.8125 1.4706-3.2822 3.2844-3.2822a3.273 3.273 0 011.9372.6321l.0006.0005zM6.9188 7.7896v.205c0 .3823-.051.6944-.2995 1.0605l-.03.0343c-.0542.0615-.1815.206-.2421.2843L2.024 14.8h4.8948v.7682a.5764.5764 0 01-.5767.5761H0v-.3622c0-.4436.1102-.6414.2495-.8476L4.8582 9.23H.1922V7.7896h6.7266zm8.5513 8.3548a.4805.4805 0 01-.4803-.4798v-7.875h1.4416v8.3548H15.47zM20.6934 9.6C22.52 9.6 24 11.0807 24 12.9044c0 1.8252-1.4801 3.306-3.3066 3.306-1.8264 0-3.3066-1.4808-3.3066-3.306 0-1.8237 1.4802-3.3044 3.3066-3.3044zm-10.1412 5.253c1.0675 0 1.9324-.8645 1.9324-1.9312 0-1.065-.865-1.9295-1.9324-1.9295s-1.9324.8644-1.9324 1.9295c0 1.0667.865 1.9312 1.9324 1.9312zm10.1412-.0033c1.0737 0 1.945-.8707 1.945-1.9453 0-1.073-.8713-1.9436-1.945-1.9436-1.0753 0-1.945.8706-1.945 1.9436 0 1.0746.8697 1.9453 1.945 1.9453z" />
  </svg>
);

const PinterestSvg = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#E60023">
    <path d="M12 0a12 12 0 0 0-4.37 23.17c-.05-.98-.1-2.48.2-3.56.28-1.18 1.8-7.65 1.8-7.65s-.46-.92-.46-2.28c0-2.14 1.24-3.73 2.78-3.73 1.31 0 1.94.98 1.94 2.16 0 1.32-.84 3.29-1.28 5.12-.36 1.53.77 2.78 2.28 2.78 2.74 0 4.85-2.89 4.85-7.06 0-3.69-2.65-6.27-6.44-6.27-4.39 0-6.96 3.29-6.96 6.69 0 1.33.51 2.75 1.15 3.53.13.15.15.29.11.45-.12.5-.39 1.59-.44 1.82-.07.3-.23.36-.53.22-1.99-.93-3.23-3.84-3.23-6.19 0-5.04 3.66-9.67 10.56-9.67 5.54 0 9.85 3.95 9.85 9.23 0 5.51-3.47 9.94-8.29 9.94-1.62 0-3.14-.84-3.66-1.83l-1 3.81c-.36 1.39-1.34 3.13-2 4.19A12 12 0 1 0 12 0z" />
  </svg>
);

const XSvg = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const InstagramSvg = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#E1306C">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const YoutubeSvg = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const TikTokSvg = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
  </svg>
);

const LinkedInSvg = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#0A66C2">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
  </svg>
);

const TelegramSvg = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#24A1DE">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.941z" />
  </svg>
);

const ThreadsSvg = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.186 24C5.454 24 0 18.619 0 12.001 0 5.383 5.454 0 12.186 0c6.627 0 11.968 5.215 12.186 11.699h-2.584C21.573 6.643 17.336 2.457 12.186 2.457 6.839 2.457 2.502 6.745 2.502 12.001c0 5.257 4.337 9.544 9.684 9.544 4.542 0 8.358-3.151 9.38-7.469l2.454.675C22.658 20.09 17.848 24 12.186 24zm4.076-9.155c-.097-.042-2.185-.92-3.66-1.503-.435 1.576-1.22 2.766-2.298 3.473-1.041.683-2.316.945-3.593.74-2.072-.334-3.528-1.996-3.461-3.953.072-2.128 1.836-3.791 4.148-3.91 1.25-.064 2.479.23 3.555.851.353-.872.6-1.84.733-2.883-1.63-.642-3.447-.798-5.244-.452-3.328.642-5.748 3.393-5.875 6.68-.137 3.518 2.477 6.495 6.079 7.075 1.947.313 3.882-.085 5.449-1.123 1.583-1.048 2.72-2.736 3.204-4.757l.006-.027c.451-1.921.282-3.856-.475-5.449-1.082-2.279-3.21-3.743-5.7-3.914-3.077-.212-6.024 1.135-7.882 3.601-1.859 2.469-2.278 5.727-1.121 8.715.197.51.683.844 1.226.844.11 0 .221-.014.331-.044.653-.178 1.042-.852.864-1.505-.909-2.348-.581-4.908.88-6.848 1.46-1.938 3.774-2.996 6.19-2.83 1.954.134 3.626 1.282 4.475 3.07.601 1.265.733 2.802.373 4.332z" />
  </svg>
);

const GoogleMapsSvg = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA4335" />
    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.2 1.05 4.3 2.7 6.2L12 22l4.3-6.8C17.95 13.3 19 11.2 19 9c0-3.87-3.13-7-7-7z" fill="#4285F4" />
    <path d="M12 6.5A2.5 2.5 0 1 0 12 11.5A2.5 2.5 0 1 0 12 6.5Z" fill="#34A853" />
    <circle cx="12" cy="9" r="2" fill="#FBBC04" />
  </svg>
);

const OsmSvg = ({ size = 16 }: { size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
  </svg>
);

const extractIframeSrc = (iframeHtml: string): string => {
  if (!iframeHtml) return '';
  const match = iframeHtml.match(/src=["']([^"']+)["']/i);
  if (match?.[1]) return match[1];
  const trimmed = iframeHtml.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return '';
};

interface SocialOrContactMeta {
  bgClass: string;
  icon: React.ReactNode;
  label: string;
  placeholder: string;
}

const getSocialOrContactIcon = (key: string, fieldType?: string): SocialOrContactMeta | null => {
  const normalizedKey = key.toLowerCase();

  if (normalizedKey.includes('facebook')) {
    return {
      bgClass: 'bg-blue-50/90 text-[#1877F2] dark:bg-blue-950/50 dark:text-[#388bfd]',
      icon: <FacebookSvg size={18} />,
      label: 'Facebook',
      placeholder: 'https://www.facebook.com/your-fanpage',
    };
  }
  if (normalizedKey.includes('zalo')) {
    return {
      bgClass: 'bg-blue-50/90 text-[#0068FF] dark:bg-blue-950/50 dark:text-[#388bfd]',
      icon: <ZaloSvg size={18} />,
      label: 'Zalo',
      placeholder: 'https://zalo.me/0369557577',
    };
  }
  if (normalizedKey.includes('pinterest')) {
    return {
      bgClass: 'bg-red-50/90 text-[#E60023] dark:bg-red-950/50 dark:text-[#ff5c6c]',
      icon: <PinterestSvg size={18} />,
      label: 'Pinterest',
      placeholder: 'https://www.pinterest.com/your-profile',
    };
  }
  if (normalizedKey.includes('twitter') || normalizedKey === 'social_x') {
    return {
      bgClass: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
      icon: <XSvg size={16} />,
      label: 'X (Twitter)',
      placeholder: 'https://x.com/your-handle',
    };
  }
  if (normalizedKey.includes('instagram')) {
    return {
      bgClass: 'bg-pink-50/90 text-[#E1306C] dark:bg-pink-950/50 dark:text-[#ff5c8a]',
      icon: <InstagramSvg size={18} />,
      label: 'Instagram',
      placeholder: 'https://www.instagram.com/your-page',
    };
  }
  if (normalizedKey.includes('youtube')) {
    return {
      bgClass: 'bg-red-50/90 text-[#FF0000] dark:bg-red-950/50 dark:text-[#ff5c5c]',
      icon: <YoutubeSvg size={18} />,
      label: 'Youtube',
      placeholder: 'https://www.youtube.com/@your-channel',
    };
  }
  if (normalizedKey.includes('tiktok')) {
    return {
      bgClass: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
      icon: <TikTokSvg size={18} />,
      label: 'TikTok',
      placeholder: 'https://www.tiktok.com/@your-account',
    };
  }
  if (normalizedKey.includes('linkedin')) {
    return {
      bgClass: 'bg-sky-50/90 text-[#0A66C2] dark:bg-sky-950/50 dark:text-[#388bfd]',
      icon: <LinkedInSvg size={18} />,
      label: 'LinkedIn',
      placeholder: 'https://www.linkedin.com/in/your-profile',
    };
  }
  if (normalizedKey.includes('telegram')) {
    return {
      bgClass: 'bg-sky-50/90 text-[#24A1DE] dark:bg-sky-950/50 dark:text-[#388bfd]',
      icon: <TelegramSvg size={18} />,
      label: 'Telegram',
      placeholder: 'https://t.me/your-username',
    };
  }
  if (normalizedKey.includes('threads')) {
    return {
      bgClass: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100',
      icon: <ThreadsSvg size={18} />,
      label: 'Threads',
      placeholder: 'https://www.threads.net/@your-profile',
    };
  }
  if (normalizedKey.includes('phone') || normalizedKey.includes('hotline') || fieldType === 'phone') {
    return {
      bgClass: 'bg-emerald-50/90 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
      icon: <Phone size={16} />,
      label: 'Điện thoại',
      placeholder: '0901234567',
    };
  }
  if (normalizedKey.includes('email') || fieldType === 'email') {
    return {
      bgClass: 'bg-indigo-50/90 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
      icon: <Mail size={16} />,
      label: 'Email',
      placeholder: 'contact@domain.com',
    };
  }
  if (normalizedKey.includes('work_hours') || normalizedKey.includes('time')) {
    return {
      bgClass: 'bg-amber-50/90 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
      icon: <Clock size={16} />,
      label: 'Giờ làm việc',
      placeholder: '08:00 - 17:30 (Thứ 2 - Thứ 7)',
    };
  }
  if (normalizedKey.includes('address') || normalizedKey.includes('dia_chi')) {
    return {
      bgClass: 'bg-rose-50/90 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400',
      icon: <MapPin size={16} />,
      label: 'Địa chỉ',
      placeholder: 'Số 123 đường ABC, Quận XYZ, TP.HCM...',
    };
  }

  return null;
};

const SETTING_STORAGE_ID_SUFFIX = '__storageId';
const PRODUCT_IMAGE_ADVANCED_FEATURE = 'enableProductImageAdvanced';
const PRODUCT_FRAME_ADVANCED_FEATURE = 'enableProductFrameAdvanced';
const PRODUCT_WATERMARK_ADVANCED_FEATURE = 'enableProductWatermarkAdvanced';
const HEADER_MENU_ADVANCED_FEATURE = 'enableHeaderMenuAdvanced';
const PRODUCT_SUPPLEMENTAL_ADVANCED_FEATURE = 'enableProductSupplementalAdvanced';
const SHOP_CONFIG_ADVANCED_FEATURE = 'enableShopConfigAdvanced';
const PRODUCT_CONTACT_LINK_ADVANCED_FEATURE = 'enableProductContactLinkAdvanced';
const EMAIL_CONFIG_ADVANCED_FEATURE = 'enableMail';
const EMAIL_SETTING_KEYS = [
  'mail_driver',
  'mail_from_email',
  'mail_from_name',
  'order_notification_emails',
] as const;
const EMAIL_DEFAULTS: Record<(typeof EMAIL_SETTING_KEYS)[number], string> = {
  mail_driver: 'resend',
  mail_from_email: '',
  mail_from_name: 'YourBrand',
  order_notification_emails: '',
};
const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  showBrandName: true,
  logoSizeLevel: 2,
  headerSpacingLevel: 5,
  logoBackgroundStyle: 'none',
  headerSticky: true,
  headerStickyDesktop: true,
  headerStickyMobile: true,
  cta: { show: true, text: 'Liên hệ', url: '/contact' },
};
const LOGO_SIZE_OPTIONS = Array.from({ length: 30 }, (_, index) => ({
  value: index + 1,
  label: `Nấc ${index + 1}`,
}));
const HEADER_SPACING_OPTIONS = [
  { value: 1, label: 'Siêu gọn' },
  { value: 2, label: 'Rất gọn' },
  { value: 3, label: 'Gọn' },
  { value: 4, label: 'Hơi gọn' },
  { value: 5, label: 'Cân bằng' },
  { value: 6, label: 'Hơi thoáng' },
  { value: 7, label: 'Trung bình' },
];
const LOGO_BACKGROUND_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'border', label: 'Border' },
  { id: 'outline', label: 'Outline sạch' },
  { id: 'hairline', label: 'Hairline nhẹ' },
  { id: 'inset', label: 'Inset panel' },
  { id: 'pill', label: 'Pill badge' },
  { id: 'shadow', label: 'Shadow' },
  { id: 'soft', label: 'Soft card' },
  { id: 'solid', label: 'Solid contrast' },
];

const normalizeHeaderConfig = (value: unknown): HeaderConfig => {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as HeaderConfig
    : {};
  return {
    ...raw,
    showBrandName: raw.showBrandName ?? DEFAULT_HEADER_CONFIG.showBrandName,
    logoSizeLevel: typeof raw.logoSizeLevel === 'number' ? Math.min(30, Math.max(1, Math.round(raw.logoSizeLevel))) : DEFAULT_HEADER_CONFIG.logoSizeLevel,
    headerSpacingLevel: typeof raw.headerSpacingLevel === 'number' ? Math.min(7, Math.max(1, Math.round(raw.headerSpacingLevel))) : DEFAULT_HEADER_CONFIG.headerSpacingLevel,
    logoBackgroundStyle: typeof raw.logoBackgroundStyle === 'string' ? raw.logoBackgroundStyle : DEFAULT_HEADER_CONFIG.logoBackgroundStyle,
    headerSticky: raw.headerSticky ?? DEFAULT_HEADER_CONFIG.headerSticky,
    headerStickyDesktop: raw.headerStickyDesktop ?? raw.headerSticky ?? DEFAULT_HEADER_CONFIG.headerStickyDesktop,
    headerStickyMobile: raw.headerStickyMobile ?? raw.headerSticky ?? DEFAULT_HEADER_CONFIG.headerStickyMobile,
    cta: {
      ...DEFAULT_HEADER_CONFIG.cta,
      ...(raw.cta && typeof raw.cta === 'object' ? raw.cta : {}),
    },
  };
};

const stableStringify = (value: unknown) => JSON.stringify(value ?? null);

export default function SettingsPageShell({ section }: { section: SettingsSection }) {
  return (
    <ModuleGuard moduleKey={MODULE_KEY}>
      <SettingsContent section={section} />
    </ModuleGuard>
  );
}

function SettingsContent({ section }: { section: SettingsSection }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [form, setForm] = useState<Record<string, SettingsFormValue>>({});
  const [initialForm, setInitialForm] = useState<Record<string, SettingsFormValue>>({});
  const [mediaStorageIds, setMediaStorageIds] = useState<Record<string, Id<'_storage'> | null>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSecondaryAuto, setIsSecondaryAuto] = useState(true);
  const [hasCleanedSeoFields, setHasCleanedSeoFields] = useState(false);
  const [hasCleanedContactFields, setHasCleanedContactFields] = useState(false);
  const [hasSyncedSeoRuntimeFields, setHasSyncedSeoRuntimeFields] = useState(false);
  const [seoTab, setSeoTab] = useState<SeoTab>('basic');
  const [seoPreviewTab, setSeoPreviewTab] = useState<'google' | 'social'>('google');
  const [advancedTab, setAdvancedTab] = useState<AdvancedTab>('product-placeholder');
  const [headerConfigDraft, setHeaderConfigDraft] = useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
  const [initialHeaderConfig, setInitialHeaderConfig] = useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
  const [activeDrag, setActiveDrag] = useState<'image-move' | 'image-resize' | 'text-move' | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);
  const [faviconCheckStatus, setFaviconCheckStatus] = useState<FaviconCheckStatus>('empty');
  const previewCanvasRef = React.useRef<HTMLDivElement>(null);

  const faviconUrl = typeof form.site_favicon === 'string' ? form.site_favicon.trim() : '';
  const initialFaviconUrl = typeof initialForm.site_favicon === 'string' ? initialForm.site_favicon.trim() : '';
  const isLegacyFavicon = Boolean(faviconUrl) && faviconUrl === initialFaviconUrl;

  // Queries
  const settingsData = useQuery(api.settings.listAll);
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });
  const fieldsData = useQuery(api.admin.modules.listModuleFields, { moduleKey: MODULE_KEY });
  const defaultImageAspectRatio = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'defaultImageAspectRatio' });
  const productSaleModeSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'saleMode' });
  const [selectedFrameAR, setSelectedFrameAR] = useState<string>('');
  const [shopConfigDirty, setShopConfigDirty] = useState(false);
  const [shopConfigSaving, setShopConfigSaving] = useState(false);
  const saveShopConfigRef = React.useRef<{ save: () => Promise<void> } | null>(null);
 
  // Parse enabled features
  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach(f => { features[f.featureKey] = f.enabled; });
    return features;
  }, [featuresData]);

  const isFeatureEnabled = (featureKey: string, fallback = false) => (
    featuresData?.some(feature => feature.featureKey === featureKey)
      ? Boolean(enabledFeatures[featureKey])
      : fallback
  );

  const canEditProductImage = isFeatureEnabled(PRODUCT_IMAGE_ADVANCED_FEATURE, true);
  const canEditProductFrame = isFeatureEnabled(PRODUCT_FRAME_ADVANCED_FEATURE, true);
  const canEditProductWatermark = isFeatureEnabled(PRODUCT_WATERMARK_ADVANCED_FEATURE, true);
 
  const canEditHeaderMenu = isFeatureEnabled(HEADER_MENU_ADVANCED_FEATURE, false);
 
  const canEditShopConfig = isFeatureEnabled(SHOP_CONFIG_ADVANCED_FEATURE, false);

  const canEditEmailConfig = isFeatureEnabled(EMAIL_CONFIG_ADVANCED_FEATURE, false);
 
  const canEditProductSupplemental = isFeatureEnabled(PRODUCT_SUPPLEMENTAL_ADVANCED_FEATURE, true);
  const isProductContactSaleMode = productSaleModeSetting?.value === 'contact';
  const canEditProductContactLink = isProductContactSaleMode && isFeatureEnabled(PRODUCT_CONTACT_LINK_ADVANCED_FEATURE, true);
  const enabledAdvancedTabs = useMemo<AdvancedTab[]>(() => ADVANCED_TAB_ORDER.filter((tab) => {
    switch (tab) {
      case 'product-placeholder': return canEditProductImage;
      case 'product-frame': return canEditProductFrame;
      case 'watermark': return canEditProductWatermark;
      case 'header': return canEditHeaderMenu;
      case 'product-supplemental': return canEditProductSupplemental;
      case 'shop-config': return canEditShopConfig;
      case 'contact-link': return canEditProductContactLink;
      case 'email-config': return canEditEmailConfig;
      default: return false;
    }
  }), [
    canEditEmailConfig,
    canEditHeaderMenu,
    canEditProductFrame,
    canEditProductImage,
    canEditProductSupplemental,
    canEditProductContactLink,
    canEditProductWatermark,
    canEditShopConfig,
  ]);

  useEffect(() => {
    if (tabParam === 'product-supplemental' && canEditProductSupplemental) {
      setAdvancedTab('product-supplemental');
    }
  }, [tabParam, canEditProductSupplemental]);
 
  useEffect(() => {
    if (tabParam === 'shop-config' && canEditShopConfig) {
      setAdvancedTab('shop-config');
    }
  }, [tabParam, canEditShopConfig]);

  useEffect(() => {
    if (tabParam === 'contact-link' && canEditProductContactLink) {
      setAdvancedTab('contact-link');
    }
  }, [tabParam, canEditProductContactLink]);

  useEffect(() => {
    if (tabParam === 'email-config' && canEditEmailConfig) {
      setAdvancedTab('email-config');
    }
  }, [tabParam, canEditEmailConfig]);

  const handlePreviewPointerDown = (e: React.PointerEvent<HTMLDivElement>, type: 'image-move' | 'image-resize' | 'text-move') => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {
      console.warn('setPointerCapture failed', err);
    }
    setActiveDrag(type);
  };

  const handlePreviewPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDrag) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    
    // Convert to percentage
    const xPct = Math.min(100, Math.max(0, Math.round((xPx / rect.width) * 100)));
    const yPct = Math.min(100, Math.max(0, Math.round((yPx / rect.height) * 100)));

    if (activeDrag === 'image-move') {
      updateField('product_watermark_image_x', String(xPct));
      updateField('product_watermark_image_y', String(yPct));
    } else if (activeDrag === 'text-move') {
      updateField('product_watermark_text_y', String(yPct));
    } else if (activeDrag === 'image-resize') {
      const imageX = parseFloat(String(form.product_watermark_image_x || 80));
      const imageXPx = (imageX / 100) * rect.width;
      const halfWidthPx = Math.abs(e.clientX - rect.left - imageXPx);
      const widthPct = Math.min(80, Math.max(5, Math.round((halfWidthPx * 2 / rect.width) * 100)));
      updateField('product_watermark_image_width', String(widthPct));
    }
  };

  const handlePreviewPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDrag) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setActiveDrag(null);
    }
  };

  // Mutations
  const setMultiple = useMutation(api.settings.setMultiple);
  const removeMultiple = useMutation(api.settings.removeMultiple);
  const syncModuleConfig = useMutation(api.admin.modules.syncModuleConfigFromDefinition);

  const isLoading = settingsData === undefined
    || featuresData === undefined
    || fieldsData === undefined
    || productSaleModeSetting === undefined;

  const isSectionEnabled = section === 'site'
    ? true
    : section === 'contact'
      ? Boolean(enabledFeatures.enableContact)
      : section === 'seo'
        ? Boolean(enabledFeatures.enableSEO)
        : true;

  const brandMode = form.site_brand_mode === 'single' ? 'single' : 'dual';
  const isSecondaryModeSingle = brandMode === 'single';

  // Filter and group fields based on enabled status and feature
  const fieldsByGroup = useMemo(() => {
    const groups: Record<string, typeof fieldsData> = {};
    
    fieldsData?.forEach(field => {
      if (field.fieldKey === 'site_brand_color') {return;}
      // Skip disabled fields
      if (!field.enabled) {return;}
      
      // Skip fields whose linked feature is disabled
      if (field.linkedFeature && !enabledFeatures[field.linkedFeature]) {return;}

      if (HIDDEN_ADMIN_SEO_KEYS.has(field.fieldKey)) {return;}
      if (REMOVED_CONTACT_KEYS.has(field.fieldKey)) {return;}

      // Skip lat/lng fields (managed by MapLocationPicker)
      if (field.fieldKey === 'contact_lat' || field.fieldKey === 'contact_lng') {return;}

      const group = field.group ?? 'site';
      groups[group] ??= [];
      groups[group].push(field);
    });

    // Sort fields by order within each group
    Object.keys(groups).forEach(key => {
      groups[key]!.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    });

    return groups;
  }, [fieldsData, enabledFeatures]);

  // Sync form with settings data
  useEffect(() => {
    if (settingsData) {
      const values: Record<string, SettingsFormValue> = {};
      const storageIds: Record<string, Id<'_storage'> | null> = {};
      settingsData.forEach(s => {
        if (s.key.endsWith(SETTING_STORAGE_ID_SUFFIX)) {
          const ownerKey = s.key.slice(0, -SETTING_STORAGE_ID_SUFFIX.length);
          storageIds[ownerKey] = typeof s.value === 'string' ? s.value as Id<'_storage'> : null;
          return;
        }
        if (s.key === 'header_config') {
          const normalized = normalizeHeaderConfig(s.value);
          setHeaderConfigDraft(normalized);
          setInitialHeaderConfig(normalized);
          return;
        }
        values[s.key] = typeof s.value === 'boolean' ? s.value : (typeof s.value === 'string' ? s.value : String(s.value ?? ''));
      });
      if (!values.contact_lat) {
        values.contact_lat = '10.762622';
      }
      if (!values.contact_lng) {
        values.contact_lng = '106.660172';
      }
      if (!values.contact_map_provider) {
        values.contact_map_provider = 'openstreetmap';
      }
      if (!values.contact_google_map_embed_iframe) {
        values.contact_google_map_embed_iframe = '';
      }
      if (values.product_image_placeholder === undefined) {
        values.product_image_placeholder = '';
      }
      if (values[PRODUCT_CONTACT_SALE_LINK_TYPE_KEY] === undefined) {
        values[PRODUCT_CONTACT_SALE_LINK_TYPE_KEY] = DEFAULT_PRODUCT_CONTACT_SALE_LINK_TYPE;
      }
      if (values[PRODUCT_CONTACT_SALE_CUSTOM_URL_KEY] === undefined) {
        values[PRODUCT_CONTACT_SALE_CUSTOM_URL_KEY] = '';
      }
      SEO_BRAND_FIELD_KEYS.forEach((key) => {
        if (values[key] === undefined) {
          values[key] = SEO_FIELD_DEFAULTS[key] ?? '';
        }
      });
      if (values.enable_product_frames === undefined) {
        values.enable_product_frames = false;
      }
      const frameKeys = [
        'product_frame_overlay_square_url',
        'product_frame_overlay_portrait916_url',
        'product_frame_overlay_portrait34_url',
        'product_frame_overlay_landscape43_url',
        'product_frame_overlay_wide169_url',
      ];
      frameKeys.forEach((key) => {
        if (values[key] === undefined) {
          values[key] = '';
        }
      });
      if (values.enable_product_watermark === undefined) {
        values.enable_product_watermark = false;
      }
      // Defaults cho watermark hình
      if (values.product_watermark_image_enabled === undefined) {
        values.product_watermark_image_enabled = false;
      }
      if (values.product_watermark_image_url === undefined) {
        values.product_watermark_image_url = '';
      }
      if (values.product_watermark_image_x === undefined) {
        values.product_watermark_image_x = '80';
      }
      if (values.product_watermark_image_y === undefined) {
        values.product_watermark_image_y = '80';
      }
      if (values.product_watermark_image_width === undefined) {
        values.product_watermark_image_width = '28';
      }
      if (values.product_watermark_image_opacity === undefined) {
        values.product_watermark_image_opacity = '40';
      }

      // Defaults cho watermark chữ
      if (values.product_watermark_text_enabled === undefined) {
        values.product_watermark_text_enabled = false;
      }
      if (values.product_watermark_text_content === undefined) {
        values.product_watermark_text_content = '';
      }
      if (values.product_watermark_text_y === undefined) {
        values.product_watermark_text_y = '80';
      }
      if (values.product_watermark_text_font_size === undefined) {
        values.product_watermark_text_font_size = '8';
      }
      if (values.product_watermark_text_color === undefined) {
        values.product_watermark_text_color = '#64748B';
      }
      if (values.product_watermark_text_opacity === undefined) {
        values.product_watermark_text_opacity = '35';
      }
      if (values.product_watermark_text_repeat === undefined) {
        values.product_watermark_text_repeat = false;
      }
      if (values.product_watermark_text_vertical_repeat === undefined) {
        values.product_watermark_text_vertical_repeat = false;
      }
      if (values.product_watermark_text_font === undefined) {
        values.product_watermark_text_font = 'be-vietnam-pro';
      }
      if (values.product_watermark_text_line_gap === undefined) {
        values.product_watermark_text_line_gap = '30';
      }
      EMAIL_SETTING_KEYS.forEach((key) => {
        if (values[key] === undefined) {
          if (key === 'mail_from_name') {
            values[key] = (values.site_name as string) || EMAIL_DEFAULTS.mail_from_name;
          } else {
            values[key] = EMAIL_DEFAULTS[key];
          }
        }
      });
      setIsSecondaryAuto(values.site_brand_mode === 'single' ? true : !values.site_brand_secondary);
      setForm(values);
      setInitialForm(values);
      setMediaStorageIds(storageIds);
    }
  }, [settingsData]);

  useEffect(() => {
    let isActive = true;
    if (!faviconUrl) {
      setFaviconCheckStatus('empty');
      return () => {
        isActive = false;
      };
    }

    setFaviconCheckStatus('checking');
    void getImageDimensionsFromUrl(faviconUrl)
      .then((dimensions) => {
        if (!isActive) {return;}
        if (!isAspectRatioMatch(dimensions, 'square')) {
          setFaviconCheckStatus('invalid-aspect');
        } else if (dimensions.width !== FAVICON_DIMENSION || dimensions.height !== FAVICON_DIMENSION) {
          setFaviconCheckStatus('invalid-size');
        } else {
          setFaviconCheckStatus('valid');
        }
      })
      .catch(() => {
        if (isActive) {
          setFaviconCheckStatus('unavailable');
        }
      });

    return () => {
      isActive = false;
    };
  }, [faviconUrl]);

  useEffect(() => {
    if (!settingsData || hasCleanedSeoFields) {return;}
    const hasRemoved = settingsData.some(setting => REMOVED_SEO_KEYS.has(setting.key));
    if (!hasRemoved) {
      setHasCleanedSeoFields(true);
      return;
    }
    void removeMultiple({ keys: Array.from(REMOVED_SEO_KEYS) })
      .finally(() => setHasCleanedSeoFields(true));
  }, [settingsData, hasCleanedSeoFields, removeMultiple]);

  useEffect(() => {
    if (section !== 'seo' || !fieldsData || hasSyncedSeoRuntimeFields) {return;}
    const fieldKeys = new Set(fieldsData.map((field) => field.fieldKey));
    const hasMissingBrandFields = SEO_BRAND_FIELD_KEYS.some((fieldKey) => !fieldKeys.has(fieldKey));
    if (!hasMissingBrandFields) {
      setHasSyncedSeoRuntimeFields(true);
      return;
    }
    setHasSyncedSeoRuntimeFields(true);
    void syncModuleConfig({ moduleKey: MODULE_KEY }).catch((error) => {
      console.error('Failed to sync settings SEO runtime fields:', error);
      toast.warning('Chưa đồng bộ được field Brand SEO. Hãy thử tải lại trang.');
    });
  }, [fieldsData, hasSyncedSeoRuntimeFields, section, syncModuleConfig]);

  useEffect(() => {
    if (!settingsData || hasCleanedContactFields) {return;}
    const hasRemoved = settingsData.some(setting => REMOVED_CONTACT_KEYS.has(setting.key));
    if (!hasRemoved) {
      setHasCleanedContactFields(true);
      return;
    }
    void removeMultiple({ keys: Array.from(REMOVED_CONTACT_KEYS) })
      .finally(() => setHasCleanedContactFields(true));
  }, [settingsData, hasCleanedContactFields, removeMultiple]);

  useEffect(() => {
    if (isSecondaryModeSingle && !isSecondaryAuto) {
      setIsSecondaryAuto(true);
    }
  }, [isSecondaryModeSingle, isSecondaryAuto]);

  useEffect(() => {
    if (isLoading) {return;}
    if (!isSectionEnabled) {
      router.replace('/admin/settings/general');
    }
  }, [isLoading, isSectionEnabled, router]);

  useEffect(() => {
    if (section !== 'advanced') {return;}
    if (enabledAdvancedTabs.length > 0 && !enabledAdvancedTabs.includes(advancedTab)) {
      setAdvancedTab(enabledAdvancedTabs[0]);
    }
  }, [advancedTab, enabledAdvancedTabs, section]);

  // Detect changes
  const headerConfigHasChanges = useMemo(
    () => stableStringify(headerConfigDraft) !== stableStringify(initialHeaderConfig),
    [headerConfigDraft, initialHeaderConfig]
  );
  
  const isShopConfigTab = section === 'advanced' && advancedTab === 'shop-config' && canEditShopConfig;
 
  const hasChanges = useMemo(() => {
    if (isShopConfigTab) {
      return shopConfigDirty;
    }
    return Object.keys(form).some(key => form[key] !== initialForm[key]) || (canEditHeaderMenu && headerConfigHasChanges);
  }, [isShopConfigTab, shopConfigDirty, form, initialForm, canEditHeaderMenu, headerConfigHasChanges]);

  const emailStatus = useMemo(() => getEmailConfigurationStatus(form), [form]);
  const savedEmailStatus = useMemo(() => getEmailConfigurationStatus(initialForm), [initialForm]);
 
  const isCurrentlySaving = isSaving || (isShopConfigTab && shopConfigSaving);

  const updateField = (key: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const applySeoPayload = (payload: AiSeoImportPayload) => {
    Object.entries(payload).forEach(([key, value]) => {
      if (typeof value === 'string' && value.trim()) {
        updateField(key, value);
      }
    });
  };

  const getStringField = (key: string, fallback = '') => {
    const value = form[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
    if (key === 'mail_from_name') {
      return (form.site_name as string) || fallback;
    }
    return typeof value === 'string' ? value : fallback;
  };

  const updateImageField = (key: string, url: string | undefined, storageId?: Id<'_storage'> | null) => {
    updateField(key, url ?? '');
    if (storageId !== undefined) {
      setMediaStorageIds(prev => ({ ...prev, [key]: storageId }));
    }
  };

  const logoValue = typeof form.site_logo === 'string' ? form.site_logo : '';
  const handleUseLogo = async (targetKey: 'site_favicon' | 'product_image_placeholder' | 'seo_og_image') => {
    if (!logoValue) {
      toast.error('Chưa có logo để dùng.');
      return;
    }

    if (targetKey === 'site_favicon') {
      try {
        const dimensions = await getImageDimensionsFromUrl(logoValue);
        if (!isAspectRatioMatch(dimensions, 'square')) {
          toast.error('Logo hiện tại là logo ngang. Hãy upload hoặc crop một icon vuông riêng cho favicon.');
          return;
        }
        if (dimensions.width !== FAVICON_DIMENSION || dimensions.height !== FAVICON_DIMENSION) {
          toast.error(`Logo hiện tại chưa đúng ${FAVICON_DIMENSION}x${FAVICON_DIMENSION}px. Hãy upload hoặc crop lại favicon.`);
          return;
        }
      } catch {
        toast.error('Không thể kiểm tra kích thước logo hiện tại.');
        return;
      }
    }

    updateImageField(targetKey, logoValue, mediaStorageIds.site_logo ?? null);
    toast.success(targetKey === 'site_favicon' ? 'Đã dùng logo làm favicon.' : targetKey === 'product_image_placeholder' ? 'Đã dùng logo làm placeholder sản phẩm.' : 'Đã dùng logo làm OG Image.');
  };

  const handleSendTestEmail = async () => {
    const email = testEmail.trim();
    if (!EMAIL_REGEX.test(email)) {
      toast.error('Email nhận thử không hợp lệ.');
      return;
    }
    if (hasChanges) {
      toast.error('Vui lòng lưu cấu hình email trước khi gửi thử.');
      return;
    }
    if (!savedEmailStatus.configured) {
      toast.error('Dev chưa cấu hình email gửi ra. Vui lòng liên hệ dev.');
      return;
    }

    setIsSendingTestEmail(true);
    try {
      const response = await fetch('/api/system/integrations/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `Email test từ ${getStringField('mail_from_name', 'YourBrand')}`,
          html: `<p>Đây là email test từ hệ thống ${getStringField('mail_from_name', 'YourBrand')}.</p>`,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.message || 'Gửi email thử thất bại.');
      }
      toast.success('Đã gửi email thử. Vui lòng kiểm tra hộp thư.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gửi email thử thất bại.');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const updateHeaderConfig = <K extends keyof HeaderConfig>(key: K, value: HeaderConfig[K]) => {
    setHeaderConfigDraft(prev => ({
      ...prev,
      [key]: value,
      ...(key === 'headerStickyDesktop' || key === 'headerStickyMobile'
        ? {
            headerSticky: key === 'headerStickyDesktop'
              ? Boolean(value)
              : (prev.headerStickyDesktop ?? prev.headerSticky ?? true),
          }
        : {}),
    }));
  };

  const updateHeaderCta = <K extends keyof NonNullable<HeaderConfig['cta']>>(key: K, value: NonNullable<HeaderConfig['cta']>[K]) => {
    setHeaderConfigDraft(prev => ({
      ...prev,
      cta: {
        ...DEFAULT_HEADER_CONFIG.cta,
        ...prev.cta,
        [key]: value,
      },
    }));
  };

  // Validate before save
  const validateForm = (): boolean => {
    // Validate color fields
    const colorFields = fieldsData?.filter(f => f.type === 'color') ?? [];
    for (const field of colorFields) {
      const value = form[field.fieldKey];
      if (typeof value === 'string' && value && !isValidHexColor(value)) {
        toast.error(`${field.name}: Mã màu không hợp lệ (cần format #RRGGBB)`);
        return false;
      }
    }

    const mapProvider = form.contact_map_provider === 'google_embed' ? 'google_embed' : 'openstreetmap';
    const googleIframe = typeof form.contact_google_map_embed_iframe === 'string'
      ? form.contact_google_map_embed_iframe.trim()
      : '';
    if (mapProvider === 'google_embed' && googleIframe) {
      const hasIframe = googleIframe.includes('<iframe') && googleIframe.includes('</iframe>');
      if (!hasIframe) {
        toast.error('Google Maps: Vui lòng dán đúng mã iframe nhúng.');
        return false;
      }
    }

    if (section === 'advanced' && advancedTab === 'email-config' && canEditEmailConfig) {
      const fromEmail = getStringField('mail_from_email').trim();
      if (fromEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)) {
        toast.error('Email gửi đi không hợp lệ.');
        return false;
      }

      const adminEmailsStr = getStringField('order_notification_emails').trim();
      if (adminEmailsStr) {
        const emails = adminEmailsStr.split(/[,\n;]+/).map((e) => e.trim()).filter(Boolean);
        for (const email of emails) {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error(`Email nhận thông báo "${email}" không hợp lệ.`);
            return false;
          }
        }
      }
    }

    if (section === 'advanced' && advancedTab === 'contact-link' && canEditProductContactLink) {
      const linkType = normalizeProductContactSaleLinkType(form[PRODUCT_CONTACT_SALE_LINK_TYPE_KEY]);
      const customUrl = getStringField(PRODUCT_CONTACT_SALE_CUSTOM_URL_KEY).trim();
      if (linkType === 'custom' && !isValidProductContactSaleCustomUrl(customUrl)) {
        toast.error('Link tùy chỉnh phải bắt đầu bằng /, http(s)://, tel: hoặc mailto:.');
        return false;
      }
    }

    // Validate required fields
    const requiredFields = fieldsData?.filter(f => f.required && f.enabled) ?? [];
    for (const field of requiredFields) {
      const value = form[field.fieldKey];
      if (typeof value === 'string' ? !value.trim() : value === undefined || value === null) {
        toast.error(`${field.name} là bắt buộc`);
        return false;
      }
    }

    return true;
  };

  const validateFavicon = async (): Promise<boolean> => {
    if (!faviconUrl) {
      return true;
    }

    try {
      const dimensions = await getImageDimensionsFromUrl(faviconUrl);
      if (!isAspectRatioMatch(dimensions, 'square')) {
        toast.error('Favicon phải là ảnh vuông tỷ lệ 1:1. Hãy dùng Cắt để chỉnh lại ảnh.');
        return false;
      }
      if (dimensions.width !== FAVICON_DIMENSION || dimensions.height !== FAVICON_DIMENSION) {
        toast.error(`Favicon phải có kích thước đúng ${FAVICON_DIMENSION}x${FAVICON_DIMENSION}px.`);
        return false;
      }
    } catch {
      toast.error('Không thể kiểm tra kích thước favicon hiện tại.');
      return false;
    }

    return true;
  };

  const handleTabChange = (nextTab: AdvancedTab) => {
    if (isShopConfigTab && shopConfigDirty) {
      if (window.confirm('Bạn có thay đổi chưa lưu trong Cấu hình cửa hàng. Nếu chuyển tab, các thay đổi này sẽ bị mất. Bạn có chắc chắn muốn chuyển không?')) {
        setShopConfigDirty(false);
        setAdvancedTab(nextTab);
      }
    } else {
      setAdvancedTab(nextTab);
    }
  };

  const handleSave = async () => {
    if (isShopConfigTab) {
      if (saveShopConfigRef.current) {
        await saveShopConfigRef.current.save();
      }
      return;
    }
 
    if (!validateForm() || !(await validateFavicon())) {return;}
 
    setIsSaving(true);
    try {
      // Get all enabled fields and their groups
      const settingsToSave: SettingsToSave[] = fieldsData
        ?.filter(f => {
          if (!f.enabled) {return false;}
          if (f.fieldKey === 'site_brand_color') {return false;}
          if (HIDDEN_ADMIN_SEO_KEYS.has(f.fieldKey)) {return false;}
          if (REMOVED_CONTACT_KEYS.has(f.fieldKey)) {return false;}
          return !f.linkedFeature || enabledFeatures[f.linkedFeature];
        })
        .map(field => {
          let value = form[field.fieldKey] ?? '';
          if (field.type === 'boolean') {
            value = value === true || value === 'true';
          }
          if (field.fieldKey === 'site_brand_secondary' && (isSecondaryAuto || isSecondaryModeSingle)) {
            value = '';
          }
          return {
            group: field.group ?? 'site',
            key: field.fieldKey,
            ...(field.type === 'image' ? { storageId: mediaStorageIds[field.fieldKey] ?? null } : {}),
            value,
          };
        }) ?? [];

      if (form.contact_lat && !settingsToSave.some((item) => item.key === 'contact_lat')) {
        settingsToSave.push({ group: 'contact', key: 'contact_lat', value: form.contact_lat });
      }
      if (form.contact_lng && !settingsToSave.some((item) => item.key === 'contact_lng')) {
        settingsToSave.push({ group: 'contact', key: 'contact_lng', value: form.contact_lng });
      }
      if (!settingsToSave.some((item) => item.key === 'contact_map_provider')) {
        settingsToSave.push({
          group: 'contact',
          key: 'contact_map_provider',
          value: form.contact_map_provider || 'openstreetmap',
        });
      }
      if (!settingsToSave.some((item) => item.key === 'contact_google_map_embed_iframe')) {
        settingsToSave.push({
          group: 'contact',
          key: 'contact_google_map_embed_iframe',
          value: form.contact_google_map_embed_iframe || '',
        });
      }
      if (!settingsToSave.some((item) => item.key === 'product_image_placeholder')) {
        settingsToSave.push({
          group: 'advanced',
          key: 'product_image_placeholder',
          storageId: mediaStorageIds.product_image_placeholder ?? null,
          value: form.product_image_placeholder || '',
        });
      }
      const frameKeys = [
        'product_frame_overlay_square_url',
        'product_frame_overlay_portrait916_url',
        'product_frame_overlay_portrait34_url',
        'product_frame_overlay_landscape43_url',
        'product_frame_overlay_wide169_url',
      ];
      frameKeys.forEach((key) => {
        if (!settingsToSave.some((item) => item.key === key)) {
          settingsToSave.push({
            group: 'advanced',
            key,
            storageId: mediaStorageIds[key] ?? null,
            value: form[key] || '',
          });
        }
      });
      if (!settingsToSave.some((item) => item.key === 'enable_product_frames')) {
        settingsToSave.push({
          group: 'advanced',
          key: 'enable_product_frames',
          value: form.enable_product_frames === true || form.enable_product_frames === 'true',
        });
      }
      // Save watermark settings
      const watermarkKeys = [
        'enable_product_watermark',
        'product_watermark_image_enabled',
        'product_watermark_image_url',
        'product_watermark_image_x',
        'product_watermark_image_y',
        'product_watermark_image_width',
        'product_watermark_image_opacity',
        'product_watermark_text_enabled',
        'product_watermark_text_content',
        'product_watermark_text_y',
        'product_watermark_text_font_size',
        'product_watermark_text_color',
        'product_watermark_text_opacity',
        'product_watermark_text_repeat',
        'product_watermark_text_vertical_repeat',
        'product_watermark_text_font',
        'product_watermark_text_line_gap',
      ];
      watermarkKeys.forEach((key) => {
        if (!settingsToSave.some((item) => item.key === key)) {
          let value = form[key] ?? '';
          if (
            key === 'enable_product_watermark' ||
            key === 'product_watermark_image_enabled' ||
            key === 'product_watermark_text_enabled' ||
            key === 'product_watermark_text_repeat' ||
            key === 'product_watermark_text_vertical_repeat'
          ) {
            value = form[key] === true || form[key] === 'true';
          }
          settingsToSave.push({
            group: 'advanced',
            key,
            ...(key === 'product_watermark_image_url' ? { storageId: mediaStorageIds.product_watermark_image_url ?? null } : {}),
            value: String(value),
          });
        }
      });
      if (canEditHeaderMenu && !settingsToSave.some((item) => item.key === 'header_config')) {
        settingsToSave.push({
          group: 'site',
          key: 'header_config',
          value: normalizeHeaderConfig(headerConfigDraft),
        });
      }
      if (canEditProductContactLink) {
        if (!settingsToSave.some((item) => item.key === PRODUCT_CONTACT_SALE_LINK_TYPE_KEY)) {
          settingsToSave.push({
            group: 'advanced',
            key: PRODUCT_CONTACT_SALE_LINK_TYPE_KEY,
            value: normalizeProductContactSaleLinkType(form[PRODUCT_CONTACT_SALE_LINK_TYPE_KEY]),
          });
        }
        if (!settingsToSave.some((item) => item.key === PRODUCT_CONTACT_SALE_CUSTOM_URL_KEY)) {
          settingsToSave.push({
            group: 'advanced',
            key: PRODUCT_CONTACT_SALE_CUSTOM_URL_KEY,
            value: form[PRODUCT_CONTACT_SALE_CUSTOM_URL_KEY] || '',
          });
        }
      }
      if (section === 'advanced' && advancedTab === 'email-config' && canEditEmailConfig) {
        EMAIL_SETTING_KEYS.forEach((key) => {
          if (!settingsToSave.some((item) => item.key === key)) {
            settingsToSave.push({
              group: 'mail',
              key,
              value: form[key] ?? EMAIL_DEFAULTS[key],
            });
          }
        });
      }

      const hasSiteUrlChanged = form.site_url !== initialForm.site_url;
      await setMultiple({ settings: settingsToSave });
      void revalidateSiteLayout().catch((err) => {
        console.error('Failed to revalidate site layout:', err);
      });
      if (hasSiteUrlChanged) {
        void revalidateSeoPaths().catch(() => {
          toast.warning('Đã lưu, đồng bộ SEO đang chậm.');
        });
      }
      setInitialForm({ ...form });
      setInitialHeaderConfig(normalizeHeaderConfig(headerConfigDraft));
      toast.success('Đã lưu cài đặt thành công!');
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error(`Lỗi khi lưu: ${error instanceof Error ? error.message : 'Không xác định'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Render field based on type
  const renderField = (field: NonNullable<typeof fieldsData>[number]) => {
    const value = form[field.fieldKey];
    const stringValue = typeof value === 'string' ? value : '';
    const key = field.fieldKey;
    const fieldHelp = SEO_FIELD_HELP[key];
    const metaLimit = SEO_META_LIMITS[key];
    const showCounter = Boolean(metaLimit);
    const counterText = showCounter ? `${stringValue.length}/${metaLimit}` : null;

    switch (field.type) {
      case 'color': {
        if (key === 'site_brand_secondary') {
          const primaryColor = (form.site_brand_primary as string) || '#3b82f6';
          const normalizedPrimary = isValidHexColor(primaryColor) ? primaryColor : '#3b82f6';
          const derivedSecondary = generateComplementary(normalizedPrimary);
          const displayColor = isSecondaryModeSingle ? derivedSecondary : (isSecondaryAuto ? derivedSecondary : stringValue);
          const isSecondaryDisabled = isSecondaryAuto || isSecondaryModeSingle;

          return (
            <div className="space-y-2" key={key}>
              <div className="flex items-center justify-between gap-3">
                <Label className={cn(isSecondaryModeSingle && 'opacity-50')}>{field.name}</Label>
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={isSecondaryAuto}
                    onChange={(e) => {
                      if (isSecondaryModeSingle) {return;}
                      const auto = e.target.checked;
                      setIsSecondaryAuto(auto);
                      if (auto) {
                        updateField(key, '');
                      }
                    }}
                    className="rounded border-slate-300"
                    disabled={isSecondaryModeSingle}
                  />
                  Tự động sinh từ màu chính
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                type="color"
                value={isValidHexColor(displayColor) ? displayColor : derivedSecondary}
                  onChange={(e) => {
                    if (!isSecondaryDisabled) {
                      updateField(key, e.target.value);
                    }
                  }}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700"
                  disabled={isSecondaryDisabled}
                />
                <Input
                  value={(displayColor || '').toUpperCase()}
                  onChange={(e) => {
                    if (!isSecondaryDisabled) {
                      updateField(key, e.target.value);
                    }
                  }}
                  className="w-28 font-mono text-sm uppercase"
                  maxLength={7}
                  placeholder="#000000"
                  disabled={isSecondaryDisabled}
                />
                <Palette size={16} className="text-slate-400" />
              </div>
              {displayColor && isValidHexColor(displayColor) && (
                <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                  {generateTintsShades(displayColor).map((shade, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() =>{
                        if (!isSecondaryDisabled) {
                          updateField(key, shade);
                        }
                      }}
                      className="flex-1 h-8 transition-all hover:scale-y-125 hover:z-10 relative group"
                      style={{ backgroundColor: shade }}
                      title={shade.toUpperCase()}
                      disabled={isSecondaryDisabled}
                    >
                      <span
                        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] font-mono font-bold"
                        style={{ color: idx < 5 ? '#000' : '#fff' }}
                      >
                        {shade.toUpperCase().slice(1)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
        <div className="space-y-2" key={key}>
            <Label>{field.name}</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
              value={isValidHexColor(stringValue) ? stringValue : '#3b82f6'}
                onChange={(e) =>{  updateField(key, e.target.value); }}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 dark:border-slate-700"
              />
              <Input
              value={stringValue.toUpperCase()}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField(key, val);
                }}
                className="w-28 font-mono text-sm uppercase"
                maxLength={7}
                placeholder="#000000"
              />
              <Palette size={16} className="text-slate-400" />
            </div>
            {stringValue && isValidHexColor(stringValue) && (
              <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                {generateTintsShades(stringValue).map((shade, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() =>{  updateField(key, shade); }}
                    className="flex-1 h-8 transition-all hover:scale-y-125 hover:z-10 relative group"
                    style={{ backgroundColor: shade }}
                    title={shade.toUpperCase()}
                  >
                    <span
                      className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 text-[8px] font-mono font-bold"
                      style={{ color: idx < 5 ? '#000' : '#fff' }}
                    >
                      {shade.toUpperCase().slice(1)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'boolean': {
        const checked = value === true || value === 'true';
        return (
          <div className="flex items-center justify-between gap-3" key={key}>
            <Label>{field.name}</Label>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => { updateField(key, e.target.checked); }}
                className="rounded border-slate-300"
              />
              {checked ? 'Đang bật' : 'Đang tắt'}
            </label>
          </div>
        );
      }

      case 'textarea': {
        if (key === 'contact_address') {
          const lat = typeof form.contact_lat === 'string' ? form.contact_lat : '10.762622';
          const lng = typeof form.contact_lng === 'string' ? form.contact_lng : '106.660172';
          const mapProvider = form.contact_map_provider === 'google_embed'
            ? 'google_embed'
            : 'openstreetmap';
          const googleIframe = typeof form.contact_google_map_embed_iframe === 'string'
            ? form.contact_google_map_embed_iframe
            : '';
          const previewSrc = extractIframeSrc(googleIframe);

          return (
            <div className="space-y-2.5" key={key}>
              <div className="relative flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900">
                <div 
                  className="flex h-10 w-11 shrink-0 items-center justify-center rounded-l-[7px] border-r border-slate-100 bg-rose-50/90 text-rose-600 dark:border-slate-800 dark:bg-rose-950/50 dark:text-rose-400"
                  title="Địa chỉ"
                >
                  <MapPin size={16} />
                </div>
                <Input
                  value={stringValue}
                  onChange={(e) => { updateField(key, e.target.value); }}
                  placeholder="Nhập địa chỉ trụ sở / văn phòng..."
                  className="h-10 flex-1 border-0 bg-transparent px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 font-normal"
                />
              </div>

              {/* Map Provider Segmented Toggle & Action */}
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => { updateField('contact_map_provider', 'openstreetmap'); }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      mapProvider === 'openstreetmap'
                        ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    <OsmSvg size={14} />
                    <span>OpenStreetMap</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { updateField('contact_map_provider', 'google_embed'); }}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all",
                      mapProvider === 'google_embed'
                        ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-slate-100"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                    )}
                  >
                    <GoogleMapsSvg size={14} />
                    <span>Google Maps nhúng</span>
                  </button>
                </div>

                {mapProvider === 'google_embed' && (
                  <a
                    href="https://www.google.com/maps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 transition-colors"
                    title="Mở Google Maps để lấy mã nhúng iframe"
                  >
                    <span>Lấy mã Google Maps</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>

              {mapProvider === 'openstreetmap' ? (
                <MapLocationPicker
                  address={stringValue}
                  lat={lat}
                  lng={lng}
                  onLocationChange={(data) => {
                    updateField('contact_address', data.address);
                    updateField('contact_lat', data.lat);
                    updateField('contact_lng', data.lng);
                  }}
                />
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <textarea
                      value={googleIframe}
                      onChange={(e) => { updateField('contact_google_map_embed_iframe', e.target.value); }}
                      className="w-full min-h-[64px] rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 font-mono text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200 dark:focus:bg-slate-900"
                      placeholder='Dán mã <iframe src="https://www.google.com/maps/embed?..."></iframe>'
                    />
                  </div>

                  {previewSrc ? (
                    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-3 py-1.5 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 size={13} />
                          <span>Xem trước bản đồ</span>
                        </div>
                        <span className="text-[10px] text-slate-400">Responsive</span>
                      </div>
                      <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-950">
                        <iframe
                          src={previewSrc}
                          className="h-full w-full border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Google Maps Preview"
                        />
                      </div>
                    </div>
                  ) : googleIframe.trim() ? (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50/80 p-2.5 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span>Mã iframe chưa đúng định dạng. Hãy kiểm tra thuộc tính src trong thẻ &lt;iframe&gt;.</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-2" key={key}>
            <div className="flex items-center justify-between gap-3">
              <Label>{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
              {counterText && (
                <span className={`text-xs ${stringValue.length > metaLimit ? 'text-red-500' : 'text-slate-400'}`}>
                  {counterText}
                </span>
              )}
            </div>
            <textarea
              value={stringValue}
              onChange={(e) =>{  updateField(key, e.target.value); }}
              className="w-full min-h-[80px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              placeholder={fieldHelp?.placeholder ?? `Nhập ${field.name.toLowerCase()}...`}
            />
            {fieldHelp?.help && <p className="text-xs text-slate-500">{fieldHelp.help}</p>}
          </div>
        );
      }

      case 'select': {
        // Handle specific select fields
        if (key === 'site_timezone') {
          return (
            <div className="space-y-2" key={key}>
              <Label>{field.name}</Label>
              <select
                value={stringValue}
                onChange={(e) =>{  updateField(key, e.target.value); }}
                className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="Asia/Ho_Chi_Minh">GMT+07:00 Bangkok, Hanoi, Jakarta</option>
                <option value="Asia/Singapore">GMT+08:00 Singapore, Hong Kong</option>
                <option value="Asia/Tokyo">GMT+09:00 Tokyo, Seoul</option>
                <option value="Europe/London">GMT+00:00 London, Dublin</option>
              </select>
            </div>
          );
        }
        if (key === 'site_language') {
          return (
            <div className="space-y-2" key={key}>
              <Label>{field.name}</Label>
              <select
                value={stringValue}
                onChange={(e) =>{  updateField(key, e.target.value); }}
                className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </div>
          );
        }
        if (key === 'seo_brand_entity_type') {
          return (
            <div className="space-y-2" key={key}>
              <Label>{field.name}</Label>
              <select
                value={stringValue || 'Organization'}
                onChange={(e) =>{  updateField(key, e.target.value); }}
                className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="Organization">Thương hiệu / công ty chung</option>
                <option value="LocalBusiness">Cửa hàng / doanh nghiệp có địa chỉ</option>
                <option value="ProfessionalService">Đơn vị cung cấp dịch vụ chuyên môn</option>
              </select>
              <p className="text-xs text-slate-500">
                Nếu website bán dịch vụ như studio, agency, tư vấn, thiết kế, đào tạo, hãy chọn “Đơn vị cung cấp dịch vụ chuyên môn”.
              </p>
            </div>
          );
        }
        // Default select - render as text input
        return (
          <div className="space-y-2" key={key}>
            <Label>{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            <Input
              value={stringValue}
              onChange={(e) =>{  updateField(key, e.target.value); }}
              placeholder={`Nhập ${field.name.toLowerCase()}...`}
            />
          </div>
        );
      }

      case 'number': {
        return (
          <div className="space-y-2" key={key}>
            <Label>{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            <Input
              type="number"
              value={stringValue}
              onChange={(e) =>{  updateField(key, e.target.value); }}
              placeholder={`Nhập ${field.name.toLowerCase()}...`}
            />
          </div>
        );
      }

      case 'image': {
        const isFaviconField = key === 'site_favicon';
        const isProductPlaceholderField = key === 'product_image_placeholder';
        const isSeoImageField = key === 'seo_og_image';

        return (
          <div className="space-y-2" key={key}>
            <SettingsImageUploader
              label={field.name}
              value={stringValue}
              storageId={mediaStorageIds[key] ?? undefined}
              onChange={(url, storageId) => {
                updateImageField(key, url, storageId);
              }}
              folder="settings"
              previewSize={key.includes('favicon') ? 'sm' : 'md'}
              cropAspectRatio={isFaviconField ? 'square' : undefined}
              targetDimension={isFaviconField ? FAVICON_DIMENSION : undefined}
              smartLogoCrop={false}
            />

            {isFaviconField && (
              <p className="text-xs leading-5 text-slate-500">
                Favicon sẽ được cắt về tỷ lệ vuông 1:1 và xuất đúng 512×512px để hiển thị ổn định trên trình duyệt và Google Search.
              </p>
            )}

            {isFaviconField && (faviconCheckStatus === 'invalid-aspect' || faviconCheckStatus === 'invalid-size' || faviconCheckStatus === 'unavailable') && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
              >
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  {faviconCheckStatus === 'invalid-aspect'
                    ? `${isLegacyFavicon ? 'Favicon legacy hiện tại' : 'Favicon hiện tại'} không hợp lệ vì chưa vuông 1:1. Hãy dùng Cắt hoặc upload icon vuông rồi lưu lại.`
                    : faviconCheckStatus === 'invalid-size'
                      ? `${isLegacyFavicon ? 'Favicon legacy hiện tại' : 'Favicon hiện tại'} chưa đúng kích thước 512×512px. Hãy dùng Cắt hoặc upload lại rồi lưu.`
                      : 'Không thể kiểm tra favicon hiện tại. URL legacy có thể đã hỏng; hãy upload lại icon vuông 512×512px.'}
                </span>
              </div>
            )}

            {isFaviconField && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleUseLogo('site_favicon');
                  }}
                  disabled={!logoValue}
                >
                  Dùng logo hiện tại
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateImageField('site_favicon', '', null);
                  }}
                >
                  Xóa favicon
                </Button>
              </div>
            )}

            {isProductPlaceholderField && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleUseLogo('product_image_placeholder');
                  }}
                  disabled={!logoValue}
                >
                  Dùng logo hiện tại
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateImageField('product_image_placeholder', '', null);
                  }}
                >
                  Xóa placeholder
                </Button>
              </div>
            )}

            {isSeoImageField && (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handleUseLogo('seo_og_image');
                  }}
                  disabled={!logoValue}
                >
                  Dùng logo hiện tại
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    updateImageField('seo_og_image', '', null);
                  }}
                >
                  Xóa ảnh
                </Button>
              </div>
            )}
          </div>
        );
      }

      case 'email': {
        const socialInfo = getSocialOrContactIcon(key, 'email');
        if (socialInfo) {
          return (
            <div key={key} className="relative flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900">
              <div 
                className={cn(
                  "flex h-10 w-11 shrink-0 items-center justify-center rounded-l-[7px] border-r border-slate-100 dark:border-slate-800",
                  socialInfo.bgClass
                )}
                title={socialInfo.label}
              >
                {socialInfo.icon}
              </div>
              <Input
                type="email"
                value={stringValue}
                onChange={(e) => { updateField(key, e.target.value); }}
                placeholder={fieldHelp?.placeholder ?? socialInfo.placeholder ?? "example@domain.com"}
                className="h-10 flex-1 border-0 bg-transparent px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 font-normal"
              />
              {stringValue && (
                <a
                  href={`mailto:${stringValue}`}
                  className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-blue-400"
                  title="Gửi email thử"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-2" key={key}>
            <div className="flex items-center justify-between gap-3">
              <Label>{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            </div>
            <Input
              type="email"
              value={stringValue}
              onChange={(e) => { updateField(key, e.target.value); }}
              placeholder={fieldHelp?.placeholder ?? "example@domain.com"}
            />
            {fieldHelp?.help && <p className="text-xs text-slate-500">{fieldHelp.help}</p>}
          </div>
        );
      }

      case 'phone': {
        const socialInfo = getSocialOrContactIcon(key, 'phone');
        if (socialInfo) {
          return (
            <div key={key} className="relative flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900">
              <div 
                className={cn(
                  "flex h-10 w-11 shrink-0 items-center justify-center rounded-l-[7px] border-r border-slate-100 dark:border-slate-800",
                  socialInfo.bgClass
                )}
                title={socialInfo.label}
              >
                {socialInfo.icon}
              </div>
              <Input
                type="tel"
                value={stringValue}
                onChange={(e) => { updateField(key, e.target.value); }}
                placeholder={fieldHelp?.placeholder ?? socialInfo.placeholder ?? "0901234567"}
                className="h-10 flex-1 border-0 bg-transparent px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 font-normal"
              />
              {stringValue && (
                <a
                  href={`tel:${stringValue.replace(/\s+/g, '')}`}
                  className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-emerald-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-emerald-400"
                  title="Gọi thử"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-2" key={key}>
            <div className="flex items-center justify-between gap-3">
              <Label>{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
            </div>
            <Input
              type="tel"
              value={stringValue}
              onChange={(e) => { updateField(key, e.target.value); }}
              placeholder={fieldHelp?.placeholder ?? "0901234567"}
            />
            {fieldHelp?.help && <p className="text-xs text-slate-500">{fieldHelp.help}</p>}
          </div>
        );
      }

      case 'tags': {
        return (
          <div className="space-y-2" key={key}>
            <Label>{field.name}</Label>
            <TagInput
              value={stringValue}
              onChange={(val) => { updateField(key, val); }}
              placeholder={fieldHelp?.placeholder ?? 'Nhập từ khóa và nhấn Enter...'}
            />
            <p className="text-xs text-slate-500">{fieldHelp?.help ?? 'Nhấn Enter để thêm, Backspace để xóa'}</p>
          </div>
        );
      }

      default: { // Text
        const socialInfo = getSocialOrContactIcon(key, field.type);
        if (socialInfo) {
          const isUrl = stringValue.startsWith('http://') || stringValue.startsWith('https://');
          const testUrl = isUrl 
            ? stringValue 
            : stringValue.startsWith('//')
              ? `https:${stringValue}`
              : stringValue ? `https://${stringValue}` : '';

          return (
            <div key={key} className="relative flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900">
              {/* Leading Brand / Channel Icon */}
              <div 
                className={cn(
                  "flex h-10 w-11 shrink-0 items-center justify-center rounded-l-[7px] border-r border-slate-100 dark:border-slate-800",
                  socialInfo.bgClass
                )}
                title={socialInfo.label}
              >
                {socialInfo.icon}
              </div>

              <Input
                value={stringValue}
                onChange={(e) => { updateField(key, e.target.value); }}
                placeholder={fieldHelp?.placeholder ?? socialInfo.placeholder ?? `Nhập ${field.name.toLowerCase()}...`}
                className="h-10 flex-1 border-0 bg-transparent px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 font-normal"
              />

              {stringValue && testUrl.startsWith('http') && (
                <a
                  href={testUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors dark:hover:bg-slate-800 dark:hover:text-blue-400"
                  title={`Mở ${socialInfo.label}`}
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          );
        }

        return (
          <div className="space-y-2" key={key}>
            <div className="flex items-center justify-between gap-3">
              <Label>{field.name} {field.required && <span className="text-red-500">*</span>}</Label>
              {counterText && (
                <span className={`text-xs ${stringValue.length > metaLimit ? 'text-red-500' : 'text-slate-400'}`}>
                  {counterText}
                </span>
              )}
            </div>
            <Input
              value={stringValue}
              onChange={(e) => { updateField(key, e.target.value); }}
              placeholder={fieldHelp?.placeholder ?? `Nhập ${field.name.toLowerCase()}...`}
            />
            {fieldHelp?.help && <p className="text-xs text-slate-500">{fieldHelp.help}</p>}
          </div>
        );
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isSectionEnabled) {
    return null;
  }

  const currentFields = fieldsByGroup[section] ?? [];
  const socialFields = section === 'contact' ? (fieldsByGroup.social ?? []) : [];
  const seoBrandFields = section === 'seo'
    ? currentFields.filter(field => SEO_BRAND_FIELD_KEY_SET.has(field.fieldKey))
    : [];
  const hasAdvancedPlaceholderField = currentFields.some(field => field.fieldKey === 'product_image_placeholder');
  const headerCta = {
    ...DEFAULT_HEADER_CONFIG.cta,
    ...headerConfigDraft.cta,
  };
  const logoSizeLevel = typeof headerConfigDraft.logoSizeLevel === 'number' ? headerConfigDraft.logoSizeLevel : 2;
  const headerSpacingLevel = typeof headerConfigDraft.headerSpacingLevel === 'number' ? headerConfigDraft.headerSpacingLevel : 5;
  const logoSizeLabel = LOGO_SIZE_OPTIONS[logoSizeLevel - 1]?.label ?? 'Mặc định';
  const headerSpacingLabel = HEADER_SPACING_OPTIONS[headerSpacingLevel - 1]?.label ?? 'Cân bằng';
  const productContactSaleLinkType = normalizeProductContactSaleLinkType(form[PRODUCT_CONTACT_SALE_LINK_TYPE_KEY]);
  const productContactSaleHref = resolveProductContactSaleHref(form);

  const primaryColor = (form.site_brand_primary as string) || '#3b82f6';
  const normalizedPrimary = isValidHexColor(primaryColor) ? primaryColor : '#3b82f6';
  const derivedSecondary = generateComplementary(normalizedPrimary);
  const secondaryValue = typeof form.site_brand_secondary === 'string' ? form.site_brand_secondary : '';
  const displaySecondaryColor = isSecondaryModeSingle ? derivedSecondary : (isSecondaryAuto ? derivedSecondary : secondaryValue);
  const isSecondaryDisabled = isSecondaryAuto || isSecondaryModeSingle;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-28">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Cài đặt hệ thống</h1>
        <p className="text-slate-500">Quản lý các cấu hình chung cho website của bạn.</p>
      </div>

      {currentFields.length > 0 || socialFields.length > 0 || section === 'advanced' ? (
        <div className="space-y-6">
          {section === 'site' ? (
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3 dark:border-slate-800">
                <CardTitle>{GROUP_LABELS[section] || SECTION_LABELS[section]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {/* ── 1. THÔNG TIN WEBSITE ── */}
                <div className="space-y-3.5">
                  <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    {/* Tên website */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Tên website <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={typeof form.site_name === 'string' ? form.site_name : ''}
                        onChange={(e) => updateField('site_name', e.target.value)}
                        placeholder="Ví dụ: Thiên Kim Wine"
                        className="h-9 text-sm"
                      />
                    </div>

                    {/* Slogan */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Slogan / Khẩu hiệu
                      </Label>
                      <Input
                        value={typeof form.site_tagline === 'string' ? form.site_tagline : ''}
                        onChange={(e) => updateField('site_tagline', e.target.value)}
                        placeholder="Ví dụ: Kho vang cho mọi gu"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* URL Website */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Địa chỉ URL Website
                      </Label>
                      {typeof form.site_url === 'string' && form.site_url.trim() && (
                        <a
                          href={form.site_url.startsWith('http') ? form.site_url : `https://${form.site_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 transition-colors"
                        >
                          <span>Mở website</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                    <div className="relative flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs transition-all focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900">
                      <span className="flex h-9 items-center rounded-l-[7px] border-r border-slate-100 bg-slate-50 px-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400 select-none">
                        https://
                      </span>
                      <Input
                        value={typeof form.site_url === 'string' ? form.site_url.replace(/^https?:\/\//i, '') : ''}
                        onChange={(e) => {
                          const raw = e.target.value.trim();
                          updateField('site_url', raw ? `https://${raw.replace(/^https?:\/\//i, '')}` : '');
                        }}
                        placeholder="domain-cua-ban.com hoặc your-site.vercel.app"
                        className="h-9 flex-1 border-0 bg-transparent px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* ── 2. HÌNH ẢNH NHẬN DIỆN (LOGO & FAVICON) ── */}
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="mb-3">
                    <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Hình ảnh nhận diện
                    </Label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Logo chính của website và biểu tượng Favicon tab trình duyệt.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Cột Logo chính */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="relative group/logo-tooltip cursor-help inline-flex items-center gap-1.5">
                          <Label className="text-xs text-slate-600 dark:text-slate-400 group-hover/logo-tooltip:text-slate-900 dark:group-hover/logo-tooltip:text-slate-200 transition-colors cursor-help">
                            Logo website
                          </Label>
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">
                            ?
                          </span>

                          {/* Popover thông tin tối ưu Logo */}
                          <div className="absolute left-0 bottom-full mb-2 w-72 p-3 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur text-white text-[11px] leading-relaxed font-normal rounded-xl shadow-2xl border border-white/10 opacity-0 invisible group-hover/logo-tooltip:opacity-100 group-hover/logo-tooltip:visible transition-all duration-200 z-50 pointer-events-none">
                            <div className="font-semibold text-white border-b border-white/10 pb-1.5 mb-2 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                              Tiêu chuẩn Logo tối ưu hiển thị &amp; SEO
                            </div>
                            <ul className="space-y-1.5 text-slate-300">
                              <li>
                                <strong className="text-white font-medium">Định dạng tối ưu:</strong> <code className="text-emerald-300 font-mono">SVG</code> (tốt nhất, siêu nhẹ ~2-10KB &amp; nét mọi tỉ lệ), <code className="text-emerald-300 font-mono">PNG</code> (nền trong suốt), <code className="text-emerald-300 font-mono">WebP</code>.
                              </li>
                              <li>
                                <strong className="text-white font-medium">Kích thước chuẩn:</strong> Chiều cao từ <span className="text-amber-300 font-semibold">40px – 80px</span>, chiều ngang <span className="text-amber-300 font-semibold">200px – 500px</span>.
                              </li>
                              <li>
                                <strong className="text-white font-medium">Dung lượng:</strong> Dưới <span className="text-amber-300 font-semibold">100 KB</span> để Googlebot quét nhanh, tải trang FCP &lt; 0.8s.
                              </li>
                              <li>
                                <strong className="text-white font-medium">Mẹo:</strong> Nên dùng ảnh nền trong suốt (transparent) để hài hòa trên cả giao diện sáng &amp; tối.
                              </li>
                            </ul>
                            <div className="absolute top-full left-3 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900/95 dark:border-t-slate-800/95" />
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400">PNG / SVG</span>
                      </div>
                      <SettingsImageUploader
                        value={logoValue}
                        storageId={mediaStorageIds.site_logo ?? undefined}
                        onChange={(url, storageId) => {
                          updateImageField('site_logo', url, storageId);
                        }}
                        folder="settings"
                        previewSize="sm"
                        smartLogoCrop={false}
                      />
                    </div>

                    {/* Cột Favicon tab trình duyệt */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="relative group/fav-tooltip cursor-help inline-flex items-center gap-1.5">
                          <Label className="text-xs text-slate-600 dark:text-slate-400 group-hover/fav-tooltip:text-slate-900 dark:group-hover/fav-tooltip:text-slate-200 transition-colors cursor-help">
                            Favicon trình duyệt
                          </Label>
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">
                            ?
                          </span>

                          {/* Popover thông tin tối ưu Favicon */}
                          <div className="absolute left-0 bottom-full mb-2 w-80 p-3 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur text-white text-[11px] leading-relaxed font-normal rounded-xl shadow-2xl border border-white/10 opacity-0 invisible group-hover/fav-tooltip:opacity-100 group-hover/fav-tooltip:visible transition-all duration-200 z-50 pointer-events-none">
                            <div className="font-semibold text-white border-b border-white/10 pb-1.5 mb-2 flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                              Chuẩn Favicon lên nhanh trên Google &amp; Edge
                            </div>
                            <ul className="space-y-1.5 text-slate-300">
                              <li>
                                <strong className="text-white font-medium">Tỉ lệ bắt buộc:</strong> <span className="text-cyan-300 font-semibold">1:1 (Hình vuông)</span>.
                              </li>
                              <li>
                                <strong className="text-white font-medium">Kích thước chuẩn Google:</strong> Bội số của 48px: <code className="text-amber-300 font-mono">48×48</code>, <code className="text-amber-300 font-mono">96×96</code>, <code className="text-amber-300 font-mono">192×192px</code> (hoặc 32×32 / 16×16 cho tab Edge/Chrome).
                              </li>
                              <li>
                                <strong className="text-white font-medium">Định dạng:</strong> <code className="text-cyan-300 font-mono">PNG</code>, <code className="text-cyan-300 font-mono">SVG</code>, <code className="text-cyan-300 font-mono">ICO</code>. Dung lượng dưới <span className="text-amber-300 font-semibold">30 KB</span>.
                              </li>
                              <li>
                                <strong className="text-white font-medium">Mẹo index Google &amp; Edge:</strong> Dùng biểu tượng tối giản, tương phản cao để Google Search tự động nhận diện và hiển thị ngay cạnh tiêu đề tìm kiếm.
                              </li>
                            </ul>
                            <div className="absolute top-full left-3 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-slate-900/95 dark:border-t-slate-800/95" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void handleUseLogo('site_favicon');
                            }}
                            disabled={!logoValue}
                            className="h-6 text-[10px] px-2"
                            title="Tự động copy logo sang làm favicon"
                          >
                            Dùng từ Logo
                          </Button>
                          {faviconUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                updateImageField('site_favicon', '', null);
                              }}
                              className="h-6 text-[10px] px-1.5 text-slate-400 hover:text-red-600"
                            >
                              Xóa
                            </Button>
                          )}
                        </div>
                      </div>

                      <SettingsImageUploader
                        value={faviconUrl}
                        storageId={mediaStorageIds.site_favicon ?? undefined}
                        onChange={(url, storageId) => {
                          updateImageField('site_favicon', url, storageId);
                        }}
                        folder="settings"
                        previewSize="sm"
                        cropAspectRatio="square"
                        targetDimension={FAVICON_DIMENSION}
                        smartLogoCrop={false}
                      />

                      {/* Realistic Chrome Browser Window Mockup */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <span>Xem trước trên trình duyệt</span>
                          <span className="text-[10px] text-slate-400">Live Preview</span>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-slate-300/80 bg-slate-100 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
                          {/* Chrome Tab Bar */}
                          <div className="flex items-center gap-1.5 bg-slate-200/90 px-2.5 pt-2 pb-0 dark:bg-slate-800/90">
                            {/* Active Browser Tab */}
                            <div className="relative flex max-w-[220px] flex-1 items-center gap-1.5 rounded-t-md bg-white px-2.5 py-1.5 shadow-2xs dark:bg-slate-950 border-t border-x border-slate-300/60 dark:border-slate-700">
                              <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-slate-100 dark:bg-slate-800">
                                {faviconUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={faviconUrl} alt="Favicon" className="h-full w-full object-contain" />
                                ) : (
                                  <Globe size={11} className="text-slate-400" />
                                )}
                              </div>
                              <span className="truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">
                                {typeof form.site_name === 'string' && form.site_name.trim()
                                  ? form.site_name
                                  : 'Trang chủ'}
                                {typeof form.site_tagline === 'string' && form.site_tagline.trim()
                                  ? ` – ${form.site_tagline}`
                                  : ''}
                              </span>
                              <div className="ml-auto shrink-0 rounded-full p-0.5 text-slate-400">
                                <X size={10} />
                              </div>
                            </div>

                            {/* New Tab Button '+' */}
                            <div className="flex h-4 w-4 items-center justify-center rounded-full text-slate-500">
                              <Plus size={10} />
                            </div>
                          </div>

                          {/* Chrome Omnibox / URL Bar */}
                          <div className="flex items-center gap-2 border-t border-slate-200 bg-white px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-950">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <ArrowLeft size={11} />
                              <ArrowRight size={11} />
                              <RotateCw size={10} />
                            </div>

                            <div className="flex flex-1 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-mono text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                              <Lock size={10} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="truncate">
                                {typeof form.site_url === 'string' && form.site_url.trim()
                                  ? form.site_url.startsWith('http')
                                    ? form.site_url
                                    : `https://${form.site_url}`
                                  : 'https://domain-cua-ban.com'}
                              </span>
                              <Star size={10} className="ml-auto text-slate-400 shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── 3. MÀU SẮC THƯƠNG HIỆU ── */}
                <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="mb-3">
                    <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Màu sắc thương hiệu
                    </Label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Hệ thống màu chủ đạo áp dụng cho nút bấm, liên kết và điểm nhấn toàn trang.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Màu chính */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">
                        Màu chính (Primary)
                      </Label>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          value={isValidHexColor(primaryColor) ? primaryColor : '#3b82f6'}
                          onChange={(e) => updateField('site_brand_primary', e.target.value)}
                          className="h-9 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900"
                        />
                        <Input
                          value={(primaryColor || '#3B82F6').toUpperCase()}
                          onChange={(e) => updateField('site_brand_primary', e.target.value)}
                          className="h-9 w-28 font-mono text-xs font-semibold uppercase"
                          maxLength={7}
                          placeholder="#3B82F6"
                        />
                        <button
                          type="button"
                          style={{ backgroundColor: isValidHexColor(primaryColor) ? primaryColor : '#3b82f6' }}
                          className="inline-flex h-9 items-center justify-center rounded-md px-3 text-[11px] font-bold text-white shadow-2xs cursor-default shrink-0"
                        >
                          Demo CTA
                        </button>
                      </div>
                    </div>

                    {/* Màu phụ */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-slate-600 dark:text-slate-400">
                          Màu phụ (Secondary)
                        </Label>
                        <label className="flex cursor-pointer items-center gap-1 text-[11px] text-slate-500">
                          <input
                            type="checkbox"
                            checked={isSecondaryAuto}
                            onChange={(e) => {
                              if (isSecondaryModeSingle) return;
                              const auto = e.target.checked;
                              setIsSecondaryAuto(auto);
                              if (auto) {
                                updateField('site_brand_secondary', '');
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            disabled={isSecondaryModeSingle}
                          />
                          <span>Tự động sinh</span>
                        </label>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <input
                          type="color"
                          value={isValidHexColor(displaySecondaryColor) ? displaySecondaryColor : derivedSecondary}
                          onChange={(e) => {
                            if (!isSecondaryDisabled) {
                              updateField('site_brand_secondary', e.target.value);
                            }
                          }}
                          className="h-9 w-10 cursor-pointer rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900 disabled:opacity-50"
                          disabled={isSecondaryDisabled}
                        />
                        <Input
                          value={(displaySecondaryColor || '').toUpperCase()}
                          onChange={(e) => {
                            if (!isSecondaryDisabled) {
                              updateField('site_brand_secondary', e.target.value);
                            }
                          }}
                          className="h-9 w-28 font-mono text-xs font-semibold uppercase disabled:opacity-50"
                          maxLength={7}
                          placeholder="#000000"
                          disabled={isSecondaryDisabled}
                        />
                        <span
                          style={{
                            backgroundColor: isValidHexColor(displaySecondaryColor) ? `${displaySecondaryColor}20` : '#f1f5f9',
                            color: isValidHexColor(displaySecondaryColor) ? displaySecondaryColor : '#334155',
                            borderColor: isValidHexColor(displaySecondaryColor) ? `${displaySecondaryColor}40` : '#cbd5e1',
                          }}
                          className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-[11px] font-bold shadow-2xs cursor-default shrink-0"
                        >
                          Badge Demo
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>{GROUP_LABELS[section] || SECTION_LABELS[section]}</CardTitle>
                {section === 'seo' && (
                  <div className="flex items-center gap-2">
                    <AiSeoImportDialog
                      form={form}
                      onApply={applySeoPayload}
                    />
                    <SeoBuilderDialog
                      form={form}
                      onApply={applySeoPayload}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className={section === 'contact' ? "space-y-2.5" : "space-y-4"}>
                {section === 'contact' && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>Dữ liệu này hiển thị ở trang /contact</span>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-xs"
                      onClick={() => window.open('/contact', '_blank', 'noopener,noreferrer')}
                    >
                      Mở trang
                    </Button>
                  </div>
                )}
                {section === 'advanced' ? (
                  <div className="space-y-6">
                    {/* Segmented Pills Tab Bar */}
                    <div className="flex overflow-x-auto p-1 rounded-xl border border-slate-200 bg-slate-100/90 dark:border-slate-800 dark:bg-slate-900 gap-1 shadow-2xs no-scrollbar">
                      {canEditProductImage && (
                        <button
                          type="button"
                          onClick={() => handleTabChange('product-placeholder')}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                            advancedTab === 'product-placeholder'
                              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          )}
                        >
                          <ImageIcon size={13} />
                          <span>Ảnh sản phẩm</span>
                        </button>
                      )}
                      {canEditProductFrame && (
                        <button
                          type="button"
                          onClick={() => handleTabChange('product-frame')}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                            advancedTab === 'product-frame'
                              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          )}
                        >
                          <Square size={13} />
                          <span>Khung viền</span>
                        </button>
                      )}
                      {canEditProductWatermark && (
                        <button
                          type="button"
                          onClick={() => handleTabChange('watermark')}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                            advancedTab === 'watermark'
                              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          )}
                        >
                          <Layers size={13} />
                          <span>Watermark</span>
                        </button>
                      )}
                      {canEditHeaderMenu && (
                        <button
                          type="button"
                          onClick={() => handleTabChange('header')}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                            advancedTab === 'header'
                              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          )}
                        >
                          <LayoutTemplate size={13} />
                          <span>Header</span>
                        </button>
                      )}
                      {canEditProductSupplemental && (
                        <button
                          type="button"
                          onClick={() => handleTabChange('product-supplemental')}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                            advancedTab === 'product-supplemental'
                              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          )}
                        >
                          <FileText size={13} />
                          <span>Nội dung mô tả SP</span>
                        </button>
                      )}
                      {canEditShopConfig && (
                        <button
                          type="button"
                          onClick={() => handleTabChange('shop-config')}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                            advancedTab === 'shop-config'
                              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          )}
                        >
                          <ShoppingBag size={13} />
                          <span>Cấu hình Shop</span>
                        </button>
                      )}
                      {canEditProductContactLink && (
                        <button
                          type="button"
                          onClick={() => handleTabChange('contact-link')}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                            advancedTab === 'contact-link'
                              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          )}
                        >
                          <PhoneCall size={13} />
                          <span>Nút liên hệ</span>
                        </button>
                      )}
                      {canEditEmailConfig && (
                        <button
                          type="button"
                          onClick={() => handleTabChange('email-config')}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                            advancedTab === 'email-config'
                              ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                          )}
                        >
                          <Mail size={13} />
                          <span>Email</span>
                        </button>
                      )}
                    </div>

                  {advancedTab === 'product-placeholder' && canEditProductImage && (
                    <div className="space-y-4">
                      {currentFields.map(field => renderField(field))}
                      {!hasAdvancedPlaceholderField && (
                        <div className="space-y-2">
                          <SettingsImageUploader
                            label="Ảnh placeholder sản phẩm"
                            value={typeof form.product_image_placeholder === 'string' ? form.product_image_placeholder : ''}
                            storageId={mediaStorageIds.product_image_placeholder ?? undefined}
                            onChange={(url, storageId) => { updateImageField('product_image_placeholder', url, storageId); }}
                            folder="settings"
                            previewSize="md"
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const logoValue = typeof form.site_logo === 'string' ? form.site_logo : '';
                                if (!logoValue) {
                                  toast.error('Chưa có logo để dùng.');
                                  return;
                                }
                                updateImageField('product_image_placeholder', logoValue, mediaStorageIds.site_logo ?? null);
                                toast.success('Đã dùng logo làm placeholder sản phẩm.');
                              }}
                              disabled={typeof form.site_logo !== 'string' || !form.site_logo}
                            >
                              Dùng logo hiện tại
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => { updateImageField('product_image_placeholder', '', null); }}
                            >
                              Xóa placeholder
                            </Button>
                          </div>
                          <p className="text-xs text-slate-500">
                            Dùng khi ảnh sản phẩm bị thiếu hoặc link ảnh lỗi.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {advancedTab === 'product-frame' && canEditProductFrame && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="enable_product_frames"
                            checked={form.enable_product_frames === true}
                            onCheckedChange={(checked) => updateField('enable_product_frames', checked)}
                          />
                          <div className="space-y-0.5">
                            <Label htmlFor="enable_product_frames" className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">Bật khung viền sản phẩm</Label>
                            <p className="text-xs text-slate-500">
                              Hiển thị khung viền đè lên ảnh sản phẩm ở storefront.
                            </p>
                          </div>
                        </div>

                      </div>

                      {form.enable_product_frames !== true && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                          Tính năng đang tắt. Hãy bật lên để hiển thị khung trên ảnh sản phẩm ngoài trang chủ và chi tiết sản phẩm.
                        </div>
                      )}

                      {(() => {
                        const frameItems = [
                          { key: 'product_frame_overlay_square_url', label: 'Vuông (1:1)', value: 'square', aspectClass: 'aspect-square' },
                          { key: 'product_frame_overlay_portrait916_url', label: 'Dọc (9:16)', value: 'portrait916', aspectClass: 'aspect-[9/16]' },
                          { key: 'product_frame_overlay_portrait34_url', label: 'Dọc (3:4)', value: 'portrait34', aspectClass: 'aspect-[3/4]' },
                          { key: 'product_frame_overlay_landscape43_url', label: 'Ngang (4:3)', value: 'landscape43', aspectClass: 'aspect-[4/3]' },
                          { key: 'product_frame_overlay_wide169_url', label: 'Rộng (16:9)', value: 'wide169', aspectClass: 'aspect-[16/9]' },
                        ];
                        const systemAR = (defaultImageAspectRatio?.value as string) || 'square';
                        const activeAR = selectedFrameAR || systemAR;
                        const activeItem = frameItems.find(i => i.value === activeAR) || frameItems[0];
                        const hasValue = typeof form[activeItem.key] === 'string' && form[activeItem.key];
                        const uploadedCount = frameItems.filter(i => typeof form[i.key] === 'string' && form[i.key]).length;

                        return (
                          <div className="space-y-4">
                            {/* Dropdown chọn AR */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex-1">
                                <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Chọn tỷ lệ khung hình</Label>
                                <select
                                  value={activeAR}
                                  onChange={(e) => setSelectedFrameAR(e.target.value)}
                                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                >
                                  {frameItems.map((item) => {
                                    const isSystemDefault = item.value === systemAR;
                                    const hasFrame = typeof form[item.key] === 'string' && form[item.key];
                                    return (
                                      <option key={item.value} value={item.value}>
                                        {item.label}{isSystemDefault ? ' ★ Mặc định' : ''}{hasFrame ? ' ✓' : ''}
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>
                              {uploadedCount > 0 && (
                                <span className="text-xs text-slate-500 dark:text-slate-400 self-end pb-2">
                                  {uploadedCount}/5 khung đã upload
                                </span>
                              )}
                            </div>

                            {/* Uploader cho AR đang chọn */}
                            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{activeItem.label}</span>
                                {activeAR === systemAR && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50">
                                    Đang dùng mặc định
                                  </span>
                                )}
                              </div>

                              <div className="space-y-4">
                                <SettingsImageUploader
                                  key={activeItem.key}
                                  label=""
                                  value={typeof form[activeItem.key] === 'string' ? (form[activeItem.key] as string) : ''}
                                  storageId={mediaStorageIds[activeItem.key] ?? undefined}
                                  onChange={(url, storageId) => { updateImageField(activeItem.key, url, storageId); }}
                                  folder="settings"
                                  previewSize="md"
                                />

                                {hasValue ? (
                                  <div className="space-y-2">
                                    <div className="flex justify-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { updateImageField(activeItem.key, '', null); }}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs px-2 py-1 h-auto"
                                      >
                                        Xóa khung
                                      </Button>
                                    </div>
                                    <div className="flex flex-col items-center">
                                      <div className={cn("relative w-32 max-w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner flex items-center justify-center", activeItem.aspectClass)}>
                                        <img
                                          src={typeof form.product_image_placeholder === 'string' && form.product_image_placeholder ? form.product_image_placeholder : undefined}
                                          alt=""
                                          className="absolute inset-0 w-full h-full object-cover opacity-45"
                                        />
                                        <img
                                          src={form[activeItem.key] as string}
                                          alt="Preview khung viền"
                                          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                        />
                                        <span className="absolute bottom-1 left-0 right-0 text-center text-[9px] font-bold text-slate-500 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs py-0.5">Preview</span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="py-6 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-950/20">
                                    <span className="text-xs text-slate-400 dark:text-slate-500">Chưa upload khung</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {advancedTab === 'watermark' && canEditProductWatermark && (
                    <div className="space-y-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="enable_product_watermark"
                            checked={form.enable_product_watermark === true || form.enable_product_watermark === 'true'}
                            onCheckedChange={(checked) => updateField('enable_product_watermark', checked)}
                          />
                          <div className="space-y-0.5">
                            <Label htmlFor="enable_product_watermark" className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">Bật watermark sản phẩm</Label>
                            <p className="text-xs text-slate-500">
                              Hiển thị watermark (chữ hoặc hình) đè lên ảnh sản phẩm ở storefront.
                            </p>
                          </div>
                        </div>
                      </div>

                      {form.enable_product_watermark !== true && (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                          Tính năng đang tắt. Hãy bật lên để hiển thị watermark trên ảnh sản phẩm ngoài trang chủ và chi tiết sản phẩm.
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                        {/* Cấu hình cột trái (7 cols) */}
                        <div className="lg:col-span-7 space-y-6">
                          {/* 1. Watermark Hình */}
                          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id="product_watermark_image_enabled"
                                  checked={form.product_watermark_image_enabled === true || form.product_watermark_image_enabled === 'true'}
                                  onCheckedChange={(checked) => updateField('product_watermark_image_enabled', checked)}
                                />
                                <Label htmlFor="product_watermark_image_enabled" className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">Bật watermark hình (logo)</Label>
                              </div>
                            </div>

                            {(form.product_watermark_image_enabled === true || form.product_watermark_image_enabled === 'true') && (
                              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <SettingsImageUploader
                                  label="Ảnh logo watermark"
                                  value={typeof form.product_watermark_image_url === 'string' ? form.product_watermark_image_url : ''}
                                  storageId={mediaStorageIds.product_watermark_image_url ?? undefined}
                                  onChange={(url, storageId) => { updateImageField('product_watermark_image_url', url, storageId); }}
                                  folder="settings"
                                  previewSize="md"
                                />

                                {typeof form.product_watermark_image_url === 'string' && form.product_watermark_image_url && (
                                  <div className="space-y-3">
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-xs text-slate-500">
                                        <Label>Độ trong suốt logo</Label>
                                        <span>{form.product_watermark_image_opacity ?? 40}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={parseFloat(String(form.product_watermark_image_opacity ?? 40))}
                                        onChange={(e) => updateField('product_watermark_image_opacity', e.target.value)}
                                        className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-orange-500"
                                      />
                                    </div>
                                    <div className="flex justify-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { updateImageField('product_watermark_image_url', '', null); }}
                                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs px-2 py-1 h-auto"
                                      >
                                        Xóa ảnh logo
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 2. Watermark Chữ */}
                          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  id="product_watermark_text_enabled"
                                  checked={form.product_watermark_text_enabled === true || form.product_watermark_text_enabled === 'true'}
                                  onCheckedChange={(checked) => updateField('product_watermark_text_enabled', checked)}
                                />
                                <Label htmlFor="product_watermark_text_enabled" className="cursor-pointer font-semibold text-slate-900 dark:text-slate-100">Bật watermark chữ</Label>
                              </div>
                            </div>

                            {(form.product_watermark_text_enabled === true || form.product_watermark_text_enabled === 'true') && (
                              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <div className="space-y-1.5">
                                  <Label>Nội dung chữ</Label>
                                  <Input
                                    value={typeof form.product_watermark_text_content === 'string' ? form.product_watermark_text_content : ''}
                                    onChange={(e) => updateField('product_watermark_text_content', e.target.value)}
                                    placeholder="Nhập chữ watermark..."
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5">
                                    <Label>Font chữ</Label>
                                    <select
                                      value={String(form.product_watermark_text_font ?? 'be-vietnam-pro')}
                                      onChange={(e) => updateField('product_watermark_text_font', e.target.value)}
                                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    >
                                      {FONT_REGISTRY.map((font) => (
                                        <option key={font.key} value={font.key}>{font.label}</option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label>Cỡ chữ (px)</Label>
                                    <select
                                      value={String(form.product_watermark_text_font_size ?? '8')}
                                      onChange={(e) => updateField('product_watermark_text_font_size', e.target.value)}
                                      className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                                    >
                                      {Array.from({ length: 30 }, (_, i) => i + 1).map((size) => (
                                        <option key={size} value={size}>{size}px</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1.5 col-span-2">
                                    <Label>Màu chữ</Label>
                                    <div className="flex gap-2">
                                      <input
                                        type="color"
                                        value={typeof form.product_watermark_text_color === 'string' && form.product_watermark_text_color.startsWith('#') ? form.product_watermark_text_color : '#64748B'}
                                        onChange={(e) => updateField('product_watermark_text_color', e.target.value)}
                                        className="w-10 h-10 rounded-md cursor-pointer border border-slate-200 dark:border-slate-700"
                                      />
                                      <Input
                                        value={String(form.product_watermark_text_color ?? '#64748B').toUpperCase()}
                                        onChange={(e) => updateField('product_watermark_text_color', e.target.value)}
                                        className="font-mono text-sm uppercase flex-1"
                                        maxLength={7}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs text-slate-500">
                                    <Label>Độ trong suốt chữ</Label>
                                    <span>{form.product_watermark_text_opacity ?? 35}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={parseFloat(String(form.product_watermark_text_opacity ?? 35))}
                                    onChange={(e) => updateField('product_watermark_text_opacity', e.target.value)}
                                    className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-orange-500"
                                  />
                                </div>

                                {(form.product_watermark_text_vertical_repeat === true || form.product_watermark_text_vertical_repeat === 'true') && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-slate-500">
                                      <Label>Độ giãn hàng dọc (line gap)</Label>
                                      <span>{form.product_watermark_text_line_gap ?? 30}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="10"
                                      max="80"
                                      value={parseFloat(String(form.product_watermark_text_line_gap ?? 30))}
                                      onChange={(e) => updateField('product_watermark_text_line_gap', e.target.value)}
                                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-orange-500"
                                    />
                                  </div>
                                )}

                                <div className="flex flex-col gap-2 pt-1">
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      id="product_watermark_text_repeat"
                                      checked={form.product_watermark_text_repeat === true || form.product_watermark_text_repeat === 'true'}
                                      onCheckedChange={(checked) => updateField('product_watermark_text_repeat', checked)}
                                    />
                                    <Label htmlFor="product_watermark_text_repeat" className="cursor-pointer text-xs text-slate-600 dark:text-slate-400">Lặp watermark chữ theo hàng ngang</Label>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      id="product_watermark_text_vertical_repeat"
                                      checked={form.product_watermark_text_vertical_repeat === true || form.product_watermark_text_vertical_repeat === 'true'}
                                      onCheckedChange={(checked) => updateField('product_watermark_text_vertical_repeat', checked)}
                                    />
                                    <Label htmlFor="product_watermark_text_vertical_repeat" className="cursor-pointer text-xs text-slate-600 dark:text-slate-400">Lặp watermark chữ theo hàng dọc</Label>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Preview cột phải (5 cols) */}
                        <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-4">
                          <div className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col items-center">
                            <Label className="font-semibold text-slate-900 dark:text-slate-100 self-start mb-3">Preview trực quan</Label>

                            <div 
                              ref={previewCanvasRef}
                              className="relative w-64 aspect-square max-w-full border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-inner flex items-center justify-center select-none touch-none"
                              onPointerMove={handlePreviewPointerMove}
                              onPointerUp={handlePreviewPointerUp}
                              onPointerLeave={handlePreviewPointerUp}
                              style={{ cursor: activeDrag ? (activeDrag === 'image-resize' ? 'nwse-resize' : 'move') : 'default' }}
                            >
                              {/* Ảnh placeholder sản phẩm */}
                              <img
                                src={typeof form.product_image_placeholder === 'string' && form.product_image_placeholder ? form.product_image_placeholder : undefined}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none select-none"
                              />

                              {/* Watermark hình */}
                              {(form.product_watermark_image_enabled === true || form.product_watermark_image_enabled === 'true') && typeof form.product_watermark_image_url === 'string' && form.product_watermark_image_url && (
                                <div
                                  className="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 group cursor-move select-none touch-none"
                                  style={{
                                    left: `${form.product_watermark_image_x ?? 80}%`,
                                    top: `${form.product_watermark_image_y ?? 80}%`,
                                    width: `${form.product_watermark_image_width ?? 28}%`,
                                    opacity: (parseFloat(String(form.product_watermark_image_opacity ?? 40))) / 100,
                                  }}
                                  onPointerDown={(e) => handlePreviewPointerDown(e, 'image-move')}
                                  onPointerMove={handlePreviewPointerMove}
                                  onPointerUp={handlePreviewPointerUp}
                                >
                                  <img
                                    src={form.product_watermark_image_url}
                                    alt="Image Watermark"
                                    className="w-full h-auto object-contain pointer-events-none select-none border border-dashed border-transparent hover:border-orange-500 rounded-xs"
                                    draggable="false"
                                  />
                                  {/* Resize handle */}
                                  <div
                                    className="absolute bottom-[-6px] right-[-6px] w-3.5 h-3.5 bg-orange-500 rounded-full border border-white cursor-se-resize shadow-sm hover:scale-125 transition-transform z-20"
                                    onPointerDown={(e) => { e.stopPropagation(); handlePreviewPointerDown(e, 'image-resize'); }}
                                    onPointerMove={handlePreviewPointerMove}
                                    onPointerUp={handlePreviewPointerUp}
                                  />
                                </div>
                              )}

                              {/* Watermark chữ */}
                              {(form.product_watermark_text_enabled === true || form.product_watermark_text_enabled === 'true') && typeof form.product_watermark_text_content === 'string' && form.product_watermark_text_content && (
                                <>
                                  {form.product_watermark_text_vertical_repeat === true || form.product_watermark_text_vertical_repeat === 'true' ? (
                                    Array.from({ length: 21 }, (_, index) => {
                                      const i = index - 10;
                                      const startY = parseFloat(String(form.product_watermark_text_y ?? 80));
                                      const lineGap = parseFloat(String(form.product_watermark_text_line_gap ?? 30));
                                      const topVal = startY + i * lineGap;
                                      if (topVal < -20 || topVal > 120) return null;
                                      const isMain = i === 0;
                                      return (
                                        <div
                                          key={i}
                                          className={cn(
                                            "absolute left-0 right-0 transform -translate-y-1/2 whitespace-nowrap text-center select-none py-1 touch-none",
                                            isMain ? "pointer-events-auto hover:bg-orange-500/10 border-y border-dashed border-transparent hover:border-orange-500" : "pointer-events-none"
                                          )}
                                          style={{
                                            top: `${topVal}%`,
                                            opacity: (parseFloat(String(form.product_watermark_text_opacity ?? 35))) / 100,
                                            color: String(form.product_watermark_text_color ?? '#64748B'),
                                            fontSize: `${form.product_watermark_text_font_size ?? 8}px`,
                                            fontFamily: `var(${resolveFontVariable(String(form.product_watermark_text_font || 'be-vietnam-pro'))}), sans-serif`,
                                            cursor: isMain ? 'ns-resize' : 'default',
                                          }}
                                          onPointerDown={isMain ? (e) => handlePreviewPointerDown(e, 'text-move') : undefined}
                                          onPointerMove={isMain ? handlePreviewPointerMove : undefined}
                                          onPointerUp={isMain ? handlePreviewPointerUp : undefined}
                                        >
                                          {form.product_watermark_text_repeat === true || form.product_watermark_text_repeat === 'true' ? (
                                            <div className="w-full overflow-hidden inline-flex justify-center gap-4">
                                              {Array(8).fill(null).map((_, idx) => (
                                                <span key={idx}>{form.product_watermark_text_content as string}</span>
                                              ))}
                                            </div>
                                          ) : (
                                            <span>{form.product_watermark_text_content}</span>
                                          )}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div
                                      className="absolute left-0 right-0 transform -translate-y-1/2 whitespace-nowrap text-center select-none pointer-events-auto hover:bg-orange-500/10 border-y border-dashed border-transparent hover:border-orange-500 py-1 touch-none"
                                      style={{
                                        top: `${form.product_watermark_text_y ?? 80}%`,
                                        opacity: (parseFloat(String(form.product_watermark_text_opacity ?? 35))) / 100,
                                        color: String(form.product_watermark_text_color ?? '#64748B'),
                                        fontSize: `${form.product_watermark_text_font_size ?? 8}px`,
                                        fontFamily: `var(${resolveFontVariable(String(form.product_watermark_text_font || 'be-vietnam-pro'))}), sans-serif`,
                                        cursor: 'ns-resize',
                                      }}
                                      onPointerDown={(e) => handlePreviewPointerDown(e, 'text-move')}
                                      onPointerMove={handlePreviewPointerMove}
                                      onPointerUp={handlePreviewPointerUp}
                                    >
                                      {form.product_watermark_text_repeat === true || form.product_watermark_text_repeat === 'true' ? (
                                        <div className="w-full overflow-hidden inline-flex justify-center gap-4">
                                          {Array(8).fill(null).map((_, i) => (
                                            <span key={i}>{form.product_watermark_text_content as string}</span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span>{form.product_watermark_text_content}</span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}

                              <span className="absolute bottom-1 right-2 text-[9px] font-bold text-slate-500 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs px-1.5 py-0.5 rounded-sm">Preview</span>
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 text-center space-y-1">
                              <p>💡 <b>Kéo logo hoặc dòng chữ</b> trực tiếp trong ảnh để đổi vị trí.</p>
                              <p>💡 <b>Kéo chấm tròn màu cam</b> ở góc logo để điều chỉnh kích thước.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {advancedTab === 'header' && canEditHeaderMenu && (
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                      <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div className="flex items-start gap-3">
                          <LayoutTemplate className="mt-0.5 h-5 w-5 text-orange-500" />
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Logo Header</h3>
                            <p className="text-xs text-slate-500">
                              Dùng chung với Header Menu ở System Experiences.
                            </p>
                          </div>
                        </div>
                        <SettingsImageUploader
                          label="Logo website"
                          value={typeof form.site_logo === 'string' ? form.site_logo : ''}
                          storageId={mediaStorageIds.site_logo ?? undefined}
                          onChange={(url, storageId) =>{  updateImageField('site_logo', url, storageId); }}
                          folder="settings"
                          previewSize="md"
                          smartLogoCrop={false}
                        />
                        <div className="flex items-center justify-between gap-3">
                          <Label>Tên thương hiệu</Label>
                          <label className="flex items-center gap-2 text-xs text-slate-500">
                            <input
                              type="checkbox"
                              checked={headerConfigDraft.showBrandName !== false}
                              onChange={(event) => updateHeaderConfig('showBrandName', event.target.checked)}
                              className="rounded border-slate-300"
                            />
                            {headerConfigDraft.showBrandName !== false ? 'Đang bật' : 'Đang tắt'}
                          </label>
                        </div>
                        <div className="space-y-2">
                          <Label>Kích thước logo</Label>
                          <select
                            value={logoSizeLevel}
                            onChange={(event) => updateHeaderConfig('logoSizeLevel', Number(event.target.value))}
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            {LOGO_SIZE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Đang chọn: {logoSizeLabel}</div>
                        </div>
                        <div className="space-y-2">
                          <Label>Độ thoáng header</Label>
                          <select
                            value={headerSpacingLevel}
                            onChange={(event) => updateHeaderConfig('headerSpacingLevel', Number(event.target.value))}
                            className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          >
                            {HEADER_SPACING_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <div className="text-xs font-medium text-slate-600 dark:text-slate-400">Đang chọn: {headerSpacingLabel}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                            <Label>Sticky desktop</Label>
                            <input
                              type="checkbox"
                              checked={headerConfigDraft.headerStickyDesktop ?? headerConfigDraft.headerSticky ?? true}
                              onChange={(event) => updateHeaderConfig('headerStickyDesktop', event.target.checked)}
                              className="rounded border-slate-300"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                            <Label>Sticky mobile</Label>
                            <input
                              type="checkbox"
                              checked={headerConfigDraft.headerStickyMobile ?? headerConfigDraft.headerSticky ?? true}
                              onChange={(event) => updateHeaderConfig('headerStickyMobile', event.target.checked)}
                              className="rounded border-slate-300"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Nền logo</Label>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {LOGO_BACKGROUND_OPTIONS.map(option => (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => updateHeaderConfig('logoBackgroundStyle', option.id)}
                                className={cn(
                                  'h-8 rounded-md border text-xs font-medium transition-colors',
                                  (headerConfigDraft.logoBackgroundStyle ?? 'none') === option.id
                                    ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">CTA Header</h3>
                          <p className="text-xs text-slate-500">
                            Mặc định là “Liên hệ” trỏ về /contact, admin có thể đổi text và đường dẫn.
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <Label>Hiển thị CTA</Label>
                          <label className="flex items-center gap-2 text-xs text-slate-500">
                            <input
                              type="checkbox"
                              checked={headerCta.show !== false}
                              onChange={(event) => updateHeaderCta('show', event.target.checked)}
                              className="rounded border-slate-300"
                            />
                            {headerCta.show !== false ? 'Đang bật' : 'Đang tắt'}
                          </label>
                        </div>
                        <div className="space-y-2">
                          <Label>Nhãn CTA</Label>
                          <Input
                            value={headerCta.text ?? 'Liên hệ'}
                            onChange={(event) => updateHeaderCta('text', event.target.value)}
                            placeholder="Liên hệ"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Đường dẫn CTA</Label>
                          <Input
                            value={headerCta.url ?? '/contact'}
                            onChange={(event) => updateHeaderCta('url', event.target.value)}
                            placeholder="/contact"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  {advancedTab === 'product-supplemental' && canEditProductSupplemental && (
                    <ProductSupplementalContentManager />
                  )}
                  {advancedTab === 'shop-config' && canEditShopConfig && (
                    <ShopConfigAdminContainer
                      onDirtyChange={setShopConfigDirty}
                      onSavingChange={setShopConfigSaving}
                      registerSaveRef={(ref) => {
                        saveShopConfigRef.current = ref;
                      }}
                    />
                  )}
                  {advancedTab === 'contact-link' && canEditProductContactLink && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                      <div className="lg:col-span-7 space-y-4">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Đích đến của nút Liên hệ</h3>
                          <p className="text-xs text-slate-500">
                            Khi khách bấm nút "Liên hệ / Nhận báo giá" trên trang chi tiết sản phẩm.
                          </p>
                        </div>

                        {/* Visual Radio Selection Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* 1. Mặc định /contact */}
                          <div
                            onClick={() => updateField(PRODUCT_CONTACT_SALE_LINK_TYPE_KEY, 'contact-page')}
                            className={cn(
                              "cursor-pointer rounded-xl border p-3.5 transition-all relative flex flex-col justify-between",
                              productContactSaleLinkType === 'contact-page'
                                ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 dark:bg-blue-950/30"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                <Globe size={16} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Trang /contact</div>
                                <div className="text-[10px] text-slate-400">Mặc định hệ thống</div>
                              </div>
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              Dẫn khách về form liên hệ chính của website.
                            </div>
                          </div>

                          {/* 2. Zalo */}
                          <div
                            onClick={() => updateField(PRODUCT_CONTACT_SALE_LINK_TYPE_KEY, 'zalo')}
                            className={cn(
                              "cursor-pointer rounded-xl border p-3.5 transition-all relative flex flex-col justify-between",
                              productContactSaleLinkType === 'zalo'
                                ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 dark:bg-blue-950/30"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white font-bold text-[11px]">
                                Zalo
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Chat Zalo</div>
                                <div className="text-[10px] text-blue-600 dark:text-blue-400">Mở app Zalo 1 chạm</div>
                              </div>
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              {getStringField('contact_zalo')
                                ? `Đang dùng Zalo: ${getStringField('contact_zalo')}`
                                : 'Chưa nhập số Zalo ở Thông tin liên hệ'}
                            </div>
                          </div>

                          {/* 3. Messenger */}
                          <div
                            onClick={() => updateField(PRODUCT_CONTACT_SALE_LINK_TYPE_KEY, 'messenger')}
                            className={cn(
                              "cursor-pointer rounded-xl border p-3.5 transition-all relative flex flex-col justify-between",
                              productContactSaleLinkType === 'messenger'
                                ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 dark:bg-blue-950/30"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-tr from-blue-500 via-indigo-500 to-pink-500 text-white">
                                <Send size={15} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Messenger</div>
                                <div className="text-[10px] text-indigo-600 dark:text-indigo-400">Facebook Chat</div>
                              </div>
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              {getStringField('contact_messenger')
                                ? `Đang dùng: ${getStringField('contact_messenger')}`
                                : 'Chưa nhập link Messenger ở Liên hệ'}
                            </div>
                          </div>

                          {/* 4. Phone / Hotline */}
                          <div
                            onClick={() => updateField(PRODUCT_CONTACT_SALE_LINK_TYPE_KEY, 'phone')}
                            className={cn(
                              "cursor-pointer rounded-xl border p-3.5 transition-all relative flex flex-col justify-between",
                              productContactSaleLinkType === 'phone'
                                ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 dark:bg-blue-950/30"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-white">
                                <Phone size={15} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Gọi Hotline</div>
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Quay số điện thoại</div>
                              </div>
                            </div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              {getStringField('contact_phone')
                                ? `Số gọi: ${getStringField('contact_phone')}`
                                : 'Chưa nhập SĐT ở Thông tin liên hệ'}
                            </div>
                          </div>

                          {/* 5. Custom URL */}
                          <div
                            onClick={() => updateField(PRODUCT_CONTACT_SALE_LINK_TYPE_KEY, 'custom')}
                            className={cn(
                              "cursor-pointer rounded-xl border p-3.5 transition-all relative flex flex-col justify-between sm:col-span-2",
                              productContactSaleLinkType === 'custom'
                                ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 dark:bg-blue-950/30"
                                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                            )}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700 text-white dark:bg-slate-600">
                                <ExternalLink size={15} />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Đường dẫn tùy chỉnh</div>
                                <div className="text-[10px] text-slate-500">Tự nhập link nội bộ hoặc link ngoài bất kỳ</div>
                              </div>
                            </div>
                            {productContactSaleLinkType === 'custom' && (
                              <div className="mt-3 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={getStringField(PRODUCT_CONTACT_SALE_CUSTOM_URL_KEY)}
                                  onChange={(event) => updateField(PRODUCT_CONTACT_SALE_CUSTOM_URL_KEY, event.target.value)}
                                  placeholder="Ví dụ: https://t.me/yourusername hoặc /bao-gia"
                                  className="h-9 text-xs font-mono"
                                />
                                <p className="text-[10px] text-slate-400">
                                  Hỗ trợ link nội bộ bắt đầu bằng /, link ngoài https://, tel: hoặc mailto:.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Preview Cột phải */}
                      <div className="lg:col-span-5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60 space-y-3">
                          <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Eye size={14} className="text-blue-600" />
                            Xem trước nút trên trang sản phẩm
                          </Label>
                          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 space-y-3">
                            <div className="inline-flex min-h-10 items-center justify-center rounded-lg bg-blue-600 px-5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90">
                              <PhoneCall size={15} className="mr-2" />
                              Liên hệ nhận báo giá
                            </div>
                            <div className="space-y-1 text-xs text-slate-500">
                              <p className="text-[11px] font-medium text-slate-400">Đích đến khi khách bấm vào:</p>
                              <code className="block break-all rounded-md bg-slate-100 p-2 font-mono text-[11px] text-blue-600 dark:bg-slate-800 dark:text-blue-400">
                                {productContactSaleHref}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {advancedTab === 'email-config' && canEditEmailConfig && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Cấu hình cột trái (7 cols) */}
                      <div className="lg:col-span-7 space-y-6">

                        <div className={`rounded-xl border p-4 ${
                          emailStatus.configured
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100'
                            : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100'
                        }`}>
                          <div className="flex items-start gap-3">
                            {emailStatus.configured ? (
                              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                            ) : (
                              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                            )}
                            <div className="flex-1 space-y-2">
                              <div>
                                <p className="text-sm font-bold">
                                  {emailStatus.configured ? 'Email gửi ra đã sẵn sàng' : 'Dev chưa cấu hình email gửi ra'}
                                </p>
                                <p className="text-xs opacity-80">
                                  {emailStatus.configured
                                    ? 'Email gửi đơn hàng đang sẵn sàng.'
                                    : 'Vui lòng liên hệ dev để bật email gửi ra trước khi dùng gửi thử hoặc thông báo đơn.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Tên người gửi</Label>
                            <Input
                              value={getStringField('mail_from_name', EMAIL_DEFAULTS.mail_from_name)}
                              onChange={(event) => updateField('mail_from_name', event.target.value)}
                              placeholder={getStringField('site_name', 'YourBrand')}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Email nhận thông báo đơn hàng</Label>
                            <Input
                              value={getStringField('order_notification_emails')}
                              onChange={(event) => updateField('order_notification_emails', event.target.value)}
                              placeholder="admin@example.com, manager@example.com"
                            />
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 -mt-2">
                          Để trống sẽ dùng Email ở Cài đặt &gt; Thông tin liên hệ; nếu cả hai trống thì không gửi email admin. Có thể nhập nhiều email, phân tách bằng dấu phẩy, chấm phẩy hoặc xuống dòng.
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                          <div className="space-y-2">
                            <Label>Gửi thử email</Label>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Input
                                type="email"
                                value={testEmail}
                                onChange={(event) => setTestEmail(event.target.value)}
                                placeholder="email-khach@example.com"
                              />
                              <Button
                                type="button"
                                onClick={handleSendTestEmail}
                                disabled={isSendingTestEmail || hasChanges || !savedEmailStatus.configured}
                                className="shrink-0"
                              >
                                {isSendingTestEmail ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Send size={16} className="mr-2" />}
                                {isSendingTestEmail ? 'Đang gửi...' : 'Gửi thử'}
                              </Button>
                            </div>
                            <p className="text-xs text-slate-500">
                              {hasChanges
                                ? 'Lưu thay đổi trước khi gửi thử.'
                                : savedEmailStatus.configured
                                  ? 'Dùng để kiểm tra email gửi ra có đến đúng hộp thư khách hay không.'
                                  : 'Dev chưa cấu hình email gửi ra. Vui lòng liên hệ dev.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Preview cột phải (5 cols) */}
                      <div className="lg:col-span-5 flex flex-col justify-start">
                        <div className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col">
                          <Label className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-1.5">
                            <Eye size={16} className="text-orange-500" /> Preview email gửi khách
                          </Label>

                          {/* Khung giả lập Mail Client */}
                          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-950 text-xs font-sans text-slate-700 dark:text-slate-300">
                            {/* Mail Header */}
                            <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1">
                              <div className="flex justify-between text-slate-400">
                                <span>Từ:</span>
                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                  {emailStatus.configured
                                    ? `${getStringField('mail_from_name', EMAIL_DEFAULTS.mail_from_name)} <${getStringField('mail_from_email', EMAIL_DEFAULTS.mail_from_email)}>`
                                    : 'Dev chưa cấu hình email gửi ra'}
                                </span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Đến:</span>
                                <span className="text-slate-600 dark:text-slate-400">khachhang@gmail.com</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Tiêu đề:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  [{getStringField('mail_from_name', EMAIL_DEFAULTS.mail_from_name)}] Xác nhận đơn hàng #1004
                                </span>
                              </div>
                            </div>

                            {/* Mail Body Container */}
                            <div className="p-4 bg-white dark:bg-slate-900 flex justify-center">
                              {/* Mô phỏng khung email gửi thực tế */}
                              <div className="w-full max-w-sm border border-slate-100 dark:border-slate-800 rounded-md p-4 bg-slate-50/50 dark:bg-slate-950/50 space-y-4 shadow-xs">
                                {/* Email header logo */}
                                <div className="text-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                  <div className="font-bold text-sm text-slate-800 dark:text-slate-200 tracking-wide uppercase">
                                    {getStringField('mail_from_name', EMAIL_DEFAULTS.mail_from_name)}
                                  </div>
                                </div>

                                {/* Greeting */}
                                <div className="space-y-1">
                                  <p className="font-semibold text-[11px] text-slate-800 dark:text-slate-200">Chào Nguyễn Văn A,</p>
                                  <p className="text-[10px] text-slate-500 leading-relaxed">Cảm ơn bạn đã mua sắm tại {getStringField('mail_from_name', EMAIL_DEFAULTS.mail_from_name)}! Đơn hàng của bạn đã được nhận và đang chờ xử lý.</p>
                                </div>

                                {/* Order details */}
                                <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-sm space-y-2">
                                  <div className="flex justify-between text-[10px] font-bold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                                    <span>ĐƠN HÀNG #1004</span>
                                    <span className="text-orange-500 font-medium">Chờ xử lý</span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] text-slate-500">
                                      <span>Sản phẩm:</span>
                                      <span className="font-medium text-slate-700 dark:text-slate-300">Giày Sneaker Adidas Samba (Size 41) x 1</span>
                                    </div>
                                    <div className="flex justify-between text-[9px] text-slate-500">
                                      <span>Tổng cộng:</span>
                                      <span className="font-bold text-slate-800 dark:text-slate-200">2.500.000 đ</span>
                                    </div>
                                    <div className="flex justify-between text-[9px] text-slate-500">
                                      <span>Hình thức:</span>
                                      <span className="text-slate-600 dark:text-slate-400">Thanh toán chuyển khoản (VietQR)</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Call to action */}
                                <div className="text-center pt-2">
                                  <div className="inline-block bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[9px] font-bold px-4 py-1.5 rounded-md shadow-sm">
                                    Xem chi tiết đơn hàng
                                  </div>
                                </div>

                                {/* Footer sign */}
                                <div className="text-center pt-3 border-t border-slate-100 dark:border-slate-800 text-[9px] text-slate-400">
                                  <p>Trân trọng,</p>
                                  <p className="font-semibold text-slate-500 dark:text-slate-300">Đội ngũ {getStringField('mail_from_name', EMAIL_DEFAULTS.mail_from_name)}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 text-center">
                            💡 Tiêu đề và nội dung email tự động đồng bộ theo <b>Tên người gửi</b>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : section === 'seo' ? (
                <div className="space-y-6">
                  {/* Sub-tab pills */}
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/90 p-1 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setSeoTab('basic')}
                      className={cn(
                        "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
                        seoTab === 'basic'
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      )}
                    >
                      Cơ bản & Mạng xã hội
                    </button>
                    <button
                      type="button"
                      onClick={() => setSeoTab('brand')}
                      className={cn(
                        "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all",
                        seoTab === 'brand'
                          ? "bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      )}
                    >
                      Nhận diện thương hiệu SEO
                    </button>
                  </div>

                  {/* 2-Column Clean Layout: Left Form (7 cols) - Right Preview (5 cols) */}
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* Cột trái (7 cols): Input Form phẳng, thoáng */}
                    <div className="lg:col-span-7 space-y-5">
                      {seoTab === 'basic' ? (
                        <>
                          {/* Tiêu đề SEO (seo_title) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                Tiêu đề SEO trang chủ (Title) <span className="text-red-500">*</span>
                              </Label>
                              <span className={cn(
                                "text-[11px] font-mono",
                                (typeof form.seo_title === 'string' ? form.seo_title.length : 0) > 60
                                  ? "text-red-500 font-bold"
                                  : "text-slate-400"
                              )}>
                                {typeof form.seo_title === 'string' ? form.seo_title.length : 0}/60 ký tự
                              </span>
                            </div>
                            <Input
                              value={typeof form.seo_title === 'string' ? form.seo_title : ''}
                              onChange={(e) => updateField('seo_title', e.target.value)}
                              placeholder="Ví dụ: Kho vang cho mọi gu – Thiên Kim Wine"
                              className="h-9 text-sm"
                            />
                            <p className="text-[11px] text-slate-400">
                              Khuyên dùng 40 – 60 ký tự để không bị cắt cụt trên Google.
                            </p>
                          </div>

                          {/* Mô tả SEO (seo_description) */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                Mô tả SEO trang chủ (Meta Description) <span className="text-red-500">*</span>
                              </Label>
                              <span className={cn(
                                "text-[11px] font-mono",
                                (typeof form.seo_description === 'string' ? form.seo_description.length : 0) > 160
                                  ? "text-red-500 font-bold"
                                  : "text-slate-400"
                              )}>
                                {typeof form.seo_description === 'string' ? form.seo_description.length : 0}/160 ký tự
                              </span>
                            </div>
                            <textarea
                              value={typeof form.seo_description === 'string' ? form.seo_description : ''}
                              onChange={(e) => updateField('seo_description', e.target.value)}
                              placeholder="Thiên Kim Wine mang đến kho vang đa dạng cho mọi gu thưởng thức..."
                              className="w-full min-h-[85px] rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            />
                            <p className="text-[11px] text-slate-400">
                              Khuyên dùng 120 – 160 ký tự để đoạn trích hiển thị đầy đủ và hấp dẫn.
                            </p>
                          </div>

                          {/* Từ khóa SEO (seo_keywords) */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              Từ khóa SEO (Keywords)
                            </Label>
                            <TagInput
                              value={typeof form.seo_keywords === 'string' ? form.seo_keywords : ''}
                              onChange={(val) => updateField('seo_keywords', val)}
                              placeholder="Nhập từ khóa và nhấn Enter..."
                            />
                          </div>

                          {/* Ảnh Open Graph (seo_og_image) */}
                          <div className="space-y-2 border-t border-slate-100 pt-4 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  Ảnh chia sẻ mạng xã hội (OG Image)
                                </Label>
                                <p className="text-[11px] text-slate-400">
                                  Khuyên dùng 1200×630px. Hiển thị khi gửi link qua Zalo, Facebook, iMessage...
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleUseLogo('seo_og_image')}
                                disabled={!logoValue}
                                className="h-7 text-xs px-2.5"
                                title="Dùng logo chính làm ảnh chia sẻ"
                              >
                                Dùng từ Logo
                              </Button>
                            </div>
                            <SettingsImageUploader
                              value={typeof form.seo_og_image === 'string' ? form.seo_og_image : ''}
                              storageId={mediaStorageIds.seo_og_image ?? undefined}
                              onChange={(url, storageId) => {
                                updateImageField('seo_og_image', url, storageId);
                              }}
                              folder="settings"
                              previewSize="sm"
                              cropAspectRatio={{ label: 'OG Image 1200×630', value: 1200 / 630, cssValue: '1200 / 630' }}
                              smartLogoCrop={false}
                            />
                          </div>
                        </>
                      ) : (
                        seoBrandFields.map(field => renderField(field))
                      )}
                    </div>

                    {/* Cột phải (5 cols): 1 Khung Live Preview duy nhất gọn gàng có tab toggle */}
                    <div className="lg:col-span-5">
                      <div className="sticky top-6 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/50 space-y-3.5">
                        {/* Header của Khung Live Preview */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Xem trước thực tế
                          </span>

                          {/* Mini Segmented Switcher */}
                          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setSeoPreviewTab('google')}
                              className={cn(
                                "flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-all",
                                seoPreviewTab === 'google'
                                  ? "bg-slate-900 text-white shadow-2xs dark:bg-slate-100 dark:text-slate-900 font-semibold"
                                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                              )}
                            >
                              <Search size={11} />
                              <span>Google Search</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSeoPreviewTab('social')}
                              className={cn(
                                "flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium transition-all",
                                seoPreviewTab === 'social'
                                  ? "bg-slate-900 text-white shadow-2xs dark:bg-slate-100 dark:text-slate-900 font-semibold"
                                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                              )}
                            >
                              <Share2 size={11} />
                              <span>Zalo / Facebook</span>
                            </button>
                          </div>
                        </div>

                        {/* Nội dung Live Preview */}
                        {seoPreviewTab === 'google' ? (
                          <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-950 font-sans shadow-2xs">
                            {/* Breadcrumb */}
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                              <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center overflow-hidden rounded-xs bg-slate-100 dark:bg-slate-800">
                                {faviconUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={faviconUrl} alt="Favicon" className="h-full w-full object-contain" />
                                ) : (
                                  <Globe size={10} />
                                )}
                              </div>
                              <span className="truncate font-normal text-slate-600 dark:text-slate-300">
                                {typeof form.site_url === 'string' && form.site_url.trim()
                                  ? form.site_url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
                                  : 'domain-cua-ban.com'}
                              </span>
                              <span>›</span>
                              <span>trang-chu</span>
                            </div>

                            {/* Clickable Title */}
                            <h4 className="text-[13px] font-medium text-blue-700 hover:underline dark:text-blue-400 line-clamp-2 cursor-pointer leading-snug">
                              {typeof form.seo_title === 'string' && form.seo_title.trim()
                                ? form.seo_title
                                : typeof form.site_name === 'string' && form.site_name.trim()
                                  ? form.site_name
                                  : 'Tiêu đề website của bạn'}
                            </h4>

                            {/* Snippet Description */}
                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                              {typeof form.seo_description === 'string' && form.seo_description.trim()
                                ? form.seo_description
                                : 'Mô tả tóm tắt về trang web của bạn sẽ hiển thị ở đây trên kết quả tìm kiếm Google nhằm thu hút người dùng bấm vào...'}
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 shadow-2xs">
                            {/* Image preview */}
                            <div className="relative aspect-[1.91/1] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                              {typeof form.seo_og_image === 'string' && form.seo_og_image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={form.seo_og_image}
                                  alt="OG Image Preview"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="text-center p-4 text-slate-400">
                                  <Share2 size={22} className="mx-auto mb-1 opacity-40" />
                                  <span className="text-[10px]">Chưa có ảnh chia sẻ</span>
                                </div>
                              )}
                            </div>

                            {/* Card Text Info */}
                            <div className="p-3 space-y-1 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                              <div className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                                {typeof form.site_url === 'string' && form.site_url.trim()
                                  ? form.site_url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
                                  : 'DOMAIN-CUA-BAN.COM'}
                              </div>
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                                {typeof form.seo_title === 'string' && form.seo_title.trim()
                                  ? form.seo_title
                                  : typeof form.site_name === 'string' && form.site_name.trim()
                                    ? form.site_name
                                    : 'Tiêu đề website'}
                              </div>
                              <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {typeof form.seo_description === 'string' && form.seo_description.trim()
                                  ? form.seo_description
                                  : 'Mô tả trang web khi chia sẻ liên kết qua tin nhắn.'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                currentFields.map(field => renderField(field))
              )}
            </CardContent>
          </Card>
          )}
          {section === 'contact' && socialFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{GROUP_LABELS.social}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {socialFields.map(field => renderField(field))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            Không có trường nào được bật cho nhóm này.
          </CardContent>
        </Card>
      )}

      {!(section === 'advanced' && advancedTab === 'product-supplemental' && canEditProductSupplemental) && (
        <HomeComponentStickyFooter
          isSubmitting={isCurrentlySaving}
          submitLabel="Lưu thay đổi"
          hasChanges={hasChanges}
          submitType="button"
          onClickSave={handleSave}
        />
      )}
    </div>
  );
}
