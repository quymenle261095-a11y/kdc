'use client';

import React, { useState } from 'react';
import type { UniqueIdentifier } from '@dnd-kit/core';
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { ArrowUpDown, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, Edit, Eye, GripVertical, ImageOff, Loader2, Plus, RotateCcw, Search, SearchCheck, SlidersHorizontal, Trash2, Wand2, X } from 'lucide-react';
import { Button, Input, TableBody, TableCell, TableHead, TableRow, cn } from './ui';
import { AdminEntityImage } from './AdminEntityImage';
export { AdminEntityImage };

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Tìm kiếm...',
  className,
  wrapperClassName,
  showClear = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  showClear?: boolean;
}) => (
  <div className={cn("relative w-full md:w-64", wrapperClassName)}>
    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    <Input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "pl-9 h-9 text-sm font-medium pr-8 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 transition-all",
        className
      )}
    />
    {showClear && value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        title="Xóa từ khóa tìm kiếm"
      >
        <X size={14} />
      </button>
    )}
  </div>
);

export const FilterSelect = ({
  value,
  onChange,
  options,
  placeholder,
  className,
  align = 'left',
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  align?: 'left' | 'right';
  label?: string;
}) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder || 'Chọn...';
  const isSelected = Boolean(value);

  return (
    <div className="relative inline-block text-left w-full md:w-auto">
      {/* Mobile Native Select (OS Wheel Picker) */}
      <div className="md:hidden w-full">
        {label && <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>}
        <div className="relative">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              "w-full h-11 px-3 pr-8 rounded-lg border text-sm font-medium appearance-none bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500",
              isSelected
                ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 font-semibold"
                : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
            )}
          >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Desktop Popover Dropdown */}
      <div className="hidden md:block">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(!open)}
          className={cn(
            "gap-1.5 h-9 px-3 text-sm font-medium transition-all select-none whitespace-nowrap",
            isSelected
              ? "border-blue-500/50 bg-blue-50/50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-300 font-semibold"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750",
            className
          )}
          title={displayLabel}
        >
          <span className="truncate max-w-[180px]">{displayLabel}</span>
          <ChevronDown size={13} className={cn("text-slate-400 transition-transform duration-200", open && "rotate-180")} />
        </Button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div
              className={cn(
                "absolute top-full mt-1 min-w-[160px] max-w-[280px] whitespace-nowrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1.5 animate-in fade-in-80 zoom-in-95 duration-100",
                align === 'right' ? "right-0" : "left-0"
              )}
            >
              {placeholder && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer",
                    !value ? "text-blue-600 dark:text-blue-400 font-semibold bg-slate-50/80 dark:bg-slate-800/50" : "text-slate-500 dark:text-slate-400"
                  )}
                >
                  <span>{placeholder}</span>
                  {!value && <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                </button>
              )}

              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2 text-sm text-left font-medium transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer",
                      active
                        ? "text-blue-600 dark:text-blue-400 font-semibold bg-blue-50/60 dark:bg-blue-950/40"
                        : "text-slate-700 dark:text-slate-200"
                    )}
                  >
                    <span>{opt.label}</span>
                    {active && <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const ResetFilterButton = ({
  isFiltered,
  onReset,
  activeCount,
  label = 'Bỏ lọc',
}: {
  isFiltered: boolean;
  onReset: () => void;
  activeCount?: number;
  label?: string;
}) => {
  if (!isFiltered) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onReset}
      className="gap-1.5 h-9 px-2.5 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all animate-in fade-in zoom-in-95 duration-150"
      title="Khôi phục bộ lọc mặc định"
    >
      <RotateCcw size={14} className="text-slate-400" />
      <span className="text-sm font-medium">{label}</span>
      {activeCount && activeCount > 0 ? (
        <span className="rounded-full bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );
};

export const ColumnToggle = ({ columns, visibleColumns, onToggle }: {
  columns: { key: string; label: string; required?: boolean }[];
  visibleColumns: string[];
  onToggle: (key: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const activeCount = visibleColumns.length > 0 ? visibleColumns.length : columns.length;
  
  return (
    <div className="relative inline-block text-left w-full md:w-auto">
      {/* Mobile inline Checklist Grid inside Drawer */}
      <div className="md:hidden w-full border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <span>Tùy chỉnh cột hiển thị</span>
          <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[11px]">
            {activeCount}/{columns.length}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {columns.map(col => (
            <label
              key={col.key}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md border text-xs font-medium cursor-pointer transition-colors bg-white dark:bg-slate-800",
                col.required ? "opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-700" : "border-slate-200 dark:border-slate-700 hover:border-blue-400"
              )}
            >
              <input
                type="checkbox"
                checked={visibleColumns.length === 0 ? true : visibleColumns.includes(col.key)}
                onChange={() => !col.required && onToggle(col.key)}
                disabled={col.required}
                className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="truncate text-slate-700 dark:text-slate-200">{col.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Desktop Popover Dropdown Button */}
      <div className="hidden md:block">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9 px-2.5 text-sm font-medium text-slate-700 dark:text-slate-300"
          onClick={() => { setOpen(!open); }}
          title="Tùy chỉnh cột hiển thị"
        >
          <SlidersHorizontal size={14} />
          <span className="text-sm font-medium">Cột</span>
          <span className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            {activeCount}/{columns.length}
          </span>
          <ChevronDown size={13} className="text-slate-400" />
        </Button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); }} />
            <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 py-2">
              <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Chọn cột hiển thị</div>
              {columns.map(col => (
                <label key={col.key} className={cn(
                  "flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer",
                  col.required && "opacity-50 cursor-not-allowed"
                )}>
                  <input
                    type="checkbox"
                    checked={visibleColumns.length === 0 ? true : visibleColumns.includes(col.key)}
                    onChange={() => !col.required && onToggle(col.key)}
                    disabled={col.required}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{col.label}</span>
                  {col.required && <span className="text-xs text-slate-400 ml-auto">Bắt buộc</span>}
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const MobileFilterDrawer = ({
  open,
  onOpenChange,
  activeCount = 0,
  onReset,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount?: number;
  onReset?: () => void;
  children: React.ReactNode;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-h-[85vh] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-250">
        <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto my-2.5 shrink-0" />
        <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Bộ lọc danh sách</h3>
            {activeCount > 0 && (
              <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {activeCount} đang lọc
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {children}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
          {onReset && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 gap-2 h-11 text-sm font-semibold"
              onClick={() => {
                onReset();
                onOpenChange(false);
              }}
            >
              <RotateCcw size={16} />
              Xóa bộ lọc
            </Button>
          )}
          <Button
            type="button"
            variant="default"
            className="flex-1 h-11 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => onOpenChange(false)}
          >
            Áp dụng ({activeCount > 0 ? `${activeCount} lọc` : 'Tất cả'})
          </Button>
        </div>
      </div>
    </div>
  );
};

export const TableToolbar = ({
  children,
  search,
  filters,
  actions,
  activeFilterCount = 0,
  onResetFilters,
  className,
}: {
  children?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  activeFilterCount?: number;
  onResetFilters?: () => void;
  className?: string;
}) => {
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  return (
    <div className={cn("p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3", className)}>
      <div className="flex items-center gap-2 w-full md:w-auto">
        {search ? <div className="flex-1 md:w-72 shrink-0">{search}</div> : null}
        {filters ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMobileFilterOpen(true)}
            className="md:hidden gap-1.5 h-9 px-3 shrink-0 font-medium text-slate-700 dark:text-slate-300"
          >
            <SlidersHorizontal size={15} />
            <span className="text-xs font-semibold">Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="bg-blue-600 text-white text-[11px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        ) : null}
      </div>

      {(filters || actions) ? (
        <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
          {filters}
          {actions}
        </div>
      ) : null}

      {filters && (
        <MobileFilterDrawer
          open={mobileFilterOpen}
          onOpenChange={setMobileFilterOpen}
          activeCount={activeFilterCount}
          onReset={onResetFilters}
        >
          <div className="flex flex-col gap-3 [&_button]:w-full [&_button]:justify-between">
            {filters}
          </div>
        </MobileFilterDrawer>
      )}
      {children}
    </div>
  );
};

export const SortableHeader = ({
  label,
  sortKey,
  sortConfig,
  onSort,
  className,
  children,
}: {
  label: string;
  sortKey: string;
  sortConfig: { key: string | null; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  className?: string;
  children?: React.ReactNode;
}) => {
  const isSorted = sortConfig.key === sortKey;
  const isAsc = isSorted && sortConfig.direction === 'asc';
  const isDesc = isSorted && sortConfig.direction === 'desc';

  return (
    <TableHead
      aria-sort={isAsc ? 'ascending' : isDesc ? 'descending' : 'none'}
      className={cn(
        "cursor-pointer hover:bg-slate-100/70 dark:hover:bg-slate-800/70 transition-colors select-none group whitespace-nowrap",
        isSorted && "text-slate-900 dark:text-slate-100 font-semibold",
        className
      )}
      onClick={() => { onSort(sortKey); }}
    >
      <div className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
        <span>{children ?? label}</span>
        {isAsc ? (
          <ChevronUp size={15} className="text-blue-600 dark:text-blue-400 shrink-0 stroke-[2.5]" />
        ) : isDesc ? (
          <ChevronDown size={15} className="text-blue-600 dark:text-blue-400 shrink-0 stroke-[2.5]" />
        ) : (
          <ChevronsUpDown size={14} className="text-slate-400/60 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300 shrink-0 transition-colors" />
        )}
      </div>
    </TableHead>
  );
};

export const ExactSearchToggle = ({
  checked,
  onCheckedChange,
  title = 'Tìm chính xác: khớp từng ký tự',
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  title?: string;
}) => (
  <label
    className={cn(
      "inline-flex h-10 w-10 cursor-pointer select-none items-center justify-center rounded-md border transition-colors",
      checked
        ? "border-orange-500 bg-orange-500/5 text-orange-600 dark:text-orange-400"
        : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
    )}
    title={title}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => { onCheckedChange(event.target.checked); }}
      className="sr-only"
      aria-label="Tìm chính xác"
    />
    <SearchCheck size={16} aria-hidden="true" />
    <span className="sr-only">Tìm chính xác</span>
  </label>
);

export function generatePaginationItems(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
}

export function getNextSortState(
  current: { key: string | null; direction: 'asc' | 'desc' },
  targetKey: string
): { key: string | null; direction: 'asc' | 'desc' } {
  if (current.key !== targetKey) {
    return { key: targetKey, direction: 'desc' };
  }
  if (current.direction === 'desc') {
    return { key: targetKey, direction: 'asc' };
  }
  return { key: null, direction: 'asc' };
}

export function useSortableData<T>(items: T[], config: { key: string | null; direction: 'asc' | 'desc' }) {
  return React.useMemo(() => {
    const sortableItems = [...items];
    if (config.key) {
      sortableItems.sort((a, b) => {
        const aVal = a[config.key as keyof T] as string | number | undefined | null;
        const bVal = b[config.key as keyof T] as string | number | undefined | null;
        if (aVal == null || bVal == null) {return 0;}
        if (aVal < bVal) {return config.direction === 'asc' ? -1 : 1;}
        if (aVal > bVal) {return config.direction === 'asc' ? 1 : -1;}
        return 0;
      });
    }
    return sortableItems;
  }, [items, config]);
}

export function usePersistedColumns(storageKey: string): {
  visibleColumns: string[];
  toggleColumn: (key: string, allKeys?: string[]) => void;
  resetColumns: () => void;
} {
  const [visibleColumns, setVisibleColumns] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = window.localStorage.getItem(storageKey);
      const parsed = stored ? JSON.parse(stored) as string[] : [];
      return parsed.length > 0 ? parsed : [];
    } catch { return []; }
  });

  React.useEffect(() => {
    if (visibleColumns.length > 0) {
      window.localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
    }
  }, [storageKey, visibleColumns]);

  const toggleColumn = React.useCallback((key: string, allKeys?: string[]) => {
    setVisibleColumns(prev => {
      const base = prev.length > 0 ? prev : (allKeys ?? []);
      return base.includes(key) ? base.filter(c => c !== key) : [...base, key];
    });
  }, []);

  const resetColumns = React.useCallback(() => {
    setVisibleColumns([]);
    try { window.localStorage.removeItem(storageKey); } catch { /* ignore */ }
  }, [storageKey]);

  return { resetColumns, toggleColumn, visibleColumns };
}

export type BulkAction = {
  key: string;
  label: string;
  loadingLabel?: string;
  icon?: React.ReactNode;
  variant?: 'outline' | 'destructive';
  className?: string;
  isLoading?: boolean;
  onClick: () => void;
};

export type BulkSelectionScope = 'partial' | 'page' | 'all_results';

export const BulkActionBar = ({
  selectedCount,
  entityLabel,
  selectionScope = 'partial',
  pageItemCount,
  totalMatchingCount,
  onSelectPage,
  onSelectAllResults,
  isSelectingAllResults,
  onPublish,
  onUnpublish,
  isStatusLoading,
  publishLabel = 'Hiện',
  publishLoadingLabel = 'Đang hiện...',
  unpublishLabel = 'Ẩn',
  unpublishLoadingLabel = 'Đang ẩn...',
  onShow,
  onHide,
  showLabel = 'Hiện',
  showLoadingLabel = 'Đang hiện...',
  hideLabel = 'Ẩn',
  hideLoadingLabel = 'Đang ẩn...',
  onClearBrokenMedia,
  isClearBrokenMediaLoading,
  clearBrokenMediaLabel = 'Xóa ảnh lỗi',
  clearBrokenMediaLoadingLabel = 'Đang xóa ảnh lỗi...',
  onQuickSync,
  isQuickSyncLoading,
  quickSyncLabel = 'Đồng bộ nhanh',
  quickSyncLoadingLabel = 'Đang đồng bộ...',
  actions,
  onDelete,
  onClearSelection,
  isLoading,
}: {
  selectedCount: number;
  entityLabel: string;
  selectionScope?: BulkSelectionScope;
  pageItemCount?: number;
  totalMatchingCount?: number;
  onSelectPage?: () => void;
  onSelectAllResults?: () => void;
  isSelectingAllResults?: boolean;
  onPublish?: () => void;
  onUnpublish?: () => void;
  isStatusLoading?: 'publish' | 'unpublish' | 'show' | 'hide' | null;
  publishLabel?: string;
  publishLoadingLabel?: string;
  unpublishLabel?: string;
  unpublishLoadingLabel?: string;
  onShow?: () => void;
  onHide?: () => void;
  showLabel?: string;
  showLoadingLabel?: string;
  hideLabel?: string;
  hideLoadingLabel?: string;
  onClearBrokenMedia?: () => void;
  isClearBrokenMediaLoading?: boolean;
  clearBrokenMediaLabel?: string;
  clearBrokenMediaLoadingLabel?: string;
  onQuickSync?: () => void;
  isQuickSyncLoading?: boolean;
  quickSyncLabel?: string;
  quickSyncLoadingLabel?: string;
  actions?: BulkAction[];
  onDelete?: () => void;
  onClearSelection: () => void;
  isLoading?: boolean;
}) => {
  if (selectedCount === 0) {return null;}

  const resolvedTotalMatchingCount = totalMatchingCount ?? selectedCount;
  const resolvedPageItemCount = pageItemCount ?? selectedCount;
  const canSelectPage = selectionScope === 'partial' && onSelectPage && resolvedPageItemCount > selectedCount;
  const canSelectAllResults = selectionScope === 'page' && onSelectAllResults && resolvedTotalMatchingCount > resolvedPageItemCount;
  const primaryMessage = selectionScope === 'all_results'
    ? `Đã chọn toàn bộ ${resolvedTotalMatchingCount} ${entityLabel} phù hợp`
    : selectionScope === 'page'
      ? `Đã chọn ${selectedCount} ${entityLabel} trên trang này`
      : `Đã chọn ${selectedCount} ${entityLabel}`;
  
  return (
    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{primaryMessage}</span>
          <button onClick={onClearSelection} className="text-xs text-slate-500 hover:text-slate-700 underline" disabled={isLoading}>
            Bỏ chọn tất cả
          </button>
        </div>
        {selectionScope === 'all_results' && (
          <span className="text-xs text-slate-500">Bao gồm tất cả kết quả theo bộ lọc hiện tại</span>
        )}
        {canSelectPage && (
          <button
            type="button"
            onClick={onSelectPage}
            disabled={isLoading}
            className="text-xs text-blue-600 hover:text-blue-700 underline text-left"
          >
            Chọn toàn bộ {resolvedPageItemCount} {entityLabel} trên trang này
          </button>
        )}
        {canSelectAllResults && (
          <button
            type="button"
            onClick={onSelectAllResults}
            disabled={isLoading || isSelectingAllResults}
            className="text-xs text-blue-600 hover:text-blue-700 underline text-left"
          >
            {isSelectingAllResults ? 'Đang chọn...' : `Chọn tất cả ${resolvedTotalMatchingCount} ${entityLabel} phù hợp`}
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {actions ? (
          actions.map(action => (
            <Button
              key={action.key}
              variant={action.variant ?? 'outline'}
              size="sm"
              className={cn('gap-2 h-8', action.className)}
              onClick={action.onClick}
              disabled={isLoading || action.isLoading}
            >
              {action.isLoading ? <Loader2 size={14} className="animate-spin" /> : (action.icon ?? null)}
              {action.isLoading ? (action.loadingLabel ?? action.label) : `${action.label} (${selectedCount})`}
            </Button>
          ))
        ) : (
          <>
            {onPublish && (
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={onPublish} disabled={isLoading || Boolean(isStatusLoading)}>
                {isStatusLoading === 'publish' ? <Loader2 size={14} className="animate-spin" /> : null}
                {isStatusLoading === 'publish' ? publishLoadingLabel : `${publishLabel} (${selectedCount})`}
              </Button>
            )}
            {onUnpublish && (
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={onUnpublish} disabled={isLoading || Boolean(isStatusLoading)}>
                {isStatusLoading === 'unpublish' ? <Loader2 size={14} className="animate-spin" /> : null}
                {isStatusLoading === 'unpublish' ? unpublishLoadingLabel : `${unpublishLabel} (${selectedCount})`}
              </Button>
            )}
            {onShow && (
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={onShow} disabled={isLoading || Boolean(isStatusLoading)}>
                {isStatusLoading === 'show' ? <Loader2 size={14} className="animate-spin" /> : null}
                {isStatusLoading === 'show' ? showLoadingLabel : `${showLabel} (${selectedCount})`}
              </Button>
            )}
            {onHide && (
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={onHide} disabled={isLoading || Boolean(isStatusLoading)}>
                {isStatusLoading === 'hide' ? <Loader2 size={14} className="animate-spin" /> : null}
                {isStatusLoading === 'hide' ? hideLoadingLabel : `${hideLabel} (${selectedCount})`}
              </Button>
            )}
            {onClearBrokenMedia && (
              <Button variant="outline" size="sm" className="gap-2 h-8" onClick={onClearBrokenMedia} disabled={isLoading || Boolean(isStatusLoading) || isClearBrokenMediaLoading}>
                {isClearBrokenMediaLoading ? <Loader2 size={14} className="animate-spin" /> : <ImageOff size={14} />}
                {isClearBrokenMediaLoading ? clearBrokenMediaLoadingLabel : `${clearBrokenMediaLabel} (${selectedCount})`}
              </Button>
            )}
            {onQuickSync && (
              <Button variant="outline" size="sm" className="gap-2 h-8 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/30" onClick={onQuickSync} disabled={isLoading || Boolean(isStatusLoading) || isQuickSyncLoading}>
                {isQuickSyncLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {isQuickSyncLoading ? quickSyncLoadingLabel : `${quickSyncLabel} (${selectedCount})`}
              </Button>
            )}
            {onDelete && (
              <Button variant="destructive" size="sm" className="gap-2 h-8" onClick={onDelete} disabled={isLoading || Boolean(isStatusLoading)}>
                {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isLoading ? 'Đang xóa...' : `Xóa (${selectedCount})`}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export const SelectCheckbox = ({ checked, onChange, indeterminate, disabled, title }: { 
  checked: boolean; 
  onChange: () => void;
  indeterminate?: boolean;
  disabled?: boolean;
  title?: string;
}) => {
  const ref = React.useRef<HTMLInputElement>(null);
  
  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      title={title}
      className={`w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
    />
  );
};

type SortableHookResult = ReturnType<typeof useSortable>;

type SortableTableRowRenderProps = {
  attributes: SortableHookResult['attributes'];
  disabled: boolean;
  isDragging: boolean;
  listeners: SortableHookResult['listeners'];
};

export function useAdminDndSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
}

export function getReorderedItems<T>(
  items: T[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier | null | undefined,
  getId: (item: T) => UniqueIdentifier
): T[] | null {
  if (!overId || activeId === overId) {
    return null;
  }

  const oldIndex = items.findIndex(item => getId(item) === activeId);
  const newIndex = items.findIndex(item => getId(item) === overId);
  if (oldIndex < 0 || newIndex < 0) {
    return null;
  }

  return arrayMove(items, oldIndex, newIndex);
}

export function buildOrderUpdates<T, TId extends UniqueIdentifier>(
  items: T[],
  previousOrderValues: number[],
  getId: (item: T) => TId,
  getFallbackOrder: (item: T, index: number) => number
): { id: TId; order: number }[] {
  return items.map((item, index) => ({
    id: getId(item),
    order: previousOrderValues[index] ?? getFallbackOrder(item, index),
  }));
}

export const AdminDragHandle = ({
  attributes,
  className,
  disabled = false,
  disabledTitle = 'Tắt tìm kiếm/lọc/sắp xếp khác để kéo thả.',
  listeners,
  title = 'Kéo để đổi thứ tự',
}: {
  attributes?: SortableHookResult['attributes'];
  className?: string;
  disabled?: boolean;
  disabledTitle?: string;
  listeners?: SortableHookResult['listeners'];
  title?: string;
}) => (
  <button
    type="button"
    {...attributes}
    {...listeners}
    aria-label={title}
    disabled={disabled}
    title={disabled ? disabledTitle : title}
    className={cn(
      'inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors',
      disabled
        ? 'cursor-not-allowed opacity-30'
        : 'cursor-grab hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-300',
      className
    )}
    onClick={(event) => { event.stopPropagation(); }}
  >
    <GripVertical size={14} />
  </button>
);

export const TableHeadSelect = ({ checked, onChange, indeterminate, disabled, className }: {
  checked: boolean;
  onChange: () => void;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
}) => (
  <TableHead className={cn("w-[36px] max-w-[36px] pl-3 pr-1 text-center", className)}>
    <SelectCheckbox checked={checked} onChange={onChange} indeterminate={indeterminate} disabled={disabled} />
  </TableHead>
);

export const TableCellSelect = ({ checked, onChange, disabled, className }: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  className?: string;
}) => (
  <TableCell className={cn("w-[36px] max-w-[36px] pl-3 pr-1 text-center", className)}>
    <SelectCheckbox checked={checked} onChange={onChange} disabled={disabled} />
  </TableCell>
);

export const TableHeadDrag = ({ className }: { className?: string }) => (
  <TableHead className={cn("w-[28px] max-w-[28px] p-1 text-center", className)} />
);

export const TableCellDrag = ({ attributes, disabled, listeners, className }: {
  attributes?: SortableHookResult['attributes'];
  disabled?: boolean;
  listeners?: SortableHookResult['listeners'];
  className?: string;
}) => (
  <TableCell className={cn("w-[28px] max-w-[28px] p-1 text-center", className)}>
    <AdminDragHandle attributes={attributes} disabled={disabled} listeners={listeners} />
  </TableCell>
);

export const TableHeadThumbnail = ({ label = 'Thumbnail', className }: { label?: string; className?: string }) => (
  <TableHead className={cn("w-[76px] min-w-[72px] p-2 text-center whitespace-nowrap", className)}>{label}</TableHead>
);

export const TableCellThumbnail = ({ src, alt, className }: { src?: string | null; alt: string; className?: string }) => (
  <TableCell className={cn("w-[76px] min-w-[72px] p-2 text-center", className)}>
    <AdminEntityImage src={src} alt={alt} width={36} height={36} className="h-9 w-9 rounded-md mx-auto" />
  </TableCell>
);

// LOGIC: Luôn render Drag trước Select để nhất quán thứ tự cột trên toàn hệ thống.
// Dùng component này thay vì tự sắp xếp TableHeadDrag / TableHeadSelect trong từng page.
export const TableHeadControls = ({
  showDrag = true,
  showSelect = true,
  checked = false,
  onChange,
  indeterminate,
  disabled,
}: {
  showDrag?: boolean;
  showSelect?: boolean;
  checked?: boolean;
  onChange?: () => void;
  indeterminate?: boolean;
  disabled?: boolean;
}) => (
  <>
    {showDrag && <TableHeadDrag />}
    {showSelect && (
      <TableHeadSelect
        checked={checked}
        onChange={onChange ?? (() => {})}
        indeterminate={indeterminate}
        disabled={disabled}
      />
    )}
  </>
);

// LOGIC: Luôn render TableCellDrag trước TableCellSelect — mirror của TableHeadControls.
export const TableCellControls = ({
  showDrag = true,
  showSelect = true,
  checked = false,
  onChange,
  selectDisabled,
  attributes,
  dragDisabled,
  listeners,
}: {
  showDrag?: boolean;
  showSelect?: boolean;
  checked?: boolean;
  onChange?: () => void;
  selectDisabled?: boolean;
  attributes?: SortableHookResult['attributes'];
  dragDisabled?: boolean;
  listeners?: SortableHookResult['listeners'];
}) => (
  <>
    {showDrag && <TableCellDrag attributes={attributes} disabled={dragDisabled} listeners={listeners} />}
    {showSelect && <TableCellSelect checked={checked} onChange={onChange ?? (() => {})} disabled={selectDisabled} />}
  </>
);

export function SortableTableRow({
  children,
  className,
  disabled = false,
  draggingClassName = 'bg-slate-100 opacity-80 dark:bg-slate-800',
  id,
  selected = false,
  selectedClassName = 'bg-orange-500/5',
}: {
  children: React.ReactNode | ((props: SortableTableRowRenderProps) => React.ReactNode);
  className?: string;
  disabled?: boolean;
  draggingClassName?: string;
  id: UniqueIdentifier;
  selected?: boolean;
  selectedClassName?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ disabled, id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const renderedChildren = typeof children === 'function'
    ? children({ attributes, disabled, isDragging, listeners })
    : children;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "even:bg-slate-50/60 dark:even:bg-slate-800/20",
        className,
        selected && selectedClassName,
        isDragging && draggingClassName
      )}
    >
      {renderedChildren}
    </TableRow>
  );
}

export const AdminPagination = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  entityLabel = 'kết quả',
  pageSizeOptions = [10, 20, 50, 100],
}: {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  entityLabel?: string;
  pageSizeOptions?: number[];
}) => {
  if (totalItems <= 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);
  const paginationItems = generatePaginationItems(currentPage, totalPages);

  return (
    <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
      <div className="flex flex-wrap items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Hiển thị</span>
            <select
              value={String(pageSize)}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-semibold px-2 pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_6px_center]"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={String(size)}>{size}</option>
              ))}
            </select>
            <span className="text-slate-500 dark:text-slate-400">{entityLabel}/trang</span>
          </div>
        )}
        <div className="text-slate-700 dark:text-slate-300 font-medium">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{startItem}–{endItem}</span>
          <span className="text-slate-400 dark:text-slate-500"> / </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{totalItems}</span> {entityLabel}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          title="Trang trước"
        >
          <ChevronLeft size={16} />
        </Button>

        {paginationItems.map((item, idx) => {
          if (typeof item === 'string') {
            return (
              <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 select-none">
                ...
              </span>
            );
          }
          const isCurrent = item === currentPage;
          return (
            <Button
              key={item}
              variant={isCurrent ? 'default' : 'outline'}
              size="sm"
              className={cn(
                "h-8 min-w-[32px] px-2 text-xs font-semibold transition-all",
                isCurrent
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          title="Trang sau"
        >
          <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  );
};

export const TableSkeleton = ({ cols, rows = 5 }: { cols: number; rows?: number }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <TableRow key={`skel-${i}`}>
        <TableCell colSpan={cols}>
          <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
        </TableCell>
      </TableRow>
    ))}
  </>
);

export const TableEmptyState = ({ colSpan, message = 'Chưa có dữ liệu.' }: {
  colSpan: number;
  message?: string;
}) => (
  <TableRow>
    <TableCell colSpan={colSpan} className="text-center py-12 text-slate-500 dark:text-slate-400">
      {message}
    </TableCell>
  </TableRow>
);

export const AdminPageHeader = ({
  title,
  description,
  addHref,
  addLabel = 'Thêm mới',
  addIcon,
  onAdd,
  children,
}: {
  title: string;
  description?: string;
  /** Dùng khi nút điều hướng sang trang tạo mới */
  addHref?: string;
  addLabel?: string;
  /** Override icon mặc định (Plus) */
  addIcon?: React.ReactNode;
  /** Dùng khi nút mở modal/dialog thay vì navigate */
  onAdd?: () => void;
  children?: React.ReactNode;
}) => {
  const icon = addIcon ?? <Plus size={14} className="stroke-[2.5]" />;
  const addButton = addHref ? (
    <Link
      href={addHref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.98]",
        "bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-xs shrink-0",
        "h-8 px-3 py-1.5"
      )}
    >
      {icon}
      <span>{addLabel}</span>
    </Link>
  ) : onAdd ? (
    <Button className="gap-1.5 h-8 px-3 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 shrink-0 active:scale-[0.98]" onClick={onAdd}>
      {icon}
      <span>{addLabel}</span>
    </Button>
  ) : null;

  return (
    <div className="flex justify-between items-center mb-1.5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      <div className="flex gap-2">
        {children}
        {addButton}
      </div>
    </div>
  );
};

export const AdminPageLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-1">{children}</div>
);

export { AdminStickyFooter, type AdminStickyFooterProps } from './AdminStickyFooter';
export { AdminSaveButton, type AdminSaveButtonProps } from './AdminSaveButton';

/* ==========================================================================
   Row Action Components (International Best Practice Design)
   ========================================================================== */

export type RowActionConfig = {
  key?: string;
  type?: 'edit' | 'delete' | 'view' | 'custom';
  label?: string;
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: 'ghost' | 'destructive' | 'outline' | 'default';
  className?: string;
  disabled?: boolean;
};

export const RowActions = ({
  children,
  className,
  actions,
}: {
  children?: React.ReactNode;
  className?: string;
  actions?: RowActionConfig[];
}) => (
  <div className={cn("flex items-center justify-end gap-1", className)}>
    {actions
      ? actions.map((act, i) => {
          const key = act.key ?? `act-${i}`;
          if (act.type === 'edit' || (act.href && !act.type)) {
            return <EditActionButton key={key} href={act.href} onClick={act.onClick} title={act.label} disabled={act.disabled} className={act.className} />;
          }
          if (act.type === 'delete') {
            return <DeleteActionButton key={key} onClick={act.onClick} title={act.label} disabled={act.disabled} className={act.className} />;
          }
          if (act.type === 'view') {
            return <ViewActionButton key={key} href={act.href} onClick={act.onClick} title={act.label} disabled={act.disabled} className={act.className} />;
          }
          return (
            <RowActionButton
              key={key}
              href={act.href}
              onClick={act.onClick}
              title={act.label ?? 'Thao tác'}
              icon={act.icon}
              variant={act.variant}
              disabled={act.disabled}
              className={act.className}
            />
          );
        })
      : children}
  </div>
);

export const RowActionButton = ({
  icon,
  title,
  href,
  onClick,
  variant = 'ghost',
  disabled = false,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  href?: string;
  onClick?: () => void;
  variant?: 'ghost' | 'destructive' | 'outline' | 'default';
  disabled?: boolean;
  className?: string;
}) => {
  const baseClasses = cn(
    "inline-flex items-center justify-center h-8 w-8 rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 select-none",
    disabled ? "opacity-40 cursor-not-allowed pointer-events-none" : "cursor-pointer",
    variant === 'ghost' && "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800",
    variant === 'destructive' && "text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40",
    variant === 'outline' && "border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
    variant === 'default' && "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900",
    className
  );

  if (href && !disabled) {
    return (
      <Link href={href} title={title} aria-label={title} className={baseClasses}>
        {icon}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} title={title} aria-label={title} disabled={disabled} className={baseClasses}>
      {icon}
    </button>
  );
};

export const EditActionButton = ({
  href,
  onClick,
  title = 'Chỉnh sửa',
  disabled,
  className,
}: {
  href?: string;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  className?: string;
}) => (
  <RowActionButton
    href={href}
    onClick={onClick}
    title={title}
    disabled={disabled}
    icon={<Edit size={16} />}
    className={cn("text-slate-600 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/30", className)}
  />
);

export const DeleteActionButton = ({
  onClick,
  title = 'Xóa',
  disabled,
  className,
}: {
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  className?: string;
}) => (
  <RowActionButton
    onClick={onClick}
    title={title}
    disabled={disabled}
    variant="destructive"
    icon={<Trash2 size={16} />}
    className={className}
  />
);

export const ViewActionButton = ({
  href,
  onClick,
  title = 'Xem chi tiết',
  disabled,
  className,
}: {
  href?: string;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  className?: string;
}) => (
  <RowActionButton
    href={href}
    onClick={onClick}
    title={title}
    disabled={disabled}
    icon={<Eye size={16} />}
    className={cn("text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800", className)}
  />
);

/* ==========================================================================
   Responsive Mobile Card Components (Vercel / Shopify UX Pattern)
   ========================================================================== */

export const MobileRowCard = ({
  dragHandle,
  checkbox,
  title,
  subtitle,
  badge,
  details,
  actions,
  selected = false,
  className,
}: {
  dragHandle?: React.ReactNode;
  checkbox?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  details?: React.ReactNode;
  actions?: React.ReactNode;
  selected?: boolean;
  className?: string;
}) => (
  <div
    className={cn(
      "p-3.5 flex flex-col gap-2 transition-colors border-b border-slate-100 dark:border-slate-800/80 text-sm",
      selected ? "bg-blue-50/40 dark:bg-blue-950/20" : "bg-white dark:bg-slate-900",
      className
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        {dragHandle}
        {checkbox}
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 dark:text-slate-100 truncate text-sm">
            {title}
          </div>
          {subtitle && <div className="mt-0.5">{subtitle}</div>}
        </div>
      </div>
      {badge && <div className="shrink-0">{badge}</div>}
    </div>

    {details && (
      <div className="pl-6 text-xs text-slate-500 dark:text-slate-400 space-y-1">
        {details}
      </div>
    )}

    {actions && (
      <div className="flex items-center justify-end border-t border-slate-100 dark:border-slate-800/60 pt-2 mt-0.5">
        {actions}
      </div>
    )}
  </div>
);

export const MobileCardList = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("md:hidden divide-y divide-slate-100 dark:divide-slate-800 border-b border-slate-100 dark:border-slate-800", className)}>
    {children}
  </div>
);


