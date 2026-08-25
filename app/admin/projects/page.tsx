'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Briefcase, ChevronDown, Copy, Edit, ExternalLink, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { ModuleGuard } from '../components/ModuleGuard';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, DeleteActionButton, EditActionButton, FilterSelect, generatePaginationItems, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableTableRow, TableCellControls, TableCellThumbnail, TableEmptyState, TableHeadControls, TableHeadThumbnail, TableSkeleton, TableToolbar, useAdminDndSensors } from '../components/TableUtilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const STATUS_LABEL: Record<string, string> = {
  Published: 'Hiện',
  Draft: 'Ẩn',
};

type ProjectStatus = '' | 'Published' | 'Draft';

export default function ProjectsListPage() {
  return (
    <ModuleGuard moduleKey="projects">
      <ProjectsContent />
    </ModuleGuard>
  );
}

function ProjectsContent() {
  const categoriesData = useQuery(api.projectCategories.listAll, {});
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: 'projects' });
  const deleteProject = useMutation(api.projects.remove);
  const duplicateProject = useMutation(api.projects.duplicate);
  const bulkClearBrokenMedia = useMutation(api.projects.bulkClearBrokenMedia);
  const reorderProjects = useMutation(api.projects.reorder);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus>('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<'projects'>[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [cloningProjectId, setCloningProjectId] = useState<Id<'projects'> | null>(null);
  const [isClearingMedia, setIsClearingMedia] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const dndSensors = useAdminDndSensors();
  const isSelectAllActive = selectionMode === 'all';

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const projectsPerPage = useMemo(() => {
    const setting = settingsData?.find((item) => item.settingKey === 'projectsPerPage');
    return (setting?.value as number) || 12;
  }, [settingsData]);
  const [resolvedProjectsPerPage, setPageSizeOverride] = usePersistedPageSize('admin_projects_page_size', projectsPerPage);
  const offset = (currentPage - 1) * resolvedProjectsPerPage;

  const projectsData = useQuery(api.projects.listAdminWithOffset, {
    limit: resolvedProjectsPerPage,
    offset,
    search: debouncedSearchTerm.trim() || undefined,
    status: filterStatus || undefined,
  });
  const totalCountData = useQuery(api.projects.countAdmin, {
    search: debouncedSearchTerm.trim() || undefined,
    status: filterStatus || undefined,
  });

  const selectAllData = useQuery(
    api.projects.listAdminIds,
    isSelectAllActive
      ? {
          search: debouncedSearchTerm.trim() || undefined,
          status: filterStatus || undefined,
        }
      : 'skip'
  );

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categoriesData?.forEach((category) => map.set(category._id, category.name));
    return map;
  }, [categoriesData]);

  const isLoading = projectsData === undefined || totalCountData === undefined || categoriesData === undefined;
  const projects = projectsData ?? [];
  const isReorderEnabled = !debouncedSearchTerm.trim() && !filterStatus;
  const totalCount = totalCountData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / resolvedProjectsPerPage));
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;

  const selectedOnPage = projects.filter(project => selectedIds.includes(project._id));
  const isPageSelected = projects.length > 0 && selectedOnPage.length === projects.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < projects.length;

  const applyManualSelection = (nextIds: Id<'projects'>[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 dự án phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !projects.some(project => project._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    projects.forEach(project => next.add(project._id));
    applyManualSelection(Array.from(next));
  };

  const toggleSelectItem = (id: Id<'projects'>) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDuplicateProject = async (id: Id<'projects'>) => {
    setCloningProjectId(id);
    try {
      const result = await duplicateProject({ id });
      toast.success(`Đã tạo bản sao: ${result.title}`);
    } catch {
      toast.error('Không thể copy dự án');
    } finally {
      setCloningProjectId(null);
    }
  };

  const handleDelete = async (id: Id<'projects'>) => {
    if (!confirm('Xóa dự án này? File media liên quan sẽ được dọn qua FLS nếu không còn được sử dụng.')) {return;}
    try {
      await deleteProject({ id });
      toast.success('Đã xóa dự án');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa dự án');
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} dự án đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      setIsDeleting(true);
      try {
        for (const id of selectedIds) {
          await deleteProject({ id });
        }
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} dự án`);
      } catch {
        toast.error('Có lỗi khi xóa dự án');
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
        toast.success(`Đã xóa ${result.cleared} ảnh lỗi trong ${result.updated} dự án`);
      } else {
        toast.info('Không tìm thấy ảnh lỗi trong dự án đã chọn');
      }
    } catch {
      toast.error('Có lỗi khi xóa ảnh lỗi');
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
    const reordered = getReorderedItems(projects, event.active.id, event.over?.id, project => project._id);
    if (!reordered) {return;}

    try {
      await reorderProjects({
        items: buildOrderUpdates(
          reordered,
          projects.map(project => project.order),
          project => project._id,
          (_project, index) => offset + index
        ),
      });
      toast.success('Đã cập nhật thứ tự dự án');
    } catch {
      toast.error('Không thể cập nhật thứ tự dự án');
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý dự án"
        description="Quản lý dự án mẫu và hồ sơ năng lực"
        addHref="/admin/projects/create"
      >
        <Button variant="outline" size="sm" onClick={() => { void handleBulkClearBrokenMedia(); }} disabled={isClearingMedia}>
          {isClearingMedia ? <Loader2 size={16} className="animate-spin mr-1" /> : null} Dọn media rác
        </Button>
      </AdminPageHeader>

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="dự án"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={projects.length}
        totalMatchingCount={totalCount}
        onSelectPage={() => { applyManualSelection(projects.map(project => project._id)); }}
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
              onChange={(val) => {
                setSearchTerm(val);
                setCurrentPage(1);
                applyManualSelection([]);
              }}
              placeholder="Tìm kiếm dự án..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => {
                  setFilterStatus(val as ProjectStatus);
                  setCurrentPage(1);
                  applyManualSelection([]);
                }}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'Published', label: 'Hiện' },
                  { value: 'Draft', label: 'Ẩn' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterStatus)} onReset={handleResetFilters} />
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
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Danh mục</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={projects.map(project => project._id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={resolvedProjectsPerPage} cols={7} />
              ) : projects.length === 0 ? (
                <TableEmptyState
                  colSpan={7}
                  message={searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có dự án nào'}
                />
              ) : projects.map((project) => (
                <SortableTableRow key={project._id} id={project._id} disabled={!isReorderEnabled} selected={selectedIds.includes(project._id)} selectedClassName="bg-teal-500/5">
                  {({ attributes, disabled, listeners }) => (
                    <>
                  <TableCellControls
                    checked={selectedIds.includes(project._id)}
                    onChange={() => { toggleSelectItem(project._id); }}
                    attributes={attributes}
                    dragDisabled={disabled}
                    listeners={listeners}
                  />
                  <TableCellThumbnail src={project.thumbnail} alt={project.title} />
                  <TableCell>
                    <div className="font-medium">{project.title}</div>
                    <div className="font-mono text-xs text-slate-500 whitespace-nowrap">{project.slug}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{categoryMap.get(project.categoryId) ?? 'Không có'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={project.status === 'Published' ? 'success' : (project.status === 'Draft' ? 'secondary' : 'warning')}>
                      {STATUS_LABEL[project.status] ?? project.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <RowActions>
                      <RowActionButton
                        title="Xem trên web"
                        icon={<ExternalLink size={16} />}
                        onClick={() => window.open(`/projects/${project.slug}`, '_blank')}
                        className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                      />
                      <RowActionButton
                        title="Copy dự án"
                        icon={cloningProjectId === project._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                        onClick={() => { void handleDuplicateProject(project._id); }}
                        disabled={cloningProjectId === project._id}
                      />
                      <EditActionButton href={`/admin/projects/${project._id}/edit`} />
                      <DeleteActionButton onClick={() => { void handleDelete(project._id); }} />
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
          ) : projects.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có dự án nào'}
            </div>
          ) : (
            projects.map(project => (
              <MobileRowCard
                key={project._id}
                selected={selectedIds.includes(project._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(project._id)} onChange={() => toggleSelectItem(project._id)} />}
                title={project.title}
                subtitle={<span className="font-mono text-xs text-slate-400">{project.slug}</span>}
                badge={
                  <Badge variant={project.status === 'Published' ? 'success' : (project.status === 'Draft' ? 'secondary' : 'warning')}>
                    {STATUS_LABEL[project.status] ?? project.status}
                  </Badge>
                }
                details={<div><span className="text-slate-400">Danh mục:</span> {categoryMap.get(project.categoryId) ?? 'Không có'}</div>}
                actions={
                  <RowActions>
                    <RowActionButton
                      title="Xem trên web"
                      icon={<ExternalLink size={16} />}
                      onClick={() => window.open(`/projects/${project.slug}`, '_blank')}
                      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                    />
                    <RowActionButton
                      title="Copy dự án"
                      icon={cloningProjectId === project._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                      onClick={() => { void handleDuplicateProject(project._id); }}
                      disabled={cloningProjectId === project._id}
                    />
                    <EditActionButton href={`/admin/projects/${project._id}/edit`} />
                    <DeleteActionButton onClick={() => { void handleDelete(project._id); }} />
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
          pageSize={resolvedProjectsPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="dự án"
        />
      </Card>
    </AdminPageLayout>
  );
}
