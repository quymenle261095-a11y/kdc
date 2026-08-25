'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useAction } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ChevronDown, Copy, Edit, ExternalLink, Layers, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '../components/ui';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, ExactSearchToggle, FilterSelect, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellControls, TableCellThumbnail, TableEmptyState, TableHeadControls, TableHeadThumbnail, TableSkeleton, TableToolbar, useAdminDndSensors, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import { ImportExportModal } from './components/import-modal';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

const MODULE_KEY = 'products';
const PAGE_SIZE_OPTIONS = [12, 20, 30, 50, 100];

export default function ProductsListPage() {
  return (
    <ModuleGuard moduleKey="products">
      <ProductsContent />
    </ModuleGuard>
  );
}

function ProductsContent() {
  const categoriesData = useQuery(api.productCategories.listActive);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  
  const deleteProduct = useMutation(api.products.remove);
  const duplicateProduct = useMutation(api.products.duplicate);
  const bulkRemove = useMutation(api.products.bulkRemove);
  const bulkUpdateStatus = useMutation(api.products.bulkUpdateStatus);
  const bulkClearBrokenMedia = useAction(api.products.bulkClearBrokenMedia);
  const reorderProducts = useMutation(api.products.reorder);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [exactMode, setExactMode] = useState(false);
  const [filterCategory, setFilterCategory] = useState<Id<"productCategories"> | ''>('');
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredCategories = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.filter(c => 
      c.name.toLowerCase().includes(categorySearch.toLowerCase())
    );
  }, [categoriesData, categorySearch]);
  const [filterStatus, setFilterStatus] = useState<'' | 'Active' | 'Draft'>('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_products_visible_columns');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"products">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [cloningProductId, setCloningProductId] = useState<Id<"products"> | null>(null);
  const [bulkStatusLoading, setBulkStatusLoading] = useState<'publish' | 'unpublish' | null>(null);
  const [isClearingBrokenMedia, setIsClearingBrokenMedia] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"products"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const dndSensors = useAdminDndSensors();

  const isSelectAllActive = selectionMode === 'all';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);

  const productsPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'productsPerPage');
    const value = Number(setting?.value);
    return PAGE_SIZE_OPTIONS.includes(value) ? value : 12;
  }, [settingsData]);

  const [resolvedProductsPerPage, setPageSizeOverride] = usePersistedPageSize('admin_products_page_size', productsPerPage);

  const variantEnabled = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'variantEnabled');
    return Boolean(setting?.value);
  }, [settingsData]);

  const variantPricing = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'variantPricing');
    return (setting?.value as string) || 'variant';
  }, [settingsData]);

  const saleMode = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'saleMode');
    const value = setting?.value;
    if (value === 'contact' || value === 'affiliate') {
      return value;
    }
    return 'cart';
  }, [settingsData]);

  const isContactLikeMode = saleMode === 'contact' || saleMode === 'affiliate';
  const offset = (currentPage - 1) * resolvedProductsPerPage;
  const resolvedSearch = debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined;

  const productsData = useQuery(api.products.listAdminWithOffset, {
    limit: resolvedProductsPerPage,
    offset,
    search: resolvedSearch,
    categoryId: filterCategory || undefined,
    status: filterStatus || undefined,
    exactMode,
  });

  const totalCountData = useQuery(api.products.countAdmin, {
    search: resolvedSearch,
    categoryId: filterCategory || undefined,
    status: filterStatus || undefined,
    exactMode,
  });

  const selectAllData = useQuery(
    api.products.listAdminIds,
    isSelectAllActive
      ? {
          search: resolvedSearch,
          categoryId: filterCategory || undefined,
          status: filterStatus || undefined,
          exactMode,
        }
      : 'skip'
  );

  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;
  const isTableLoading = productsData === undefined || totalCountData === undefined || categoriesData === undefined || fieldsData === undefined;

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const columns = useMemo(() => {
    const cols: { key: string; label: string; required?: boolean }[] = [
      { key: 'select', label: 'Chọn', required: true },
      { key: 'drag', label: 'Kéo', required: true },
      { key: 'name', label: 'Tên sản phẩm', required: true },
    ];
    if (enabledFields.has('image')) {cols.push({ key: 'image', label: 'Ảnh' });}
    if (enabledFields.has('sku')) {cols.push({ key: 'sku', label: 'SKU' });}
    cols.push({ key: 'category', label: 'Danh mục' });
    cols.push({ key: 'price', label: 'Giá bán' });
    if (enabledFields.has('stock')) {cols.push({ key: 'stock', label: 'Tồn kho' });}
    cols.push({ key: 'status', label: 'Trạng thái' });
    cols.push({ key: 'actions', label: 'Hành động', required: true });
    return cols;
  }, [enabledFields]);

  const resolvedVisibleColumns = useMemo(() => Array.from(new Set([
    ...columns.filter(c => c.required).map(c => c.key),
    ...visibleColumns.filter(key => columns.some(col => col.key === key)),
  ])), [columns, visibleColumns]);

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

  const products = useMemo(() => productsData?.map(p => ({
      ...p,
      id: p._id,
      category: categoryMap[p.categoryId] || 'Không có',
    })) || [], [productsData, categoryMap]);

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
  };

  const sortedData = useSortableData(products, sortConfig);
  const isReorderEnabled = !resolvedSearch && !filterCategory && !filterStatus && !exactMode && (sortConfig.key === null || sortConfig.key === 'order');

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedProductsPerPage) : 1;
  const paginatedData = sortedData;
  const tableColumnCount = visibleColumns.length;

  const applyManualSelection = (nextIds: Id<"products">[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterCategory('');
    setFilterStatus('');
    setExactMode(false);
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const handleFilterChange = (type: 'category' | 'status', value: string) => {
    if (type === 'category') {
      setFilterCategory(value as Id<"productCategories"> | '');
    } else {
      setFilterStatus(value as '' | 'Active' | 'Draft');
    }
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedData.filter(product => selectedIds.includes(product._id));
  const isPageSelected = paginatedData.length > 0 && selectedOnPage.length === paginatedData.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedData.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedData.some(product => product._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedData.forEach(product => next.add(product._id));
    applyManualSelection(Array.from(next));
  };

  const toggleSelectItem = (id: Id<"products">) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const openFrontend = (slug: string, categoryId: string) => {
    const categorySlug = categorySlugMap[categoryId];
    window.open(categorySlug ? `/${categorySlug}/${slug}` : `/products/${slug}`, '_blank');
  };

  const handleDuplicateProduct = async (id: Id<"products">) => {
    setCloningProductId(id);
    try {
      await duplicateProduct({ id });
      toast.success('Đã nhân bản sản phẩm');
    } catch {
      toast.error('Không thể nhân bản sản phẩm');
    } finally {
      setCloningProductId(null);
    }
  };

  const handleDelete = async (id: Id<"products">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    setIsDeleteLoading(true);
    try {
      await deleteProduct({ id: deleteTargetId });
      toast.success('Đã xóa sản phẩm');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Không thể xóa sản phẩm');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} sản phẩm đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      setIsDeleting(true);
      try {
        const count = await bulkRemove({ ids: selectedIds });
        applyManualSelection([]);
        toast.success(`Đã xóa ${count} sản phẩm`);
      } catch {
        toast.error('Có lỗi khi xóa sản phẩm');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleBulkStatusUpdate = async (mode: 'publish' | 'unpublish') => {
    const nextStatus = mode === 'publish' ? 'Active' : 'Draft';
    setBulkStatusLoading(mode);
    try {
      const result = await bulkUpdateStatus({ ids: selectedIds, status: nextStatus });
      applyManualSelection([]);
      toast.success(`Đã cập nhật trạng thái`);
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
      toast.success(`Đã xử lý ảnh lỗi`);
    } catch {
      toast.error('Có lỗi khi xử lý ảnh lỗi');
    } finally {
      setIsClearingBrokenMedia(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) return;
    const reordered = getReorderedItems(paginatedData, event.active.id, event.over?.id, product => product._id);
    if (!reordered) return;
    try {
      await reorderProducts({
        items: buildOrderUpdates(
          reordered,
          paginatedData.map(product => product.order),
          product => product._id,
          (product) => product.order
        ),
      });
      toast.success('Đã cập nhật thứ tự');
    } catch {
      toast.error('Không thể cập nhật thứ tự');
    }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(price);
  const renderContactPrice = (resolvedPrice: number) => (
    isContactLikeMode && resolvedPrice <= 0
      ? <span className="text-slate-500">Giá liên hệ</span>
      : <span>{formatPrice(resolvedPrice)}</span>
  );

  const getInvalidPriceContext = (product: (typeof products)[number]) => {
    if (variantEnabled && variantPricing === 'variant' && product.hasVariants) {
      const meta = product as typeof product & { hasInvalidVariantComparePrice?: boolean };
      return meta.hasInvalidVariantComparePrice ? { scope: 'variant' as const } : null;
    }
    const salePrice = product.salePrice ?? 0;
    const price = product.price ?? 0;
    if (salePrice > 0 && salePrice <= price) return { scope: 'product' as const };
    return null;
  };

  const invalidPriceCount = useMemo(() =>
    paginatedData.reduce((count, product) => (getInvalidPriceContext(product) ? count + 1 : count), 0),
  [paginatedData, variantEnabled, variantPricing]);

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý sản phẩm"
        addHref="/admin/products/create"
      >
        <ImportExportModal />
      </AdminPageHeader>

      <BulkActionBar 
        selectedCount={selectedIds.length} 
        entityLabel="sản phẩm"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedData.length}
        totalMatchingCount={totalCount}
        onSelectPage={() => applyManualSelection(paginatedData.map(product => product._id))}
        onSelectAllResults={() => setSelectionMode('all')}
        isSelectingAllResults={isSelectingAll}
        onPublish={() => void handleBulkStatusUpdate('publish')}
        onUnpublish={() => void handleBulkStatusUpdate('unpublish')}
        isStatusLoading={bulkStatusLoading}
        onClearBrokenMedia={() => void handleBulkClearBrokenMedia()}
        isClearBrokenMediaLoading={isClearingBrokenMedia}
        onDelete={handleBulkDelete} 
        onClearSelection={() => applyManualSelection([])} 
        isLoading={isDeleting}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterCategory), Boolean(filterStatus)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <div className="flex items-center gap-2">
              <SearchInput
                value={searchTerm}
                onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
                placeholder="Tìm tên sản phẩm, SKU..."
              />
              <ExactSearchToggle
                checked={exactMode}
                onCheckedChange={(checked) => { setExactMode(checked); setCurrentPage(1); applyManualSelection([]); }}
              />
            </div>
          }
          filters={
            <>
              <FilterSelect
                label="Danh mục"
                value={filterCategory}
                onChange={(val) => handleFilterChange('category', val)}
                placeholder="Tất cả danh mục"
                options={(categoriesData ?? []).map(cat => ({ value: cat._id, label: cat.name }))}
              />
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => handleFilterChange('status', val)}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'Published', label: 'Hiện' },
                  { value: 'Draft', label: 'Ẩn' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterCategory || filterStatus)} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={(key) => toggleColumn(key, columns.map(c => c.key))} />
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
                <TableHeadControls
                  showDrag={resolvedVisibleColumns.includes('drag')}
                  showSelect={resolvedVisibleColumns.includes('select')}
                  checked={isPageSelected}
                  onChange={toggleSelectAll}
                  indeterminate={isPageIndeterminate}
                />
                {resolvedVisibleColumns.includes('image') && <TableHeadThumbnail label="Ảnh" />}
                {resolvedVisibleColumns.includes('name') && <SortableHeader label="Tên sản phẩm" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('sku') && enabledFields.has('sku') && <SortableHeader label="SKU" sortKey="sku" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('category') && <SortableHeader label="Danh mục" sortKey="category" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('price') && <SortableHeader label="Giá bán" sortKey="price" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('stock') && enabledFields.has('stock') && <SortableHeader label="Tồn kho" sortKey="stock" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <SortableContext items={paginatedData.map(product => product._id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedProductsPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedData.map(product => (
                    <SortableTableRow key={product._id} id={product._id} disabled={!isReorderEnabled} selected={selectedIds.includes(product._id)}>
                      {({ attributes, disabled, listeners }) => (
                        <>
                  <TableCellControls
                    showDrag={resolvedVisibleColumns.includes('drag')}
                    showSelect={resolvedVisibleColumns.includes('select')}
                    checked={selectedIds.includes(product._id)}
                    onChange={() => { toggleSelectItem(product._id); }}
                    attributes={attributes}
                    dragDisabled={disabled}
                    listeners={listeners}
                  />
                  {resolvedVisibleColumns.includes('image') && (
                    <TableCellThumbnail src={product.image} alt={product.name} />
                  )}
                  {resolvedVisibleColumns.includes('name') && <TableCell className="font-medium max-w-[360px] truncate">{product.name}</TableCell>}
                  {resolvedVisibleColumns.includes('sku') && enabledFields.has('sku') && <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">{product.sku}</TableCell>}
                  {resolvedVisibleColumns.includes('category') && <TableCell className="whitespace-nowrap">{product.category}</TableCell>}
                  {resolvedVisibleColumns.includes('price') && (
                    <TableCell className="whitespace-nowrap">
                      {(() => {
                        const invalidContext = getInvalidPriceContext(product);
                        return (
                          <div>
                            {variantEnabled && variantPricing === 'variant' && product.hasVariants ? (() => {
                              const meta = product as typeof product & {
                                hasPricedActiveVariant?: boolean;
                                variantMinPrice?: number | null;
                              };
                              if (!meta.hasPricedActiveVariant) {
                                return <span className="text-slate-500">Chưa có giá</span>;
                              }
                              const resolvedPrice = meta.variantMinPrice ?? product.price ?? 0;
                              return renderContactPrice(resolvedPrice);
                            })() : (
                              (product.salePrice ?? 0) > (product.price ?? 0) && enabledFields.has('salePrice') ? (
                                <>
                                  <span className="text-red-500 font-medium">{formatPrice(product.price ?? 0)}</span>
                                  <span className="text-slate-400 line-through text-xs ml-1">{formatPrice(product.salePrice ?? 0)}</span>
                                </>
                              ) : (
                                renderContactPrice(product.price ?? 0)
                              )
                            )}
                            {invalidContext && (
                              <p className="text-xs text-red-500 mt-1">Giá so sánh không hợp lệ</p>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('stock') && enabledFields.has('stock') && <TableCell className={cn("whitespace-nowrap", product.stock < 10 ? 'text-red-500 font-medium' : '')}>{product.stock}</TableCell>}
                  {resolvedVisibleColumns.includes('status') && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={product.status === 'Active' ? 'success' : (product.status === 'Draft' ? 'secondary' : 'warning')}>
                        {product.status === 'Active' ? 'Hiện' : (product.status === 'Draft' ? 'Ẩn' : 'Lưu trữ')}
                      </Badge>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('actions') && (
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <RowActionButton
                          title="Xem trên web"
                          icon={<ExternalLink size={16} />}
                          onClick={() => openFrontend(product.slug, product.categoryId)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        />
                        {variantEnabled && product.hasVariants && (
                          <RowActionButton
                            title="Quản lý phiên bản"
                            icon={<Layers size={16} />}
                            href={`/admin/products/${product._id}/variants`}
                          />
                        )}
                        <RowActionButton
                          title="Copy sản phẩm"
                          icon={cloningProductId === product._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                          onClick={() => void handleDuplicateProduct(product._id)}
                          disabled={cloningProductId === product._id}
                        />
                        <EditActionButton href={`/admin/products/${product._id}/edit`} />
                        <DeleteActionButton onClick={async () => handleDelete(product._id)} />
                      </RowActions>
                    </TableCell>
                  )}
                        </>
                      )}
                    </SortableTableRow>
                  ))}
                </>
              )}
              {!isTableLoading && paginatedData.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterCategory || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có sản phẩm nào.'}
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
          ) : paginatedData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterCategory || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có sản phẩm nào.'}
            </div>
          ) : (
            paginatedData.map(product => (
              <MobileRowCard
                key={product._id}
                selected={selectedIds.includes(product._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(product._id)} onChange={() => toggleSelectItem(product._id)} />}
                title={product.name}
                subtitle={product.sku ? <span className="font-mono text-xs text-slate-400">SKU: {product.sku}</span> : undefined}
                badge={
                  <Badge variant={product.status === 'Active' ? 'success' : (product.status === 'Draft' ? 'secondary' : 'warning')}>
                    {product.status === 'Active' ? 'Hiện' : (product.status === 'Draft' ? 'Ẩn' : 'Lưu trữ')}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Danh mục:</span> {product.category}</div>
                    <div><span className="text-slate-400">Giá:</span> {formatPrice(product.price ?? 0)}</div>
                    {enabledFields.has('stock') && <div><span className="text-slate-400">Tồn kho:</span> {product.stock}</div>}
                  </div>
                }
                actions={
                  <RowActions>
                    <RowActionButton
                      title="Xem trên web"
                      icon={<ExternalLink size={16} />}
                      onClick={() => openFrontend(product.slug, product.categoryId)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    />
                    {variantEnabled && product.hasVariants && (
                      <RowActionButton
                        title="Quản lý phiên bản"
                        icon={<Layers size={16} />}
                        href={`/admin/products/${product._id}/variants`}
                      />
                    )}
                    <RowActionButton
                      title="Copy sản phẩm"
                      icon={cloningProductId === product._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                      onClick={() => void handleDuplicateProduct(product._id)}
                      disabled={cloningProductId === product._id}
                    />
                    <EditActionButton href={`/admin/products/${product._id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(product._id)} />
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
          pageSize={resolvedProductsPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="sản phẩm"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa sản phẩm"
        itemName={products.find((product) => product.id === deleteTargetId)?.name ?? 'sản phẩm'}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
