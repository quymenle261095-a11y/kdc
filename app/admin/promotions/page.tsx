'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { Check, ChevronDown, Copy, Edit, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellControls, TableEmptyState, TableHeadControls, TableSkeleton, TableToolbar, useAdminDndSensors, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const MODULE_KEY = 'promotions';

export default function PromotionsListPage() {
  return (
    <ModuleGuard moduleKey="promotions">
      <PromotionsContent />
    </ModuleGuard>
  );
}

function PromotionsContent() {
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });
  const deletePromotion = useMutation(api.promotions.remove);
  const reorderPromotions = useMutation(api.promotions.reorder);
  
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Active' | 'Inactive' | 'Expired' | 'Scheduled'>('');
  const [filterType, setFilterType] = useState<'' | 'percent' | 'fixed' | 'buy_x_get_y' | 'buy_a_get_b' | 'tiered' | 'free_shipping' | 'gift'>('');
  const [filterPromotionType, setFilterPromotionType] = useState<'' | 'coupon' | 'campaign' | 'flash_sale' | 'bundle' | 'loyalty'>('');
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_promotions_visible_columns');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"promotions">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"promotions"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const dndSensors = useAdminDndSensors();

  const isSelectAllActive = selectionMode === 'all';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);



  const promotionsPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'promotionsPerPage');
    return (setting?.value as number) || 20;
  }, [settingsData]);

  const [resolvedPromotionsPerPage, setPageSizeOverride] = usePersistedPageSize('admin_promotions_page_size', promotionsPerPage);
  const offset = (currentPage - 1) * resolvedPromotionsPerPage;

  const promotionsData = useQuery(api.promotions.listAdminWithOffset, {
    limit: resolvedPromotionsPerPage,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    promotionType: filterPromotionType || undefined,
    status: filterStatus || undefined,
    discountType: filterType || undefined,
  }) as Doc<'promotions'>[] | undefined;

  const deleteInfo = useQuery(
    api.promotions.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const totalCountData = useQuery(api.promotions.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    promotionType: filterPromotionType || undefined,
    status: filterStatus || undefined,
    discountType: filterType || undefined,
  });

  const selectAllData = useQuery(
    api.promotions.listAdminIds,
    isSelectAllActive
      ? {
          search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
          promotionType: filterPromotionType || undefined,
          status: filterStatus || undefined,
          discountType: filterType || undefined,
        }
      : 'skip'
  );

  const isTableLoading = promotionsData === undefined || totalCountData === undefined;

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 khuyến mãi phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  // Get enabled features from system config
  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach(f => { features[f.featureKey] = f.enabled; });
    return features;
  }, [featuresData]);

  const promotions = useMemo(() => promotionsData?.map(p => ({
      ...p,
      id: p._id,
    })) ?? [], [promotionsData]);

  const columns = useMemo(() => {
    const cols = [
      { key: 'select', label: 'Chọn', required: true },
      { key: 'name', label: 'Tên / Mã', required: true },
      { key: 'promotionType', label: 'Loại khuyến mãi' },
      { key: 'discount', label: 'Giảm giá' },
    ];
    if (enabledFeatures.enableSchedule) {cols.push({ key: 'schedule', label: 'Thời gian' });}
    if (enabledFeatures.enableUsageLimit) {cols.push({ key: 'usage', label: 'Đã dùng' });}
    cols.push({ key: 'status', label: 'Trạng thái' });
    cols.push({ key: 'actions', label: 'Hành động', required: true });
    return cols;
  }, [enabledFeatures]);
  const resolvedVisibleColumns = visibleColumns.length > 0 ? visibleColumns : columns.map(c => c.key);

  const sortedPromotions = useSortableData(promotions, sortConfig);
  const isReorderEnabled = !debouncedSearchTerm.trim() && !filterStatus && !filterType && !filterPromotionType && (sortConfig.key === null || sortConfig.key === 'order');

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedPromotionsPerPage) : 1;
  const paginatedPromotions = sortedPromotions;
  const tableColumnCount = resolvedVisibleColumns.length + 1;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"promotions">[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterStatus('');
    setFilterType('');
    setFilterPromotionType('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const handleFilterChange = (type: 'status' | 'type' | 'promotionType', value: string) => {
    if (type === 'status') {setFilterStatus(value as '' | 'Active' | 'Inactive' | 'Expired' | 'Scheduled');}
    else if (type === 'type') {setFilterType(value as '' | 'percent' | 'fixed' | 'buy_x_get_y' | 'buy_a_get_b' | 'tiered' | 'free_shipping' | 'gift');}
    else {setFilterPromotionType(value as '' | 'coupon' | 'campaign' | 'flash_sale' | 'bundle' | 'loyalty');}
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedPromotions.filter(promo => selectedIds.includes(promo._id));
  const isPageSelected = paginatedPromotions.length > 0 && selectedOnPage.length === paginatedPromotions.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedPromotions.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedPromotions.some(promo => promo._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedPromotions.forEach(promo => next.add(promo._id));
    applyManualSelection(Array.from(next));
  };
  const toggleSelectItem = (id: Id<"promotions">) =>{  
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  // TICKET #10 FIX: Show detailed error message
  const handleDelete = async (id: Id<"promotions">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deletePromotion({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa khuyến mãi');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi khi xóa khuyến mãi');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  // HIGH-006 FIX: Dùng Promise.all thay vì sequential
  // TICKET #10 FIX: Show detailed error message
  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} khuyến mãi đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      try {
        await Promise.all(selectedIds.map( async id => deletePromotion({ cascade: true, id })));
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} khuyến mãi`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Có lỗi khi xóa khuyến mãi');
      }
    }
  };

  // TICKET #12 FIX: Handle clipboard API errors
  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success('Đã copy mã voucher');
      setTimeout(() =>{  setCopiedCode(null); }, 2000);
    } catch {
      toast.error('Không thể copy, vui lòng copy thủ công');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(paginatedPromotions, event.active.id, event.over?.id, promo => promo._id);
    if (!reordered) {return;}

    try {
      await reorderPromotions({
        items: buildOrderUpdates(
          reordered,
          paginatedPromotions.map(promo => promo.order),
          promo => promo._id,
          (_promo, index) => offset + index
        ),
      });
      setSortConfig({ direction: 'asc', key: null });
      toast.success('Đã cập nhật thứ tự khuyến mãi');
    } catch {
      toast.error('Không thể cập nhật thứ tự khuyến mãi');
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(price);
  
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) {return '-';}
    return new Date(timestamp).toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': {
        return <Badge variant="success" className="whitespace-nowrap">Hoạt động</Badge>;
      }
      case 'Inactive': {
        return <Badge variant="secondary" className="whitespace-nowrap">Tạm dừng</Badge>;
      }
      case 'Expired': {
        return <Badge variant="destructive" className="whitespace-nowrap">Hết hạn</Badge>;
      }
      case 'Scheduled': {
        return <Badge variant="warning" className="whitespace-nowrap">Chờ kích hoạt</Badge>;
      }
      default: {
        return <Badge variant="outline" className="whitespace-nowrap">{status}</Badge>;
      }
    }
  };

  const getPromotionTypeLabel = (type?: string) => {
    switch (type) {
      case 'coupon': return 'Coupon';
      case 'campaign': return 'Chương trình';
      case 'flash_sale': return 'Flash sale';
      case 'bundle': return 'Combo';
      case 'loyalty': return 'Loyalty';
      default: return type ?? 'Campaign';
    }
  };

  const getDiscountTypeLabel = (type: string) => {
    switch (type) {
      case 'percent': return 'Giảm %';
      case 'fixed': return 'Giảm cố định';
      case 'buy_x_get_y': return 'Mua X tặng Y';
      case 'buy_a_get_b': return 'Mua A tặng B';
      case 'tiered': return 'Giảm theo bậc';
      case 'free_shipping': return 'Free ship';
      case 'gift': return 'Tặng quà';
      default: return type;
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Khuyến mãi"
        description="Quản lý voucher và mã giảm giá"
        addHref="/admin/promotions/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="khuyến mãi"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedPromotions.length}
        totalMatchingCount={totalCount}
        onSelectPage={() => { applyManualSelection(paginatedPromotions.map(promo => promo._id)); }}
        onSelectAllResults={() => { setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        actions={[
          {
            key: 'delete',
            icon: <Trash2 size={14} />,
            label: 'Xóa',
            loadingLabel: 'Đang xóa...',
            variant: 'destructive',
            onClick: handleBulkDelete,
          },
        ]}
        onClearSelection={() => { applyManualSelection([]); }}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterStatus), Boolean(filterPromotionType), Boolean(filterType)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm tên, mã voucher..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => handleFilterChange('status', val)}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'Active', label: 'Hoạt động' },
                  { value: 'Inactive', label: 'Tạm dừng' },
                  { value: 'Expired', label: 'Hết hạn' },
                  { value: 'Scheduled', label: 'Chờ kích hoạt' },
                ]}
              />
              <FilterSelect
                label="Loại khuyến mãi"
                value={filterPromotionType}
                onChange={(val) => handleFilterChange('promotionType', val)}
                placeholder="Loại giảm giá"
                options={[
                  { value: 'coupon', label: 'Coupon nhập mã' },
                ]}
              />
              <FilterSelect
                label="Hình thức giảm giá"
                value={filterType}
                onChange={(val) => handleFilterChange('type', val)}
                placeholder="Cách giảm"
                options={[
                  { value: 'percent', label: 'Giảm theo %' },
                  { value: 'fixed', label: 'Giảm cố định' },
                  { value: 'free_shipping', label: 'Miễn phí ship' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterStatus || filterPromotionType || filterType)} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={(key) => toggleColumn(key, columns.map(c => c.key))} />
            </>
          }
        />
        {!isReorderEnabled && (
          <div className="px-4 py-3 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
            Tắt tìm kiếm/lọc và quay về thứ tự mặc định để kéo thả đổi vị trí.
          </div>
        )}
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Desktop Data Table View (md:block) */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
            <TableRow>
              <TableHeadControls
                showDrag
                showSelect={resolvedVisibleColumns.includes('select')}
                checked={isPageSelected}
                onChange={toggleSelectAll}
                indeterminate={isPageIndeterminate}
              />
              {resolvedVisibleColumns.includes('name') && <SortableHeader label="Tên / Mã" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />}
              {resolvedVisibleColumns.includes('promotionType') && <SortableHeader label="Loại KM" sortKey="promotionType" sortConfig={sortConfig} onSort={handleSort} />}
              {resolvedVisibleColumns.includes('discount') && <SortableHeader label="Giảm giá" sortKey="discountValue" sortConfig={sortConfig} onSort={handleSort} />}
              {resolvedVisibleColumns.includes('schedule') && enabledFeatures.enableSchedule && <SortableHeader label="Thời gian" sortKey="startDate" sortConfig={sortConfig} onSort={handleSort} />}
              {resolvedVisibleColumns.includes('usage') && enabledFeatures.enableUsageLimit && <SortableHeader label="Đã dùng" sortKey="usedCount" sortConfig={sortConfig} onSort={handleSort} />}
              {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />}
              {resolvedVisibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
            </TableRow>
          </TableHeader>
          <SortableContext items={paginatedPromotions.map(promo => promo._id)} strategy={verticalListSortingStrategy}>
          <TableBody>
            {isTableLoading ? (
              <TableSkeleton rows={resolvedPromotionsPerPage} cols={tableColumnCount} />
            ) : (
              <>
                {paginatedPromotions.map(promo => (
                  <SortableTableRow key={promo._id} id={promo._id} disabled={!isReorderEnabled} selected={selectedIds.includes(promo._id)} selectedClassName="bg-slate-500/10">
                    {({ attributes, disabled, listeners }) => (
                      <>
                <TableCellControls
                  showDrag
                  showSelect={resolvedVisibleColumns.includes('select')}
                  checked={selectedIds.includes(promo._id)}
                  onChange={() => { toggleSelectItem(promo._id); }}
                  attributes={attributes}
                  dragDisabled={disabled}
                  listeners={listeners}
                />
                {resolvedVisibleColumns.includes('name') && (
                  <TableCell>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{promo.name}</p>
                      {promo.code ? (
                        <div className="flex items-center gap-1 mt-1">
                          <code className="text-xs text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/50 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">{promo.code}</code>
                          <button 
                            onClick={ async () => {
                              const promoCode = promo.code;
                              if (!promoCode) {return;}
                              await copyCode(promoCode);
                            }}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded shrink-0"
                            title="Copy mã"
                          >
                            {copiedCode === promo.code ? <Check size={12} className="text-green-500" /> : <Copy size={12} className="text-slate-400" />}
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 mt-1 whitespace-nowrap">Tự động áp dụng</p>
                      )}
                    </div>
                </TableCell>
                )}
                {resolvedVisibleColumns.includes('promotionType') && (
                  <TableCell>
                    <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 whitespace-nowrap">
                      {getPromotionTypeLabel(promo.promotionType ?? 'campaign')}
                    </Badge>
                  </TableCell>
                )}
                {resolvedVisibleColumns.includes('discount') && (
                  <TableCell className="whitespace-nowrap">
                  {promo.discountType === 'percent' ? (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 whitespace-nowrap">
                      -{promo.discountValue ?? 0}%
                      {enabledFeatures.enableMaxDiscount && promo.maxDiscountAmount && (
                        <span className="text-xs ml-1">(max {formatPrice(promo.maxDiscountAmount)})</span>
                      )}
                    </Badge>
                  ) : promo.discountType === 'fixed' ? (
                    <Badge variant="secondary" className="bg-cyan-500/10 text-cyan-600 whitespace-nowrap">
                      -{formatPrice(promo.discountValue ?? 0)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-500/10 text-slate-600 whitespace-nowrap">
                      {getDiscountTypeLabel(promo.discountType)}
                    </Badge>
                  )}
                  {enabledFeatures.enableMinOrder && promo.minOrderAmount && (
                    <p className="text-xs text-slate-500 mt-1 whitespace-nowrap">Đơn tối thiểu: {formatPrice(promo.minOrderAmount)}</p>
                  )}
                  </TableCell>
                )}
                {resolvedVisibleColumns.includes('schedule') && enabledFeatures.enableSchedule && (
                  <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                    {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                  </TableCell>
                )}
                {resolvedVisibleColumns.includes('usage') && enabledFeatures.enableUsageLimit && (
                  <TableCell className="whitespace-nowrap">
                    {promo.usageLimit ? (
                      <span className={promo.usedCount >= promo.usageLimit ? 'text-red-500 font-medium' : ''}>
                        {promo.usedCount}/{promo.usageLimit}
                      </span>
                    ) : (
                      <span className="text-slate-500">{promo.usedCount}</span>
                    )}
                  </TableCell>
                )}
                {resolvedVisibleColumns.includes('status') && <TableCell className="whitespace-nowrap">{getStatusBadge(promo.status)}</TableCell>}
                {resolvedVisibleColumns.includes('actions') && (
                  <TableCell className="text-right">
                    <RowActions>
                      <EditActionButton href={`/admin/promotions/${promo._id}/edit`} />
                      <DeleteActionButton onClick={async () => handleDelete(promo._id)} />
                    </RowActions>
                  </TableCell>
                )}
                      </>
                    )}
                  </SortableTableRow>
                ))}
              </>
            )}
            {!isTableLoading && paginatedPromotions.length === 0 && (
              <TableEmptyState
                colSpan={tableColumnCount}
                message={searchTerm || filterStatus || filterType ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có khuyến mãi nào.'}
              />
            )}
          </TableBody>
          </SortableContext>
          </Table>
        </div>

        {/* Mobile Responsive Card List View (md:hidden) — Chuẩn Vercel / Shopify UX */}
        <MobileCardList>
          {isTableLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : paginatedPromotions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus || filterType ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có khuyến mãi nào.'}
            </div>
          ) : (
            paginatedPromotions.map((promo) => (
              <MobileRowCard
                key={promo._id}
                selected={selectedIds.includes(promo._id)}
                checkbox={
                  resolvedVisibleColumns.includes('select') && (
                    <SelectCheckbox
                      checked={selectedIds.includes(promo._id)}
                      onChange={() => toggleSelectItem(promo._id)}
                    />
                  )
                }
                title={promo.name}
                subtitle={
                  promo.code ? (
                    <div className="flex items-center gap-1">
                      <code className="text-xs text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-900/50 px-1.5 py-0.5 rounded font-mono">
                        {promo.code}
                      </code>
                      <button
                        onClick={() => promo.code && copyCode(promo.code)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded shrink-0"
                        title="Copy mã"
                      >
                        {copiedCode === promo.code ? (
                          <Check size={12} className="text-green-500" />
                        ) : (
                          <Copy size={12} className="text-slate-400" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Tự động áp dụng</span>
                  )
                }
                badge={getStatusBadge(promo.status)}
                details={
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400">Loại:</span>
                      <Badge variant="secondary" className="bg-rose-500/10 text-rose-600 text-[11px]">
                        {getPromotionTypeLabel(promo.promotionType)}
                      </Badge>
                      <span className="text-slate-400">•</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {promo.discountType === 'percent'
                          ? `-${promo.discountValue}%`
                          : promo.discountType === 'fixed'
                          ? `-${formatPrice(promo.discountValue ?? 0)}`
                          : getDiscountTypeLabel(promo.discountType)}
                      </span>
                    </div>
                    {enabledFeatures.enableSchedule && (promo.startDate || promo.endDate) && (
                      <div>
                        <span className="text-slate-400">Thời gian:</span> {formatDate(promo.startDate)} - {formatDate(promo.endDate)}
                      </div>
                    )}
                    {enabledFeatures.enableUsageLimit && (
                      <div>
                        <span className="text-slate-400">Đã dùng:</span>{' '}
                        {promo.usageLimit ? `${promo.usedCount}/${promo.usageLimit}` : promo.usedCount}
                      </div>
                    )}
                  </div>
                }
                actions={
                  <RowActions>
                    <EditActionButton href={`/admin/promotions/${promo._id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(promo._id)} />
                  </RowActions>
                }
              />
            ))
          )}
        </MobileCardList>
        </DndContext>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={resolvedPromotionsPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="khuyến mãi"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa khuyến mãi"
        itemName={promotions.find((promo) => promo.id === deleteTargetId)?.name ?? 'khuyến mãi'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
