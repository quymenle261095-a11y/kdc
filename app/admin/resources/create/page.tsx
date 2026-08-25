'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { Checkbox, Input, Label } from '@/app/admin/components/ui';
import { MultiImageUploader, type ImageItem } from '@/app/admin/components/MultiImageUploader';
import { LexicalEditor } from '@/app/admin/components/LexicalEditor';
import { QuickCreateResourceCategoryModal } from '@/app/admin/components/QuickCreateResourceCategoryModal';
import { ResourceFilterTagsInput } from '@/app/admin/components/ResourceFilterTagsInput';
import { AiEntityImportDialog, type AiEntityImportPayload } from '@/app/admin/components/AiEntityImportDialog';
import { stripHtml, truncateText } from '@/lib/seo';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import {
  AdvancedSeoFields,
  SeoFormTabs,
  normalizeSeoFaqItems,
  normalizeSeoStringList,
  type SeoFaqItem,
  type SeoFormTab,
} from '@/app/admin/components/AdvancedSeoFields';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormPageWrapper,
  AdminFormSidebar,
  AdminPublishSidebarCard,
  AdminSelect,
  AdminSeoMetaCard,
  AdminSlugInput,
  AdminStickyFooter,
  AdminThumbnailSidebarCard,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';

const MODULE_KEY = 'resources';

type PricingType = 'free' | 'paid' | 'contact';
type ResourceStatus = 'Published' | 'Draft';
type RenderType = 'content' | 'markdown' | 'html';

export default function ResourceCreatePage() {
  const router = useRouter();

  const categoriesData = useQuery(api.resourceCategories.listAll, {});
  const createResource = useMutation(api.resources.create);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const featuredFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: MODULE_KEY, featureKey: 'enableFeaturedResources' });
  const galleryFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: MODULE_KEY, featureKey: 'enableResourceGallery' });
  const resourceFiltersFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: MODULE_KEY, featureKey: 'enableResourceFilters' });
  const activeFilters = useQuery(api.resourceFilters.listActive, {});
  const allFilterValues = useQuery(api.resourceFilters.listAllValues, {});

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [thumbnailStorageId, setThumbnailStorageId] = useState<Id<'_storage'> | undefined | null>();
  const [downloadUrl, setDownloadUrl] = useState('');
  const [status, setStatus] = useState<ResourceStatus>('Draft');
  const [pricingType, setPricingType] = useState<PricingType>('free');
  const [priceAmount, setPriceAmount] = useState<number | undefined>();
  const [comparePriceAmount, setComparePriceAmount] = useState<number | undefined>();
  const [priceNote, setPriceNote] = useState('');
  const [isPriceVisible, setIsPriceVisible] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [renderType, setRenderType] = useState<RenderType>('content');
  const [markdownRender, setMarkdownRender] = useState('');
  const [htmlRender, setHtmlRender] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [galleryItems, setGalleryItems] = useState<ImageItem[]>([]);
  const [selectedValueIds, setSelectedValueIds] = useState<Id<'resourceFilterValues'>[]>([]);
  const [seoTab, setSeoTab] = useState<SeoFormTab>('content');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [faqItems, setFaqItems] = useState<SeoFaqItem[]>([]);

  const enabledFields = useMemo(() => new Set(fieldsData?.map((field) => field.fieldKey) ?? []), [fieldsData]);
  const multiCategoryEnabled = Boolean(settingsData?.find((setting) => setting.settingKey === 'enableMultipleCategories')?.value);
  const showGallery = galleryFeature?.enabled && enabledFields.has('images');
  const categorySlugPreview = categoriesData?.find((category) => category._id === categoryId)?.slug || 'resources';
  const hasMarkdownRender = enabledFields.has('markdownRender');
  const hasHtmlRender = enabledFields.has('htmlRender');
  const showAdvancedRender = hasMarkdownRender || hasHtmlRender;
  const showAdvancedSeoFields = enabledFields.has('focusKeyword')
    || enabledFields.has('tags')
    || enabledFields.has('relatedQueries')
    || enabledFields.has('faqItems');

  const aiImportCurrentData = useMemo<AiEntityImportPayload>(() => ({
    comparePriceAmount,
    content: content.trim(),
    downloadUrl: downloadUrl.trim(),
    excerpt: excerpt.trim(),
    faqItems: normalizeSeoFaqItems(faqItems),
    featured,
    focusKeyword: focusKeyword.trim(),
    htmlRender: htmlRender.trim(),
    isPriceVisible,
    markdownRender: markdownRender.trim(),
    metaDescription: metaDescription.trim(),
    metaTitle: metaTitle.trim(),
    price: priceAmount,
    priceNote: priceNote.trim(),
    pricingType,
    relatedQueries: normalizeSeoStringList(relatedQueries),
    slug: slug.trim(),
    tags: normalizeSeoStringList(tags),
    thumbnail: thumbnail ?? '',
    title: title.trim(),
  }), [comparePriceAmount, content, downloadUrl, excerpt, faqItems, featured, focusKeyword, htmlRender, isPriceVisible, markdownRender, metaDescription, metaTitle, priceAmount, priceNote, pricingType, relatedQueries, slug, tags, thumbnail, title]);

  useEffect(() => {
    if (!settingsData) return;
    const defaultStatus = settingsData.find((setting) => setting.settingKey === 'defaultStatus')?.value;
    const defaultPricingType = settingsData.find((setting) => setting.settingKey === 'defaultPricingType')?.value;
    if (defaultStatus === 'published') { setStatus('Published'); }
    if (defaultPricingType === 'paid' || defaultPricingType === 'contact' || defaultPricingType === 'free') {
      setPricingType(defaultPricingType);
    }
  }, [settingsData]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = event.target.value;
    setTitle(nextTitle);
    setSlug(generateSlugFromTitle(nextTitle));
  };

  const handleApplyAiResource = (item: AiEntityImportPayload) => {
    const nextTitle = item.title || title;
    const nextContent = item.content || content;
    const nextPricingType: PricingType = item.pricingType === 'paid' || item.pricingType === 'contact' ? item.pricingType : 'free';

    setTitle(nextTitle);
    setSlug(item.slug ? generateSlugFromTitle(item.slug) : generateSlugFromTitle(nextTitle));
    setContent(nextContent);
    if (item.htmlRender) {
      setRenderType('html');
      setHtmlRender(item.htmlRender);
    } else if (item.markdownRender) {
      setRenderType('markdown');
      setMarkdownRender(item.markdownRender);
    }
    setExcerpt(item.excerpt || item.description || truncateText(stripHtml(nextContent), 180));
    setMetaTitle(item.metaTitle || truncateText(nextTitle, 60));
    setMetaDescription(item.metaDescription || truncateText(stripHtml(item.excerpt || nextContent), 160));
    if (item.thumbnail || item.image) {
      setThumbnail(item.thumbnail || item.image);
      setThumbnailStorageId(undefined);
    }
    if (item.downloadUrl) { setDownloadUrl(item.downloadUrl); }
    setPricingType(nextPricingType);
    if (typeof item.price === 'number') { setPriceAmount(item.price); }
    if (typeof item.comparePriceAmount === 'number') { setComparePriceAmount(item.comparePriceAmount); }
    if (item.priceNote) { setPriceNote(item.priceNote); }
    if (typeof item.isPriceVisible === 'boolean') { setIsPriceVisible(item.isPriceVisible); }
    if (typeof item.featured === 'boolean') { setFeatured(item.featured); }
    if (item.focusKeyword) { setFocusKeyword(item.focusKeyword); }
    if (item.tags) { setTags(item.tags); }
    if (item.relatedQueries) { setRelatedQueries(item.relatedQueries); }
    if (item.faqItems) { setFaqItems(normalizeSeoFaqItems(item.faqItems)); }
    setEditorResetKey((prev) => prev + 1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !categoryId || !downloadUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const resolvedMetaTitle = truncateText(title.trim(), 60);
      const resolvedMetaDescription = truncateText(stripHtml(excerpt || content || ''), 160);

      await createResource({
        additionalCategoryIds: multiCategoryEnabled
          ? (additionalCategoryIds.filter((item) => item !== categoryId) as Id<'resourceCategories'>[])
          : undefined,
        categoryId: categoryId as Id<'resourceCategories'>,
        comparePriceAmount: pricingType === 'paid' ? comparePriceAmount : undefined,
        content,
        downloadUrl: downloadUrl.trim(),
        excerpt: enabledFields.has('excerpt') ? (excerpt.trim() || undefined) : undefined,
        faqItems: enabledFields.has('faqItems') ? normalizeSeoFaqItems(faqItems) : undefined,
        featured: featuredFeature?.enabled ? featured : false,
        filterValueIds: resourceFiltersFeature?.enabled && selectedValueIds.length > 0 ? selectedValueIds : undefined,
        focusKeyword: enabledFields.has('focusKeyword') ? (focusKeyword.trim() || undefined) : undefined,
        htmlRender: hasHtmlRender ? (htmlRender.trim() || undefined) : undefined,
        images: showGallery ? galleryItems.map((item) => item.url).filter(Boolean) : undefined,
        imageStorageIds: showGallery ? galleryItems.map((item) => item.storageId ?? null) : undefined,
        isPriceVisible,
        markdownRender: hasMarkdownRender ? (markdownRender.trim() || undefined) : undefined,
        metaDescription: enabledFields.has('metaDescription') ? (metaDescription.trim() || resolvedMetaDescription || undefined) : undefined,
        metaTitle: enabledFields.has('metaTitle') ? (metaTitle.trim() || resolvedMetaTitle || undefined) : undefined,
        priceAmount: pricingType === 'paid' ? priceAmount : undefined,
        priceNote: priceNote.trim() || undefined,
        pricingType,
        relatedQueries: enabledFields.has('relatedQueries') ? normalizeSeoStringList(relatedQueries) : undefined,
        renderType,
        slug: slug.trim() || generateSlugFromTitle(title),
        status,
        tags: enabledFields.has('tags') ? normalizeSeoStringList(tags) : undefined,
        thumbnail,
        thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
        title: title.trim(),
      });

      toast.success('Đã tạo tài nguyên thành công');
      router.push('/admin/resources');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể tạo tài nguyên'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm tài nguyên mới"
      subtitle="Tạo tài nguyên tải về, file số hoặc template mới."
      backHref="/admin/resources"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Tạo tài nguyên"
          onCancel={() => router.push('/admin/resources')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          aiImportNode={
            <AiEntityImportDialog
              kind="resource"
              currentData={aiImportCurrentData}
              enabledFields={enabledFields}
              onApply={handleApplyAiResource}
            />
          }
        />
      }
    >
      <QuickCreateResourceCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCreated={(id: string) => setCategoryId(id)}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <SeoFormTabs activeTab={seoTab} onChange={setSeoTab} />

        {seoTab === 'content' ? (
          <AdminFormGrid>
            <AdminFormMain>
              <AdminFormCard title="Nội dung chính">
                <AdminTitleInput
                  label="Tên tài nguyên"
                  value={title}
                  onChange={handleTitleChange}
                  required
                  placeholder="Nhập tên tài nguyên..."
                  autoFocus
                  copyLabel="tên tài nguyên"
                />

                <AdminSlugInput
                  slug={slug}
                  onChange={setSlug}
                  categorySlug={categorySlugPreview}
                />

                {enabledFields.has('excerpt') && (
                  <div className="space-y-2">
                    <Label>Mô tả ngắn</Label>
                    <Input
                      value={excerpt}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) => setExcerpt(event.target.value)}
                      placeholder="Tóm tắt ngắn gọn về tài nguyên..."
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Nội dung chi tiết</Label>
                  <LexicalEditor
                    onChange={setContent}
                    initialContent={content}
                    resetKey={editorResetKey}
                  />
                </div>
              </AdminFormCard>

              {showAdvancedRender && (
                <AdminFormCard title="Nội dung nâng cao">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Kiểu hiển thị nội dung</Label>
                      <AdminSelect
                        value={renderType}
                        onChange={(val) => setRenderType(val as RenderType)}
                        options={[
                          { value: 'content', label: 'Soạn thảo Visual (Mặc định)' },
                          ...(hasMarkdownRender ? [{ value: 'markdown', label: 'Markdown Code' }] : []),
                          ...(hasHtmlRender ? [{ value: 'html', label: 'HTML Tự do' }] : []),
                        ]}
                      />
                    </div>

                    {renderType === 'markdown' && hasMarkdownRender && (
                      <div className="space-y-2">
                        <Label>Nội dung Markdown</Label>
                        <textarea
                          value={markdownRender}
                          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setMarkdownRender(event.target.value)}
                          className="min-h-[140px] w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}

                    {renderType === 'html' && hasHtmlRender && (
                      <div className="space-y-2">
                        <Label>Mã nguồn HTML</Label>
                        <textarea
                          value={htmlRender}
                          onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setHtmlRender(event.target.value)}
                          className="min-h-[140px] w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}
                  </div>
                </AdminFormCard>
              )}

              {(enabledFields.has('metaTitle') || enabledFields.has('metaDescription')) && (
                <AdminSeoMetaCard
                  metaTitle={metaTitle}
                  onMetaTitleChange={setMetaTitle}
                  metaDescription={metaDescription}
                  onMetaDescriptionChange={setMetaDescription}
                  fallbackTitle={title}
                  fallbackDescription={excerpt || stripHtml(content).slice(0, 160)}
                  slug={slug}
                  categorySlug={categorySlugPreview}
                  thumbnailUrl={thumbnail}
                  showTitleInput={enabledFields.has('metaTitle')}
                  showDescriptionInput={enabledFields.has('metaDescription')}
                />
              )}
            </AdminFormMain>

            <AdminFormSidebar>
              <AdminPublishSidebarCard
                status={status}
                onStatusChange={(val) => setStatus(val as ResourceStatus)}
                categoryId={categoryId}
                onCategoryIdChange={setCategoryId}
                categories={categoriesData}
                multiCategoryEnabled={multiCategoryEnabled}
                additionalCategoryIds={additionalCategoryIds}
                onAdditionalCategoryIdsChange={setAdditionalCategoryIds}
                onOpenCategoryModal={() => setShowCategoryModal(true)}
                categoryLabel="Danh mục chính"
                categoryHint="Thẻ đầu tiên là danh mục chính/canonical."
              />

              <AdminFormCard title="Tệp tải về">
                <div className="space-y-2">
                  <Label>Link tải (Google Drive / Direct URL) <span className="text-red-500">*</span></Label>
                  <Input
                    value={downloadUrl}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDownloadUrl(event.target.value)}
                    required
                    placeholder="https://drive.google.com/..."
                  />
                  <p className="text-xs text-slate-500">Người dùng sẽ nhận link sau khi đăng nhập hoặc mở khóa.</p>
                </div>
              </AdminFormCard>

              <AdminFormCard title="Giá bán & Phân phối">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Kiểu giá</Label>
                    <AdminSelect
                      value={pricingType}
                      onChange={(val) => setPricingType(val as PricingType)}
                      options={[
                        { value: 'free', label: 'Miễn phí' },
                        { value: 'paid', label: 'Trả phí' },
                        { value: 'contact', label: 'Liên hệ' },
                      ]}
                    />
                  </div>

                  {pricingType === 'paid' && (
                    <>
                      <div className="space-y-2">
                        <Label>Giá bán (VNĐ)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={priceAmount ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPriceAmount(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Giá gốc so sánh (VNĐ)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={comparePriceAmount ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setComparePriceAmount(e.target.value ? Number(e.target.value) : undefined)}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label>Ghi chú giá</Label>
                    <Input
                      value={priceNote}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPriceNote(e.target.value)}
                      placeholder="VD: Sử dụng vĩnh viễn"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Checkbox
                      id="isPriceVisible"
                      checked={isPriceVisible}
                      onCheckedChange={(checked: boolean | 'indeterminate') => setIsPriceVisible(Boolean(checked))}
                    />
                    <Label htmlFor="isPriceVisible" className="cursor-pointer text-sm">
                      Hiển thị giá công khai ngoài trang
                    </Label>
                  </div>
                </div>
              </AdminFormCard>

              <AdminThumbnailSidebarCard
                thumbnail={thumbnail}
                thumbnailStorageId={thumbnailStorageId}
                onThumbnailChange={(url, storageId) => {
                  setThumbnail(url);
                  setThumbnailStorageId(storageId);
                }}
                folder="resources"
                entitySlug={slug || 'resource'}
                aspectRatio="video"
              />

              {showGallery && (
                <AdminFormCard title="Thư viện ảnh">
                  <MultiImageUploader<ImageItem>
                    items={galleryItems}
                    onChange={setGalleryItems}
                    folder="resources"
                    naming={{ entityName: slug.trim() || 'resource', style: 'slug-index' }}
                    namingIndexOffset={1}
                    imageKey="url"
                    aspectRatio="video"
                    columns={2}
                    addButtonText="Thêm ảnh"
                    emptyText="Chưa có ảnh trong thư viện"
                    deleteMode="defer"
                    layout="vertical"
                  />
                </AdminFormCard>
              )}

              {featuredFeature?.enabled && (
                <AdminFormCard title="Nổi bật">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="featured"
                      checked={featured}
                      onCheckedChange={(checked: boolean | 'indeterminate') => setFeatured(Boolean(checked))}
                    />
                    <Label htmlFor="featured" className="cursor-pointer text-sm font-medium">
                      Đánh dấu tài nguyên nổi bật
                    </Label>
                  </div>
                </AdminFormCard>
              )}

              {resourceFiltersFeature?.enabled && (
                <AdminFormCard title="Bộ lọc tài nguyên">
                  <ResourceFilterTagsInput
                    activeFilters={activeFilters ?? []}
                    allFilterValues={allFilterValues ?? []}
                    value={selectedValueIds}
                    onChange={setSelectedValueIds}
                    placeholder="Chọn bộ lọc tài nguyên..."
                  />
                </AdminFormCard>
              )}
            </AdminFormSidebar>
          </AdminFormGrid>
        ) : showAdvancedSeoFields ? (
          <AdminFormGrid>
            <AdminFormMain>
              <AdvancedSeoFields
                focusKeyword={focusKeyword}
                onFocusKeywordChange={setFocusKeyword}
                tags={tags}
                onTagsChange={setTags}
                relatedQueries={relatedQueries}
                onRelatedQueriesChange={setRelatedQueries}
                faqItems={faqItems}
                onFaqItemsChange={setFaqItems}
                showFocusKeyword={enabledFields.has('focusKeyword')}
                showTags={enabledFields.has('tags')}
                showRelatedQueries={enabledFields.has('relatedQueries')}
                showFaqItems={enabledFields.has('faqItems')}
              />
            </AdminFormMain>

            <AdminFormSidebar>
              <AdminFormCard title="Trạng thái SEO">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Thiết lập từ khóa chính, thẻ tags và câu hỏi thường gặp (FAQ Schema) để tối ưu hiển thị trên các công cụ tìm kiếm.
                </p>
              </AdminFormCard>
            </AdminFormSidebar>
          </AdminFormGrid>
        ) : (
          <AdminFormCard>
            <div className="py-8 text-center text-sm text-slate-500">
              SEO nâng cao đang tắt trong cấu hình module Resources.
            </div>
          </AdminFormCard>
        )}
      </form>
    </AdminFormPageWrapper>
  );
}
