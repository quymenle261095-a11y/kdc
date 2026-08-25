'use client';

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui';
import { AiImportDialogShell } from '@/app/admin/components/AiImportDialogShell';
import type { CountdownConfigState } from '../_types';
import { useTypeAiImportEnabled } from '../../_shared/hooks/useTypeAiImportEnabled';
import { HomeComponentFooterActionPortal } from '../../_shared/components/HomeComponentFooterActions';

const AI_COUNTDOWN_PROMPT = `Hãy tạo nội dung countdown/khuyến mãi cho website doanh nghiệp tiếng Việt.

Chỉ trả về JSON hợp lệ, không dùng markdown fence, không giải thích.

Schema bắt buộc:
{
  "countdown": {
    "heading": "string, tiêu đề chính (VD: Flash Sale - Giảm giá sốc!)",
    "subHeading": "string, tiêu đề phụ",
    "description": "string, mô tả ngắn, tối đa 200 ký tự",
    "endDate": "string, ISO datetime (VD: 2026-12-31T23:59)",
    "buttonText": "string, text nút (VD: Mua ngay)",
    "buttonLink": "string, link nút (VD: /products)",
    "discountText": "string, text giảm giá (VD: -50%)",
    "backgroundImage": "string, URL ảnh nền optional"
  }
}

Yêu cầu:
- Nội dung tự nhiên, phù hợp thị trường Việt Nam.
- endDate phải là ngày tương lai.
- Trả về 1 object JSON có key "countdown".`;

const SAMPLE_COUNTDOWN_JSON = `{
  "countdown": {
    "heading": "Flash Sale - Giảm giá sốc!",
    "subHeading": "Ưu đãi có hạn",
    "description": "Nhanh tay đặt hàng trước khi hết thời gian khuyến mãi. Giảm đến 50% toàn bộ sản phẩm.",
    "endDate": "2026-12-31T23:59",
    "buttonText": "Mua ngay",
    "buttonLink": "/products",
    "discountText": "-50%",
    "backgroundImage": ""
  }
}`;

type ParseResult = {
  item: Partial<CountdownConfigState> | null;
  errors: string[];
};

const trimText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string' && typeof value !== 'number') { return ''; }
  return String(value).trim().slice(0, maxLength);
};

const parseAiCountdown = (raw: string): ParseResult => {
  let parsed: unknown;
  const errors: string[] = [];

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { errors: ['JSON chưa hợp lệ. Hãy dán object có key "countdown".'], item: null };
  }

  const source = typeof parsed === 'object' && parsed !== null && typeof (parsed as { countdown?: unknown }).countdown === 'object' && (parsed as { countdown?: unknown }).countdown !== null
    ? (parsed as { countdown: Record<string, unknown> }).countdown
    : typeof parsed === 'object' && parsed !== null
      ? parsed as Record<string, unknown>
      : null;

  if (!source) {
    return { errors: ['Root JSON phải là { "countdown": {...} } hoặc object countdown.'], item: null };
  }

  const heading = trimText(source.heading, 120);
  const subHeading = trimText(source.subHeading, 120);
  const description = trimText(source.description, 300);
  const endDate = trimText(source.endDate, 30);
  const buttonText = trimText(source.buttonText, 60);
  const buttonLink = trimText(source.buttonLink, 300);
  const discountText = trimText(source.discountText, 30);
  const backgroundImage = trimText(source.backgroundImage, 500);

  if (!heading) { errors.push('Thiếu heading.'); }
  if (!endDate) { errors.push('Thiếu endDate.'); }

  if (errors.length > 0) {
    return { errors, item: null };
  }

  return {
    errors: [],
    item: {
      heading,
      subHeading,
      description,
      endDate,
      buttonText: buttonText || 'Mua ngay',
      buttonLink: buttonLink || '/products',
      discountText,
      backgroundImage,
    },
  };
};

export function AiCountdownImport({
  onApply,
}: {
  buttonClassName?: string;
  onApply: (item: Partial<CountdownConfigState>) => void;
}) {
  const isAiImportEnabled = useTypeAiImportEnabled();
  const [open, setOpen] = useState(false);

  if (!isAiImportEnabled) {
    return null;
  }

  const handleParse = (rawInput: string) => {
    const res = parseAiCountdown(rawInput);
    return { data: res.item, errors: res.errors };
  };

  const handleApply = (item: Partial<CountdownConfigState>) => {
    onApply(item);
    toast.success('Đã nhập nội dung Countdown');
  };

  return (
    <>
      <HomeComponentFooterActionPortal>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <Bot size={16} /> Import AI
        </Button>
      </HomeComponentFooterActionPortal>

      <AiImportDialogShell<Partial<CountdownConfigState>>
        open={open}
        onOpenChange={setOpen}
        title="Import Countdown bằng AI"
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={AI_COUNTDOWN_PROMPT}
        sampleJson={SAMPLE_COUNTDOWN_JSON}
        directSessionId="admin-countdown-import"
        directPlaceholder="Ví dụ: Tạo countdown ưu đãi khai giảng khóa học 3D, hết hạn cuối tháng, CTA Đăng ký ngay."
        parse={handleParse}
        renderPreview={(item) => (
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-slate-800 dark:text-slate-100">{item.heading}</p>
            {item.subHeading && <p className="text-slate-500">{item.subHeading}</p>}
            {item.description && <p className="text-slate-400 line-clamp-2">{item.description}</p>}
            <div className="flex gap-3 text-[11px] text-slate-400 pt-1">
              <span>⏰ {item.endDate}</span>
              {item.discountText && <span className="font-bold text-red-500">{item.discountText}</span>}
              <span>🔗 {item.buttonText}</span>
            </div>
          </div>
        )}
        applyButtonText="Áp dụng vào form"
        onApply={handleApply}
      />
    </>
  );
}
