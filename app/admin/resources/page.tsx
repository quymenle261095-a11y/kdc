'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { Copy, Edit, ExternalLink, FileText, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { ModuleGuard } from '../components/ModuleGuard';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, DeleteActionButton, EditActionButton, FilterSelect, generatePaginationItems, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableTableRow, TableCellControls, TableCellThumbnail, TableEmptyState, TableHeadControls, TableHeadThumbnail, TableSkeleton, TableToolbar, useAdminDndSensors } from '../components/TableUtilities';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

type ResourceStatus = '' | 'Published' | 'Draft';

const formatPrice = (pricingType: string, price?: number) => {
  if (pricingType === 'free') {return 'Miễn phí';}
  if (pricingType === 'contact') {return 'Liên hệ';}
  if (!price) {return '-';}
  return new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(price);
};

export default function ResourcesListPage() {
  return (
    <ModuleGuard moduleKey="resources">
      <ResourcesContent />
    </ModuleGuard>
  );
}

function ResourcesContent() {
  const categoriesData = useQuery(api.resourceCategories.listAll, {});
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: 'resources' });
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: 'resources' });
  const deleteResource = useMutation(api.resources.remove);
  const duplicateResource = useMutation(api.resources.duplicate);
  const bulkClearBrokenMedia = useMutation(api.resources.bulkClearBrokenMedia);
  const reorderResources = useMutation(api.resources.reorder);

  const enabledFields = useMemo(() => new Set(fieldsData?.map((field) => field.fieldKey) ?? []), [fieldsData]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ResourceStatus>('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<'resources'>[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<'resources'> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [cloningResourceId, setCloningResourceId] = useState<Id<'resources'> | null>(null);
  const [isClearingMedia, setIsClearingMedia] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dndSensors = useAdminDndSensors();
  const isSelectAllActive = selectionMode === 'all';

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 300);
    return () => { clearTimeout(timer); };
  }, [searchTerm]);

  const defaultPageSize = useMemo(() => {
    const setting = settingsData?.find((item) => item.settingKey === 'resourcesPerPage');
    return (setting?.value as number) || 10;
  }, [settingsData]);
  const [pageSize, setPageSizeOverride] = usePersistedPageSize('admin_resources_page_size', defaultPageSize);
  const offset = (currentPage - 1) * pageSize;

  const resourcesData = useQuery(api.resources.listAdminWithOffset, {
    limit: pageSize,
    offset,
    search: debouncedSearchTerm.trim() || undefined,
    status: filterStatus || undefined,
  });
  const totalCountData = useQuery(api.resources.countAdmin, {
    search: debouncedSearchTerm.trim() || undefined,
    status: filterStatus || undefined,
  });
  const deleteInfo = useQuery(api.resources.getDeleteInfo, deleteTargetId ? { id: deleteTargetId } : 'skip');

  const selectAllData = useQuery(
    api.resources.listAdminIds,
    isSelectAllActive
      ? {
          search: debouncedSearchTerm.trim() || undefined,
          status: filterStatus || undefined,
        }
      : 'skip'
  );

  const categoryMap = useMemo(() => {
    const map: Record<string, { name: string; slug: string }> = {};
    categoriesData?.forEach((category) => {
      map[category._id] = { name: category.name, slug: category.slug };
    });
    return map;
  }, [categoriesData]);

  const resources = resourcesData ?? [];
  const isLoading = resourcesData === undefined || totalCountData === undefined || categoriesData === undefined;
  const isReorderEnabled = !debouncedSearchTerm.trim() && !filterStatus;
  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;

  const selectedOnPage = resources.filter(resource => selectedIds.includes(resource._id));
  const isPageSelected = resources.length > 0 && selectedOnPage.length === resources.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < resources.length;

  const applyManualSelection = (nextIds: Id<'resources'>[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 tài nguyên phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !resources.some(resource => resource._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    resources.forEach(resource => next.add(resource._id));
    applyManualSelection(Array.from(next));
  };

  const toggleSelectItem = (id: Id<'resources'>) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const openFrontend = (slug: string, categoryId: string) => {
    const categorySlug = categoryMap[categoryId]?.slug;
    window.open(categorySlug ? `/${categorySlug}/${slug}` : `/resources/${slug}`, '_blank');
  };

  const handleDuplicateResource = async (id: Id<'resources'>) => {
    setCloningResourceId(id);
    try {
      const result = await duplicateResource({ id });
      toast.success(`Đã tạo bản sao: ${result.title}`);
    } catch {
      toast.error('Không thể copy tài nguyên');
    } finally {
      setCloningResourceId(null);
    }
  };

  const handleDelete = (id: Id<'resources'>) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteResource({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa tài nguyên');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Không thể xóa tài nguyên');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} tài nguyên đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      setIsDeleting(true);
      try {
        for (const id of selectedIds) {
          await deleteResource({ cascade: true, id });
        }
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} tài nguyên`);
      } catch {
        toast.error('Có lỗi khi xóa tài nguyên');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleBulkClearBrokenMedia = async () => {
    setIsClearingMedia(true);
    try {
      const result = await bulkClearBrokenMedia({ ids: selectedIds });
      applyManualSelection([]);
      if (result.cleared > 0) {
        toast.success(`Đã xóa ${result.cleared} ảnh lỗi trong ${result.updated} tài nguyên`);
      } else {
        toast.info('Không tìm thấy ảnh lỗi trong tài nguyên đã chọn');
      }
    } catch {
      toast.error('Có lỗi khi xóa ảnh lỗi');
    } finally {
      setIsClearingMedia(false);
    }
  };

  const handleClearBrokenMedia = async () => {
    if (resources.length === 0) {return;}
    setIsClearingMedia(true);
    try {
      const result = await bulkClearBrokenMedia({ ids: resources.map((resource) => resource._id) });
      if (result.cleared > 0) {
        toast.success(`Đã xóa ${result.cleared} ảnh lỗi`);
      } else {
        toast.info('Không tìm thấy ảnh lỗi trên trang hiện tại');
      }
    } catch {
      toast.error('Không thể quét ảnh lỗi');
    } finally {
      setIsClearingMedia(false);
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterStatus('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(resources, event.active.id, event.over?.id, resource => resource._id);
    if (!reordered) {return;}

    try {
      await reorderResources({
        items: buildOrderUpdates(
          reordered,
          resources.map(resource => resource.order),
          resource => resource._id,
          (_resource, index) => offset + index
        ),
      });
      toast.success('Đã cập nhật thứ tự tài nguyên');
    } catch {
      toast.error('Không thể cập nhật thứ tự tài nguyên');
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý tài nguyên"
        description="Ebook, template, checklist và file tải xuống"
        addHref="/admin/resources/create"
      >
        <Button variant="outline" size="sm" onClick={() => { void handleClearBrokenMedia(); }} disabled={isClearingMedia || resources.length === 0}>
          {isClearingMedia ? 'Đang quét...' : 'Dọn ảnh lỗi'}
        </Button>
      </AdminPageHeader>

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="tài nguyên"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={resources.length}
        totalMatchingCount={totalCount}
        onSelectPage={() => { applyManualSelection(resources.map(resource => resource._id)); }}
        onSelectAllResults={() => { setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onClearBrokenMedia={() => { void handleBulkClearBrokenMedia(); }}
        isClearBrokenMediaLoading={isClearingMedia}
        onDelete={handleBulkDelete}
        onClearSelection={() => { applyManualSelection([]); }}
        isLoading={isDeleting}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterStatus)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm kiếm tài nguyên..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => { setFilterStatus(val as ResourceStatus); setCurrentPage(1); applyManualSelection([]); }}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'Published', label: 'Hiện' },
                  { value: 'Draft', label: 'Ẩn' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(debouncedSearchTerm.trim() || filterStatus)} onReset={handleResetFilters} />
            </>
          }
        />

        {!isReorderEnabled && (
          <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
            Tắt tìm kiếm/lọc để kéo thả đổi vị trí.
          </div>
        )}
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                <TableHeadControls checked={isPageSelected} onChange={toggleSelectAll} indeterminate={isPageIndeterminate} />
                <TableHeadThumbnail label="Ảnh" />
                <TableHead>Tài nguyên</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Giá</TableHead>
                <TableHead>Lượt xem</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={resources.map(resource => resource._id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={pageSize} cols={9} />
              ) : resources.length === 0 ? (
                <TableEmptyState colSpan={9} message={searchTerm || filterStatus ? 'Không có tài nguyên phù hợp bộ lọc.' : 'Chưa có tài nguyên nào.'} />
              ) : resources.map((resource) => (
                <SortableTableRow key={resource._id} id={resource._id} disabled={!isReorderEnabled} selected={selectedIds.includes(resource._id)} selectedClassName="bg-cyan-500/5">
                  {({ attributes, disabled, listeners }) => (
                    <>
                  <TableCellControls
                    checked={selectedIds.includes(resource._id)}
                    onChange={() => { toggleSelectItem(resource._id); }}
                    attributes={attributes}
                    dragDisabled={disabled}
                    listeners={listeners}
                  />
                  <TableCellThumbnail src={resource.thumbnail} alt={resource.title} />
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-slate-100">{resource.title}</div>
                    {enabledFields.has('excerpt') && (
                      <div className="text-xs text-slate-500">{resource.excerpt || 'Chưa có mô tả ngắn'}</div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{categoryMap[resource.categoryId]?.name ?? 'Không có'}</TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatPrice(resource.pricingType, resource.priceAmount)}</TableCell>
                  <TableCell className="whitespace-nowrap">{resource.views.toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={resource.status === 'Published' ? 'success' : resource.status === 'Draft' ? 'secondary' : 'warning'}>
                      {resource.status === 'Published' ? 'Hiện' : resource.status === 'Draft' ? 'Ẩn' : 'Lưu trữ'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <RowActions>
                      <RowActionButton
                        title="Xem tài nguyên"
                        icon={<ExternalLink size={16} />}
                        onClick={() => { openFrontend(resource.slug, resource.categoryId); }}
                        className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                      />
                      <RowActionButton
                        title="Copy tài nguyên"
                        icon={cloningResourceId === resource._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                        onClick={() => { void handleDuplicateResource(resource._id); }}
                        disabled={cloningResourceId === resource._id}
                      />
                      <EditActionButton href={`/admin/resources/${resource._id}/edit`} />
                      <DeleteActionButton onClick={() => { handleDelete(resource._id); }} />
                    </RowActions>
                  </TableCell>
                    </>
                  )}
                </SortableTableRow>
              ))}
            </TableBody>
            </SortableContext>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : resources.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus ? 'Không có tài nguyên phù hợp bộ lọc.' : 'Chưa có tài nguyên nào.'}
            </div>
          ) : (
            resources.map(resource => (
              <MobileRowCard
                key={resource._id}
                selected={selectedIds.includes(resource._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(resource._id)} onChange={() => toggleSelectItem(resource._id)} />}
                title={resource.title}
                subtitle={<span className="text-xs text-slate-500">{categoryMap[resource.categoryId]?.name ?? 'Không có'}</span>}
                badge={
                  <Badge variant={resource.status === 'Published' ? 'success' : resource.status === 'Draft' ? 'secondary' : 'warning'}>
                    {resource.status === 'Published' ? 'Hiện' : resource.status === 'Draft' ? 'Ẩn' : 'Lưu trữ'}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Giá:</span> {formatPrice(resource.pricingType, resource.priceAmount)}</div>
                    <div><span className="text-slate-400">Lượt xem:</span> {resource.views.toLocaleString('vi-VN')}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    <RowActionButton
                      title="Xem tài nguyên"
                      icon={<ExternalLink size={16} />}
                      onClick={() => { openFrontend(resource.slug, resource.categoryId); }}
                      className="text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                    />
                    <RowActionButton
                      title="Copy tài nguyên"
                      icon={cloningResourceId === resource._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                      onClick={() => { void handleDuplicateResource(resource._id); }}
                      disabled={cloningResourceId === resource._id}
                    />
                    <EditActionButton href={`/admin/resources/${resource._id}/edit`} />
                    <DeleteActionButton onClick={() => { handleDelete(resource._id); }} />
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
          pageSize={pageSize}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="tài nguyên"
        />
      </Card>

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        title="Xóa tài nguyên"
        itemName="tài nguyên này"
        dependencies={deleteInfo?.dependencies ?? []}
        isLoading={isDeleteLoading || deleteInfo === undefined}
        onConfirm={handleConfirmDelete}
      />
    </AdminPageLayout>
  );
}
