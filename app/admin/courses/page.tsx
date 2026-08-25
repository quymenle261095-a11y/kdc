'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { getCourseLevelLabel } from '@/lib/courses/labels';
import { BookOpen, ChevronDown, Copy, Edit, ExternalLink, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { ModuleGuard } from '../components/ModuleGuard';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableTableRow, TableCellControls, TableCellThumbnail, TableEmptyState, TableHeadControls, TableHeadThumbnail, TableSkeleton, TableToolbar, useAdminDndSensors, usePersistedColumns } from '../components/TableUtilities';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

type CourseStatus = '' | 'Published' | 'Draft';

const columns = [
  { key: 'select', label: 'Chọn', required: true },
  { key: 'reorder', label: 'Sắp xếp', required: true },
  { key: 'image', label: 'Ảnh' },
  { key: 'course', label: 'Khóa học', required: true },
  { key: 'category', label: 'Danh mục' },
  { key: 'price', label: 'Giá' },
  { key: 'content', label: 'Nội dung học' },
  { key: 'status', label: 'Trạng thái' },
  { key: 'actions', label: 'Hành động', required: true },
];

export default function CoursesListPage() {
  return (
    <ModuleGuard moduleKey="courses">
      <CoursesContent />
    </ModuleGuard>
  );
}

function CoursesContent() {
  const categoriesData = useQuery(api.courseCategories.listAll, {});
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: 'courses' });
  const deleteCourse = useMutation(api.courses.remove);
  const duplicateCourse = useMutation(api.courses.duplicate);
  const bulkClearBrokenMedia = useMutation(api.courses.bulkClearBrokenMedia);
  const reorderCourses = useMutation(api.courses.reorder);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<CourseStatus>('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<'courses'>[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<'courses'> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [cloningCourseId, setCloningCourseId] = useState<Id<'courses'> | null>(null);
  const [isClearingMedia, setIsClearingMedia] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_courses_visible_columns');
  const resolvedVisibleColumns = visibleColumns.length > 0 ? visibleColumns : columns.map(c => c.key);
  const dndSensors = useAdminDndSensors();
  const isSelectAllActive = selectionMode === 'all';

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 300);
    return () => { clearTimeout(timer); };
  }, [searchTerm]);

  const defaultPageSize = useMemo(() => {
    const setting = settingsData?.find((item) => item.settingKey === 'coursesPerPage');
    return (setting?.value as number) || 10;
  }, [settingsData]);
  const [pageSize, setPageSizeOverride] = usePersistedPageSize('admin_courses_page_size', defaultPageSize);
  const offset = (currentPage - 1) * pageSize;

  const coursesData = useQuery(api.courses.listAdminWithOffset, {
    limit: pageSize,
    offset,
    search: debouncedSearchTerm.trim() || undefined,
    status: filterStatus || undefined,
  });
  const totalCountData = useQuery(api.courses.countAdmin, {
    search: debouncedSearchTerm.trim() || undefined,
    status: filterStatus || undefined,
  });
  const deleteInfo = useQuery(api.courses.getDeleteInfo, deleteTargetId ? { id: deleteTargetId } : 'skip');

  const selectAllData = useQuery(
    api.courses.listAdminIds,
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

  const courses = coursesData ?? [];
  const isLoading = coursesData === undefined || totalCountData === undefined || categoriesData === undefined;
  const isReorderEnabled = !debouncedSearchTerm.trim() && !filterStatus;
  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;

  const selectedOnPage = courses.filter(course => selectedIds.includes(course._id));
  const isPageSelected = courses.length > 0 && selectedOnPage.length === courses.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < courses.length;

  const applyManualSelection = (nextIds: Id<'courses'>[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 khóa học phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !courses.some(course => course._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    courses.forEach(course => next.add(course._id));
    applyManualSelection(Array.from(next));
  };

  const toggleSelectItem = (id: Id<'courses'>) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const formatPrice = (pricingType: string, price?: number) => {
    if (pricingType === 'free') {return 'Miễn phí';}
    if (pricingType === 'contact') {return 'Liên hệ';}
    if (!price) {return '-';}
    return new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(price);
  };

  const openFrontend = (slug: string, categoryId: string) => {
    const categorySlug = categoryMap[categoryId]?.slug;
    window.open(categorySlug ? `/${categorySlug}/${slug}` : `/khoa-hoc/${slug}`, '_blank');
  };

  const handleDuplicateCourse = async (id: Id<'courses'>) => {
    setCloningCourseId(id);
    try {
      const result = await duplicateCourse({ id });
      toast.success(`Đã tạo bản sao: ${result.title}`);
    } catch {
      toast.error('Không thể copy khóa học');
    } finally {
      setCloningCourseId(null);
    }
  };

  const handleDelete = (id: Id<'courses'>) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteCourse({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa khóa học');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Không thể xóa khóa học');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} khóa học đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      setIsDeleting(true);
      try {
        for (const id of selectedIds) {
          await deleteCourse({ cascade: true, id });
        }
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} khóa học`);
      } catch {
        toast.error('Có lỗi khi xóa khóa học');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleClearBrokenMedia = async () => {
    if (courses.length === 0) {return;}
    setIsClearingMedia(true);
    try {
      const result = await bulkClearBrokenMedia({ ids: courses.map((course) => course._id) });
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

  const handleBulkClearBrokenMedia = async () => {
    setIsClearingMedia(true);
    try {
      const result = await bulkClearBrokenMedia({ ids: selectedIds });
      applyManualSelection([]);
      if (result.cleared > 0) {
        toast.success(`Đã xóa ${result.cleared} ảnh lỗi trong ${result.updated} khóa học`);
      } else {
        toast.info('Không tìm thấy ảnh lỗi trong khóa học đã chọn');
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
    const reordered = getReorderedItems(courses, event.active.id, event.over?.id, course => course._id);
    if (!reordered) {return;}

    try {
      await reorderCourses({
        items: buildOrderUpdates(
          reordered,
          courses.map(course => course.order),
          course => course._id,
          (_course, index) => offset + index
        ),
      });
      toast.success('Đã cập nhật thứ tự khóa học');
    } catch {
      toast.error('Không thể cập nhật thứ tự khóa học');
    }
  };

  const tableColumnCount = resolvedVisibleColumns.length;

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý khóa học"
        description="Khóa học, giá, giảng viên và nội dung học"
        addHref="/admin/courses/create"
      >
        <Button variant="outline" size="sm" onClick={() => { void handleClearBrokenMedia(); }} disabled={isClearingMedia || courses.length === 0}>
          {isClearingMedia ? 'Đang quét...' : 'Dọn ảnh lỗi'}
        </Button>
      </AdminPageHeader>

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="khóa học"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={courses.length}
        totalMatchingCount={totalCount}
        onSelectPage={() => { applyManualSelection(courses.map(course => course._id)); }}
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
              placeholder="Tìm kiếm khóa học..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => { setFilterStatus(val as CourseStatus); setCurrentPage(1); applyManualSelection([]); }}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'Published', label: 'Hiện' },
                  { value: 'Draft', label: 'Ẩn' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(debouncedSearchTerm.trim() || filterStatus)} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={(key) => toggleColumn(key, columns.map(c => c.key))} />
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
                <TableHeadControls
                  showDrag={resolvedVisibleColumns.includes('reorder')}
                  showSelect={resolvedVisibleColumns.includes('select')}
                  checked={isPageSelected}
                  onChange={toggleSelectAll}
                  indeterminate={isPageIndeterminate}
                />
                {resolvedVisibleColumns.includes('image') && <TableHeadThumbnail label="Ảnh" />}
                {resolvedVisibleColumns.includes('course') && <TableHead>Khóa học</TableHead>}
                {resolvedVisibleColumns.includes('category') && <TableHead>Danh mục</TableHead>}
                {resolvedVisibleColumns.includes('price') && <TableHead>Giá</TableHead>}
                {resolvedVisibleColumns.includes('content') && <TableHead>Nội dung học</TableHead>}
                {resolvedVisibleColumns.includes('status') && <TableHead>Trạng thái</TableHead>}
                {resolvedVisibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <SortableContext items={courses.map(course => course._id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={pageSize} cols={tableColumnCount} />
              ) : courses.map((course) => (
                <SortableTableRow key={course._id} id={course._id} disabled={!isReorderEnabled} selected={selectedIds.includes(course._id)} selectedClassName="bg-indigo-500/5">
                  {({ attributes, disabled, listeners }) => (
                    <>
                  <TableCellControls
                    showDrag={resolvedVisibleColumns.includes('reorder')}
                    showSelect={resolvedVisibleColumns.includes('select')}
                    checked={selectedIds.includes(course._id)}
                    onChange={() => { toggleSelectItem(course._id); }}
                    attributes={attributes}
                    dragDisabled={disabled}
                    listeners={listeners}
                  />
                  {resolvedVisibleColumns.includes('image') && (
                    <TableCellThumbnail src={course.thumbnail} alt={course.title} />
                  )}
                  {resolvedVisibleColumns.includes('course') && (
                    <TableCell>
                      <div className="font-medium text-slate-900 dark:text-slate-100 max-w-[250px] truncate">{course.title}</div>
                      <div className="text-xs text-slate-500">{course.instructorName || 'Chưa có giảng viên'}{course.level ? ` · ${getCourseLevelLabel(course.level)}` : ''}</div>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('category') && <TableCell className="whitespace-nowrap">{categoryMap[course.categoryId]?.name ?? 'Không có'}</TableCell>}
                  {resolvedVisibleColumns.includes('price') && <TableCell className="text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatPrice(course.pricingType, course.priceAmount)}</TableCell>}
                  {resolvedVisibleColumns.includes('content') && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary">{course.chapterCount} chương · {course.lessonCount} bài</Badge>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('status') && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={course.status === 'Published' ? 'success' : course.status === 'Draft' ? 'secondary' : 'warning'}>
                        {course.status === 'Published' ? 'Hiện' : course.status === 'Draft' ? 'Ẩn' : 'Lưu trữ'}
                      </Badge>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('actions') && (
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <RowActionButton
                          title="Xem khóa học"
                          icon={<ExternalLink size={16} />}
                          onClick={() => openFrontend(course.slug, course.categoryId)}
                          className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                        />
                        <RowActionButton
                          title="Copy khóa học"
                          icon={cloningCourseId === course._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                          onClick={() => void handleDuplicateCourse(course._id)}
                          disabled={cloningCourseId === course._id}
                        />
                        <EditActionButton href={`/admin/courses/${course._id}/edit`} />
                        <DeleteActionButton onClick={async () => handleDelete(course._id)} />
                      </RowActions>
                    </TableCell>
                  )}
                    </>
                  )}
                </SortableTableRow>
              ))}
              {!isLoading && courses.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có khóa học nào'}
                />
              )}
            </TableBody>
            </SortableContext>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có khóa học nào'}
            </div>
          ) : (
            courses.map(course => (
              <MobileRowCard
                key={course._id}
                selected={selectedIds.includes(course._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(course._id)} onChange={() => toggleSelectItem(course._id)} />}
                title={course.title}
                subtitle={<span className="text-xs text-slate-500">{course.instructorName || 'Chưa có giảng viên'}</span>}
                badge={
                  <Badge variant={course.status === 'Published' ? 'success' : course.status === 'Draft' ? 'secondary' : 'warning'}>
                    {course.status === 'Published' ? 'Hiện' : course.status === 'Draft' ? 'Ẩn' : 'Lưu trữ'}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Danh mục:</span> {categoryMap[course.categoryId]?.name ?? 'Không có'}</div>
                    <div><span className="text-slate-400">Giá:</span> {formatPrice(course.pricingType, course.priceAmount)}</div>
                    <div><span className="text-slate-400">Nội dung:</span> {course.chapterCount} chương · {course.lessonCount} bài</div>
                  </div>
                }
                actions={
                  <RowActions>
                    <RowActionButton
                      title="Xem khóa học"
                      icon={<ExternalLink size={16} />}
                      onClick={() => openFrontend(course.slug, course.categoryId)}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    />
                    <RowActionButton
                      title="Copy khóa học"
                      icon={cloningCourseId === course._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                      onClick={() => void handleDuplicateCourse(course._id)}
                      disabled={cloningCourseId === course._id}
                    />
                    <EditActionButton href={`/admin/courses/${course._id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(course._id)} />
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
          entityLabel="khóa học"
        />
      </Card>

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa khóa học"
        itemName={courses.find((course) => course._id === deleteTargetId)?.title ?? 'khóa học'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
