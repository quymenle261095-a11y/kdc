'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ChevronLeft, ChevronRight, Copy, Crown, Edit, Loader2, Plus, Search, Shield, ShieldOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, MobileCardList, MobileRowCard, ResetFilterButton, RowActionButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, TableCellSelect, TableEmptyState, TableHeadSelect, TableSkeleton, TableToolbar, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { useAdminAuth } from '../auth/context';

const MODULE_KEY = 'roles';

export default function RolesListPage() {
  return (
    <ModuleGuard moduleKey={MODULE_KEY}>
      <RolesContent />
    </ModuleGuard>
  );
}

function RolesContent() {
  const { hasPermission, isLoading, token } = useAdminAuth();
  const canView = hasPermission(MODULE_KEY, 'view');
  const canCreate = hasPermission(MODULE_KEY, 'create');
  const canEdit = hasPermission(MODULE_KEY, 'edit');
  const canDelete = hasPermission(MODULE_KEY, 'delete');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!canView) {
    return (
      <Card className="p-8 text-center">
        <ShieldOff size={40} className="mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Không có quyền truy cập</h2>
        <p className="text-slate-500 mt-2">Bạn không có quyền xem module Vai trò.</p>
        <div className="mt-6">
          <Link href="/admin/dashboard"><Button>Quay lại Dashboard</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <RolesTable
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      token={token}
    />
  );
}

function RolesTable({
  canCreate,
  canDelete,
  canEdit,
  token,
}: {
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  token: string | null;
}) {
  const rolesData = useQuery(api.roles.listAll);
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });
  const userCountByRole = useQuery(api.roles.getUserCountByRole);
  
  const deleteRole = useMutation(api.roles.remove);
  const bulkDeleteRoles = useMutation(api.roles.bulkRemove);
  const cloneRole = useMutation(api.roles.clone);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_roles_visible_columns');
  const [selectedIds, setSelectedIds] = useState<Id<"roles">[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"roles"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [cloningRoleId, setCloningRoleId] = useState<Id<"roles"> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const selectionEnabled = canDelete;

  const isLoading = rolesData === undefined || settingsData === undefined;

  // Get settings
  const rolesPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'rolesPerPage');
    return (setting?.value as number) || 10;
  }, [settingsData]);

  // Get enabled features
  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach(f => { features[f.featureKey] = f.enabled; });
    return features;
  }, [featuresData]);

  const showDescription = enabledFeatures.enableDescription ?? true;
  const showColor = enabledFeatures.enableColor ?? true;
  const showActions = canEdit || canDelete || canCreate;

  // Map roleId to userCount
  const userCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    userCountByRole?.forEach(r => { map[r.roleId] = r.userCount; });
    return map;
  }, [userCountByRole]);

  const deleteInfo = useQuery(
    api.roles.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  // Transform data
  const roles = useMemo(() => rolesData?.map(role => ({
      ...role,
      id: role._id,
      usersCount: userCountMap[role._id] ?? 0,
    })) ?? [], [rolesData, userCountMap]);

  // Build columns based on features
  const columns = useMemo(() => {
    const cols = [] as { key: string; label: string; required?: boolean }[];
    if (selectionEnabled) {
      cols.push({ key: 'select', label: 'Chọn', required: true });
    }
    cols.push({ key: 'name', label: 'Tên vai trò', required: true });
    if (showDescription) {
      cols.push({ key: 'description', label: 'Mô tả' });
    }
    cols.push({ key: 'usersCount', label: 'Số người dùng' });
    cols.push({ key: 'type', label: 'Loại' });
    if (showActions) {
      cols.push({ key: 'actions', label: 'Hành động', required: true });
    }
    return cols;
  }, [selectionEnabled, showActions, showDescription]);

  const resolvedVisibleColumns = useMemo(() => (
    visibleColumns.filter((key) => {
      if (key === 'select') {return selectionEnabled;}
      if (key === 'actions') {return showActions;}
      return true;
    })
  ), [visibleColumns, selectionEnabled, showActions]);

  // Filter data
  const filteredData = useMemo(() => {
    let data = [...roles];
    if (searchTerm) {
      data = data.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        r.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterType === 'system') {
      data = data.filter(r => r.isSystem);
    } else if (filterType === 'custom') {
      data = data.filter(r => !r.isSystem);
    }
    return data;
  }, [roles, searchTerm, filterType]);

  const sortedData = useSortableData(filteredData, sortConfig);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / rolesPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rolesPerPage;
    return sortedData.slice(start, start + rolesPerPage);
  }, [sortedData, currentPage, rolesPerPage]);

  // Only non-system roles are selectable
  const selectableRoles = paginatedData.filter(r => !r.isSystem);
  const resolvedSelectedIds = selectionEnabled ? selectedIds : [];

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setFilterType(value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterType('');
    setCurrentPage(1);
  };

  const selectedOnPage = selectableRoles.filter(role => selectedIds.includes(role._id));
  const isPageSelected = selectableRoles.length > 0 && selectedOnPage.length === selectableRoles.length;
  const isPageIndeterminate = selectedOnPage.length > 0 && selectedOnPage.length < selectableRoles.length;

  const toggleSelectAll = () => {
    if (!selectionEnabled) {return;}
    setSelectedIds(selectedIds.length === selectableRoles.length ? [] : selectableRoles.map(r => r._id));
  };

  const toggleSelectItem = (id: Id<"roles">) => {
    if (!selectionEnabled) {return;}
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleDelete = async (id: Id<"roles">) => {
    if (!canDelete) {return;}
    const role = roles.find(r => r._id === id);
    if (role?.isSystem) {
      toast.error('Không thể xóa vai trò hệ thống');
      return;
    }
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleCloneRole = async (id: Id<"roles">) => {
    if (!canCreate) {return;}
    if (!token) {
      toast.error('Thiếu token xác thực');
      return;
    }
    setCloningRoleId(id);
    try {
      await cloneRole({ id, token });
      toast.success('Đã nhân bản vai trò');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi khi nhân bản vai trò');
    } finally {
      setCloningRoleId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    if (!token) {
      toast.error('Thiếu token xác thực');
      return;
    }
    setIsDeleteLoading(true);
    try {
      await deleteRole({ cascade: true, id: deleteTargetId, token });
      toast.success('Đã xóa vai trò');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi khi xóa vai trò');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = () => {
    if (resolvedSelectedIds.length === 0) {return;}
    if (!selectionEnabled) {return;}
    setIsBulkDeleteOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (resolvedSelectedIds.length === 0) {return;}
    if (!token) {
      toast.error('Thiếu token xác thực');
      return;
    }
    setIsBulkDeleting(true);
    try {
      const count = resolvedSelectedIds.length;
      await bulkDeleteRoles({ cascade: true, ids: resolvedSelectedIds, token });
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      toast.success(`Đã xóa ${count} vai trò`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi khi xóa vai trò');
    } finally {
      setIsBulkDeleting(false);
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
        title="Quản lý vai trò & Phân quyền"
        description="Quản lý vai trò và gán quyền hạn hệ thống"
        addHref={canCreate ? "/admin/roles/create" : undefined}
      />

      {selectionEnabled && (
        <BulkActionBar
          selectedCount={resolvedSelectedIds.length}
          entityLabel="vai trò"
          onDelete={handleBulkDelete}
          onClearSelection={() => setSelectedIds([])}
          isLoading={isBulkDeleting}
        />
      )}

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterType)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm tên vai trò..."
            />
          }
          filters={
            <>
              <FilterSelect
                label="Loại vai trò"
                value={filterType}
                onChange={(val) => handleFilterChange(val)}
                placeholder="Tất cả loại"
                options={[
                  { value: 'system', label: 'Hệ thống' },
                  { value: 'custom', label: 'Tùy chỉnh' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterType)} onReset={handleResetFilters} />
              <ColumnToggle columns={columns} visibleColumns={resolvedVisibleColumns} onToggle={toggleColumn} />
            </>
          }
        />

        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                <TableHeadSelect 
                  checked={isPageSelected} 
                  onChange={toggleSelectAll} 
                  indeterminate={isPageIndeterminate} 
                  disabled={!selectionEnabled}
                />
                <SortableHeader label="Tên vai trò" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead>Mô tả</TableHead>
                <SortableHeader label="Số người dùng" sortKey="usersCount" sortConfig={sortConfig} onSort={handleSort} />
                <TableHead>Loại</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((role) => (
                <TableRow key={role._id} className={selectedIds.includes(role._id) ? 'bg-purple-500/5' : ''}>
                  <TableCellSelect 
                    checked={selectedIds.includes(role._id)} 
                    onChange={() => toggleSelectItem(role._id)} 
                    disabled={role.isSystem}
                  />
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className={role.isSystem ? 'text-purple-600' : 'text-slate-400'} />
                      <span className="font-medium">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 max-w-[250px] truncate">{role.description || '-'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant="secondary" className="gap-1">
                      <Crown size={12} />
                      {role.usersCount} người dùng
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Badge variant={role.isSystem ? 'default' : 'secondary'} className={role.isSystem ? 'bg-purple-600' : ''}>
                      {role.isSystem ? 'Hệ thống' : 'Tùy chỉnh'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <RowActions>
                      <RowActionButton
                        title="Nhân bản vai trò"
                        icon={<Copy size={16} />}
                        onClick={async () => handleCloneRole(role._id)}
                      />
                      <EditActionButton href={`/admin/roles/${role._id}/edit`} />
                      {!role.isSystem && (
                        <DeleteActionButton onClick={async () => handleDelete(role._id)} />
                      )}
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedData.length === 0 && (
                <TableEmptyState
                  colSpan={6}
                  message={searchTerm || filterType ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có vai trò nào'}
                />
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {paginatedData.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterType ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có vai trò nào'}
            </div>
          ) : (
            paginatedData.map(role => (
              <MobileRowCard
                key={role._id}
                selected={resolvedSelectedIds.includes(role._id)}
                checkbox={
                  role.isSystem ? null : (
                    <SelectCheckbox checked={resolvedSelectedIds.includes(role._id)} onChange={() => toggleSelectItem(role._id)} />
                  )
                }
                title={
                  <span className="flex items-center gap-1.5">
                    <Shield size={15} className="text-blue-500" />
                    {role.name}
                    {role.isSuperAdmin && <Crown size={14} className="text-amber-500" />}
                  </span>
                }
                subtitle={<span className="text-xs text-slate-500">{role.description}</span>}
                badge={
                  role.isSystem ? <Badge variant="info">Hệ thống</Badge> : <Badge variant="secondary">Tùy chỉnh</Badge>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Số người dùng:</span> {role.usersCount}</div>
                  </div>
                }
                actions={
                  <RowActions>
                    {canCreate && (
                      <RowActionButton
                        title="Nhân bản"
                        icon={cloningRoleId === role._id ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                        onClick={() => { void handleCloneRole(role._id); }}
                        disabled={cloningRoleId === role._id}
                      />
                    )}
                    {canEdit && <EditActionButton href={`/admin/roles/${role._id}/edit`} />}
                    {canDelete && (
                      <DeleteActionButton
                        onClick={async () => handleDelete(role._id)}
                        disabled={role.isSystem}
                      />
                    )}
                  </RowActions>
                }
              />
            ))
          )}
        </MobileCardList>

        {sortedData.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Hiển thị {(currentPage - 1) * rolesPerPage + 1} - {Math.min(currentPage * rolesPerPage, sortedData.length)} / {sortedData.length} vai trò
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
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa vai trò"
        itemName={roles.find((role) => role._id === deleteTargetId)?.name ?? 'vai trò'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
      <DeleteConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={(open) => {
          setIsBulkDeleteOpen(open);
        }}
        title="Xóa vai trò"
        itemName={`${resolvedSelectedIds.length} vai trò`}
        dependencies={[]}
        onConfirm={async () => handleConfirmBulkDelete()}
        isLoading={isBulkDeleting}
      />
    </AdminPageLayout>
  );
}
