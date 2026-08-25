'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { Eye, Loader2, Mail, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, generatePaginationItems, getNextSortState, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, TableCellSelect, TableEmptyState, TableHeadSelect, TableSkeleton, TableToolbar, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'destructive' | 'info' }> = {
  new: { label: 'Mới', variant: 'warning' },
  in_progress: { label: 'Đang xử lý', variant: 'info' },
  resolved: { label: 'Đã xử lý', variant: 'success' },
  spam: { label: 'Spam', variant: 'destructive' },
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100];

export default function ContactInboxPage() {
  return (
    <ModuleGuard moduleKey="contactInbox">
      <ContactInboxContent />
    </ModuleGuard>
  );
}

function ContactInboxContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'new' | 'in_progress' | 'resolved' | 'spam'>('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'desc', key: 'createdAt' });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_contact_inbox_visible_columns');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<'contactInquiries'>[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<'contactInquiries'> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const updateStatus = useMutation(api.contactInbox.updateInquiryStatus);
  const deleteInquiry = useMutation(api.contactInbox.remove);
  const bulkRemove = useMutation(api.contactInbox.bulkRemove);
  const inboxAdminFeature = useQuery(api.admin.modules.getModuleFeature, { moduleKey: 'contactInbox', featureKey: 'enableContactInboxAdmin' });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => { clearTimeout(timer); };
  }, [searchTerm]);

  useEffect(() => {
    if (visibleColumns.length > 0) {
      window.localStorage.setItem('admin_contact_inbox_visible_columns', JSON.stringify(visibleColumns));
    }
  }, [visibleColumns]);

  useEffect(() => {
    setCurrentPage(1);
    setManualSelectedIds([]);
    setSelectionMode('manual');
  }, [debouncedSearchTerm, filterStatus]);

  const [resolvedPageSize, setPageSizeOverride] = usePersistedPageSize('admin_contact_inbox_page_size', 20);
  const offset = (currentPage - 1) * resolvedPageSize;
  const resolvedSearch = debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined;
  const shouldLoadInbox = inboxAdminFeature?.enabled === true;

  const inquiries = useQuery(
    api.contactInbox.listInbox,
    shouldLoadInbox
      ? {
        limit: resolvedPageSize,
        offset,
        search: resolvedSearch,
        status: filterStatus || undefined,
      }
      : 'skip'
  );

  const stats = useQuery(api.contactInbox.getInboxStats, shouldLoadInbox ? {} : 'skip');
  const totalCountData = useQuery(
    api.contactInbox.countAdmin,
    shouldLoadInbox
      ? { search: resolvedSearch, status: filterStatus || undefined }
      : 'skip'
  );

  const selectAllData = useQuery(
    api.contactInbox.listAdminIds,
    shouldLoadInbox && selectionMode === 'all'
      ? { search: resolvedSearch, status: filterStatus || undefined }
      : 'skip'
  );

  const isTableLoading = shouldLoadInbox && (inquiries === undefined || totalCountData === undefined);
  const safeInquiries = useMemo(() => inquiries ?? [], [inquiries]);
  const safeStats = stats ?? { total: 0, new: 0, in_progress: 0, resolved: 0, spam: 0 };
  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedPageSize) : 1;

  const columns = useMemo(() => [
    { key: 'select', label: 'Chọn', required: true },
    { key: 'contact', label: 'Khách liên hệ', required: true },
    { key: 'subject', label: 'Chủ đề', required: true },
    { key: 'status', label: 'Trạng thái' },
    { key: 'createdAt', label: 'Thời gian' },
    { key: 'actions', label: 'Hành động', required: true },
  ], []);


  const normalizedData = useMemo(() => safeInquiries.map((inquiry) => ({
    ...inquiry,
    id: inquiry._id,
  })), [safeInquiries]);

  const sortedData = useSortableData(normalizedData, sortConfig);
  const tableColumnCount = visibleColumns.length || columns.length;

  const isSelectAllActive = selectionMode === 'all';
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 tin nhắn phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  if (inboxAdminFeature === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!inboxAdminFeature?.enabled) {
    return (
      <Card className="p-6 text-center text-slate-500">
        Tính năng quản trị tin nhắn liên hệ đang tắt. Vui lòng liên hệ quản trị viên hệ thống để bật tính năng này.
      </Card>
    );
  }

  const applyManualSelection = (nextIds: Id<'contactInquiries'>[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const selectedOnPage = sortedData.filter((inquiry) => selectedIds.includes(inquiry._id));
  const isPageSelected = sortedData.length > 0 && selectedOnPage.length === sortedData.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < sortedData.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !sortedData.some(inquiry => inquiry._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    sortedData.forEach(inquiry => next.add(inquiry._id));
    applyManualSelection(Array.from(next));
  };

  const toggleSelectItem = (id: Id<'contactInquiries'>) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(item => item !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
  };

  const handleStatusChange = async (id: Id<'contactInquiries'>, status: 'new' | 'in_progress' | 'resolved' | 'spam') => {
    try {
      await updateStatus({ id, status });
      toast.success('Đã cập nhật trạng thái');
    } catch {
      toast.error('Cập nhật trạng thái thất bại');
    }
  };

  const handleDelete = (id: Id<'contactInquiries'>) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteInquiry({ id: deleteTargetId });
      toast.success('Đã xóa tin nhắn');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Có lỗi khi xóa tin nhắn');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      return;
    }
    if (!confirm(`Xóa ${selectedIds.length} tin nhắn đã chọn?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      const count = await bulkRemove({ ids: selectedIds });
      toast.success(`Đã xóa ${count} tin nhắn`);
      applyManualSelection([]);
    } catch {
      toast.error('Có lỗi khi xóa tin nhắn');
    } finally {
      setIsDeleting(false);
    }
  };

  const selectedInquiryName = sortedData.find((item) => item._id === deleteTargetId)?.name ?? 'tin nhắn';

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Hòm thư liên hệ"
        description="Quản lý tin nhắn và yêu cầu hỗ trợ từ khách hàng"
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Tổng: {safeStats.total}</Badge>
          <Badge variant="warning">Mới: {safeStats.new}</Badge>
          <Badge variant="info">Đang xử lý: {safeStats.in_progress}</Badge>
          <Badge variant="success">Đã xử lý: {safeStats.resolved}</Badge>
        </div>
      </AdminPageHeader>

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="tin nhắn"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={sortedData.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(sortedData.map(inquiry => inquiry._id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  applyManualSelection([]); }}
        isLoading={isDeleting}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterStatus)].filter(Boolean).length}
          onResetFilters={() => {
            setSearchTerm('');
            setDebouncedSearchTerm('');
            setFilterStatus('');
            setCurrentPage(1);
            setPageSizeOverride(null);
            applyManualSelection([]);
          }}
          search={
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Tìm theo tên, email, SĐT, chủ đề..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => setFilterStatus(val as typeof filterStatus)}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'new', label: 'Mới' },
                  { value: 'in_progress', label: 'Đang xử lý' },
                  { value: 'resolved', label: 'Đã xử lý' },
                  { value: 'spam', label: 'Spam' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterStatus)} onReset={() => {
                setSearchTerm('');
                setDebouncedSearchTerm('');
                setFilterStatus('');
                setCurrentPage(1);
                setPageSizeOverride(null);
                applyManualSelection([]);
              }} />
              <ColumnToggle columns={columns} visibleColumns={visibleColumns} onToggle={toggleColumn} />
            </>
          }
        />

        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                {visibleColumns.includes('select') && (
                  <TableHeadSelect checked={isPageSelected} onChange={toggleSelectAll} indeterminate={isPageIndeterminate} />
                )}
                {visibleColumns.includes('contact') && (
                  <SortableHeader label="Khách liên hệ" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                )}
                {visibleColumns.includes('subject') && (
                  <SortableHeader label="Chủ đề" sortKey="subject" sortConfig={sortConfig} onSort={handleSort} />
                )}
                {visibleColumns.includes('status') && (
                  <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                )}
                {visibleColumns.includes('createdAt') && (
                  <SortableHeader label="Thời gian" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
                )}
                {visibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedPageSize} cols={tableColumnCount} />
              ) : (
                <>
                  {sortedData.map((inquiry) => (
                    <TableRow key={inquiry._id} className={selectedIds.includes(inquiry._id) ? 'bg-blue-500/5' : ''}>
                  {visibleColumns.includes('select') && (
                    <TableCellSelect checked={selectedIds.includes(inquiry._id)} onChange={() =>{  toggleSelectItem(inquiry._id); }} />
                  )}
                  {visibleColumns.includes('contact') && (
                    <TableCell className="whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{inquiry.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          {inquiry.email && <span className="flex items-center gap-1"><Mail size={12} />{inquiry.email}</span>}
                          {inquiry.phone && <span>{inquiry.phone}</span>}
                        </div>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('subject') && (
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{inquiry.subject}</div>
                        <div className="text-xs text-slate-500 line-clamp-2" title={inquiry.message}>{inquiry.message}</div>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col gap-2">
                        <Badge variant={STATUS_LABELS[inquiry.status]?.variant ?? 'secondary'}>
                          {STATUS_LABELS[inquiry.status]?.label ?? inquiry.status}
                        </Badge>
                        <FilterSelect
                          value={inquiry.status}
                          onChange={(val) => { void handleStatusChange(inquiry._id, val as 'new' | 'in_progress' | 'resolved' | 'spam'); }}
                          options={[
                            { value: 'new', label: 'Mới' },
                            { value: 'in_progress', label: 'Đang xử lý' },
                            { value: 'resolved', label: 'Đã xử lý' },
                            { value: 'spam', label: 'Spam' },
                          ]}
                        />
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('createdAt') && (
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {new Date(inquiry.createdAt).toLocaleString('vi-VN')}
                    </TableCell>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <RowActionButton
                          title="Xem chi tiết"
                          icon={<Eye size={16} />}
                          href={`/admin/contact-inbox/${inquiry._id}`}
                        />
                        <DeleteActionButton onClick={() => handleDelete(inquiry._id)} />
                      </RowActions>
                    </TableCell>
                  )}
                    </TableRow>
                  ))}
                </>
              )}
              {!isTableLoading && sortedData.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterStatus ? 'Không tìm thấy tin nhắn phù hợp' : 'Chưa có tin nhắn nào.'}
                />
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {isTableLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : sortedData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus ? 'Không tìm thấy tin nhắn phù hợp' : 'Chưa có tin nhắn nào.'}
            </div>
          ) : (
            sortedData.map(inquiry => (
              <MobileRowCard
                key={inquiry._id}
                selected={selectedIds.includes(inquiry._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(inquiry._id)} onChange={() => toggleSelectItem(inquiry._id)} />}
                title={inquiry.name}
                subtitle={<span className="text-xs text-slate-500">{inquiry.subject}</span>}
                badge={
                  <Badge variant={STATUS_LABELS[inquiry.status]?.variant ?? 'secondary'}>
                    {STATUS_LABELS[inquiry.status]?.label ?? inquiry.status}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <p className="text-xs text-slate-700 dark:text-slate-300 italic line-clamp-2">{inquiry.message}</p>
                    {inquiry.email && <div><span className="text-slate-400">Email:</span> {inquiry.email}</div>}
                    {inquiry.phone && <div><span className="text-slate-400">SĐT:</span> {inquiry.phone}</div>}
                    <div><span className="text-slate-400">Thời gian:</span> {new Date(inquiry.createdAt).toLocaleString('vi-VN')}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    <RowActionButton
                      title="Xem chi tiết"
                      icon={<Eye size={16} />}
                      href={`/admin/contact-inbox/${inquiry._id}`}
                    />
                    <DeleteActionButton onClick={() => handleDelete(inquiry._id)} />
                  </RowActions>
                }
              />
            ))
          )}
        </MobileCardList>

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
          entityLabel="tin nhắn"
        />
      </Card>

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa tin nhắn"
        itemName={selectedInquiryName}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
