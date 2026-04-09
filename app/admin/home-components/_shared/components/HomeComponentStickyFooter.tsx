'use client';

import React from 'react';
import { Button, cn } from '@/app/admin/components/ui';
import { useSidebarState } from '@/app/admin/context/SidebarContext';

type HomeComponentStickyFooterProps = {
  isSubmitting: boolean;
  hasChanges?: boolean;
  onCancel?: () => void;
  submitLabel: string;
  submittingLabel?: string;
  savedLabel?: string;
  disableSave?: boolean;
  align?: 'between' | 'end';
};

export function HomeComponentStickyFooter({
  isSubmitting,
  hasChanges,
  onCancel,
  submitLabel,
  submittingLabel = 'Đang lưu...',
  savedLabel = 'Đã lưu',
  disableSave,
  align = 'between',
}: HomeComponentStickyFooterProps) {
  const { isSidebarCollapsed } = useSidebarState();
  const isDisabled = disableSave ?? (hasChanges === false || isSubmitting);
  const label = isSubmitting
    ? submittingLabel
    : hasChanges === false
      ? savedLabel
      : submitLabel;

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 z-30',
        isSidebarCollapsed ? 'lg:left-[80px]' : 'lg:left-[280px]'
      )}
    >
      <div className={cn('flex items-center gap-3', align === 'between' ? 'justify-between' : 'justify-end')}>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Hủy bỏ
          </Button>
        )}
        <Button
          type="submit"
          variant="accent"
          disabled={isDisabled}
          className={hasChanges === false && !isSubmitting && !disableSave
            ? 'bg-slate-300 hover:bg-slate-300 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-800 dark:text-slate-400'
            : undefined}
        >
          {label}
        </Button>
      </div>
    </div>
  );
}
