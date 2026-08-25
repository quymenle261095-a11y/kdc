'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ChevronDown, Edit, ExternalLink, FolderTree, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellControls, TableEmptyState, TableHeadControls, TableSkeleton, TableToolbar, useAdminDndSensors, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import { buildCategoryPath, normalizeRouteMode } from '@/lib/ia/route-mode';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function CategoriesListPage() {
  return (
    <ModuleGuard moduleKey="products">
      <CategoriesContent />
    </ModuleGuard>
  );
}

function CategoriesContent() {
  const productsData = useQuery(api.products.listAll, { limit: 1000 });
  const categoriesAllData = useQuery(api.productCategories.listAll, { limit: 1000 });
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: 'products' });
  const enableProductTypesSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableProductTypes' });
  const deleteCategory = useMutation(api.productCategories.remove);
  const reorderCategories = useMutation(api.productCategories.reorder);
  const routeModeSetting = useQuery(api.settings.getValue, { key: 'ia_route_mode', defaultValue: 'unified' });
  const routeMode = useMemo(() => normalizeRouteMode(routeModeSetting), [routeModeSetting]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_categories_visible_columns');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"productCategories">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [resolvedPageSize, setPageSizeOverride] = usePersistedPageSize('admin_categories_page_size', 20);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"productCategories"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const dndSensors = useAdminDndSensors();

  const isSelectAllActive = selectionMode === 'all';

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);



  const offset = (currentPage - 1) * resolvedPageSize;

  const categoriesData = useQuery(api.productCategories.listAdminWithOffset, {
    limit: resolvedPageSize,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
  });

  const deleteInfo = useQuery(
    api.productCategories.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const totalCountData = useQuery(api.productCategories.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
  });

  const enableProductTypes = enableProductTypesSetting?.value === true;

  const selectAllData = useQuery(
    api.productCategories.listAdminIds,
    isSelectAllActive
      ? { search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined }
      : 'skip'
  );

  const categoryIds = useMemo(() => categoriesData?.map(category => category._id) ?? [], [categoriesData]);
  const assignedProductTypesData = useQuery(
    api.productTypes.listAssignedTypesForCategories,
    enableProductTypes && categoryIds.length > 0 ? { categoryIds } : 'skip'
  );

  const isTableLoading = categoriesData === undefined
    || totalCountData === undefined
    || productsData === undefined
    || categoriesAllData === undefined
    || featuresData === undefined
    || enableProductTypesSetting === undefined
    || (enableProductTypes && categoryIds.length > 0 && assignedProductTypesData === undefined);

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 danh mục phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const columns = useMemo(() => [
    { key: 'select', label: 'Chọn', required: true },
    { key: 'name', label: 'Tên danh mục', required: true },
    { key: 'slug', label: 'Slug' },
    ...(enableProductTypes ? [{ key: 'productTypes', label: 'Product Type' }] : []),
    { key: 'count', label: 'Số sản phẩm' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'actions', label: 'Hành động', required: true }
  ], [enableProductTypes]);
  const columnKeys = useMemo(() => columns.map(c => c.key), [columns]);
  const resolvedVisibleColumns = (visibleColumns.length > 0 ? visibleColumns : columnKeys)
    .filter(key => columnKeys.includes(key));



  const productCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    productsData?.forEach(product => {
      map[product.categoryId] = (map[product.categoryId] || 0) + 1;
    });
    return map;
  }, [productsData]);

  const parentNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    categoriesAllData?.forEach(category => {
      map[category._id] = category.name;
    });
    return map;
  }, [categoriesAllData]);

  const categoryProductTypesMap = useMemo(() => {
    const map: Record<string, { _id: Id<"productTypes">; name: string }[]> = {};
    assignedProductTypesData?.forEach(row => {
      map[row.categoryId] = row.types.map(type => ({ _id: type._id, name: type.name }));
    });
    return map;
  }, [assignedProductTypesData]);

  const hierarchyEnabled = featuresData
    ?.find(feature => feature.featureKey === 'enableCategoryHierarchy')
    ?.enabled ?? false;

  const aggregateProductCountMap = useMemo(() => {
    if (!hierarchyEnabled || !categoriesAllData) {
      return productCountMap;
    }

    const categoryProductIdsMap = new Map<string, Set<string>>();
    const childrenMap = new Map<string, string[]>();

    categoriesAllData.forEach(category => {
      categoryProductIdsMap.set(category._id, new Set());
      if (category.parentId) {
        const children = childrenMap.get(category.parentId) ?? [];
        children.push(category._id);
        childrenMap.set(category.parentId, children);
      }
    });

    productsData?.forEach(product => {
      categoryProductIdsMap.get(product.categoryId)?.add(product._id);
    });

    const collectScopeIds = (categoryId: string) => {
      const ids: string[] = [categoryId];
      const queue = [categoryId];
      const seen = new Set(queue);
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) {continue;}
        (childrenMap.get(current) ?? []).forEach(childId => {
          if (seen.has(childId)) {return;}
          seen.add(childId);
          ids.push(childId);
          queue.push(childId);
        });
      }
      return ids;
    };

    const map: Record<string, number> = {};
    categoriesAllData.forEach(category => {
      const productIds = new Set<string>();
      collectScopeIds(category._id).forEach(categoryId => {
        categoryProductIdsMap.get(categoryId)?.forEach(productId => productIds.add(productId));
      });
      map[category._id] = productIds.size;
    });
    return map;
  }, [categoriesAllData, hierarchyEnabled, productCountMap, productsData]);

  const categories = useMemo(() => categoriesData?.map(cat => ({
      ...cat,
      id: cat._id,
      count: aggregateProductCountMap[cat._id] || 0,
    })) ?? [], [aggregateProductCountMap, categoriesData]);

  const treeSortedCategories = useMemo(() => {
    if (!hierarchyEnabled || sortConfig.key !== null) {
      return categories;
    }

    const idSet = new Set(categories.map(category => category.id));
    const roots = categories.filter(category => !category.parentId || !idSet.has(category.parentId));
    const childrenMap = new Map<string, typeof categories>();

    categories.forEach(category => {
      if (!category.parentId || !idSet.has(category.parentId)) {
        return;
      }
      const list = childrenMap.get(category.parentId) ?? [];
      list.push(category);
      childrenMap.set(category.parentId, list);
    });

    const compareByOrder = (a: typeof categories[number], b: typeof categories[number]) =>
      (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name);

    const result: typeof categories = [];
    const dfs = (node: typeof categories[number]) => {
      result.push(node);
      const children = childrenMap.get(node.id) ?? [];
      children.sort(compareByOrder);
      children.forEach(dfs);
    };

    roots.sort(compareByOrder);
    roots.forEach(dfs);

    return result;
  }, [categories, hierarchyEnabled, sortConfig.key]);

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const sortedData = useSortableData(treeSortedCategories, sortConfig);
  const isReorderEnabled = !debouncedSearchTerm.trim() && (sortConfig.key === null || sortConfig.key === 'order');

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedPageSize) : 1;
  const paginatedData = sortedData;
  const tableColumnCount = resolvedVisibleColumns.length + 1;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"productCategories">[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    setSortConfig({ direction: 'asc', key: null });
    applyManualSelection([]);
  };

  const selectedOnPage = paginatedData.filter(cat => selectedIds.includes(cat.id));
  const isPageSelected = paginatedData.length > 0 && selectedOnPage.length === paginatedData.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedData.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedData.some(cat => cat.id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedData.forEach(cat => next.add(cat.id));
    applyManualSelection(Array.from(next));
  };
  const toggleSelectItem = (id: Id<"productCategories">) =>{  
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDelete = async (id: Id<"productCategories">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteCategory({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa danh mục');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa danh mục');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} danh mục đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      try {
        for (const id of selectedIds) {
          await deleteCategory({ cascade: true, id });
        }
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} danh mục`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Không thể xóa danh mục');
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(paginatedData, event.active.id, event.over?.id, category => category.id);
    if (!reordered) {return;}

    try {
      await reorderCategories({
        items: buildOrderUpdates(
          reordered,
          paginatedData.map(category => category.order),
          category => category.id,
          (_category, index) => offset + index
        ),
      });
      setSortConfig({ direction: 'asc', key: null });
      toast.success('Đã cập nhật thứ tự danh mục');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể cập nhật thứ tự danh mục');
    }
  };

  const openFrontend = (slug: string) => {
    window.open(buildCategoryPath({ categorySlug: slug, mode: routeMode, moduleKey: 'products' }), '_blank');
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Danh mục sản phẩm"
        description="Tổ chức cây thư mục cho cửa hàng"
        addHref="/admin/categories/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="danh mục"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedData.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedData.map(cat => cat.id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  applyManualSelection([]); }}
      />
      
      <Card>
        <TableToolbar
          activeFilterCount={0}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm kiếm danh mục..."
            />
          }
          filters={
            <>
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim())} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={toggleColumn} />
            </>
          }
        />
        {!isReorderEnabled && (
          <div className="px-4 py-3 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800">
            Tắt tìm kiếm và quay về thứ tự mặc định để kéo thả đổi vị trí.
          </div>
        )}
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                <TableHeadControls
                  showDrag
                  showSelect={resolvedVisibleColumns.includes('select')}
                  checked={isPageSelected}
                  onChange={toggleSelectAll}
                  indeterminate={isPageIndeterminate}
                />
                {resolvedVisibleColumns.includes('name') && <SortableHeader label="Tên danh mục" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('slug') && <SortableHeader label="Slug" sortKey="slug" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('productTypes') && <TableHead>Product Type</TableHead>}
                {resolvedVisibleColumns.includes('count') && <SortableHeader label="Số sản phẩm" sortKey="count" sortConfig={sortConfig} onSort={handleSort} className="text-center" />}
                {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="active" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('actions') && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <SortableContext items={paginatedData.map(cat => cat.id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedPageSize} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedData.map(cat => (
                    <SortableTableRow key={cat.id} id={cat.id} disabled={!isReorderEnabled} selected={selectedIds.includes(cat.id)}>
                      {({ attributes, disabled, listeners }) => (
                        <>
                  <TableCellControls
                    showDrag
                    showSelect={resolvedVisibleColumns.includes('select')}
                    checked={selectedIds.includes(cat.id)}
                    onChange={() => { toggleSelectItem(cat.id); }}
                    attributes={attributes}
                    dragDisabled={disabled}
                    listeners={listeners}
                  />
                  {resolvedVisibleColumns.includes('name') && (
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <FolderTree size={16} className={cat.parentId ? 'text-slate-400' : 'text-orange-500'} />
                          <span>{cat.name}</span>
                          {hierarchyEnabled && cat.parentId && (
                            <Badge variant="outline" className="text-xs py-0 px-1.5 font-normal">Con</Badge>
                          )}
                        </div>
                        {hierarchyEnabled && cat.parentId && (
                          <span className="text-xs text-slate-400 pl-6">
                            ↳ {parentNameMap[cat.parentId] ?? 'Không rõ cha'}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('slug') && <TableCell className="text-slate-500 font-mono text-sm whitespace-nowrap">{cat.slug}</TableCell>}
                  {resolvedVisibleColumns.includes('productTypes') && (
                    <TableCell>
                      <div className="flex max-w-[260px] flex-wrap gap-1">
                        {(categoryProductTypesMap[cat.id] ?? []).length > 0 ? (
                          categoryProductTypesMap[cat.id].map(type => (
                            <Badge key={type._id} variant="outline" className="text-xs font-normal">
                              {type.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </div>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('count') && <TableCell className="text-center whitespace-nowrap"><Badge variant="secondary">{cat.count}</Badge></TableCell>}
                  {resolvedVisibleColumns.includes('status') && (
                    <TableCell className="whitespace-nowrap">
                      <Badge variant={cat.active ? 'success' : 'secondary'}>{cat.active ? 'Hiện' : 'Ẩn'}</Badge>
                    </TableCell>
                  )}
                  {resolvedVisibleColumns.includes('actions') && (
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <RowActionButton
                          title="Xem trên web"
                          icon={<ExternalLink size={16} />}
                          onClick={() => openFrontend(cat.slug)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        />
                        <EditActionButton href={`/admin/categories/${cat.id}/edit`} />
                        <DeleteActionButton onClick={async () => handleDelete(cat.id)} />
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
                  message={searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có danh mục nào.'}
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
              {searchTerm ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có danh mục nào.'}
            </div>
          ) : (
            paginatedData.map(cat => (
              <MobileRowCard
                key={cat.id}
                selected={selectedIds.includes(cat.id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(cat.id)} onChange={() => toggleSelectItem(cat.id)} />}
                title={
                  <span className="flex items-center gap-1.5">
                    <FolderTree size={15} className={cat.parentId ? 'text-slate-400' : 'text-orange-500'} />
                    {cat.name}
                  </span>
                }
                subtitle={<span className="font-mono text-xs text-slate-400">{cat.slug}</span>}
                badge={<Badge variant={cat.active ? 'success' : 'secondary'}>{cat.active ? 'Hiện' : 'Ẩn'}</Badge>}
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Số sản phẩm:</span> {cat.count}</div>
                    {hierarchyEnabled && cat.parentId && <div><span className="text-slate-400">Danh mục cha:</span> {parentNameMap[cat.parentId] ?? '—'}</div>}
                  </div>
                }
                actions={
                  <RowActions>
                    <RowActionButton
                      title="Xem trên web"
                      icon={<ExternalLink size={16} />}
                      onClick={() => openFrontend(cat.slug)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    />
                    <EditActionButton href={`/admin/categories/${cat.id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(cat.id)} />
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
          pageSize={resolvedPageSize}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="danh mục"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa danh mục sản phẩm"
        itemName={categories.find((cat) => cat.id === deleteTargetId)?.name ?? 'danh mục'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
