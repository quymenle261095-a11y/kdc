'use client';

import React, { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Briefcase, ExternalLink, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from '../../../components/ui';
import { LexicalEditor } from '../../../components/LexicalEditor';
import { ImageUploader } from '../../../components/ImageUploader';
import { QuickCreateServiceCategoryModal } from '../../../components/QuickCreateServiceCategoryModal';
import { stripHtml, truncateText } from '@/lib/seo';
import { normalizeRichText } from '@/app/admin/lib/normalize-rich-text';

const MODULE_KEY = 'services';

export default function ServiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const serviceData = useQuery(api.services.getById, { id: id as Id<"services"> });
  const categoriesData = useQuery(api.serviceCategories.listAll, {});
  const updateService = useMutation(api.services.update);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });

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
  const [thumbnailStorageId, setThumbnailStorageId] = useState<Id<'_storage'> | undefined>();
  const [categoryId, setCategoryId] = useState('');
  const [price, setPrice] = useState<number | undefined>();
  const [duration, setDuration] = useState('');
  const [featured, setFeatured] = useState(false);
  const [status, setStatus] = useState<'Draft' | 'Published' | 'Archived'>('Draft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editorResetKey] = useState(0);
  const [snapshotVersion, setSnapshotVersion] = useState(0);
  const initialSnapshotRef = useRef<{
    categoryId: string;
    content: string;
    renderType: 'content' | 'markdown' | 'html';
    markdownRender: string;
    htmlRender: string;
    duration: string;
    excerpt: string;
    featured: boolean;
    metaDescription: string;
    metaTitle: string;
    price: number | null;
    slug: string;
    status: 'Draft' | 'Published' | 'Archived';
    thumbnail: string;
    thumbnailStorageId?: Id<'_storage'> | null;
    title: string;
  } | null>(null);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const hasMarkdownRender = enabledFields.has('markdownRender');
  const hasHtmlRender = enabledFields.has('htmlRender');
  const showAdvancedRenderCard = hasMarkdownRender || hasHtmlRender;

  const normalizedContent = useMemo(() => normalizeRichText(content), [content]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    const generatedSlug = val.toLowerCase()
      .normalize("NFD").replaceAll(/[\u0300-\u036F]/g, "")
      .replaceAll(/[đĐ]/g, "d")
      .replaceAll(/[^a-z0-9\s]/g, '')
      .replaceAll(/\s+/g, '-');
    setSlug(generatedSlug);
  };

  const currentSnapshot = useMemo(() => ({
    categoryId,
    content: normalizedContent,
    renderType,
    markdownRender: markdownRender.trim(),
    htmlRender: htmlRender.trim(),
    duration: duration.trim(),
    excerpt: excerpt.trim(),
    featured,
    metaDescription: metaDescription.trim(),
    metaTitle: metaTitle.trim(),
    price: price ?? null,
    slug: slug.trim(),
    status,
    thumbnail: thumbnail ?? '',
    thumbnailStorageId,
    title: title.trim(),
  }), [categoryId, normalizedContent, renderType, markdownRender, htmlRender, duration, excerpt, featured, metaDescription, metaTitle, price, slug, status, thumbnail, thumbnailStorageId, title]);

  const hasChanges = useMemo(() => {
    if (!initialSnapshotRef.current) {return false;}
    return JSON.stringify(initialSnapshotRef.current) !== JSON.stringify(currentSnapshot);
  }, [currentSnapshot, snapshotVersion]);

  useEffect(() => {
    if (saveStatus === 'saving') {return;}
    if (hasChanges && saveStatus === 'saved') {
      setSaveStatus('idle');
      return;
    }
    if (!hasChanges && saveStatus === 'idle') {
      setSaveStatus('saved');
    }
  }, [hasChanges, saveStatus]);

  useEffect(() => {
    if (serviceData) {
      setTitle(serviceData.title);
      setSlug(serviceData.slug);
      setContent(serviceData.content);
      const nextRenderType = serviceData.renderType ?? 'content';
      const allowedRenderTypes = new Set<'content' | 'markdown' | 'html'>(['content']);
      if (hasMarkdownRender) {allowedRenderTypes.add('markdown');}
      if (hasHtmlRender) {allowedRenderTypes.add('html');}
      setRenderType(allowedRenderTypes.has(nextRenderType) ? nextRenderType : 'content');
      setMarkdownRender(serviceData.markdownRender ?? '');
      setHtmlRender(serviceData.htmlRender ?? '');
      setExcerpt(serviceData.excerpt ?? '');
      setMetaTitle(serviceData.metaTitle ?? '');
      setMetaDescription(serviceData.metaDescription ?? '');
      setThumbnail(serviceData.thumbnail);
      setThumbnailStorageId((serviceData as { thumbnailStorageId?: Id<'_storage'> }).thumbnailStorageId);
      setCategoryId(serviceData.categoryId);
      setPrice(serviceData.price);
      setDuration(serviceData.duration ?? '');
      setFeatured(serviceData.featured ?? false);
      setStatus(serviceData.status);
      initialSnapshotRef.current = {
        categoryId: serviceData.categoryId,
        content: normalizeRichText(serviceData.content),
        renderType: serviceData.renderType ?? 'content',
        markdownRender: (serviceData.markdownRender ?? '').trim(),
        htmlRender: (serviceData.htmlRender ?? '').trim(),
        duration: (serviceData.duration ?? '').trim(),
        excerpt: (serviceData.excerpt ?? '').trim(),
        featured: serviceData.featured ?? false,
        metaDescription: (serviceData.metaDescription ?? '').trim(),
        metaTitle: (serviceData.metaTitle ?? '').trim(),
        price: serviceData.price ?? null,
        slug: serviceData.slug.trim(),
        status: serviceData.status,
        thumbnail: serviceData.thumbnail ?? '',
        thumbnailStorageId: (serviceData as { thumbnailStorageId?: Id<'_storage'> }).thumbnailStorageId,
        title: serviceData.title.trim(),
      };
      setSnapshotVersion((prev) => prev + 1);
    }
  }, [serviceData, hasMarkdownRender, hasHtmlRender]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {return;}

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
      await updateService({
        categoryId: categoryId as Id<"serviceCategories">,
        content,
        renderType,
        markdownRender: markdownRender.trim() || undefined,
        htmlRender: htmlRender.trim() || undefined,
        duration: duration.trim() || undefined,
        excerpt: excerpt.trim() || undefined,
        featured,
        id: id as Id<"services">,
        metaDescription: enabledFields.has('metaDescription')
          ? (resolvedMetaDescriptionValue || undefined)
          : undefined,
        metaTitle: enabledFields.has('metaTitle')
          ? (resolvedMetaTitleValue || undefined)
          : undefined,
        price,
        slug: slug.trim(),
        status,
        thumbnail,
        thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
        title: title.trim(),
      });
      const persistedSnapshot = {
        ...currentSnapshot,
        content: normalizeRichText(content),
        renderType,
        markdownRender: markdownRender.trim(),
        htmlRender: htmlRender.trim(),
        duration: duration.trim(),
        excerpt: excerpt.trim(),
        metaDescription: resolvedMetaDescriptionValue,
        metaTitle: resolvedMetaTitleValue,
        thumbnail: thumbnail ?? '',
        thumbnailStorageId: thumbnail ? (thumbnailStorageId ?? null) : null,
      };
      if (enabledFields.has('metaTitle')) {
        setMetaTitle(resolvedMetaTitleValue);
      }
      if (enabledFields.has('metaDescription')) {
        setMetaDescription(resolvedMetaDescriptionValue);
      }
      initialSnapshotRef.current = persistedSnapshot;
      setSnapshotVersion((prev) => prev + 1);
      setSaveStatus('saved');
      toast.success("Cập nhật dịch vụ thành công");
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, "Không thể cập nhật dịch vụ"));
      setSaveStatus('idle');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (serviceData === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-teal-500" />
      </div>
    );
  }

  if (serviceData === null) {
    return <div className="text-center py-8 text-slate-500">Không tìm thấy dịch vụ</div>;
  }

  return (
    <>
    <QuickCreateServiceCategoryModal 
      isOpen={showCategoryModal} 
      onClose={() =>{  setShowCategoryModal(false); }} 
      onCreated={(id) =>{  setCategoryId(id); }}
    />
    <form onSubmit={handleSubmit} className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-lg">
            <Briefcase className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Chỉnh sửa dịch vụ</h1>
             <div className="text-sm text-slate-500 mt-1">Cập nhật thông tin dịch vụ</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.open(`/services/${slug}`, '_blank')}
            className="gap-2"
          >
            <ExternalLink size={16} />
            Xem trên web
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Tiêu đề <span className="text-red-500">*</span></Label>
                <Input value={title} onChange={handleTitleChange} required />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) =>{  setSlug(e.target.value); }} className="font-mono text-sm" />
              </div>
              {enabledFields.has('excerpt') && (
                <div className="space-y-2">
                  <Label>Mô tả ngắn</Label>
                  <Input value={excerpt} onChange={(e) =>{  setExcerpt(e.target.value); }} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Nội dung</Label>
                <LexicalEditor onChange={setContent} initialContent={content} resetKey={editorResetKey} />
              </div>
            </CardContent>
          </Card>

          {showAdvancedRenderCard && (
            <Card>
              <CardHeader><CardTitle className="text-base">Render nâng cao</CardTitle></CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>
          )}

          {(enabledFields.has('metaTitle') || enabledFields.has('metaDescription')) && (
            <Card>
              <CardHeader><CardTitle className="text-base">SEO</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {enabledFields.has('metaTitle') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta Title</Label>
                      <span className={`text-xs ${metaTitle.length > 60 ? 'text-red-500' : 'text-slate-400'}`}>
                        {metaTitle.length}/60
                      </span>
                    </div>
                    <Input
                      value={metaTitle}
                      onChange={(e) =>{  setMetaTitle(e.target.value); }}
                      placeholder="Tiêu đề hiển thị trên Google"
                    />
                  </div>
                )}
                {enabledFields.has('metaDescription') && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Meta Description</Label>
                      <span className={`text-xs ${metaDescription.length > 160 ? 'text-red-500' : 'text-slate-400'}`}>
                        {metaDescription.length}/160
                      </span>
                    </div>
                    <textarea
                      value={metaDescription}
                      onChange={(e) =>{  setMetaDescription(e.target.value); }}
                      className="w-full min-h-[90px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                      placeholder="Mô tả ngắn cho kết quả tìm kiếm"
                    />
                  </div>
                )}
                <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-sm">
                  <div className="text-blue-600 font-medium truncate">
                    {metaTitle.trim() || title || 'Tên dịch vụ'}
                  </div>
                  <div className="text-emerald-600 text-xs">
                    /services/{slug || 'dich-vu'}
                  </div>
                  <div className="text-slate-600 text-xs mt-1 line-clamp-2">
                    {metaDescription.trim() || excerpt || 'Mô tả ngắn sẽ hiển thị tại đây.'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Xuất bản</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <select 
                  value={status}
                  onChange={(e) =>{  setStatus(e.target.value as 'Draft' | 'Published' | 'Archived'); }}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="Draft">Bản nháp</option>
                  <option value="Published">Đã xuất bản</option>
                  <option value="Archived">Lưu trữ</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <div className="flex gap-2">
                  <select 
                    value={categoryId}
                    onChange={(e) =>{  setCategoryId(e.target.value); }}
                    className="flex-1 h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    {categoriesData?.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={() =>{  setShowCategoryModal(true); }}
                    title="Tạo danh mục mới"
                  >
                    <Plus size={16} />
                  </Button>
                </div>
              </div>
              {enabledFields.has('featured') && (
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="featured" 
                    checked={featured} 
                    onChange={(e) =>{  setFeatured(e.target.checked); }}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <Label htmlFor="featured" className="cursor-pointer">Dịch vụ nổi bật</Label>
                </div>
              )}
            </CardContent>
          </Card>

          {(enabledFields.has('price') || enabledFields.has('duration')) && (
            <Card>
              <CardHeader><CardTitle className="text-base">Thông tin dịch vụ</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {enabledFields.has('price') && (
                  <div className="space-y-2">
                    <Label>Giá dịch vụ (VND)</Label>
                    <Input 
                      type="number" 
                      value={price ?? ''} 
                      onChange={(e) =>{  setPrice(e.target.value ? Number(e.target.value) : undefined); }} 
                      placeholder="0"
                    />
                  </div>
                )}
                {enabledFields.has('duration') && (
                  <div className="space-y-2">
                    <Label>Thời gian thực hiện</Label>
                    <Input 
                      value={duration} 
                      onChange={(e) =>{  setDuration(e.target.value); }} 
                      placeholder="VD: 2-3 tuần"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader><CardTitle className="text-base">Ảnh đại diện</CardTitle></CardHeader>
            <CardContent>
              <ImageUploader
                value={thumbnail}
                storageId={thumbnailStorageId}
                onChange={(url, storageId) => {
                  setThumbnail(url);
                  setThumbnailStorageId(storageId);
                }}
                folder="services"
                naming={{ entityName: slug.trim() || 'service', style: 'slug-index', index: 1 }}
                deleteMode="defer"
                aspectRatio="video"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 lg:left-[280px] right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center z-10">
        <Button type="button" variant="ghost" onClick={() =>{  router.push('/admin/services'); }}>Hủy bỏ</Button>
        <Button
          type="submit"
          variant="accent"
          disabled={isSubmitting || !hasChanges}
          className={!hasChanges && !isSubmitting
            ? 'bg-slate-300 hover:bg-slate-300 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-800 dark:text-slate-400'
            : 'bg-teal-600 hover:bg-teal-500'}
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin mr-2" />}
          {isSubmitting || saveStatus === 'saving'
            ? 'Đang lưu...'
            : (saveStatus === 'saved' && !hasChanges ? 'Đã lưu' : 'Lưu thay đổi')}
        </Button>
      </div>
    </form>
    </>
  );
}
