'use client';

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui';
import { AiImportDialogShell } from '@/app/admin/components/AiImportDialogShell';
import { createAboutEditorFeature, createAboutEditorStat, normalizeAboutImages, normalizeAboutStyle } from '../_lib/constants';
import type { AboutEditorState } from '../_types';
import { useTypeAiImportEnabled } from '../../_shared/hooks/useTypeAiImportEnabled';
import { HomeComponentFooterActionPortal } from '../../_shared/components/HomeComponentFooterActions';

const MAX_FEATURES = 6;

const AI_ABOUT_PROMPT = `Hãy tạo nội dung "Về chúng tôi" cho website doanh nghiệp tiếng Việt.

Chỉ trả về JSON hợp lệ, không dùng markdown fence, không giải thích.

Schema bắt buộc:
{
  "about": {
    "subHeading": "string, bắt buộc",
    "heading": "string, bắt buộc",
    "highlightText": "string optional",
    "description": "string, bắt buộc, tối đa 500 ký tự",
    "phone": "string optional",
    "image": "URL ảnh http/https hoặc path bắt đầu bằng /, optional",
    "images": ["URL ảnh 1", "URL ảnh 2", "URL ảnh 3"],
    "imageCaption": "string optional",
    "stats": [{ "value": "18+", "label": "năm kinh nghiệm" }],
    "buttonText": "string optional",
    "buttonLink": "string optional",
    "style": "classic | bento | minimal | split | timeline | showcase | spaCollage | solarFeature",
    "features": [
      {
        "title": "string, bắt buộc",
        "iconName": "string tên icon Lucide optional",
        "image": "URL ảnh optional",
        "mediaType": "icon | image"
      }
    ]
  }
}

Yêu cầu:
- Nội dung tự nhiên, phù hợp thị trường Việt Nam.
- Tạo 3-6 features.
- Link ảnh phải dùng URL ảnh hợp lệ, không dùng base64.
- Không tạo field ngoài schema.
- Trả về 1 object JSON có key "about".`;

const SAMPLE_ABOUT_JSON = `{
  "about": {
    "subHeading": "VỀ CHÚNG TÔI",
    "heading": "Kiến tạo giải pháp số cho",
    "highlightText": "doanh nghiệp Việt",
    "description": "Chúng tôi đồng hành cùng doanh nghiệp xây dựng hệ thống vận hành hiện đại, tối ưu trải nghiệm khách hàng và tăng trưởng bền vững.",
    "phone": "1800 6750",
    "image": "https://images.unsplash.com/photo-1552664730-d307ca884978",
    "images": [
      "https://images.unsplash.com/photo-1552664730-d307ca884978",
      "https://images.unsplash.com/photo-1556761175-b413da4baf72",
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902"
    ],
    "imageCaption": "Đội ngũ tận tâm, quy trình rõ ràng, kết quả đo lường được.",
    "stats": [{ "value": "18+", "label": "năm kinh nghiệm" }],
    "buttonText": "Tìm hiểu thêm",
    "buttonLink": "/about",
    "style": "bento",
    "features": [
      { "title": "Tư vấn tận tâm", "iconName": "Heart", "mediaType": "icon" },
      { "title": "Triển khai nhanh", "iconName": "Zap", "mediaType": "icon" },
      { "title": "Hiệu quả bền vững", "iconName": "TrendingUp", "mediaType": "icon" }
    ]
  }
}`;

type ParseResult = {
  item: Partial<AboutEditorState> | null;
  errors: string[];
};

const trimText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string' && typeof value !== 'number') { return ''; }
  return String(value).trim().slice(0, maxLength);
};

const isValidImageUrl = (value: string) => {
  if (!value) { return true; }
  if (value.startsWith('/')) { return true; }
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const parseAiAbout = (raw: string): ParseResult => {
  let parsed: unknown;
  const errors: string[] = [];

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { errors: ['JSON chưa hợp lệ. Hãy dán object có key "about".'], item: null };
  }

  const source = typeof parsed === 'object' && parsed !== null && typeof (parsed as { about?: unknown }).about === 'object' && (parsed as { about?: unknown }).about !== null
    ? (parsed as { about: Record<string, unknown> }).about
    : typeof parsed === 'object' && parsed !== null
      ? parsed as Record<string, unknown>
      : null;

  if (!source) {
    return { errors: ['Root JSON phải là object hoặc { "about": {...} }.'], item: null };
  }

  const heading = trimText(source.heading, 140);
  const subHeading = trimText(source.subHeading, 80);
  const description = trimText(source.description, 500);

  if (!heading) {
    errors.push('Thiếu trường heading.');
  }

  if (!subHeading) {
    errors.push('Thiếu trường subHeading.');
  }

  if (!description) {
    errors.push('Thiếu trường description.');
  }

  const image = trimText(source.image, 500);
  if (image && !isValidImageUrl(image)) {
    errors.push('Trường image phải là URL http/https hoặc đường dẫn /...');
  }

  const images = Array.isArray(source.images)
    ? source.images
      .map((item) => trimText(item, 500))
      .filter((item) => item.length > 0)
    : [];

  const invalidImage = images.find((item) => !isValidImageUrl(item));
  if (invalidImage) {
    errors.push(`Ảnh không hợp lệ trong mảng images: "${invalidImage}".`);
  }

  const rawFeatures = Array.isArray(source.features) ? source.features : [];
  if (rawFeatures.length > MAX_FEATURES) {
    errors.push(`Tối đa ${MAX_FEATURES} features, nhận được ${rawFeatures.length}. Hệ thống sẽ lấy ${MAX_FEATURES} mục đầu.`);
  }

  const features = rawFeatures.slice(0, MAX_FEATURES).reduce<AboutEditorState['features']>((acc, item, index) => {
    if (typeof item !== 'object' || item === null) {
      errors.push(`Feature ${index + 1}: phải là object.`);
      return acc;
    }

    const record = item as Record<string, unknown>;
    const title = trimText(record.title, 100);
    const iconName = trimText(record.iconName, 80);
    const featureImage = trimText(record.image, 500);
    const mediaType = record.mediaType === 'image' ? 'image' : 'icon';

    if (!title) {
      errors.push(`Feature ${index + 1}: thiếu title.`);
      return acc;
    }

    if (featureImage && !isValidImageUrl(featureImage)) {
      errors.push(`Feature ${index + 1}: URL ảnh không hợp lệ.`);
    }

    acc.push(createAboutEditorFeature({
      id: `about-ai-feature-${Date.now()}-${index}`,
      iconName: iconName || undefined,
      image: featureImage || undefined,
      mediaType,
      title,
    }));

    return acc;
  }, []);

  const rawStats = Array.isArray(source.stats) ? source.stats : [];

  if (errors.length > 0) {
    return { errors, item: null };
  }

  return {
    errors: [],
    item: {
      buttonLink: trimText(source.buttonLink, 200),
      buttonText: trimText(source.buttonText, 60),
      description,
      features,
      heading,
      highlightText: trimText(source.highlightText, 120),
      image,
      imageCaption: trimText(source.imageCaption, 180),
      images: normalizeAboutImages(images, image),
      stats: rawStats.slice(0, 1).map((item, index) => {
        if (typeof item !== 'object' || item === null) {
          return createAboutEditorStat({ id: `about-ai-stat-${Date.now()}-${index}`, value: '18+', label: 'năm kinh nghiệm' });
        }
        const record = item as Record<string, unknown>;
        return createAboutEditorStat({
          id: `about-ai-stat-${Date.now()}-${index}`,
          value: trimText(record.value, 40) || '18+',
          label: trimText(record.label, 80) || 'năm kinh nghiệm',
        });
      }),
      phone: trimText(source.phone, 50),
      style: normalizeAboutStyle(source.style),
      subHeading,
    },
  };
};

export function AiAboutImport({
  onApply,
}: {
  buttonClassName?: string;
  onApply: (item: Partial<AboutEditorState>) => void;
}) {
  const isAiImportEnabled = useTypeAiImportEnabled();
  const [open, setOpen] = useState(false);

  if (!isAiImportEnabled) {
    return null;
  }

  const handleParse = (rawInput: string) => {
    const res = parseAiAbout(rawInput);
    return { data: res.item, errors: res.errors };
  };

  const handleApply = (item: Partial<AboutEditorState>) => {
    onApply(item);
    toast.success('Đã nhập nội dung Về chúng tôi');
  };

  return (
    <>
      <HomeComponentFooterActionPortal>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <Bot size={16} /> Import AI
        </Button>
      </HomeComponentFooterActionPortal>

      <AiImportDialogShell<Partial<AboutEditorState>>
        open={open}
        onOpenChange={setOpen}
        title="Import Về chúng tôi bằng AI"
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={AI_ABOUT_PROMPT}
        sampleJson={SAMPLE_ABOUT_JSON}
        directSessionId="admin-about-import"
        directPlaceholder="Ví dụ: Viết giới thiệu Dohy Studio, chuyên đào tạo 3D và tài nguyên thiết kế, giọng chuyên nghiệp, có 3 số liệu và 4 điểm mạnh."
        parse={handleParse}
        renderPreview={(item) => (
          <div className="space-y-1 text-xs">
            <p className="font-medium uppercase tracking-wide text-slate-500">{item.subHeading}</p>
            <p className="font-semibold text-slate-800 dark:text-slate-100">{[item.heading, item.highlightText].filter(Boolean).join(' ')}</p>
            <p className="line-clamp-2 text-slate-500">{item.description}</p>
            <p className="text-[11px] text-slate-400">{item.features?.length ?? 0} điểm nổi bật • {item.style}</p>
          </div>
        )}
        applyButtonText="Áp dụng vào form"
        onApply={handleApply}
      />
    </>
  );
}
