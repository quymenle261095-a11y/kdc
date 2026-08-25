'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles, Globe, Zap, MessageSquare, Layers } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '../../components/ui';
import type { AiSeoImportPayload } from './AiSeoImportDialog';

type Formula = {
  id: string;
  name: string;
  description: string;
  generate: (form: Record<string, string | boolean>) => AiSeoImportPayload;
};

const readText = (form: Record<string, string | boolean>, key: string, fallback = '') => {
  const value = form[key];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
};

const joinUnique = (items: string[]) => {
  const seen = new Set<string>();
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .join(', ');
};

const buildBrandLayer = (
  form: Record<string, string | boolean>,
  options: {
    entityType?: 'Organization' | 'LocalBusiness' | 'ProfessionalService';
    positioning: string;
    toneProof: string;
  }
): AiSeoImportPayload => {
  const siteName = readText(form, 'site_name', 'Tên thương hiệu');
  const siteDesc = readText(form, 'site_tagline', 'ngành nghề chính');
  const compactName = siteName.replace(/\s+/g, '').toLowerCase();
  const lowerName = siteName.toLowerCase();
  const existingSocials = [
    readText(form, 'social_facebook'),
    readText(form, 'social_instagram'),
    readText(form, 'social_youtube'),
    readText(form, 'social_tiktok'),
    readText(form, 'social_twitter'),
    readText(form, 'social_linkedin'),
  ].filter((url) => url.startsWith('http'));

  return {
    seo_brand_aliases: joinUnique([siteName, lowerName, compactName]),
    seo_brand_audience: `Khách hàng đang tìm ${siteDesc}, cần so sánh đơn vị uy tín, xem năng lực thật và có kênh liên hệ rõ ràng trước khi ra quyết định.`,
    seo_brand_differentiators: options.positioning,
    seo_brand_entity_type: options.entityType ?? 'Organization',
    seo_brand_proof_points: options.toneProof,
    seo_brand_same_as: existingSocials.join('\n'),
    seo_brand_search_queries: joinUnique([lowerName, compactName, siteName]),
    seo_brand_services: joinUnique([siteDesc, `${siteDesc} chuyên nghiệp`, `tư vấn ${siteDesc}`]),
    seo_brand_summary: `${siteName} là thương hiệu chuyên ${siteDesc}. Website cung cấp thông tin rõ ràng về dịch vụ, nội dung tư vấn và kênh liên hệ chính thức để khách hàng xác minh trước khi hợp tác.`,
    seo_brand_topics: joinUnique([siteDesc, `dịch vụ ${siteDesc}`, `giải pháp ${siteDesc}`, `kinh nghiệm ${siteDesc}`]),
    seo_site_search_path: '/search?q={search_term_string}',
  };
};

const FORMULAS: Formula[] = [
  {
    id: 'brand-intent',
    name: 'Tên thương hiệu + nhu cầu chính',
    description: 'Tập trung vào tên thương hiệu và ngành nghề chính. Phù hợp cho trang chủ mới bắt đầu.',
    generate: (form) => {
      const siteName = readText(form, 'site_name', 'Tên thương hiệu');
      const siteDesc = readText(form, 'site_tagline', 'Ngành nghề');
      const contact = readText(form, 'contact_phone') || readText(form, 'contact_hotline');
      
      const title = `${siteDesc} Chất Lượng | ${siteName}`;
      const desc = `Khám phá các sản phẩm/dịch vụ ${siteDesc} tốt nhất tại ${siteName}. Cam kết chất lượng và uy tín.${contact ? ` Liên hệ ngay ${contact} để nhận tư vấn miễn phí.` : ''}`;
      
      return {
        ...buildBrandLayer(form, {
          entityType: 'Organization',
          positioning: `${siteName} nói rõ mình làm gì trong lĩnh vực ${siteDesc}, thông tin dễ hiểu và có kênh liên hệ nhanh.`,
          toneProof: 'Có website chính thức, thông tin liên hệ công khai và nội dung được cấu trúc để người dùng xác minh nhanh.',
        }),
        seo_title: title,
        seo_description: desc,
        seo_keywords: `${siteName}, ${siteDesc}, ${siteDesc} chất lượng`,
      };
    },
  },
  {
    id: 'action-benefit',
    name: 'Kêu gọi hành động',
    description: 'Nêu rõ lợi ích và khuyến khích khách liên hệ hoặc đặt dịch vụ.',
    generate: (form) => {
      const siteName = readText(form, 'site_name', 'Tên thương hiệu');
      const siteDesc = readText(form, 'site_tagline', 'Ngành nghề');
      const contact = readText(form, 'contact_phone') || readText(form, 'contact_hotline');
      
      const title = `Khám phá ${siteDesc} Tốt Nhất Tại ${siteName}`;
      const desc = `Bạn đang tìm kiếm ${siteDesc}? ${siteName} mang đến giải pháp hoàn hảo với mức giá tốt nhất.${contact ? ` Gọi ngay ${contact} để nhận ưu đãi hôm nay!` : ''}`;
      
      return {
        ...buildBrandLayer(form, {
          entityType: 'ProfessionalService',
          positioning: `${siteName} tập trung vào lợi ích thực tế, tư vấn nhanh và phục vụ khách đang cần ${siteDesc}.`,
          toneProof: 'Có CTA rõ, kênh tư vấn công khai và nội dung trình bày theo nhu cầu mua hoặc đặt dịch vụ.',
        }),
        seo_title: title,
        seo_description: desc,
        seo_keywords: `giải pháp ${siteDesc}, ${siteDesc} giá tốt, ${siteName}`,
      };
    },
  },
  {
    id: 'aeo-direct-answer',
    name: 'Trả lời trực tiếp',
    description: 'Viết như một câu trả lời ngắn, dễ hiểu khi khách tìm trên Google hoặc hỏi AI.',
    generate: (form) => {
      const siteName = readText(form, 'site_name', 'Tên thương hiệu');
      const siteDesc = readText(form, 'site_tagline', 'Ngành nghề');
      const contact = readText(form, 'contact_phone') || readText(form, 'contact_hotline');
      
      const title = `${siteName} - Chuyên gia ${siteDesc} Uy Tín`;
      const desc = `${siteName} là đơn vị chuyên cung cấp ${siteDesc} chất lượng cao. Giải pháp toàn diện, chuyên nghiệp và uy tín.${contact ? ` Liên hệ ngay: ${contact}.` : ''}`;
      
      return {
        ...buildBrandLayer(form, {
          entityType: 'ProfessionalService',
          positioning: `${siteName} được mô tả như một chuyên gia ${siteDesc}, trả lời trực tiếp vấn đề khách hàng đang tìm và dẫn họ tới kênh liên hệ phù hợp.`,
          toneProof: 'Có định vị chuyên gia, thông tin liên hệ và nội dung dịch vụ nhất quán để Google và AI hiểu đúng thương hiệu.',
        }),
        seo_title: title,
        seo_description: desc,
        seo_keywords: `chuyên gia ${siteDesc}, cung cấp ${siteDesc}, ${siteName}`,
      };
    },
  },
  {
    id: 'semantic-entity',
    name: 'Bao quát chủ đề',
    description: 'Phủ rộng chủ đề chính, dịch vụ chính và tên thương hiệu mà không nhồi từ khóa.',
    generate: (form) => {
      const siteName = readText(form, 'site_name', 'Tên thương hiệu');
      const siteDesc = readText(form, 'site_tagline', 'Ngành nghề');
      const contact = readText(form, 'contact_phone') || readText(form, 'contact_hotline');
      
      const title = `Dịch Vụ ${siteDesc} Toàn Diện | ${siteName}`;
      const desc = `Khám phá hệ sinh thái sản phẩm và dịch vụ ${siteDesc} tại ${siteName}. Đội ngũ chuyên gia giàu kinh nghiệm sẵn sàng hỗ trợ bạn.${contact ? ` Gọi ${contact} để biết thêm chi tiết.` : ''}`;
      
      return {
        ...buildBrandLayer(form, {
          entityType: 'Organization',
          positioning: `${siteName} bao quát các chủ đề quanh ${siteDesc}, kết nối dịch vụ, nội dung tư vấn và nhu cầu khách hàng.`,
          toneProof: 'Có tên gọi khác, chủ đề chính, dịch vụ trọng tâm và link kênh chính thức để tăng độ tin cậy.',
        }),
        seo_title: title,
        seo_description: desc,
        seo_keywords: `hệ sinh thái ${siteDesc}, chuyên gia ${siteDesc}, dịch vụ ${siteDesc}`,
      };
    },
  },
];

const getFormulaIcon = (id: string) => {
  switch (id) {
    case 'brand-intent':
      return Globe;
    case 'action-benefit':
      return Zap;
    case 'aeo-direct-answer':
      return MessageSquare;
    case 'semantic-entity':
      return Layers;
    default:
      return Sparkles;
  }
};

export function SeoBuilderDialog({
  form,
  onApply,
}: {
  form: Record<string, string | boolean>;
  onApply: (item: AiSeoImportPayload) => void;
}) {
  const [open, setOpen] = useState(false);
  const [selectedFormulaId, setSelectedFormulaId] = useState<string>(FORMULAS[0].id);

  const selectedFormula = useMemo(
    () => FORMULAS.find(f => f.id === selectedFormulaId) || FORMULAS[0],
    [selectedFormulaId]
  );

  const previewData = useMemo(
    () => selectedFormula.generate(form),
    [selectedFormula, form]
  );

  const handleApply = () => {
    onApply(previewData);
    toast.success('Đã áp dụng công thức SEO vào form');
    setOpen(false);
  };

  return (
    <>
      <Button type="button" variant="outline" className="gap-2 animate-pulse hover:animate-none" onClick={() => setOpen(true)}>
        <Sparkles size={16} className="text-amber-500" /> SEO Builder
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 rounded-xl">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
            <div className="text-left">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-50">
                <Sparkles className="w-5 h-5 text-amber-500 shrink-0" />
                Trình gợi ý & tạo SEO tự động
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 mt-1">
                Tự động tối ưu hóa nội dung SEO từ thông tin chung của website. Có thể chỉnh lại sau khi áp dụng.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Choose Formula */}
              <div className="md:col-span-5 space-y-4 text-left">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    1. Chọn công thức SEO
                  </Label>
                </div>
                <div className="space-y-2.5">
                  {FORMULAS.map((formula) => {
                    const isSelected = selectedFormulaId === formula.id;
                    const Icon = getFormulaIcon(formula.id);
                    return (
                      <button
                        key={formula.id}
                        type="button"
                        onClick={() => setSelectedFormulaId(formula.id)}
                        className={`w-full flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-200 ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 shadow-sm ring-1 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-950/20'
                            : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900/50'
                        }`}
                      >
                        <div className={`p-2 rounded-lg mt-0.5 shrink-0 transition-colors ${
                          isSelected ? 'bg-blue-600 text-white dark:bg-blue-500' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          <Icon size={18} />
                        </div>
                        <div className="space-y-1">
                          <span className={`block text-sm font-semibold transition-colors ${
                            isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-950 dark:text-slate-200'
                          }`}>
                            {formula.name}
                          </span>
                          <span className="block text-xs text-slate-500 dark:text-slate-400 leading-normal font-normal">
                            {formula.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Preview of results */}
              <div className="md:col-span-7 space-y-4 text-left">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    2. Xem trước kết quả hiển thị
                  </Label>
                </div>
                
                {/* Google Preview Card */}
                <div className="border border-slate-200/80 dark:border-slate-800/85 bg-slate-50/60 dark:bg-slate-900/20 rounded-xl p-5 space-y-4">
                  {/* Google Mockup Header */}
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-150 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400">G</span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Google Search Preview</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                      Mô phỏng
                    </span>
                  </div>

                  {/* Google Result Box */}
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/85 rounded-lg p-4 shadow-sm space-y-1.5">
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      <span>https://{form.site_name ? String(form.site_name).replace(/\s+/g, '').toLowerCase() : 'domain'}.com</span>
                      <span className="text-[9px]">▼</span>
                    </div>
                    <h3 className="text-lg font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug break-words">
                      {previewData.seo_title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#4d5156] dark:text-[#bdc1c6] leading-relaxed break-words font-normal">
                      {previewData.seo_description}
                    </p>
                  </div>

                  {/* Length Progress Bars */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Title limit bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-500 dark:text-slate-400">Độ dài tiêu đề</span>
                        <span className={`font-semibold ${
                          (previewData.seo_title?.length || 0) > 60 ? 'text-rose-500' : 'text-emerald-500'
                        }`}>
                          {previewData.seo_title?.length || 0}/60
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            (previewData.seo_title?.length || 0) > 60 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(((previewData.seo_title?.length || 0) / 60) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Description limit bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-slate-500 dark:text-slate-400">Độ dài mô tả</span>
                        <span className={`font-semibold ${
                          (previewData.seo_description?.length || 0) > 160 ? 'text-rose-500' : 'text-emerald-500'
                        }`}>
                          {previewData.seo_description?.length || 0}/160
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            (previewData.seo_description?.length || 0) > 160 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(((previewData.seo_description?.length || 0) / 160) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Structured SEO Tags Preview */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
                  <div className="bg-slate-50 dark:bg-slate-900/60 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-350">Dữ liệu thực thể SEO (Entity SEO)</span>
                    <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 bg-slate-200/50 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      Metadata
                    </span>
                  </div>
                  <div className="p-4 space-y-3.5 text-xs divide-y divide-slate-100 dark:divide-slate-850">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 sm:gap-4">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Từ khóa:</span>
                      <span className="sm:col-span-3 text-slate-700 dark:text-slate-350 font-normal break-words">{previewData.seo_keywords || '—'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 sm:gap-4 pt-3.5">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Tên gọi khác:</span>
                      <span className="sm:col-span-3 text-slate-700 dark:text-slate-350 font-normal break-words">{previewData.seo_brand_aliases || '—'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 sm:gap-4 pt-3.5">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Tóm tắt thương hiệu:</span>
                      <span className="sm:col-span-3 text-slate-700 dark:text-slate-350 font-normal break-words leading-relaxed">{previewData.seo_brand_summary || '—'}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 sm:gap-4 pt-3.5">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 shrink-0">Cách khách tìm tên:</span>
                      <span className="sm:col-span-3 text-slate-700 dark:text-slate-350 font-normal break-words">{previewData.seo_brand_search_queries || '—'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 rounded-b-lg flex flex-row items-center justify-between gap-4">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline leading-none">
              Nội dung tạo từ thông tin Website cơ bản
            </span>
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Đóng
              </Button>
              <Button 
                type="button" 
                variant="accent" 
                onClick={handleApply}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all duration-200 shrink-0"
              >
                Áp dụng vào form
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
