'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Briefcase, ChevronDown, Copy, Edit, ExternalLink, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellControls, TableCellThumbnail, TableEmptyState, TableHeadControls, TableHeadThumbnail, TableSkeleton, TableToolbar, useAdminDndSensors, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { usePersistedPageSize } from '../components/usePersistedPageSize';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function ServicesListPage() {
  return (
    <ModuleGuard moduleKey="services">
      <ServicesContent />
    </ModuleGuard>
  );
}

function ServicesContent() {
  const categoriesData = useQuery(api.serviceCategories.listAll, {});
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: 'services' });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: 'services' });
  const deleteService = useMutation(api.services.remove);
  const duplicateService = useMutation(api.services.duplicate);
  const bulkClearBrokenMedia = useMutation(api.services.bulkClearBrokenMedia);
  const reorderServices = useMutation(api.services.reorder);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Published' | 'Draft'>('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"services">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"services"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [cloningServiceId, setCloningServiceId] = useState<Id<"services"> | null>(null);
  const [isClearingBrokenMedia, setIsClearingBrokenMedia] = useState(false);
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_services_visible_columns');
  const dndSensors = useAdminDndSensors();
  const isSelectAllActive = selectionMode === 'all';

  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);



  const servicesPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'servicesPerPage');
    return (setting?.value as number) || 10;
  }, [settingsData]);

  const [resolvedServicesPerPage, setPageSizeOverride] = usePersistedPageSize('admin_services_page_size', servicesPerPage);
  const offset = (currentPage - 1) * resolvedServicesPerPage;

  const servicesData = useQuery(api.services.listAdminWithOffset, {
    limit: resolvedServicesPerPage,
    offset,
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
  });

  const totalCountData = useQuery(api.services.countAdmin, {
    search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
    status: filterStatus || undefined,
  });

  const deleteInfo = useQuery(
    api.services.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const selectAllData = useQuery(
    api.services.listAdminIds,
    isSelectAllActive
      ? {
          search: debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined,
          status: filterStatus || undefined,
        }
      : 'skip'
  );

  const isTableLoading = servicesData === undefined || totalCountData === undefined || fieldsData === undefined;

  const enabledFields = useMemo(() => new Set(fieldsData?.map(field => field.fieldKey) ?? []), [fieldsData]);
  const showThumbnail = enabledFields.has('thumbnail');
  const showCategory = enabledFields.has('categoryId');
  const showPrice = enabledFields.has('price');

  const columns = [
    ...(showThumbnail ? [{ key: 'thumbnail', label: 'Ảnh' }] : []),
    ...(showCategory ? [{ key: 'category', label: 'Danh mục' }] : []),
    ...(showPrice ? [{ key: 'price', label: 'Giá' }] : []),
    { key: 'status', label: 'Trạng thái' },
  ];

  const resolvedVisibleColumns = visibleColumns.filter(key => columns.some(col => col.key === key));

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 dịch vụ phù hợp.');
    }
  }, [selectAllData?.hasMore]);

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

  const services = useMemo(() => servicesData?.map(service => ({
    ...service,
    id: service._id,
    category: categoryMap[service.categoryId] || 'Không có',
  })) ?? [], [servicesData, categoryMap]);

  const sortedServices = useSortableData(services, sortConfig);
  const isReorderEnabled = !debouncedSearchTerm.trim() && !filterStatus && (sortConfig.key === null || sortConfig.key === 'order');

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedServicesPerPage) : 1;
  const paginatedServices = sortedServices;
  const tableColumnCount = 4 + resolvedVisibleColumns.length;
  const selectedIds = isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const isSelectingAll = isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"services">[]) => {
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

  const selectedOnPage = paginatedServices.filter(service => selectedIds.includes(service._id));
  const isPageSelected = paginatedServices.length > 0 && selectedOnPage.length === paginatedServices.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < paginatedServices.length;

  const toggleSelectAll = () => {
    if (isPageSelected) {
      const remaining = selectedIds.filter(id => !paginatedServices.some(service => service._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(selectedIds);
    paginatedServices.forEach(service => next.add(service._id));
    applyManualSelection(Array.from(next));
  };
  const toggleSelectItem = (id: Id<"services">) =>{
    const next = selectedIds.includes(id)
      ? selectedIds.filter(i => i !== id)
      : [...selectedIds, id];
    applyManualSelection(next);
  };

  const handleDuplicateService = async (id: Id<"services">) => {
    setCloningServiceId(id);
    try {
      const result = await duplicateService({ id });
      toast.success(`Đã tạo bản sao: ${result.title}`);
    } catch {
      toast.error('Không thể copy dịch vụ');
    } finally {
      setCloningServiceId(null);
    }
  };

  const handleDelete = async (id: Id<"services">) => {
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    setIsDeleteLoading(true);
    try {
      await deleteService({ cascade: true, id: deleteTargetId });
      toast.success('Đã xóa dịch vụ');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch {
      toast.error('Không thể xóa dịch vụ');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} dịch vụ đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      try {
        for (const id of selectedIds) {
          await deleteService({ cascade: true, id });
        }
        applyManualSelection([]);
        toast.success(`Đã xóa ${selectedIds.length} dịch vụ`);
      } catch {
        toast.error('Có lỗi khi xóa dịch vụ');
      }
    }
  };

  const handleBulkClearBrokenMedia = async () => {
    setIsClearingBrokenMedia(true);
    try {
      const result = await bulkClearBrokenMedia({ ids: selectedIds });
      applyManualSelection([]);
      if (result.cleared > 0) {
        toast.success(`Đã xóa ${result.cleared} ảnh lỗi trong ${result.updated} dịch vụ`);
      } else {
        toast.info('Không tìm thấy ảnh lỗi trong dịch vụ đã chọn');
      }
    } catch {
      toast.error('Có lỗi khi xóa ảnh lỗi');
    } finally {
      setIsClearingBrokenMedia(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(paginatedServices, event.active.id, event.over?.id, service => service._id);
    if (!reordered) {return;}

    try {
      await reorderServices({
        items: buildOrderUpdates(
          reordered,
          paginatedServices.map(service => service.order),
          service => service._id,
          (_service, index) => offset + index
        ),
      });
      setSortConfig({ direction: 'asc', key: null });
      toast.success('Đã cập nhật thứ tự dịch vụ');
    } catch {
      toast.error('Không thể cập nhật thứ tự dịch vụ');
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) {return '-';}
    return new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(price);
  };

  const openFrontend = (slug: string, categoryId: string) => {
    const categorySlug = categorySlugMap[categoryId];
    window.open(categorySlug ? `/${categorySlug}/${slug}` : `/services/${slug}`, '_blank');
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý dịch vụ"
        addHref="/admin/services/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="dịch vụ"
        selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
        pageItemCount={paginatedServices.length}
        totalMatchingCount={totalCount}
        onSelectPage={() =>{  applyManualSelection(paginatedServices.map(service => service._id)); }}
        onSelectAllResults={() =>{  setSelectionMode('all'); }}
        isSelectingAllResults={isSelectingAll}
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
              placeholder="Tìm kiếm dịch vụ..."
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
                {resolvedVisibleColumns.includes('thumbnail') && <TableHeadThumbnail label="Ảnh" />}
                <SortableHeader label="Tiêu đề" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                {resolvedVisibleColumns.includes('category') && <SortableHeader label="Danh mục" sortKey="category" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('price') && <SortableHeader label="Giá" sortKey="price" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />}
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={paginatedServices.map(service => service._id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedServicesPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedServices.map(service => (
                    <SortableTableRow key={service._id} id={service._id} disabled={!isReorderEnabled} selected={selectedIds.includes(service._id)} selectedClassName="bg-teal-500/5">
                      {({ attributes, disabled, listeners }) => (
                        <>
                      <TableCellControls
                        checked={selectedIds.includes(service._id)}
                        onChange={() => { toggleSelectItem(service._id); }}
                        attributes={attributes}
                        dragDisabled={disabled}
                        listeners={listeners}
                      />
                      {resolvedVisibleColumns.includes('thumbnail') && (
                        <TableCellThumbnail src={service.thumbnail} alt={service.title} />
                      )}
                      <TableCell className="font-medium max-w-[300px] truncate">{service.title}</TableCell>
                      {resolvedVisibleColumns.includes('category') && <TableCell className="whitespace-nowrap">{service.category}</TableCell>}
                      {resolvedVisibleColumns.includes('price') && <TableCell className="text-slate-500 whitespace-nowrap">{formatPrice(service.price)}</TableCell>}
                      {resolvedVisibleColumns.includes('status') && (
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={service.status === 'Published' ? 'success' : (service.status === 'Draft' ? 'secondary' : 'warning')}>
                            {service.status === 'Published' ? 'Hiện' : (service.status === 'Draft' ? 'Ẩn' : 'Lưu trữ')}
                          </Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-right whitespace-nowrap">
                        <RowActions>
                          <RowActionButton
                            title="Xem dịch vụ"
                            icon={<ExternalLink size={16} />}
                            onClick={() => openFrontend(service.slug, service.categoryId)}
                            className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                          />
                          <RowActionButton
                            title="Copy dịch vụ"
                            icon={cloningServiceId === service._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                            onClick={() => void handleDuplicateService(service._id)}
                            disabled={cloningServiceId === service._id}
                          />
                          <EditActionButton href={`/admin/services/${service._id}/edit`} />
                          <DeleteActionButton onClick={async () => handleDelete(service._id)} />
                        </RowActions>
                      </TableCell>
                        </>
                      )}
                    </SortableTableRow>
                  ))}
                </>
              )}
              {!isTableLoading && paginatedServices.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có dịch vụ nào'}
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
          ) : paginatedServices.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có dịch vụ nào'}
            </div>
          ) : (
            paginatedServices.map(service => (
              <MobileRowCard
                key={service._id}
                selected={selectedIds.includes(service._id)}
                checkbox={<SelectCheckbox checked={selectedIds.includes(service._id)} onChange={() => toggleSelectItem(service._id)} />}
                title={service.title}
                badge={
                  <Badge variant={service.status === 'Published' ? 'success' : (service.status === 'Draft' ? 'secondary' : 'warning')}>
                    {service.status === 'Published' ? 'Hiện' : (service.status === 'Draft' ? 'Ẩn' : 'Lưu trữ')}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Danh mục:</span> {service.category}</div>
                    <div><span className="text-slate-400">Giá:</span> {formatPrice(service.price)}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    <RowActionButton
                      title="Xem dịch vụ"
                      icon={<ExternalLink size={16} />}
                      onClick={() => openFrontend(service.slug, service.categoryId)}
                      className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 dark:hover:bg-teal-950/30"
                    />
                    <RowActionButton
                      title="Copy dịch vụ"
                      icon={cloningServiceId === service._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                      onClick={() => void handleDuplicateService(service._id)}
                      disabled={cloningServiceId === service._id}
                    />
                    <EditActionButton href={`/admin/services/${service._id}/edit`} />
                    <DeleteActionButton onClick={async () => handleDelete(service._id)} />
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
          pageSize={resolvedServicesPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="dịch vụ"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa dịch vụ"
        itemName={services.find((service) => service.id === deleteTargetId)?.title ?? 'dịch vụ'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}
