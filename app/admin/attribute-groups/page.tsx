'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ChevronDown, Edit, ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAttributeIconComponent } from './_lib/iconRegistry';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, generatePaginationItems, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellControls, TableEmptyState, TableHeadControls, TableSkeleton, TableToolbar, useAdminDndSensors, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const ATTRIBUTE_GROUP_COLUMNS_STORAGE_KEY = 'admin_attribute_groups_visible_columns_v2';

const FILTER_TYPE_LABELS: Record<string, string> = {
  multiple: 'Nhiều lựa chọn',
  range: 'Khoảng giá trị',
  single: 'Một lựa chọn',
};

const INPUT_TYPE_LABELS: Record<string, string> = {
  buttons: 'Nút bấm',
  radio: 'Radio',
  select: 'Dropdown',
};

export default function AttributeGroupsListPage() {
  return (
    <ModuleGuard moduleKey="products">
      <AttributeGroupsContent />
    </ModuleGuard>
  );
}

function AttributeGroupsContent() {
  const productsData = useQuery(api.products.listAll, { limit: 1000 });
  const deleteGroup = useMutation(api.attributeGroups.remove);
  const reorderGroups = useMutation(api.attributeGroups.reorder);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const { visibleColumns, toggleColumn } = usePersistedColumns(ATTRIBUTE_GROUP_COLUMNS_STORAGE_KEY);
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"attributeGroups">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [resolvedPageSize, setPageSizeOverride] = usePersistedPageSize('admin_product_categories_page_size', 20);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"attributeGroups"> | null>(null);
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

  useEffect(() => {
    if (visibleColumns.length > 0) {
      window.localStorage.setItem(ATTRIBUTE_GROUP_COLUMNS_STORAGE_KEY, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  const offset = (currentPage - 1) * resolvedPageSize;

  const categoriesData = useQuery(api.attributeGroups.listAdminWithOffset, {
    limit: resolvedPageSize,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
  });

  const deleteInfo = useQuery(
    api.attributeGroups.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const totalCountData = useQuery(api.attributeGroups.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
  });

  const selectAllData = useQuery(
    api.attributeGroups.listAdminIds,
    isSelectAllActive
      ? { search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined }
      : 'skip'
  );

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 nhóm thuộc tính phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const categories = useMemo(() => categoriesData?.map(cat => ({
      ...cat,
      id: cat._id,
      count: 0,
    })) ?? [], [categoriesData]);
  const categoryIds = useMemo(() => categories.map(cat => cat.id as Id<"attributeGroups">), [categories]);
  const assignedTypesData = useQuery(
    api.attributeGroups.listAssignedProductTypesForGroups,
    categoryIds.length > 0 ? { groupIds: categoryIds } : 'skip'
  );
  const termCountsData = useQuery(
    api.attributeGroups.listTermCountsForGroups,
    categoryIds.length > 0 ? { groupIds: categoryIds } : 'skip'
  );
  const assignedTypesByGroup = useMemo(() => {
    const map = new Map<string, NonNullable<typeof assignedTypesData>[number]['productTypes']>();
    assignedTypesData?.forEach(row => {
      map.set(row.groupId, row.productTypes);
    });
    return map;
  }, [assignedTypesData]);
  const termCountByGroup = useMemo(() => {
    const map = new Map<string, number>();
    termCountsData?.forEach(row => {
      map.set(row.groupId, row.count);
    });
    return map;
  }, [termCountsData]);
  const isTableLoading = categoriesData === undefined || totalCountData === undefined || productsData === undefined || (categoryIds.length > 0 && (assignedTypesData === undefined || termCountsData === undefined));

  const columns = [
    { key: 'select', label: 'Chọn', required: true },
    { key: 'name', label: 'Tên nhóm thuộc tính', required: true },
    { key: 'slug', label: 'Slug' },
    { key: 'code', label: 'Mã' },
    { key: 'attributeType', label: 'Kiểu thuộc tính' },
    { key: 'termCount', label: 'Số giá trị' },
    { key: 'productTypes', label: 'Loại sản phẩm' },
    { key: 'actions', label: 'Hành động', required: true }
  ];
  const resolvedVisibleColumns = visibleColumns.length > 0 ? visibleColumns : columns.map(c => c.key);

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
  const tableColumnCount = resolvedVisibleColumns.length + 1;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"attributeGroups">[]) => {
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

  const selectedOnPage = paginatedData.filter(cat => selectedIds.includes(cat.id as Id<"attributeGroups">));
  const isPageSelected = paginatedData.length > 0 && selectedOnPage.length === paginatedData.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedData.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedData.some(cat => cat.id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedData.forEach(cat => next.add(cat.id as Id<"attributeGroups">));
    applyManualSelection(Array.from(next));
  };
  const toggleSelectItem = (id: Id<"attributeGroups">) =>{  
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDelete = async (id: Id<"attributeGroups">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteGroup({ id: deleteTargetId });
      toast.success('Đã xóa nhóm thuộc tính thành công');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa nhóm thuộc tính');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} nhóm thuộc tính đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      try {
        for (const id of selectedIds) {
          await deleteGroup({ id });
        }
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} nhóm thuộc tính`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể xóa nhóm thuộc tính');
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(paginatedData, event.active.id, event.over?.id, group => group.id);
    if (!reordered) {return;}

    try {
      await reorderGroups({
        items: buildOrderUpdates(
          reordered,
          paginatedData.map(group => group.order),
          group => group.id as Id<"attributeGroups">,
          (_group, index) => offset + index
        ),
      });
      setSortConfig({ direction: 'asc', key: null });
      toast.success('Đã cập nhật thứ tự nhóm thuộc tính');
    } catch {
      toast.error('Không thể cập nhật thứ tự nhóm thuộc tính');
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý nhóm thuộc tính"
        description="Định nghĩa thuộc tính dùng để lọc sản phẩm"
        addHref="/admin/attribute-groups/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="nhóm thuộc tính"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedData.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedData.map(cat => cat.id as Id<"attributeGroups">)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  applyManualSelection([]); }}
      />
      
      <Card>
        <TableToolbar
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm kiếm nhóm thuộc tính..."
            />
          }
          filters={
            <>
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim())} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={toggleColumn} />
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
                  showDrag
                  showSelect={resolvedVisibleColumns.includes('select')}
                  checked={isPageSelected}
                  onChange={toggleSelectAll}
                  indeterminate={isPageIndeterminate}
                />
                {resolvedVisibleColumns.includes('name') && <SortableHeader label="Tên nhóm thuộc tính" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('slug') && <SortableHeader label="Slug" sortKey="slug" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('code') && <SortableHeader label="Mã" sortKey="code" sortConfig={sortConfig} onSort={handleSort} className="w-[120px] text-center [&>div]:justify-center" />}
                {resolvedVisibleColumns.includes('attributeType') && <SortableHeader label="Kiểu thuộc tính" sortKey="filterType" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('termCount') && <TableHead className="w-[110px] text-center">Số giá trị</TableHead>}
                {resolvedVisibleColumns.includes('productTypes') && <TableHead>Loại sản phẩm</TableHead>}
                {resolvedVisibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <SortableContext items={paginatedData.map(cat => cat.id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedPageSize} cols={tableColumnCount} />
              ) : paginatedData.length === 0 ? (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có nhóm thuộc tính nào.'}
                />
              ) : (
                paginatedData.map(cat => (
                  <SortableTableRow key={cat.id} id={cat.id} disabled={!isReorderEnabled} selected={selectedIds.includes(cat.id)}>
                    {({ attributes, disabled, listeners }) => (
                      <>
                    <TableCellControls
                      showDrag
                      showSelect={resolvedVisibleColumns.includes('select')}
                      checked={selectedIds.includes(cat.id)}
                      onChange={() => { toggleSelectItem(cat.id); }}
                      attributes={attributes}
                      dragDisabled={disabled}
                      listeners={listeners}
                    />
                    {resolvedVisibleColumns.includes('name') && (
                      <TableCell className="font-medium whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComponent = getAttributeIconComponent(cat.iconPath);
                            const iconColor = cat.displayConfig?.iconColor || cat.displayConfig?.color || '#ea580c';
                            return <IconComponent size={16} style={{ color: iconColor }} />;
                          })()}
                          {cat.name}
                        </div>
                      </TableCell>
                    )}
                    {resolvedVisibleColumns.includes('slug') && <TableCell className="text-slate-500 font-mono text-sm whitespace-nowrap">{cat.slug}</TableCell>}
                    {resolvedVisibleColumns.includes('code') && (
                      <TableCell className="w-[120px] text-center whitespace-nowrap">
                        <Badge variant="secondary" className="inline-flex min-w-20 justify-center font-mono">{cat.code}</Badge>
                      </TableCell>
                    )}
                    {resolvedVisibleColumns.includes('attributeType') && (
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                            {FILTER_TYPE_LABELS[cat.filterType] ?? cat.filterType}
                          </span>
                          {cat.filterType !== 'range' && (
                            <span className="text-xs text-slate-400">
                              {INPUT_TYPE_LABELS[cat.inputType] ?? cat.inputType}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {resolvedVisibleColumns.includes('termCount') && (
                      <TableCell className="w-[110px] text-center whitespace-nowrap">
                        {cat.filterType === 'range' ? (
                          <span className="text-xs text-slate-400">Không áp dụng</span>
                        ) : (
                          <Badge variant="secondary" className="inline-flex min-w-10 justify-center">
                            {termCountByGroup.get(cat.id) ?? 0}
                          </Badge>
                        )}
                      </TableCell>
                    )}
                    {resolvedVisibleColumns.includes('productTypes') && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {(assignedTypesByGroup.get(cat.id) ?? []).slice(0, 3).map(type => (
                            <Link
                              key={type._id}
                              href={`/admin/product-types/${type._id}/edit`}
                              className="inline-flex items-center rounded-full border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:border-orange-300 hover:text-orange-700"
                            >
                              {type.name}
                            </Link>
                          ))}
                          {(assignedTypesByGroup.get(cat.id)?.length ?? 0) > 3 && (
                            <Badge variant="secondary">+{(assignedTypesByGroup.get(cat.id)?.length ?? 0) - 3}</Badge>
                          )}
                          {assignedTypesData !== undefined && (assignedTypesByGroup.get(cat.id)?.length ?? 0) === 0 && (
                            <span className="text-xs text-slate-400">Chưa gán</span>
                          )}
                        </div>
                      </TableCell>
                    )}
                    {resolvedVisibleColumns.includes('actions') && (
                      <TableCell className="text-right whitespace-nowrap">
                        <RowActions>
                          {(() => {
                            const firstType = assignedTypesByGroup.get(cat.id)?.find(type => type.active) ?? assignedTypesByGroup.get(cat.id)?.[0];
                            const href = firstType ? `/${firstType.slug}/${cat.slug}` : `/products/${cat.slug}`;
                            return (
                              <RowActionButton
                                title={firstType ? 'Mở nhóm thuộc tính ngoài site' : 'Mở trang sản phẩm với filter group'}
                                icon={<ExternalLink size={16} />}
                                onClick={() => window.open(href, '_blank')}
                              />
                            );
                          })()}
                          <EditActionButton href={`/admin/attribute-groups/${cat.id}/edit`} />
                          <DeleteActionButton onClick={async () => handleDelete(cat.id as Id<"attributeGroups">)} />
                        </RowActions>
                      </TableCell>
                    )}
                      </>
                    )}
                  </SortableTableRow>
                ))
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
              {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có nhóm thuộc tính nào.'}
            </div>
          ) : (
            paginatedData.map(cat => (
              <MobileRowCard
                key={cat.id}
                selected={selectedIds.includes(cat.id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(cat.id)} onChange={() => toggleSelectItem(cat.id)} />}
                title={
                  <span className="flex items-center gap-1.5">
                    {(() => {
                      const IconComponent = getAttributeIconComponent(cat.iconPath);
                      const iconColor = cat.displayConfig?.iconColor || cat.displayConfig?.color || '#ea580c';
                      return <IconComponent size={16} style={{ color: iconColor }} />;
                    })()}
                    {cat.name}
                  </span>
                }
                subtitle={<span className="text-xs font-mono text-slate-500">{cat.slug}</span>}
                badge={
                  <Badge variant="secondary" className="font-mono">{cat.code}</Badge>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Kiểu lọc:</span> {FILTER_TYPE_LABELS[cat.filterType] ?? cat.filterType}</div>
                    <div><span className="text-slate-400">Số giá trị:</span> {termCountByGroup.get(cat.id) ?? 0}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    {(() => {
                      const firstType = assignedTypesByGroup.get(cat.id)?.find(type => type.active) ?? assignedTypesByGroup.get(cat.id)?.[0];
                      const href = firstType ? `/${firstType.slug}/${cat.slug}` : `/products/${cat.slug}`;
                      return (
                        <RowActionButton
                          title={firstType ? 'Mở nhóm thuộc tính ngoài site' : 'Mở trang sản phẩm với filter group'}
                          icon={<ExternalLink size={16} />}
                          onClick={() => window.open(href, '_blank')}
                        />
                      );
                    })()}
                    <EditActionButton href={`/admin/attribute-groups/${cat.id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(cat.id as Id<"attributeGroups">)} />
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
          entityLabel="nhóm thuộc tính"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa nhóm thuộc tính"
        itemName={categories.find((cat) => cat.id === deleteTargetId)?.name ?? 'nhóm thuộc tính'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
