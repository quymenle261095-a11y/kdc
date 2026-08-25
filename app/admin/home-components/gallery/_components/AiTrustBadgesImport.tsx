'use client';

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui';
import { AiImportDialogShell } from '@/app/admin/components/AiImportDialogShell';
import type { GalleryItem } from '../_types';
import { useTypeAiImportEnabled } from '../../_shared/hooks/useTypeAiImportEnabled';
import { HomeComponentFooterActionPortal } from '../../_shared/components/HomeComponentFooterActions';

const MAX_ITEMS = 20;

const AI_TRUST_BADGES_PROMPT = `Hãy tạo danh sách chứng nhận/uy tín cho website doanh nghiệp tiếng Việt theo phong cách SaaS sạch, giống các website thương mại điện tử chuyên nghiệp.

Chỉ trả về JSON hợp lệ, không dùng markdown fence, không giải thích.

Schema bắt buộc:
{
  "badges": [
    {
      "name": "string, bắt buộc, tên chứng nhận hoặc cam kết uy tín",
      "link": "string, tùy chọn, URL kiểm chứng nếu có",
      "url": "string, tùy chọn, URL ảnh/logo chứng nhận nếu có"
    }
  ]
}

Yêu cầu:
- Tạo 4-8 chứng nhận/cam kết ngắn, dễ scan.
- Phù hợp thị trường Việt Nam.
- Ưu tiên nội dung thật sự tăng niềm tin: Chính hãng, Bảo hành, Đổi trả, Thanh toán an toàn, Giao hàng, Bảo mật, Đối tác, Chứng nhận.
- Nếu không có URL ảnh thật thì để "url": "".
- Không tạo field ngoài schema.
- Trả về 1 object JSON có key "badges".`;

const SAMPLE_TRUST_BADGES_JSON = `{
  "badges": [
    { "name": "Hàng chính hãng 100%", "link": "", "url": "" },
    { "name": "Bảo hành minh bạch", "link": "", "url": "" },
    { "name": "Thanh toán an toàn", "link": "", "url": "" },
    { "name": "Đổi trả trong 7 ngày", "link": "", "url": "" },
    { "name": "Giao hàng toàn quốc", "link": "", "url": "" },
    { "name": "Bảo mật thông tin", "link": "", "url": "" }
  ]
}`;

type ParseResult = {
  items: GalleryItem[] | null;
  errors: string[];
};

const trimText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string' && typeof value !== 'number') { return ''; }
  return String(value).trim().slice(0, maxLength);
};

const parseAiTrustBadges = (raw: string): ParseResult => {
  let parsed: unknown;
  const errors: string[] = [];

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { errors: ['JSON chưa hợp lệ. Hãy dán object có key "badges".'], items: null };
  }

  let sourceArray: unknown[];
  if (typeof parsed === 'object' && parsed !== null && 'badges' in parsed && Array.isArray((parsed as { badges: unknown }).badges)) {
    sourceArray = (parsed as { badges: unknown[] }).badges;
  } else if (Array.isArray(parsed)) {
    sourceArray = parsed;
  } else {
    return { errors: ['Root JSON phải là { "badges": [...] } hoặc mảng chứng nhận.'], items: null };
  }

  if (sourceArray.length === 0) {
    return { errors: ['Danh sách chứng nhận trống.'], items: null };
  }

  if (sourceArray.length > MAX_ITEMS) {
    errors.push(`Tối đa ${MAX_ITEMS} chứng nhận, nhận được ${sourceArray.length}. Chỉ lấy ${MAX_ITEMS} đầu tiên.`);
  }

  const items = sourceArray.slice(0, MAX_ITEMS).reduce<GalleryItem[]>((acc, itemRaw, index) => {
    if (typeof itemRaw !== 'object' || itemRaw === null) {
      errors.push(`Chứng nhận ${index + 1}: phải là object.`);
      return acc;
    }

    const record = itemRaw as Record<string, unknown>;
    const name = trimText(record.name ?? record.title, 120);
    const link = trimText(record.link, 500);
    const url = trimText(record.url ?? record.image, 500);

    if (!name) {
      errors.push(`Chứng nhận ${index + 1}: thiếu name.`);
      return acc;
    }

    acc.push({
      id: `ai-trust-${Date.now()}-${index}`,
      link,
      name,
      url,
    });

    return acc;
  }, []);

  if (items.length === 0) {
    return { errors: [...errors, 'Không có chứng nhận hợp lệ nào.'], items: null };
  }

  return { errors, items: errors.length === 0 ? items : null };
};

export function AiTrustBadgesImport({
  onApply,
}: {
  buttonClassName?: string;
  onApply: (items: GalleryItem[]) => void;
}) {
  const isAiImportEnabled = useTypeAiImportEnabled();
  const [open, setOpen] = useState(false);

  if (!isAiImportEnabled) {
    return null;
  }

  const handleParse = (rawInput: string) => {
    const res = parseAiTrustBadges(rawInput);
    return { data: res.items, errors: res.errors };
  };

  const handleApply = (items: GalleryItem[]) => {
    onApply(items);
    toast.success(`Đã nhập ${items.length} chứng nhận`);
  };

  return (
    <>
      <HomeComponentFooterActionPortal>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <Bot size={16} /> Import AI
        </Button>
      </HomeComponentFooterActionPortal>

      <AiImportDialogShell<GalleryItem[]>
        open={open}
        onOpenChange={setOpen}
        title="Import Chứng nhận bằng AI"
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={AI_TRUST_BADGES_PROMPT}
        sampleJson={SAMPLE_TRUST_BADGES_JSON}
        directSessionId="admin-trust-badges-import"
        directPlaceholder="Ví dụ: Tạo 6 cam kết uy tín cho website bán phụ kiện tủ bếp: chính hãng, bảo hành, đổi trả, tư vấn, giao hàng."
        parse={handleParse}
        renderPreview={(items) => (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2 rounded-md border border-slate-100 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-100">{item.name}</p>
                  {item.link && <p className="truncate text-slate-500">{item.link}</p>}
                  {item.url && <p className="truncate text-[10px] text-slate-400">ảnh: {item.url}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        applyButtonText="Áp dụng vào form"
        onApply={handleApply}
      />
    </>
  );
}
