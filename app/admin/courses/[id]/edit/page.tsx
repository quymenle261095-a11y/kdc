'use client';

import React, { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { CourseFilterTagsInput } from '@/app/admin/components/CourseFilterTagsInput';
import { QuickCreateCourseCategoryModal } from '@/app/admin/components/QuickCreateCourseCategoryModal';
import { AiEntityImportDialog, type AiEntityImportPayload } from '@/app/admin/components/AiEntityImportDialog';
import { COURSE_LEVEL_OPTIONS, parseCourseLevel, type CourseLevel } from '@/lib/courses/labels';
import { stripHtml, truncateText } from '@/lib/seo';
import { Button, Checkbox, Input, Label, cn } from '@/app/admin/components/ui';
import { LexicalEditor } from '@/app/admin/components/LexicalEditor';
import { CourseCurriculumEditor } from '@/app/admin/courses/components/CourseCurriculumEditor';
import { CourseStudentsPanel } from '@/app/admin/courses/components/CourseStudentsPanel';
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

export default function CourseEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const courseId = id as Id<'courses'>;

  const courseData = useQuery(api.courses.getById, { id: courseId });
  const additionalCategoryIdsData = useQuery(api.courses.getAdditionalCategoryIds, { id: courseId });
  const categoriesData = useQuery(api.courseCategories.listAll, {});
  const updateCourse = useMutation(api.courses.update);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const courseFiltersFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: MODULE_KEY, featureKey: 'enableCourseFilters' });
  const activeFilters = useQuery(api.courseFilters.listActive, {});
  const allFilterValues = useQuery(api.courseFilters.listAllValues, {});
  const assignedFilters = useQuery(api.courseFilters.listByCourse, { courseId });

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [additionalCategoryIds, setAdditionalCategoryIds] = useState<string[]>([]);
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [thumbnailStorageId, setThumbnailStorageId] = useState<Id<'_storage'> | undefined | null>();
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
  const [initialized, setInitialized] = useState(false);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'general' | 'curriculum' | 'students'>('general');
  const [selectedValueIds, setSelectedValueIds] = useState<Id<'courseFilterValues'>[]>([]);
  const [seoTab, setSeoTab] = useState<SeoFormTab>('content');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [relatedQueries, setRelatedQueries] = useState<string[]>([]);
  const [faqItems, setFaqItems] = useState<SeoFaqItem[]>([]);

  const [curriculumIsDirty, setCurriculumIsDirty] = useState(false);
  const curriculumSaveFnRef = useRef<(() => Promise<void>) | null>(null);

  const handleCurriculumDirtyChange = useCallback((isDirty: boolean) => {
    setCurriculumIsDirty(isDirty);
  }, []);

  const initialSnapshotRef = useRef<{
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    categoryId: string;
    additionalCategoryIds: string[];
    thumbnail: string | undefined;
    thumbnailStorageId: Id<'_storage'> | undefined | null;
    status: CourseStatus;
    pricingType: PricingType;
    priceAmount: number | undefined;
    comparePriceAmount: number | undefined;
    priceNote: string;
    isPriceVisible: boolean;
    instructorName: string;
    level: CourseLevel | '';
    durationText: string;
    introVideoType: VideoType;
    introVideoUrl: string;
    featured: boolean;
    renderType: RenderType;
    markdownRender: string;
    htmlRender: string;
    metaTitle: string;
    metaDescription: string;
    valueIds: string[];
    focusKeyword: string;
    tags: string[];
    relatedQueries: string[];
    faqItems: SeoFaqItem[];
  } | null>(null);

  const [snapshotVersion, setSnapshotVersion] = useState(0);

  const enabledFields = useMemo(() => new Set(fieldsData?.map((field) => field.fieldKey) ?? []), [fieldsData]);
  const multiCategoryEnabled = Boolean(settingsData?.find((setting) => setting.settingKey === 'enableMultipleCategories')?.value);
  const selectedCategorySlug = categoriesData?.find((category) => category._id === categoryId)?.slug;
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
  }), [
    comparePriceAmount,
    content,
    durationText,
    excerpt,
    featured,
    htmlRender,
    instructorName,
    introVideoType,
    introVideoUrl,
    isPriceVisible,
    level,
    markdownRender,
    metaDescription,
    metaTitle,
    priceAmount,
    priceNote,
    pricingType,
    slug,
    thumbnail,
    title,
    focusKeyword,
    tags,
    relatedQueries,
    faqItems,
  ]);

  useEffect(() => {
    if (!settingsData) return;
    const isMulti = Boolean(settingsData.find((setting) => setting.settingKey === 'enableMultipleCategories')?.value);
    if (!isMulti && additionalCategoryIds.length > 0) {
      setAdditionalCategoryIds([]);
    }
  }, [settingsData, additionalCategoryIds.length]);

  useEffect(() => {
    if (assignedFilters) {
      setSelectedValueIds(assignedFilters.map((f) => f._id));
    }
  }, [assignedFilters]);

  useEffect(() => {
    if (courseData && !initialized) {
      const initialAdditionalCategoryIds = (additionalCategoryIdsData ?? []).map((id) => id);
      const initialPricingType: PricingType = courseData.pricingType === 'paid' || courseData.pricingType === 'contact' ? courseData.pricingType : 'free';
      const initialStatus: CourseStatus = courseData.status === 'Published' ? 'Published' : 'Draft';
      const initialIntroVideoType: VideoType = courseData.introVideoType === 'youtube' || courseData.introVideoType === 'drive' || courseData.introVideoType === 'external' ? courseData.introVideoType : 'none';
      const initialLevel: CourseLevel | '' = parseCourseLevel(courseData.level) ?? '';
      const initialRenderType: RenderType = courseData.renderType === 'html' || courseData.renderType === 'markdown' ? courseData.renderType : 'content';
      const initialFilterValueIds = assignedFilters ? assignedFilters.map((f) => f._id) : [];

      setTitle(courseData.title);
      setSlug(courseData.slug);
      setContent(courseData.content ?? '');
      setExcerpt(courseData.excerpt ?? '');
      setCategoryId(courseData.categoryId);
      setAdditionalCategoryIds(initialAdditionalCategoryIds);
      setThumbnail(courseData.thumbnail);
      setThumbnailStorageId(courseData.thumbnailStorageId);
      setStatus(initialStatus);
      setPricingType(initialPricingType);
      setPriceAmount(courseData.priceAmount);
      setComparePriceAmount(courseData.comparePriceAmount);
      setPriceNote(courseData.priceNote ?? '');
      setIsPriceVisible(courseData.isPriceVisible ?? true);
      setInstructorName(courseData.instructorName ?? '');
      setLevel(initialLevel);
      setDurationText(courseData.durationText ?? '');
      setIntroVideoType(initialIntroVideoType);
      setIntroVideoUrl(courseData.introVideoUrl ?? '');
      setFeatured(Boolean(courseData.featured));
      setRenderType(initialRenderType);
      setMarkdownRender(courseData.markdownRender ?? '');
      setHtmlRender(courseData.htmlRender ?? '');
      setMetaTitle(courseData.metaTitle ?? '');
      setMetaDescription(courseData.metaDescription ?? '');
      setFocusKeyword(courseData.focusKeyword ?? '');
      setTags(courseData.tags ?? []);
      setRelatedQueries(courseData.relatedQueries ?? []);
      setFaqItems(normalizeSeoFaqItems(courseData.faqItems ?? []));

      initialSnapshotRef.current = {
        title: courseData.title.trim(),
        slug: courseData.slug.trim(),
        content: (courseData.content ?? '').trim(),
        excerpt: (courseData.excerpt ?? '').trim(),
        categoryId: courseData.categoryId || '',
        additionalCategoryIds: [...initialAdditionalCategoryIds].sort(),
        thumbnail: courseData.thumbnail,
        thumbnailStorageId: courseData.thumbnailStorageId ?? null,
        status: initialStatus,
        pricingType: initialPricingType,
        priceAmount: courseData.priceAmount,
        comparePriceAmount: courseData.comparePriceAmount,
        priceNote: (courseData.priceNote ?? '').trim(),
        isPriceVisible: courseData.isPriceVisible ?? true,
        instructorName: (courseData.instructorName ?? '').trim(),
        level: initialLevel,
        durationText: (courseData.durationText ?? '').trim(),
        introVideoType: initialIntroVideoType,
        introVideoUrl: (courseData.introVideoUrl ?? '').trim(),
        featured: Boolean(courseData.featured),
        renderType: initialRenderType,
        markdownRender: (courseData.markdownRender ?? '').trim(),
        htmlRender: (courseData.htmlRender ?? '').trim(),
        metaTitle: (courseData.metaTitle ?? '').trim(),
        metaDescription: (courseData.metaDescription ?? '').trim(),
        valueIds: [...initialFilterValueIds].sort(),
        focusKeyword: (courseData.focusKeyword ?? '').trim(),
        tags: [...(courseData.tags ?? [])].sort(),
        relatedQueries: [...(courseData.relatedQueries ?? [])].sort(),
        faqItems: normalizeSeoFaqItems(courseData.faqItems ?? []),
      };
      setSnapshotVersion((prev) => prev + 1);
      setInitialized(true);
    }
  }, [courseData, additionalCategoryIdsData, assignedFilters, initialized]);

  const currentSnapshot = useMemo(() => ({
    title: title.trim(),
    slug: slug.trim(),
    content: content.trim(),
    excerpt: excerpt.trim(),
    categoryId: categoryId || '',
    additionalCategoryIds: [...additionalCategoryIds].sort(),
    thumbnail,
    thumbnailStorageId: thumbnailStorageId ?? null,
    status,
    pricingType,
    priceAmount,
    comparePriceAmount,
    priceNote: priceNote.trim(),
    isPriceVisible,
    instructorName: instructorName.trim(),
    level,
    durationText: durationText.trim(),
    introVideoType,
    introVideoUrl: introVideoUrl.trim(),
    featured,
    renderType,
    markdownRender: markdownRender.trim(),
    htmlRender: htmlRender.trim(),
    metaTitle: metaTitle.trim(),
    metaDescription: metaDescription.trim(),
    valueIds: [...selectedValueIds].sort(),
    focusKeyword: focusKeyword.trim(),
    tags: [...tags].sort(),
    relatedQueries: [...relatedQueries].sort(),
    faqItems: normalizeSeoFaqItems(faqItems),
  }), [
    title,
    slug,
    content,
    excerpt,
    categoryId,
    additionalCategoryIds,
    thumbnail,
    thumbnailStorageId,
    status,
    pricingType,
    priceAmount,
    comparePriceAmount,
    priceNote,
    isPriceVisible,
    instructorName,
    level,
    durationText,
    introVideoType,
    introVideoUrl,
    featured,
    renderType,
    markdownRender,
    htmlRender,
    metaTitle,
    metaDescription,
    selectedValueIds,
    focusKeyword,
    tags,
    relatedQueries,
    faqItems,
  ]);

  const generalHasChanges = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return JSON.stringify(initialSnapshotRef.current) !== JSON.stringify(currentSnapshot);
  }, [currentSnapshot, snapshotVersion]);

  const hasChanges = generalHasChanges || curriculumIsDirty;

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
      if (generalHasChanges) {
        const resolvedMetaTitle = truncateText(title.trim(), 60);
        const resolvedMetaDescription = truncateText(stripHtml(excerpt || content || ''), 160);
        await updateCourse({
          additionalCategoryIds: multiCategoryEnabled
            ? additionalCategoryIds.filter((item) => item !== categoryId) as Id<'courseCategories'>[]
            : undefined,
          categoryId: categoryId as Id<'courseCategories'>,
          comparePriceAmount: pricingType === 'paid' ? comparePriceAmount : undefined,
          content,
          durationText: durationText.trim() || undefined,
          excerpt: excerpt.trim() || undefined,
          featured,
          htmlRender: hasHtmlRender ? (htmlRender.trim() || undefined) : undefined,
          id: courseId,
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
          thumbnail: thumbnail ?? '',
          thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
          title: title.trim(),
          valueIds: selectedValueIds,
        });

        initialSnapshotRef.current = currentSnapshot;
        setSnapshotVersion((prev) => prev + 1);
      }

      if (curriculumIsDirty && curriculumSaveFnRef.current) {
        await curriculumSaveFnRef.current();
      }

      if (generalHasChanges || curriculumIsDirty) {
        toast.success('Đã lưu thay đổi khóa học thành công');
      }
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể lưu thay đổi'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa khóa học"
      subtitle="Cập nhật thông tin khóa học, lộ trình học và danh sách học viên."
      backHref="/admin/courses"
      isLoading={courseData === undefined}
      notFound={courseData === null}
      notFoundMessage="Không tìm thấy khóa học yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      saveLabel={curriculumIsDirty && !generalHasChanges ? 'Lưu lộ trình' : 'Lưu thay đổi'}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel={curriculumIsDirty && !generalHasChanges ? 'Lưu lộ trình' : 'Lưu thay đổi'}
          onCancel={() => router.push('/admin/courses')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          onViewWeb={slug ? () => window.open(`/${selectedCategorySlug || 'khoa-hoc'}/${slug}`, '_blank') : undefined}
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
      extraHeaderAction={
        slug ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => window.open(`/${selectedCategorySlug || 'khoa-hoc'}/${slug}`, '_blank')}
          >
            <ExternalLink size={13} /> Xem trên web
          </Button>
        ) : null
      }
    >
      <QuickCreateCourseCategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCreated={(id) => setCategoryId(id)}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={cn(
              "px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors",
              activeTab === 'general'
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            Thông tin chung
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={cn(
              "px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === 'curriculum'
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            Lộ trình học
            {curriculumIsDirty && (
              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={cn(
              "px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors",
              activeTab === 'students'
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            Học viên
          </button>
        </div>

        {/* Tab General */}
        <div className={activeTab === 'general' ? 'space-y-6' : 'hidden'}>
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
                    categorySlug={selectedCategorySlug || 'khoa-hoc'}
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
        </div>

        {/* Tab Curriculum */}
        <div className={activeTab === 'curriculum' ? '' : 'hidden'}>
          <CourseCurriculumEditor
            courseId={courseId}
            onDirtyChange={handleCurriculumDirtyChange}
            onSaveRef={curriculumSaveFnRef}
          />
        </div>

        {/* Tab Students */}
        <div className={activeTab === 'students' ? '' : 'hidden'}>
          <CourseStudentsPanel courseId={courseId} />
        </div>
      </form>
    </AdminFormPageWrapper>
  );
}
