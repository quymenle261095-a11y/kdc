'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Input, Label } from '../../../components/ui';
import { LexicalEditor } from '../../../components/LexicalEditor';
import { stripHtml, truncateText } from '@/lib/seo';
import { normalizeRichText } from '@/app/admin/lib/normalize-rich-text';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormPageWrapper,
  AdminFormSidebar,
  AdminPublishSidebarCard,
  AdminSeoMetaCard,
  AdminSlugInput,
  AdminStickyFooter,
  AdminThumbnailSidebarCard,
  AdminTitleInput,
  generateSlugFromTitle,
  useAdminForm,
  QuickCreateCategoryModal,
} from '@/app/admin/components/FormUtilities';
import { AiEntityImportDialog, type AiEntityImportPayload } from '@/app/admin/components/AiEntityImportDialog';
import { HeadlineGeneratorWidget } from '@/app/admin/components/HeadlineGeneratorWidget';
import {
  PostAdvancedSeoFields,
  PostFormTabs,
  type PostFaqItem,
  type PostFormTab,
  normalizePostFaqItems,
  normalizePostStringList,
} from '../../components/PostAdvancedSeoFields';

import { useSetAdminBreadcrumb } from '@/app/admin/context/AdminBreadcrumbContext';

const MODULE_KEY = 'posts';

const toLocalDatetimeInput = (timestamp?: number) => {
  if (!timestamp) {return '';}
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const toTimestamp = (value: string) => {
  if (!value) {return undefined;}
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function PostEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const SCHEDULE_SKEW_MS = 30_000;

  const postData = useQuery(api.posts.getById, { id: id as Id<"posts"> });
  useSetAdminBreadcrumb(postData?.title);
  const additionalCategoryIdsData = useQuery(api.posts.getAdditionalCategoryIds, { id: id as Id<"posts"> });
  const categoriesData = useQuery(api.postCategories.listAll, {});
  const updatePost = useMutation(api.posts.update);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });

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

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<{
    authorName: string;
    categoryId: string;
    additionalCategoryIds: string[];
    content: string;
    renderType: 'content' | 'markdown' | 'html';
    markdownRender: string;
    htmlRender: string;
    excerpt: string;
    faqItems: PostFaqItem[];
    focusKeyword: string;
    metaDescription: string;
    metaTitle: string;
    relatedQueries: string[];
    slug: string;
    status: 'Draft' | 'Published' | 'Archived';
    tags: string[];
    publishedAt?: number;
    thumbnail: string;
    title: string;
    thumbnailStorageId: Id<'_storage'> | null;
  } | null>(null);

  const selectedCategorySlug = useMemo(
    () => categoriesData?.find((category) => category._id === categoryId)?.slug,
    [categoriesData, categoryId]
  );

  // Check which fields are enabled
  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const hasMarkdownRender = enabledFields.has('markdownRender');
  const hasHtmlRender = enabledFields.has('htmlRender');
  const showAdvancedRenderCard = hasMarkdownRender || hasHtmlRender;
  const showAdvancedSeoFields = enabledFields.has('focusKeyword')
    || enabledFields.has('tags')
    || enabledFields.has('relatedQueries')
    || enabledFields.has('faqItems');
  const schedulingFeature = useQuery(api.admin.modules.getModuleFeature, { featureKey: 'enableScheduling', moduleKey: MODULE_KEY });
  const schedulingEnabled = enabledFields.has('publish_date') && (schedulingFeature?.enabled ?? false);
  const multiCategoryEnabled = Boolean(settingsData?.find(s => s.settingKey === 'enableMultipleCategories')?.value);

  const normalizedContent = useMemo(() => normalizeRichText(content), [content]);
  const resolvedPublishedAt = useMemo(
    () => (status === 'Published' && !publishImmediately ? toTimestamp(publishAtLocal) : undefined),
    [publishAtLocal, publishImmediately, status],
  );

  const currentSnapshot = useMemo(() => ({
    authorName: authorName.trim(),
    categoryId,
    additionalCategoryIds: [...additionalCategoryIds].sort(),
    content: normalizedContent,
    renderType,
    markdownRender: markdownRender.trim(),
    htmlRender: htmlRender.trim(),
    excerpt: excerpt.trim(),
    faqItems: normalizePostFaqItems(faqItems),
    focusKeyword: focusKeyword.trim(),
    metaDescription: metaDescription.trim(),
    metaTitle: metaTitle.trim(),
    relatedQueries: normalizePostStringList(relatedQueries),
    slug: slug.trim(),
    status,
    tags: normalizePostStringList(postTags),
    publishedAt: resolvedPublishedAt,
    thumbnail: thumbnail ?? '',
    title: title.trim(),
    thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
  }), [authorName, categoryId, additionalCategoryIds, normalizedContent, renderType, markdownRender, htmlRender, excerpt, faqItems, focusKeyword, metaDescription, metaTitle, relatedQueries, slug, status, postTags, resolvedPublishedAt, thumbnail, title, thumbnailStorageId]);

  const aiImportCurrentData = useMemo<AiEntityImportPayload>(() => ({
    authorName: authorName.trim(),
    content: normalizedContent,
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
  }), [authorName, normalizedContent, excerpt, faqItems, focusKeyword, htmlRender, markdownRender, metaDescription, metaTitle, relatedQueries, slug, postTags, thumbnail, title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleApplyHeadline = (nextTitle: string) => {
    setTitle(nextTitle);
    setSlug(generateSlugFromTitle(nextTitle));
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

  useEffect(() => {
    if (postData && additionalCategoryIdsData !== undefined && !isDataLoaded) {
      setTitle(postData.title);
      setSlug(postData.slug);
      setContent(postData.content);
      const nextRenderType = postData.renderType ?? 'content';
      const allowedRenderTypes = new Set<'content' | 'markdown' | 'html'>(['content']);
      if (hasMarkdownRender) {allowedRenderTypes.add('markdown');}
      if (hasHtmlRender) {allowedRenderTypes.add('html');}
      const normalizedRenderType = allowedRenderTypes.has(nextRenderType) ? nextRenderType : 'content';
      setRenderType(normalizedRenderType);
      setMarkdownRender(postData.markdownRender ?? '');
      setHtmlRender(postData.htmlRender ?? '');
      setExcerpt(postData.excerpt ?? '');
      setMetaTitle(postData.metaTitle ?? '');
      setMetaDescription(postData.metaDescription ?? '');
      setFocusKeyword(postData.focusKeyword ?? '');
      setPostTags(normalizePostStringList(postData.tags ?? []));
      setRelatedQueries(normalizePostStringList(postData.relatedQueries ?? []));
      setFaqItems(normalizePostFaqItems(postData.faqItems ?? []));
      setThumbnail(postData.thumbnail);
      setThumbnailStorageId((postData as { thumbnailStorageId?: Id<'_storage'> }).thumbnailStorageId);
      setCategoryId(postData.categoryId);
      setAdditionalCategoryIds(additionalCategoryIdsData ?? []);
      setAuthorName(postData.authorName ?? '');
      setStatus(postData.status);
      const now = Date.now();
      const isScheduled = Boolean(postData.publishedAt && postData.publishedAt > now + SCHEDULE_SKEW_MS);
      setPublishImmediately(!isScheduled);
      setPublishAtLocal(isScheduled && postData.publishedAt ? toLocalDatetimeInput(postData.publishedAt) : '');
      setIsDataLoaded(true);
    }
  }, [postData, additionalCategoryIdsData, hasMarkdownRender, hasHtmlRender, isDataLoaded]);

  useEffect(() => {
    if (isDataLoaded && !initialSnapshot) {
      setInitialSnapshot(currentSnapshot);
    }
  }, [isDataLoaded, initialSnapshot, currentSnapshot]);

  useEffect(() => {
    if (status !== 'Published') {
      setPublishImmediately(true);
      setPublishAtLocal('');
    }
  }, [status]);

  const executeSave = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề bài viết.');
      return;
    }
    if (status === 'Published' && schedulingEnabled && !publishImmediately && !publishAtLocal) {
      toast.error('Vui lòng chọn thời gian xuất bản.');
      return;
    }

    setIsSubmitting(true);
    setSaveStatus('saving');
    try {
      const resolvedMetaTitle = truncateText(title.trim(), 60);
      const resolvedMetaDescription = truncateText(
        stripHtml(enabledFields.has('excerpt') && excerpt ? excerpt : content || ''),
        160
      );
      const resolvedMetaTitleValue = enabledFields.has('metaTitle')
        ? (metaTitle.trim() || resolvedMetaTitle || '')
        : metaTitle.trim();
      const resolvedMetaDescriptionValue = enabledFields.has('metaDescription')
        ? (metaDescription.trim() || resolvedMetaDescription || '')
        : metaDescription.trim();
      const normalizedPostTags = enabledFields.has('tags') ? normalizePostStringList(postTags) : [];
      const normalizedRelatedQueries = enabledFields.has('relatedQueries') ? normalizePostStringList(relatedQueries) : [];
      const normalizedFaqItems = enabledFields.has('faqItems') ? normalizePostFaqItems(faqItems) : [];

      await updatePost({
        authorName: enabledFields.has('author_name') ? authorName.trim() || undefined : undefined,
        categoryId: categoryId as Id<"postCategories">,
        additionalCategoryIds: multiCategoryEnabled
          ? additionalCategoryIds.filter((category) => category !== categoryId) as Id<"postCategories">[]
          : undefined,
        content,
        renderType,
        markdownRender: markdownRender.trim() || undefined,
        htmlRender: htmlRender.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        id: id as Id<"posts">,
        ...(enabledFields.has('faqItems') ? { faqItems: normalizedFaqItems.length > 0 ? normalizedFaqItems : undefined } : {}),
        ...(enabledFields.has('focusKeyword') ? { focusKeyword: focusKeyword.trim() || undefined } : {}),
        metaDescription: enabledFields.has('metaDescription')
          ? (resolvedMetaDescriptionValue || undefined)
          : undefined,
        metaTitle: enabledFields.has('metaTitle')
          ? (resolvedMetaTitleValue || undefined)
          : undefined,
        ...(enabledFields.has('relatedQueries') ? { relatedQueries: normalizedRelatedQueries.length > 0 ? normalizedRelatedQueries : undefined } : {}),
        publishImmediately: status === 'Published' ? publishImmediately : undefined,
        publishedAt: status === 'Published' ? resolvedPublishedAt : undefined,
        slug: slug.trim(),
        status,
        ...(enabledFields.has('tags') ? { tags: normalizedPostTags.length > 0 ? normalizedPostTags : undefined } : {}),
        thumbnail: thumbnail ?? '',
        thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
        title: title.trim(),
      });

      const nextMetaTitle = enabledFields.has('metaTitle')
        ? (resolvedMetaTitleValue || '')
        : metaTitle.trim();
      const nextMetaDescription = enabledFields.has('metaDescription')
        ? (resolvedMetaDescriptionValue || '')
        : metaDescription.trim();

      if (enabledFields.has('metaTitle') && metaTitle !== nextMetaTitle) {
        setMetaTitle(nextMetaTitle);
      }
      if (enabledFields.has('metaDescription') && metaDescription !== nextMetaDescription) {
        setMetaDescription(nextMetaDescription);
      }

      const persistedSnapshot = {
        authorName: authorName.trim(),
        categoryId,
        additionalCategoryIds: [...additionalCategoryIds].sort(),
        content: normalizedContent,
        renderType,
        markdownRender: markdownRender.trim(),
        htmlRender: htmlRender.trim(),
        excerpt: excerpt.trim(),
        faqItems: normalizedFaqItems,
        focusKeyword: focusKeyword.trim(),
        metaDescription: nextMetaDescription,
        metaTitle: nextMetaTitle,
        relatedQueries: normalizedRelatedQueries,
        slug: slug.trim(),
        status,
        tags: normalizedPostTags,
        publishedAt: resolvedPublishedAt,
        thumbnail: thumbnail ?? '',
        title: title.trim(),
        thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
      };

      setInitialSnapshot(persistedSnapshot);
      setSaveStatus('saved');
      toast.success("Cập nhật bài viết thành công");
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, "Không thể cập nhật bài viết"));
      setSaveStatus('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const { hasChanges, saveStatus, setSaveStatus } = useAdminForm({
    initialSnapshot,
    currentSnapshot,
    recordTitle: title || postData?.title,
    onSave: executeSave,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSave();
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa bài viết"
      backHref="/admin/posts"
      isLoading={postData === undefined}
      notFound={postData === null}
      notFoundMessage="Không tìm thấy bài viết"
      onSave={executeSave}
      isSubmitting={isSubmitting || saveStatus === 'saving'}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          mode="edit"
          isSubmitting={isSubmitting || saveStatus === 'saving'}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => { router.push('/admin/posts'); }}
          onClickSave={() => executeSave()}
          onViewWeb={() => window.open(`/${selectedCategorySlug || 'chua-phan-loai'}/${slug}`, '_blank')}
          disableViewWeb={!slug.trim()}
          aiImportNode={<AiEntityImportDialog kind="post" currentData={aiImportCurrentData} enabledFields={enabledFields} onApply={handleApplyAiPost} />}
        />
      }
    >
      <QuickCreateCategoryModal 
        isOpen={showCategoryModal} 
        onClose={() => setShowCategoryModal(false)} 
        onCreated={(newCatId) => setCategoryId(newCatId)}
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
                    copyLabel="tiêu đề"
                    extraAction={
                      <HeadlineGeneratorWidget currentTitle={title} onSelect={handleApplyHeadline} />
                    }
                  />

                  <AdminSlugInput
                    slug={slug}
                    onChange={setSlug}
                    categorySlug={selectedCategorySlug || 'chua-phan-loai'}
                  />

                  {enabledFields.has('excerpt') && (
                    <div className="space-y-2">
                      <Label>Mô tả ngắn</Label>
                      <Input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Nội dung</Label>
                    <LexicalEditor onChange={setContent} initialContent={content} resetKey={editorResetKey} />
                  </div>
                </AdminFormCard>

                {showAdvancedRenderCard && (
                  <AdminFormCard title="Render nâng cao">
                    <div className="space-y-2">
                      <Label>Kiểu render</Label>
                      <select
                        value={renderType}
                        onChange={(e) => setRenderType(e.target.value as 'content' | 'markdown' | 'html')}
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
                          onChange={(e) => setMarkdownRender(e.target.value)}
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
                          onChange={(e) => setHtmlRender(e.target.value)}
                          className="w-full min-h-[120px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
                          placeholder="Dán HTML inline để render..."
                        />
                      </div>
                    )}
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

        <AdminStickyFooter
          isSubmitting={isSubmitting || saveStatus === 'saving'}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => { window.location.href = '/admin/posts'; }}
          onViewWeb={() => window.open(`/${selectedCategorySlug || 'chua-phan-loai'}/${slug}`, '_blank')}
          disableViewWeb={!slug.trim()}
          aiImportNode={<AiEntityImportDialog kind="post" currentData={aiImportCurrentData} enabledFields={enabledFields} onApply={handleApplyAiPost} />}
        />
      </form>
    </AdminFormPageWrapper>
  );
}
