'use client';

import React, { useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui';
import { AiImportDialogShell } from '@/app/admin/components/AiImportDialogShell';
import type { ServiceEditorItem, ServiceItemMediaType } from '../_types';
import { AVAILABLE_SERVICE_ICONS } from '../_lib/constants';
import { useTypeAiImportEnabled } from '../../_shared/hooks/useTypeAiImportEnabled';
import { HomeComponentFooterActionPortal } from '../../_shared/components/HomeComponentFooterActions';

const MAX_ITEMS = 12;

const ICON_LIST_FOR_PROMPT = AVAILABLE_SERVICE_ICONS.slice(0, 60).join(', ');

const AI_SERVICES_PROMPT = `Hãy tạo danh sách dịch vụ cho website doanh nghiệp tiếng Việt.

Chỉ trả về JSON hợp lệ, không dùng markdown fence, không giải thích.

Schema bắt buộc:
{
  "services": [
    {
      "title": "string, bắt buộc, tên dịch vụ",
      "description": "string, bắt buộc, mô tả ngắn dịch vụ (tối đa 200 ký tự)",
      "icon": "string, BẮT BUỘC chọn từ danh sách icon bên dưới",
      "mediaType": "icon"
    }
  ]
}

Danh sách icon hợp lệ (CHỈ dùng các tên này, viết đúng hoa thường):
${ICON_LIST_FOR_PROMPT}

Yêu cầu:
- Nội dung tự nhiên, phù hợp thị trường Việt Nam.
- Tạo 3-8 dịch vụ.
- Icon BẮT BUỘC phải là 1 trong các tên ở danh sách trên.
- mediaType luôn là "icon".
- Không tạo field ngoài schema.
- Trả về 1 object JSON có key "services".

Ví dụ icon phù hợp theo ngành:
- E-commerce: ShoppingCart, Truck, Package, CreditCard, Gift, ShieldCheck
- Y tế: Stethoscope, Hospital, Pill, HeartPulse, Ambulance
- F&B: Utensils, Coffee, ChefHat, Wine, Pizza
- Công nghệ: Laptop, Code, Server, Cloud, Smartphone, Wifi
- Giáo dục: GraduationCap, Book, School, Brain
- Vận chuyển: Truck, Ship, Plane, Car, Train`;

const SAMPLE_SERVICES_JSON = `{
  "services": [
    { "title": "Tư vấn miễn phí", "description": "Đội ngũ chuyên gia tư vấn 24/7, giải đáp mọi thắc mắc.", "icon": "HeartHandshake", "mediaType": "icon" },
    { "title": "Giao hàng tận nơi", "description": "Giao hàng nhanh chóng toàn quốc, miễn phí đơn từ 500K.", "icon": "Truck", "mediaType": "icon" },
    { "title": "Bảo hành chính hãng", "description": "Cam kết bảo hành 12 tháng cho tất cả sản phẩm.", "icon": "ShieldCheck", "mediaType": "icon" },
    { "title": "Thanh toán linh hoạt", "description": "Hỗ trợ nhiều hình thức: COD, chuyển khoản, thẻ quốc tế.", "icon": "CreditCard", "mediaType": "icon" },
    { "title": "Hỗ trợ kỹ thuật", "description": "Đội ngũ kỹ thuật viên hỗ trợ lắp đặt và bảo trì tại nhà.", "icon": "Wrench", "mediaType": "icon" },
    { "title": "Ưu đãi thành viên", "description": "Tích điểm đổi quà, giảm giá độc quyền cho khách hàng thân thiết.", "icon": "Gift", "mediaType": "icon" }
  ]
}`;

type ParseResult = {
  items: ServiceEditorItem[] | null;
  errors: string[];
};

const trimText = (value: unknown, maxLength: number) => {
  if (typeof value !== 'string' && typeof value !== 'number') { return ''; }
  return String(value).trim().slice(0, maxLength);
};

const VALID_ICONS_SET = new Set(AVAILABLE_SERVICE_ICONS);

const parseAiServices = (raw: string): ParseResult => {
  let parsed: unknown;
  const errors: string[] = [];

  try {
    parsed = JSON.parse(raw);
  } catch {
    return { errors: ['JSON chưa hợp lệ. Hãy dán object có key "services".'], items: null };
  }

  let sourceArray: unknown[];
  if (typeof parsed === 'object' && parsed !== null && 'services' in parsed && Array.isArray((parsed as { services: unknown }).services)) {
    sourceArray = (parsed as { services: unknown[] }).services;
  } else if (Array.isArray(parsed)) {
    sourceArray = parsed;
  } else {
    return { errors: ['Root JSON phải là { "services": [...] } hoặc mảng dịch vụ.'], items: null };
  }

  if (sourceArray.length === 0) {
    return { errors: ['Danh sách dịch vụ trống.'], items: null };
  }

  if (sourceArray.length > MAX_ITEMS) {
    errors.push(`Tối đa ${MAX_ITEMS} dịch vụ, nhận được ${sourceArray.length}. Chỉ lấy ${MAX_ITEMS} đầu tiên.`);
  }

  const items = sourceArray.slice(0, MAX_ITEMS).reduce<ServiceEditorItem[]>((acc, itemRaw, index) => {
    if (typeof itemRaw !== 'object' || itemRaw === null) {
      errors.push(`Dịch vụ ${index + 1}: phải là object.`);
      return acc;
    }

    const record = itemRaw as Record<string, unknown>;
    const title = trimText(record.title, 120);
    const description = trimText(record.description, 200);
    const icon = trimText(record.icon, 80) || 'Star';
    const mediaType: ServiceItemMediaType = record.mediaType === 'image' ? 'image' : 'icon';
    const image = trimText(record.image, 500);

    if (!title) {
      errors.push(`Dịch vụ ${index + 1}: thiếu title.`);
      return acc;
    }

    if (mediaType === 'icon' && !VALID_ICONS_SET.has(icon as typeof AVAILABLE_SERVICE_ICONS[number])) {
      errors.push(`Dịch vụ ${index + 1}: icon "${icon}" có thể không tồn tại trong Lucide. Sẽ fallback về Star.`);
    }

    acc.push({
      id: 1_000_000 + Date.now() + index,
      mediaType,
      icon: VALID_ICONS_SET.has(icon as typeof AVAILABLE_SERVICE_ICONS[number]) ? icon : 'Star',
      image,
      title,
      description,
    });

    return acc;
  }, []);

  if (items.length === 0) {
    return { errors: [...errors, 'Không có dịch vụ hợp lệ nào.'], items: null };
  }

  const hasOnlyWarnings = errors.every(e => e.includes('có thể không tồn tại'));

  return {
    errors: hasOnlyWarnings ? [] : errors,
    items: (errors.length === 0 || hasOnlyWarnings) ? items : null,
  };
};

export function AiServicesImport({
  onApply,
}: {
  buttonClassName?: string;
  onApply: (items: ServiceEditorItem[]) => void;
}) {
  const isAiImportEnabled = useTypeAiImportEnabled();
  const [open, setOpen] = useState(false);

  if (!isAiImportEnabled) {
    return null;
  }

  const handleParse = (rawInput: string) => {
    const res = parseAiServices(rawInput);
    return { data: res.items, errors: res.errors };
  };

  const handleApply = (items: ServiceEditorItem[]) => {
    onApply(items);
    toast.success(`Đã nhập ${items.length} dịch vụ`);
  };

  return (
    <>
      <HomeComponentFooterActionPortal>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <Bot size={16} /> Import AI
        </Button>
      </HomeComponentFooterActionPortal>

      <AiImportDialogShell<ServiceEditorItem[]>
        open={open}
        onOpenChange={setOpen}
        title="Import Dịch vụ trang chủ bằng AI"
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={AI_SERVICES_PROMPT}
        sampleJson={SAMPLE_SERVICES_JSON}
        directSessionId="admin-services-home-import"
        directPlaceholder="Ví dụ: Tạo 6 dịch vụ cho studio thiết kế 3D/nội thất, mô tả ngắn, icon Lucide phù hợp."
        parse={handleParse}
        renderPreview={(items) => (
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {items.map((item, idx) => (
              <div key={item.id} className="flex items-start gap-2 rounded-md border border-slate-100 bg-white p-2 text-xs dark:border-slate-800 dark:bg-slate-900">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{item.title}</p>
                  {item.description && <p className="text-slate-500 truncate">{item.description}</p>}
                  <p className="text-slate-400 text-[10px] font-mono">icon: {item.icon}</p>
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
