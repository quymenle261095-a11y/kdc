'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { Checkbox, Input, Label } from '@/app/admin/components/ui';
import { LexicalEditor } from '@/app/admin/components/LexicalEditor';
import { QuickCreateServiceCategoryModal } from '@/app/admin/components/QuickCreateServiceCategoryModal';
import { stripHtml, truncateText } from '@/lib/seo';
import {
  normalizeSlotTemplate,
  normalizeSlotTemplateByWeekday,
  type BookingSlotTemplateByWeekday,
} from '@/lib/bookings/slotTemplate';
import { AiEntityImportDialog, type AiEntityImportPayload } from '@/app/admin/components/AiEntityImportDialog';
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

const MODULE_KEY = 'services';

export default function ServiceCreatePage() {
  const router = useRouter();

  const categoriesData = useQuery(api.serviceCategories.listAll, {});
  const createService = useMutation(api.services.create);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const bookingsFeature = useQuery(api.admin.modules.getModuleFeature, {
    featureKey: 'enableBookings',
    moduleKey: MODULE_KEY,
  });

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [price, setPrice] = useState<number | undefined>();
  const [duration, setDuration] = useState('');
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [thumbnailStorageId, setThumbnailStorageId] = useState<Id<'_storage'> | undefined | null>();
  const [status, setStatus] = useState<'Draft' | 'Published'>('Draft');
  const [featured, setFeatured] = useState(false);
  const [renderType, setRenderType] = useState<'content' | 'markdown' | 'html'>('content');
  const [markdownRender, setMarkdownRender] = useState('');
  const [htmlRender, setHtmlRender] = useState('');
  const [bookingEnabled, setBookingEnabled] = useState(false);
  const [bookingDurationMin, setBookingDurationMin] = useState(60);
  const [bookingSlotIntervalMin, setBookingSlotIntervalMin] = useState(30);
  const [bookingCapacityPerSlot, setBookingCapacityPerSlot] = useState(1);
  const bookingSlotTemplateDefault: string[] = [];
  const bookingSlotTemplateByWeekday: BookingSlotTemplateByWeekday = {};
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [seoTab, setSeoTab] = useState<SeoFormTab>('content');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [faqItems, setFaqItems] = useState<SeoFaqItem[]>([]);

  const enabledFields = useMemo(() => new Set(fieldsData?.map((f) => f.fieldKey) ?? []), [fieldsData]);
  const multiCategoryEnabled = Boolean(
    settingsData?.find((s) => s.settingKey === 'enableMultipleCategories')?.value
  );
  const isBookingsModuleEnabled = Boolean(bookingsFeature?.enabled && enabledFields.has('bookings'));
  const categorySlugPreview = categoriesData?.find((c) => c._id === categoryId)?.slug || 'services';
  const hasMarkdownRender = enabledFields.has('markdownRender');
  const hasHtmlRender = enabledFields.has('htmlRender');
  const showAdvancedRenderCard = hasMarkdownRender || hasHtmlRender;
  const showAdvancedSeoFields = enabledFields.has('focusKeyword')
    || enabledFields.has('tags')
    || enabledFields.has('relatedQueries')
    || enabledFields.has('faqItems');

  const aiImportCurrentData = useMemo<AiEntityImportPayload>(() => ({
    content: content.trim(),
    duration: duration.trim(),
    excerpt: excerpt.trim(),
    faqItems: normalizeSeoFaqItems(faqItems),
    featured,
    focusKeyword: focusKeyword.trim(),
    htmlRender: htmlRender.trim(),
    markdownRender: markdownRender.trim(),
    metaDescription: metaDescription.trim(),
    metaTitle: metaTitle.trim(),
    price,
    relatedQueries: normalizeSeoStringList(relatedQueries),
    slug: slug.trim(),
    tags: normalizeSeoStringList(tags),
    thumbnail: thumbnail ?? '',
    title: title.trim(),
  }), [content, duration, excerpt, faqItems, featured, focusKeyword, htmlRender, markdownRender, metaDescription, metaTitle, price, relatedQueries, slug, tags, thumbnail, title]);

  useEffect(() => {
    if (!settingsData) return;
    const defaultStatus = settingsData.find((s) => s.settingKey === 'defaultStatus')?.value;
    if (defaultStatus === 'published') { setStatus('Published'); }
  }, [settingsData]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = e.target.value;
    setTitle(nextTitle);
    setSlug(generateSlugFromTitle(nextTitle));
  };

  const handleApplyAiService = (item: AiEntityImportPayload) => {
    const nextTitle = item.title || title;
    const nextContent = item.content || content;

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
    if (typeof item.price === 'number') { setPrice(item.price); }
    if (typeof item.duration === 'string') { setDuration(item.duration); }
    if (typeof item.featured === 'boolean') { setFeatured(item.featured); }
    if (item.focusKeyword) { setFocusKeyword(item.focusKeyword); }
    if (item.tags) { setTags(item.tags); }
    if (item.relatedQueries) { setRelatedQueries(item.relatedQueries); }
    if (item.faqItems) { setFaqItems(normalizeSeoFaqItems(item.faqItems)); }
    setEditorResetKey((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) return;

    setIsSubmitting(true);
    try {
      const resolvedMetaTitle = truncateText(title.trim(), 60);
      const resolvedMetaDescription = truncateText(stripHtml(excerpt || content || ''), 160);

      await createService({
        additionalCategoryIds: multiCategoryEnabled
          ? (additionalCategoryIds.filter((id) => id !== categoryId) as Id<'serviceCategories'>[])
          : undefined,
        bookingCapacityPerSlot: isBookingsModuleEnabled ? bookingCapacityPerSlot : undefined,
        bookingDurationMin: isBookingsModuleEnabled ? bookingDurationMin : undefined,
        bookingEnabled: isBookingsModuleEnabled ? bookingEnabled : false,
        bookingSlotIntervalMin: isBookingsModuleEnabled ? bookingSlotIntervalMin : undefined,
        bookingSlotTemplateByWeekday: isBookingsModuleEnabled
          ? normalizeSlotTemplateByWeekday(bookingSlotTemplateByWeekday)
          : undefined,
        bookingSlotTemplateDefault: isBookingsModuleEnabled
          ? normalizeSlotTemplate(bookingSlotTemplateDefault)
          : undefined,
        categoryId: categoryId as Id<'serviceCategories'>,
        content,
        duration: enabledFields.has('duration') ? (duration.trim() || undefined) : undefined,
        excerpt: enabledFields.has('excerpt') ? (excerpt.trim() || undefined) : undefined,
        faqItems: enabledFields.has('faqItems') ? normalizeSeoFaqItems(faqItems) : undefined,
        featured: enabledFields.has('featured') ? featured : undefined,
        focusKeyword: enabledFields.has('focusKeyword') ? (focusKeyword.trim() || undefined) : undefined,
        htmlRender: hasHtmlRender ? (htmlRender.trim() || undefined) : undefined,
        markdownRender: hasMarkdownRender ? (markdownRender.trim() || undefined) : undefined,
        metaDescription: enabledFields.has('metaDescription') ? (metaDescription.trim() || resolvedMetaDescription || undefined) : undefined,
        metaTitle: enabledFields.has('metaTitle') ? (metaTitle.trim() || resolvedMetaTitle || undefined) : undefined,
        price: enabledFields.has('price') ? price : undefined,
        relatedQueries: enabledFields.has('relatedQueries') ? normalizeSeoStringList(relatedQueries) : undefined,
        renderType,
        slug: slug.trim() || generateSlugFromTitle(title),
        status,
        tags: enabledFields.has('tags') ? normalizeSeoStringList(tags) : undefined,
        thumbnail,
        thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
        title: title.trim(),
      });

      toast.success('Đã tạo dịch vụ thành công');
      router.push('/admin/services');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể tạo dịch vụ'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm dịch vụ mới"
      subtitle="Tạo gói dịch vụ, giá cả, thời lượng và thiết lập lịch hẹn trực tuyến."
      backHref="/admin/services"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Tạo dịch vụ"
          onCancel={() => router.push('/admin/services')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          aiImportNode={
            <AiEntityImportDialog
              kind="service"
              currentData={aiImportCurrentData}
              enabledFields={enabledFields}
              onApply={handleApplyAiService}
            />
          }
        />
      }
    >
      <QuickCreateServiceCategoryModal
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
                  label="Tên dịch vụ"
                  value={title}
                  onChange={handleTitleChange}
                  required
                  placeholder="Nhập tên dịch vụ..."
                  autoFocus
                  copyLabel="tên dịch vụ"
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
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExcerpt(e.target.value)}
                      placeholder="Tóm tắt ngắn gọn về dịch vụ..."
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

              {isBookingsModuleEnabled && (
                <AdminFormCard title="Cấu hình Đặt lịch (Bookings)">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="bookingEnabled"
                        checked={bookingEnabled}
                        onCheckedChange={(checked: boolean | 'indeterminate') => setBookingEnabled(Boolean(checked))}
                      />
                      <Label htmlFor="bookingEnabled" className="cursor-pointer font-medium">
                        Cho phép khách hàng đặt lịch dịch vụ này
                      </Label>
                    </div>

                    {bookingEnabled && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                        <div className="space-y-2">
                          <Label>Thời lượng buổi hẹn (phút)</Label>
                          <Input
                            type="number"
                            min={5}
                            step={5}
                            value={bookingDurationMin}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBookingDurationMin(Number(e.target.value || 60))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Khoảng cách khung giờ (phút)</Label>
                          <Input
                            type="number"
                            min={5}
                            step={5}
                            value={bookingSlotIntervalMin}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBookingSlotIntervalMin(Number(e.target.value || 30))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Sức chứa mỗi khung giờ</Label>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={bookingCapacityPerSlot}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBookingCapacityPerSlot(Number(e.target.value || 1))}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </AdminFormCard>
              )}

              {showAdvancedRenderCard && (
                <AdminFormCard title="Nội dung nâng cao">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Kiểu hiển thị nội dung</Label>
                      <AdminSelect
                        value={renderType}
                        onChange={(val) => setRenderType(val as 'content' | 'markdown' | 'html')}
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
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMarkdownRender(e.target.value)}
                          className="min-h-[140px] w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}

                    {renderType === 'html' && hasHtmlRender && (
                      <div className="space-y-2">
                        <Label>Mã nguồn HTML</Label>
                        <textarea
                          value={htmlRender}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setHtmlRender(e.target.value)}
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
                onStatusChange={(val) => setStatus(val as 'Draft' | 'Published')}
                categoryId={categoryId}
                onCategoryIdChange={setCategoryId}
                categories={categoriesData}
                multiCategoryEnabled={multiCategoryEnabled}
                additionalCategoryIds={additionalCategoryIds}
                onAdditionalCategoryIdsChange={setAdditionalCategoryIds}
                onOpenCategoryModal={() => setShowCategoryModal(true)}
                categoryLabel="Danh mục chính"
                categoryHint="Thẻ đầu tiên là danh mục chính/canonical."
                extraContent={
                  enabledFields.has('featured') ? (
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="featured"
                        checked={featured}
                        onCheckedChange={(checked: boolean | 'indeterminate') => setFeatured(Boolean(checked))}
                      />
                      <Label htmlFor="featured" className="cursor-pointer text-sm font-medium">
                        Dịch vụ nổi bật
                      </Label>
                    </div>
                  ) : undefined
                }
              />

              {(enabledFields.has('price') || enabledFields.has('duration')) && (
                <AdminFormCard title="Giá & Thời gian thực hiện">
                  <div className="space-y-4">
                    {enabledFields.has('price') && (
                      <div className="space-y-2">
                        <Label>Giá dịch vụ (VNĐ)</Label>
                        <Input
                          type="number"
                          value={price ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrice(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="0"
                        />
                      </div>
                    )}
                    {enabledFields.has('duration') && (
                      <div className="space-y-2">
                        <Label>Thời gian hoàn thành</Label>
                        <Input
                          value={duration}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDuration(e.target.value)}
                          placeholder="VD: 2-3 tuần"
                        />
                      </div>
                    )}
                  </div>
                </AdminFormCard>
              )}

              <AdminThumbnailSidebarCard
                thumbnail={thumbnail}
                thumbnailStorageId={thumbnailStorageId}
                onThumbnailChange={(url, storageId) => {
                  setThumbnail(url);
                  setThumbnailStorageId(storageId);
                }}
                folder="services"
                entitySlug={slug || 'service'}
                aspectRatio="video"
              />
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
              SEO nâng cao đang tắt trong cấu hình module Services.
            </div>
          </AdminFormCard>
        )}
      </form>
    </AdminFormPageWrapper>
  );
}
