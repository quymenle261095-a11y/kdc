'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Edit, ExternalLink, FolderTree, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { ModuleGuard } from '../components/ModuleGuard';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, buildOrderUpdates, BulkActionBar, DeleteActionButton, EditActionButton, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellControls, TableEmptyState, TableHeadControls, TableToolbar, useAdminDndSensors, useSortableData } from '../components/TableUtilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function ResourceCategoriesListPage() {
  return (
    <ModuleGuard moduleKey="resources">
      <ResourceCategoriesContent />
    </ModuleGuard>
  );
}

function ResourceCategoriesContent() {
  const categoriesData = useQuery(api.resourceCategories.listAll, {});
  const resourcesData = useQuery(api.resources.listAll, {});
  const deleteCategory = useMutation(api.resourceCategories.remove);
  const reorderCategories = useMutation(api.resourceCategories.reorder);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: 'order' });
  const [selectedIds, setSelectedIds] = useState<Id<'resourceCategories'>[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<'resourceCategories'> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const deleteInfo = useQuery(api.resourceCategories.getDeleteInfo, deleteTargetId ? { id: deleteTargetId } : 'skip');
  const isLoading = categoriesData === undefined || resourcesData === undefined;
  const dndSensors = useAdminDndSensors();

  const courseCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    resourcesData?.forEach((course) => {
      map[course.categoryId] = (map[course.categoryId] || 0) + 1;
    });
    return map;
  }, [resourcesData]);

  const categories = useMemo(() => categoriesData?.map((category) => ({
    ...category,
    count: courseCountMap[category._id] || 0,
    id: category._id,
  })) ?? [], [categoriesData, courseCountMap]);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) {return categories;}
    const lower = searchTerm.toLowerCase();
    return categories.filter((category) =>
      category.name.toLowerCase().includes(lower) ||
      category.slug.toLowerCase().includes(lower)
    );
  }, [categories, searchTerm]);

  const sortedData = useSortableData(filteredData, sortConfig);
  const isReorderEnabled = !searchTerm.trim() && (sortConfig.key === null || sortConfig.key === 'order');
  const isAllSelected = selectedIds.length === sortedData.length && sortedData.length > 0;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < sortedData.length;

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? [] : sortedData.map((item) => item.id));
  };

  const toggleSelectItem = (id: Id<'resourceCategories'>) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleDelete = (id: Id<'resourceCategories'>) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const openFrontend = (slug: string) => {
    window.open(`/${slug}`, '_blank');
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteCategory({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa danh mục');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Không thể xóa danh mục');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Xóa ${selectedIds.length} danh mục đã chọn? Tất cả tài nguyên liên quan sẽ bị xóa.`)) {return;}
    try {
      for (const id of selectedIds) {
        await deleteCategory({ cascade: true, id });
      }
      setSelectedIds([]);
      toast.success(`Đã xóa ${selectedIds.length} danh mục`);
    } catch {
      toast.error('Không thể xóa danh mục');
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
          item => item.id,
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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Danh mục tài nguyên"
        description="Quản lý phân loại tài nguyên"
        addHref="/admin/resource-categories/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="danh mục"
        selectionScope={isAllSelected ? 'all_results' : isIndeterminate ? 'partial' : 'page'}
        pageItemCount={sortedData.length}
        totalMatchingCount={sortedData.length}
        onSelectPage={() => setSelectedIds(sortedData.map(cat => cat.id))}
        onSelectAllResults={() => setSelectedIds(sortedData.map(cat => cat.id))}
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
          filters={<ResetFilterButton isFiltered={Boolean(searchTerm.trim())} onReset={() => setSearchTerm('')} />}
        />
          {!isReorderEnabled && (
            <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
              Tắt tìm kiếm và quay về thứ tự mặc định để kéo thả đổi vị trí.
            </div>
          )}
          <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {/* Desktop View */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHeadControls checked={isAllSelected} onChange={toggleSelectAll} indeterminate={isIndeterminate} />
                  <SortableHeader label="Tên danh mục" sortKey="name" sortConfig={sortConfig} onSort={(key) => { setSortConfig((prev) => getNextSortState(prev, key)); }} />
                  <SortableHeader label="Slug" sortKey="slug" sortConfig={sortConfig} onSort={(key) => { setSortConfig((prev) => getNextSortState(prev, key)); }} />
                  <SortableHeader label="Số tài nguyên" sortKey="count" sortConfig={sortConfig} onSort={(key) => { setSortConfig((prev) => getNextSortState(prev, key)); }} className="text-center" />
                  <SortableHeader label="Trạng thái" sortKey="active" sortConfig={sortConfig} onSort={(key) => { setSortConfig((prev) => getNextSortState(prev, key)); }} />
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <SortableContext items={sortedData.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <TableBody>
                {sortedData.map((category) => (
                  <SortableTableRow key={category.id} id={category.id} disabled={!isReorderEnabled} selected={selectedIds.includes(category.id)} selectedClassName="bg-indigo-500/5">
                    {({ attributes, disabled, listeners }) => (
                      <>
                    <TableCellControls
                      checked={selectedIds.includes(category.id)}
                      onChange={() => { toggleSelectItem(category.id); }}
                      attributes={attributes}
                      dragDisabled={disabled}
                      listeners={listeners}
                    />
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="font-mono text-sm text-slate-500 whitespace-nowrap">{category.slug}</TableCell>
                    <TableCell className="text-center whitespace-nowrap"><Badge variant="secondary">{category.count}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap"><Badge variant={category.active ? 'success' : 'secondary'}>{category.active ? 'Hiện' : 'Ẩn'}</Badge></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <RowActionButton
                          title="Xem trên web"
                          icon={<ExternalLink size={16} />}
                          onClick={() => openFrontend(category.slug)}
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                        />
                        <EditActionButton href={`/admin/resource-categories/${category.id}/edit`} />
                        <DeleteActionButton onClick={async () => handleDelete(category.id)} />
                      </RowActions>
                    </TableCell>
                      </>
                    )}
                  </SortableTableRow>
                ))}
                {sortedData.length === 0 && (
                  <TableEmptyState colSpan={7} message={searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có danh mục nào'} />
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
              sortedData.map(category => (
                <MobileRowCard
                  key={category.id}
                  selected={selectedIds.includes(category.id)}
                  checkbox={<SelectCheckbox checked={selectedIds.includes(category.id)} onChange={() => toggleSelectItem(category.id)} />}
                  title={category.name}
                  subtitle={<span className="font-mono text-xs text-slate-400">{category.slug}</span>}
                  badge={<Badge variant={category.active ? 'success' : 'secondary'}>{category.active ? 'Hiện' : 'Ẩn'}</Badge>}
                  details={<div><span className="text-slate-400">Số tài nguyên:</span> {category.count}</div>}
                  actions={
                    <RowActions>
                      <RowActionButton
                        title="Xem trên web"
                        icon={<ExternalLink size={16} />}
                        onClick={() => openFrontend(category.slug)}
                        className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                      />
                      <EditActionButton href={`/admin/resource-categories/${category.id}/edit`} />
                      <DeleteActionButton onClick={async () => handleDelete(category.id)} />
                    </RowActions>
                  }
                />
              ))
            )}
          </MobileCardList>
          </DndContext>
          {sortedData.length > 0 && (
            <div className="border-t border-slate-100 p-4 text-sm text-slate-500 dark:border-slate-800">
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
        title="Xóa danh mục tài nguyên"
        itemName={categories.find((category) => category.id === deleteTargetId)?.name ?? 'danh mục'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
