'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Edit, FolderTree, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { ModuleGuard } from '../components/ModuleGuard';
import { AdminPageHeader, AdminPageLayout, buildOrderUpdates, BulkActionBar, DeleteActionButton, EditActionButton, getReorderedItems, RowActionButton, RowActions, SortableHeader, SortableTableRow, TableCellControls, TableEmptyState, TableHeadControls, TableSkeleton, useAdminDndSensors } from '../components/TableUtilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function ProjectCategoriesListPage() {
  return (
    <ModuleGuard moduleKey="projects">
      <ProjectCategoriesContent />
    </ModuleGuard>
  );
}

function ProjectCategoriesContent() {
  const categoriesData = useQuery(api.projectCategories.listAll, {});
  const projectsData = useQuery(api.projects.listAll, {});
  const deleteCategory = useMutation(api.projectCategories.remove);
  const reorderCategories = useMutation(api.projectCategories.reorder);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Id<'projectCategories'>[]>([]);
  const dndSensors = useAdminDndSensors();

  const projectCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    projectsData?.forEach((project) => {
      map[project.categoryId] = (map[project.categoryId] || 0) + 1;
    });
    return map;
  }, [projectsData]);

  const categories = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return (categoriesData ?? [])
      .filter((category) => !keyword || category.name.toLowerCase().includes(keyword) || category.slug.toLowerCase().includes(keyword))
      .map((category) => ({ ...category, count: projectCountMap[category._id] || 0 }))
      .sort((a, b) => a.order - b.order);
  }, [categoriesData, projectCountMap, searchTerm]);
  const isReorderEnabled = !searchTerm.trim();

  const toggleSelectAll = () => {
    if (selectedIds.length === categories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(categories.map((c) => c._id));
    }
  };

  const toggleSelectItem = (id: Id<'projectCategories'>) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Xóa ${selectedIds.length} danh mục dự án đã chọn và dữ liệu liên quan?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteCategory({ cascade: true, id })));
      setSelectedIds([]);
      toast.success(`Đã xóa ${selectedIds.length} danh mục dự án`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa danh mục');
    }
  };

  const handleDelete = async (id: Id<'projectCategories'>) => {
    if (!confirm('Xóa danh mục dự án này và dữ liệu liên quan?')) {return;}
    try {
      await deleteCategory({ cascade: true, id });
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      toast.success('Đã xóa danh mục dự án');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa danh mục');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(categories, event.active.id, event.over?.id, item => item._id);
    if (!reordered) {return;}

    try {
      await reorderCategories({
        items: buildOrderUpdates(
          reordered,
          categories.map(item => item.order),
          item => item._id,
          (_item, index) => index
        ),
      });
      toast.success('Đã cập nhật thứ tự danh mục');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật thứ tự danh mục');
    }
  };

  if (categoriesData === undefined || projectsData === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
      </div>
    );
  }

  const isPageSelected = selectedIds.length === categories.length && categories.length > 0;
  const isPageIndeterminate = selectedIds.length > 0 && selectedIds.length < categories.length;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Danh mục dự án"
        description="Quản lý phân loại dự án."
        addHref="/admin/project-categories/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="danh mục"
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds([])}
      />

      <Card>
        <div className="border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="relative max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Tìm kiếm danh mục..."
              className="pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
        {!isReorderEnabled && (
          <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
            Tắt tìm kiếm để kéo thả đổi vị trí.
          </div>
        )}
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHeadControls
                checked={isPageSelected}
                onChange={toggleSelectAll}
                indeterminate={isPageIndeterminate}
              />
              <TableHead>Tên danh mục</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="text-center">Số dự án</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <SortableContext items={categories.map(category => category._id)} strategy={verticalListSortingStrategy}>
          <TableBody>
            {categories.map((category) => (
              <SortableTableRow key={category._id} id={category._id} disabled={!isReorderEnabled} selected={selectedIds.includes(category._id)}>
                {({ attributes, disabled, listeners }) => (
                  <>
                <TableCellControls
                  checked={selectedIds.includes(category._id)}
                  onChange={() => toggleSelectItem(category._id)}
                  attributes={attributes}
                  dragDisabled={disabled}
                  listeners={listeners}
                />
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="font-mono text-sm text-slate-500">{category.slug}</TableCell>
                <TableCell className="text-center"><Badge variant="secondary">{category.count}</Badge></TableCell>
                <TableCell>
                  <Badge variant={category.active ? 'default' : 'secondary'}>{category.active ? 'Hiện' : 'Ẩn'}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <RowActions>
                    <Link href={`/admin/project-categories/${category._id}/edit`}>
                      <EditActionButton title="Chỉnh sửa" />
                    </Link>
                    <DeleteActionButton title="Xóa" onClick={() => void handleDelete(category._id)} />
                  </RowActions>
                </TableCell>
                  </>
                )}
              </SortableTableRow>
            ))}
            {categories.length === 0 && (
              <TableEmptyState
                colSpan={6}
                message={searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có danh mục dự án nào'}
              />
            )}
          </TableBody>
          </SortableContext>
        </Table>
        </DndContext>
      </Card>
    </AdminPageLayout>
  );
}
