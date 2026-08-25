'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ChevronDown, Heart, Package, Search, Trash2, User } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, TableCellSelect, TableEmptyState, TableHeadSelect, TableSkeleton, TableToolbar, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { usePersistedPageSize } from '../components/usePersistedPageSize';

const MODULE_KEY = 'wishlist';

// WL-007 FIX: Thêm requiredModules dependency cho customers và products
export default function WishlistListPage() {
  return (
    <ModuleGuard 
      moduleKey="wishlist" 
      requiredModules={["products", "customers"]} 
      requiredModulesType="all"
    >
      <WishlistContent />
    </ModuleGuard>
  );
}

function WishlistContent() {
  const customersData = useQuery(api.customers.listAll, { limit: 200 });
  const productsData = useQuery(api.products.listAll, { limit: 500 });
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const removeItem = useMutation(api.wishlist.remove);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState<Id<"customers"> | ''>('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_wishlist_visible_columns');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"wishlist">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);

  const isSelectAllActive = selectionMode === 'all';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);



  const itemsPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'itemsPerPage');
    return (setting?.value as number) || 20;
  }, [settingsData]);

  const [resolvedItemsPerPage, setPageSizeOverride] = usePersistedPageSize('admin_wishlist_page_size', itemsPerPage);
  const offset = (currentPage - 1) * resolvedItemsPerPage;

  const wishlistData = useQuery(api.wishlist.listAdminWithOffset, {
    limit: resolvedItemsPerPage,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    customerId: filterCustomer || undefined,
  });

  const totalCountData = useQuery(api.wishlist.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    customerId: filterCustomer || undefined,
  });

  const selectAllData = useQuery(
    api.wishlist.listAdminIds,
    isSelectAllActive
      ? {
          search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
          customerId: filterCustomer || undefined,
        }
      : 'skip'
  );

  const isTableLoading = wishlistData === undefined || totalCountData === undefined || customersData === undefined || productsData === undefined || fieldsData === undefined;

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 wishlist phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const columns = useMemo(() => {
    const cols = [
      { key: 'select', label: 'Chọn', required: true },
      { key: 'customer', label: 'Khách hàng', required: true },
      { key: 'product', label: 'Sản phẩm', required: true },
      { key: 'price', label: 'Giá' },
    ];
    if (enabledFields.has('note')) {cols.push({ key: 'note', label: 'Ghi chú' });}
    cols.push({ key: 'createdAt', label: 'Ngày thêm' });
    cols.push({ key: 'actions', label: 'Hành động', required: true });
    return cols;
  }, [enabledFields]);
  const resolvedVisibleColumns = visibleColumns.length > 0 ? visibleColumns : columns.map(c => c.key);

  const customerMap = useMemo(() => {
    const map: Record<string, { name: string; email: string }> = {};
    customersData?.forEach(c => { map[c._id] = { email: c.email, name: c.name }; });
    return map;
  }, [customersData]);

  const productMap = useMemo(() => {
    const map: Record<string, { name: string; price: number; salePrice?: number; image?: string }> = {};
    productsData?.forEach(p => { map[p._id] = { image: p.image, name: p.name, price: p.price, salePrice: p.salePrice }; });
    return map;
  }, [productsData]);

  const wishlistItems = useMemo(() => wishlistData?.map(item => ({
      ...item,
      id: item._id,
      customerName: customerMap[item.customerId]?.name || 'Không xác định',
      customerEmail: customerMap[item.customerId]?.email || '',
      productName: productMap[item.productId]?.name || 'Không xác định',
      productPrice: productMap[item.productId]?.price || 0,
      productSalePrice: productMap[item.productId]?.salePrice,
      productImage: productMap[item.productId]?.image,
    })) ?? [], [wishlistData, customerMap, productMap]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const handleCustomerChange = (value: string) => {
    setFilterCustomer(value as Id<"customers"> | '');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const sortedData = useSortableData(wishlistItems, sortConfig);

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedItemsPerPage) : 1;
  const paginatedData = sortedData;
  const tableColumnCount = resolvedVisibleColumns.length;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"wishlist">[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterCustomer('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedData.filter(item => selectedIds.includes(item._id));
  const isPageSelected = paginatedData.length > 0 && selectedOnPage.length === paginatedData.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedData.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedData.some(item => item._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedData.forEach(item => next.add(item._id));
    applyManualSelection(Array.from(next));
  };
  const toggleSelectItem = (id: Id<"wishlist">) =>{  
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDelete = async (id: Id<"wishlist">) => {
    if (confirm('Xóa sản phẩm này khỏi wishlist?')) {
      try {
        await removeItem({ id });
        toast.success('Đã xóa khỏi wishlist');
      } catch {
        toast.error('Có lỗi khi xóa');
      }
    }
  };

  // WL-006 FIX: Sử dụng Promise.all thay vì sequential delete
  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} mục đã chọn?`)) {
      try {
        const count = selectedIds.length;
        await Promise.all(selectedIds.map( async id => removeItem({ id })));
        applyManualSelection([]);
        toast.success(`Đã xóa ${count} mục`);
      } catch {
        toast.error('Có lỗi khi xóa');
      }
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(price);
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('vi-VN');

  // Stats
  const stats = useMemo(() => {
    const customerCounts: Record<string, number> = {};
    const productCounts: Record<string, number> = {};
    wishlistItems.forEach(item => {
      customerCounts[item.customerId] = (customerCounts[item.customerId] || 0) + 1;
      productCounts[item.productId] = (productCounts[item.productId] || 0) + 1;
    });
    return {
      mostWishlisted: (Object.entries(productCounts) as Array<[string, number]>).sort((a, b) => b[1] - a[1])[0],
      totalItems: wishlistItems.length,
      uniqueCustomers: Object.keys(customerCounts).length,
      uniqueProducts: Object.keys(productCounts).length,
    };
  }, [wishlistItems]);

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Danh sách yêu thích"
        description="Quản lý wishlist và sản phẩm yêu thích của khách hàng"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-500/10 rounded-lg">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.totalItems}</p>
              <p className="text-sm text-slate-500">Tổng mục</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.uniqueCustomers}</p>
              <p className="text-sm text-slate-500">Khách hàng</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Package className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.uniqueProducts}</p>
              <p className="text-sm text-slate-500">Sản phẩm</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Heart className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[120px]">
                {stats.mostWishlisted ? productMap[stats.mostWishlisted[0]]?.name : 'N/A'}
              </p>
              <p className="text-xs text-slate-500">Được thích nhiều nhất ({stats.mostWishlisted?.[1] || 0})</p>
            </div>
          </div>
        </Card>
      </div>

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="wishlist"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedData.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedData.map(item => item._id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  applyManualSelection([]); }}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterCustomer)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm khách hàng, sản phẩm..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Khách hàng"
                value={filterCustomer}
                onChange={(val) => handleCustomerChange(val)}
                placeholder="Tất cả khách hàng"
                options={(customersData ?? []).map(c => ({ value: c._id, label: c.name }))}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterCustomer)} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={(key) => toggleColumn(key, columns.map(c => c.key))} />
            </>
          }
        />
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                {resolvedVisibleColumns.includes('select') && <TableHeadSelect checked={isPageSelected} onChange={toggleSelectAll} indeterminate={isPageIndeterminate} />}
                {resolvedVisibleColumns.includes('customer') && <SortableHeader label="Khách hàng" sortKey="customerName" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('product') && <SortableHeader label="Sản phẩm" sortKey="productName" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('price') && <SortableHeader label="Giá" sortKey="productPrice" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('note') && enabledFields.has('note') && <TableHead>Ghi chú</TableHead>}
                {resolvedVisibleColumns.includes('createdAt') && <SortableHeader label="Ngày thêm" sortKey="_creationTime" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedItemsPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedData.map(item => (
                    <TableRow key={item._id} className={selectedIds.includes(item._id) ? 'bg-pink-500/5' : ''}>
                  {resolvedVisibleColumns.includes('select') && <TableCellSelect checked={selectedIds.includes(item._id)} onChange={() => { toggleSelectItem(item._id); }} />}
                  {resolvedVisibleColumns.includes('customer') && (
                    <TableCell className="whitespace-nowrap">
                      <div>
                        <p className="font-medium">{item.customerName}</p>
                        <p className="text-xs text-slate-500">{item.customerEmail}</p>
                      </div>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('product') && (
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.productImage ? (
                          <Image src={item.productImage} width={40} height={40} className="w-10 h-10 object-cover rounded bg-slate-100" alt={item.productName} />
                        ) : (
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded flex items-center justify-center">
                            <Package size={16} className="text-slate-400" />
                          </div>
                        )}
                        <span className="font-medium max-w-[200px] truncate">{item.productName}</span>
                      </div>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('price') && (
                    <TableCell className="whitespace-nowrap">
                      {item.productSalePrice ? (
                        <div>
                          <span className="text-red-500 font-medium">{formatPrice(item.productSalePrice)}</span>
                          <span className="text-slate-400 line-through text-xs ml-1">{formatPrice(item.productPrice)}</span>
                        </div>
                      ) : (
                        formatPrice(item.productPrice)
                      )}
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('note') && enabledFields.has('note') && (
                    <TableCell className="text-slate-500 text-sm max-w-[150px] truncate">{item.note ?? '-'}</TableCell>
                  )}
                  {resolvedVisibleColumns.includes('createdAt') && <TableCell className="text-slate-500 text-sm whitespace-nowrap">{formatDate(item._creationTime)}</TableCell>}
                  {resolvedVisibleColumns.includes('actions') && (
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <DeleteActionButton onClick={async () => handleDelete(item._id)} />
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
                  message={searchTerm || filterCustomer ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có sản phẩm yêu thích nào.'}
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
              {searchTerm || filterCustomer ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có sản phẩm yêu thích nào.'}
            </div>
          ) : (
            paginatedData.map(item => (
              <MobileRowCard
                key={item._id}
                selected={selectedIds.includes(item._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(item._id)} onChange={() => toggleSelectItem(item._id)} />}
                title={item.productName}
                subtitle={<span className="text-xs text-slate-500">{item.customerName}</span>}
                badge={
                  <span className="text-xs font-semibold text-pink-600 dark:text-pink-400">
                    {item.productSalePrice ? formatPrice(item.productSalePrice) : formatPrice(item.productPrice)}
                  </span>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Khách hàng:</span> {item.customerName} ({item.customerEmail})</div>
                    <div><span className="text-slate-400">Ngày thêm:</span> {formatDate(item._creationTime)}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    <DeleteActionButton onClick={async () => handleDelete(item._id)} />
                  </RowActions>
                }
              />
            ))
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
          entityLabel="wishlist"
        />
      </Card>
    </AdminPageLayout>
  );
}

