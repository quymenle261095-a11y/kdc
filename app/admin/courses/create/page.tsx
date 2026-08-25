'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { CourseFilterTagsInput } from '@/app/admin/components/CourseFilterTagsInput';
import { QuickCreateCourseCategoryModal } from '@/app/admin/components/QuickCreateCourseCategoryModal';
import { AiEntityImportDialog, type AiEntityImportPayload } from '@/app/admin/components/AiEntityImportDialog';
import { COURSE_LEVEL_OPTIONS, parseCourseLevel, type CourseLevel } from '@/lib/courses/labels';
import { stripHtml, truncateText } from '@/lib/seo';
import { Checkbox, Input, Label } from '../../components/ui';
import { LexicalEditor } from '../../components/LexicalEditor';
import { AdvancedSeoFields, SeoFormTabs, normalizeSeoFaqItems, type SeoFaqItem, type SeoFormTab } from '@/app/admin/components/AdvancedSeoFields';
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

const MODULE_KEY = 'courses';

const getEmbedUrl = (type: string, url: string) => {
  if (!url) return null;
  if (type === 'youtube') {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  }
  if (type === 'drive') {
    return url.replace('/view', '/preview');
  }
  return url;
};

type CourseStatus = 'Draft' | 'Published';
type PricingType = 'free' | 'paid' | 'contact';
type RenderType = 'content' | 'markdown' | 'html';
type VideoType = 'none' | 'youtube' | 'drive' | 'external';

export default function CourseCreatePage() {
  const router = useRouter();
  const categoriesData = useQuery(api.courseCategories.listAll, {});
  const createCourse = useMutation(api.courses.create);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const courseFiltersFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: MODULE_KEY, featureKey: 'enableCourseFilters' });
  const activeFilters = useQuery(api.courseFilters.listActive, {});
  const allFilterValues = useQuery(api.courseFilters.listAllValues, {});

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [thumbnailStorageId, setThumbnailStorageId] = useState<Id<'_storage'> | undefined>();
  const [status, setStatus] = useState<CourseStatus>('Draft');
  const [pricingType, setPricingType] = useState<PricingType>('free');
  const [priceAmount, setPriceAmount] = useState<number | undefined>();
  const [comparePriceAmount, setComparePriceAmount] = useState<number | undefined>();
  const [priceNote, setPriceNote] = useState('');
  const [isPriceVisible, setIsPriceVisible] = useState(true);
  const [instructorName, setInstructorName] = useState('');
  const [level, setLevel] = useState<CourseLevel | ''>('');
  const [durationText, setDurationText] = useState('');
  const [introVideoType, setIntroVideoType] = useState<VideoType>('none');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [featured, setFeatured] = useState(false);
  const [renderType, setRenderType] = useState<RenderType>('content');
  const [markdownRender, setMarkdownRender] = useState('');
  const [htmlRender, setHtmlRender] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [selectedValueIds, setSelectedValueIds] = useState<Id<'courseFilterValues'>[]>([]);
  const [seoTab, setSeoTab] = useState<SeoFormTab>('content');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [faqItems, setFaqItems] = useState<SeoFaqItem[]>([]);

  const enabledFields = useMemo(() => new Set(fieldsData?.map((field) => field.fieldKey) ?? []), [fieldsData]);
  const multiCategoryEnabled = Boolean(settingsData?.find((setting) => setting.settingKey === 'enableMultipleCategories')?.value);
  const categorySlugPreview = categoriesData?.find((category) => category._id === categoryId)?.slug || 'khoa-hoc';
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
    durationText: durationText.trim(),
    excerpt: excerpt.trim(),
    featured,
    htmlRender: htmlRender.trim(),
    instructorName: instructorName.trim(),
    introVideoType,
    introVideoUrl: introVideoUrl.trim(),
    isPriceVisible,
    level,
    markdownRender: markdownRender.trim(),
    metaDescription: metaDescription.trim(),
    metaTitle: metaTitle.trim(),
    price: priceAmount,
    priceNote: priceNote.trim(),
    pricingType,
    slug: slug.trim(),
    thumbnail: thumbnail ?? '',
    title: title.trim(),
    focusKeyword: focusKeyword.trim(),
    tags,
    relatedQueries,
    faqItems,
  }), [comparePriceAmount, content, durationText, excerpt, featured, htmlRender, instructorName, introVideoType, introVideoUrl, isPriceVisible, level, markdownRender, metaDescription, metaTitle, priceAmount, priceNote, pricingType, slug, thumbnail, title, focusKeyword, tags, relatedQueries, faqItems]);

  useEffect(() => {
    if (!settingsData) {return;}
    const defaultStatus = settingsData.find((setting) => setting.settingKey === 'defaultStatus')?.value;
    const defaultPricingType = settingsData.find((setting) => setting.settingKey === 'defaultPricingType')?.value;
    if (defaultStatus === 'published') {setStatus('Published');}
    if (defaultPricingType === 'paid' || defaultPricingType === 'contact' || defaultPricingType === 'free') {
      setPricingType(defaultPricingType);
    }
  }, [settingsData]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTitle(value);
    setSlug(generateSlugFromTitle(value));
  };

  const handleApplyAiCourse = (item: AiEntityImportPayload) => {
    const nextTitle = item.title || title;
    const nextContent = item.content || content;
    const nextPricingType: PricingType = item.pricingType === 'paid' || item.pricingType === 'contact' ? item.pricingType : 'free';
    const nextPrice = typeof item.price === 'number' ? item.price : undefined;
    const nextComparePrice = typeof item.comparePriceAmount === 'number' ? item.comparePriceAmount : undefined;
    const nextLevel = parseCourseLevel(item.level);
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
    if (item.thumbnail || item.image) {
      setThumbnail(item.thumbnail || item.image);
      setThumbnailStorageId(undefined);
    }
    setPricingType(nextPricingType);
    if (typeof nextPrice === 'number') { setPriceAmount(nextPrice); }
    if (typeof nextComparePrice === 'number') { setComparePriceAmount(nextComparePrice); }
    if (item.priceNote) { setPriceNote(item.priceNote); }
    if (typeof item.isPriceVisible === 'boolean') { setIsPriceVisible(item.isPriceVisible); }
    if (item.instructorName) { setInstructorName(item.instructorName); }
    if (nextLevel) { setLevel(nextLevel); }
    if (item.durationText || item.duration) { setDurationText(item.durationText || item.duration || ''); }
    setIntroVideoType(nextIntroVideoType);
    if (item.introVideoUrl) { setIntroVideoUrl(item.introVideoUrl); }
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
      const newCourseId = await createCourse({
        additionalCategoryIds: multiCategoryEnabled
          ? additionalCategoryIds.filter((id) => id !== categoryId) as Id<'courseCategories'>[]
          : undefined,
        categoryId: categoryId as Id<'courseCategories'>,
        comparePriceAmount: pricingType === 'paid' ? comparePriceAmount : undefined,
        content,
        durationText: durationText.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        featured,
        htmlRender: hasHtmlRender ? (htmlRender.trim() || undefined) : undefined,
        instructorName: instructorName.trim() || undefined,
        introVideoType,
        introVideoUrl: introVideoType !== 'none' ? (introVideoUrl.trim() || undefined) : undefined,
        isPriceVisible,
        level: level || undefined,
        markdownRender: hasMarkdownRender ? (markdownRender.trim() || undefined) : undefined,
        metaDescription: enabledFields.has('metaDescription') ? (metaDescription.trim() || resolvedMetaDescription || undefined) : undefined,
        metaTitle: enabledFields.has('metaTitle') ? (metaTitle.trim() || resolvedMetaTitle || undefined) : undefined,
        focusKeyword: enabledFields.has('focusKeyword') ? (focusKeyword.trim() || undefined) : undefined,
        relatedQueries: enabledFields.has('relatedQueries') ? relatedQueries : undefined,
        tags: enabledFields.has('tags') ? tags : undefined,
        faqItems: enabledFields.has('faqItems') ? normalizeSeoFaqItems(faqItems) : undefined,
        priceAmount: pricingType === 'paid' ? priceAmount : undefined,
        priceNote: priceNote.trim() || undefined,
        pricingType,
        renderType,
        slug: slug.trim() || generateSlugFromTitle(title),
        status,
        thumbnail,
        thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
        title: title.trim(),
        valueIds: selectedValueIds,
      });
      toast.success('Đã tạo khóa học thành công.');
      router.push(`/admin/courses/${newCourseId}/edit`);
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể tạo khóa học'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm khóa học mới"
      subtitle="Tạo nội dung khóa học và thiết lập lộ trình học."
      backHref="/admin/courses"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Tạo khóa học"
          onCancel={() => router.push('/admin/courses')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          aiImportNode={
            <AiEntityImportDialog
              kind="course"
              currentData={aiImportCurrentData}
              enabledFields={enabledFields}
              onApply={handleApplyAiCourse}
            />
          }
        />
      }
    >
      <QuickCreateCourseCategoryModal
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
                  label="Tiêu đề khóa học"
                  value={title}
                  onChange={handleTitleChange}
                  required
                  placeholder="Nhập tiêu đề khóa học..."
                  autoFocus
                  copyLabel="tiêu đề khóa học"
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
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Tóm tắt ngắn về khóa học..."
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

              <AdminFormCard title="Học phí & Giá bán">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hình thức học phí</Label>
                    <AdminSelect
                      value={pricingType}
                      onChange={(val) => setPricingType(val as PricingType)}
                      options={[
                        { value: 'free', label: 'Miễn phí' },
                        { value: 'paid', label: 'Thu phí' },
                        { value: 'contact', label: 'Liên hệ báo giá' },
                      ]}
                    />
                  </div>

                  {pricingType === 'paid' && (
                    <>
                      <div className="space-y-2">
                        <Label>Giá bán chính thức (VNĐ)</Label>
                        <Input
                          type="number"
                          value={priceAmount ?? ''}
                          onChange={(e) => setPriceAmount(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="VD: 500000"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Giá gốc / Giá so sánh (VNĐ)</Label>
                        <Input
                          type="number"
                          value={comparePriceAmount ?? ''}
                          onChange={(e) => setComparePriceAmount(e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="VD: 1000000"
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2 md:col-span-2">
                    <Label>Ghi chú học phí</Label>
                    <Input
                      value={priceNote}
                      onChange={(e) => setPriceNote(e.target.value)}
                      placeholder="VD: Đã bao gồm giáo trình và tài liệu thực hành..."
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-2 md:col-span-2">
                    <Checkbox
                      id="isPriceVisible"
                      checked={isPriceVisible}
                      onCheckedChange={(checked) => setIsPriceVisible(Boolean(checked))}
                    />
                    <Label htmlFor="isPriceVisible" className="cursor-pointer text-sm font-medium">
                      Hiển thị giá công khai trên giao diện khóa học
                    </Label>
                  </div>
                </div>
              </AdminFormCard>

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
                onStatusChange={(val) => setStatus(val as CourseStatus)}
                categoryId={categoryId}
                onCategoryIdChange={setCategoryId}
                categories={categoriesData}
                multiCategoryEnabled={multiCategoryEnabled}
                additionalCategoryIds={additionalCategoryIds}
                onAdditionalCategoryIdsChange={setAdditionalCategoryIds}
                onOpenCategoryModal={() => setShowCategoryModal(true)}
                categoryLabel="Danh mục chính"
                categoryHint="Thẻ đầu tiên là danh mục chính."
                extraContent={
                  enabledFields.has('featured') ? (
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="featured"
                        checked={featured}
                        onCheckedChange={(checked) => setFeatured(Boolean(checked))}
                      />
                      <Label htmlFor="featured" className="cursor-pointer text-sm font-medium">
                        Khóa học nổi bật
                      </Label>
                    </div>
                  ) : undefined
                }
              />

              <AdminFormCard title="Thông tin đào tạo">
                <div className="space-y-4">
                  {enabledFields.has('instructorName') && (
                    <div className="space-y-2">
                      <Label>Giảng viên phụ trách</Label>
                      <Input
                        value={instructorName}
                        onChange={(e) => setInstructorName(e.target.value)}
                        placeholder="VD: ThS. Nguyễn Văn A"
                      />
                    </div>
                  )}

                  {enabledFields.has('level') && (
                    <div className="space-y-2">
                      <Label>Cấp độ học viên</Label>
                      <AdminSelect
                        value={level}
                        onChange={(val) => setLevel(val as CourseLevel | '')}
                        options={[
                          { value: '', label: '-- Chọn cấp độ --' },
                          ...COURSE_LEVEL_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
                        ]}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Thời lượng ước tính</Label>
                    <Input
                      value={durationText}
                      onChange={(e) => setDurationText(e.target.value)}
                      placeholder="VD: 12 giờ học (36 bài)"
                    />
                  </div>
                </div>
              </AdminFormCard>

              <AdminFormCard title="Video giới thiệu (Trailer)">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Loại nguồn video</Label>
                    <AdminSelect
                      value={introVideoType}
                      onChange={(val) => setIntroVideoType(val as VideoType)}
                      options={[
                        { value: 'none', label: 'Không có video trailer' },
                        { value: 'youtube', label: 'YouTube Video' },
                        { value: 'drive', label: 'Google Drive' },
                        { value: 'external', label: 'Link MP4 ngoài' },
                      ]}
                    />
                  </div>

                  {introVideoType !== 'none' && (
                    <div className="space-y-2">
                      <Label>Đường dẫn video</Label>
                      <Input
                        value={introVideoUrl}
                        onChange={(e) => setIntroVideoUrl(e.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                      />
                      {getEmbedUrl(introVideoType, introVideoUrl) && (
                        <div className="mt-2 aspect-video w-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
                          <iframe
                            src={getEmbedUrl(introVideoType, introVideoUrl)!}
                            className="h-full w-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AdminFormCard>

              {courseFiltersFeature?.enabled && (
                <AdminFormCard title="Bộ lọc & Phần mềm liên quan">
                  <CourseFilterTagsInput
                    activeFilters={activeFilters}
                    allFilterValues={allFilterValues}
                    value={selectedValueIds}
                    onChange={setSelectedValueIds}
                    placeholder="Tìm và chọn phần mềm..."
                  />
                </AdminFormCard>
              )}

              <AdminThumbnailSidebarCard
                thumbnail={thumbnail}
                thumbnailStorageId={thumbnailStorageId}
                onThumbnailChange={(url, storageId) => {
                  setThumbnail(url);
                  setThumbnailStorageId(storageId);
                }}
                folder="courses"
                entitySlug={slug || 'course'}
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
              SEO nâng cao đang tắt trong cấu hình module Courses.
            </div>
          </AdminFormCard>
        )}
      </form>
    </AdminFormPageWrapper>
  );
}
