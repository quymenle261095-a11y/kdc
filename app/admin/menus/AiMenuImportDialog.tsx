'use client';

import React, { useMemo } from 'react';
import { AiImportDialogShell } from '../components/AiImportDialogShell';
import {
  buildAiFillMissingPrompt,
  buildAiFillMissingSample,
} from '@/lib/ai-import/fill-missing';
import { parseAiMenuInput, type AiMenuLine } from './_ai-menu-parser';

/* ────────────────────────────────────────────────────────────
   MEGA PROMPT — Menu structure
   ──────────────────────────────────────────────────────────── */

const MENU_MEGA_PROMPT = `Bạn là chuyên gia thiết kế navigation menu cho website.

Tạo cấu trúc menu điều hướng header hoàn chỉnh theo JSON cho website.

## NGUYÊN TẮC (BẮT BUỘC)

1. **Chỉ trả label**: mỗi item chỉ cần "label". URL do hệ thống tự gán.
2. **Hỗ trợ menu con**: dùng "children" để tạo cấp con (tối đa 3 tầng).
3. **Nội dung thực tế**: tiếng Việt, tự nhiên, không placeholder.
4. **Không link ngoài**: không URL bên ngoài, không http.
5. **Menu ngắn gọn**: 5–12 mục cấp 1, mỗi mục tối đa 8 con.

## CẤU TRÚC JSON OUTPUT

\`\`\`json
{
  "items": [
    { "label": "Trang chủ" },
    { "label": "Sản phẩm", "children": [
      { "label": "Tinh Dầu" },
      { "label": "Nến Thơm" }
    ]},
    { "label": "Liên hệ" }
  ]
}
\`\`\`

## VALIDATE
- JSON thuần, KHÔNG markdown fence, KHÔNG giải thích
- Mỗi item PHẢI có "label" (string)
- "children" là optional array cùng cấu trúc
- Tối đa 50 items tổng cộng

## YÊU CẦU
Tạo menu header cho website [MÔ TẢ WEBSITE].`;

const SAMPLE_JSON = `{
  "items": [
    { "label": "Trang chủ" },
    { "label": "Giới thiệu" },
    { "label": "Sản phẩm", "children": [
      { "label": "Tinh Dầu" },
      { "label": "Nến Thơm" },
      { "label": "Sáp Thơm" }
    ]},
    { "label": "Dịch vụ", "children": [
      { "label": "Chăm sóc da" },
      { "label": "Massage Body" }
    ]},
    { "label": "Tin tức" },
    { "label": "Liên hệ" }
  ]
}`;

export function AiMenuImportDialog({
  currentItems,
  open,
  onOpenChange,
  onApply,
}: {
  currentItems?: AiMenuLine[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (items: AiMenuLine[]) => void;
}) {
  const currentMenuData = useMemo(() => ({ items: currentItems ?? [] }), [currentItems]);

  const fillMissingPrompt = useMemo(
    () => buildAiFillMissingPrompt(MENU_MEGA_PROMPT, currentMenuData, { contextLabel: 'Menu hiện có' }),
    [currentMenuData]
  );

  const fillMissingSampleJson = useMemo(
    () => buildAiFillMissingSample(SAMPLE_JSON, currentMenuData),
    [currentMenuData]
  );

  const handleParse = (rawInput: string, isFillMissing: boolean) => {
    const result = parseAiMenuInput(rawInput);
    if (result.error) {
      return { data: null, errors: [result.error] };
    }
    if (!result.lines.length) {
      return { data: null, errors: ['Không tìm thấy menu item nào trong dữ liệu JSON.'] };
    }

    if (isFillMissing && currentItems?.length) {
      const existingLabels = new Set(currentItems.map((item) => item.label.trim().toLowerCase()).filter(Boolean));
      const filtered = result.lines.filter((line) => !existingLabels.has(line.label.trim().toLowerCase()));
      if (!filtered.length) {
        return { data: null, errors: ['Tất cả menu items tạo ra đều đã tồn tại trong menu hiện có.'] };
      }
      return { data: filtered, errors: [] };
    }

    return { data: result.lines, errors: [] };
  };

  return (
    <AiImportDialogShell<AiMenuLine[]>
      open={open}
      onOpenChange={onOpenChange}
      title="Import AI — Tạo menu header"
      description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
      prompt={MENU_MEGA_PROMPT}
      sampleJson={SAMPLE_JSON}
      enableFillMissing={Boolean(currentItems && currentItems.length > 0)}
      fillMissingPrompt={fillMissingPrompt}
      fillMissingSampleJson={fillMissingSampleJson}
      fillMissingHint="Chỉ thêm các mục menu mới chưa có."
      directSessionId="admin-menu-import"
      directPlaceholder="Ví dụ: Website bán phụ kiện tủ bếp, cần menu gồm Trang chủ, Sản phẩm, Dịch vụ, Dự án, Bài viết, Liên hệ."
      parse={handleParse}
      renderPreview={(items) => (
        <div className="space-y-1">
          <p className="mb-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            Danh sách {items.length} menu items sẽ được thêm:
          </p>
          <div className="space-y-1">
            {items.map((line, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                style={{ marginLeft: line.depth * 16 }}
              >
                <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                {line.depth > 0 && (
                  <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    Cấp {line.depth + 1}
                  </span>
                )}
                <span className="font-medium">{line.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      onApply={onApply}
      applyButtonText="Thêm vào menu website"
    />
  );
}
