'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { AlertTriangle, Ban, Bell, CheckCircle, ChevronDown, Edit, Info, Plus, Search, Send, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, generatePaginationItems, getNextSortState, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, TableCellSelect, TableEmptyState, TableHeadSelect, TableSkeleton, TableToolbar, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { usePersistedPageSize } from '../components/usePersistedPageSize';

const MODULE_KEY = 'notifications';

const TYPE_CONFIG = {
  error: { bg: 'bg-red-500/10', color: 'text-red-500', icon: XCircle, label: 'Lỗi' },
  info: { bg: 'bg-blue-500/10', color: 'text-blue-500', icon: Info, label: 'Thông tin' },
  success: { bg: 'bg-green-500/10', color: 'text-green-500', icon: CheckCircle, label: 'Thành công' },
  warning: { bg: 'bg-amber-500/10', color: 'text-amber-500', icon: AlertTriangle, label: 'Cảnh báo' },
};

const STATUS_CONFIG = {
  Cancelled: { label: 'Đã hủy', variant: 'destructive' as const },
  Draft: { label: 'Bản nháp', variant: 'secondary' as const },
  Scheduled: { label: 'Đã hẹn', variant: 'warning' as const },
  Sent: { label: 'Đã gửi', variant: 'success' as const },
};

const TARGET_LABELS = {
  all: 'Tất cả',
  customers: 'Khách hàng',
  specific: 'Cụ thể',
  users: 'Admin',
};

export default function NotificationsListPage() {
  return (
    <ModuleGuard moduleKey={MODULE_KEY}>
      <NotificationsContent />
    </ModuleGuard>
  );
}

function NotificationsContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Draft' | 'Scheduled' | 'Sent' | 'Cancelled'>('');
  const [filterType, setFilterType] = useState<'' | 'info' | 'success' | 'warning' | 'error'>('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"notifications">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_notifications_visible_columns');
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const isSelectAllActive = selectionMode === 'all';

  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });
  const deleteNotification = useMutation(api.notifications.remove);
  const sendNotification = useMutation(api.notifications.send);
  const cancelNotification = useMutation(api.notifications.cancel);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);

  useEffect(() => {
    window.localStorage.setItem('admin_notifications_visible_columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const itemsPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'itemsPerPage');
    return (setting?.value as number) || 20;
  }, [settingsData]);

  const [resolvedItemsPerPage, setPageSizeOverride] = usePersistedPageSize('admin_notifications_page_size', itemsPerPage);
  const offset = (currentPage - 1) * resolvedItemsPerPage;
  const resolvedSearch = debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined;

  const notificationsData = useQuery(api.notifications.listAdminWithOffset, {
    limit: resolvedItemsPerPage,
    offset,
    search: resolvedSearch,
    status: filterStatus || undefined,
    type: filterType || undefined,
  });

  const totalCountData = useQuery(api.notifications.countAdmin, {
    search: resolvedSearch,
    status: filterStatus || undefined,
    type: filterType || undefined,
  });

  const selectAllData = useQuery(
    api.notifications.listAdminIds,
    isSelectAllActive
      ? {
          search: resolvedSearch,
          status: filterStatus || undefined,
          type: filterType || undefined,
        }
      : 'skip'
  );

  const isTableLoading = notificationsData === undefined
    || totalCountData === undefined
    || settingsData === undefined
    || featuresData === undefined;

  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach(f => { features[f.featureKey] = f.enabled; });
    return features;
  }, [featuresData]);

  const columns = [
    { key: 'type', label: 'Loại' },
    ...(enabledFeatures.enableTargeting ?? true ? [{ key: 'target', label: 'Đối tượng' }] : []),
    { key: 'status', label: 'Trạng thái' },
    { key: 'readCount', label: 'Đã đọc' },
    ...(enabledFeatures.enableScheduling ?? true ? [{ key: 'schedule', label: 'Thời gian' }] : []),
  ];

  const resolvedVisibleColumns = visibleColumns.filter(key => columns.some(col => col.key === key));

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 thông báo phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const notifications = useMemo(() => notificationsData?.map(n => ({
    ...n,
    typeLabel: TYPE_CONFIG[n.type]?.label || n.type,
    statusLabel: STATUS_CONFIG[n.status]?.label || n.status,
    targetLabel: TARGET_LABELS[n.targetType] || n.targetType,
  })) ?? [], [notificationsData]);

  const sortedNotifications = useSortableData(notifications, sortConfig);

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedItemsPerPage) : 1;
  const paginatedNotifications = sortedNotifications;
  const tableColumnCount = resolvedVisibleColumns.length + 3;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"notifications">[]) => {
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

  const handleStatusChange = (value: string) => {
    setFilterStatus(value as '' | 'Draft' | 'Scheduled' | 'Sent' | 'Cancelled');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const handleTypeChange = (value: string) => {
    setFilterType(value as '' | 'info' | 'success' | 'warning' | 'error');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedNotifications.filter(notif => selectedIds.includes(notif._id));
  const isPageSelected = paginatedNotifications.length > 0 && selectedOnPage.length === paginatedNotifications.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedNotifications.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedNotifications.some(notif => notif._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedNotifications.forEach(notif => next.add(notif._id));
    applyManualSelection(Array.from(next));
  };

  const toggleSelectItem = (id: Id<"notifications">) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDelete = async (id: Id<"notifications">) => {
    if (confirm('Xóa thông báo này?')) {
      try {
        await deleteNotification({ id });
        toast.success('Đã xóa thông báo');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      }
    }
  };

  const handleSend = async (id: Id<"notifications">) => {
    if (confirm('Gửi thông báo này ngay?')) {
      try {
        await sendNotification({ id });
        toast.success('Đã gửi thông báo');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      }
    }
  };

  const handleCancel = async (id: Id<"notifications">) => {
    if (confirm('Hủy thông báo này?')) {
      try {
        await cancelNotification({ id });
        toast.success('Đã hủy thông báo');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} thông báo đã chọn?`)) {
      try {
        setIsBulkDeleting(true);
        await Promise.all(selectedIds.map( async id => deleteNotification({ id })));
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} thông báo`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) {return '-';}
    return new Date(timestamp).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý thông báo"
        description="Soạn thảo, lên lịch và gửi thông báo tới người dùng"
        addHref="/admin/notifications/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="thông báo"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedNotifications.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedNotifications.map(notif => notif._id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  applyManualSelection([]); }}
        isLoading={isBulkDeleting}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterStatus), Boolean(filterType)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm kiếm tiêu đề, nội dung..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => handleStatusChange(val)}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'Draft', label: 'Bản nháp' },
                  { value: 'Scheduled', label: 'Đã hẹn' },
                  { value: 'Sent', label: 'Đã gửi' },
                  { value: 'Cancelled', label: 'Đã hủy' },
                ]}
              />
              <FilterSelect
                label="Loại"
                value={filterType}
                onChange={(val) => handleTypeChange(val)}
                placeholder="Tất cả loại"
                options={[
                  { value: 'info', label: 'Thông tin' },
                  { value: 'success', label: 'Thành công' },
                  { value: 'warning', label: 'Cảnh báo' },
                  { value: 'error', label: 'Lỗi' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterType || filterStatus)} onReset={handleResetFilters} />
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
                {resolvedVisibleColumns.includes('type') && <TableHead className="w-[40px]">Loại</TableHead>}
                <SortableHeader label="Tiêu đề" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                {resolvedVisibleColumns.includes('target') && <TableHead>Đối tượng</TableHead>}
                {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('readCount') && <SortableHeader label="Đã đọc" sortKey="readCount" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('schedule') && <TableHead>Thời gian</TableHead>}
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedItemsPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedNotifications.map(notif => {
                    const TypeIcon = TYPE_CONFIG[notif.type]?.icon || Bell;
                    const typeConfig = TYPE_CONFIG[notif.type];
                    const statusConfig = STATUS_CONFIG[notif.status];
                    return (
                      <TableRow key={notif._id} className={selectedIds.includes(notif._id) ? 'bg-pink-500/5' : ''}>
                        <TableCellSelect checked={selectedIds.includes(notif._id)} onChange={() =>{  toggleSelectItem(notif._id); }} />
                        {resolvedVisibleColumns.includes('type') && (
                          <TableCell className="whitespace-nowrap">
                            <div className={`w-8 h-8 rounded-lg ${typeConfig?.bg} flex items-center justify-center`}>
                              <TypeIcon size={16} className={typeConfig?.color} />
                            </div>
                          </TableCell>
                        )}
                        <TableCell>
                          <div className="font-medium max-w-[250px] truncate">{notif.title}</div>
                          <div className="text-xs text-slate-500 max-w-[250px] truncate">{notif.content}</div>
                        </TableCell>
                        {resolvedVisibleColumns.includes('target') && (
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline">{notif.targetLabel}</Badge>
                            {(enabledFeatures.enableEmail ?? true) && notif.sendEmail && <span className="ml-1 text-xs text-pink-500">📧</span>}
                          </TableCell>
                        )}
                        {resolvedVisibleColumns.includes('status') && (
                          <TableCell className="whitespace-nowrap">
                            <Badge variant={statusConfig?.variant}>{statusConfig?.label}</Badge>
                          </TableCell>
                        )}
                        {resolvedVisibleColumns.includes('readCount') && (
                          <TableCell className="text-slate-500 whitespace-nowrap">{notif.readCount.toLocaleString()}</TableCell>
                        )}
                        {resolvedVisibleColumns.includes('schedule') && (
                          <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                            {notif.status === 'Sent' ? formatDate(notif.sentAt) : (notif.status === 'Scheduled' ? formatDate(notif.scheduledAt) : '-')}
                          </TableCell>
                        )}
                        <TableCell className="text-right whitespace-nowrap">
                          <RowActions>
                            {(notif.status === 'Draft' || notif.status === 'Scheduled') && (
                              <RowActionButton
                                title="Gửi ngay"
                                icon={<Send size={16} />}
                                onClick={async () => handleSend(notif._id)}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                              />
                            )}
                            {notif.status === 'Scheduled' && (
                              <RowActionButton
                                title="Hủy"
                                icon={<Ban size={16} />}
                                onClick={async () => handleCancel(notif._id)}
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                              />
                            )}
                            <EditActionButton href={`/admin/notifications/${notif._id}/edit`} />
                            <DeleteActionButton onClick={async () => handleDelete(notif._id)} />
                          </RowActions>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </>
              )}
              {!isTableLoading && paginatedNotifications.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterStatus || filterType ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có thông báo nào'}
                />
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {isTableLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : paginatedNotifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus || filterType ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có thông báo nào'}
            </div>
          ) : (
            paginatedNotifications.map(notif => {
              const statusConfig = STATUS_CONFIG[notif.status];
              return (
                <MobileRowCard
                  key={notif._id}
                  selected={selectedIds.includes(notif._id)}
                  checkbox={<SelectCheckbox checked={selectedIds.includes(notif._id)} onChange={() => toggleSelectItem(notif._id)} />}
                  title={notif.title}
                  subtitle={<span className="text-xs text-slate-500">{notif.content}</span>}
                  badge={
                    <Badge variant={statusConfig?.variant}>{statusConfig?.label}</Badge>
                  }
                  details={
                    <div className="space-y-1">
                      <div><span className="text-slate-400">Đối tượng:</span> {notif.targetLabel}</div>
                      <div><span className="text-slate-400">Đã đọc:</span> {notif.readCount.toLocaleString()}</div>
                      <div><span className="text-slate-400">Thời gian:</span> {notif.status === 'Sent' ? formatDate(notif.sentAt) : (notif.status === 'Scheduled' ? formatDate(notif.scheduledAt) : '-')}</div>
                    </div>
                  }
                  actions={
                    <RowActions>
                      {(notif.status === 'Draft' || notif.status === 'Scheduled') && (
                        <RowActionButton
                          title="Gửi ngay"
                          icon={<Send size={16} />}
                          onClick={async () => handleSend(notif._id)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                        />
                      )}
                      {notif.status === 'Scheduled' && (
                        <RowActionButton
                          title="Hủy"
                          icon={<Ban size={16} />}
                          onClick={async () => handleCancel(notif._id)}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        />
                      )}
                      <EditActionButton href={`/admin/notifications/${notif._id}/edit`} />
                      <DeleteActionButton onClick={async () => handleDelete(notif._id)} />
                    </RowActions>
                  }
                />
              );
            })
          )}
        </MobileCardList>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={resolvedItemsPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="thông báo"
        />
      </Card>
    </AdminPageLayout>
  );
}
