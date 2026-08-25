'use client';

import React, { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Button, Checkbox, Input, Label } from '../../../components/ui';
import { LexicalEditor } from '../../../components/LexicalEditor';
import { QuickCreateServiceCategoryModal } from '../../../components/QuickCreateServiceCategoryModal';
import { stripHtml, truncateText } from '@/lib/seo';
import {
  buildAutoSlotsFromWindow,
  normalizeSlotTemplate,
  normalizeSlotTemplateByWeekday,
  type BookingSlotTemplateByWeekday,
} from '@/lib/bookings/slotTemplate';
import { AiEntityImportDialog, type AiEntityImportPayload } from '@/app/admin/components/AiEntityImportDialog';
import { useSetAdminBreadcrumb } from '@/app/admin/context/AdminBreadcrumbContext';
import { AdvancedSeoFields, SeoFormTabs, normalizeSeoFaqItems, normalizeSeoStringList, type SeoFaqItem, type SeoFormTab } from '@/app/admin/components/AdvancedSeoFields';
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

type ServiceSlotTemplateScope = 'default' | '0' | '1' | '2' | '3' | '4' | '5' | '6';

const SERVICE_SLOT_SCOPE_OPTIONS: Array<{ value: ServiceSlotTemplateScope; label: string }> = [
  { value: 'default', label: 'Mặc định (mọi ngày)' },
  { value: '1', label: 'Thứ 2' },
  { value: '2', label: 'Thứ 3' },
  { value: '3', label: 'Thứ 4' },
  { value: '4', label: 'Thứ 5' },
  { value: '5', label: 'Thứ 6' },
  { value: '6', label: 'Thứ 7' },
  { value: '0', label: 'Chủ nhật' },
];

const resolveServiceTemplateByScope = (params: {
  scope: ServiceSlotTemplateScope;
  defaultSlots: string[];
  byWeekday: BookingSlotTemplateByWeekday;
}) => {
  if (params.scope === 'default') {
    return normalizeSlotTemplate(params.defaultSlots);
  }
  return normalizeSlotTemplate(params.byWeekday[Number(params.scope)] ?? []);
};

const setServiceTemplateByScope = (params: {
  scope: ServiceSlotTemplateScope;
  nextSlots: string[];
  defaultSlots: string[];
  byWeekday: BookingSlotTemplateByWeekday;
}) => {
  if (params.scope === 'default') {
    return {
      defaultSlots: normalizeSlotTemplate(params.nextSlots),
      byWeekday: params.byWeekday,
    };
  }

  const day = Number(params.scope);
  return {
    defaultSlots: params.defaultSlots,
    byWeekday: {
      ...params.byWeekday,
      [day]: normalizeSlotTemplate(params.nextSlots),
    },
  };
};

export default function ServiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const serviceId = id as Id<'services'>;

  const serviceData = useQuery(api.services.getById, { id: serviceId });
  useSetAdminBreadcrumb(serviceData?.title);
  const additionalCategoryIdsData = useQuery(api.services.getAdditionalCategoryIds, { id: serviceId });
  const categoriesData = useQuery(api.serviceCategories.listAll, {});
  const updateService = useMutation(api.services.update);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const bookingsModule = useQuery(api.admin.modules.getModuleByKey, { key: 'bookings' });
  const isBookingsModuleEnabled = bookingsModule?.enabled ?? false;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [renderType, setRenderType] = useState<'content' | 'markdown' | 'html'>('content');
  const [markdownRender, setMarkdownRender] = useState('');
  const [htmlRender, setHtmlRender] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [thumbnailStorageId, setThumbnailStorageId] = useState<Id<'_storage'> | undefined | null>();
  const [categoryId, setCategoryId] = useState('');
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [price, setPrice] = useState<number | undefined>();
  const [duration, setDuration] = useState('');
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [bookingDurationMin, setBookingDurationMin] = useState<number>(60);
  const [bookingSlotIntervalMin, setBookingSlotIntervalMin] = useState<number>(30);
  const [bookingCapacityPerSlot, setBookingCapacityPerSlot] = useState<number>(1);
  const [bookingSlotTemplateDefault, setBookingSlotTemplateDefault] = useState<string[]>([]);
  const [bookingSlotTemplateByWeekday, setBookingSlotTemplateByWeekday] = useState<BookingSlotTemplateByWeekday>({});
  const [activeSlotScope, setActiveSlotScope] = useState<ServiceSlotTemplateScope>('default');
  const [showAdvancedBooking, setShowAdvancedBooking] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<'Draft' | 'Published'>('Draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [seoTab, setSeoTab] = useState<SeoFormTab>('content');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [faqItems, setFaqItems] = useState<SeoFaqItem[]>([]);

  const selectedCategorySlug = useMemo(
    () => categoriesData?.find((category) => category._id === categoryId)?.slug || 'chua-phan-loai',
    [categoriesData, categoryId]
  );
  const multiCategoryEnabled = Boolean(settingsData?.find((s) => s.settingKey === 'enableMultipleCategories')?.value);

  const initialSnapshotRef = useRef<{
    categoryId: string;
    additionalCategoryIds: string[];
    content: string;
    renderType: 'content' | 'markdown' | 'html';
    markdownRender: string;
    htmlRender: string;
    duration: string;
    bookingEnabled: boolean;
    bookingDurationMin: number;
    bookingSlotIntervalMin: number;
    bookingCapacityPerSlot: number;
    bookingSlotTemplateDefault: string[];
    bookingSlotTemplateByWeekday: BookingSlotTemplateByWeekday;
    excerpt: string;
    featured: boolean;
    metaDescription: string;
    metaTitle: string;
    price: number | undefined;
    slug: string;
    status: 'Draft' | 'Published';
    thumbnail: string;
    thumbnailStorageId: Id<'_storage'> | null | undefined;
    title: string;
    focusKeyword: string;
    tags: string[];
    relatedQueries: string[];
    faqItems: SeoFaqItem[];
  } | null>(null);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach((f) => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const hasMarkdownRender = enabledFields.has('markdownRender');
  const hasHtmlRender = enabledFields.has('htmlRender');
  const showAdvancedRenderCard = hasMarkdownRender || hasHtmlRender;
  const showAdvancedSeoFields = enabledFields.has('focusKeyword')
    || enabledFields.has('tags')
    || enabledFields.has('relatedQueries')
    || enabledFields.has('faqItems');

  const currentSnapshot = useMemo(() => ({
    categoryId,
    additionalCategoryIds: [...additionalCategoryIds].sort(),
    content: content.trim(),
    renderType,
    markdownRender: markdownRender.trim(),
    htmlRender: htmlRender.trim(),
    duration: duration.trim(),
    bookingEnabled,
    bookingDurationMin,
    bookingSlotIntervalMin,
    bookingCapacityPerSlot,
    bookingSlotTemplateDefault: normalizeSlotTemplate(bookingSlotTemplateDefault),
    bookingSlotTemplateByWeekday: normalizeSlotTemplateByWeekday(bookingSlotTemplateByWeekday),
    excerpt: excerpt.trim(),
    featured,
    metaDescription: metaDescription.trim(),
    metaTitle: metaTitle.trim(),
    price,
    slug: slug.trim(),
    status,
    thumbnail: thumbnail ?? '',
    thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
    title: title.trim(),
    focusKeyword: focusKeyword.trim(),
    tags: [...tags].sort(),
    relatedQueries: [...relatedQueries].sort(),
    faqItems: normalizeSeoFaqItems(faqItems),
  }), [
    categoryId, additionalCategoryIds, content, renderType, markdownRender, htmlRender,
    duration, bookingEnabled, bookingDurationMin, bookingSlotIntervalMin, bookingCapacityPerSlot,
    bookingSlotTemplateDefault, bookingSlotTemplateByWeekday, excerpt, featured, metaDescription,
    metaTitle, price, slug, status, thumbnail, thumbnailStorageId, title, focusKeyword, tags,
    relatedQueries, faqItems
  ]);

  const hasChanges = useMemo(() => {
    if (!isDataLoaded || !initialSnapshotRef.current) return false;
    return JSON.stringify(initialSnapshotRef.current) !== JSON.stringify(currentSnapshot);
  }, [currentSnapshot, isDataLoaded]);

  const aiImportCurrentData = useMemo<AiEntityImportPayload>(() => ({
    content: content.trim(),
    duration: duration.trim(),
    excerpt: excerpt.trim(),
    featured,
    htmlRender: htmlRender.trim(),
    markdownRender: markdownRender.trim(),
    metaDescription: metaDescription.trim(),
    metaTitle: metaTitle.trim(),
    price,
    slug: slug.trim(),
    thumbnail: thumbnail ?? '',
    title: title.trim(),
    focusKeyword: focusKeyword.trim(),
    tags: normalizeSeoStringList(tags),
    relatedQueries: normalizeSeoStringList(relatedQueries),
    faqItems: normalizeSeoFaqItems(faqItems),
  }), [content, duration, excerpt, faqItems, featured, focusKeyword, htmlRender, markdownRender, metaDescription, metaTitle, price, relatedQueries, slug, tags, thumbnail, title]);

  useEffect(() => {
    if (!serviceData || additionalCategoryIdsData === undefined || isDataLoaded) return;
    const initialAdditionalCategoryIds = [...additionalCategoryIdsData];
    const initialStatus = serviceData.status === 'Published' ? 'Published' : 'Draft';
    const initialRenderType = serviceData.renderType === 'html' || serviceData.renderType === 'markdown' ? serviceData.renderType : 'content';
    const initialTags = normalizeSeoStringList(serviceData.tags ?? []);
    const initialQueries = normalizeSeoStringList(serviceData.relatedQueries ?? []);
    const initialFaqs = normalizeSeoFaqItems(serviceData.faqItems ?? []);

    setTitle(serviceData.title);
    setSlug(serviceData.slug);
    setContent(serviceData.content ?? '');
    setRenderType(initialRenderType);
    setMarkdownRender(serviceData.markdownRender ?? '');
    setHtmlRender(serviceData.htmlRender ?? '');
    setExcerpt(serviceData.excerpt ?? '');
    setMetaTitle(serviceData.metaTitle ?? '');
    setMetaDescription(serviceData.metaDescription ?? '');
    setThumbnail(serviceData.thumbnail);
    setThumbnailStorageId(serviceData.thumbnailStorageId);
    setCategoryId(serviceData.categoryId);
    setAdditionalCategoryIds(initialAdditionalCategoryIds);
    setPrice(serviceData.price);
    setDuration(serviceData.duration ?? '');
    setBookingEnabled(serviceData.bookingEnabled ?? true);
    setBookingDurationMin(serviceData.bookingDurationMin ?? 60);
    setBookingSlotIntervalMin(serviceData.bookingSlotIntervalMin ?? 30);
    setBookingCapacityPerSlot(serviceData.bookingCapacityPerSlot ?? 1);
    setBookingSlotTemplateDefault(normalizeSlotTemplate(serviceData.bookingSlotTemplateDefault ?? []));
    setBookingSlotTemplateByWeekday(normalizeSlotTemplateByWeekday(serviceData.bookingSlotTemplateByWeekday ?? {}));
    setFeatured(Boolean(serviceData.featured));
    setStatus(initialStatus);
    setFocusKeyword(serviceData.focusKeyword ?? '');
    setTags(initialTags);
    setRelatedQueries(initialQueries);
    setFaqItems(initialFaqs);

    initialSnapshotRef.current = {
      categoryId: serviceData.categoryId,
      additionalCategoryIds: [...initialAdditionalCategoryIds].sort(),
      content: (serviceData.content ?? '').trim(),
      renderType: initialRenderType,
      markdownRender: (serviceData.markdownRender ?? '').trim(),
      htmlRender: (serviceData.htmlRender ?? '').trim(),
      duration: (serviceData.duration ?? '').trim(),
      bookingEnabled: serviceData.bookingEnabled ?? true,
      bookingDurationMin: serviceData.bookingDurationMin ?? 60,
      bookingSlotIntervalMin: serviceData.bookingSlotIntervalMin ?? 30,
      bookingCapacityPerSlot: serviceData.bookingCapacityPerSlot ?? 1,
      bookingSlotTemplateDefault: normalizeSlotTemplate(serviceData.bookingSlotTemplateDefault ?? []),
      bookingSlotTemplateByWeekday: normalizeSlotTemplateByWeekday(serviceData.bookingSlotTemplateByWeekday ?? {}),
      excerpt: (serviceData.excerpt ?? '').trim(),
      featured: Boolean(serviceData.featured),
      metaDescription: (serviceData.metaDescription ?? '').trim(),
      metaTitle: (serviceData.metaTitle ?? '').trim(),
      price: serviceData.price,
      slug: serviceData.slug.trim(),
      status: initialStatus,
      thumbnail: serviceData.thumbnail ?? '',
      thumbnailStorageId: serviceData.thumbnailStorageId ?? null,
      title: serviceData.title.trim(),
      focusKeyword: (serviceData.focusKeyword ?? '').trim(),
      tags: [...initialTags].sort(),
      relatedQueries: [...initialQueries].sort(),
      faqItems: initialFaqs,
    };

    setIsDataLoaded(true);
  }, [serviceData, additionalCategoryIdsData, isDataLoaded]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleApplyAiService = (item: AiEntityImportPayload) => {
    const nextTitle = item.title?.trim() || item.name?.trim() || '';
    if (!nextTitle) return;

    setTitle(nextTitle);
    setSlug(item.slug?.trim() || generateSlugFromTitle(nextTitle));
    const nextContent = item.content || item.description || item.htmlRender || item.markdownRender || '';
    setContent(nextContent);
    if (item.content) {
      setRenderType('content');
      setHtmlRender(item.htmlRender || '');
      setMarkdownRender(item.markdownRender || '');
    } else if (item.htmlRender) {
      setRenderType('html');
      setHtmlRender(item.htmlRender);
      setMarkdownRender(item.markdownRender || '');
    } else if (item.markdownRender) {
      setRenderType('markdown');
      setMarkdownRender(item.markdownRender);
      setHtmlRender('');
    }
    setExcerpt(item.excerpt || item.description || truncateText(stripHtml(nextContent), 180));
    setMetaTitle(item.metaTitle || truncateText(nextTitle, 60));
    setMetaDescription(item.metaDescription || truncateText(stripHtml(item.excerpt || nextContent), 160));
    if (item.thumbnail) {
      setThumbnail(item.thumbnail);
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

      await updateService({
        additionalCategoryIds: multiCategoryEnabled
          ? (additionalCategoryIds.filter((item) => item !== categoryId) as Id<'serviceCategories'>[])
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
        id: serviceId,
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

      initialSnapshotRef.current = currentSnapshot;
      toast.success('Đã lưu thay đổi dịch vụ thành công');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật dịch vụ'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeScopeSlots = useMemo(
    () => resolveServiceTemplateByScope({
      scope: activeSlotScope,
      defaultSlots: bookingSlotTemplateDefault,
      byWeekday: bookingSlotTemplateByWeekday,
    }),
    [activeSlotScope, bookingSlotTemplateByWeekday, bookingSlotTemplateDefault]
  );
  const activeScopeSet = useMemo(() => new Set(activeScopeSlots), [activeScopeSlots]);
  const suggestedSlots = useMemo(
    () => buildAutoSlotsFromWindow({
      startHour: 8,
      endHour: 17,
      durationMin: bookingDurationMin || 60,
      slotIntervalMin: bookingSlotIntervalMin || 30,
    }),
    [bookingDurationMin, bookingSlotIntervalMin]
  );

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa dịch vụ"
      subtitle="Cập nhật gói dịch vụ, giá bán, thời lượng và cấu hình lịch hẹn."
      backHref="/admin/services"
      isLoading={serviceData === undefined}
      notFound={serviceData === null}
      notFoundMessage="Không tìm thấy dịch vụ yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/services')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          onViewWeb={slug ? () => window.open(`/${selectedCategorySlug}/${slug}`, '_blank') : undefined}
          disableViewWeb={!slug.trim()}
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
      extraHeaderAction={
        slug ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => window.open(`/${selectedCategorySlug}/${slug}`, '_blank')}
          >
            <ExternalLink size={13} /> Xem trên web
          </Button>
        ) : null
      }
    >
      <QuickCreateServiceCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCreated={(id) => setCategoryId(id)}
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
                  categorySlug={selectedCategorySlug}
                />

                {enabledFields.has('excerpt') && (
                  <div className="space-y-2">
                    <Label>Mô tả ngắn</Label>
                    <Input
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
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
                        onCheckedChange={(checked) => setBookingEnabled(Boolean(checked))}
                      />
                      <Label htmlFor="bookingEnabled" className="cursor-pointer font-medium">
                        Cho phép khách hàng đặt lịch dịch vụ này
                      </Label>
                    </div>

                    {bookingEnabled && (
                      <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label>Thời lượng buổi hẹn (phút)</Label>
                            <Input
                              type="number"
                              min={5}
                              step={5}
                              value={bookingDurationMin}
                              onChange={(e) => setBookingDurationMin(Number(e.target.value || 60))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Khoảng cách khung giờ (phút)</Label>
                            <Input
                              type="number"
                              min={5}
                              step={5}
                              value={bookingSlotIntervalMin}
                              onChange={(e) => setBookingSlotIntervalMin(Number(e.target.value || 30))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sức chứa mỗi khung giờ</Label>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={bookingCapacityPerSlot}
                              onChange={(e) => setBookingCapacityPerSlot(Number(e.target.value || 1))}
                            />
                          </div>
                        </div>

                        <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4">
                          <button
                            type="button"
                            onClick={() => setShowAdvancedBooking((prev) => !prev)}
                            className="w-full text-left text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {showAdvancedBooking ? '▲ Thu gọn cấu hình khung giờ chi tiết' : '▼ Cài đặt nâng cao: cấu hình khung giờ theo từng ngày'}
                          </button>

                          {showAdvancedBooking && (
                            <div className="space-y-4 mt-4">
                              <div className="space-y-2">
                                <Label>Áp dụng cho</Label>
                                <AdminSelect
                                  value={activeSlotScope}
                                  onChange={(val) => setActiveSlotScope(val as ServiceSlotTemplateScope)}
                                  options={SERVICE_SLOT_SCOPE_OPTIONS}
                                />
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const next = setServiceTemplateByScope({
                                      scope: activeSlotScope,
                                      nextSlots: suggestedSlots,
                                      defaultSlots: bookingSlotTemplateDefault,
                                      byWeekday: bookingSlotTemplateByWeekday,
                                    });
                                    setBookingSlotTemplateDefault(next.defaultSlots);
                                    setBookingSlotTemplateByWeekday(next.byWeekday);
                                  }}
                                >
                                  Chọn tất cả gợi ý
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    const next = setServiceTemplateByScope({
                                      scope: activeSlotScope,
                                      nextSlots: [],
                                      defaultSlots: bookingSlotTemplateDefault,
                                      byWeekday: bookingSlotTemplateByWeekday,
                                    });
                                    setBookingSlotTemplateDefault(next.defaultSlots);
                                    setBookingSlotTemplateByWeekday(next.byWeekday);
                                  }}
                                >
                                  Bỏ chọn tất cả
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
                                {suggestedSlots.map((slot) => (
                                  <label
                                    key={slot}
                                    className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                                  >
                                    <Checkbox
                                      checked={activeScopeSet.has(slot)}
                                      onCheckedChange={(checked) => {
                                        const nextSet = new Set(activeScopeSlots);
                                        if (checked) {
                                          nextSet.add(slot);
                                        } else {
                                          nextSet.delete(slot);
                                        }
                                        const next = setServiceTemplateByScope({
                                          scope: activeSlotScope,
                                          nextSlots: Array.from(nextSet),
                                          defaultSlots: bookingSlotTemplateDefault,
                                          byWeekday: bookingSlotTemplateByWeekday,
                                        });
                                        setBookingSlotTemplateDefault(next.defaultSlots);
                                        setBookingSlotTemplateByWeekday(next.byWeekday);
                                      }}
                                    />
                                    <span className="text-sm font-medium">{slot}</span>
                                  </label>
                                ))}
                              </div>

                              <p className="text-xs text-slate-500">Đã chọn {activeScopeSlots.length} khung giờ.</p>
                            </div>
                          )}
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
                          onChange={(e) => setMarkdownRender(e.target.value)}
                          className="min-h-[140px] w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    )}

                    {renderType === 'html' && hasHtmlRender && (
                      <div className="space-y-2">
                        <Label>Mã nguồn HTML</Label>
                        <textarea
                          value={htmlRender}
                          onChange={(e) => setHtmlRender(e.target.value)}
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
                  categorySlug={selectedCategorySlug}
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
                        onCheckedChange={(checked) => setFeatured(Boolean(checked))}
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
                          onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="0"
                        />
                      </div>
                    )}
                    {enabledFields.has('duration') && (
                      <div className="space-y-2">
                        <Label>Thời gian hoàn thành</Label>
                        <Input
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
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
