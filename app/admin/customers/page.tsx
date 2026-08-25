'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ChevronDown, Edit, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, MobileCardList, MobileRowCard, ResetFilterButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, TableCellSelect, TableEmptyState, TableHeadSelect, TableSkeleton, TableToolbar, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';

const MODULE_KEY = 'customers';

export default function CustomersListPage() {
  return (
    <ModuleGuard moduleKey={MODULE_KEY}>
      <CustomersContent />
    </ModuleGuard>
  );
}

function CustomersContent() {
  // Convex queries
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });

  // Convex mutations
  const deleteCustomer = useMutation(api.customers.remove);

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Active' | 'Inactive'>('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_customers_visible_columns');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"customers">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"customers"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);

  const isSelectAllActive = selectionMode === 'all';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);



  const customersPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'customersPerPage');
    return (setting?.value as number) || 20;
  }, [settingsData]);

  const [resolvedCustomersPerPage, setPageSizeOverride] = usePersistedPageSize('admin_customers_page_size', customersPerPage);

  const offset = (currentPage - 1) * resolvedCustomersPerPage;

  const customersData = useQuery(api.customers.listAdminWithOffset, {
    limit: resolvedCustomersPerPage,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
  });

  const deleteInfo = useQuery(
    api.customers.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const totalCountData = useQuery(api.customers.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
  });

  const selectAllData = useQuery(
    api.customers.listAdminIds,
    isSelectAllActive
      ? {
          search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
          status: filterStatus || undefined,
        }
      : 'skip'
  );

  const isTableLoading = customersData === undefined || totalCountData === undefined;

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 khách hàng phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  // Get enabled features
  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach(f => { features[f.featureKey] = f.enabled; });
    return features;
  }, [featuresData]);

  const showAvatar = enabledFeatures.enableAvatar ?? true;

  const columns = [
    { key: 'select', label: 'Chọn', required: true },
    { key: 'customer', label: 'Khách hàng', required: true },
    { key: 'contact', label: 'Liên hệ' },
    { key: 'city', label: 'Thành phố' },
    { key: 'orders', label: 'Đơn hàng' },
    { key: 'totalSpent', label: 'Tổng chi tiêu' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Hành động', required: true }
  ];
  const resolvedVisibleColumns = visibleColumns.length > 0 ? visibleColumns : columns.map(c => c.key);

  // Map customers data
  const customers = useMemo(() => customersData?.map(c => ({
      ...c,
      id: c._id,
    })) ?? [], [customersData]);

  const sortedData = useSortableData(customers, sortConfig);

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedCustomersPerPage) : 1;
  const paginatedData = sortedData;
  const tableColumnCount = resolvedVisibleColumns.length;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"customers">[]) => {
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
    applyManualSelection([]);
  };

  const handleFilterChange = (value: string) => {
    setFilterStatus(value as '' | 'Active' | 'Inactive');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    applyManualSelection([]);
  };


  const selectedOnPage = paginatedData.filter(customer => selectedIds.includes(customer._id));
  const isPageSelected = paginatedData.length > 0 && selectedOnPage.length === paginatedData.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedData.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedData.some(customer => customer._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedData.forEach(customer => next.add(customer._id));
    applyManualSelection(Array.from(next));
  };
  const toggleSelectItem = (id: Id<"customers">) =>{
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDelete = async (id: Id<"customers">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteCustomer({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa khách hàng');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Có lỗi khi xóa khách hàng';
      toast.error(message);
    } finally {
      setIsDeleteLoading(false);
    }
  };

  // CUST-007 FIX: Bulk delete with progress indicator
  const handleBulkDelete = async () => {
    if (!confirm(`Xóa ${selectedIds.length} khách hàng đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {return;}
    
    const total = selectedIds.length;
    let deleted = 0;
    let failed = 0;
    
    toast.loading(`Đang xóa 0/${total}...`);
    
    for (const id of selectedIds) {
      try {
        await deleteCustomer({ cascade: true, id });
        deleted++;
        toast.loading(`Đang xóa ${deleted}/${total}...`);
      } catch {
        failed++;
      }
    }
    
    toast.dismiss();
    applyManualSelection([]);
    
    if (failed === 0) {
      toast.success(`Đã xóa ${deleted} khách hàng`);
    } else {
      toast.warning(`Đã xóa ${deleted}/${total} khách hàng. ${failed} lỗi.`);
    }
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý khách hàng"
        description="Quản lý thông tin khách hàng và lịch sử mua hàng"
        addHref="/admin/customers/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="khách hàng"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedData.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedData.map(customer => customer._id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
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
              onChange={(val) => handleSearchChange(val)}
              placeholder="Tìm tên, email, SĐT..."
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
                  { value: 'Active', label: 'Hoạt động' },
                  { value: 'Inactive', label: 'Đã khóa' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterStatus)} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={toggleColumn} />
            </>
          }
        />

        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                {resolvedVisibleColumns.includes('select') && (
                  <TableHeadSelect
                    checked={isPageSelected}
                    onChange={toggleSelectAll}
                    indeterminate={isPageIndeterminate}
                  />
                )}
                {resolvedVisibleColumns.includes('customer') && <SortableHeader label="Khách hàng" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('contact') && <TableHead>Liên hệ</TableHead>}
                {resolvedVisibleColumns.includes('city') && <SortableHeader label="Thành phố" sortKey="city" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('orders') && <SortableHeader label="Đơn hàng" sortKey="ordersCount" sortConfig={sortConfig} onSort={handleSort} className="text-center" />}
                {resolvedVisibleColumns.includes('totalSpent') && <SortableHeader label="Tổng chi tiêu" sortKey="totalSpent" sortConfig={sortConfig} onSort={handleSort} className="text-right" />}
                {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} className="text-center" />}
                {resolvedVisibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedCustomersPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedData.map(customer => (
                    <TableRow key={customer._id} className={selectedIds.includes(customer._id) ? 'bg-blue-500/5' : ''}>
                  {resolvedVisibleColumns.includes('select') && (
                    <TableCellSelect checked={selectedIds.includes(customer._id)} onChange={() => { toggleSelectItem(customer._id); }} />
                  )}
                  {resolvedVisibleColumns.includes('customer') && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {showAvatar && (
                          customer.avatar ? (
                            <Image src={customer.avatar} width={36} height={36} className="w-9 h-9 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-medium text-sm">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                          )
                        )}
                        <div className="font-medium">{customer.name}</div>
                      </div>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('contact') && (
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm">{customer.email}</div>
                      <div className="text-xs text-slate-500">{customer.phone}</div>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('city') && (
                    <TableCell className="text-slate-500 whitespace-nowrap">{customer.city ?? '-'}</TableCell>
                  )}
                  {resolvedVisibleColumns.includes('orders') && (
                    <TableCell className="text-center whitespace-nowrap">
                      <Badge variant="secondary">{customer.ordersCount}</Badge>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('totalSpent') && (
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(customer.totalSpent)}
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('status') && (
                    <TableCell className="text-center whitespace-nowrap">
                      <Badge variant={customer.status === 'Active' ? 'success' : 'secondary'}>
                        {customer.status === 'Active' ? 'Hoạt động' : 'Đã khóa'}
                      </Badge>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('actions') && (
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <EditActionButton href={`/admin/customers/${customer._id}/edit`} />
                        <DeleteActionButton onClick={async () => handleDelete(customer._id)} />
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
                  message={searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có khách hàng nào'}
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
              {searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có khách hàng nào'}
            </div>
          ) : (
            paginatedData.map(customer => (
              <MobileRowCard
                key={customer._id}
                selected={selectedIds.includes(customer._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(customer._id)} onChange={() => toggleSelectItem(customer._id)} />}
                title={customer.name}
                subtitle={<span className="text-xs text-slate-500">{customer.email}</span>}
                badge={
                  <Badge variant={customer.status === 'Active' ? 'success' : 'secondary'}>
                    {customer.status === 'Active' ? 'Hoạt động' : 'Đã khóa'}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    {customer.phone && <div><span className="text-slate-400">SĐT:</span> {customer.phone}</div>}
                    <div><span className="text-slate-400">Đơn hàng:</span> {customer.ordersCount} đơn</div>
                    <div><span className="text-slate-400">Tổng chi tiêu:</span> <span className="font-medium text-slate-900 dark:text-slate-100">{new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(customer.totalSpent)}</span></div>
                  </div>
                }
                actions={
                  <RowActions>
                    <EditActionButton href={`/admin/customers/${customer._id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(customer._id)} />
                  </RowActions>
                }
              />
            ))
          )}
        </MobileCardList>

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={resolvedCustomersPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="khách hàng"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa khách hàng"
        itemName={customers.find((customer) => customer.id === deleteTargetId)?.name ?? 'khách hàng'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}

