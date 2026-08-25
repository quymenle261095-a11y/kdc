'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ChevronDown, Edit, ExternalLink, FolderTree, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellControls, TableEmptyState, TableHeadControls, TableSkeleton, TableToolbar, useAdminDndSensors, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function ProductCategoriesListPage() {
  return (
    <ModuleGuard moduleKey="products">
      <ProductCategoriesContent />
    </ModuleGuard>
  );
}

function ProductCategoriesContent() {
  const productsData = useQuery(api.products.listAll, { limit: 1000 });
  const deleteCategory = useMutation(api.productCategories.remove);
  const reorderCategories = useMutation(api.productCategories.reorder);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: 'order' });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_product_categories_visible_columns');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"productCategories">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [resolvedPageSize, setPageSizeOverride] = usePersistedPageSize('admin_product_categories_page_size', 20);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"productCategories"> | null>(null);
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



  const offset = (currentPage - 1) * resolvedPageSize;

  const categoriesData = useQuery(api.productCategories.listAdminWithOffset, {
    limit: resolvedPageSize,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
  });

  const deleteInfo = useQuery(
    api.productCategories.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const totalCountData = useQuery(api.productCategories.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
  });

  const selectAllData = useQuery(
    api.productCategories.listAdminIds,
    isSelectAllActive
      ? { search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined }
      : 'skip'
  );

  const isTableLoading = categoriesData === undefined || totalCountData === undefined || productsData === undefined;

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 danh mục phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const productCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    productsData?.forEach(product => {
      map[product.categoryId] = (map[product.categoryId] || 0) + 1;
    });
    return map;
  }, [productsData]);

  const categories = useMemo(() => categoriesData?.map(cat => ({
      ...cat,
      id: cat._id,
      count: productCountMap[cat._id] || 0,
    })) ?? [], [categoriesData, productCountMap]);

  const columns = [
    { key: 'select', label: 'Chọn', required: true },
    { key: 'drag', label: 'Kéo', required: true },
    { key: 'name', label: 'Tên danh mục', required: true },
    { key: 'slug', label: 'Slug' },
    { key: 'count', label: 'Số sản phẩm' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Hành động', required: true }
  ];
  const resolvedVisibleColumns = Array.from(new Set([
    ...columns.filter(c => c.required).map(c => c.key),
    ...(visibleColumns.length > 0 ? visibleColumns : columns.map(c => c.key)),
  ]));

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const sortedData = useSortableData(categories, sortConfig);
  const isReorderEnabled = !debouncedSearchTerm.trim() && (sortConfig.key === null || sortConfig.key === 'order');

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedPageSize) : 1;
  const paginatedData = sortedData;
  const tableColumnCount = resolvedVisibleColumns.length;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"productCategories">[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedData.filter(cat => selectedIds.includes(cat.id as Id<"productCategories">));
  const isPageSelected = paginatedData.length > 0 && selectedOnPage.length === paginatedData.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedData.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedData.some(cat => cat.id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedData.forEach(cat => next.add(cat.id as Id<"productCategories">));
    applyManualSelection(Array.from(next));
  };
  const toggleSelectItem = (id: Id<"productCategories">) =>{  
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDelete = async (id: Id<"productCategories">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteCategory({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa danh mục thành công');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa danh mục');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} danh mục đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      try {
        for (const id of selectedIds) {
          await deleteCategory({ cascade: true, id });
        }
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} danh mục`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể xóa danh mục');
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(paginatedData, event.active.id, event.over?.id, item => item.id);
    if (!reordered) {return;}

    try {
      await reorderCategories({
        items: buildOrderUpdates(
          reordered,
          paginatedData.map(item => item.order),
          item => item.id as Id<"productCategories">,
          (_item, index) => offset + index
        ),
      });
      setSortConfig({ direction: 'asc', key: 'order' });
      toast.success('Đã cập nhật thứ tự danh mục');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật thứ tự danh mục');
    }
  };

  const openFrontend = (slug: string) => {
    window.open(`/category/${slug}`, '_blank');
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Danh mục sản phẩm"
        description="Quản lý các danh mục phân loại sản phẩm"
        addHref="/admin/product-categories/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="danh mục"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedData.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedData.map(cat => cat.id as Id<"productCategories">)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  applyManualSelection([]); }}
      />
      
      <Card>
        <TableToolbar
          activeFilterCount={0}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm kiếm danh mục..."
            />
          }
          filters={
            <>
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim())} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={(key) => toggleColumn(key, columns.map(c => c.key))} />
            </>
          }
        />
        {!isReorderEnabled && (
          <div className="px-4 py-3 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
            Tắt tìm kiếm và quay về thứ tự mặc định để kéo thả đổi vị trí.
          </div>
        )}
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                <TableHeadControls
                showDrag={resolvedVisibleColumns.includes('drag')}
                showSelect={resolvedVisibleColumns.includes('select')}
                checked={isPageSelected}
                onChange={toggleSelectAll}
                indeterminate={isPageIndeterminate}
              />
                {resolvedVisibleColumns.includes('name') && <SortableHeader label="Tên danh mục" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('slug') && <SortableHeader label="Slug" sortKey="slug" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('count') && <SortableHeader label="Số sản phẩm" sortKey="count" sortConfig={sortConfig} onSort={handleSort} className="text-center" />}
                {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <SortableContext items={paginatedData.map(cat => cat.id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedPageSize} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedData.map(cat => (
                    <SortableTableRow key={cat.id} id={cat.id} disabled={!isReorderEnabled} selected={selectedIds.includes(cat.id)}>
                      {({ attributes, disabled, listeners }) => (
                        <>
                  <TableCellControls
                    showDrag={resolvedVisibleColumns.includes('drag')}
                    showSelect={resolvedVisibleColumns.includes('select')}
                    checked={selectedIds.includes(cat.id)}
                    onChange={() => { toggleSelectItem(cat.id as Id<"productCategories">); }}
                    attributes={attributes}
                    dragDisabled={disabled}
                    listeners={listeners}
                  />
                  {resolvedVisibleColumns.includes('name') && (
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FolderTree size={16} className="text-orange-500" />
                        {cat.name}
                      </div>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('slug') && <TableCell className="text-slate-500 font-mono text-sm whitespace-nowrap">{cat.slug}</TableCell>}
                  {resolvedVisibleColumns.includes('count') && <TableCell className="text-center whitespace-nowrap"><Badge variant="secondary">{cat.count}</Badge></TableCell>}
                  {resolvedVisibleColumns.includes('status') && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={cat.active ? 'success' : 'secondary'}>{cat.active ? 'Hiện' : 'Ẩn'}</Badge>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('actions') && (
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <RowActionButton
                          title="Xem trên web"
                          icon={<ExternalLink size={16} />}
                          onClick={() => openFrontend(cat.slug)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        />
                        <EditActionButton href={`/admin/product-categories/${cat.id}/edit`} />
                        <DeleteActionButton onClick={async () => handleDelete(cat.id as Id<"productCategories">)} />
                      </RowActions>
                    </TableCell>
                  )}
                        </>
                      )}
                    </SortableTableRow>
                  ))}
                </>
              )}
              {!isTableLoading && paginatedData.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có danh mục nào.'}
                />
              )}
            </TableBody>
            </SortableContext>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {isTableLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : paginatedData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có danh mục nào.'}
            </div>
          ) : (
            paginatedData.map(cat => (
              <MobileRowCard
                key={cat.id}
                selected={selectedIds.includes(cat.id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(cat.id)} onChange={() => toggleSelectItem(cat.id)} />}
                title={
                  <span className="flex items-center gap-1.5">
                    <FolderTree size={15} className="text-orange-500" />
                    {cat.name}
                  </span>
                }
                subtitle={<span className="font-mono text-xs text-slate-400">{cat.slug}</span>}
                badge={<Badge variant={cat.active ? 'success' : 'secondary'}>{cat.active ? 'Hiện' : 'Ẩn'}</Badge>}
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Số sản phẩm:</span> {cat.count}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    <RowActionButton
                      title="Xem trên web"
                      icon={<ExternalLink size={16} />}
                      onClick={() => openFrontend(cat.slug)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    />
                    <EditActionButton href={`/admin/product-categories/${cat.id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(cat.id as Id<"productCategories">)} />
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
          pageSize={resolvedPageSize}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="danh mục sản phẩm"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa danh mục sản phẩm"
        itemName={categories.find((cat) => cat.id === deleteTargetId)?.name ?? 'danh mục'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
