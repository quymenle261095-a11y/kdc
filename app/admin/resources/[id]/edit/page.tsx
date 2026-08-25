'use client';

import React, { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { ExternalLink, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { LexicalEditor } from '@/app/admin/components/LexicalEditor';
import { MultiImageUploader, type ImageItem } from '@/app/admin/components/MultiImageUploader';
import { QuickCreateResourceCategoryModal } from '@/app/admin/components/QuickCreateResourceCategoryModal';
import { ResourceFilterTagsInput } from '@/app/admin/components/ResourceFilterTagsInput';
import { stripHtml, truncateText } from '@/lib/seo';
import { Badge, Button, Checkbox, Input, Label, cn, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/admin/components/ui';
import { AiEntityImportDialog, type AiEntityImportPayload } from '@/app/admin/components/AiEntityImportDialog';
import { AdvancedSeoFields, SeoFormTabs, normalizeSeoFaqItems, normalizeSeoStringList, type SeoFaqItem, type SeoFormTab } from '@/app/admin/components/AdvancedSeoFields';
import { useSetAdminBreadcrumb } from '@/app/admin/context/AdminBreadcrumbContext';
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

type ResourceStatus = 'Draft' | 'Published';
type PricingType = 'free' | 'paid' | 'contact';
type RenderType = 'content' | 'markdown' | 'html';

export default function ResourceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const resourceId = id as Id<'resources'>;

  const resourceData = useQuery(api.resources.getById, { id: resourceId });
  useSetAdminBreadcrumb(resourceData?.title);
  const additionalCategoryIdsData = useQuery(api.resources.getAdditionalCategoryIds, { id: resourceId });
  const categoriesData = useQuery(api.resourceCategories.listAll, {});
  const updateResource = useMutation(api.resources.update);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const resourceFiltersFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: MODULE_KEY, featureKey: 'enableResourceFilters' });
  const featuredFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: MODULE_KEY, featureKey: 'enableFeatured' });
  const activeFilters = useQuery(api.resourceFilters.listActive, {});
  const allFilterValues = useQuery(api.resourceFilters.listAllValues, {});
  const assignedFilters = useQuery(api.resourceFilters.listByResource, { resourceId });
  const resourceCustomers = useQuery(api.resources.listResourceCustomers, { resourceId, limit: 200 });
  const customersData = useQuery(api.customers.listAll, { limit: 100 });
  const grantAccess = useMutation(api.resources.grantAccess);
  const revokeAccess = useMutation(api.resources.revokeAccess);
  const removeAccess = useMutation(api.resources.removeAccess);
  const activateAccess = useMutation(api.resources.activateAccess);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [thumbnailStorageId, setThumbnailStorageId] = useState<Id<'_storage'> | undefined | null>();
  const [galleryItems, setGalleryItems] = useState<ImageItem[]>([]);
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
  const [initialized, setInitialized] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'general' | 'customers'>('general');
  const [selectedValueIds, setSelectedValueIds] = useState<Id<'resourceFilterValues'>[]>([]);
  const [revokingId, setRevokingId] = useState<Id<'resourceCustomers'> | null>(null);
  const [deletingAccessId, setDeletingAccessId] = useState<Id<'resourceCustomers'> | null>(null);
  const [activatingAccessId, setActivatingAccessId] = useState<Id<'resourceCustomers'> | null>(null);
  const [grantCustomerId, setGrantCustomerId] = useState('');
  const [isGrantingAccess, setIsGrantingAccess] = useState(false);
  const [seoTab, setSeoTab] = useState<SeoFormTab>('content');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [faqItems, setFaqItems] = useState<SeoFaqItem[]>([]);

  const initialSnapshotRef = useRef<{
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    categoryId: string;
    additionalCategoryIds: string[];
    thumbnail: string;
    thumbnailStorageId: Id<'_storage'> | null | undefined;
    galleryImages: string[];
    downloadUrl: string;
    status: ResourceStatus;
    pricingType: PricingType;
    priceAmount: number | undefined;
    comparePriceAmount: number | undefined;
    priceNote: string;
    isPriceVisible: boolean;
    featured: boolean;
    renderType: RenderType;
    markdownRender: string;
    htmlRender: string;
    metaTitle: string;
    metaDescription: string;
    selectedValueIds: Id<'resourceFilterValues'>[];
    focusKeyword: string;
    tags: string[];
    relatedQueries: string[];
    faqItems: SeoFaqItem[];
  } | null>(null);

  const enabledFields = useMemo(() => new Set(fieldsData?.map((field) => field.fieldKey) ?? []), [fieldsData]);
  const multiCategoryEnabled = Boolean(settingsData?.find((setting) => setting.settingKey === 'enableMultipleCategories')?.value);
  const selectedCategorySlug = categoriesData?.find((category) => category._id === categoryId)?.slug || 'resources';
  const hasMarkdownRender = enabledFields.has('markdownRender');
  const hasHtmlRender = enabledFields.has('htmlRender');
  const showAdvancedRender = hasMarkdownRender || hasHtmlRender;
  const showAdvancedSeoFields = enabledFields.has('focusKeyword')
    || enabledFields.has('tags')
    || enabledFields.has('relatedQueries')
    || enabledFields.has('faqItems');
  const showGallery = enabledFields.has('images');

  const activeAccessCustomerIds = useMemo(
    () => new Set(resourceCustomers?.filter((item) => item.status === 'active').map((item) => item.customerId) ?? []),
    [resourceCustomers]
  );
  const grantableCustomers = useMemo(
    () => customersData?.filter((customer) => !activeAccessCustomerIds.has(customer._id)) ?? [],
    [activeAccessCustomerIds, customersData]
  );

  const currentSnapshot = useMemo(() => ({
    title: title.trim(),
    slug: slug.trim(),
    content: content.trim(),
    excerpt: excerpt.trim(),
    categoryId,
    additionalCategoryIds: [...additionalCategoryIds].sort(),
    thumbnail: thumbnail ?? '',
    thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
    galleryImages: galleryItems.map((item) => item.url).filter(Boolean),
    downloadUrl: downloadUrl.trim(),
    status,
    pricingType,
    priceAmount,
    comparePriceAmount,
    priceNote: priceNote.trim(),
    isPriceVisible,
    featured,
    renderType,
    markdownRender: markdownRender.trim(),
    htmlRender: htmlRender.trim(),
    metaTitle: metaTitle.trim(),
    metaDescription: metaDescription.trim(),
    selectedValueIds: [...selectedValueIds].sort(),
    focusKeyword: focusKeyword.trim(),
    tags: [...tags].sort(),
    relatedQueries: [...relatedQueries].sort(),
    faqItems: normalizeSeoFaqItems(faqItems),
  }), [
    title, slug, content, excerpt, categoryId, additionalCategoryIds,
    thumbnail, thumbnailStorageId, galleryItems, downloadUrl, status,
    pricingType, priceAmount, comparePriceAmount, priceNote, isPriceVisible,
    featured, renderType, markdownRender, htmlRender, metaTitle, metaDescription,
    selectedValueIds, focusKeyword, tags, relatedQueries, faqItems
  ]);

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

  const hasChanges = useMemo(() => {
    if (!initialized || !initialSnapshotRef.current) return false;
    return JSON.stringify(initialSnapshotRef.current) !== JSON.stringify(currentSnapshot);
  }, [currentSnapshot, initialized]);

  useEffect(() => {
    if (!resourceData || additionalCategoryIdsData === undefined || assignedFilters === undefined || initialized) return;
    const initialAdditionalCategoryIds = [...additionalCategoryIdsData];
    const initialTags = normalizeSeoStringList(resourceData.tags ?? []);
    const initialQueries = normalizeSeoStringList(resourceData.relatedQueries ?? []);
    const initialFaqs = normalizeSeoFaqItems(resourceData.faqItems ?? []);
    const initialFilterValues = (assignedFilters ?? []).map((f) => f._id as Id<'resourceFilterValues'>);
    const initialPricingType: PricingType = resourceData.pricingType === 'paid' || resourceData.pricingType === 'contact' ? resourceData.pricingType : 'free';
    const initialStatus: ResourceStatus = resourceData.status === 'Published' ? 'Published' : 'Draft';
    const initialRenderType: RenderType = resourceData.renderType === 'html' || resourceData.renderType === 'markdown' ? resourceData.renderType : 'content';

    setTitle(resourceData.title);
    setSlug(resourceData.slug);
    setContent(resourceData.content ?? '');
    setExcerpt(resourceData.excerpt ?? '');
    setCategoryId(resourceData.categoryId);
    setAdditionalCategoryIds(initialAdditionalCategoryIds);
    setThumbnail(resourceData.thumbnail);
    setThumbnailStorageId(resourceData.thumbnailStorageId ?? undefined);
    setDownloadUrl(resourceData.downloadUrl ?? '');
    setStatus(initialStatus);
    setPricingType(initialPricingType);
    setPriceAmount(resourceData.priceAmount);
    setComparePriceAmount(resourceData.comparePriceAmount);
    setPriceNote(resourceData.priceNote ?? '');
    setIsPriceVisible(resourceData.isPriceVisible !== false);
    setFeatured(Boolean(resourceData.featured));
    setRenderType(initialRenderType);
    setMarkdownRender(resourceData.markdownRender ?? '');
    setHtmlRender(resourceData.htmlRender ?? '');
    setMetaTitle(resourceData.metaTitle ?? '');
    setMetaDescription(resourceData.metaDescription ?? '');
    setSelectedValueIds(initialFilterValues);
    setFocusKeyword(resourceData.focusKeyword ?? '');
    setTags(initialTags);
    setRelatedQueries(initialQueries);
    setFaqItems(initialFaqs);

    const initialGalleryItems: ImageItem[] = (resourceData.images ?? []).map((url, index) => ({
      id: `${index}-${url}`,
      storageId: resourceData.imageStorageIds?.[index] ?? undefined,
      url,
    }));
    setGalleryItems(initialGalleryItems);

    initialSnapshotRef.current = {
      title: resourceData.title.trim(),
      slug: resourceData.slug.trim(),
      content: (resourceData.content ?? '').trim(),
      excerpt: (resourceData.excerpt ?? '').trim(),
      categoryId: resourceData.categoryId,
      additionalCategoryIds: [...initialAdditionalCategoryIds].sort(),
      thumbnail: resourceData.thumbnail ?? '',
      thumbnailStorageId: resourceData.thumbnailStorageId ?? null,
      galleryImages: initialGalleryItems.map((item) => item.url).filter(Boolean),
      downloadUrl: (resourceData.downloadUrl ?? '').trim(),
      status: initialStatus,
      pricingType: initialPricingType,
      priceAmount: resourceData.priceAmount,
      comparePriceAmount: resourceData.comparePriceAmount,
      priceNote: (resourceData.priceNote ?? '').trim(),
      isPriceVisible: resourceData.isPriceVisible !== false,
      featured: Boolean(resourceData.featured),
      renderType: initialRenderType,
      markdownRender: (resourceData.markdownRender ?? '').trim(),
      htmlRender: (resourceData.htmlRender ?? '').trim(),
      metaTitle: (resourceData.metaTitle ?? '').trim(),
      metaDescription: (resourceData.metaDescription ?? '').trim(),
      selectedValueIds: [...initialFilterValues].sort(),
      focusKeyword: (resourceData.focusKeyword ?? '').trim(),
      tags: [...initialTags].sort(),
      relatedQueries: [...initialQueries].sort(),
      faqItems: initialFaqs,
    };

    setInitialized(true);
  }, [resourceData, additionalCategoryIdsData, assignedFilters, initialized]);

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
      const normalizedImages = galleryItems.filter((item) => Boolean(item.url));

      await updateResource({
        additionalCategoryIds: multiCategoryEnabled
          ? (additionalCategoryIds.filter((id) => id !== categoryId) as Id<'resourceCategories'>[])
          : undefined,
        categoryId: categoryId as Id<'resourceCategories'>,
        comparePriceAmount: pricingType === 'paid' ? comparePriceAmount : undefined,
        content,
        downloadUrl: downloadUrl.trim(),
        excerpt: enabledFields.has('excerpt') ? (excerpt.trim() || undefined) : undefined,
        faqItems: enabledFields.has('faqItems') ? normalizeSeoFaqItems(faqItems) : undefined,
        featured: featuredFeature?.enabled ? featured : false,
        filterValueIds: resourceFiltersFeature?.enabled ? selectedValueIds : undefined,
        focusKeyword: enabledFields.has('focusKeyword') ? (focusKeyword.trim() || undefined) : undefined,
        htmlRender: hasHtmlRender ? (htmlRender.trim() || undefined) : undefined,
        id: resourceId,
        images: showGallery ? normalizedImages.map((item) => item.url) : undefined,
        imageStorageIds: showGallery ? normalizedImages.map((item) => item.storageId ?? null) : undefined,
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

      initialSnapshotRef.current = currentSnapshot;
      toast.success('Đã lưu thay đổi tài nguyên thành công');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật tài nguyên'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGrantAccess = async () => {
    if (!grantCustomerId) return;
    setIsGrantingAccess(true);
    try {
      await grantAccess({
        customerId: grantCustomerId as Id<'customers'>,
        resourceId,
      });
      toast.success('Đã cấp quyền tải tài nguyên');
      setGrantCustomerId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cấp quyền tải');
    } finally {
      setIsGrantingAccess(false);
    }
  };

  const handleRevokeAccess = async (accessId: Id<'resourceCustomers'>) => {
    setRevokingId(accessId);
    try {
      await revokeAccess({ accessId });
      toast.success('Đã thu hồi quyền tải');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể thu hồi quyền tải');
    } finally {
      setRevokingId(null);
    }
  };

  const handleActivateAccess = async (accessId: Id<'resourceCustomers'>) => {
    setActivatingAccessId(accessId);
    try {
      await activateAccess({ accessId });
      toast.success('Đã cấp lại quyền tải');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cấp lại quyền tải');
    } finally {
      setActivatingAccessId(null);
    }
  };

  const handleRemoveAccess = async (accessId: Id<'resourceCustomers'>) => {
    if (!confirm('Xác nhận xóa quyền truy cập của khách hàng này?')) return;
    setDeletingAccessId(accessId);
    try {
      await removeAccess({ accessId });
      toast.success('Đã xóa quyền truy cập');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa quyền truy cập');
    } finally {
      setDeletingAccessId(null);
    }
  };

  const frontendHref = selectedCategorySlug ? `/${selectedCategorySlug}/${slug}` : `/resources/${slug}`;

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa tài nguyên"
      subtitle="Cập nhật nội dung, link tải, giá bán và danh sách khách hàng đã có quyền."
      backHref="/admin/resources"
      isLoading={resourceData === undefined}
      notFound={resourceData === null}
      notFoundMessage="Không tìm thấy tài nguyên yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          onCancel={() => router.push('/admin/resources')}
          submitLabel="Lưu thay đổi"
          onViewWeb={slug ? () => window.open(frontendHref, '_blank') : undefined}
          disableViewWeb={!slug.trim()}
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
      extraHeaderAction={
        slug ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => window.open(frontendHref, '_blank')}
          >
            <ExternalLink size={13} /> Xem trên web
          </Button>
        ) : null
      }
    >
      <QuickCreateResourceCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCreated={(newCategoryId) => setCategoryId(newCategoryId)}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          {[
            { key: 'general', label: 'Thông tin tài nguyên' },
            { key: 'customers', label: `Khách đã mua / tải (${resourceCustomers?.length ?? 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'general' && (
          <>
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
                      categorySlug={selectedCategorySlug}
                    />

                    {enabledFields.has('excerpt') && (
                      <div className="space-y-2">
                        <Label>Mô tả ngắn</Label>
                        <Input
                          value={excerpt}
                          onChange={(event) => setExcerpt(event.target.value)}
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
                              onChange={(event) => setMarkdownRender(event.target.value)}
                              className="min-h-[140px] w-full rounded-md border border-slate-200 bg-white p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        )}

                        {renderType === 'html' && hasHtmlRender && (
                          <div className="space-y-2">
                            <Label>Mã nguồn HTML</Label>
                            <textarea
                              value={htmlRender}
                              onChange={(event) => setHtmlRender(event.target.value)}
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
                        onChange={(event) => setDownloadUrl(event.target.value)}
                        required
                        placeholder="https://drive.google.com/..."
                      />
                      <p className="text-xs text-slate-500">Link chỉ trả về an toàn qua mutation sau khi kiểm tra quyền tải.</p>
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
                              onChange={(e) => setPriceAmount(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Giá gốc so sánh (VNĐ)</Label>
                            <Input
                              type="number"
                              min={0}
                              value={comparePriceAmount ?? ''}
                              onChange={(e) => setComparePriceAmount(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label>Ghi chú giá</Label>
                        <Input
                          value={priceNote}
                          onChange={(e) => setPriceNote(e.target.value)}
                          placeholder="VD: Bản quyền vĩnh viễn"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Checkbox
                          id="isPriceVisible"
                          checked={isPriceVisible}
                          onCheckedChange={(checked) => setIsPriceVisible(Boolean(checked))}
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
                          onCheckedChange={(checked) => setFeatured(Boolean(checked))}
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
          </>
        )}

        {activeTab === 'customers' && (
          <AdminFormCard title={`Khách đã mua / tải (${resourceCustomers?.length ?? 0})`}>
            <div className="space-y-4">
              <div className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center">
                <div className="flex-1">
                  <AdminSelect
                    value={grantCustomerId}
                    onChange={setGrantCustomerId}
                    disabled={customersData === undefined || grantableCustomers.length === 0}
                    options={[
                      {
                        value: '',
                        label: customersData === undefined
                          ? 'Đang tải khách hàng...'
                          : grantableCustomers.length === 0
                          ? 'Không còn khách để cấp quyền'
                          : 'Chọn khách hàng để cấp quyền...',
                      },
                      ...grantableCustomers.map((c) => ({
                        value: c._id,
                        label: `${c.name} — ${c.email || c.phone || 'Chưa có liên hệ'}`,
                      })),
                    ]}
                  />
                </div>
                <Button
                  type="button"
                  className="gap-2"
                  disabled={!grantCustomerId || isGrantingAccess}
                  onClick={() => { void handleGrantAccess(); }}
                >
                  {isGrantingAccess ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Cấp quyền
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Khách hàng</TableHead>
                    <TableHead>Nguồn</TableHead>
                    <TableHead>Lượt tải</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resourceCustomers === undefined ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-500">Đang tải...</TableCell></TableRow>
                  ) : resourceCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-slate-500">Chưa có khách hàng nào.</TableCell></TableRow>
                  ) : resourceCustomers.map((item) => (
                    <TableRow key={item.accessId}>
                      <TableCell>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.customerName}</div>
                        <div className="text-xs text-slate-500">{item.customerEmail || item.customerPhone || 'Chưa có thông tin liên hệ'}</div>
                      </TableCell>
                      <TableCell>
                        {item.sourceType === 'order' ? 'Đơn hàng' : item.sourceType === 'free' ? 'Tải miễn phí' : 'Thủ công'}
                      </TableCell>
                      <TableCell>{item.downloadCount}</TableCell>
                      <TableCell>
                        <Badge variant={item.status === 'active' ? 'success' : 'secondary'}>
                          {item.status === 'active' ? 'Đang có quyền' : 'Đã thu hồi'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {item.status === 'active' ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={revokingId === item.accessId}
                              onClick={() => { void handleRevokeAccess(item.accessId); }}
                            >
                              {revokingId === item.accessId ? 'Đang thu hồi...' : 'Thu hồi'}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={activatingAccessId === item.accessId}
                              onClick={() => { void handleActivateAccess(item.accessId); }}
                              className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/30 dark:hover:bg-emerald-900/20"
                            >
                              {activatingAccessId === item.accessId ? 'Đang cấp lại...' : 'Cấp lại'}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={deletingAccessId === item.accessId}
                            onClick={() => { void handleRemoveAccess(item.accessId); }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          >
                            {deletingAccessId === item.accessId ? 'Đang xóa...' : 'Xóa'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </AdminFormCard>
        )}
      </form>
    </AdminFormPageWrapper>
  );
}
