'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Copy, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellControls, TableCellThumbnail, TableEmptyState, TableHeadControls, TableHeadThumbnail, TableSkeleton, TableToolbar, useAdminDndSensors, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function PostsListPage() {
  return (
    <ModuleGuard moduleKey="posts">
      <PostsContent />
    </ModuleGuard>
  );
}

function PostsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Published' | 'Draft'>('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"posts">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"posts"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [cloningPostId, setCloningPostId] = useState<Id<"posts"> | null>(null);
  const [bulkStatusLoading, setBulkStatusLoading] = useState<'publish' | 'unpublish' | null>(null);
  const [isClearingBrokenMedia, setIsClearingBrokenMedia] = useState(false);
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_posts_visible_columns');
  const isSelectAllActive = selectionMode === 'all';

  const categoriesData = useQuery(api.postCategories.listAll, {});
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: 'posts' });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: 'posts' });
  const deletePost = useMutation(api.posts.remove);
  const duplicatePost = useMutation(api.posts.duplicate);
  const updatePost = useMutation(api.posts.update);
  const bulkClearBrokenMedia = useMutation(api.posts.bulkClearBrokenMedia);
  const reorderPosts = useMutation(api.posts.reorder);
  
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const dndSensors = useAdminDndSensors();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);



  // Lấy setting postsPerPage từ module settings
  const postsPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'postsPerPage');
    return (setting?.value as number) || 10;
  }, [settingsData]);

  const [resolvedPostsPerPage, setPageSizeOverride] = usePersistedPageSize('admin_posts_page_size', postsPerPage);

  const offset = (currentPage - 1) * resolvedPostsPerPage;

  const postsData = useQuery(api.posts.listAdminWithOffset, {
    limit: resolvedPostsPerPage,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
  });

  const totalCountData = useQuery(api.posts.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
  });

  const deleteInfo = useQuery(
    api.posts.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const selectAllData = useQuery(
    api.posts.listAdminIds,
    isSelectAllActive
      ? {
          search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
          status: filterStatus || undefined,
        }
      : 'skip'
  );

  const isTableLoading = postsData === undefined || totalCountData === undefined || fieldsData === undefined;

  const enabledFields = useMemo(() => new Set(fieldsData?.map(field => field.fieldKey) ?? []), [fieldsData]);
  const showThumbnail = enabledFields.has('thumbnail');
  const showCategory = enabledFields.has('category_id');

  const columns = [
    ...(showThumbnail ? [{ key: 'thumbnail', label: 'Thumbnail' }] : []),
    ...(showCategory ? [{ key: 'category', label: 'Danh mục' }] : []),
    { key: 'views', label: 'Lượt xem' },
    { key: 'status', label: 'Trạng thái' },
  ];

  const resolvedVisibleColumns = visibleColumns.filter(key => columns.some(col => col.key === key));

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 bài viết phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  // Map category ID to name
  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categoriesData?.forEach(cat => { map[cat._id] = cat.name; });
    return map;
  }, [categoriesData]);

  const categorySlugMap = useMemo(() => {
    const map: Record<string, string> = {};
    categoriesData?.forEach(cat => { map[cat._id] = cat.slug; });
    return map;
  }, [categoriesData]);

  const posts = useMemo(() => postsData?.map(post => ({
    ...post,
    id: post._id,
    category: categoryMap[post.categoryId] || 'Không có',
  })) ?? [], [postsData, categoryMap]);

  const sortedPosts = useSortableData(posts, sortConfig);
  const isReorderEnabled = !debouncedSearchTerm.trim() && !filterStatus && (sortConfig.key === null || sortConfig.key === 'order');

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedPostsPerPage) : 1;
  const paginatedPosts = sortedPosts;
  const tableColumnCount = 4 + resolvedVisibleColumns.length;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"posts">[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterStatus('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterStatus(value as '' | 'Published' | 'Draft');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedPosts.filter(post => selectedIds.includes(post._id));
  const isPageSelected = paginatedPosts.length > 0 && selectedOnPage.length === paginatedPosts.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedPosts.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedPosts.some(post => post._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedPosts.forEach(post => next.add(post._id));
    applyManualSelection(Array.from(next));
  };
  const toggleSelectItem = (id: Id<"posts">) =>{
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDuplicatePost = async (id: Id<"posts">) => {
    setCloningPostId(id);
    try {
      const result = await duplicatePost({ id });
      toast.success(`Đã tạo bản sao: ${result.title}`);
    } catch {
      toast.error('Không thể copy bài viết');
    } finally {
      setCloningPostId(null);
    }
  };

  const handleDelete = async (id: Id<"posts">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deletePost({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa bài viết');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Không thể xóa bài viết');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} bài viết đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      try {
        for (const id of selectedIds) {
          await deletePost({ cascade: true, id });
        }
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} bài viết`);
      } catch {
        toast.error('Có lỗi khi xóa bài viết');
      }
    }
  };

  const handleBulkStatusUpdate = async (mode: 'publish' | 'unpublish') => {
    const nextStatus = mode === 'publish' ? 'Published' : 'Draft';
    setBulkStatusLoading(mode);
    try {
      for (const id of selectedIds) {
        await updatePost({
          id,
          status: nextStatus,
          publishImmediately: mode === 'publish' ? true : undefined,
        });
      }
      applyManualSelection([]);
      toast.success(`Đã cập nhật ${selectedIds.length} bài viết`);
    } catch {
      toast.error('Có lỗi khi cập nhật trạng thái');
    } finally {
      setBulkStatusLoading(null);
    }
  };

  const handleBulkClearBrokenMedia = async () => {
    setIsClearingBrokenMedia(true);
    try {
      const result = await bulkClearBrokenMedia({ ids: selectedIds });
      applyManualSelection([]);
      if (result.cleared > 0) {
        toast.success(`Đã xóa ${result.cleared} ảnh lỗi trong ${result.updated} bài viết`);
      } else {
        toast.info('Không tìm thấy ảnh lỗi trong bài viết đã chọn');
      }
    } catch {
      toast.error('Có lỗi khi xóa ảnh lỗi');
    } finally {
      setIsClearingBrokenMedia(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(paginatedPosts, event.active.id, event.over?.id, post => post._id);
    if (!reordered) {return;}

    try {
      await reorderPosts({
        items: buildOrderUpdates(
          reordered,
          paginatedPosts.map(post => post.order),
          post => post._id,
          (_post, index) => offset + index
        ),
      });
      setSortConfig({ direction: 'asc', key: null });
      toast.success('Đã cập nhật thứ tự bài viết');
    } catch {
      toast.error('Không thể cập nhật thứ tự bài viết');
    }
  };

  const openFrontend = (slug: string, categoryId: string) => {
    const categorySlug = categorySlugMap[categoryId];
    window.open(categorySlug ? `/${categorySlug}/${slug}` : `/posts/${slug}`, '_blank');
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý bài viết"
        addHref="/admin/posts/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="bài viết"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedPosts.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedPosts.map(post => post._id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onPublish={() =>{  void handleBulkStatusUpdate('publish'); }}
        onUnpublish={() =>{  void handleBulkStatusUpdate('unpublish'); }}
        isStatusLoading={bulkStatusLoading}
        publishLabel="Hiện"
        publishLoadingLabel="Đang hiện..."
        unpublishLabel="Ẩn"
        unpublishLoadingLabel="Đang ẩn..."
        onClearBrokenMedia={() =>{  void handleBulkClearBrokenMedia(); }}
        isClearBrokenMediaLoading={isClearingBrokenMedia}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  applyManualSelection([]); }}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterStatus)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm kiếm bài viết..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => handleFilterChange(val)}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'Published', label: 'Hiện' },
                  { value: 'Draft', label: 'Ẩn' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterStatus)} onReset={handleResetFilters} />
              <ColumnToggle
                columns={columns}
                visibleColumns={resolvedVisibleColumns}
                onToggle={(key) => toggleColumn(key, columns.map(c => c.key))}
              />
            </>
          }
        />
        {!isReorderEnabled && (
          <div className="px-4 py-3 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
            Tắt tìm kiếm/lọc và quay về thứ tự mặc định để kéo thả đổi vị trí.
          </div>
        )}
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                <TableHeadControls checked={isPageSelected} onChange={toggleSelectAll} indeterminate={isPageIndeterminate} />
                {resolvedVisibleColumns.includes('thumbnail') && <TableHeadThumbnail label="Thumbnail" />}
                <SortableHeader label="Tiêu đề" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                {resolvedVisibleColumns.includes('category') && <SortableHeader label="Danh mục" sortKey="category" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('views') && <SortableHeader label="Lượt xem" sortKey="views" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />}
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={paginatedPosts.map(post => post._id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedPostsPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedPosts.map(post => (
                    <SortableTableRow key={post._id} id={post._id} disabled={!isReorderEnabled} selected={selectedIds.includes(post._id)} selectedClassName="bg-blue-500/5">
                      {({ attributes, disabled, listeners }) => (
                        <>
                      <TableCellControls
                        checked={selectedIds.includes(post._id)}
                        onChange={() => { toggleSelectItem(post._id); }}
                        attributes={attributes}
                        dragDisabled={disabled}
                        listeners={listeners}
                      />
                      {resolvedVisibleColumns.includes('thumbnail') && (
                        <TableCellThumbnail src={post.thumbnail} alt={post.title} />
                      )}
                      <TableCell className="font-medium max-w-[450px] truncate">{post.title}</TableCell>
                      {resolvedVisibleColumns.includes('category') && <TableCell className="whitespace-nowrap">{post.category}</TableCell>}
                      {resolvedVisibleColumns.includes('views') && <TableCell className="text-slate-500 whitespace-nowrap">{post.views.toLocaleString()}</TableCell>}
                      {resolvedVisibleColumns.includes('status') && (
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={post.status === 'Published' ? 'success' : (post.status === 'Draft' ? 'secondary' : 'warning')}>
                            {post.status === 'Published' ? 'Hiện' : (post.status === 'Draft' ? 'Ẩn' : 'Lưu trữ')}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right whitespace-nowrap">
                        <RowActions>
                          <RowActionButton
                            title="Xem bài viết"
                            icon={<ExternalLink size={16} />}
                            onClick={() => openFrontend(post.slug, post.categoryId)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          />
                          <RowActionButton
                            title="Copy bài viết"
                            icon={cloningPostId === post._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                            onClick={() => void handleDuplicatePost(post._id)}
                            disabled={cloningPostId === post._id}
                          />
                          <EditActionButton href={`/admin/posts/${post._id}/edit`} />
                          <DeleteActionButton onClick={async () => handleDelete(post._id)} />
                        </RowActions>
                      </TableCell>
                        </>
                      )}
                    </SortableTableRow>
                  ))}
                </>
              )}
              {!isTableLoading && paginatedPosts.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có bài viết nào'}
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
          ) : paginatedPosts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có bài viết nào'}
            </div>
          ) : (
            paginatedPosts.map(post => (
              <MobileRowCard
                key={post._id}
                selected={selectedIds.includes(post._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(post._id)} onChange={() => toggleSelectItem(post._id)} />}
                title={post.title}
                badge={
                  <Badge variant={post.status === 'Published' ? 'success' : (post.status === 'Draft' ? 'secondary' : 'warning')}>
                    {post.status === 'Published' ? 'Hiện' : (post.status === 'Draft' ? 'Ẩn' : 'Lưu trữ')}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Danh mục:</span> {post.category}</div>
                    <div><span className="text-slate-400">Lượt xem:</span> {post.views.toLocaleString()}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    <RowActionButton
                      title="Xem bài viết"
                      icon={<ExternalLink size={16} />}
                      onClick={() => openFrontend(post.slug, post.categoryId)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    />
                    <RowActionButton
                      title="Copy bài viết"
                      icon={cloningPostId === post._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                      onClick={() => void handleDuplicatePost(post._id)}
                      disabled={cloningPostId === post._id}
                    />
                    <EditActionButton href={`/admin/posts/${post._id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(post._id)} />
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
          pageSize={resolvedPostsPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="bài viết"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa bài viết"
        itemName={posts.find((post) => post.id === deleteTargetId)?.title ?? 'bài viết'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
