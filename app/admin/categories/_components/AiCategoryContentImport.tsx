'use client';

import React, { useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Label } from '../../components/ui';
import { AiImportDialogShell } from '../../components/AiImportDialogShell';
import type { FaqItem } from '../../home-components/faq/_types';
import { useTypeAiImportEnabled } from '../../home-components/_shared/hooks/useTypeAiImportEnabled';

interface CategoryContentPayload {
  filterFooterContent?: string;
  productDetailSuffixContent?: string;
  faqItems?: Array<{ question: string; answer: string }>;
}

const SAMPLE_CATEGORY_JSON = `{
  "filterFooterContent": "<h2>Bí quyết chọn mua Giày chạy bộ phù hợp</h2><p>Để chọn được đôi giày chạy bộ lý tưởng, bạn cần xác định rõ kiểu bàn chân và địa hình chạy. Hãy ưu tiên các dòng sản phẩm có lớp đệm êm ái và độ bám tốt để bảo vệ khớp gối tối đa...</p>",
  "productDetailSuffixContent": "<h3>Cam kết từ Cửa hàng</h3><p>Tất cả sản phẩm tại hệ thống đều cam kết <strong>chính hãng 100%</strong>. Chúng tôi hỗ trợ bảo hành keo chỉ lên tới 12 tháng và chính sách đổi trả miễn phí trong vòng 7 ngày nếu có lỗi từ nhà sản xuất.</p>",
  "faqItems": [
    {
      "question": "Giày chạy bộ có được giặt máy không?",
      "answer": "Không nên giặt máy để tránh làm hỏng cấu trúc đệm và keo giày. Hãy làm sạch bằng bàn chải mềm và dung dịch chuyên dụng."
    },
    {
      "question": "Làm sao để chọn đúng size giày?",
      "answer": "Bạn nên đo chiều dài bàn chân và cộng thêm 0.5 - 1cm để có độ thoải mái tốt nhất khi di chuyển đường dài."
    }
  ]
}`;

export function AiCategoryContentImport({
  categoryName,
  categoryDescription,
  onApply,
}: {
  categoryName: string;
  categoryDescription: string;
  onApply: (data: {
    filterFooterContent: string;
    productDetailSuffixContent: string;
    faqItems: FaqItem[];
  }) => void;
}) {
  const isAiImportEnabled = useTypeAiImportEnabled('productCategories');
  const [open, setOpen] = useState(false);
  const [nameInput, setNameInput] = useState(categoryName);
  const [infoInput, setInfoInput] = useState(categoryDescription);

  // Đồng bộ với thay đổi từ form bên ngoài khi mở dialog
  React.useEffect(() => {
    if (open) {
      setNameInput(categoryName);
      setInfoInput(categoryDescription);
    }
  }, [open, categoryName, categoryDescription]);

  const prompt = useMemo(() => {
    return `Hãy đóng vai trò là một chuyên gia SEO và Content Marketer hàng đầu. Tôi muốn bạn tạo nội dung chất lượng cao chuẩn EEAT (Experience - Expertise - Authoritativeness - Trustworthiness) của Google cho danh mục sản phẩm sau:

- **Tên danh mục**: "${nameInput.trim() || '(Chưa nhập tên danh mục)'}"
- **Thông tin bổ sung / Đặc tính sản phẩm**: "${infoInput.trim() || '(Chưa có thông tin bổ sung)'}"

LƯU Ý ĐẶC BIỆT BẢO VỆ SEO & E-E-A-T (CHỐNG PHẠT GOOGLE SPAM):
* TUYỆT ĐỐI KHÔNG sử dụng các hashtag dạng dấu thăng (#tu-khoa) trong bất kỳ phần văn bản nào. Google và các công cụ tìm kiếm hiện đại coi đây là hành vi nhồi nhét từ khóa (keyword stuffing) spam và có thể phạt giảm thứ hạng trang web, đồng thời làm giảm nghiêm trọng độ chuyên nghiệp, premium của giao diện người dùng.

Yêu cầu cụ thể theo Best Practice của các hệ thống SaaS Thương mại điện tử lớn:

1. **Nội dung cuối trang danh mục (filterFooterContent) - "Cẩm nang chọn mua và Kiến thức chuyên gia"**:
   - Viết một bài hướng dẫn/chia sẻ từ 250-400 từ bằng ngôn ngữ tự nhiên, chuyên sâu, đáng tin cậy.
   - Định dạng bằng các thẻ HTML cơ bản (h2, h3, p, strong, ul, li).
   - Nội dung phải:
     * Tránh sáo rỗng, tránh nhồi nhét từ khóa.
     * Cung cấp tiêu chí so sánh, cách chọn size/kiểu dáng/chất liệu phù hợp với nhu cầu sử dụng thực tế (ví dụ: chạy bộ, đi làm, leo núi...).
     * Hướng dẫn chi tiết cách bảo quản, vệ sinh để tăng tuổi thọ sản phẩm.
     * Thể hiện góc nhìn chuyên gia ("Tại sao nên chọn mua tại hệ thống của chúng tôi?").

2. **Nội dung nối đuôi chi tiết sản phẩm (productDetailSuffixContent) - "Cam kết Vàng & Bảo chứng lòng tin"**:
   - Đoạn ngắn từ 80-150 từ bằng HTML (thẻ p, strong, ul, li).
   - Tập trung củng cố lòng tin tại "Điểm đưa ra quyết định mua hàng" (Point of Decision):
     * Liệt kê 3-4 cam kết cực kỳ rõ ràng, đanh thép (ví dụ: Bảo hành chính hãng 12 tháng, Đổi trả 7 ngày linh hoạt nếu không vừa size, Giao hàng siêu tốc 2h).
     * Sử dụng thẻ <ul> và <li> với các cụm từ quan trọng được bôi đậm (<strong>) làm nổi bật các lợi ích thiết thực.
     * Tích hợp khéo léo các liên kết giả lập để tạo độ uy tín cao cho Google bot quét (ví dụ: thêm các thẻ <a href="/chinh-sach-bao-hanh" class="text-orange-500 hover:underline">Chính sách bảo hành</a> và <a href="/chinh-sach-doi-tra" class="text-orange-500 hover:underline">Chính sách đổi trả</a>).

3. **Danh sách câu hỏi thường gặp FAQ (faqItems) - "FAQPage Schema & Trực quan hóa câu trả lời"**:
   - Tạo từ 3 đến 5 câu hỏi thực tế và cụ thể nhất mà khách hàng thường thắc mắc khi mua danh mục này (về size giày, độ bền, xuất xứ, đổi hàng).
   - Câu trả lời phải đi thẳng vào vấn đề, rõ ràng, chi tiết, cung cấp thông tin hữu ích và giải quyết triệt để nỗi lo ngại của người mua.

Chỉ trả về DUY NHẤT một đối tượng JSON hợp lệ, không bọc trong khối code markdown (\`\`\`json ... \`\`\`), không có bất kỳ lời mở đầu, giải thích hay hậu từ nào khác.

Schema JSON bắt buộc:
{
  "filterFooterContent": "chuỗi HTML bài viết chuyên sâu cuối trang danh mục",
  "productDetailSuffixContent": "chuỗi HTML cam kết và bảo hành chi tiết sản phẩm",
  "faqItems": [
    {
      "question": "Câu hỏi thường gặp 1 là gì?",
      "answer": "Câu trả lời chi tiết và hữu ích cho câu hỏi 1."
    }
  ]
}`;
  }, [nameInput, infoInput]);

  const handleParse = (raw: string) => {
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { errors: ['JSON chưa hợp lệ. Hãy kiểm tra dấu ngoặc hoặc các ký tự đặc biệt.'], data: null };
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { errors: ['Dữ liệu gốc phải là một đối tượng JSON.'], data: null };
    }

    const errors: string[] = [];

    if (parsed.filterFooterContent && typeof parsed.filterFooterContent !== 'string') {
      errors.push('Trường "filterFooterContent" phải là một chuỗi văn bản HTML.');
    }

    if (parsed.productDetailSuffixContent && typeof parsed.productDetailSuffixContent !== 'string') {
      errors.push('Trường "productDetailSuffixContent" phải là một chuỗi văn bản HTML.');
    }

    if (parsed.faqItems) {
      if (!Array.isArray(parsed.faqItems)) {
        errors.push('Trường "faqItems" phải là một mảng danh sách câu hỏi.');
      } else {
        parsed.faqItems.forEach((item: any, index: number) => {
          if (typeof item !== 'object' || item === null) {
            errors.push(`Câu hỏi thứ ${index + 1} phải là một đối tượng.`);
          } else {
            if (!item.question?.trim()) {
              errors.push(`Câu hỏi thứ ${index + 1} thiếu trường "question".`);
            }
            if (!item.answer?.trim()) {
              errors.push(`Câu hỏi thứ ${index + 1} thiếu trường "answer".`);
            }
          }
        });
      }
    }

    return { errors, data: parsed as CategoryContentPayload };
  };

  const handleApply = (data: CategoryContentPayload) => {
    const resolvedFaqItems: FaqItem[] = (data.faqItems || []).map((f, idx) => ({
      id: Date.now() + idx,
      question: (f.question || '').trim(),
      answer: (f.answer || '').trim(),
    }));

    onApply({
      filterFooterContent: (data.filterFooterContent || '').trim(),
      productDetailSuffixContent: (data.productDetailSuffixContent || '').trim(),
      faqItems: resolvedFaqItems,
    });

    toast.success('Đã tự động điền nội dung danh mục và FAQ thành công!');
  };

  if (!isAiImportEnabled) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Bot size={16} />
        Nhập AI
      </Button>

      <AiImportDialogShell<CategoryContentPayload>
        open={open}
        onOpenChange={setOpen}
        title="Tạo nội dung SEO & FAQ danh mục bằng AI"
        description="Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây."
        prompt={prompt}
        sampleJson={SAMPLE_CATEGORY_JSON}
        extraContent={
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/50 space-y-2">
            <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Tùy biến định hướng cho Prompt:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-slate-500">Tên danh mục</Label>
                <Input
                  placeholder="Ví dụ: Giày Nike chính hãng..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <Label className="text-[10px] text-slate-500">Đặc tính / Cam kết nổi bật</Label>
                <Input
                  placeholder="Ví dụ: Bảo hành 12 tháng, giao 2h, chuyên chạy bộ..."
                  value={infoInput}
                  onChange={(e) => setInfoInput(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-950"
                />
              </div>
            </div>
          </div>
        }
        directSessionId="admin-category-content-import"
        directPlaceholder="Ví dụ: Danh mục Giày chạy bộ, nổi bật chính hãng, đổi trả 7 ngày, khách cần chọn đúng size và độ êm."
        parse={handleParse}
        renderPreview={(data) => (
          <div className="space-y-2 text-xs">
            {data.filterFooterContent && (
              <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-1 font-bold text-slate-700 dark:text-slate-300">Nội dung chân trang:</p>
                <div className="line-clamp-2 text-slate-500" dangerouslySetInnerHTML={{ __html: data.filterFooterContent }} />
              </div>
            )}
            {data.productDetailSuffixContent && (
              <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-1 font-bold text-slate-700 dark:text-slate-300">Cam kết chi tiết sản phẩm:</p>
                <div className="line-clamp-2 text-slate-500" dangerouslySetInnerHTML={{ __html: data.productDetailSuffixContent }} />
              </div>
            )}
            {data.faqItems && data.faqItems.length > 0 && (
              <div className="rounded border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-1 font-bold text-slate-700 dark:text-slate-300">Danh sách FAQ ({data.faqItems.length} câu hỏi):</p>
                <div className="space-y-1">
                  {data.faqItems.map((item, idx) => (
                    <div key={idx} className="text-slate-600 dark:text-slate-400">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">Q: {item.question}</span> — {item.answer}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        applyButtonText="Áp dụng vào form"
        onApply={handleApply}
      />
    </>
  );
}
