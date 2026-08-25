'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Button, Input, Label } from '../../components/ui';
import { LexicalEditor } from '../../components/LexicalEditor';
import { stripHtml, truncateText } from '@/lib/seo';
import { getMacroTemplate, getTemplateFieldSpec, type GeneratorFieldKey } from '@/lib/posts/generator/macro-templates';
import type { GeneratorRequest, GeneratedArticlePayload } from '@/lib/posts/generator/types';
import { AdminStickyFooter } from '@/app/admin/components/AdminStickyFooter';
import { AiEntityImportDialog, type AiEntityImportPayload } from '@/app/admin/components/AiEntityImportDialog';
import { HeadlineGeneratorWidget } from '@/app/admin/components/HeadlineGeneratorWidget';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormPageWrapper,
  AdminFormSidebar,
  AdminPublishSidebarCard,
  AdminSeoMetaCard,
  AdminSlugInput,
  AdminThumbnailSidebarCard,
  AdminTitleInput,
  QuickCreateCategoryModal,
} from '@/app/admin/components/FormUtilities';
import {
  PostAdvancedSeoFields,
  PostFormTabs,
  type PostFaqItem,
  type PostFormTab,
  normalizePostFaqItems,
  normalizePostStringList,
} from '../components/PostAdvancedSeoFields';

const MODULE_KEY = 'posts';
const COC_TARGET_OPTIONS: Array<{ key: GeneratorRequest['templateKey']; label: string; description: string }> = [
  { key: 'top_use_case', label: 'Theo nhu cầu', description: 'Gợi ý top sản phẩm theo mục tiêu sử dụng.' },
  { key: 'compare_two', label: 'So sánh 2 sản phẩm', description: 'So sánh A/B để ra quyết định nhanh.' },
  { key: 'top_under_budget', label: 'Theo ngân sách', description: 'Top sản phẩm trong một mức ngân sách.' },
  { key: 'top_between_budget', label: 'Theo khoảng giá', description: 'Top sản phẩm trong khoảng ngân sách.' },
  { key: 'top_best_sellers', label: 'Top bán chạy', description: 'Danh sách sản phẩm bán chạy, dễ chọn.' },
];

const toTimestamp = (value: string) => {
  if (!value) {return undefined;}
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function PostCreatePage() {
  const router = useRouter();
  const categoriesData = useQuery(api.postCategories.listAll, {});
  const productCategoriesData = useQuery(api.productCategories.listActive);
  const productsData = useQuery(api.products.listAll, { limit: 100 });
  const createPost = useMutation(api.posts.create);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });

  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const schedulingFeature = useQuery(api.admin.modules.getModuleFeature, { featureKey: 'enableScheduling', moduleKey: MODULE_KEY });

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [renderType, setRenderType] = useState<'content' | 'markdown' | 'html'>('content');
  const [markdownRender, setMarkdownRender] = useState('');
  const [htmlRender, setHtmlRender] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [postTags, setPostTags] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [faqItems, setFaqItems] = useState<PostFaqItem[]>([]);
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [thumbnailStorageId, setThumbnailStorageId] = useState<Id<'_storage'> | undefined>();
  const [categoryId, setCategoryId] = useState('');
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Published'>('Draft');
  const [publishAtLocal, setPublishAtLocal] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [activeTab, setActiveTab] = useState<PostFormTab>('content');

  const [generatorTemplateKey, setGeneratorTemplateKey] = useState(COC_TARGET_OPTIONS[0].key);
  const generatorProductLimit = 6;
  const [generatorBudgetMin, setGeneratorBudgetMin] = useState('');
  const [generatorBudgetMax, setGeneratorBudgetMax] = useState('');
  const [generatorKeyword, setGeneratorKeyword] = useState('');
  const [generatorSecondaryKeyword, setGeneratorSecondaryKeyword] = useState('');
  const [generatorCompareProductAId, setGeneratorCompareProductAId] = useState<Id<'products'> | ''>('');
  const [generatorCompareProductBId, setGeneratorCompareProductBId] = useState<Id<'products'> | ''>('');
  const [generatorSelectedProductIds, setGeneratorSelectedProductIds] = useState<Array<Id<'products'> | ''>>([]);
  const [generatorProductCategoryId, setGeneratorProductCategoryId] = useState<Id<'productCategories'> | ''>('');
  const [generatorRequest, setGeneratorRequest] = useState<GeneratorRequest | null>(null);
  const [galleryModal, setGalleryModal] = useState<{ images: string[]; index: number } | null>(null);

  // Sync default status from settings
  useEffect(() => {
    if (settingsData) {
      const defaultStatus = settingsData.find(s => s.settingKey === 'defaultStatus')?.value as string;
      if (defaultStatus === 'published') {
        setStatus('Published');
      }
    }
  }, [settingsData]);

  useEffect(() => {
    if (status !== 'Published') {
      setPublishImmediately(true);
      setPublishAtLocal('');
    }
  }, [status]);

  // Check which fields are enabled
  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const categoryData = categoriesData?.find((c) => c._id === categoryId);
  const categorySlugPreview = categoryData?.slug || 'chua-phan-loai';


  const hasMarkdownRender = enabledFields.has('markdownRender');
  const hasHtmlRender = enabledFields.has('htmlRender');
  const showAdvancedRenderCard = hasMarkdownRender || hasHtmlRender;
  const showAdvancedSeoFields = enabledFields.has('focusKeyword')
    || enabledFields.has('tags')
    || enabledFields.has('relatedQueries')
    || enabledFields.has('faqItems');
  const aiImportCurrentData = useMemo<AiEntityImportPayload>(() => ({
    authorName: authorName.trim(),
    content: content.trim(),
    excerpt: excerpt.trim(),
    faqItems: normalizePostFaqItems(faqItems),
    focusKeyword: focusKeyword.trim(),
    htmlRender: htmlRender.trim(),
    markdownRender: markdownRender.trim(),
    metaDescription: metaDescription.trim(),
    metaTitle: metaTitle.trim(),
    relatedQueries: normalizePostStringList(relatedQueries),
    slug: slug.trim(),
    tags: normalizePostStringList(postTags),
    thumbnail: thumbnail ?? '',
    title: title.trim(),
  }), [authorName, content, excerpt, faqItems, focusKeyword, htmlRender, markdownRender, metaDescription, metaTitle, relatedQueries, slug, postTags, thumbnail, title]);
  const schedulingEnabled = enabledFields.has('publish_date') && (schedulingFeature?.enabled ?? false);

  const generatorEnabled = Boolean(settingsData?.find(s => s.settingKey === 'enableAutoPostGenerator')?.value);
  const multiCategoryEnabled = Boolean(settingsData?.find(s => s.settingKey === 'enableMultipleCategories')?.value);
  const cocTarget = useMemo(
    () => COC_TARGET_OPTIONS.find((option) => option.key === generatorTemplateKey),
    [generatorTemplateKey],
  );
  const generatorTemplate = useMemo(() => getMacroTemplate(generatorTemplateKey), [generatorTemplateKey]);
  const templateFieldSpec = useMemo(() => getTemplateFieldSpec(generatorTemplateKey), [generatorTemplateKey]);
  const requiredFieldSet = useMemo(() => new Set<GeneratorFieldKey>(templateFieldSpec.required), [templateFieldSpec]);
  const isFieldActive = (fieldKey: GeneratorFieldKey) => requiredFieldSet.has(fieldKey);
  const requiresSelectedProducts = requiredFieldSet.has('selectedProducts');

  const activeProducts = useMemo(
    () => (productsData ?? []).filter((product) => product.status === 'Active'),
    [productsData],
  );
  const selectedProductIdSet = useMemo(
    () => new Set(generatorSelectedProductIds.filter(Boolean)),
    [generatorSelectedProductIds],
  );
  const productSlugMap = useMemo(() => {
    const map = new Map<string, string>();
    activeProducts.forEach((product) => map.set(product._id, product.slug));
    return map;
  }, [activeProducts]);

  useEffect(() => {
    const activeFields = new Set<GeneratorFieldKey>(templateFieldSpec.required);
    if (!activeFields.has('keyword')) {
      setGeneratorKeyword('');
      setGeneratorSecondaryKeyword('');
    }
    if (!activeFields.has('budgetMin')) {
      setGeneratorBudgetMin('');
    }
    if (!activeFields.has('budgetMax')) {
      setGeneratorBudgetMax('');
    }
    if (!activeFields.has('categoryId')) {
      setGeneratorProductCategoryId('');
    }
    if (!activeFields.has('compareProducts')) {
      setGeneratorCompareProductAId('');
      setGeneratorCompareProductBId('');
    }
    if (!activeFields.has('selectedProducts')) {
      setGeneratorSelectedProductIds([]);
    }
  }, [templateFieldSpec]);

  useEffect(() => {
    if (!generatorCompareProductAId || !generatorCompareProductBId) {return;}
    if (generatorCompareProductAId === generatorCompareProductBId) {
      setGeneratorCompareProductBId('');
      toast.error('Hai sản phẩm so sánh không được trùng nhau');
    }
  }, [generatorCompareProductAId, generatorCompareProductBId]);

  useEffect(() => {
    if (!requiresSelectedProducts) {return;}
    setGeneratorSelectedProductIds((prev) => {
      const next = [...prev];
      if (next.length > generatorProductLimit) {
        return next.slice(0, generatorProductLimit);
      }
      if (next.length < generatorProductLimit) {
        return [...next, ...Array(generatorProductLimit - next.length).fill('')];
      }
      return next;
    });
  }, [generatorProductLimit, requiresSelectedProducts]);

  const generatorPreview = useQuery(
    api.posts.generateFromProductsPreview,
    generatorRequest ? { request: generatorRequest } : 'skip'
  ) as GeneratedArticlePayload | undefined;

  const isPreviewLoading = generatorRequest !== null && generatorPreview === undefined;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSlug(generateSlugFromTitle(val));
  };

  const generateSlugFromTitle = (value: string) => {
    return value.toLowerCase()
      .normalize("NFD").replaceAll(/[\u0300-\u036F]/g, "")
      .replaceAll(/[đĐ]/g, "d")
      .replaceAll(/[^a-z0-9\s]/g, '')
      .replaceAll(/\s+/g, '-');
  };

  const handleApplyHeadline = (nextTitle: string) => {
    setTitle(nextTitle);
    setSlug(generateSlugFromTitle(nextTitle));
  };

  const handleGeneratePreview = () => {
    const generatorKeywords = [generatorKeyword, generatorSecondaryKeyword]
      .map((keyword) => keyword.trim().replaceAll(/\s+/g, ' '))
      .filter(Boolean)
      .slice(0, 2);
    if (isFieldActive('keyword') && !generatorKeyword.trim()) {
      toast.error('Vui lòng nhập nhu cầu/keyword');
      return;
    }
    if (isFieldActive('budgetMin') && !generatorBudgetMin) {
      toast.error('Vui lòng nhập ngân sách tối thiểu');
      return;
    }
    if (isFieldActive('budgetMax') && !generatorBudgetMax) {
      toast.error('Vui lòng nhập ngân sách tối đa');
      return;
    }
    if (isFieldActive('categoryId') && !generatorProductCategoryId) {
      toast.error('Vui lòng chọn danh mục sản phẩm');
      return;
    }
    if (isFieldActive('compareProducts')) {
      if (!generatorCompareProductAId || !generatorCompareProductBId) {
        toast.error('Vui lòng chọn đủ 2 sản phẩm để so sánh');
        return;
      }
      if (generatorCompareProductAId === generatorCompareProductBId) {
        toast.error('Hai sản phẩm so sánh không được trùng nhau');
        return;
      }
    }
    if (isFieldActive('selectedProducts')) {
      const selectedIds = generatorSelectedProductIds.filter(Boolean) as Id<'products'>[];
      if (selectedIds.length !== generatorProductLimit) {
        toast.error('Vui lòng chọn đủ số lượng sản phẩm');
        return;
      }
      if (new Set(selectedIds).size !== selectedIds.length) {
        toast.error('Danh sách sản phẩm không được trùng nhau');
        return;
      }
    }
    const budgetMin = generatorBudgetMin ? Number(generatorBudgetMin) : undefined;
    const budgetMax = generatorBudgetMax ? Number(generatorBudgetMax) : undefined;
    if (Number.isFinite(budgetMin) && Number.isFinite(budgetMax) && (budgetMin as number) >= (budgetMax as number)) {
      toast.error('Ngân sách tối thiểu phải nhỏ hơn ngân sách tối đa');
      return;
    }
    const compareSlugs = isFieldActive('compareProducts')
      ? [generatorCompareProductAId, generatorCompareProductBId]
        .map((id) => (id ? productSlugMap.get(id) : undefined))
        .filter((slug): slug is string => Boolean(slug))
      : undefined;
    const selectedProductSlugs = isFieldActive('selectedProducts')
      ? generatorSelectedProductIds
        .map((id) => (id ? productSlugMap.get(id) : undefined))
        .filter((slug): slug is string => Boolean(slug))
      : undefined;
    if (isFieldActive('compareProducts') && (!compareSlugs || compareSlugs.length < 2)) {
      toast.error('Không tìm thấy slug sản phẩm để so sánh');
      return;
    }
    if (isFieldActive('selectedProducts') && (!selectedProductSlugs || selectedProductSlugs.length !== generatorProductLimit)) {
      toast.error('Không tìm thấy đủ sản phẩm đã chọn');
      return;
    }
    const nextRequest: GeneratorRequest = {
      templateKey: generatorTemplateKey,
      seed: `${Date.now()}`,
    };
    if (isFieldActive('productLimit')) {
      nextRequest.productLimit = generatorProductLimit;
    }
    if (isFieldActive('budgetMin')) {
      nextRequest.budgetMin = Number.isFinite(budgetMin) ? budgetMin : undefined;
    }
    if (isFieldActive('budgetMax')) {
      nextRequest.budgetMax = Number.isFinite(budgetMax) ? budgetMax : undefined;
    }
    if (isFieldActive('keyword')) {
      const [primaryKeyword, secondaryKeyword] = generatorKeywords;
      nextRequest.keyword = primaryKeyword;
      nextRequest.secondaryKeyword = secondaryKeyword;
      nextRequest.keywords = generatorKeywords.length > 0 ? generatorKeywords : undefined;
      nextRequest.useCase = generatorKeywords.join(' và ') || undefined;
    }
    if (isFieldActive('categoryId')) {
      nextRequest.categoryId = generatorProductCategoryId || undefined;
    }
    if (isFieldActive('compareProducts')) {
      nextRequest.compareSlugs = compareSlugs;
    }
    if (isFieldActive('selectedProducts')) {
      nextRequest.selectedProductSlugs = selectedProductSlugs;
    }
    nextRequest.tone = 'helpful';
    setGeneratorRequest(nextRequest);
  };

  const handleRegenerate = () => {
    if (!generatorRequest) {return;}
    setGeneratorRequest({
      ...generatorRequest,
      seed: `${Date.now()}-${Math.round(Math.random() * 1000)}`,
    });
  };

  const handlePreviewClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) {return;}
    const trigger = target.closest<HTMLElement>('[data-gallery-open]');
    if (!trigger) {return;}
    const container = trigger.closest<HTMLElement>('[data-gallery]');
    const payload = container?.getAttribute('data-gallery');
    if (!payload) {return;}
    try {
      const images = JSON.parse(payload) as string[];
      if (!Array.isArray(images) || images.length === 0) {return;}
      const rawIndex = Number(trigger.getAttribute('data-gallery-open') ?? 0);
      const index = Number.isFinite(rawIndex) ? Math.max(0, Math.min(images.length - 1, rawIndex)) : 0;
      setGalleryModal({ images, index });
    } catch {
      return;
    }
  };

  const handleCloseGallery = () => {
    setGalleryModal(null);
  };

  const handlePrevGallery = () => {
    setGalleryModal((prev) => {
      if (!prev || prev.images.length === 0) {return prev;}
      const nextIndex = (prev.index - 1 + prev.images.length) % prev.images.length;
      return { ...prev, index: nextIndex };
    });
  };

  const handleNextGallery = () => {
    setGalleryModal((prev) => {
      if (!prev || prev.images.length === 0) {return prev;}
      const nextIndex = (prev.index + 1) % prev.images.length;
      return { ...prev, index: nextIndex };
    });
  };

  useEffect(() => {
    if (!galleryModal) {return;}
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCloseGallery();
      }
      if (event.key === 'ArrowLeft') {
        handlePrevGallery();
      }
      if (event.key === 'ArrowRight') {
        handleNextGallery();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [galleryModal]);

  const handleApplyGenerated = () => {
    if (!generatorPreview) {return;}
    setTitle(generatorPreview.title);
    setSlug(generateSlugFromTitle(generatorPreview.title));
    setExcerpt(generatorPreview.excerpt);
    setContent('');
    setRenderType('html');
    setMarkdownRender('');
    setHtmlRender(generatorPreview.contentHtml);
    setMetaTitle(generatorPreview.metaTitle);
    setMetaDescription(generatorPreview.metaDescription);
    setThumbnail(generatorPreview.thumbnail);
    setThumbnailStorageId(undefined);
    setEditorResetKey((prev) => prev + 1);
  };

  const handleApplyAiPost = (item: AiEntityImportPayload) => {
    const nextTitle = item.title?.trim() || item.name?.trim() || '';
    if (!nextTitle) {return;}

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
      setMarkdownRender('');
    } else if (item.markdownRender) {
      setRenderType('markdown');
      setMarkdownRender(item.markdownRender);
      setHtmlRender('');
    }
    setExcerpt(item.excerpt || item.description || truncateText(stripHtml(nextContent), 180));
    setMetaTitle(item.metaTitle || truncateText(nextTitle, 60));
    setMetaDescription(item.metaDescription || truncateText(stripHtml(item.excerpt || nextContent), 160));
    if (item.focusKeyword) {setFocusKeyword(item.focusKeyword);}
    if (item.tags?.length) {setPostTags(normalizePostStringList(item.tags));}
    if (item.relatedQueries?.length) {setRelatedQueries(normalizePostStringList(item.relatedQueries));}
    if (item.faqItems?.length) {setFaqItems(normalizePostFaqItems(item.faqItems));}
    if (item.thumbnail) {
      setThumbnail(item.thumbnail);
      setThumbnailStorageId(undefined);
    }
    if (item.authorName) {setAuthorName(item.authorName);}
    setEditorResetKey((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !categoryId) {return;}
    if (status === 'Published' && schedulingEnabled && !publishImmediately && !publishAtLocal) {
      toast.error('Vui lòng chọn thời gian xuất bản.');
      return;
    }

    setIsSubmitting(true);
    try {
      const resolvedMetaTitle = truncateText(title.trim(), 60);
      const resolvedMetaDescription = truncateText(stripHtml(excerpt || content || ''), 160);
      const resolvedPublishedAt = status === 'Published' && !publishImmediately
        ? toTimestamp(publishAtLocal)
        : undefined;
      const normalizedPostTags = enabledFields.has('tags') ? normalizePostStringList(postTags) : [];
      const normalizedRelatedQueries = enabledFields.has('relatedQueries') ? normalizePostStringList(relatedQueries) : [];
      const normalizedFaqItems = enabledFields.has('faqItems') ? normalizePostFaqItems(faqItems) : [];
      await createPost({
        authorName: enabledFields.has('author_name') ? authorName.trim() || undefined : undefined,
        categoryId: categoryId as Id<"postCategories">,
        additionalCategoryIds: multiCategoryEnabled
          ? additionalCategoryIds.filter((id) => id !== categoryId) as Id<"postCategories">[]
          : undefined,
        content,
        renderType,
        markdownRender: markdownRender.trim() || undefined,
        htmlRender: htmlRender.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        ...(enabledFields.has('faqItems') ? { faqItems: normalizedFaqItems.length > 0 ? normalizedFaqItems : undefined } : {}),
        ...(enabledFields.has('focusKeyword') ? { focusKeyword: focusKeyword.trim() || undefined } : {}),
        metaDescription: enabledFields.has('metaDescription')
          ? (metaDescription.trim() || resolvedMetaDescription || undefined)
          : undefined,
        metaTitle: enabledFields.has('metaTitle')
          ? (metaTitle.trim() || resolvedMetaTitle || undefined)
          : undefined,
        ...(enabledFields.has('relatedQueries') ? { relatedQueries: normalizedRelatedQueries.length > 0 ? normalizedRelatedQueries : undefined } : {}),
        slug: slug.trim() || title.toLowerCase().replaceAll(/\s+/g, '-'),
        publishImmediately: status === 'Published' ? publishImmediately : undefined,
        publishedAt: status === 'Published' ? resolvedPublishedAt : undefined,
        status,
        ...(enabledFields.has('tags') ? { tags: normalizedPostTags.length > 0 ? normalizedPostTags : undefined } : {}),
        thumbnail,
        thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
        title: title.trim(),
      });
      toast.success("Tạo bài viết mới thành công");
      router.push('/admin/posts');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, "Không thể tạo bài viết"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm bài viết mới"
      subtitle="Tạo nội dung mới cho website"
      backHref="/admin/posts"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Đăng bài"
          disableSave={isSubmitting || !title.trim() || !categoryId}
          onCancel={() => router.push('/admin/posts')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          aiImportNode={
            <AiEntityImportDialog kind="post" currentData={aiImportCurrentData} enabledFields={enabledFields} onApply={handleApplyAiPost} />
          }
        />
      }
    >
      <QuickCreateCategoryModal 
        isOpen={showCategoryModal} 
        onClose={() => setShowCategoryModal(false)} 
        onCreated={(id) => setCategoryId(id)}
      />

      <form onSubmit={handleSubmit} className="space-y-4">
        <PostFormTabs activeTab={activeTab} onChange={setActiveTab} />

        <AdminFormGrid>
          <AdminFormMain>
            {activeTab === 'content' ? (
              <>
                <AdminFormCard>
                  <AdminTitleInput
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="Nhập tiêu đề bài viết..."
                    copyLabel="tiêu đề bài viết"
                    extraAction={
                      <HeadlineGeneratorWidget
                        currentTitle={title}
                        onSelect={handleApplyHeadline}
                      />
                    }
                  />
                  <AdminSlugInput
                    slug={slug}
                    onChange={setSlug}
                    categorySlug={categorySlugPreview}
                  />
                  {enabledFields.has('excerpt') && (
                    <div className="space-y-2">
                      <Label>Mô tả ngắn</Label>
                      <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Nhập mô tả ngắn..." />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Nội dung <span className="text-red-500">*</span></Label>
                    <LexicalEditor onChange={setContent} initialContent={content} resetKey={editorResetKey} />
                  </div>
                </AdminFormCard>
          {generatorEnabled && (
            <AdminFormCard title="Sinh tự động">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Mục tiêu bài</Label>
                    <select
                      value={generatorTemplateKey}
                      onChange={(e) =>{  setGeneratorTemplateKey(e.target.value as GeneratorRequest['templateKey']); }}
                      className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    >
                      {COC_TARGET_OPTIONS.map((template) => (
                        <option key={template.key} value={template.key}>{template.label}</option>
                      ))}
                    </select>
                    <div className="text-xs text-slate-500">{cocTarget?.description ?? generatorTemplate.description}</div>
                  </div>
                  {requiredFieldSet.has('selectedProducts') && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Chọn {generatorProductLimit} sản phẩm</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {generatorSelectedProductIds.map((selectedId, index) => (
                          <div key={`selected-product-${index}`} className="space-y-2">
                            <Label className="text-xs text-slate-500">Sản phẩm {index + 1}</Label>
                            <select
                              value={selectedId}
                              onChange={(e) => {
                                const nextId = e.target.value as Id<'products'> | '';
                                setGeneratorSelectedProductIds((prev) => {
                                  const next = [...prev];
                                  next[index] = nextId;
                                  return next;
                                });
                              }}
                              className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                            >
                              <option value="">-- Chọn sản phẩm --</option>
                              {activeProducts
                                .filter((product) => product._id === selectedId || !selectedProductIdSet.has(product._id))
                                .map((product) => (
                                  <option key={product._id} value={product._id}>{product.name}</option>
                                ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {requiredFieldSet.has('keyword') && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>Nhu cầu / Keywords</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-500">Từ khóa chính</Label>
                          <Input
                            value={generatorKeyword}
                            onChange={(e) =>{  setGeneratorKeyword(e.target.value); }}
                            placeholder="VD: chăm sóc tóc, gaming"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-500">Từ khóa phụ</Label>
                          <Input
                            value={generatorSecondaryKeyword}
                            onChange={(e) =>{  setGeneratorSecondaryKeyword(e.target.value); }}
                            placeholder="VD: tiết kiệm, cho người mới"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">Có thể nhập 1 hoặc 2 từ khóa. Khi nhập 2 từ khóa, bài viết sẽ dùng cả hai làm nhu cầu chính.</p>
                    </div>
                  )}
                  {requiredFieldSet.has('categoryId') && (
                    <div className="space-y-2">
                      <Label>Danh mục sản phẩm</Label>
                      <select
                        value={generatorProductCategoryId}
                        onChange={(e) =>{  setGeneratorProductCategoryId(e.target.value as Id<'productCategories'>); }}
                        className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      >
                        <option value="">-- Chọn danh mục --</option>
                        {productCategoriesData?.map((category) => (
                          <option key={category._id} value={category._id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {requiredFieldSet.has('compareProducts') && (
                    <div className="space-y-2 md:col-span-2">
                      <Label>So sánh 2 sản phẩm</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-500">Sản phẩm A</Label>
                          <select
                            value={generatorCompareProductAId}
                            onChange={(e) =>{  setGeneratorCompareProductAId(e.target.value as Id<'products'>); }}
                            className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {activeProducts.map((product) => (
                              <option key={product._id} value={product._id}>{product.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-slate-500">Sản phẩm B</Label>
                          <select
                            value={generatorCompareProductBId}
                            onChange={(e) =>{  setGeneratorCompareProductBId(e.target.value as Id<'products'>); }}
                            className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                          >
                            <option value="">-- Chọn sản phẩm --</option>
                            {activeProducts
                              .filter((product) => product._id !== generatorCompareProductAId)
                              .map((product) => (
                                <option key={product._id} value={product._id}>{product.name}</option>
                              ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                  {requiredFieldSet.has('budgetMin') && (
                    <div className="space-y-2">
                      <Label>Ngân sách từ</Label>
                      <Input
                        type="number"
                        value={generatorBudgetMin}
                        onChange={(e) =>{  setGeneratorBudgetMin(e.target.value); }}
                        placeholder="VD: 1000000"
                      />
                    </div>
                  )}
                  {requiredFieldSet.has('budgetMax') && (
                    <div className="space-y-2">
                      <Label>Ngân sách đến</Label>
                      <Input
                        type="number"
                        value={generatorBudgetMax}
                        onChange={(e) =>{  setGeneratorBudgetMax(e.target.value); }}
                        placeholder="VD: 3000000"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={handleGeneratePreview}>
                    {isPreviewLoading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                    Preview
                  </Button>
                  <Button type="button" variant="outline" onClick={handleRegenerate} disabled={!generatorPreview}>
                    Sinh lại mạnh
                  </Button>
                  <Button type="button" variant="accent" onClick={handleApplyGenerated} disabled={!generatorPreview}>
                    Áp dụng vào form
                  </Button>
                </div>

                {generatorPreview && (
                  <div className="space-y-3 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
                    <div className="text-sm text-slate-500">Preview</div>
                    {generatorPreview.qualityWarnings && generatorPreview.qualityWarnings.length > 0 && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        <div className="font-medium mb-1">Lưu ý chất lượng dữ liệu</div>
                        <ul className="list-disc pl-4 space-y-1">
                          {generatorPreview.qualityWarnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{generatorPreview.title}</div>
                    {generatorPreview.thumbnail && (
                      <img src={generatorPreview.thumbnail} alt={generatorPreview.title} className="w-full max-h-64 object-cover rounded-md" />
                    )}
                    <div className="text-sm text-slate-600 dark:text-slate-400">{generatorPreview.excerpt}</div>
                    <div className="border-t border-slate-200 pt-3">
                      <div className="text-sm font-medium mb-2">Nội dung</div>
                      <div
                        className="generated-article-preview text-sm text-slate-700"
                        onClick={handlePreviewClick}
                        dangerouslySetInnerHTML={{ __html: generatorPreview.contentHtml }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </AdminFormCard>
          )}

          {showAdvancedRenderCard && (
            <AdminFormCard title="Render nâng cao">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Kiểu render</Label>
                  <select
                    value={renderType}
                    onChange={(e) =>{  setRenderType(e.target.value as 'content' | 'markdown' | 'html'); }}
                    className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="content">Content (mặc định)</option>
                    {hasMarkdownRender && <option value="markdown">Markdown</option>}
                    {hasHtmlRender && <option value="html">HTML</option>}
                  </select>
                </div>
                {hasMarkdownRender && (
                  <div className="space-y-2">
                    <Label>Markdown render</Label>
                    <textarea
                      value={markdownRender}
                      onChange={(e) =>{  setMarkdownRender(e.target.value); }}
                      className="w-full min-h-[120px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                      placeholder="Dán markdown để render..."
                    />
                  </div>
                )}
                {hasHtmlRender && (
                  <div className="space-y-2">
                    <Label>HTML render</Label>
                    <textarea
                      value={htmlRender}
                      onChange={(e) =>{  setHtmlRender(e.target.value); }}
                      className="w-full min-h-[120px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                      placeholder="Dán HTML inline để render..."
                    />
                  </div>
                )}
              </div>
            </AdminFormCard>
          )}

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
              </>
            ) : showAdvancedSeoFields ? (
              <PostAdvancedSeoFields
                faqItems={faqItems}
                focusKeyword={focusKeyword}
                onFaqItemsChange={setFaqItems}
                onFocusKeywordChange={setFocusKeyword}
                onRelatedQueriesChange={setRelatedQueries}
                onTagsChange={setPostTags}
                relatedQueries={relatedQueries}
                showFaqItems={enabledFields.has('faqItems')}
                showFocusKeyword={enabledFields.has('focusKeyword')}
                showRelatedQueries={enabledFields.has('relatedQueries')}
                showTags={enabledFields.has('tags')}
                tags={postTags}
              />
            ) : (
              <AdminFormCard>
                <div className="py-8 text-center text-sm text-slate-500">
                  SEO nâng cao đang tắt trong cấu hình module Posts.
                </div>
              </AdminFormCard>
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
              schedulingEnabled={schedulingEnabled}
              publishImmediately={publishImmediately}
              onPublishImmediatelyChange={setPublishImmediately}
              publishAtLocal={publishAtLocal}
              onPublishAtLocalChange={setPublishAtLocal}
              showAuthor={enabledFields.has('author_name')}
              authorName={authorName}
              onAuthorNameChange={setAuthorName}
            />

            <AdminThumbnailSidebarCard
              thumbnail={thumbnail}
              thumbnailStorageId={thumbnailStorageId}
              onThumbnailChange={(url, storageId) => {
                setThumbnail(url);
                setThumbnailStorageId(storageId);
              }}
              folder="posts"
              entitySlug={slug}
              aspectRatio="video"
            />
          </AdminFormSidebar>
        </AdminFormGrid>
      </form>
    </AdminFormPageWrapper>
  );
}
