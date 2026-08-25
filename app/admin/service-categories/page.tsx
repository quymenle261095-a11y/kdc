'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Edit, FolderTree, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, buildOrderUpdates, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellControls, TableEmptyState, TableHeadControls, TableToolbar, useAdminDndSensors, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';

export default function ServiceCategoriesListPage() {
  return (
    <ModuleGuard moduleKey="services">
      <ServiceCategoriesContent />
    </ModuleGuard>
  );
}

function ServiceCategoriesContent() {
  const categoriesData = useQuery(api.serviceCategories.listAll, {});
  const servicesData = useQuery(api.services.listAll, {});
  const deleteCategory = useMutation(api.serviceCategories.remove);
  const reorderCategories = useMutation(api.serviceCategories.reorder);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: 'order' });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_service_categories_visible_columns');
  const [selectedIds, setSelectedIds] = useState<Id<"serviceCategories">[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"serviceCategories"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const dndSensors = useAdminDndSensors();

  const deleteInfo = useQuery(
    api.serviceCategories.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const isLoading = categoriesData === undefined || servicesData === undefined;

  const serviceCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    servicesData?.forEach(service => {
      map[service.categoryId] = (map[service.categoryId] || 0) + 1;
    });
    return map;
  }, [servicesData]);

  const categories = useMemo(() => categoriesData?.map(cat => ({
      ...cat,
      id: cat._id,
      count: serviceCountMap[cat._id] || 0,
    })) ?? [], [categoriesData, serviceCountMap]);

  const columns = [
    { key: 'select', label: 'Chọn', required: true },
    { key: 'drag', label: 'Kéo', required: true },
    { key: 'name', label: 'Tên danh mục', required: true },
    { key: 'slug', label: 'Slug' },
    { key: 'count', label: 'Số dịch vụ' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Hành động', required: true }
  ];
  const resolvedVisibleColumns = Array.from(new Set([
    ...columns.filter(c => c.required).map(c => c.key),
    ...visibleColumns.filter(key => columns.some(col => col.key === key)),
  ]));

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
  };

  const filteredData = useMemo(() => {
    let data = [...categories];
    if (searchTerm) {
      data = data.filter(cat => cat.name.toLowerCase().includes(searchTerm.toLowerCase()) || cat.slug.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return data;
  }, [categories, searchTerm]);

  const sortedData = useSortableData(filteredData, sortConfig);
  const isReorderEnabled = !searchTerm.trim() && (sortConfig.key === null || sortConfig.key === 'order');

  const toggleSelectAll = () =>{  setSelectedIds(selectedIds.length === sortedData.length ? [] : sortedData.map(item => item.id as Id<"serviceCategories">)); };
  const toggleSelectItem = (id: Id<"serviceCategories">) =>{  setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  const handleDelete = async (id: Id<"serviceCategories">) => {
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
    } catch {
      toast.error('Không thể xóa danh mục');
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
        setSelectedIds([]);
        toast.success(`Đã xóa ${selectedIds.length} danh mục`);
      } catch {
        toast.error('Không thể xóa danh mục');
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(sortedData, event.active.id, event.over?.id, item => item.id);
    if (!reordered) {return;}

    try {
      await reorderCategories({
        items: buildOrderUpdates(
          reordered,
          sortedData.map(item => item.order),
          item => item.id as Id<"serviceCategories">,
          (_item, index) => index
        ),
      });
      setSortConfig({ direction: 'asc', key: 'order' });
      toast.success('Đã cập nhật thứ tự danh mục');
    } catch {
      toast.error('Không thể cập nhật thứ tự danh mục');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Danh mục dịch vụ"
        description="Quản lý phân loại dịch vụ"
        addHref="/admin/service-categories/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="danh mục dịch vụ"
        selectionScope={selectedIds.length === sortedData.length ? 'all_results' : 'partial'}
        pageItemCount={sortedData.length}
        totalMatchingCount={sortedData.length}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds([])}
      />

        <Card>
        <TableToolbar
          activeFilterCount={0}
          onResetFilters={() => setSearchTerm('')}
          search={
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm kiếm danh mục..."
            />
          }
          filters={
            <>
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim())} onReset={() => setSearchTerm('')} />
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
              <TableHeader>
                <TableRow>
                  <TableHeadControls
                    showDrag={resolvedVisibleColumns.includes('drag')}
                    showSelect={resolvedVisibleColumns.includes('select')}
                    checked={selectedIds.length === sortedData.length && sortedData.length > 0}
                    onChange={toggleSelectAll}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < sortedData.length}
                  />
                  {resolvedVisibleColumns.includes('name') && <SortableHeader label="Tên danh mục" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />}
                  {resolvedVisibleColumns.includes('slug') && <SortableHeader label="Slug" sortKey="slug" sortConfig={sortConfig} onSort={handleSort} />}
                  {resolvedVisibleColumns.includes('count') && <SortableHeader label="Số dịch vụ" sortKey="count" sortConfig={sortConfig} onSort={handleSort} className="text-center" />}
                  {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="active" sortConfig={sortConfig} onSort={handleSort} />}
                  {resolvedVisibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
                </TableRow>
              </TableHeader>
              <SortableContext items={sortedData.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {sortedData.map(cat => (
                  <SortableTableRow key={cat.id} id={cat.id} disabled={!isReorderEnabled} selected={selectedIds.includes(cat.id)} selectedClassName="bg-teal-500/5">
                    {({ attributes, disabled, listeners }) => (
                      <>
                    <TableCellControls
                      showDrag={resolvedVisibleColumns.includes('drag')}
                      showSelect={resolvedVisibleColumns.includes('select')}
                      checked={selectedIds.includes(cat.id)}
                      onChange={() => { toggleSelectItem(cat.id as Id<"serviceCategories">); }}
                      attributes={attributes}
                      dragDisabled={disabled}
                      listeners={listeners}
                    />
                    {resolvedVisibleColumns.includes('name') && <TableCell className="font-medium">{cat.name}</TableCell>}
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
                          <EditActionButton href={`/admin/service-categories/${cat.id}/edit`} />
                          <DeleteActionButton onClick={async () => handleDelete(cat.id as Id<"serviceCategories">)} />
                        </RowActions>
                      </TableCell>
                    )}
                      </>
                    )}
                  </SortableTableRow>
                ))}
                {sortedData.length === 0 && (
                  <TableEmptyState colSpan={resolvedVisibleColumns.length} message={searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có danh mục nào'} />
                )}
              </TableBody>
              </SortableContext>
            </Table>
          </div>

          {/* Mobile View */}
          <MobileCardList>
            {sortedData.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có danh mục nào'}
              </div>
            ) : (
              sortedData.map(cat => (
                <MobileRowCard
                  key={cat.id}
                  selected={selectedIds.includes(cat.id)}
                  checkbox={<SelectCheckbox checked={selectedIds.includes(cat.id)} onChange={() => toggleSelectItem(cat.id)} />}
                  title={cat.name}
                  subtitle={<span className="font-mono text-xs text-slate-400">{cat.slug}</span>}
                  badge={<Badge variant={cat.active ? 'success' : 'secondary'}>{cat.active ? 'Hiện' : 'Ẩn'}</Badge>}
                  details={<div><span className="text-slate-400">Số dịch vụ:</span> {cat.count}</div>}
                  actions={
                    <RowActions>
                      <EditActionButton href={`/admin/service-categories/${cat.id}/edit`} />
                      <DeleteActionButton onClick={async () => handleDelete(cat.id as Id<"serviceCategories">)} />
                    </RowActions>
                  }
                />
              ))
            )}
          </MobileCardList>
          </DndContext>
          {sortedData.length > 0 && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
              Hiển thị {sortedData.length} / {categories.length} danh mục
            </div>
          )}
        </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa danh mục dịch vụ"
        itemName={categories.find((cat) => cat.id === deleteTargetId)?.name ?? 'danh mục'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
