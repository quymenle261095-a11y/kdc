'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  cn,
} from '@/app/admin/components/ui';
import { LexicalEditor } from '@/app/admin/components/LexicalEditor';
import { AdminSeoMetaCard } from '@/app/admin/components/FormUtilities';
import { IA_SETTINGS_KEYS } from '@/lib/ia/settings';
import { TRUST_PAGE_SLOTS, type TrustPageKey } from '@/lib/ia/trust-pages';
import { HomeComponentStickyFooter } from '@/app/admin/home-components/_shared/components/HomeComponentStickyFooter';

type PageFormState = {
  content: string;
  excerpt: string;
  metaDescription: string;
  metaTitle: string;
  renderType: 'content' | 'markdown' | 'html';
  status: 'Published' | 'Draft';
  title: string;
};

type PreviewSlot = {
  action: 'disabled' | 'mapped' | 'suggested' | 'draft';
  enabled: boolean;
  key: string;
  label: string;
  postStatus: string | null;
  postTitle: string | null;
  slug: string;
};

const mapStatusBadge = (status?: string | null) => {
  if (status === 'Published') {
    return { label: 'Hiện', variant: 'success' as const };
  }
  if (status === 'Draft') {
    return { label: 'Ẩn (Nháp)', variant: 'warning' as const };
  }
  return { label: 'Chưa tạo', variant: 'outline' as const };
};

const actionBadge = (action: PreviewSlot['action']) => {
  switch (action) {
    case 'mapped':
      return { label: 'Đã có trang', variant: 'success' as const };
    case 'suggested':
    case 'draft':
      return { label: 'Tạo nội dung mẫu', variant: 'warning' as const };
    default:
      return { label: 'Bỏ qua (Tắt)', variant: 'outline' as const };
  }
};

export default function TrustPagesAdminPage() {
  const [activeSlotKey, setActiveSlotKey] = useState<TrustPageKey>('about');
  const [pageToggles, setPageToggles] = useState<Record<string, boolean>>({});
  const [pageForms, setPageForms] = useState<Record<TrustPageKey, PageFormState>>({
    about: { content: '', excerpt: '', metaDescription: '', metaTitle: '', renderType: 'content', status: 'Published', title: 'Về chúng tôi' },
    faq: { content: '', excerpt: '', metaDescription: '', metaTitle: '', renderType: 'content', status: 'Published', title: 'Câu hỏi thường gặp' },
    payment: { content: '', excerpt: '', metaDescription: '', metaTitle: '', renderType: 'content', status: 'Published', title: 'Chính sách thanh toán' },
    privacy: { content: '', excerpt: '', metaDescription: '', metaTitle: '', renderType: 'content', status: 'Published', title: 'Chính sách bảo mật' },
    returnPolicy: { content: '', excerpt: '', metaDescription: '', metaTitle: '', renderType: 'content', status: 'Published', title: 'Chính sách đổi trả' },
    shipping: { content: '', excerpt: '', metaDescription: '', metaTitle: '', renderType: 'content', status: 'Published', title: 'Chính sách vận chuyển' },
    terms: { content: '', excerpt: '', metaDescription: '', metaTitle: '', renderType: 'content', status: 'Published', title: 'Điều khoản sử dụng' },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [pendingAutoGenerateMode, setPendingAutoGenerateMode] = useState<'apply' | 'overwrite'>('apply');
  const [publishStatus, setPublishStatus] = useState<'Draft' | 'Published'>('Published');

  const settings = useQuery(api.settings.getMultiple, { keys: [...IA_SETTINGS_KEYS] });
  const pages = useQuery(api.pages.listAll, {});
  const trustPagesFeature = useQuery(api.admin.modules.getModuleFeature, { featureKey: 'enableTrustPages', moduleKey: 'settings' });
  const autoGenerateFeature = useQuery(api.admin.modules.getModuleFeature, { featureKey: 'enableTrustPagesAutoGenerate', moduleKey: 'settings' });

  const canUseTrustPages = trustPagesFeature?.enabled ?? true;
  const canAutoGenerate = canUseTrustPages && (autoGenerateFeature?.enabled ?? false);

  const autoGeneratePreview = useQuery(api.trustPages.previewAutoGenerate, showPreview && canAutoGenerate ? {} : 'skip');
  const saveSettings = useMutation(api.settings.setMultiple);
  const upsertPage = useMutation(api.pages.upsertByKey);
  const applyAutoGenerate = useMutation(api.trustPages.applyAutoGenerate);

  // Sync settings and pages to local state
  useEffect(() => {
    if (!settings) {return;}
    const nextToggles: Record<string, boolean> = {};
    TRUST_PAGE_SLOTS.forEach((slot) => {
      const toggleValue = settings[slot.iaKey];
      nextToggles[slot.iaKey] = typeof toggleValue === 'boolean' ? toggleValue : true;
    });
    setPageToggles(nextToggles);
  }, [settings]);

  useEffect(() => {
    if (!pages) {return;}
    const pageMap = new Map(pages.map((p) => [p.key, p]));
    setPageForms((prev) => {
      const next = { ...prev };
      TRUST_PAGE_SLOTS.forEach((slot) => {
        const page = pageMap.get(slot.key);
        if (page) {
          next[slot.key] = {
            content: page.content ?? '',
            excerpt: page.excerpt ?? '',
            metaDescription: page.metaDescription ?? '',
            metaTitle: page.metaTitle ?? '',
            renderType: page.renderType ?? 'content',
            status: page.status ?? 'Published',
            title: page.title || slot.defaultTitle,
          };
        } else if (!next[slot.key].content) {
          next[slot.key] = {
            content: '',
            excerpt: '',
            metaDescription: '',
            metaTitle: '',
            renderType: 'content',
            status: 'Published',
            title: slot.defaultTitle,
          };
        }
      });
      return next;
    });
  }, [pages]);

  const activeSlot = useMemo(
    () => TRUST_PAGE_SLOTS.find((s) => s.key === activeSlotKey) ?? TRUST_PAGE_SLOTS[0],
    [activeSlotKey]
  );

  const activeForm = pageForms[activeSlot.key];

  const updateActiveForm = (patch: Partial<PageFormState>) => {
    setPageForms((prev) => ({
      ...prev,
      [activeSlot.key]: {
        ...prev[activeSlot.key],
        ...patch,
      },
    }));
  };

  const pagesMap = useMemo(() => {
    if (!pages) {return new Map();}
    return new Map(pages.map((p) => [p.key, p]));
  }, [pages]);

  // Track if any page form or toggle has changes
  const hasChanges = useMemo(() => {
    if (!settings || !pages) {return false;}

    // Check toggles
    const togglesChanged = TRUST_PAGE_SLOTS.some((slot) => {
      const current = typeof settings[slot.iaKey] === 'boolean' ? settings[slot.iaKey] : true;
      return current !== (pageToggles[slot.iaKey] ?? true);
    });
    if (togglesChanged) {return true;}

    // Check forms
    const formsChanged = TRUST_PAGE_SLOTS.some((slot) => {
      const dbPage = pagesMap.get(slot.key);
      const form = pageForms[slot.key];
      if (!dbPage) {
        return Boolean(form.content.trim() || form.title !== slot.defaultTitle);
      }
      return (
        form.title !== (dbPage.title || slot.defaultTitle) ||
        form.content !== (dbPage.content ?? '') ||
        form.excerpt !== (dbPage.excerpt ?? '') ||
        form.metaTitle !== (dbPage.metaTitle ?? '') ||
        form.metaDescription !== (dbPage.metaDescription ?? '') ||
        form.status !== dbPage.status
      );
    });

    return formsChanged;
  }, [pageForms, pageToggles, pages, pagesMap, settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // 1. Save toggles
      await saveSettings({
        settings: TRUST_PAGE_SLOTS.map((slot) => ({
          group: 'ia',
          key: slot.iaKey,
          value: pageToggles[slot.iaKey] ?? true,
        })),
      });

      // 2. Save all pages that have content or exist in DB
      for (const slot of TRUST_PAGE_SLOTS) {
        const form = pageForms[slot.key];
        const dbPage = pagesMap.get(slot.key);
        if (form.content.trim() || dbPage) {
          await upsertPage({
            content: form.content,
            excerpt: form.excerpt || undefined,
            key: slot.key,
            metaDescription: form.metaDescription || undefined,
            metaTitle: form.metaTitle || undefined,
            renderType: form.renderType,
            slug: slot.slug,
            status: form.status,
            title: form.title || slot.defaultTitle,
          });
        }
      }

      toast.success('Đã lưu tất cả thay đổi trang tin cậy');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi lưu dữ liệu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEnableAllDisabled = () => {
    setPageToggles((prev) => {
      const next = { ...prev };
      TRUST_PAGE_SLOTS.forEach((slot) => {
        next[slot.iaKey] = true;
      });
      return next;
    });
  };

  const openPublishConfirm = (mode: 'apply' | 'overwrite') => {
    setPendingAutoGenerateMode(mode);
    setShowPublishConfirm(true);
  };

  const handleApplyAutoGenerate = async () => {
    setIsApplying(true);
    try {
      const overwrite = pendingAutoGenerateMode === 'overwrite';
      const result = await applyAutoGenerate({ overwrite, status: publishStatus });
      setShowPublishConfirm(false);
      setShowPreview(false);
      const { createdCount, disabledCount, keptCount } = result.summary;
      if (result.mode === 'overwrite') {
        toast.success(`Đã tạo/ghi đè ${createdCount} trang ${publishStatus === 'Published' ? 'đã xuất bản' : 'bản nháp'}${disabledCount > 0 ? `, bỏ qua ${disabledCount} mục đang tắt` : ''}.`);
      } else {
        toast.success(`Đã tạo ${createdCount} trang ${publishStatus === 'Published' ? 'đã xuất bản' : 'bản nháp'} mới${keptCount > 0 ? `, giữ ${keptCount} trang đã có` : ''}${disabledCount > 0 ? `, bỏ qua ${disabledCount} mục đang tắt` : ''}.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsApplying(false);
    }
  };

  const previewSlots = (autoGeneratePreview?.slots ?? []) as PreviewSlot[];

  if (!canUseTrustPages) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-16">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-base text-amber-800">Trang tin cậy đang tắt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-amber-700">
            <p>
              Tính năng Trang tin cậy đang bị tắt trong cấu hình hệ thống. Vui lòng bật lại trong mục Module Settings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Trang tin cậy</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Biên tập trực tiếp nội dung 7 trang thông tin & chính sách cố định của hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleEnableAllDisabled}>
            Bật tất cả mục đang tắt
          </Button>
          {canAutoGenerate && (
            <Button variant="accent" onClick={() => setShowPreview(true)}>
              Sinh tự động từ dữ liệu thực
            </Button>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
        {TRUST_PAGE_SLOTS.map((slot) => {
          const isActive = slot.key === activeSlot.key;
          const isEnabled = pageToggles[slot.iaKey] ?? true;
          const pageDoc = pagesMap.get(slot.key);
          const badge = mapStatusBadge(pageDoc?.status);

          return (
            <button
              key={slot.key}
              type="button"
              onClick={() => setActiveSlotKey(slot.key)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-blue-600 text-white shadow-sm dark:bg-blue-500'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
              )}
            >
              <span>{slot.label}</span>
              {!isEnabled && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded', isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400')}>
                  Tắt
                </span>
              )}
              {isEnabled && pageDoc && (
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded', isActive ? 'bg-blue-700 text-white' : badge.variant === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300')}>
                  {badge.label}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active slot editor */}
      <div className="space-y-6">
        {/* General Info Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{activeSlot.label}</span>
                  <span className="text-xs font-mono text-slate-400">({activeSlot.slug})</span>
                </CardTitle>
              </div>
              <div className="flex items-center gap-3">
                <Link href={activeSlot.slug} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="outline" size="sm" className="h-8 text-xs">
                    Mở trang public ↗
                  </Button>
                </Link>
                <div className="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700">
                  <Label htmlFor={`toggle-${activeSlot.key}`} className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    Bật route công khai
                  </Label>
                  <Checkbox
                    id={`toggle-${activeSlot.key}`}
                    checked={pageToggles[activeSlot.iaKey] ?? true}
                    onCheckedChange={(value) =>
                      setPageToggles((prev) => ({ ...prev, [activeSlot.iaKey]: Boolean(value) }))
                    }
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>Tiêu đề hiển thị</Label>
                <Input
                  value={activeForm.title}
                  onChange={(e) => updateActiveForm({ title: e.target.value })}
                  placeholder={activeSlot.defaultTitle}
                />
              </div>

              <div className="space-y-2">
                <Label>Trạng thái xuất bản</Label>
                <select
                  value={activeForm.status}
                  onChange={(e) => updateActiveForm({ status: e.target.value as 'Published' | 'Draft' })}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  <option value="Published">Hiện (Đã xuất bản)</option>
                  <option value="Draft">Ẩn (Bản nháp)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tóm tắt ngắn (Excerpt)</Label>
              <Textarea
                rows={2}
                value={activeForm.excerpt}
                onChange={(e) => updateActiveForm({ excerpt: e.target.value })}
                placeholder="Mô tả ngắn gọn về nội dung trang này..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Content Editor Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Nội dung chi tiết</CardTitle>
          </CardHeader>
          <CardContent>
            <LexicalEditor
              initialContent={activeForm.content}
              onChange={(val) => updateActiveForm({ content: val })}
              resetKey={activeSlot.key}
            />
          </CardContent>
        </Card>

        {/* SEO Meta Card */}
        <AdminSeoMetaCard
          metaTitle={activeForm.metaTitle}
          onMetaTitleChange={(val) => updateActiveForm({ metaTitle: val })}
          metaDescription={activeForm.metaDescription}
          onMetaDescriptionChange={(val) => updateActiveForm({ metaDescription: val })}
          fallbackTitle={activeForm.title || activeSlot.defaultTitle}
          fallbackDescription={activeForm.excerpt}
          slug={activeSlot.slug.replace(/^\//, '')}
        />
      </div>

      {/* Auto-generate Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Xem trước sinh tự động Trang tin cậy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>
              Hệ thống sẽ dùng thông tin cấu hình website (tên, hotline, email, địa chỉ) để tạo nội dung mẫu chuẩn pháp lý cho 7 trang tin cậy.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {autoGeneratePreview === undefined && (
                <div className="text-xs text-slate-500">Đang tải xem trước...</div>
              )}
              {autoGeneratePreview && previewSlots.length === 0 && (
                <div className="text-xs text-slate-500">Chưa có dữ liệu xem trước.</div>
              )}
              {previewSlots.map((slot) => {
                const badge = actionBadge(slot.action);
                return (
                  <div
                    key={slot.key}
                    className="flex items-center justify-between gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800"
                  >
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-100">{slot.label}</div>
                      <div className="text-xs text-slate-500">{slot.slug}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {slot.postTitle ? <span className="text-xs text-slate-500">{slot.postTitle}</span> : null}
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Đóng
            </Button>
            <Button variant="outline" onClick={() => openPublishConfirm('overwrite')} disabled={isApplying}>
              Ghi đè tất cả
            </Button>
            <Button onClick={() => openPublishConfirm('apply')} disabled={isApplying}>
              Áp dụng (Chỉ tạo trang thiếu)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auto-generate Publish Confirm Dialog */}
      <Dialog open={showPublishConfirm} onOpenChange={setShowPublishConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {pendingAutoGenerateMode === 'overwrite' ? 'Xác nhận ghi đè Trust Pages' : 'Xác nhận áp dụng Trust Pages'}
            </DialogTitle>
            <DialogDescription>
              Chọn trạng thái xuất bản cho các trang được sinh trong lần {pendingAutoGenerateMode === 'overwrite' ? 'ghi đè' : 'áp dụng'} này.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700 cursor-pointer">
              <input
                type="radio"
                name="trust-page-publish-status"
                value="Published"
                checked={publishStatus === 'Published'}
                onChange={() => setPublishStatus('Published')}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Hiện (Published)</div>
                <div className="text-xs text-slate-500">Hiển thị các trang ngay sau khi sinh.</div>
              </div>
            </label>
            <label className="flex items-start gap-3 rounded-md border border-slate-200 p-3 text-sm dark:border-slate-700 cursor-pointer">
              <input
                type="radio"
                name="trust-page-publish-status"
                value="Draft"
                checked={publishStatus === 'Draft'}
                onChange={() => setPublishStatus('Draft')}
                className="mt-0.5"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">Ẩn (Draft)</div>
                <div className="text-xs text-slate-500">Lưu dưới dạng bản nháp để kiểm tra và chỉnh sửa trước khi xuất bản.</div>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishConfirm(false)} disabled={isApplying}>
              Hủy
            </Button>
            <Button onClick={() => { void handleApplyAutoGenerate(); }} disabled={isApplying}>
              {isApplying
                ? pendingAutoGenerateMode === 'overwrite' ? 'Đang ghi đè...' : 'Đang áp dụng...'
                : pendingAutoGenerateMode === 'overwrite' ? 'Xác nhận ghi đè' : 'Xác nhận áp dụng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sticky footer for saving changes */}
      <HomeComponentStickyFooter
        isSubmitting={isSaving}
        hasChanges={hasChanges}
        onClickSave={handleSave}
        submitType="button"
        submitLabel="Lưu thay đổi"
      />
    </div>
  );
}
