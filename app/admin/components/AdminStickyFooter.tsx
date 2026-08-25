'use client';

import React from 'react';
import { Bot, ExternalLink, Plus, Sparkles } from 'lucide-react';
import { Button, cn } from '@/app/admin/components/ui';
import { AdminSaveButton } from '@/app/admin/components/AdminSaveButton';
import { useSidebarState } from '@/app/admin/context/SidebarContext';
import { useHomeComponentFooterActions } from '../home-components/_shared/components/HomeComponentFooterActions';
import { UndoRedoToolbar } from '../home-components/_shared/components/UndoRedoToolbar';

export { AdminSaveButton, type AdminSaveButtonProps } from '@/app/admin/components/AdminSaveButton';

export type AdminStickyFooterProps = {
  /** Chế độ form ('create' | 'edit') */
  mode?: 'create' | 'edit';
  /** Trạng thái đang lưu submit chính */
  isSubmitting?: boolean;
  /** Cờ cho biết dữ liệu đã thay đổi hay chưa */
  hasChanges?: boolean;
  /** Handler khi bấm nút Lưu chính */
  onClickSave?: () => void | Promise<void>;
  /** Nhãn nút Lưu (Default: 'Lưu thay đổi') */
  submitLabel?: string;
  /** Nhãn khi đang lưu (Default: 'Đang lưu...') */
  submittingLabel?: string;
  /** Nhãn khi đã lưu (Default: 'Đã lưu') */
  savedLabel?: string;
  /** Vô hiệu hóa nút Lưu */
  disableSave?: boolean;
  /** Variant màu cho nút Lưu */
  submitVariant?: React.ComponentProps<typeof Button>['variant'];
  /** Loại type nút Lưu ('submit' | 'button') */
  submitType?: 'submit' | 'button';
  /** ClassName bổ sung cho nút Lưu */
  submitClassName?: string;

  /** Handler khi bấm nút Hủy bỏ */
  onCancel?: () => void;
  /** Nhãn nút Hủy (Default: 'Hủy bỏ') */
  cancelLabel?: string;


  /** Handler khi bấm nút Xem trên web (Chỉ hiện Icon) */
  onViewWeb?: () => void;
  /** Title/Tooltip nút Xem trên web (Default: 'Xem trên web') */
  viewWebTitle?: string;
  /** Vô hiệu hóa nút Xem trên web */
  disableViewWeb?: boolean;

  /** Handler khi bấm nút Thêm (mục mới / liên kết...) */
  onAdd?: () => void;
  /** Nhãn nút Thêm (Default: 'Thêm liên kết') */
  addLabel?: string;
  /** Vô hiệu hóa nút Thêm */
  disableAdd?: boolean;

  /** Handler khi bấm nút Nhập từ AI */
  onAiImport?: () => void;
  /** Vô hiệu hóa nút Nhập AI */
  disableAiImport?: boolean;
  /** Custom Node/Component AI Import (nếu dùng dialog riêng) */
  aiImportNode?: React.ReactNode;

  /** Handler khi bấm nút Gợi ý AI / Smart Builder */
  onAiSuggest?: () => void;
  /** Nhãn nút Gợi ý AI (Default: 'Gợi ý menu') */
  aiSuggestLabel?: string;
  /** Vô hiệu hóa nút Gợi ý AI */
  disableAiSuggest?: boolean;

  /** Dòng thông báo / chỉ số hiển thị bên trái footer */
  statusText?: React.ReactNode;

  /** Trạng thái active/inactive của đối tượng */
  active?: boolean;
  /** Callback khi toggle trạng thái active */
  onActiveChange?: (value: boolean) => void;
  /** Nhãn trạng thái bật (Default: 'Bật') */
  activeLabel?: string;
  /** Nhãn trạng thái tắt (Default: 'Tắt') */
  inactiveLabel?: string;

  /** Undo/Redo config */
  undoRedo?: {
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
  };

  /** Căn chỉnh ('between' | 'end') */
  align?: 'between' | 'end';
  /** Node bổ sung chèn trước các nút lưu chính */
  extraActions?: React.ReactNode;
  /** Node bổ sung chèn cuối footer */
  children?: React.ReactNode;
};

export function AdminStickyFooter({
  mode,
  isSubmitting = false,
  hasChanges,
  onCancel,
  onClickSave,
  submitLabel = 'Lưu thay đổi',
  submittingLabel = 'Đang lưu...',
  savedLabel = 'Đã lưu',
  disableSave,
  submitVariant = 'default',
  submitType = 'submit',
  submitClassName,
  cancelLabel = 'Hủy bỏ',
  onViewWeb,
  viewWebTitle = 'Xem trên web',
  disableViewWeb,
  onAdd,
  addLabel = 'Thêm liên kết',
  disableAdd,
  onAiImport,
  disableAiImport,
  aiImportNode,
  onAiSuggest,
  aiSuggestLabel = 'Gợi ý menu',
  disableAiSuggest,
  statusText,
  active,
  onActiveChange,
  activeLabel = 'Bật',
  inactiveLabel = 'Tắt',
  undoRedo,
  align = 'between',
  extraActions,
  children,
}: AdminStickyFooterProps) {
  const { isSidebarCollapsed } = useSidebarState();
  const footerActions = useHomeComponentFooterActions();

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const sortedFooterActions = React.useMemo(() => {
    const actionPriority = ['toggle-all', 'ai-import'];
    return [...footerActions].sort((a, b) => {
      const indexA = actionPriority.indexOf(a.key);
      const indexB = actionPriority.indexOf(b.key);
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return 0;
    });
  }, [footerActions]);

  const hasLeftItems = Boolean(onCancel || statusText || (active !== undefined && onActiveChange));
  const effectiveAlign = align === 'between' && hasLeftItems ? 'justify-between' : 'justify-end';

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur-xs px-4 pt-[7px] pb-2.5 dark:border-slate-800 dark:bg-slate-900/95 z-30 transition-all duration-300',
        // Tỷ lệ khớp chính xác theo Sidebar.tsx: Thu gọn 72px, Mở rộng 255px
        isSidebarCollapsed ? 'lg:left-[72px]' : 'lg:left-[255px]'
      )}
    >
      <div className={cn('flex items-center gap-3 w-full', effectiveAlign)}>
        {!isMounted ? (
          <div className="h-9 w-full flex items-center justify-end gap-2">
            <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        ) : (
          <>
            {hasLeftItems && (
              <div className="flex items-center gap-3">
                {onCancel && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    disabled={isSubmitting}
                    className="h-9 text-sm font-medium px-3.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    {cancelLabel}
                  </Button>
                )}
                {statusText && (
                  <div className="hidden text-sm font-medium text-slate-500 md:block">
                    {statusText}
                  </div>
                )}
                {active !== undefined && onActiveChange && (
                  <div className="flex items-center gap-2 ml-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                    <span className="text-sm text-slate-500 dark:text-slate-400">Trạng thái</span>
                    <div
                      className={cn(
                        'cursor-pointer inline-flex items-center justify-center rounded-full w-9 h-5 transition-colors',
                        active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600',
                      )}
                      onClick={() => onActiveChange(!active)}
                    >
                      <div
                        className={cn(
                          'w-3.5 h-3.5 bg-white rounded-full transition-transform shadow-xs',
                          active ? 'translate-x-1.5' : '-translate-x-1.5',
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-sm font-medium',
                        active ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500',
                      )}
                    >
                      {active ? activeLabel : inactiveLabel}
                    </span>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {undoRedo && (
                <UndoRedoToolbar
                  canUndo={undoRedo.canUndo}
                  canRedo={undoRedo.canRedo}
                  onUndo={undoRedo.onUndo}
                  onRedo={undoRedo.onRedo}
                  className="mr-1 border-r border-slate-200 dark:border-slate-700 pr-2"
                />
              )}
              {onViewWeb && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onViewWeb}
                  disabled={disableViewWeb || isSubmitting}
                  title={viewWebTitle}
                  aria-label={viewWebTitle}
                  className="h-9 w-9 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                >
                  <ExternalLink size={16} />
                </Button>
              )}
              {onAdd && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAdd}
                  disabled={disableAdd || isSubmitting}
                  className="h-9 text-sm font-medium px-3.5"
                >
                  <Plus size={16} className="mr-1.5" />
                  {addLabel}
                </Button>
              )}
              {aiImportNode ? (
                aiImportNode
              ) : onAiImport ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAiImport}
                  disabled={disableAiImport || isSubmitting}
                  className="h-9 text-sm font-medium px-3.5"
                >
                  <Bot size={16} className="mr-1.5" />
                  Nhập AI
                </Button>
              ) : null}
              {onAiSuggest && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAiSuggest}
                  disabled={disableAiSuggest || isSubmitting}
                  className="h-9 text-sm font-medium px-3.5"
                >
                  <Sparkles size={16} className="mr-1.5" />
                  {aiSuggestLabel}
                </Button>
              )}
              {sortedFooterActions.map((action) => (
                <React.Fragment key={action.key}>{action.node}</React.Fragment>
              ))}
              {extraActions}
              {onClickSave || submitType === 'submit' ? (
                <AdminSaveButton
                  type={submitType}
                  onClick={onClickSave}
                  variant={submitVariant}
                  isSubmitting={isSubmitting}
                  hasChanges={hasChanges}
                  mode={mode}
                  disabled={disableSave}
                  submitLabel={submitLabel}
                  submittingLabel={submittingLabel}
                  savedLabel={savedLabel}
                  className={submitClassName}
                />
              ) : null}
              {children}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
