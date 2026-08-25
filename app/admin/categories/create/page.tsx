'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Checkbox, Label, cn } from '../../components/ui';
import { LexicalEditor } from '../../components/LexicalEditor';
import { FaqForm } from '@/app/admin/home-components/faq/_components/FaqForm';
import type { FaqItem, FaqStyle, FaqConfig } from '@/app/admin/home-components/faq/_types';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormPageWrapper,
  AdminFormSidebar,
  AdminSelect,
  AdminSlugInput,
  AdminStickyFooter,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';
import { AiCategoryContentImport } from '../_components/AiCategoryContentImport';

const MODULE_KEY = 'productCategories';

export default function CategoryCreatePage() {
  const router = useRouter();
  const categoriesData = useQuery(api.productCategories.listAll, {});
  const createCategory = useMutation(api.productCategories.create);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const hierarchyFeature = useQuery(api.admin.modules.getModuleFeature, {
    featureKey: 'enableCategoryHierarchy',
    moduleKey: 'products',
  });
  void fieldsData;

  // System settings toggles
  const showCategorySubtitleSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'showCategorySubtitle' });
  const enableCategoryFilterFooterContentSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableCategoryFilterFooterContent' });
  const enableCategoryProductDetailSuffixSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableCategoryProductDetailSuffix' });
  const enableCategoryProductDetailFaqSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableCategoryProductDetailFaq' });
  const enableProductTypesSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableProductTypes' });

  const showCategorySubtitle = showCategorySubtitleSetting?.value === true;
  const enableCategoryFilterFooterContent = enableCategoryFilterFooterContentSetting?.value === true;
  const enableCategoryProductDetailSuffix = enableCategoryProductDetailSuffixSetting?.value === true;
  const enableCategoryProductDetailFaq = enableCategoryProductDetailFaqSetting?.value === true;
  const enableProductTypes = enableProductTypesSetting?.value === true;
  const productTypesData = useQuery(api.productTypes.listAll, enableProductTypes ? {} : 'skip');

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [active, setActive] = useState(true);
  const [productTypeIds, setProductTypeIds] = useState<Id<"productTypes">[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New fields state
  const [filterFooterContent, setFilterFooterContent] = useState('');
  const [productDetailSuffixContent, setProductDetailSuffixContent] = useState('');
  const [faqItems, setFaqItems] = useState<FaqItem[]>([{ id: Date.now(), question: '', answer: '' }]);
  const [faqStyle] = useState<FaqStyle>('accordion');
  const [faqConfig, setFaqConfig] = useState<FaqConfig>({ description: '', buttonText: '', buttonLink: '' });
  const [faqEnabled, setFaqEnabled] = useState(true);
  const [aiResetKey, setAiResetKey] = useState(0);

  const handleAiApply = (data: {
    filterFooterContent: string;
    productDetailSuffixContent: string;
    faqItems: FaqItem[];
  }) => {
    if (data.filterFooterContent) {
      setFilterFooterContent(data.filterFooterContent);
    }
    if (data.productDetailSuffixContent) {
      setProductDetailSuffixContent(data.productDetailSuffixContent);
    }
    if (data.faqItems && data.faqItems.length > 0) {
      setFaqItems(data.faqItems);
      setFaqEnabled(true);
    }
    setAiResetKey(prev => prev + 1);
  };

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);
  const isHierarchyEnabled = hierarchyFeature?.enabled === true;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    try {
      const resolvedFaqItems = faqItems
        .filter(f => f.question.trim() || f.answer.trim())
        .map((f, idx) => ({
          id: String(f.id),
          question: f.question.trim(),
          answer: f.answer.trim(),
          order: idx,
        }));

      await createCategory({
        active,
        description: description.trim() || undefined,
        name: name.trim(),
        parentId: isHierarchyEnabled && parentId ? parentId as Id<"productCategories"> : undefined,
        slug: slug.trim(),
        filterFooterContent: enableCategoryFilterFooterContent ? filterFooterContent.trim() : undefined,
        productDetailSuffixContent: enableCategoryProductDetailSuffix ? productDetailSuffixContent.trim() : undefined,
        productDetailFaqItems: enableCategoryProductDetailFaq ? resolvedFaqItems : undefined,
        productDetailFaqStyle: enableCategoryProductDetailFaq ? faqStyle : undefined,
        productDetailFaqEnabled: faqEnabled,
        productTypeIds: enableProductTypes ? productTypeIds : undefined,
      });
      toast.success('Tạo danh mục sản phẩm thành công');
      router.push('/admin/categories');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể tạo danh mục'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentCategoryOptions = [
    { value: '', label: '-- Không có (Danh mục gốc) --' },
    ...(categoriesData?.filter(c => c.active).map(cat => ({ value: cat._id, label: cat.name })) || []),
  ];

  return (
    <AdminFormPageWrapper
      title="Thêm danh mục sản phẩm mới"
      subtitle="Tạo danh mục phân loại và thiết lập nội dung mở rộng cho sản phẩm."
      backHref="/admin/categories"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Tạo danh mục"
          onCancel={() => router.push('/admin/categories')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          aiImportNode={
            <AiCategoryContentImport 
              categoryName={name}
              categoryDescription={description}
              onApply={handleAiApply}
            />
          }
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard title="Thông tin cơ bản">
              <AdminTitleInput
                label="Tên danh mục"
                value={name}
                onChange={handleNameChange}
                required
                placeholder="Ví dụ: Điện thoại, Áo sơ mi, Phụ kiện..."
                autoFocus
                copyLabel="tên danh mục"
              />

              <AdminSlugInput
                slug={slug}
                onChange={setSlug}
                categorySlug="products"
              />

              {(enabledFields.has('description') || showCategorySubtitle) && (
                <div className="space-y-2">
                  <Label>Mô tả ngắn (Subtitle)</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả ngắn hiển thị dưới tên danh mục..."
                    className="w-full min-h-[80px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
                  />
                </div>
              )}
            </AdminFormCard>

            {enableProductTypes && (
              <AdminFormCard
                title="Phân loại & Kiểu sản phẩm"
                description="Chọn kiểu sản phẩm liên kết để kích hoạt các thuộc tính bộ lọc phù hợp."
                extra={
                  <Link href="/admin/product-types" className="text-xs text-blue-600 hover:underline">
                    Quản lý kiểu
                  </Link>
                }
              >
                <div className="border border-slate-200 dark:border-slate-700 rounded-md p-3 max-h-60 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-900/30">
                  {productTypesData === undefined ? (
                    <p className="text-sm text-slate-500 italic">Đang tải kiểu sản phẩm...</p>
                  ) : productTypesData.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Chưa có kiểu sản phẩm nào.</p>
                  ) : (
                    <>
                      <label className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-blue-600">
                        <input
                          type="radio"
                          name="productTypeId"
                          checked={productTypeIds.length === 0}
                          onChange={() => setProductTypeIds([])}
                          className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm font-medium text-slate-500 italic">Không gán kiểu sản phẩm (Bỏ chọn)</span>
                      </label>
                      {productTypesData.map(type => (
                        <label key={type._id} className="flex items-center gap-2 cursor-pointer py-0.5 hover:text-blue-600">
                          <input
                            type="radio"
                            name="productTypeId"
                            checked={productTypeIds.includes(type._id)}
                            onChange={() => setProductTypeIds([type._id])}
                            className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <span className="text-sm font-medium">{type.name}</span>
                          <span className="text-xs text-slate-400 font-mono">({type.slug})</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </AdminFormCard>
            )}

            {enableCategoryFilterFooterContent && (
              <AdminFormCard title="Nội dung cuối trang danh mục" description="Hiển thị ở chân trang danh mục sản phẩm (hỗ trợ SEO on-page).">
                <LexicalEditor
                  onChange={setFilterFooterContent}
                  initialContent={filterFooterContent}
                  resetKey={`create:filterFooterContent:${aiResetKey}`}
                />
              </AdminFormCard>
            )}

            {enableCategoryProductDetailSuffix && (
              <AdminFormCard title="Nội dung nối đuôi chi tiết sản phẩm" description="Tự động gắn vào cuối phần mô tả của toàn bộ sản phẩm thuộc danh mục này.">
                <LexicalEditor
                  onChange={setProductDetailSuffixContent}
                  initialContent={productDetailSuffixContent}
                  resetKey={`create:productDetailSuffixContent:${aiResetKey}`}
                />
              </AdminFormCard>
            )}

            {enableCategoryProductDetailFaq && (
              <AdminFormCard
                title="FAQ chi tiết sản phẩm"
                description="Bộ câu hỏi thường gặp hiển thị trên trang chi tiết sản phẩm thuộc danh mục này."
                extra={
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={faqEnabled}
                      onClick={() => setFaqEnabled(!faqEnabled)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                        faqEnabled ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                          faqEnabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                    <span className={cn(
                      "text-xs font-semibold",
                      faqEnabled ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
                    )}>
                      {faqEnabled ? "Đang bật" : "Đã tắt"}
                    </span>
                  </div>
                }
              >
                {faqEnabled ? (
                  <div className="space-y-4 pt-2">
                    <FaqForm
                      faqItems={faqItems}
                      setFaqItems={setFaqItems}
                      faqStyle={faqStyle}
                      brandColor="#2563eb"
                      faqConfig={faqConfig}
                      setFaqConfig={setFaqConfig}
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-700 p-6 text-center bg-slate-50/50 dark:bg-slate-900/50">
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">FAQ chi tiết sản phẩm đã bị tắt cho danh mục này</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Các câu hỏi FAQ đã soạn thảo vẫn được lưu trữ an toàn nhưng sẽ không hiển thị ngoài giao diện web cho đến khi bạn bật lại.</p>
                  </div>
                )}
              </AdminFormCard>
            )}
          </AdminFormMain>

          <AdminFormSidebar>
            <AdminFormCard title="Xuất bản & Phân cấp">
              {isHierarchyEnabled && (
                <div className="space-y-2">
                  <Label>Danh mục cha</Label>
                  <AdminSelect
                    value={parentId}
                    onChange={setParentId}
                    options={parentCategoryOptions}
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="active"
                  checked={active}
                  onCheckedChange={(checked) => setActive(Boolean(checked))}
                />
                <Label htmlFor="active" className="cursor-pointer text-sm font-medium">
                  Kích hoạt hiển thị danh mục
                </Label>
              </div>
            </AdminFormCard>
          </AdminFormSidebar>
        </AdminFormGrid>
      </form>
    </AdminFormPageWrapper>
  );
}
