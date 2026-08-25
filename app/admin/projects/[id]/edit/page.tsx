'use client';

import React, { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { stripHtml, truncateText } from '@/lib/seo';
import { Button, Checkbox, Input, Label } from '../../../components/ui';
import { LexicalEditor } from '../../../components/LexicalEditor';
import type { ImageItem } from '../../../components/MultiImageUploader';
import { MultiImageUploader } from '../../../components/MultiImageUploader';
import { ModuleGuard } from '../../../components/ModuleGuard';
import { QuickCreateProjectCategoryModal } from '@/app/admin/components/QuickCreateProjectCategoryModal';
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

const MODULE_KEY = 'projects';

type ProjectStatus = 'Draft' | 'Published';
type RenderType = 'content' | 'markdown' | 'html';
type VideoType = 'none' | 'youtube' | 'drive' | 'external';

const getEmbedUrl = (type: VideoType, url: string) => {
  if (!url) return null;
  if (type === 'youtube') {
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    const videoId = match && match[2]?.length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (type === 'drive') {
    return url.replace('/view', '/preview');
  }
  return type === 'external' ? url : null;
};

export default function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ModuleGuard moduleKey="projects">
      <ProjectEditContent params={params} />
    </ModuleGuard>
  );
}

function ProjectEditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const projectId = id as Id<'projects'>;
  const projectData = useQuery(api.projects.getById, { id: projectId });
  useSetAdminBreadcrumb(projectData?.title);
  const additionalCategoryIdsData = useQuery(api.projects.getAdditionalCategoryIds, { id: projectId });
  const categoriesData = useQuery(api.projectCategories.listAll, {});
  const updateProject = useMutation(api.projects.update);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [renderType, setRenderType] = useState<RenderType>('content');
  const [markdownRender, setMarkdownRender] = useState('');
  const [htmlRender, setHtmlRender] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [thumbnailStorageId, setThumbnailStorageId] = useState<Id<'_storage'> | undefined | null>();
  const [galleryItems, setGalleryItems] = useState<ImageItem[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [clientName, setClientName] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [introVideoType, setIntroVideoType] = useState<VideoType>('none');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<ProjectStatus>('Draft');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [seoTab, setSeoTab] = useState<SeoFormTab>('content');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [faqItems, setFaqItems] = useState<SeoFaqItem[]>([]);

  const initialSnapshotRef = useRef<{
    title: string;
    slug: string;
    content: string;
    renderType: RenderType;
    markdownRender: string;
    htmlRender: string;
    excerpt: string;
    metaTitle: string;
    metaDescription: string;
    thumbnail: string | undefined;
    thumbnailStorageId: Id<'_storage'> | undefined | null;
    categoryId: string;
    additionalCategoryIds: string[];
    clientName: string;
    projectUrl: string;
    introVideoType: VideoType;
    introVideoUrl: string;
    featured: boolean;
    status: ProjectStatus;
    focusKeyword: string;
    tags: string[];
    relatedQueries: string[];
    faqItems: SeoFaqItem[];
  } | null>(null);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach((field) => fields.add(field.fieldKey));
    return fields;
  }, [fieldsData]);

  const multiCategoryEnabled = Boolean(settingsData?.find((setting) => setting.settingKey === 'enableMultipleCategories')?.value);
  const selectedCategorySlug = categoriesData?.find((category) => category._id === categoryId)?.slug || 'du-an';
  const hasMarkdownRender = enabledFields.has('markdownRender');
  const hasHtmlRender = enabledFields.has('htmlRender');
  const showAdvancedRenderCard = hasMarkdownRender || hasHtmlRender;
  const showIntroVideo = enabledFields.has('introVideoUrl') || enabledFields.has('introVideoType');
  const showGallery = enabledFields.has('images');
  const showAdvancedSeoFields = enabledFields.has('focusKeyword')
    || enabledFields.has('tags')
    || enabledFields.has('relatedQueries')
    || enabledFields.has('faqItems');

  const aiImportCurrentData = useMemo<AiEntityImportPayload>(() => ({
    clientName: clientName.trim(),
    content: content.trim(),
    excerpt: excerpt.trim(),
    faqItems: normalizeSeoFaqItems(faqItems),
    featured,
    focusKeyword: focusKeyword.trim(),
    htmlRender: htmlRender.trim(),
    introVideoType,
    introVideoUrl: introVideoUrl.trim(),
    markdownRender: markdownRender.trim(),
    metaDescription: metaDescription.trim(),
    metaTitle: metaTitle.trim(),
    projectUrl: projectUrl.trim(),
    relatedQueries: normalizeSeoStringList(relatedQueries),
    slug: slug.trim(),
    tags: normalizeSeoStringList(tags),
    thumbnail: thumbnail ?? '',
    title: title.trim(),
  }), [clientName, content, excerpt, faqItems, featured, focusKeyword, htmlRender, introVideoType, introVideoUrl, markdownRender, metaDescription, metaTitle, projectUrl, relatedQueries, slug, tags, thumbnail, title]);

  useEffect(() => {
    if (!projectData || initialized) return;
    const initialAdditionalCategoryIds = (additionalCategoryIdsData ?? []).map((id) => id);
    const initialIntroVideoType: VideoType = projectData.introVideoType === 'youtube' || projectData.introVideoType === 'drive' || projectData.introVideoType === 'external' ? projectData.introVideoType : 'none';
    const initialRenderType: RenderType = projectData.renderType === 'html' || projectData.renderType === 'markdown' ? projectData.renderType : 'content';
    const initialStatus: ProjectStatus = projectData.status === 'Published' ? 'Published' : 'Draft';
    const initialTags = normalizeSeoStringList(projectData.tags ?? []);
    const initialQueries = normalizeSeoStringList(projectData.relatedQueries ?? []);
    const initialFaqs = normalizeSeoFaqItems(projectData.faqItems ?? []);

    setTitle(projectData.title);
    setSlug(projectData.slug);
    setContent(projectData.content ?? '');
    setRenderType(initialRenderType);
    setMarkdownRender(projectData.markdownRender ?? '');
    setHtmlRender(projectData.htmlRender ?? '');
    setExcerpt(projectData.excerpt ?? '');
    setMetaTitle(projectData.metaTitle ?? '');
    setMetaDescription(projectData.metaDescription ?? '');
    setThumbnail(projectData.thumbnail);
    setThumbnailStorageId(projectData.thumbnailStorageId ?? null);
    setCategoryId(projectData.categoryId);
    setAdditionalCategoryIds(initialAdditionalCategoryIds);
    setClientName(projectData.clientName ?? '');
    setProjectUrl(projectData.projectUrl ?? '');
    setIntroVideoType(initialIntroVideoType);
    setIntroVideoUrl(projectData.introVideoUrl ?? '');
    setFeatured(Boolean(projectData.featured));
    setStatus(initialStatus);
    setFocusKeyword(projectData.focusKeyword ?? '');
    setTags(initialTags);
    setRelatedQueries(initialQueries);
    setFaqItems(initialFaqs);

    const initialGalleryItems: ImageItem[] = (projectData.images ?? []).map((img, index) => ({
      id: `gallery-${index}`,
      url: img,
      storageId: projectData.imageStorageIds?.[index] ?? null,
    }));
    setGalleryItems(initialGalleryItems);

    initialSnapshotRef.current = {
      title: projectData.title.trim(),
      slug: projectData.slug.trim(),
      content: (projectData.content ?? '').trim(),
      renderType: initialRenderType,
      markdownRender: (projectData.markdownRender ?? '').trim(),
      htmlRender: (projectData.htmlRender ?? '').trim(),
      excerpt: (projectData.excerpt ?? '').trim(),
      metaTitle: (projectData.metaTitle ?? '').trim(),
      metaDescription: (projectData.metaDescription ?? '').trim(),
      thumbnail: projectData.thumbnail || '',
      thumbnailStorageId: projectData.thumbnailStorageId ?? null,
      categoryId: projectData.categoryId || '',
      additionalCategoryIds: [...initialAdditionalCategoryIds].sort(),
      clientName: (projectData.clientName ?? '').trim(),
      projectUrl: (projectData.projectUrl ?? '').trim(),
      introVideoType: initialIntroVideoType,
      introVideoUrl: (projectData.introVideoUrl ?? '').trim(),
      featured: Boolean(projectData.featured),
      status: initialStatus,
      focusKeyword: (projectData.focusKeyword ?? '').trim(),
      tags: [...initialTags].sort(),
      relatedQueries: [...initialQueries].sort(),
      faqItems: initialFaqs,
    };

    setInitialized(true);
  }, [projectData, additionalCategoryIdsData, initialized]);

  const currentSnapshot = useMemo(() => ({
    title: title.trim(),
    slug: slug.trim(),
    content: content.trim(),
    renderType,
    markdownRender: markdownRender.trim(),
    htmlRender: htmlRender.trim(),
    excerpt: excerpt.trim(),
    metaTitle: metaTitle.trim(),
    metaDescription: metaDescription.trim(),
    thumbnail: thumbnail || '',
    thumbnailStorageId: thumbnailStorageId ?? null,
    categoryId: categoryId || '',
    additionalCategoryIds: [...additionalCategoryIds].sort(),
    clientName: clientName.trim(),
    projectUrl: projectUrl.trim(),
    introVideoType,
    introVideoUrl: introVideoUrl.trim(),
    featured,
    status,
    focusKeyword: focusKeyword.trim(),
    tags: [...tags].sort(),
    relatedQueries: [...relatedQueries].sort(),
    faqItems: normalizeSeoFaqItems(faqItems),
  }), [
    title,
    slug,
    content,
    renderType,
    markdownRender,
    htmlRender,
    excerpt,
    metaTitle,
    metaDescription,
    thumbnail,
    thumbnailStorageId,
    categoryId,
    additionalCategoryIds,
    clientName,
    projectUrl,
    introVideoType,
    introVideoUrl,
    featured,
    status,
    focusKeyword,
    tags,
    relatedQueries,
    faqItems,
  ]);

  const hasChanges = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return JSON.stringify(initialSnapshotRef.current) !== JSON.stringify(currentSnapshot);
  }, [currentSnapshot]);

  const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextTitle = event.target.value;
    setTitle(nextTitle);
    setSlug(generateSlugFromTitle(nextTitle));
  };

  const handleApplyAiProject = (item: AiEntityImportPayload) => {
    const nextTitle = item.title || title;
    const nextContent = item.content || content;
    const nextIntroVideoType: VideoType = item.introVideoType === 'youtube' || item.introVideoType === 'drive' || item.introVideoType === 'external' ? item.introVideoType : 'none';

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
    if (item.clientName) { setClientName(item.clientName); }
    if (item.projectUrl) { setProjectUrl(item.projectUrl); }
    setIntroVideoType(nextIntroVideoType);
    if (item.introVideoUrl) { setIntroVideoUrl(item.introVideoUrl); }
    if (typeof item.featured === 'boolean') { setFeatured(item.featured); }
    if (item.focusKeyword) { setFocusKeyword(item.focusKeyword); }
    if (item.tags) { setTags(item.tags); }
    if (item.relatedQueries) { setRelatedQueries(item.relatedQueries); }
    if (item.faqItems) { setFaqItems(normalizeSeoFaqItems(item.faqItems)); }
    setEditorResetKey((prev) => prev + 1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !categoryId) return;

    setIsSubmitting(true);
    try {
      const resolvedMetaTitle = truncateText(title.trim(), 60);
      const resolvedMetaDescription = truncateText(stripHtml(excerpt || content || ''), 160);

      await updateProject({
        additionalCategoryIds: multiCategoryEnabled
          ? additionalCategoryIds.filter((item) => item !== categoryId) as Id<'projectCategories'>[]
          : undefined,
        categoryId: categoryId as Id<'projectCategories'>,
        clientName: enabledFields.has('clientName') ? (clientName.trim() || undefined) : undefined,
        content,
        excerpt: enabledFields.has('excerpt') ? (excerpt.trim() || undefined) : undefined,
        faqItems: enabledFields.has('faqItems') ? normalizeSeoFaqItems(faqItems) : undefined,
        featured,
        focusKeyword: enabledFields.has('focusKeyword') ? (focusKeyword.trim() || undefined) : undefined,
        htmlRender: hasHtmlRender ? (htmlRender.trim() || undefined) : undefined,
        id: projectId,
        images: showGallery ? galleryItems.map((item) => item.url).filter(Boolean) : undefined,
        imageStorageIds: showGallery ? galleryItems.map((item) => item.storageId ?? null) : undefined,
        introVideoType,
        introVideoUrl: introVideoType !== 'none' ? (introVideoUrl.trim() || undefined) : undefined,
        markdownRender: hasMarkdownRender ? (markdownRender.trim() || undefined) : undefined,
        metaDescription: enabledFields.has('metaDescription') ? (metaDescription.trim() || resolvedMetaDescription || undefined) : undefined,
        metaTitle: enabledFields.has('metaTitle') ? (metaTitle.trim() || resolvedMetaTitle || undefined) : undefined,
        projectUrl: enabledFields.has('projectUrl') ? (projectUrl.trim() || undefined) : undefined,
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
      toast.success('Đã lưu thay đổi dự án thành công');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật dự án'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa dự án"
      subtitle="Cập nhật thông tin dự án, hình ảnh và tối ưu SEO."
      backHref="/admin/projects"
      isLoading={projectData === undefined}
      notFound={projectData === null}
      notFoundMessage="Không tìm thấy dự án yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/projects')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          onViewWeb={slug ? () => window.open(`/${selectedCategorySlug}/${slug}`, '_blank') : undefined}
          aiImportNode={
            <AiEntityImportDialog
              kind="project"
              currentData={aiImportCurrentData}
              enabledFields={enabledFields}
              onApply={handleApplyAiProject}
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
      <QuickCreateProjectCategoryModal
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
                  label="Tên dự án"
                  value={title}
                  onChange={handleTitleChange}
                  required
                  placeholder="Nhập tên dự án..."
                  autoFocus
                  copyLabel="tên dự án"
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
                      placeholder="Tóm tắt ngắn gọn về dự án..."
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

              {showAdvancedRenderCard && (
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
                onStatusChange={(val) => setStatus(val as ProjectStatus)}
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
                        Dự án nổi bật
                      </Label>
                    </div>
                  ) : undefined
                }
              />

              {(enabledFields.has('clientName') || enabledFields.has('projectUrl')) && (
                <AdminFormCard title="Thông tin dự án">
                  <div className="space-y-4">
                    {enabledFields.has('clientName') && (
                      <div className="space-y-2">
                        <Label>Khách hàng</Label>
                        <Input
                          value={clientName}
                          onChange={(event) => setClientName(event.target.value)}
                          placeholder="VD: Công ty Cổ phần XYZ"
                        />
                      </div>
                    )}

                    {enabledFields.has('projectUrl') && (
                      <div className="space-y-2">
                        <Label>URL dự án (Website / Demo)</Label>
                        <Input
                          value={projectUrl}
                          onChange={(event) => setProjectUrl(event.target.value)}
                          placeholder="https://..."
                        />
                      </div>
                    )}
                  </div>
                </AdminFormCard>
              )}

              {showIntroVideo && (
                <AdminFormCard title="Video giới thiệu">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Loại video</Label>
                      <AdminSelect
                        value={introVideoType}
                        onChange={(val) => setIntroVideoType(val as VideoType)}
                        options={[
                          { value: 'none', label: 'Không có video' },
                          { value: 'youtube', label: 'YouTube Video' },
                          { value: 'drive', label: 'Google Drive' },
                          { value: 'external', label: 'Link ngoài' },
                        ]}
                      />
                    </div>

                    {introVideoType !== 'none' && (
                      <div className="space-y-2">
                        <Label>URL video</Label>
                        <Input
                          value={introVideoUrl}
                          onChange={(event) => setIntroVideoUrl(event.target.value)}
                          placeholder="https://..."
                        />
                        {getEmbedUrl(introVideoType, introVideoUrl) && (
                          <div className="mt-2 aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                            <iframe
                              src={getEmbedUrl(introVideoType, introVideoUrl)!}
                              className="h-full w-full border-0"
                              allowFullScreen
                            />
                          </div>
                        )}
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
                folder="projects"
                entitySlug={slug || 'project'}
                aspectRatio="video"
              />

              {showGallery && (
                <AdminFormCard title="Thư viện ảnh">
                  <MultiImageUploader<ImageItem>
                    items={galleryItems}
                    onChange={setGalleryItems}
                    folder="projects"
                    naming={{ entityName: slug.trim() || 'project', style: 'slug-index' }}
                    namingIndexOffset={1}
                    deleteMode="defer"
                    imageKey="url"
                    minItems={0}
                    maxItems={20}
                    aspectRatio="video"
                    columns={2}
                    addButtonText="Thêm ảnh"
                    emptyText="Chưa có ảnh trong thư viện"
                    layout="vertical"
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
              SEO nâng cao đang tắt trong cấu hình module Projects.
            </div>
          </AdminFormCard>
        )}
      </form>
    </AdminFormPageWrapper>
  );
}
