'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, ChevronDown, Copy, ExternalLink, Globe, Pencil, Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Input, Label, Skeleton, cn } from './ui';
import { AdminStickyFooter, type AdminStickyFooterProps } from './AdminStickyFooter';
import { useSetAdminBreadcrumb } from '../context/AdminBreadcrumbContext';
import { CopyTextButton } from './CopyTextButton';
import { ImageUploader } from './ImageUploader';
import { CategoryTagsInput } from './AdditionalCategoriesSelect';
import { QuickCreateCategoryModal } from './QuickCreateCategoryModal';

export {
  AdminStickyFooter,
  type AdminStickyFooterProps,
  useSetAdminBreadcrumb,
  CopyTextButton,
  QuickCreateCategoryModal,
};

/**
 * Props cho AdminTitleInput
 */
export interface AdminTitleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  required?: boolean;
  copyLabel?: string;
  extraAction?: React.ReactNode;
  wrapperClassName?: string;
}

/**
 * Component nhập Tiêu đề / Tên chuẩn cho Form Admin (hỗ trợ nút trợ lý extraAction và nút Copy nằm ngang hàng)
 */
export function AdminTitleInput({
  value,
  onChange,
  label = 'Tiêu đề',
  required = true,
  copyLabel = 'tiêu đề',
  extraAction,
  wrapperClassName,
  className,
  placeholder = 'Nhập tiêu đề...',
  ...props
}: AdminTitleInputProps) {
  return (
    <div className={cn("space-y-2", wrapperClassName)}>
      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex gap-2 items-center">
        <Input
          {...props}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className={cn("flex-1 text-sm font-medium h-10 bg-white dark:bg-slate-800", className)}
        />
        {extraAction && <div className="shrink-0">{extraAction}</div>}
        <CopyTextButton
          value={value}
          label={copyLabel}
          className="shrink-0 h-10 w-10"
        />
      </div>
    </div>
  );
}

/**
 * Props cho AdminDescriptionInput
 */
export interface AdminDescriptionInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  label?: string;
  required?: boolean;
  copyLabel?: string;
  wrapperClassName?: string;
}

/**
 * Component nhập Mô tả chuẩn cho Form Admin
 */
export function AdminDescriptionInput({
  value,
  onChange,
  label = 'Mô tả',
  required = false,
  copyLabel = 'mô tả',
  wrapperClassName,
  className,
  placeholder = 'Nhập mô tả...',
  rows = 3,
  ...props
}: AdminDescriptionInputProps) {
  return (
    <div className={cn("space-y-2", wrapperClassName)}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
        {value && (
          <CopyTextButton
            value={value}
            label={copyLabel}
            className="h-6 w-6"
          />
        )}
      </div>
      <textarea
        {...props}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        className={cn(
          "w-full rounded-md border border-slate-200 bg-white p-3 text-sm font-medium leading-relaxed dark:border-slate-800 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
          className
        )}
      />
    </div>
  );
}

/**
 * Props cho AdminSlugInput
 */
export interface AdminSlugInputProps {
  slug: string;
  onChange: (value: string) => void;
  baseUrl?: string;
  categorySlug?: string;
  label?: string;
  className?: string;
}

/**
 * Component hiển thị & chỉnh sửa Slug chuẩn quốc tế kèm live preview link
 */
export function AdminSlugInput({
  slug,
  onChange,
  baseUrl,
  categorySlug,
  className,
}: AdminSlugInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const domain = baseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const pathPrefix = categorySlug ? `/${categorySlug}/` : '/';
  const fullUrl = `${domain}${pathPrefix}${slug}`;

  const handleCopy = () => {
    if (!slug) {return;}
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    toast.success('Đã chép đường dẫn bài viết!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Live Preview Box */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 text-xs font-mono overflow-hidden">
        <div className="flex items-center gap-1.5 min-w-0 truncate text-slate-500 dark:text-slate-400">
          <Globe size={14} className="text-blue-500 shrink-0" />
          <span className="truncate">
            <span className="text-slate-400 dark:text-slate-500">{domain}{pathPrefix}</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100 bg-blue-50 dark:bg-blue-950/60 px-1 py-0.5 rounded text-blue-700 dark:text-blue-300">
              {slug || 'url-bai-viet'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn("h-7 px-2 text-xs", isEditing ? "text-blue-600 bg-blue-100/70 dark:bg-blue-900/50" : "text-slate-600 dark:text-slate-400 hover:text-blue-600")}
            onClick={() => setIsEditing(!isEditing)}
            title={isEditing ? 'Thu gọn chỉnh sửa' : 'Chỉnh sửa slug'}
          >
            <Pencil size={13} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            onClick={handleCopy}
            disabled={!slug}
            title="Sao chép đường dẫn"
          >
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
          </Button>
          {slug && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600"
              onClick={() => window.open(fullUrl, '_blank')}
              title="Xem trang ngoài website"
            >
              <ExternalLink size={13} />
            </Button>
          )}
        </div>
      </div>

      {/* Inline Input khi bấm Chỉnh sửa (Nút cây bút) */}
      {isEditing && (
        <div className="pt-1 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
          <Input
            value={slug}
            onChange={(e) => onChange(generateSlugFromTitle(e.target.value))}
            placeholder="nhap-slug-bai-viet"
            className="font-mono text-xs h-9 bg-white dark:bg-slate-800"
          />
          <p className="text-[11px] text-slate-400">
            Tự động tối ưu hóa URL không dấu, phân cách bằng dấu gạch ngang (-).
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Hàm sinh slug chuẩn Tiếng Việt (chuyển chữ có dấu thành không dấu, đ/Đ -> d, v.v.)
 */
export function generateSlugFromTitle(value: string): string {
  if (!value) {return '';}
  return value
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036F]/g, '')
    .replaceAll(/[đĐ]/g, 'd')
    .replaceAll(/[^a-z0-9\s]/g, '')
    .replaceAll(/\s+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');
}

/**
 * Props cho AdminSeoMetaCard
 */
export interface AdminSeoMetaCardProps {
  metaTitle: string;
  onMetaTitleChange: (value: string) => void;
  metaDescription: string;
  onMetaDescriptionChange: (value: string) => void;
  fallbackTitle?: string;
  fallbackDescription?: string;
  slug?: string;
  categorySlug?: string;
  thumbnailUrl?: string;
  baseUrl?: string;
  showTitleInput?: boolean;
  showDescriptionInput?: boolean;
  className?: string;
}

/**
 * Component quản lý & xem trước SEO & Thẻ Meta chuẩn quốc tế cho mọi trang Create/Edit
 */
export function AdminSeoMetaCard({
  metaTitle,
  onMetaTitleChange,
  metaDescription,
  onMetaDescriptionChange,
  fallbackTitle = '',
  fallbackDescription = '',
  slug = '',
  categorySlug = '',
  baseUrl,
  showTitleInput = true,
  showDescriptionInput = true,
  className,
}: AdminSeoMetaCardProps) {
  const [isCustomizing, setIsCustomizing] = useState(false);

  const domain = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://website.com');
  const path = categorySlug ? `/${categorySlug}/${slug || 'bai-viet'}` : `/${slug || 'bai-viet'}`;
  const displayUrl = `${domain}${path}`;

  const displayTitle = metaTitle.trim() || fallbackTitle.trim() || 'Tiêu đề hiển thị kết quả tìm kiếm Google';
  const displayDescription = metaDescription.trim() || fallbackDescription.trim() || 'Mô tả ngắn hiển thị bên dưới tiêu đề trên trang kết quả tìm kiếm Google...';

  const titleLen = metaTitle.length;
  const descLen = metaDescription.length;

  const handleAutoFill = () => {
    if (fallbackTitle && !metaTitle) {
      onMetaTitleChange(fallbackTitle);
    }
    if (fallbackDescription && !metaDescription) {
      onMetaDescriptionChange(fallbackDescription);
    }
    toast.success('Đã tự động điền thẻ Meta từ nội dung!');
  };

  return (
    <AdminFormCard
      title="Xem trước kết quả tìm kiếm"
      extra={
        <div className="flex items-center gap-3">
          {isCustomizing && (fallbackTitle || fallbackDescription) && (
            <button
              type="button"
              onClick={handleAutoFill}
              className="text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
            >
              Tự điền
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsCustomizing((prev) => !prev)}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            {isCustomizing ? 'Ẩn tùy chỉnh SEO' : 'Tùy chỉnh SEO'}
          </button>
        </div>
      }
      className={className}
    >
      <div className="space-y-4">
        {/* Live Snippet Preview Box (Sapo / Haravan style) */}
        <div className="space-y-1 py-1">
          <div className="text-[17px] font-medium text-[#1a0dab] dark:text-blue-400 leading-snug hover:underline cursor-pointer">
            {displayTitle}
          </div>
          <div className="text-[13px] text-[#006621] dark:text-emerald-400 break-all font-sans">
            {displayUrl}
          </div>
          <div className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
            {displayDescription}
          </div>
        </div>

        {/* Collapsible Form Inputs (Revealed when clicking "Tùy chỉnh SEO") */}
        {isCustomizing && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800 transition-all duration-200">
            {/* Meta Title Input */}
            {showTitleInput && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Meta Title (Tiêu đề trang SEO)
                  </Label>
                  <span className={cn(
                    "text-xs font-mono",
                    titleLen > 60 ? "text-red-500 font-semibold" : titleLen >= 30 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                  )}>
                    {titleLen}/60 ký tự
                  </span>
                </div>
                <Input
                  value={metaTitle}
                  onChange={(e) => onMetaTitleChange(e.target.value)}
                  placeholder={fallbackTitle || "Nhập tiêu đề SEO hiển thị trên Google..."}
                  className="text-sm h-10 bg-white dark:bg-slate-800"
                />
              </div>
            )}

            {/* Meta Description Input */}
            {showDescriptionInput && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Meta Description (Thẻ mô tả SEO)
                  </Label>
                  <span className={cn(
                    "text-xs font-mono",
                    descLen > 160 ? "text-red-500 font-semibold" : descLen >= 80 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                  )}>
                    {descLen}/160 ký tự
                  </span>
                </div>
                <textarea
                  value={metaDescription}
                  onChange={(e) => onMetaDescriptionChange(e.target.value)}
                  placeholder={fallbackDescription || "Nhập mô tả ngắn SEO hiển thị trên Google..."}
                  className="w-full min-h-[85px] text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-normal leading-relaxed resize-none"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AdminFormCard>
  );
}

/**
 * Props cho AdminFormHeader
 */
export interface AdminFormHeaderProps {
  /** Tiêu đề trang (ví dụ: "Chỉnh sửa bài viết" hoặc "Tạo bài viết mới") */
  title: string;
  /** Link quay lại trang danh sách (ví dụ: "/admin/posts") */
  backHref?: string;
  /** Nhãn cho nút quay lại (mặc định: "Danh sách") */
  backLabel?: string;
  /** Subtitle / Mô tả ngắn phía dưới tiêu đề */
  subtitle?: string;
  /** Badge trạng thái bài viết/thực thể (ví dụ: "Nháp", "Đã xuất bản") */
  statusBadge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';
  };
  /** Nút bấm hoặc thao tác bổ sung hiển thị ở bên phải header (AI Import, Xem trang public...) */
  actions?: React.ReactNode;
  extraAction?: React.ReactNode;
  className?: string;
}

/**
 * Header chuẩn mực cho các trang Create & Edit
 */
export function AdminFormHeader({
  title,
  backHref,
  backLabel = 'Quay lại',
  subtitle,
  statusBadge,
  actions,
  extraAction,
  className,
}: AdminFormHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 mb-3", className)}>
      {/* Góc trái: Nút Quay lại gọn gàng */}
      <div className="flex items-center gap-2 shrink-0">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            title={backLabel}
          >
            <ArrowLeft size={13} />
            <span>{backLabel}</span>
          </Link>
        )}
      </div>

      {/* Góc phải: Tiêu đề trang + Status Badge + Actions */}
      <div className="flex items-center gap-3 shrink-0 ml-auto flex-wrap justify-end">
        <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        {statusBadge && (
          <Badge
            variant={statusBadge.variant || 'outline'}
            className="font-medium text-xs px-2 py-0.5 rounded-full"
          >
            {statusBadge.label}
          </Badge>
        )}
        {subtitle && (
          <span className="hidden sm:inline text-xs text-slate-400 dark:text-slate-500 border-l border-slate-200 dark:border-slate-800 pl-3">
            {subtitle}
          </span>
        )}
        {actions || extraAction}
      </div>
    </div>
  );
}

/**
 * Grid Layout chính cho các trang Create & Edit
 */
export interface AdminFormLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminFormLayout({ children, className }: AdminFormLayoutProps) {
  return (
    <div className={cn("w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 -mt-3 space-y-3 pb-16", className)}>
      {children}
    </div>
  );
}

/**
 * Cấu trúc Grid 2 cột chính/phụ (Main Content + Sidebar)
 */
export function AdminFormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-5 items-start", className)}>
      {children}
    </div>
  );
}

/**
 * Container cho cột nội dung chính bên trái (8 cột trên Desktop)
 */
export function AdminFormMain({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("lg:col-span-8 space-y-4 min-w-0", className)}>
      {children}
    </div>
  );
}

/**
 * Container cho cột thông tin phụ bên phải (4 cột trên Desktop)
 */
export function AdminFormSidebar({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("lg:col-span-4 space-y-4 min-w-0 lg:sticky lg:top-20", className)}>
      {children}
    </div>
  );
}

/**
 * Card bao bọc từng phần dữ liệu trong Form
 */
export interface AdminFormCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  extra?: React.ReactNode;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function AdminFormCard({
  title,
  description,
  extra,
  tooltip,
  children,
  className,
  headerClassName,
  contentClassName,
}: AdminFormCardProps) {
  return (
    <Card className={cn("shadow-sm border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl relative", className)}>
      {(title || description || extra) && (
        <CardHeader className={cn("pb-4 border-b border-slate-100 dark:border-slate-800/60 flex flex-row items-center justify-between gap-4 space-y-0 relative z-20", headerClassName)}>
          <div className="space-y-1 min-w-0">
            {title && typeof title === 'string' ? (
              <div className="flex items-center gap-1.5">
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </CardTitle>
                {tooltip && (
                  <div className="relative group/card-tooltip cursor-help inline-flex items-center">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors">
                      ?
                    </span>
                    <div className="absolute -left-24 top-full mt-2 w-[290px] sm:w-[310px] p-3 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur text-white text-[11px] leading-relaxed font-normal rounded-xl shadow-2xl border border-white/10 opacity-0 invisible group-hover/card-tooltip:opacity-100 group-hover/card-tooltip:visible transition-all duration-200 z-50 pointer-events-none">
                      {tooltip}
                      <div className="absolute bottom-full left-[102px] w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-slate-900/95 dark:border-b-slate-800/95" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              title
            )}
            {description && typeof description === 'string' ? (
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </CardDescription>
            ) : (
              description
            )}
          </div>
          {extra && <div className="shrink-0">{extra}</div>}
        </CardHeader>
      )}
      <CardContent className={cn("p-6 space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Tiêu đề nhóm nhỏ bên trong một Card
 */
export function FormSectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-0.5 pb-2 border-b border-slate-100 dark:border-slate-800">
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h4>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
  );
}

/**
 * Skeleton Loader chuẩn hiển thị trong lúc chờ nạp dữ liệu form
 */
export function AdminFormSkeleton() {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex justify-between items-center pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </Card>
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-24 w-full" />
          </Card>
        </div>
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </Card>
          <Card className="p-6 space-y-4">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Props cho AdminFormPageWrapper
 */
export interface AdminFormPageWrapperProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  isLoading?: boolean;
  notFound?: boolean;
  notFoundMessage?: string;
  extraHeaderAction?: React.ReactNode;

  // Footer props
  onSave?: (e: React.FormEvent) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  isDirty?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  stickyFooter?: React.ReactNode;

  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper tổng quát bọc toàn bộ trang Create / Edit chuẩn mực:
 * Tự động xử lý Skeleton loading, Not Found state, Header + Nút back và Sticky Footer.
 */
export function AdminFormPageWrapper({
  title,
  subtitle,
  backHref,
  backLabel = 'Quay lại',
  isLoading = false,
  notFound = false,
  notFoundMessage = 'Không tìm thấy dữ liệu yêu cầu.',
  extraHeaderAction,
  onSave,
  onCancel,
  isSubmitting = false,
  isDirty = true,
  saveLabel = 'Lưu thay đổi',
  cancelLabel = 'Hủy bỏ',
  stickyFooter,
  children,
  className,
}: AdminFormPageWrapperProps) {
  if (isLoading) {
    return <AdminFormSkeleton />;
  }

  if (notFound) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Card className="max-w-md mx-auto p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{notFoundMessage}</h2>
          {backHref && (
            <Link href={backHref}>
              <Button variant="outline">{backLabel}</Button>
            </Link>
          )}
        </Card>
      </div>
    );
  }

  return (
    <AdminFormLayout className={className}>
      <AdminFormHeader
        title={title}
        subtitle={subtitle}
        backHref={backHref}
        backLabel={backLabel}
        extraAction={extraHeaderAction}
      />

      {children}

      {stickyFooter ? (
        stickyFooter
      ) : onSave ? (
        <AdminStickyFooter
          onClickSave={
            onSave
              ? () =>
                  onSave({
                    preventDefault: () => {},
                    stopPropagation: () => {},
                  } as React.FormEvent)
              : undefined
          }
          onCancel={onCancel}
          isSubmitting={isSubmitting}
          hasChanges={isDirty}
          submitLabel={saveLabel}
          cancelLabel={cancelLabel}
        />
      ) : null}
    </AdminFormLayout>
  );
}

/**
 * Hook quản lý trạng thái form: dirty tracking (hasChanges), phím tắt Ctrl+S, warning thoát trang chưa lưu, và hiển thị tên record trên Breadcrumb.
 */
export interface UseAdminFormOptions<T> {
  /** Snapshot ban đầu của form (khi vừa nạp xong từ DB) */
  initialSnapshot: T | null;
  /** Snapshot hiện tại của form (từ state form) */
  currentSnapshot: T;
  /** Tên của Record hiển thị trên thanh Breadcrumb thay cho ID */
  recordTitle?: string | null;
  /** Hàm callback thực hiện lưu (Submit) khi nhấn Ctrl+S hoặc bấm nút Save */
  onSave: () => void | Promise<void>;
  /** Bật/tắt tính năng cảnh báo thoát trang khi có thay đổi chưa lưu (Mặc định: true) */
  warnIfUnsaved?: boolean;
}

export function useAdminForm<T>({
  initialSnapshot,
  currentSnapshot,
  recordTitle,
  onSave,
  warnIfUnsaved = true,
}: UseAdminFormOptions<T>) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const onSaveRef = useRef(onSave);

  useSetAdminBreadcrumb(recordTitle);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Kiểm tra có thay đổi chưa lưu hay không (hasChanges / dirty)
  const hasChanges = useMemo(() => {
    if (!initialSnapshot) {return false;}
    return JSON.stringify(initialSnapshot) !== JSON.stringify(currentSnapshot);
  }, [initialSnapshot, currentSnapshot]);

  // Cập nhật trạng thái saveStatus dựa vào changes
  useEffect(() => {
    if (saveStatus === 'saving') {return;}
    if (hasChanges && saveStatus === 'saved') {
      setSaveStatus('idle');
    } else if (!hasChanges && saveStatus === 'idle') {
      setSaveStatus('saved');
    }
  }, [hasChanges, saveStatus]);

  // Bắt phím tắt Ctrl + S hoặc Cmd + S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        onSaveRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Cảnh báo người dùng khi reload/tắt tab mà chưa lưu
  useEffect(() => {
    if (!warnIfUnsaved || !hasChanges) {return;}
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, warnIfUnsaved]);

  return {
    hasChanges,
    saveStatus,
    setSaveStatus,
  };
}

/**
 * Props cho AdminPublishSidebarCard
 */
export interface AdminPublishSidebarCardProps {
  status: string;
  onStatusChange: (status: any) => void;
  statusOptions?: Array<{ value: string; label: string }>;

  // Category props
  categoryId?: string;
  onCategoryIdChange?: (id: string) => void;
  categories?: Array<{ _id: string; name: string }>;
  multiCategoryEnabled?: boolean;
  additionalCategoryIds?: string[];
  onAdditionalCategoryIdsChange?: (ids: string[]) => void;
  onOpenCategoryModal?: () => void;
  showCategory?: boolean;
  categoryLabel?: string;
  categoryRequired?: boolean;
  categoryHint?: string;
  categoryWarning?: React.ReactNode;

  // Scheduling props (optional)
  schedulingEnabled?: boolean;
  publishImmediately?: boolean;
  onPublishImmediatelyChange?: (checked: boolean) => void;
  publishAtLocal?: string;
  onPublishAtLocalChange?: (value: string) => void;

  // Author props (optional)
  authorName?: string;
  onAuthorNameChange?: (name: string) => void;
  showAuthor?: boolean;
  authorLabel?: string;

  // Extra slot for module-specific sidebar controls (e.g. Featured checkbox)
  children?: React.ReactNode;
  extraContent?: React.ReactNode;

  cardTitle?: string;
  className?: string;
}

/**
 * Props cho AdminSelect
 */
export interface AdminSelectOption {
  value: string;
  label: string;
}

export interface AdminSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: AdminSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Component Select chuẩn giao diện Shadcn UI (bo góc, hover, ChevronDown icon)
 */
export function AdminSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  disabled,
}: AdminSelectProps) {
  return (
    <div className="relative w-full">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full h-10 appearance-none rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-3.5 pr-9 py-2 text-sm font-medium text-slate-800 dark:text-slate-200 shadow-sm transition-all hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="py-1">
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
        <ChevronDown size={16} />
      </div>
    </div>
  );
}

/**
 * Component Sidebar quản lý Xuất bản & Phân loại chuẩn mực cho mọi trang Create/Edit
 */
export function AdminPublishSidebarCard({
  status,
  onStatusChange,
  statusOptions = [
    { value: 'Draft', label: 'Bản nháp' },
    { value: 'Published', label: 'Đã xuất bản' },
  ],
  categoryId = '',
  onCategoryIdChange,
  categories = [],
  multiCategoryEnabled = false,
  additionalCategoryIds = [],
  onAdditionalCategoryIdsChange,
  onOpenCategoryModal,
  showCategory = true,
  categoryLabel = 'Danh mục',
  categoryRequired = true,
  categoryHint,
  categoryWarning,
  schedulingEnabled = false,
  publishImmediately = true,
  onPublishImmediatelyChange,
  publishAtLocal = '',
  onPublishAtLocalChange,
  authorName = '',
  onAuthorNameChange,
  showAuthor = false,
  authorLabel = 'Tác giả',
  children,
  extraContent,
  cardTitle = 'Xuất bản & Phân loại',
  className,
}: AdminPublishSidebarCardProps) {
  return (
    <AdminFormCard title={cardTitle} className={className}>
      {/* Trạng thái */}
      <div className="space-y-2">
        <Label>Trạng thái</Label>
        <AdminSelect
          value={status}
          onChange={onStatusChange}
          options={statusOptions}
        />
      </div>

      {/* Lên lịch xuất bản (nếu bật & trạng thái = Published) */}
      {schedulingEnabled && status === 'Published' && (
        <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <Checkbox
              checked={publishImmediately}
              onCheckedChange={(checked) => {
                onPublishImmediatelyChange?.(Boolean(checked));
                if (checked) {
                  onPublishAtLocalChange?.('');
                }
              }}
            />
            Xuất bản ngay
          </label>
          {!publishImmediately && (
            <div className="space-y-2">
              <Label>Thời gian xuất bản</Label>
              <Input
                type="datetime-local"
                value={publishAtLocal}
                onChange={(e) => onPublishAtLocalChange?.(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {/* Phân loại danh mục */}
      {showCategory && (
        <div className="space-y-2">
          <Label>
            {categoryLabel} {categoryRequired && <span className="text-red-500">*</span>}
          </Label>
          {multiCategoryEnabled ? (
            <>
              <CategoryTagsInput
                categories={categories}
                value={[categoryId, ...additionalCategoryIds].filter(Boolean)}
                onQuickCreate={onOpenCategoryModal}
                onChange={(ids) => {
                  onCategoryIdChange?.(ids[0] ?? '');
                  onAdditionalCategoryIdsChange?.(ids.slice(1));
                }}
              />
              <p className="text-xs text-slate-500">
                {categoryHint || 'Thẻ đầu tiên là danh mục chính/canonical, các thẻ sau là danh mục phụ.'}
              </p>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <AdminSelect
                  value={categoryId}
                  onChange={(val) => onCategoryIdChange?.(val)}
                  placeholder="-- Chọn danh mục --"
                  options={categories.map((cat) => ({ value: cat._id, label: cat.name }))}
                />
              </div>
              {onOpenCategoryModal && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onOpenCategoryModal}
                  title="Tạo danh mục mới"
                  className="h-10 w-10 shrink-0 border-slate-200 dark:border-slate-700 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                >
                  <Plus size={16} />
                </Button>
              )}
            </div>
          )}
          {categoryWarning}
        </div>
      )}

      {/* Tác giả (Optional) */}
      {showAuthor && onAuthorNameChange && (
        <div className="space-y-2">
          <Label>{authorLabel}</Label>
          <Input
            value={authorName}
            onChange={(e) => onAuthorNameChange(e.target.value)}
            placeholder="Nhập tên tác giả..."
          />
        </div>
      )}

      {/* Phần mở rộng / Custom controls */}
      {extraContent}
      {children}
    </AdminFormCard>
  );
}

/**
 * Props cho AdminThumbnailSidebarCard
 */
export interface AdminThumbnailSidebarCardProps {
  thumbnail?: string;
  thumbnailStorageId?: Id<'_storage'> | null;
  onThumbnailChange: (url?: string, storageId?: Id<'_storage'>) => void;
  folder?: string;
  entitySlug?: string;
  aspectRatio?: 'video' | 'square' | 'portrait' | 'auto';
  cardTitle?: string;
  tooltip?: React.ReactNode;
  className?: string;
}

/**
 * Component Sidebar quản lý Ảnh đại diện chuẩn mực cho mọi trang Create/Edit
 */
export function AdminThumbnailSidebarCard({
  thumbnail,
  thumbnailStorageId,
  onThumbnailChange,
  folder = 'uploads',
  entitySlug = 'item',
  aspectRatio = 'video',
  cardTitle = 'Ảnh đại diện',
  tooltip,
  className,
}: AdminThumbnailSidebarCardProps) {
  const defaultTooltip = (
    <div className="space-y-2">
      <div className="font-semibold text-white border-b border-white/10 pb-1.5 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        {aspectRatio === 'square'
          ? 'Tiêu chuẩn Ảnh vuông tối ưu (1:1)'
          : aspectRatio === 'portrait'
          ? 'Tiêu chuẩn Ảnh dọc tối ưu (3:4)'
          : 'Tiêu chuẩn Ảnh bài viết chuẩn SEO & Mạng xã hội'}
      </div>
      <ul className="space-y-1.5 text-slate-300">
        <li>
          <strong className="text-white font-medium">Tỉ lệ chuẩn:</strong>{' '}
          <span className="text-emerald-300 font-semibold">
            {aspectRatio === 'square' ? '1:1 (Hình vuông)' : aspectRatio === 'portrait' ? '3:4 (Ảnh dọc)' : '16:9 (Chuẩn Google Discover & OpenGraph)'}
          </span>
        </li>
        <li>
          <strong className="text-white font-medium">Kích thước tối ưu:</strong>{' '}
          <span className="text-amber-300 font-mono font-semibold">
            {aspectRatio === 'square' ? '800 × 800 px' : aspectRatio === 'portrait' ? '900 × 1200 px' : '1200 × 675 px (hoặc 1200 × 630 px)'}
          </span>
        </li>
        <li>
          <strong className="text-white font-medium">Định dạng &amp; Dung lượng:</strong>{' '}
          <code className="text-cyan-300 font-mono">WebP</code>, <code className="text-cyan-300 font-mono">JPG</code>, <code className="text-cyan-300 font-mono">PNG</code>. Dưới <span className="text-amber-300 font-semibold">200 KB</span> để tối ưu điểm Core Web Vitals.
        </li>
        <li>
          <strong className="text-white font-medium">Mẹo Google &amp; Social:</strong>{' '}
          {aspectRatio === 'video' || aspectRatio === 'auto'
            ? 'Chiều ngang từ 1200px trở lên giúp bài viết được Google Discover ưu tiên hiển thị ảnh thẻ lớn (Max Image Preview) và không bị cắt viền khi chia sẻ lên Zalo/Facebook.'
            : 'Đặt nội dung trọng tâm ở giữa ảnh để hiển thị trọn vẹn trên mọi kích cỡ màn hình.'}
        </li>
      </ul>
    </div>
  );

  return (
    <AdminFormCard title={cardTitle} tooltip={tooltip ?? defaultTooltip} className={className}>
      <ImageUploader
        value={thumbnail}
        storageId={thumbnailStorageId}
        onChange={onThumbnailChange}
        folder={folder}
        naming={{ entityName: entitySlug.trim() || 'item', style: 'slug-index', index: 1 }}
        deleteMode="defer"
        aspectRatio={aspectRatio}
      />
    </AdminFormCard>
  );
}
