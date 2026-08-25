'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { 
  ChevronLeft, ChevronRight, Edit, Eye, EyeOff, FileText, 
  Home, ImageIcon, LayoutGrid, Loader2,
  Phone, Plus, Search, Trash2, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminDragHandle, AdminPageHeader, AdminPageLayout, AdminPagination, buildOrderUpdates, BulkActionBar, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, getReorderedItems, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, SortableTableRow, TableCellSelect, TableEmptyState, TableHeadSelect, TableSkeleton, TableToolbar, useAdminDndSensors, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { getQuickSyncedReorderedComponents, buildQuickSyncedComponent } from '../home-components/_shared/lib/quickSync';

const MODULE_KEY = 'homepage';

const TYPE_ICONS: Record<string, React.ElementType> = {
  about: FileText,
  contact: Phone,
  hero: ImageIcon,
  partners: Users,
  posts: FileText,
  products: LayoutGrid,
};

const TYPE_COLORS: Record<string, string> = {
  about: 'bg-emerald-500/10 text-emerald-600',
  contact: 'bg-pink-500/10 text-pink-600',
  hero: 'bg-blue-500/10 text-blue-600',
  partners: 'bg-amber-500/10 text-amber-600',
  posts: 'bg-cyan-500/10 text-cyan-600',
  products: 'bg-purple-500/10 text-purple-600',
};

const TYPE_LABELS: Record<string, string> = {
  about: 'Giới thiệu',
  contact: 'Liên hệ',
  hero: 'Hero Banner',
  partners: 'Đối tác',
  posts: 'Bài viết',
  products: 'Sản phẩm',
};

export default function HomepageListPage() {
  return (
    <ModuleGuard moduleKey={MODULE_KEY}>
      <HomepageContent />
    </ModuleGuard>
  );
}

function HomepageContent() {
  const componentsData = useQuery(api.homeComponents.listAll);
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  
  const deleteComponent = useMutation(api.homeComponents.remove);
  const toggleComponent = useMutation(api.homeComponents.toggle);
  const reorderComponents = useMutation(api.homeComponents.reorder);
  const updateComponent = useMutation(api.homeComponents.update);
  
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: 'order' });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [selectedIds, setSelectedIds] = useState<Id<"homeComponents">[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const dndSensors = useAdminDndSensors();

  const isLoading = componentsData === undefined;

  const itemsPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'maxSections');
    return (setting?.value as number) || 10;
  }, [settingsData]);

  const components = useMemo(() => componentsData?.map(c => ({
      ...c,
      id: c._id,
      typeLabel: TYPE_LABELS[c.type] || c.type,
    })) ?? [], [componentsData]);

  const filteredComponents = useMemo(() => {
    let data = [...components];
    if (searchTerm) {
      data = data.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filterType) {
      data = data.filter(c => c.type === filterType);
    }
    if (filterActive !== '') {
      data = data.filter(c => c.active === (filterActive === 'true'));
    }
    return data;
  }, [components, searchTerm, filterType, filterActive]);

  const sortedComponents = useSortableData(filteredComponents, sortConfig);
  const isReorderEnabled = !searchTerm.trim() && !filterType && !filterActive && (sortConfig.key === null || sortConfig.key === 'order');

  const totalPages = Math.ceil(sortedComponents.length / itemsPerPage);
  const paginatedComponents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedComponents.slice(start, start + itemsPerPage);
  }, [sortedComponents, currentPage, itemsPerPage]);

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string, type: 'type' | 'active') => {
    if (type === 'type') {setFilterType(value);}
    else {setFilterActive(value);}
    setCurrentPage(1);
  };

  const toggleSelectAll = () =>{  setSelectedIds(selectedIds.length === paginatedComponents.length ? [] : paginatedComponents.map(c => c._id)); };
  const toggleSelectItem = (id: Id<"homeComponents">) =>{  setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  // TICKET #10 FIX: Show detailed error message
  const handleDelete = async (id: Id<"homeComponents">) => {
    if (confirm('Xóa section này?')) {
      try {
        await deleteComponent({ id });
        toast.success('Đã xóa section');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Có lỗi khi xóa section');
      }
    }
  };

  // HIGH-006 FIX: Dùng Promise.all thay vì sequential
  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} section đã chọn?`)) {
      try {
        await Promise.all(selectedIds.map( async id => deleteComponent({ id })));
        setSelectedIds([]);
        toast.success(`Đã xóa ${selectedIds.length} section`);
      } catch {
        toast.error('Có lỗi khi xóa section');
      }
    }
  };

  const handleBulkQuickSync = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkSyncing(true);
    try {
      const updatedComponents = componentsData?.map(c => {
        if (selectedIds.includes(c._id)) {
          return buildQuickSyncedComponent(c);
        }
        return c;
      }) ?? [];
      const reordered = getQuickSyncedReorderedComponents(updatedComponents);
      await Promise.all(
        reordered.map(async (c) => {
          const isSelected = selectedIds.includes(c._id);
          await updateComponent({
            id: c._id,
            order: c.order,
            ...(isSelected ? { config: c.config } : {}),
          });
        })
      );
      setSelectedIds([]);
      toast.success(`Đã đồng bộ nhanh ${selectedIds.length} section được chọn`);
    } catch {
      toast.error('Lỗi khi đồng bộ nhanh các section được chọn');
    } finally {
      setIsBulkSyncing(false);
    }
  };

  // TICKET #10 FIX: Show detailed error message
  const handleToggle = async (id: Id<"homeComponents">) => {
    try {
      await toggleComponent({ id });
      toast.success('Đã cập nhật trạng thái');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi khi cập nhật trạng thái');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!isReorderEnabled) {return;}
    const reordered = getReorderedItems(paginatedComponents, event.active.id, event.over?.id, component => component._id);
    if (!reordered) {return;}

    try {
      await reorderComponents({
        items: buildOrderUpdates(
          reordered,
          paginatedComponents.map(component => component.order),
          component => component._id,
          (_component, index) => ((currentPage - 1) * itemsPerPage) + index
        ),
      });
      setSortConfig({ direction: 'asc', key: 'order' });
      toast.success('Đã cập nhật thứ tự section');
    } catch {
      toast.error('Không thể cập nhật thứ tự section');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Quản lý trang chủ"
        description="Sắp xếp và quản lý các section trên trang chủ"
        addHref="/admin/homepage/create"
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        entityLabel="section"
        onQuickSync={handleBulkQuickSync}
        isQuickSyncLoading={isBulkSyncing}
        onDelete={handleBulkDelete}
        onClearSelection={() =>{  setSelectedIds([]); }}
      />

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterType), Boolean(filterActive)].filter(Boolean).length}
          onResetFilters={() => {
            setSearchTerm('');
            setFilterType('');
            setFilterActive('');
          }}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => setSearchTerm(val)}
              placeholder="Tìm kiếm section..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Loại"
                value={filterType}
                onChange={(val) => handleFilterChange(val, 'type')}
                placeholder="Tất cả loại"
                options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <FilterSelect
                label="Trạng thái"
                value={filterActive}
                onChange={(val) => handleFilterChange(val, 'active')}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'true', label: 'Hiện' },
                  { value: 'false', label: 'Ẩn' },
                ]}
              />
              <ResetFilterButton
                isFiltered={Boolean(searchTerm.trim() || filterType || filterActive)}
                onReset={() => {
                  setSearchTerm('');
                  setFilterType('');
                  setFilterActive('');
                }}
              />
            </>
          }
        />
        {!isReorderEnabled && (
          <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800">
            Tắt tìm kiếm/lọc và sắp xếp theo thứ tự để kéo thả đổi vị trí.
          </div>
        )}
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                <TableHeadSelect 
                  checked={selectedIds.length === paginatedComponents.length && paginatedComponents.length > 0} 
                  onChange={toggleSelectAll} 
                  indeterminate={selectedIds.length > 0 && selectedIds.length < paginatedComponents.length} 
                />
                <SortableHeader label="Thứ tự" sortKey="order" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Tên section" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                <SortableHeader label="Loại" sortKey="type" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <SortableContext items={paginatedComponents.map(component => component._id)} strategy={verticalListSortingStrategy}>
            <TableBody>
              {paginatedComponents.map((component) => {
                const Icon = TYPE_ICONS[component.type] || LayoutGrid;
                const colorClass = TYPE_COLORS[component.type] || 'bg-slate-500/10 text-slate-600';
                return (
                  <SortableTableRow key={component._id} id={component._id} disabled={!isReorderEnabled} selected={selectedIds.includes(component._id)}>
                    {({ attributes, disabled, listeners }) => (
                      <>
                    <TableCellSelect checked={selectedIds.includes(component._id)} onChange={() =>{  toggleSelectItem(component._id); }} />
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-400">
                        <AdminDragHandle attributes={attributes} className="h-7 w-7" disabled={disabled} listeners={listeners} />
                        <span className="font-mono text-xs">{component.order + 1}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{component.title}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge variant="secondary" className={`${colorClass} gap-1`}>
                        <Icon size={12} />
                        {component.typeLabel}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge 
                        variant={component.active ? 'success' : 'secondary'}
                      >
                        {component.active ? 'Hiện' : 'Ẩn'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <RowActions>
                        <RowActionButton
                          title={component.active ? 'Ẩn section' : 'Hiện section'}
                          icon={component.active ? <EyeOff size={16} /> : <Eye size={16} />}
                          onClick={async () => handleToggle(component._id)}
                        />
                        <EditActionButton href={`/admin/homepage/${component._id}/edit`} />
                        <DeleteActionButton onClick={async () => handleDelete(component._id)} />
                      </RowActions>
                    </TableCell>
                      </>
                    )}
                  </SortableTableRow>
                );
              })}
              {paginatedComponents.length === 0 && (
                <TableEmptyState
                  colSpan={6}
                  message={searchTerm || filterType || filterActive ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có section nào'}
                />
              )}
            </TableBody>
            </SortableContext>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {paginatedComponents.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterType || filterActive ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có section nào'}
            </div>
          ) : (
            paginatedComponents.map(component => {
              const Icon = TYPE_ICONS[component.type] || LayoutGrid;
              const colorClass = TYPE_COLORS[component.type] || 'bg-slate-500/10 text-slate-600';
              return (
                <MobileRowCard
                  key={component._id}
                  selected={selectedIds.includes(component._id)}
                  checkbox={<SelectCheckbox checked={selectedIds.includes(component._id)} onChange={() => toggleSelectItem(component._id)} />}
                  title={component.title}
                  subtitle={
                    <span className="inline-flex items-center gap-1 text-xs">
                      <Icon size={12} />
                      {component.typeLabel}
                    </span>
                  }
                  badge={
                    <Badge variant={component.active ? 'success' : 'secondary'}>
                      {component.active ? 'Hiện' : 'Ẩn'}
                    </Badge>
                  }
                  details={
                    <div className="space-y-1">
                      <div><span className="text-slate-400">Thứ tự:</span> {component.order + 1}</div>
                    </div>
                  }
                  actions={
                    <RowActions>
                      <RowActionButton
                        title={component.active ? 'Ẩn section' : 'Hiện section'}
                        icon={component.active ? <EyeOff size={16} /> : <Eye size={16} />}
                        onClick={async () => handleToggle(component._id)}
                      />
                      <EditActionButton href={`/admin/homepage/${component._id}/edit`} />
                      <DeleteActionButton onClick={async () => handleDelete(component._id)} />
                    </RowActions>
                  }
                />
              );
            })
          )}
        </MobileCardList>
        </DndContext>
        {sortedComponents.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, sortedComponents.length)} / {sortedComponents.length} section
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() =>{  setCurrentPage(p => p - 1); }}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Trang {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() =>{  setCurrentPage(p => p + 1); }}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </AdminPageLayout>
  );
}
