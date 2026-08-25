'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Ban, Check, ChevronDown, Edit, FileText, Package, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, TableCellSelect, TableEmptyState, TableHeadSelect, TableSkeleton, TableToolbar, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';

export default function CommentsListPage() {
  return (
    <ModuleGuard moduleKey="comments" requiredModules={['posts', 'products']} requiredModulesType="any">
      <CommentsContent />
    </ModuleGuard>
  );
}

function CommentsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'' | 'post' | 'product'>('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Pending' | 'Approved' | 'Spam'>('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"comments">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"comments"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'desc', key: 'created' });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_comments_visible_columns');
  const isSelectAllActive = selectionMode === 'all';

  const postsData = useQuery(api.posts.listAll, {});
  const productsData = useQuery(api.products.listAll, {});
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: 'comments' });

  const deleteComment = useMutation(api.comments.remove);
  const approveComment = useMutation(api.comments.approve);
  const markAsSpam = useMutation(api.comments.markAsSpam);
  const bulkUpdateStatus = useMutation(api.comments.bulkUpdateStatus);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);

  useEffect(() => {
    window.localStorage.setItem('admin_comments_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const commentsPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'commentsPerPage');
    return (setting?.value as number) || 20;
  }, [settingsData]);

  const [resolvedCommentsPerPage, setPageSizeOverride] = usePersistedPageSize('admin_comments_page_size', commentsPerPage);
  const offset = (currentPage - 1) * resolvedCommentsPerPage;

  const commentsData = useQuery(api.comments.listAdminWithOffset, {
    limit: resolvedCommentsPerPage,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
    targetType: filterType || undefined,
  });

  const totalCountData = useQuery(api.comments.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
    targetType: filterType || undefined,
  });

  const deleteInfo = useQuery(
    api.comments.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const selectAllData = useQuery(
    api.comments.listAdminIds,
    isSelectAllActive
      ? {
          search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
          status: filterStatus || undefined,
          targetType: filterType || undefined,
        }
      : 'skip'
  );

  const isTableLoading = commentsData === undefined
    || totalCountData === undefined
    || postsData === undefined
    || productsData === undefined
    || settingsData === undefined;

  const columns = [
    { key: 'rating', label: 'Đánh giá' },
    { key: 'type', label: 'Loại' },
    { key: 'target', label: 'Bài viết / Sản phẩm' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'created', label: 'Thời gian' },
    { key: 'ip', label: 'IP' },
  ];

  const resolvedVisibleColumns = visibleColumns.filter(key => columns.some(col => col.key === key));

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 bình luận phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const postMap = useMemo(() => {
    const map: Record<string, string> = {};
    postsData?.forEach(post => { map[post._id] = post.title; });
    return map;
  }, [postsData]);

  const productMap = useMemo(() => {
    const map: Record<string, string> = {};
    productsData?.forEach(product => { map[product._id] = product.name; });
    return map;
  }, [productsData]);

  const comments = useMemo(() => commentsData?.map(comment => ({
    ...comment,
    id: comment._id,
    author: comment.authorName,
    targetName: comment.targetType === 'post'
      ? (postMap[comment.targetId] || 'Bài viết không tồn tại')
      : (productMap[comment.targetId] || 'Sản phẩm không tồn tại'),
    created: comment._creationTime,
  })) ?? [], [commentsData, postMap, productMap]);

  const sortedComments = useSortableData(comments, sortConfig);

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedCommentsPerPage) : 1;
  const paginatedComments = sortedComments;
  const tableColumnCount = 4 + resolvedVisibleColumns.length;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"comments">[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterStatus('');
    setFilterType('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
  };

  const handleTypeChange = (value: string) => {
    setFilterType(value as '' | 'post' | 'product');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const handleStatusChange = (value: string) => {
    setFilterStatus(value as '' | 'Pending' | 'Approved' | 'Spam');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedComments.filter(comment => selectedIds.includes(comment.id));
  const isPageSelected = paginatedComments.length > 0 && selectedOnPage.length === paginatedComments.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedComments.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedComments.some(comment => comment.id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedComments.forEach(comment => next.add(comment.id));
    applyManualSelection(Array.from(next));
  };

  const toggleSelectItem = (id: Id<"comments">) =>{
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDelete = async (id: Id<"comments">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteComment({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa bình luận');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Không thể xóa bình luận');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} bình luận đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      try {
        for (const id of selectedIds) {
          await deleteComment({ cascade: true, id });
        }
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} bình luận`);
      } catch {
        toast.error('Không thể xóa bình luận');
      }
    }
  };

  const handleApprove = async (id: Id<"comments">) => {
    await approveComment({ id });
    toast.success('Đã duyệt bình luận');
  };

  const handleSpam = async (id: Id<"comments">) => {
    await markAsSpam({ id });
    toast.success('Đã đánh dấu spam');
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) {return;}
    try {
      await bulkUpdateStatus({ ids: selectedIds, status: 'Approved' });
      applyManualSelection([]);
      toast.success(`Đã duyệt ${selectedIds.length} bình luận`);
    } catch {
      toast.error('Không thể duyệt bình luận');
    }
  };

  const handleBulkSpam = async () => {
    if (selectedIds.length === 0) {return;}
    try {
      await bulkUpdateStatus({ ids: selectedIds, status: 'Spam' });
      applyManualSelection([]);
      toast.success(`Đã đánh dấu spam ${selectedIds.length} bình luận`);
    } catch {
      toast.error('Không thể đánh dấu spam');
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý bình luận và đánh giá"
        description="Xem danh sách bình luận và đánh giá mới nhất"
        addHref="/admin/comments/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="bình luận"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedComments.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedComments.map(comment => comment.id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  applyManualSelection([]); }}
      />
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700" onClick={handleBulkApprove}>
            <Check size={14} /> Duyệt
          </Button>
          <Button variant="outline" size="sm" className="text-orange-600 hover:text-orange-700" onClick={handleBulkSpam}>
            <Ban size={14} /> Spam
          </Button>
        </div>
      )}

      <Card>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
          <SearchInput
            value={searchTerm}
            onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
            placeholder="Tìm kiếm bình luận..."
          />
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              value={filterType}
              onChange={(val) => handleTypeChange(val)}
              placeholder="Tất cả loại"
              options={[
                { value: 'post', label: 'Bình luận bài viết' },
                { value: 'product', label: 'Đánh giá sản phẩm' },
              ]}
            />
            <FilterSelect
              value={filterStatus}
              onChange={(val) => handleStatusChange(val)}
              placeholder="Tất cả trạng thái"
              options={[
                { value: 'Approved', label: 'Đã duyệt' },
                { value: 'Pending', label: 'Chờ duyệt' },
                { value: 'Spam', label: 'Spam' },
              ]}
            />
            <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterType || filterStatus)} onReset={handleResetFilters} />
            <ColumnToggle
              columns={columns}
              visibleColumns={resolvedVisibleColumns}
              onToggle={toggleColumn}
            />
          </div>
        </div>
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                <TableHeadSelect checked={isPageSelected} onChange={toggleSelectAll} indeterminate={isPageIndeterminate} />
                <SortableHeader label="Người dùng" sortKey="author" sortConfig={sortConfig} onSort={handleSort} className="w-[180px]" />
                <TableHead>Nội dung</TableHead>
                {resolvedVisibleColumns.includes('rating') && (
                  <SortableHeader label="Đánh giá" sortKey="rating" sortConfig={sortConfig} onSort={handleSort} className="w-[90px]" />
                )}
                {resolvedVisibleColumns.includes('type') && (
                  <TableHead className="w-[80px]">Loại</TableHead>
                )}
                {resolvedVisibleColumns.includes('target') && (
                  <TableHead className="w-[180px]">Bài viết / Sản phẩm</TableHead>
                )}
                {resolvedVisibleColumns.includes('status') && (
                  <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} className="w-[120px]" />
                )}
                {resolvedVisibleColumns.includes('created') && (
                  <SortableHeader label="Thời gian" sortKey="created" sortConfig={sortConfig} onSort={handleSort} className="w-[140px]" />
                )}
                {resolvedVisibleColumns.includes('ip') && (
                  <TableHead className="w-[120px]">IP</TableHead>
                )}
                <TableHead className="text-right w-[140px]">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedCommentsPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedComments.map(comment => (
                    <TableRow key={comment.id} className={selectedIds.includes(comment.id) ? 'bg-blue-500/5' : ''}>
                      <TableCellSelect checked={selectedIds.includes(comment.id)} onChange={() =>{  toggleSelectItem(comment.id); }} />
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">{comment.author}</div>
                        {!resolvedVisibleColumns.includes('ip') && (
                          <div className="text-xs text-slate-400">IP: {comment.authorIp ?? 'N/A'}</div>
                        )}
                      </TableCell>
                      <TableCell><p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{comment.content}</p></TableCell>
                      {resolvedVisibleColumns.includes('rating') && (
                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">{comment.rating ? `${comment.rating}/5` : '—'}</TableCell>
                      )}
                      {resolvedVisibleColumns.includes('type') && (
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={comment.targetType === 'post' ? 'secondary' : 'outline'} className="gap-1 whitespace-nowrap">
                            {comment.targetType === 'post' ? <FileText size={12} /> : <Package size={12} />}
                            {comment.targetType === 'post' ? 'Bài viết' : 'Sản phẩm'}
                          </Badge>
                        </TableCell>
                      )}
                      {resolvedVisibleColumns.includes('target') && (
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate max-w-[180px]">
                            {comment.targetName}
                          </div>
                        </TableCell>
                      )}
                      {resolvedVisibleColumns.includes('status') && (
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={comment.status === 'Approved' ? 'default' : (comment.status === 'Pending' ? 'secondary' : 'destructive')} className="whitespace-nowrap">
                            {comment.status === 'Approved' ? 'Đã duyệt' : (comment.status === 'Pending' ? 'Chờ duyệt' : 'Spam')}
                          </Badge>
                        </TableCell>
                      )}
                      {resolvedVisibleColumns.includes('created') && (
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{new Date(comment.created).toLocaleString('vi-VN')}</TableCell>
                      )}
                      {resolvedVisibleColumns.includes('ip') && (
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{comment.authorIp ?? 'N/A'}</TableCell>
                      )}
                      <TableCell className="text-right whitespace-nowrap">
                        <RowActions>
                          {comment.status !== 'Approved' && (
                            <RowActionButton
                              title="Duyệt"
                              icon={<Check size={16} />}
                              onClick={async () => handleApprove(comment.id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                            />
                          )}
                          {comment.status !== 'Spam' && (
                            <RowActionButton
                              title="Đánh dấu spam"
                              icon={<Ban size={16} />}
                              onClick={async () => handleSpam(comment.id)}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            />
                          )}
                          <EditActionButton href={`/admin/comments/${comment.id}/edit`} />
                          <DeleteActionButton onClick={async () => handleDelete(comment.id)} />
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!isTableLoading && paginatedComments.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterStatus || filterType ? 'Không tìm thấy kết quả phù hợp' : 'Không có bình luận nào.'}
                />
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {isTableLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : paginatedComments.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus || filterType ? 'Không tìm thấy kết quả phù hợp' : 'Không có bình luận nào.'}
            </div>
          ) : (
            paginatedComments.map(comment => (
              <MobileRowCard
                key={comment.id}
                selected={selectedIds.includes(comment.id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(comment.id)} onChange={() => toggleSelectItem(comment.id)} />}
                title={comment.author}
                subtitle={<span className="text-xs text-slate-500">{comment.targetName}</span>}
                badge={
                  <Badge variant={comment.status === 'Approved' ? 'default' : (comment.status === 'Pending' ? 'secondary' : 'destructive')}>
                    {comment.status === 'Approved' ? 'Đã duyệt' : (comment.status === 'Pending' ? 'Chờ duyệt' : 'Spam')}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic">{comment.content}</p>
                    <div><span className="text-slate-400">Loại:</span> {comment.targetType === 'post' ? 'Bài viết' : 'Sản phẩm'}</div>
                    <div><span className="text-slate-400">Thời gian:</span> {new Date(comment.created).toLocaleString('vi-VN')}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    {comment.status !== 'Approved' && (
                      <RowActionButton
                        title="Duyệt"
                        icon={<Check size={16} />}
                        onClick={async () => handleApprove(comment.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                      />
                    )}
                    {comment.status !== 'Spam' && (
                      <RowActionButton
                        title="Đánh dấu spam"
                        icon={<Ban size={16} />}
                        onClick={async () => handleSpam(comment.id)}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      />
                    )}
                    <EditActionButton href={`/admin/comments/${comment.id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(comment.id)} />
                  </RowActions>
                }
              />
            ))
          )}
        </MobileCardList>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={resolvedCommentsPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="bình luận"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa bình luận"
        itemName={comments.find((comment) => comment.id === deleteTargetId)?.content ?? 'bình luận'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
