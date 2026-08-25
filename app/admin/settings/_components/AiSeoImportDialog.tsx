'use client';

import React, { useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui';
import { AiImportDialogShell } from '../../components/AiImportDialogShell';
import {
  buildAiFillMissingPrompt,
  buildAiFillMissingSample,
  mergeAiMissingFields,
} from '@/lib/ai-import/fill-missing';

export type AiSeoImportPayload = {
  seo_title?: string;
  seo_description?: string;
  seo_keywords?: string;
  seo_brand_aliases?: string;
  seo_brand_summary?: string;
  seo_brand_entity_type?: string;
  seo_brand_search_queries?: string;
  seo_brand_topics?: string;
  seo_brand_services?: string;
  seo_brand_audience?: string;
  seo_brand_differentiators?: string;
  seo_brand_proof_points?: string;
  seo_brand_same_as?: string;
  seo_site_search_path?: string;
};

const SAMPLE_JSON = `{
  "seo_title": "Dịch vụ dựng hình 3D chuyên nghiệp | Dohy Studio",
  "seo_description": "Dohy Studio cung cấp hình ảnh 3D, render kiến trúc và animation chuyên nghiệp cho thương hiệu cần visual bán hàng rõ nét.",
  "seo_keywords": "dịch vụ dựng hình 3D, render kiến trúc, animation 3D, Dohy Studio",
  "seo_brand_aliases": "Dohy, Dohy Studio, DOHY Media, dohystudio, dohy studio",
  "seo_brand_summary": "Dohy Studio là studio hình ảnh 3D chuyên render kiến trúc, diễn họa sản phẩm, animation và visual marketing cho doanh nghiệp.",
  "seo_brand_entity_type": "ProfessionalService",
  "seo_brand_search_queries": "dohy, dohystudio, dohy studio, dohy media",
  "seo_brand_topics": "3D visualization, architectural rendering, product rendering, animation 3D, visual marketing",
  "seo_brand_services": "dựng hình 3D, render kiến trúc, render sản phẩm, làm video 3D quảng cáo, animation 3D",
  "seo_brand_audience": "Doanh nghiệp, chủ dự án, kiến trúc sư và đội marketing cần hình ảnh 3D chất lượng để bán hàng hoặc thuyết trình.",
  "seo_brand_differentiators": "Tập trung vào hình ảnh sắc nét, quy trình rõ ràng, output phù hợp marketing và tư vấn theo mục tiêu kinh doanh.",
  "seo_brand_proof_points": "Portfolio dự án thực tế, quy trình sản xuất minh bạch, hỗ trợ tư vấn trước khi triển khai."
}`;

const buildPrompt = (form: Record<string, string | boolean>) => {
  const siteName = form.site_name || '[Tên thương hiệu]';
  const siteDesc = form.site_tagline || '[Mô tả website]';
  const hotline = form.contact_hotline || '[Hotline]';

  return `Bạn là chuyên gia SEO và viết nội dung website.

Nhiệm vụ: Tạo bộ SEO cho trang chủ và phần nhận diện thương hiệu. Output phải giúp Google và các công cụ AI hiểu đúng thương hiệu, kể cả khi người dùng gõ viết liền, viết rời, viết hoa/thường hoặc tên cũ.

Thông tin doanh nghiệp (Context):
- Tên thương hiệu: ${siteName}
- Mô tả/Ngành nghề: ${siteDesc}
- Liên hệ: ${hotline}

Quy tắc bắt buộc:
1. Mô tả trang phải trả lời nhanh: thương hiệu làm gì, giúp ai, lợi ích chính là gì. Không dùng từ sáo rỗng.
2. Không nhồi từ khóa. Dùng từ tự nhiên, bám đúng sản phẩm/dịch vụ thật.
3. Meta Title (seo_title):
   - Tối đa 60 ký tự.
   - Đưa dịch vụ hoặc chủ đề chính lên đầu.
   - Kết thúc bằng tên thương hiệu.
4. Meta Description (seo_description):
   - Tối đa 160 ký tự.
   - Nói rõ lợi ích chính trong 120 ký tự đầu.
   - Có lời mời hành động nhẹ nếu phù hợp.
5. Keywords (seo_keywords): 3-5 từ khóa chính, cách nhau dấu phẩy.
6. Tên gọi khác (seo_brand_aliases): Liệt kê tên chính, tên viết tắt, tên viết liền, tên viết rời, tên cũ nếu có. Ví dụ: "Dohy, Dohy Studio, DOHY Media, dohystudio, dohy studio".
7. Cách khách tìm thương hiệu (seo_brand_search_queries): Liệt kê các cách người dùng có thể gõ tên thương hiệu. Không thêm đối thủ.
8. Chủ đề và dịch vụ chính: Dùng cụm thật, gần với sản phẩm/dịch vụ đang bán.
9. Giọng văn rõ ràng, đáng tin, không clickbait.

Output rule:
- Chỉ trả về JSON hợp lệ với cấu trúc như sau.
- Không dùng markdown fence.
- Không giải thích ngoài JSON.

Cấu trúc bắt buộc:
{
  "seo_title": "string, max 60 chars",
  "seo_description": "string, max 160 chars",
  "seo_keywords": "string, comma separated",
  "seo_brand_aliases": "string, comma separated",
  "seo_brand_summary": "string, 1-2 sentences",
  "seo_brand_entity_type": "Organization | LocalBusiness | ProfessionalService",
  "seo_brand_search_queries": "string, comma separated",
  "seo_brand_topics": "string, comma separated",
  "seo_brand_services": "string, comma separated",
  "seo_brand_audience": "string",
  "seo_brand_differentiators": "string",
  "seo_brand_proof_points": "string"
}`;
};

const trimText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string') { return ''; }
  return value.trim().slice(0, maxLength);
};

const parseAiEntity = (raw: string, fallbackItem?: AiSeoImportPayload) => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { errors: ['JSON chưa hợp lệ. Hãy kiểm tra lại cú pháp.'], data: null };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { errors: ['Root JSON phải là object.'], data: null };
  }

  const record = parsed as Record<string, unknown>;
  const errors: string[] = [];
  
  if (!record.seo_title && !fallbackItem?.seo_title) {
    errors.push('Thiếu tiêu đề SEO (seo_title).');
  }

  if (errors.length > 0) {
    return { errors, data: null };
  }

  const data: AiSeoImportPayload = {
    seo_title: trimText(record.seo_title ?? fallbackItem?.seo_title, 255),
    seo_description: trimText(record.seo_description, 1000),
    seo_keywords: trimText(record.seo_keywords, 500),
    seo_brand_aliases: trimText(record.seo_brand_aliases, 500),
    seo_brand_summary: trimText(record.seo_brand_summary, 1200),
    seo_brand_entity_type: trimText(record.seo_brand_entity_type, 80),
    seo_brand_search_queries: trimText(record.seo_brand_search_queries, 500),
    seo_brand_topics: trimText(record.seo_brand_topics, 700),
    seo_brand_services: trimText(record.seo_brand_services, 700),
    seo_brand_audience: trimText(record.seo_brand_audience, 1200),
    seo_brand_differentiators: trimText(record.seo_brand_differentiators, 1200),
    seo_brand_proof_points: trimText(record.seo_brand_proof_points, 1200),
  };

  return { errors: [], data };
};

export function AiSeoImportDialog({
  form,
  onApply,
}: {
  form: Record<string, string | boolean>;
  onApply: (item: AiSeoImportPayload) => void;
}) {
  const [open, setOpen] = useState(false);

  const currentSeoData = useMemo<AiSeoImportPayload>(() => ({
    seo_brand_aliases: String(form.seo_brand_aliases || ''),
    seo_brand_audience: String(form.seo_brand_audience || ''),
    seo_brand_differentiators: String(form.seo_brand_differentiators || ''),
    seo_brand_entity_type: String(form.seo_brand_entity_type || ''),
    seo_brand_proof_points: String(form.seo_brand_proof_points || ''),
    seo_brand_search_queries: String(form.seo_brand_search_queries || ''),
    seo_brand_services: String(form.seo_brand_services || ''),
    seo_brand_summary: String(form.seo_brand_summary || ''),
    seo_brand_topics: String(form.seo_brand_topics || ''),
    seo_description: String(form.seo_description || ''),
    seo_keywords: String(form.seo_keywords || ''),
    seo_title: String(form.seo_title || ''),
  }), [form]);

  const basePrompt = useMemo(() => buildPrompt(form), [form]);

  const fillMissingPrompt = useMemo(
    () => buildAiFillMissingPrompt(basePrompt, currentSeoData, { contextLabel: 'Dữ liệu SEO hiện có' }),
    [basePrompt, currentSeoData]
  );

  const fillMissingSampleJson = useMemo(
    () => buildAiFillMissingSample(SAMPLE_JSON, currentSeoData),
    [currentSeoData]
  );

  const handleApply = (item: AiSeoImportPayload) => {
    const finalItem = mergeAiMissingFields(currentSeoData, item) as AiSeoImportPayload;
    onApply(finalItem);
    toast.success('Đã áp dụng thông tin SEO từ AI vào form!');
  };

  return (
    <>
      <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
        <Bot size={16} /> Import AI
      </Button>

      <AiImportDialogShell<AiSeoImportPayload>
        open={open}
        onOpenChange={setOpen}
        title="Tạo SEO bằng AI"
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={basePrompt}
        sampleJson={SAMPLE_JSON}
        enableFillMissing
        fillMissingPrompt={fillMissingPrompt}
        fillMissingSampleJson={fillMissingSampleJson}
        fillMissingHint="Chỉ điền các trường SEO còn trống."
        directSessionId="admin-seo-import"
        directPlaceholder="Ví dụ: Thương hiệu Dohy Studio chuyên dựng hình 3D, kiến trúc và animation..."
        parse={(rawInput, isFillMissing) => parseAiEntity(rawInput, isFillMissing ? currentSeoData : undefined)}
        renderPreview={(data) => (
          <div className="space-y-1.5 text-xs">
            {data.seo_title && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Tiêu đề: </span>
                <span className="text-blue-600 dark:text-blue-400 font-medium">{data.seo_title}</span>
              </div>
            )}
            {data.seo_description && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Mô tả: </span>
                <span className="text-slate-600 dark:text-slate-400">{data.seo_description}</span>
              </div>
            )}
            {data.seo_keywords && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Từ khóa: </span>
                <span className="text-slate-500">{data.seo_keywords}</span>
              </div>
            )}
            {data.seo_brand_summary && (
              <div>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Giới thiệu: </span>
                <span className="text-slate-600 dark:text-slate-400">{data.seo_brand_summary}</span>
              </div>
            )}
          </div>
        )}
        onApply={handleApply}
        applyButtonText="Áp dụng vào Form SEO"
      />
    </>
  );
}
