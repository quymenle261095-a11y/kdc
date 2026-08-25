'use client';

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui';
import { AiImportDialogShell } from '@/app/admin/components/AiImportDialogShell';
import type { PopupConfig } from '../_types';
import { useTypeAiImportEnabled } from '../../_shared/hooks/useTypeAiImportEnabled';
import { HomeComponentFooterActionPortal } from '../../_shared/components/HomeComponentFooterActions';

const AI_POPUP_PROMPT = `Bạn là chuyên gia UX copywriting cho popup website tiếng Việt.

Mục tiêu: tạo nội dung popup ngắn, rõ, dễ hiểu trong 5 giây, phù hợp hiển thị với font Be Vietnam Pro.

Bối cảnh cần tự suy luận từ yêu cầu người dùng:
- Loại popup: thông báo, khuyến mãi, thu lead, nhắc lịch, tư vấn, xác nhận hoặc cảnh báo nhẹ.
- Đối tượng đọc: khách truy cập website Việt Nam, cần câu chữ tự nhiên, lịch sự, không phóng đại.
- Ưu tiên chuyển đổi: tiêu đề rõ lợi ích, mô tả nói cụ thể người dùng nhận được gì, CTA hành động ngắn.

Chỉ trả về JSON hợp lệ, không dùng markdown fence, không giải thích, không thêm text ngoài JSON.

Schema bắt buộc:
{
  "eyebrow": "Badge ngắn, tối đa 24 ký tự",
  "heading": "Tiêu đề chính, tối đa 80 ký tự",
  "description": "Phụ đề/mô tả, tối đa 180 ký tự",
  "note": "Ghi chú ngắn, có thể để trống",
  "primaryButtonText": "Nút chính, có thể để trống",
  "primaryButtonLink": "URL hoặc path, có thể để trống",
  "secondaryButtonText": "Nút phụ, có thể để trống",
  "secondaryButtonLink": "URL hoặc path, có thể để trống",
  "icon": "Tên icon Lucide phù hợp, ví dụ ShieldCheck, Gift, Bell, Sparkles"
}

Quy tắc viết:
- eyebrow: 1-4 từ, ví dụ "Ưu đãi mới", "Thông báo", "Dành cho bạn"; có thể để trống nếu không cần.
- heading: một câu ngắn, nêu lợi ích hoặc thông tin chính, không dùng toàn chữ hoa.
- description: 1 câu rõ ý, nói cụ thể người dùng nên biết/làm gì tiếp theo.
- note: dùng cho điều kiện, cam kết, thời hạn hoặc trấn an; để trống nếu không có thông tin thật.
- primaryButtonText: 2-4 từ, ưu tiên động từ hành động như "Nhận ưu đãi", "Đăng ký ngay", "Xem chi tiết".
- primaryButtonLink: dùng path nội bộ như "/lien-he", "/san-pham" hoặc URL đầy đủ; để trống nếu nút chỉ đóng popup.
- secondaryButtonText: chỉ dùng khi có lựa chọn phụ rõ ràng như "Để sau", "Tìm hiểu thêm"; để trống nếu không cần.
- secondaryButtonLink: để trống nếu nút phụ chỉ đóng popup.
- icon: chọn một icon Lucide phù hợp, ví dụ Bell, Gift, Sparkles, ShieldCheck, Calendar, Mail, Megaphone, BadgeCheck.

Ràng buộc chất lượng:
- Không cường điệu kiểu "tốt nhất", "số 1", "duy nhất" nếu không có bằng chứng.
- Không bịa giá, phần trăm giảm, deadline, số lượng còn lại nếu người dùng không cung cấp.
- Không dùng emoji, hashtag, base64, HTML hoặc markdown.
- Không tạo field ngoài schema.
- Giữ câu chữ tự nhiên, dấu tiếng Việt đầy đủ, đọc tốt trên mobile.`;

const SAMPLE_POPUP_JSON = `{
  "eyebrow": "Ưu đãi mới",
  "heading": "Nhận ưu đãi dành riêng cho bạn",
  "description": "Đăng ký hôm nay để nhận thông tin khuyến mãi và tư vấn phù hợp.",
  "note": "Bạn có thể bỏ qua nếu chưa sẵn sàng.",
  "primaryButtonText": "Nhận ưu đãi",
  "primaryButtonLink": "/lien-he",
  "secondaryButtonText": "Để sau",
  "secondaryButtonLink": "",
  "icon": "Gift"
}`;

const trimText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string' && typeof value !== 'number') {return '';}
  return String(value).trim().slice(0, maxLength);
};

const parsePopupJson = (raw: string): { data: Partial<PopupConfig> | null; errors: string[] } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { data: null, errors: ['JSON chưa hợp lệ.'] };
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { data: null, errors: ['Root JSON phải là object.'] };
  }

  const record = parsed as Record<string, unknown>;
  const heading = trimText(record.heading, 80);
  if (!heading) {
    return { data: null, errors: ['Thiếu heading.'] };
  }

  return {
    data: {
      description: trimText(record.description, 180),
      eyebrow: trimText(record.eyebrow, 24),
      heading,
      icon: trimText(record.icon, 40) || 'Bell',
      note: trimText(record.note, 180),
      primaryButtonLink: trimText(record.primaryButtonLink, 300),
      primaryButtonText: trimText(record.primaryButtonText, 40),
      secondaryButtonLink: trimText(record.secondaryButtonLink, 300),
      secondaryButtonText: trimText(record.secondaryButtonText, 40),
    },
    errors: [],
  };
};

export function AiPopupImport({ onApply }: { onApply: (config: Partial<PopupConfig>) => void }) {
  const isAiImportEnabled = useTypeAiImportEnabled();
  const [open, setOpen] = useState(false);

  if (!isAiImportEnabled) {
    return null;
  }

  const handleParse = (rawInput: string) => {
    return parsePopupJson(rawInput);
  };

  const handleApply = (config: Partial<PopupConfig>) => {
    onApply(config);
    toast.success('Đã nhập nội dung popup');
  };

  return (
    <>
      <HomeComponentFooterActionPortal>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <Bot size={16} /> Import AI
        </Button>
      </HomeComponentFooterActionPortal>

      <AiImportDialogShell<Partial<PopupConfig>>
        open={open}
        onOpenChange={setOpen}
        title="Import nội dung popup bằng AI"
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={AI_POPUP_PROMPT}
        sampleJson={SAMPLE_POPUP_JSON}
        directSessionId="admin-popup-import"
        directPlaceholder="Ví dụ: Popup mời khách nhận tư vấn miễn phí về khóa học 3D, CTA Liên hệ tư vấn, không giảm giá."
        parse={handleParse}
        renderPreview={(config) => (
          <div className="space-y-1 text-xs">
            {config.eyebrow && <span className="text-[10px] font-semibold uppercase text-blue-600 dark:text-blue-400">{config.eyebrow}</span>}
            <p className="font-semibold text-slate-800 dark:text-slate-100">{config.heading}</p>
            {config.description && <p className="text-slate-500">{config.description}</p>}
            {config.note && <p className="text-[11px] text-slate-400 italic">{config.note}</p>}
            <div className="flex gap-2 text-[11px] text-slate-400 pt-1">
              {config.primaryButtonText && <span>🔘 {config.primaryButtonText}</span>}
              {config.secondaryButtonText && <span>🔘 {config.secondaryButtonText}</span>}
              {config.icon && <span>🔔 {config.icon}</span>}
            </div>
          </div>
        )}
        applyButtonText="Áp dụng vào form"
        onApply={handleApply}
      />
    </>
  );
}
