'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Ban, Check, ChevronDown, Package, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, TableCellSelect, TableEmptyState, TableHeadSelect, TableSkeleton, TableToolbar, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';

const MODULE_KEY = 'comments';

export default function ReviewsListPage() {
  return (
    <ModuleGuard moduleKey={MODULE_KEY}>
      <ReviewsContent />
    </ModuleGuard>
  );
}

function ReviewsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Pending' | 'Approved' | 'Spam'>('');
  const [filterProduct, setFilterProduct] = useState<Id<'products'> | ''>('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"comments">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"comments"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'desc', key: 'created' });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_reviews_visible_columns');
  const isSelectAllActive = selectionMode === 'all';

  const productsData = useQuery(api.products.listAll, {});
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const deleteComment = useMutation(api.comments.remove);
  const approveComment = useMutation(api.comments.approve);
  const markAsSpam = useMutation(api.comments.markAsSpam);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);

  useEffect(() => {
    window.localStorage.setItem('admin_reviews_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const reviewsPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'commentsPerPage');
    return (setting?.value as number) || 20;
  }, [settingsData]);

  const [resolvedReviewsPerPage, setPageSizeOverride] = usePersistedPageSize('admin_reviews_page_size', reviewsPerPage);
  const offset = (currentPage - 1) * resolvedReviewsPerPage;

  const reviewsData = useQuery(api.comments.listAdminWithOffset, {
    limit: resolvedReviewsPerPage,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
    targetType: 'product',
    targetId: filterProduct || undefined,
  });

  const totalCountData = useQuery(api.comments.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
    targetType: 'product',
    targetId: filterProduct || undefined,
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
          targetType: 'product',
          targetId: filterProduct || undefined,
        }
      : 'skip'
  );

  const isTableLoading = reviewsData === undefined
    || totalCountData === undefined
    || productsData === undefined
    || settingsData === undefined;

  const columns = [
    { key: 'rating', label: 'Đánh giá' },
    { key: 'product', label: 'Sản phẩm' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'created', label: 'Thời gian' },
  ];

  const resolvedVisibleColumns = visibleColumns.filter(key => columns.some(col => col.key === key));

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 đánh giá phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const productMap = useMemo(() => {
    const map: Record<string, string> = {};
    productsData?.forEach(product => { map[product._id] = product.name; });
    return map;
  }, [productsData]);

  const reviews = useMemo(() => reviewsData?.map(review => ({
    ...review,
    id: review._id,
    author: review.authorName,
    productName: productMap[review.targetId] || 'Sản phẩm không tồn tại',
    created: review._creationTime,
  })) ?? [], [reviewsData, productMap]);

  const sortedReviews = useSortableData(reviews, sortConfig);

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedReviewsPerPage) : 1;
  const paginatedReviews = sortedReviews;
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
    setFilterProduct('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
  };

  const handleStatusChange = (value: string) => {
    setFilterStatus(value as '' | 'Pending' | 'Approved' | 'Spam');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const handleProductChange = (value: string) => {
    setFilterProduct(value as Id<'products'> | '');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedReviews.filter(review => selectedIds.includes(review._id));
  const isPageSelected = paginatedReviews.length > 0 && selectedOnPage.length === paginatedReviews.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedReviews.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedReviews.some(review => review._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedReviews.forEach(review => next.add(review._id));
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
      toast.success('Đã xóa đánh giá');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Không thể xóa đánh giá');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} đánh giá đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      try {
        await Promise.all(selectedIds.map( async id => deleteComment({ cascade: true, id })));
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} đánh giá`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể xóa đánh giá');
      }
    }
  };

  const handleApprove = async (id: Id<"comments">) => {
    try {
      await approveComment({ id });
      toast.success('Đã duyệt đánh giá');
    } catch {
      toast.error('Không thể duyệt đánh giá');
    }
  };

  const handleSpam = async (id: Id<"comments">) => {
    try {
      await markAsSpam({ id });
      toast.success('Đã đánh dấu spam');
    } catch {
      toast.error('Không thể đánh dấu spam');
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý đánh giá sản phẩm"
        description="Kiểm duyệt và quản lý đánh giá từ khách hàng"
      />
      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="đánh giá"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedReviews.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedReviews.map(review => review._id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  applyManualSelection([]); }}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterStatus), Boolean(filterProduct)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm khách hàng hoặc nội dung..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Sản phẩm"
                value={filterProduct}
                onChange={(val) => handleProductChange(val)}
                placeholder="Tất cả sản phẩm"
                options={(productsData ?? []).map(product => ({ value: product._id, label: product.name }))}
              />
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => handleStatusChange(val)}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'Approved', label: 'Đã duyệt' },
                  { value: 'Pending', label: 'Chờ duyệt' },
                  { value: 'Spam', label: 'Spam' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterStatus || filterProduct)} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={(key) => toggleColumn(key, columns.map(c => c.key))} />
            </>
          }
        />
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                <TableHeadSelect checked={isPageSelected} onChange={toggleSelectAll} indeterminate={isPageIndeterminate} />
                <SortableHeader label="Khách hàng" sortKey="author" sortConfig={sortConfig} onSort={handleSort} className="w-[180px]" />
                <TableHead>Nội dung</TableHead>
                {resolvedVisibleColumns.includes('rating') && (
                  <SortableHeader label="Đánh giá" sortKey="rating" sortConfig={sortConfig} onSort={handleSort} className="w-[90px]" />
                )}
                {resolvedVisibleColumns.includes('product') && (
                  <SortableHeader label="Sản phẩm" sortKey="productName" sortConfig={sortConfig} onSort={handleSort} className="w-[180px]" />
                )}
                {resolvedVisibleColumns.includes('status') && (
                  <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} className="w-[120px]" />
                )}
                {resolvedVisibleColumns.includes('created') && (
                  <SortableHeader label="Thời gian" sortKey="created" sortConfig={sortConfig} onSort={handleSort} className="w-[140px]" />
                )}
                <TableHead className="text-right w-[120px]">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedReviewsPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedReviews.map(review => (
                    <TableRow key={review._id} className={selectedIds.includes(review._id) ? 'bg-blue-500/5' : ''}>
                      <TableCellSelect checked={selectedIds.includes(review._id)} onChange={() => { toggleSelectItem(review._id); }} />
                      <TableCell className="whitespace-nowrap">
                        <div className="font-medium">{review.author}</div>
                        <div className="text-xs text-slate-400">{review.authorEmail ?? 'N/A'}</div>
                      </TableCell>
                      <TableCell><p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2">{review.content}</p></TableCell>
                      {resolvedVisibleColumns.includes('rating') && (
                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">{review.rating ? `${review.rating}/5` : '—'}</TableCell>
                      )}
                      {resolvedVisibleColumns.includes('product') && (
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate max-w-[180px]">
                            <Package size={12} className="text-orange-500" />
                            {review.productName}
                          </div>
                        </TableCell>
                      )}
                      {resolvedVisibleColumns.includes('status') && (
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={review.status === 'Approved' ? 'success' : (review.status === 'Pending' ? 'secondary' : 'destructive')} className="whitespace-nowrap">
                            {review.status === 'Approved' ? 'Đã duyệt' : (review.status === 'Pending' ? 'Chờ duyệt' : 'Spam')}
                          </Badge>
                        </TableCell>
                      )}
                      {resolvedVisibleColumns.includes('created') && (
                        <TableCell className="text-xs text-slate-500 whitespace-nowrap">{new Date(review.created).toLocaleString('vi-VN')}</TableCell>
                      )}
                      <TableCell className="text-right whitespace-nowrap">
                        <RowActions>
                          {review.status !== 'Approved' && (
                            <RowActionButton
                              title="Duyệt"
                              icon={<Check size={16} />}
                              onClick={async () => handleApprove(review._id)}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                            />
                          )}
                          {review.status !== 'Spam' && (
                            <RowActionButton
                              title="Đánh dấu spam"
                              icon={<Ban size={16} />}
                              onClick={async () => handleSpam(review._id)}
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                            />
                          )}
                          <DeleteActionButton onClick={async () => handleDelete(review._id)} />
                        </RowActions>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!isTableLoading && paginatedReviews.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterStatus || filterProduct ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có đánh giá nào.'}
                />
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {isTableLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : paginatedReviews.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus || filterProduct ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có đánh giá nào.'}
            </div>
          ) : (
            paginatedReviews.map(review => (
              <MobileRowCard
                key={review._id}
                selected={selectedIds.includes(review._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(review._id)} onChange={() => toggleSelectItem(review._id)} />}
                title={review.author}
                subtitle={<span className="text-xs text-slate-500">{review.productName}</span>}
                badge={
                  <Badge variant={review.status === 'Approved' ? 'success' : (review.status === 'Pending' ? 'secondary' : 'destructive')}>
                    {review.status === 'Approved' ? 'Đã duyệt' : (review.status === 'Pending' ? 'Chờ duyệt' : 'Spam')}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic">{review.content}</p>
                    {review.rating && <div><span className="text-slate-400">Đánh giá:</span> {review.rating}/5 ⭐</div>}
                    <div><span className="text-slate-400">Thời gian:</span> {new Date(review.created).toLocaleString('vi-VN')}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    {review.status !== 'Approved' && (
                      <RowActionButton
                        title="Duyệt"
                        icon={<Check size={16} />}
                        onClick={async () => handleApprove(review._id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                      />
                    )}
                    {review.status !== 'Spam' && (
                      <RowActionButton
                        title="Đánh dấu spam"
                        icon={<Ban size={16} />}
                        onClick={async () => handleSpam(review._id)}
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      />
                    )}
                    <DeleteActionButton onClick={async () => handleDelete(review._id)} />
                  </RowActions>
                }
              />
            ))
          )}
        </MobileCardList>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={resolvedReviewsPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="đánh giá"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa đánh giá"
        itemName={reviews.find((review) => review._id === deleteTargetId)?.content ?? 'đánh giá'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
