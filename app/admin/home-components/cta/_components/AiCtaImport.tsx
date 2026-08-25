'use client';

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui';
import { AiImportDialogShell } from '@/app/admin/components/AiImportDialogShell';
import type { CTAConfig } from '../_types';
import { useTypeAiImportEnabled } from '../../_shared/hooks/useTypeAiImportEnabled';
import { HomeComponentFooterActionPortal } from '../../_shared/components/HomeComponentFooterActions';

const AI_CTA_PROMPT = `Hãy tạo nội dung CTA cho website doanh nghiệp tiếng Việt.
Chỉ trả về JSON hợp lệ, không giải thích.
Schema: { "cta": { "title": "string", "description": "string max 200", "buttonText": "string", "buttonLink": "string", "secondaryButtonText": "string optional", "secondaryButtonLink": "string optional", "badge": "string optional" } }`;

const SAMPLE_CTA_JSON = `{
  "cta": {
    "title": "Bắt đầu ngay hôm nay",
    "description": "Hơn 1000+ doanh nghiệp đã tin tưởng. Đăng ký miễn phí.",
    "buttonText": "Dùng thử",
    "buttonLink": "/signup",
    "secondaryButtonText": "Tìm hiểu",
    "secondaryButtonLink": "/about",
    "badge": "Ưu đãi"
  }
}`;

const trim = (v: unknown, n: number) => { if (typeof v !== 'string' && typeof v !== 'number') return ''; return String(v).trim().slice(0, n); };

const parseAiCta = (raw: string): { item: Partial<CTAConfig> | null; errors: string[] } => {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { errors: ['JSON chưa hợp lệ.'], item: null }; }
  const src = typeof parsed === 'object' && parsed !== null && typeof (parsed as Record<string, unknown>).cta === 'object'
    ? (parsed as { cta: Record<string, unknown> }).cta
    : typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null;
  if (!src) return { errors: ['Cần { "cta": {...} }'], item: null };
  const title = trim(src.title, 120);
  if (!title) return { errors: ['Thiếu title.'], item: null };
  return {
    errors: [],
    item: {
      title,
      description: trim(src.description, 300),
      buttonText: trim(src.buttonText, 60) || 'Liên hệ',
      buttonLink: trim(src.buttonLink, 300) || '/contact',
      secondaryButtonText: trim(src.secondaryButtonText, 60),
      secondaryButtonLink: trim(src.secondaryButtonLink, 300),
      badge: trim(src.badge, 60),
    },
  };
};

export function AiCtaImport({ onApply }: { buttonClassName?: string; onApply: (item: Partial<CTAConfig>) => void }) {
  const isAiImportEnabled = useTypeAiImportEnabled();
  const [open, setOpen] = useState(false);

  if (!isAiImportEnabled) {
    return null;
  }

  const handleParse = (rawInput: string) => {
    const res = parseAiCta(rawInput);
    return { data: res.item, errors: res.errors };
  };

  const handleApply = (item: Partial<CTAConfig>) => {
    onApply(item);
    toast.success('Đã nhập nội dung CTA');
  };

  return (
    <>
      <HomeComponentFooterActionPortal>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <Bot size={16} /> Import AI
        </Button>
      </HomeComponentFooterActionPortal>

      <AiImportDialogShell<Partial<CTAConfig>>
        open={open}
        onOpenChange={setOpen}
        title="Import CTA bằng AI"
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={AI_CTA_PROMPT}
        sampleJson={SAMPLE_CTA_JSON}
        directSessionId="admin-cta-import"
        directPlaceholder="Ví dụ: CTA mời đăng ký tư vấn khóa học 3D miễn phí, button Liên hệ tư vấn, link /lien-he."
        parse={handleParse}
        renderPreview={(item) => (
          <div className="space-y-1 text-xs">
            {item.badge && <span className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">{item.badge}</span>}
            <p className="font-semibold text-slate-800 dark:text-slate-100">{item.title}</p>
            {item.description && <p className="text-slate-500">{item.description}</p>}
            <div className="flex gap-2 text-[11px] text-slate-400 pt-1">
              <span>🔘 {item.buttonText} ({item.buttonLink})</span>
              {item.secondaryButtonText && <span>🔘 {item.secondaryButtonText}</span>}
            </div>
          </div>
        )}
        applyButtonText="Áp dụng vào form"
        onApply={handleApply}
      />
    </>
  );
}
