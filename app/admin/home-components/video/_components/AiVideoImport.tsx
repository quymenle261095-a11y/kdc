'use client';

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui';
import { AiImportDialogShell } from '@/app/admin/components/AiImportDialogShell';
import type { VideoConfig } from '../_types';
import { useTypeAiImportEnabled } from '../../_shared/hooks/useTypeAiImportEnabled';
import { HomeComponentFooterActionPortal } from '../../_shared/components/HomeComponentFooterActions';

const AI_VIDEO_PROMPT = `Hãy tạo nội dung video section cho website doanh nghiệp tiếng Việt.
Chỉ trả về JSON hợp lệ, không giải thích.
Schema: { "video": { "videoUrl": "YouTube/Vimeo URL", "heading": "string", "description": "string max 200", "badge": "string optional", "buttonText": "string optional", "buttonLink": "string optional" } }`;

const SAMPLE_VIDEO_JSON = `{
  "video": {
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "heading": "Khám phá câu chuyện của chúng tôi",
    "description": "Video giới thiệu về hành trình phát triển và sứ mệnh của công ty.",
    "badge": "Video mới",
    "buttonText": "Xem thêm",
    "buttonLink": "/about"
  }
}`;

const trim = (v: unknown, n: number) => { if (typeof v !== 'string' && typeof v !== 'number') return ''; return String(v).trim().slice(0, n); };

const parseAiVideo = (raw: string): { item: Partial<VideoConfig> | null; errors: string[] } => {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return { errors: ['JSON chưa hợp lệ.'], item: null }; }
  const src = typeof parsed === 'object' && parsed !== null && typeof (parsed as Record<string, unknown>).video === 'object'
    ? (parsed as { video: Record<string, unknown> }).video
    : typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : null;
  if (!src) return { errors: ['Cần { "video": {...} }'], item: null };
  const videoUrl = trim(src.videoUrl, 500);
  if (!videoUrl) return { errors: ['Thiếu videoUrl.'], item: null };
  return {
    errors: [],
    item: {
      videoUrl,
      heading: trim(src.heading, 120),
      description: trim(src.description, 300),
      badge: trim(src.badge, 60),
      buttonText: trim(src.buttonText, 60),
      buttonLink: trim(src.buttonLink, 300),
    },
  };
};

export function AiVideoImport({ onApply }: { buttonClassName?: string; onApply: (item: Partial<VideoConfig>) => void }) {
  const isAiImportEnabled = useTypeAiImportEnabled();
  const [open, setOpen] = useState(false);

  if (!isAiImportEnabled) {
    return null;
  }

  const handleParse = (rawInput: string) => {
    const res = parseAiVideo(rawInput);
    return { data: res.item, errors: res.errors };
  };

  const handleApply = (item: Partial<VideoConfig>) => {
    onApply(item);
    toast.success('Đã nhập nội dung Video');
  };

  return (
    <>
      <HomeComponentFooterActionPortal>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <Bot size={16} /> Import AI
        </Button>
      </HomeComponentFooterActionPortal>

      <AiImportDialogShell<Partial<VideoConfig>>
        open={open}
        onOpenChange={setOpen}
        title="Import Video bằng AI"
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={AI_VIDEO_PROMPT}
        sampleJson={SAMPLE_VIDEO_JSON}
        directSessionId="admin-video-import"
        directPlaceholder="Ví dụ: Tạo section video giới thiệu Dohy Studio, dùng video YouTube hiện có, CTA Xem khóa học."
        parse={handleParse}
        renderPreview={(item) => (
          <div className="space-y-1 text-xs">
            {item.badge && <span className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">{item.badge}</span>}
            <p className="font-semibold text-slate-800 dark:text-slate-100">{item.heading}</p>
            {item.description && <p className="text-slate-500">{item.description}</p>}
            <p className="text-[11px] text-slate-400 truncate">🎬 {item.videoUrl}</p>
            {item.buttonText && <p className="text-[11px] text-slate-400">🔘 {item.buttonText} ({item.buttonLink})</p>}
          </div>
        )}
        applyButtonText="Áp dụng vào form"
        onApply={handleApply}
      />
    </>
  );
}
