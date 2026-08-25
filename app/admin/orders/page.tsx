'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ChevronDown, Copy, Edit, ExternalLink, Eye, Plus, Search, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, TableCellSelect, TableEmptyState, TableHeadSelect, TableSkeleton, TableToolbar, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { useOrderStatuses } from '@/lib/experiences';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import { buildAbsoluteWebUrl, buildPublicOrderLookupPath } from '@/lib/orders/links';

const MODULE_KEY = 'orders';

type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, 'secondary' | 'success' | 'destructive'> = {
  Failed: 'destructive',
  Paid: 'success',
  Pending: 'secondary',
  Refunded: 'secondary',
};

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  Failed: 'Thất bại',
  Paid: 'Đã TT',
  Pending: 'Chờ TT',
  Refunded: 'Hoàn tiền',
};

export default function OrdersListPage() {
  return (
    <ModuleGuard moduleKey="orders">
      <OrdersContent />
    </ModuleGuard>
  );
}

function OrdersContent() {
  const customersData = useQuery(api.customers.listAll, { limit: 500 });
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const { statuses: orderStatuses } = useOrderStatuses();
  
  const deleteOrder = useMutation(api.orders.remove);
  const bulkDeleteOrders = useMutation(api.orders.bulkRemove);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<'' | 'Pending' | 'Paid' | 'Failed' | 'Refunded'>('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_orders_visible_columns');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"orders">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"orders"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const isSelectAllActive = selectionMode === 'all';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);



  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);
  const statusMap = useMemo(() => new Map(orderStatuses.map((status) => [status.key, status])), [orderStatuses]);
  const getStatusVariant = (statusKey: string) => {
    const key = statusKey.toLowerCase();
    if (key.includes('cancel')) return 'destructive';
    if (key.includes('refund')) return 'secondary';
    if (key.includes('deliver') || key.includes('complete')) return 'success';
    if (key.includes('ship') || key.includes('process')) return 'warning';
    return 'secondary';
  };

  const buildOrderLookupUrl = (orderNumber: string) => {
    const path = buildPublicOrderLookupPath(orderNumber);
    return typeof window === 'undefined'
      ? path
      : buildAbsoluteWebUrl(window.location.origin, path);
  };

  const handleCopyOrderLookupUrl = async (orderNumber: string) => {
    try {
      await navigator.clipboard.writeText(buildOrderLookupUrl(orderNumber));
      toast.success('Đã copy link tra cứu đơn hàng.');
    } catch {
      toast.error('Không thể copy link. Vui lòng copy thủ công.');
    }
  };

  const handleOpenOrderLookupUrl = (orderNumber: string) => {
    window.open(buildOrderLookupUrl(orderNumber), '_blank', 'noopener,noreferrer');
  };

  const columns = useMemo(() => {
    const cols = [
      { key: 'select', label: 'Chọn', required: true },
      { key: 'orderNumber', label: 'Mã đơn', required: true },
      { key: 'customer', label: 'Khách hàng' },
      { key: 'items', label: 'Sản phẩm' },
      { key: 'totalAmount', label: 'Tổng tiền' },
      { key: 'status', label: 'Trạng thái' },
    ];
    if (enabledFields.has('paymentStatus')) {cols.push({ key: 'paymentStatus', label: 'Thanh toán' });}
    if (enabledFields.has('trackingNumber')) {cols.push({ key: 'trackingNumber', label: 'Mã vận đơn' });}
    cols.push({ key: 'createdAt', label: 'Ngày tạo' });
    cols.push({ key: 'actions', label: 'Hành động', required: true });
    return cols;
  }, [enabledFields]);



  // Lấy setting ordersPerPage từ module settings
  const ordersPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'ordersPerPage');
    return (setting?.value as number) || 20;
  }, [settingsData]);

  const [resolvedOrdersPerPage, setPageSizeOverride] = usePersistedPageSize('admin_orders_page_size', ordersPerPage);

  const offset = (currentPage - 1) * resolvedOrdersPerPage;

  const ordersData = useQuery(api.orders.listAdminWithOffset, {
    limit: resolvedOrdersPerPage,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
    paymentStatus: filterPaymentStatus || undefined,
  });

  const totalCountData = useQuery(api.orders.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
    paymentStatus: filterPaymentStatus || undefined,
  });

  const deleteInfo = useQuery(
    api.orders.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const selectAllData = useQuery(
    api.orders.listAdminIds,
    isSelectAllActive
      ? {
          search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
          status: filterStatus || undefined,
          paymentStatus: filterPaymentStatus || undefined,
        }
      : 'skip'
  );

  const isTableLoading = ordersData === undefined || totalCountData === undefined || customersData === undefined || fieldsData === undefined;

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 đơn hàng phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  // Build customer map using Map for O(1) lookup
  const customerMap = useMemo(() => {
    const map = new Map<string, string>();
    customersData?.forEach(c => map.set(c._id, c.name));
    return map;
  }, [customersData]);

  const orders = useMemo(() => ordersData?.map(o => ({
      ...o,
      id: o._id,
      customerName: customerMap.get(o.customerId) ?? 'Không xác định',
      itemsCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
    })) ?? [], [ordersData, customerMap]);

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
  };

  const sortedData = useSortableData(orders, sortConfig);

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedOrdersPerPage) : 1;
  const paginatedData = sortedData;
  const tableColumnCount = visibleColumns.length;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"orders">[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterStatus('');
    setFilterPaymentStatus('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const handleFilterChange = (type: 'status' | 'paymentStatus', value: string) => {
    if (type === 'status') {
      setFilterStatus(value);
    } else {
      setFilterPaymentStatus(value as '' | 'Pending' | 'Paid' | 'Failed' | 'Refunded');
    }
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedData.filter(order => selectedIds.includes(order._id));
  const isPageSelected = paginatedData.length > 0 && selectedOnPage.length === paginatedData.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedData.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedData.some(order => order._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedData.forEach(order => next.add(order._id));
    applyManualSelection(Array.from(next));
  };

  const toggleSelectItem = (id: Id<"orders">) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDelete = async (id: Id<"orders">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteOrder({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa đơn hàng');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Có lỗi khi xóa đơn hàng');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} đơn hàng đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      setIsDeleting(true);
      try {
        const deletedCount = await bulkDeleteOrders({ cascade: true, ids: selectedIds });
        applyManualSelection([]);
        toast.success(`Đã xóa ${deletedCount} đơn hàng`);
      } catch {
        toast.error('Có lỗi khi xóa đơn hàng');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(price);
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('vi-VN');

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý đơn hàng"
        description="Quản lý đơn hàng và vận chuyển"
        addHref="/admin/orders/create"
      />

      <BulkActionBar 
        selectedCount={selectedIds.length} 
        entityLabel="đơn hàng"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedData.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedData.map(order => order._id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onDelete={handleBulkDelete} 
        onClearSelection={() =>{  applyManualSelection([]); }} 
        isLoading={isDeleting}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterStatus), Boolean(filterPaymentStatus)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm mã đơn, khách hàng..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Trạng thái đơn hàng"
                value={filterStatus}
                onChange={(val) => handleFilterChange('status', val)}
                placeholder="Tất cả trạng thái"
                options={orderStatuses.map((status) => ({ value: status.key, label: status.label }))}
              />
              {enabledFields.has('paymentStatus') && (
                <FilterSelect
                  label="Trạng thái thanh toán"
                  value={filterPaymentStatus}
                  onChange={(val) => handleFilterChange('paymentStatus', val)}
                  placeholder="Tất cả TT toán"
                  options={[
                    { value: 'Pending', label: 'Chờ thanh toán' },
                    { value: 'Paid', label: 'Đã thanh toán' },
                    { value: 'Failed', label: 'Thất bại' },
                    { value: 'Refunded', label: 'Hoàn tiền' },
                  ]}
                />
              )}
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterStatus || filterPaymentStatus)} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={visibleColumns} onToggle={(key) => toggleColumn(key, columns.map(c => c.key))} />
            </>
          }
        />
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                {visibleColumns.includes('select') && <TableHeadSelect checked={isPageSelected} onChange={toggleSelectAll} indeterminate={isPageIndeterminate} />}
                {visibleColumns.includes('orderNumber') && <SortableHeader label="Mã đơn" sortKey="orderNumber" sortConfig={sortConfig} onSort={handleSort} />}
                {visibleColumns.includes('customer') && <SortableHeader label="Khách hàng" sortKey="customerName" sortConfig={sortConfig} onSort={handleSort} />}
                {visibleColumns.includes('items') && <TableHead>Sản phẩm</TableHead>}
                {visibleColumns.includes('totalAmount') && <SortableHeader label="Tổng tiền" sortKey="totalAmount" sortConfig={sortConfig} onSort={handleSort} />}
                {visibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />}
                {visibleColumns.includes('paymentStatus') && enabledFields.has('paymentStatus') && <SortableHeader label="Thanh toán" sortKey="paymentStatus" sortConfig={sortConfig} onSort={handleSort} />}
                {visibleColumns.includes('trackingNumber') && enabledFields.has('trackingNumber') && <TableHead>Mã vận đơn</TableHead>}
                {visibleColumns.includes('createdAt') && <SortableHeader label="Ngày tạo" sortKey="_creationTime" sortConfig={sortConfig} onSort={handleSort} />}
                {visibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedOrdersPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedData.map(order => (
                    <TableRow key={order._id} className={selectedIds.includes(order._id) ? 'bg-emerald-500/5' : ''}>
                      {visibleColumns.includes('select') && <TableCellSelect checked={selectedIds.includes(order._id)} onChange={() => { toggleSelectItem(order._id); }} />}
                  {visibleColumns.includes('orderNumber') && <TableCell className="font-mono text-sm font-medium text-emerald-600 whitespace-nowrap">{order.orderNumber}</TableCell>}
                  {visibleColumns.includes('customer') && <TableCell className="whitespace-nowrap">{order.customerName}</TableCell>}
                  {visibleColumns.includes('items') && (
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <ShoppingBag size={14} className="text-slate-400" />
                        <span>{order.itemsCount} sản phẩm</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('totalAmount') && <TableCell className="font-medium whitespace-nowrap">{formatPrice(order.totalAmount)}</TableCell>}
                  {visibleColumns.includes('status') && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={getStatusVariant(order.status)}>
                        {statusMap.get(order.status)?.label ?? order.status}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('paymentStatus') && enabledFields.has('paymentStatus') && order.paymentStatus && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={PAYMENT_STATUS_COLORS[order.paymentStatus as PaymentStatus]}>
                        {PAYMENT_STATUS_LABELS[order.paymentStatus as PaymentStatus]}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('trackingNumber') && enabledFields.has('trackingNumber') && (
                    <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">{order.trackingNumber ?? '-'}</TableCell>
                  )}
                  {visibleColumns.includes('createdAt') && <TableCell className="text-slate-500 text-sm whitespace-nowrap">{formatDate(order._creationTime)}</TableCell>}
                  {visibleColumns.includes('actions') && (
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <EditActionButton href={`/admin/orders/${order._id}/edit`} title="Xem chi tiết đơn hàng" />
                        <RowActionButton title="Copy link tra cứu" icon={<Copy size={16} />} onClick={async () => handleCopyOrderLookupUrl(order.orderNumber)} />
                        <RowActionButton title="Mở link tra cứu" icon={<ExternalLink size={16} />} onClick={() => handleOpenOrderLookupUrl(order.orderNumber)} />
                        <DeleteActionButton onClick={async () => handleDelete(order._id)} />
                      </RowActions>
                    </TableCell>
                  )}
                    </TableRow>
                  ))}
                </>
              )}
              {!isTableLoading && paginatedData.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterStatus || filterPaymentStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có đơn hàng nào.'}
                />
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {isTableLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : paginatedData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus || filterPaymentStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có đơn hàng nào.'}
            </div>
          ) : (
            paginatedData.map(order => (
              <MobileRowCard
                key={order._id}
                selected={selectedIds.includes(order._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(order._id)} onChange={() => toggleSelectItem(order._id)} />}
                title={<span className="font-mono text-emerald-600">{order.orderNumber}</span>}
                subtitle={<span className="text-xs text-slate-500">{order.customerName}</span>}
                badge={
                  <Badge variant={getStatusVariant(order.status)}>
                    {statusMap.get(order.status)?.label ?? order.status}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Tổng tiền:</span> <span className="font-medium text-slate-900 dark:text-slate-100">{formatPrice(order.totalAmount)}</span></div>
                    <div><span className="text-slate-400">Sản phẩm:</span> {order.itemsCount} sản phẩm</div>
                    <div><span className="text-slate-400">Ngày tạo:</span> {formatDate(order._creationTime)}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    <EditActionButton href={`/admin/orders/${order._id}/edit`} title="Xem chi tiết" />
                    <RowActionButton title="Copy link tra cứu" icon={<Copy size={16} />} onClick={async () => handleCopyOrderLookupUrl(order.orderNumber)} />
                    <RowActionButton title="Mở link tra cứu" icon={<ExternalLink size={16} />} onClick={() => handleOpenOrderLookupUrl(order.orderNumber)} />
                    <DeleteActionButton onClick={async () => handleDelete(order._id)} />
                  </RowActions>
                }
              />
            ))
          )}
        </MobileCardList>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={resolvedOrdersPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="đơn hàng"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa đơn hàng"
        itemName={orders.find((order) => order.id === deleteTargetId)?.orderNumber ?? 'đơn hàng'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
