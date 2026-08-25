'use client';

import React from 'react';
import { Button, cn } from '@/app/admin/components/ui';

export type AdminSaveButtonProps = {
  isSubmitting: boolean;
  hasChanges?: boolean;
  /** Chế độ form ('create' | 'edit'). Ở chế độ 'create', không bao giờ hiển thị trạng thái 'Đã lưu' */
  mode?: 'create' | 'edit';
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  submitLabel?: string;
  submittingLabel?: string;
  savedLabel?: string;
  disabled?: boolean;
  className?: string;
  type?: 'submit' | 'button';
  variant?: React.ComponentProps<typeof Button>['variant'];
};

export function AdminSaveButton({
  isSubmitting,
  hasChanges,
  mode,
  onClick,
  submitLabel = 'Lưu thay đổi',
  submittingLabel = 'Đang lưu...',
  savedLabel = 'Đã lưu',
  disabled,
  className,
  type = 'submit',
  variant = 'default',
}: AdminSaveButtonProps) {
  // LOGIC: Ở chế độ 'create' hoặc khi không kích hoạt dirty tracking (hasChanges === undefined),
  // nút luôn ở chế độ Submit chuẩn và không bao giờ hiển thị 'Đã lưu'.
  // Chỉ khi ở chế độ 'edit' (hoặc có hasChanges boolean mà không set mode='create'), mới dùng trạng thái 'Đã lưu' (isClean).
  const isCreateMode = mode === 'create';
  const isDirtyTrackingActive = !isCreateMode && typeof hasChanges === 'boolean';
  const isClean = isDirtyTrackingActive && hasChanges === false;
  const isDisabled = disabled ?? (isClean || isSubmitting);
  const effectiveVariant = isClean && !isSubmitting ? 'secondary' : variant;

  return (
    <Button
      type={type}
      onClick={onClick}
      variant={effectiveVariant}
      size="sm"
      disabled={isDisabled}
      className={cn(
        'min-w-[96px] h-9 text-sm font-medium px-3.5 transition-all duration-150 rounded-md',
        isClean && !isSubmitting && [
          'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-transparent',
          'disabled:opacity-100 disabled:cursor-default hover:bg-slate-100 dark:hover:bg-slate-800'
        ],
        !isClean && !isSubmitting && 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs active:scale-[0.98]',
        className
      )}
    >
      {isSubmitting ? submittingLabel : isClean ? savedLabel : submitLabel}
    </Button>
  );
}
