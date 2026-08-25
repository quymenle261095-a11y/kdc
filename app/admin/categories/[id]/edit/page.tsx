'use client';

import React, { use, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Badge, Button, Checkbox, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '../../../components/ui';
import { buildCategoryPath, normalizeRouteMode } from '@/lib/ia/route-mode';
import { LexicalEditor } from '@/app/admin/components/LexicalEditor';
import { FaqForm } from '@/app/admin/home-components/faq/_components/FaqForm';
import type { FaqItem, FaqStyle, FaqConfig } from '@/app/admin/home-components/faq/_types';
import { AiCategoryContentImport } from '../../_components/AiCategoryContentImport';
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

const MODULE_KEY = 'productCategories';

const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(price);

export default function CategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const categoryData = useQuery(api.productCategories.getById, { id: id as Id<"productCategories"> });
  const categoriesData = useQuery(api.productCategories.listAll, {});
  const relatedProducts = useQuery(api.products.listProductsByCategoryForAdmin, { categoryId: id as Id<"productCategories"> }) ?? [];
  const updateCategory = useMutation(api.productCategories.update);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const hierarchyFeature = useQuery(api.admin.modules.getModuleFeature, {
    featureKey: 'enableCategoryHierarchy',
    moduleKey: 'products',
  });
  const routeModeSetting = useQuery(api.settings.getValue, { key: 'ia_route_mode', defaultValue: 'unified' });
  const routeMode = useMemo(() => normalizeRouteMode(routeModeSetting), [routeModeSetting]);

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
  const assignedProductTypesData = useQuery(
    api.productTypes.listAssignedTypesForCategory,
    enableProductTypes ? { categoryId: id as Id<"productCategories"> } : 'skip'
  );

  const [activeTab, setActiveTab] = useState<'info' | 'products'>('info');
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
  const [faqStyle, setFaqStyle] = useState<FaqStyle>('accordion');
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

  // Ref & State for Dirty State
  const initialSnapshotRef = useRef<{
    name: string;
    slug: string;
    description: string;
    parentId: string;
    active: boolean;
    filterFooterContent: string;
    productDetailSuffixContent: string;
    faqItems: { id: string; question: string; answer: string; order: number }[];
    faqStyle: string;
    faqEnabled: boolean;
    productTypeIds: string[];
  } | null>(null);

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [snapshotVersion, setSnapshotVersion] = useState(0);

  const currentSnapshot = useMemo(() => {
    const resolvedFaqItems = faqItems
      .filter(f => f.question.trim() || f.answer.trim())
      .map((f, idx) => ({
        id: String(f.id),
        question: f.question.trim(),
        answer: f.answer.trim(),
        order: idx,
      }));

    return {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim(),
      parentId: parentId || '',
      active,
      filterFooterContent: filterFooterContent.trim(),
      productDetailSuffixContent: productDetailSuffixContent.trim(),
      faqItems: resolvedFaqItems,
      faqStyle,
      faqEnabled,
      productTypeIds: [...productTypeIds].sort(),
    };
  }, [name, slug, description, parentId, active, filterFooterContent, productDetailSuffixContent, faqItems, faqStyle, faqEnabled, productTypeIds]);

  const hasChanges = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return JSON.stringify(initialSnapshotRef.current) !== JSON.stringify(currentSnapshot);
  }, [currentSnapshot, snapshotVersion]);

  useEffect(() => {
    if (saveStatus === 'saving') return;
    if (hasChanges && saveStatus === 'saved') {
      setSaveStatus('idle');
      return;
    }
    if (!hasChanges && saveStatus === 'idle') {
      setSaveStatus('saved');
    }
  }, [hasChanges, saveStatus]);

  useEffect(() => {
    if (categoryData) {
      setName(categoryData.name);
      setSlug(categoryData.slug);
      setDescription(categoryData.description ?? '');
      setParentId(categoryData.parentId ?? '');
      setActive(categoryData.active);

      const loadedFilterFooterContent = categoryData.filterFooterContent ?? '';
      const loadedProductDetailSuffixContent = categoryData.productDetailSuffixContent ?? '';
      setFilterFooterContent(loadedFilterFooterContent);
      setProductDetailSuffixContent(loadedProductDetailSuffixContent);
      
      let loadedFaqItems: FaqItem[] = [];
      if (categoryData.productDetailFaqItems && categoryData.productDetailFaqItems.length > 0) {
        loadedFaqItems = categoryData.productDetailFaqItems.map(item => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
        })) as FaqItem[];
      } else {
        loadedFaqItems = [{ id: Date.now(), question: '', answer: '' }];
      }
      setFaqItems(loadedFaqItems);
      
      const loadedFaqStyle = (categoryData.productDetailFaqStyle as FaqStyle) ?? 'accordion';
      setFaqStyle(loadedFaqStyle);

      const loadedFaqEnabled = categoryData.productDetailFaqEnabled !== false;
      setFaqEnabled(loadedFaqEnabled);

      const resolvedFaqItems = loadedFaqItems
        .filter(f => f.question.trim() || f.answer.trim())
        .map((f, idx) => ({
          id: String(f.id),
          question: f.question.trim(),
          answer: f.answer.trim(),
          order: idx,
        }));

      initialSnapshotRef.current = {
        name: categoryData.name.trim(),
        slug: categoryData.slug.trim(),
        description: (categoryData.description ?? '').trim(),
        parentId: categoryData.parentId ?? '',
        active: categoryData.active,
        filterFooterContent: loadedFilterFooterContent.trim(),
        productDetailSuffixContent: loadedProductDetailSuffixContent.trim(),
        faqItems: resolvedFaqItems,
        faqStyle: loadedFaqStyle,
        faqEnabled: loadedFaqEnabled,
        productTypeIds: [...productTypeIds].sort(),
      };
      setSnapshotVersion(prev => prev + 1);
    }
  }, [categoryData]);

  useEffect(() => {
    if (!assignedProductTypesData) return;
    const nextProductTypeIds = assignedProductTypesData.map(type => type._id);
    setProductTypeIds(nextProductTypeIds);
    if (initialSnapshotRef.current) {
      initialSnapshotRef.current = {
        ...initialSnapshotRef.current,
        productTypeIds: [...nextProductTypeIds].sort(),
      };
      setSnapshotVersion(prev => prev + 1);
    }
  }, [assignedProductTypesData]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    setSaveStatus('saving');
    try {
      const resolvedFaqItems = faqItems
        .filter(f => f.question.trim() || f.answer.trim())
        .map((f, idx) => ({
          id: String(f.id),
          question: f.question.trim(),
          answer: f.answer.trim(),
          order: idx,
        }));

      await updateCategory({
        active,
        description: description.trim() || undefined,
        id: id as Id<"productCategories">,
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

      initialSnapshotRef.current = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        parentId: parentId || '',
        active,
        filterFooterContent: filterFooterContent.trim(),
        productDetailSuffixContent: productDetailSuffixContent.trim(),
        faqItems: resolvedFaqItems,
        faqStyle,
        faqEnabled,
        productTypeIds: [...productTypeIds].sort(),
      };
      setSnapshotVersion(prev => prev + 1);
      setSaveStatus('saved');
      toast.success('Cập nhật danh mục thành công');
    } catch (error) {
      setSaveStatus('idle');
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật danh mục'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentCategoryOptions = [
    { value: '', label: '-- Không có (Danh mục gốc) --' },
    ...(categoriesData?.filter(c => c._id !== id).map(cat => ({ value: cat._id, label: cat.name })) || []),
  ];

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa danh mục sản phẩm"
      subtitle="Quản lý và cập nhật thông tin phân loại sản phẩm cùng nội dung mở rộng."
      backHref="/admin/categories"
      isLoading={categoryData === undefined}
      notFound={categoryData === null}
      notFoundMessage="Không tìm thấy danh mục yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting || saveStatus === 'saving'}
      isDirty={hasChanges}
      saveLabel="Lưu thay đổi"
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting || saveStatus === 'saving'}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
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
      extraHeaderAction={
        slug ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => window.open(buildCategoryPath({ categorySlug: slug, mode: routeMode, moduleKey: 'products' }), '_blank')}
          >
            <ExternalLink size={13} /> Xem trên web
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={cn(
              "px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors",
              activeTab === 'info'
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            Thông tin danh mục
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={cn(
              "px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === 'products'
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            Sản phẩm thuộc danh mục
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-4">
              {relatedProducts.length}
            </Badge>
          </button>
        </div>

        {activeTab === 'info' ? (
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
                      key={`${id}:filterFooterContent:${aiResetKey}`}
                      resetKey={`${id}:filterFooterContent:${aiResetKey}`}
                      onChange={setFilterFooterContent}
                      initialContent={filterFooterContent}
                    />
                  </AdminFormCard>
                )}

                {enableCategoryProductDetailSuffix && (
                  <AdminFormCard title="Nội dung nối đuôi chi tiết sản phẩm" description="Tự động gắn vào cuối phần mô tả của toàn bộ sản phẩm thuộc danh mục này.">
                    <LexicalEditor
                      key={`${id}:productDetailSuffixContent:${aiResetKey}`}
                      resetKey={`${id}:productDetailSuffixContent:${aiResetKey}`}
                      onChange={setProductDetailSuffixContent}
                      initialContent={productDetailSuffixContent}
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
        ) : (
          <AdminFormCard title={`Danh sách sản phẩm trong danh mục (${relatedProducts.length})`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Hình ảnh</TableHead>
                  <TableHead>Tên sản phẩm</TableHead>
                  <TableHead className="w-32">Giá bán</TableHead>
                  <TableHead className="w-20">Kho</TableHead>
                  <TableHead className="w-28">Trạng thái</TableHead>
                  <TableHead className="w-20 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedProducts.map((prod) => (
                  <TableRow key={prod._id}>
                    <TableCell>
                      {prod.image ? (
                        <Image
                          src={prod.image}
                          width={44}
                          height={44}
                          className="w-11 h-11 object-cover rounded-md bg-slate-100 dark:bg-slate-800"
                          alt=""
                        />
                      ) : (
                        <div className="w-11 h-11 bg-slate-100 dark:bg-slate-800 rounded-md" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm text-slate-800 dark:text-slate-200">
                      {prod.name}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {prod.salePrice ? (
                        <span className="text-red-500 font-semibold">{formatPrice(prod.salePrice)}</span>
                      ) : (
                        formatPrice(prod.price)
                      )}
                    </TableCell>
                    <TableCell className={cn("text-sm", prod.stock < 10 ? 'text-red-500 font-medium' : '')}>
                      {prod.stock}
                    </TableCell>
                    <TableCell>
                      <Badge variant={prod.status === 'Active' ? 'success' : 'secondary'}>
                        {prod.status === 'Active' ? 'Đang bán' : (prod.status === 'Draft' ? 'Nháp' : 'Lưu trữ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/products/${prod._id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600">
                          Sửa
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {relatedProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-sm">
                      Chưa có sản phẩm nào trong danh mục này.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AdminFormCard>
        )}
      </div>
    </AdminFormPageWrapper>
  );
}
