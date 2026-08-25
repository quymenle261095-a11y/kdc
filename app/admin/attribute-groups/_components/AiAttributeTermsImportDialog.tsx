'use client';

import React, { useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui';
import { AiImportDialogShell } from '../../components/AiImportDialogShell';

export type PendingAttributeTerm = {
  name: string;
  slug: string;
  description?: string;
};

const slugify = (value: string) => value.toLowerCase()
  .normalize("NFD").replaceAll(/[\u0300-\u036F]/g, "")
  .replaceAll(/[đĐ]/g, "d")
  .replaceAll(/[^a-z0-9\s-]/g, '')
  .trim()
  .replaceAll(/\s+/g, '-')
  .replaceAll(/-+/g, '-');

const parseTermsPayload = (raw: string): { terms: PendingAttributeTerm[]; errors: string[] } => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { terms: [], errors: ['JSON chưa hợp lệ. Hãy dán đúng object có key "terms".'] };
  }

  const record = parsed as { terms?: unknown };
  if (!Array.isArray(record.terms)) {
    return { terms: [], errors: ['Thiếu mảng "terms".'] };
  }

  const errors: string[] = [];
  const seenSlugs = new Set<string>();
  const terms: PendingAttributeTerm[] = [];

  record.terms.slice(0, 80).forEach((item, index) => {
    const term = item as { name?: unknown; slug?: unknown; description?: unknown };
    const name = typeof term.name === 'string' ? term.name.trim() : '';
    const slug = typeof term.slug === 'string' && term.slug.trim() ? slugify(term.slug) : slugify(name);
    const description = typeof term.description === 'string' ? term.description.trim() : '';

    if (!name) {
      errors.push(`Item #${index + 1} thiếu name.`);
      return;
    }
    if (!slug) {
      errors.push(`Item #${index + 1} không tạo được slug.`);
      return;
    }
    if (seenSlugs.has(slug)) {
      errors.push(`Slug bị trùng trong payload: ${slug}`);
      return;
    }
    seenSlugs.add(slug);
    terms.push({ name, slug, description: description || undefined });
  });

  if (terms.length === 0 && errors.length === 0) {
    errors.push('Mảng terms đang rỗng.');
  }

  return { terms, errors };
};

const SAMPLE_TERMS_JSON = `{
  "terms": [
    {
      "name": "Pinot Noir",
      "slug": "pinot-noir",
      "description": "Giống nho đỏ thanh lịch, thường có hương trái đỏ và cấu trúc nhẹ đến vừa."
    },
    {
      "name": "Chardonnay",
      "slug": "chardonnay",
      "description": "Giống nho trắng phổ biến, linh hoạt từ phong cách tươi sáng đến béo ngậy."
    },
    {
      "name": "Tempranillo",
      "slug": "tempranillo",
      "description": "Giống nho đỏ đặc trưng Tây Ban Nha, hợp vang có hương trái chín và gia vị."
    }
  ]
}`;

export function AiAttributeTermsImportDialog({
  groupName,
  filterType,
  inputType,
  onApply,
}: {
  groupName: string;
  filterType: string;
  inputType: string;
  onApply: (terms: PendingAttributeTerm[]) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  const prompt = useMemo(() => {
    const resolvedName = groupName.trim() || 'Nhóm thuộc tính sản phẩm';
    return `Bạn là chuyên gia taxonomy ecommerce. Hãy tạo danh sách giá trị thuộc tính cho website bán hàng.

Nhóm thuộc tính hiện tại:
- Tên nhóm: ${resolvedName}
- Kiểu lọc: ${filterType}
- Kiểu hiển thị: ${filterType === 'range' ? 'range slider' : inputType}

Yêu cầu rất quan trọng:
- Chỉ tạo các item thực sự thuộc nhóm "${resolvedName}", không trộn sang nhóm khác.
- Nếu nhóm là "Giống nho" thì chỉ trả về giống nho như Pinot Noir, Chardonnay, Tempranillo; không trả về quốc gia, loại rượu, dung tích hay khoảng giá.
- Nếu nhóm là "Quốc gia" thì chỉ trả về quốc gia/vùng xuất xứ; không trả về giống nho.
- Nếu nhóm là "Thương hiệu" thì chỉ trả về tên thương hiệu/nhà sản xuất; không trả về giống nho, quốc gia hay dung tích.
- Nếu nhóm là "Hương vị" thì chỉ trả về profile hương vị; không trả về tên sản phẩm cụ thể.
- Không dùng emoji, không thêm text giải thích ngoài JSON.
- Slug phải lowercase-kebab-case, không dấu, không ký tự đặc biệt.
- Description ngắn 1 câu, dùng được trong UI/SEO nhẹ, không bịa chứng nhận hay số liệu.
- Số lượng hợp lý: 8-20 item, ưu tiên phổ biến và dễ hiểu.

Chỉ trả về JSON đúng schema:
{
  "terms": [
    {
      "name": "Tên giá trị",
      "slug": "ten-gia-tri",
      "description": "Mô tả ngắn optional"
    }
  ]
}`;
  }, [filterType, groupName, inputType]);

  const handleParse = (rawInput: string) => {
    const res = parseTermsPayload(rawInput);
    return { data: res.terms.length > 0 ? res.terms : null, errors: res.errors };
  };

  const handleApply = async (terms: PendingAttributeTerm[]) => {
    await onApply(terms);
    toast.success(`Đã nạp ${terms.length} giá trị thuộc tính`);
  };

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-2">
        <Bot size={16} />
        Import AI
      </Button>

      <AiImportDialogShell<PendingAttributeTerm[]>
        open={open}
        onOpenChange={setOpen}
        title={`Import AI giá trị thuộc tính (${groupName || 'Thuộc tính'})`}
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={prompt}
        sampleJson={SAMPLE_TERMS_JSON}
        directSessionId="admin-attribute-terms-import"
        directPlaceholder="Ví dụ: Tạo 12 giá trị cho nhóm Giống nho, ưu tiên các giống phổ biến, mô tả ngắn dễ hiểu."
        parse={handleParse}
        renderPreview={(terms) => (
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Danh sách {terms.length} giá trị sẽ thêm vào nhóm:
            </p>
            {terms.map((term, index) => (
              <div key={term.slug} className="rounded-md bg-white border border-slate-100 p-2 text-xs dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{index + 1}. {term.name}</span>
                  <span className="font-mono text-[10px] text-slate-400">{term.slug}</span>
                </div>
                {term.description && (
                  <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">{term.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
        applyButtonText="Áp dụng vào danh sách"
        onApply={handleApply}
      />
    </>
  );
}
