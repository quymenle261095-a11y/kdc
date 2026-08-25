'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import Link from 'next/link';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { ChevronDown, Edit, Loader2, Plus, Search, ShieldOff, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui';
import { AdminPageHeader, AdminPageLayout, AdminPagination, BulkActionBar, ColumnToggle, DeleteActionButton, EditActionButton, FilterSelect, getNextSortState, MobileCardList, MobileRowCard, ResetFilterButton, RowActions, SearchInput, SelectCheckbox, SortableHeader, TableEmptyState, TableSkeleton, TableToolbar, usePersistedColumns, useSortableData } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { DeleteConfirmDialog } from '../components/DeleteConfirmDialog';
import { useAdminAuth } from '../auth/context';
import { usePersistedPageSize } from '../components/usePersistedPageSize';

const MODULE_KEY = 'users';

type AdminUser = Omit<Doc<"users">, "passwordHash">;
type AdminUserWithRole = AdminUser & { isSuperAdmin: boolean; roleColor?: string; roleName: string };

export default function UsersListPage() {
  return (
    <ModuleGuard moduleKey={MODULE_KEY}>
      <UsersContent />
    </ModuleGuard>
  );
}

function UsersContent() {
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
        <p className="text-slate-500 mt-2">Bạn không có quyền xem module Người dùng.</p>
        <div className="mt-6">
          <Link href="/admin/dashboard"><Button>Quay lại Dashboard</Button></Link>
        </div>
      </Card>
    );
  }

  return (
    <UsersTable
      canCreate={canCreate}
      canDelete={canDelete}
      canEdit={canEdit}
      token={token}
    />
  );
}

function UsersTable({
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
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<Id<"roles"> | ''>('');
  const [filterStatus, setFilterStatus] = useState<'' | 'Active' | 'Inactive' | 'Banned'>('');
  const [manualSelectedIds, setManualSelectedIds] = useState<Id<"users">[]>([]);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'all'>('manual');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"users"> | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const { visibleColumns, toggleColumn } = usePersistedColumns('admin_users_visible_columns');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ direction: 'asc', key: null });
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<'Active' | 'Inactive' | 'Banned'>('Active');
  const [isBulkStatusUpdating, setIsBulkStatusUpdating] = useState(false);
  const [exportRequested, setExportRequested] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const isSelectAllActive = selectionMode === 'all';
  const selectionEnabled = canDelete || canEdit;

  const rolesData = useQuery(api.roles.listAll);
  const rolesModule = useQuery(api.admin.modules.getModuleByKey, { key: 'roles' });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });
  const deleteUser = useMutation(api.users.remove);
  const bulkDeleteUsers = useMutation(api.users.bulkRemove);
  const bulkStatusChange = useMutation(api.users.bulkStatusChange);
  const isRolesEnabled = rolesModule?.enabled ?? false;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () =>{  clearTimeout(timer); };
  }, [searchTerm]);



  const usersPerPage = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'usersPerPage');
    return (setting?.value as number) || 20;
  }, [settingsData]);

  const [resolvedUsersPerPage, setPageSizeOverride] = usePersistedPageSize('admin_users_page_size', usersPerPage);
  const offset = (currentPage - 1) * resolvedUsersPerPage;
  const resolvedSearch = debouncedSearchTerm.trim() ? debouncedSearchTerm.trim() : undefined;

  const usersData = useQuery(api.users.listAdminWithOffset, {
    limit: resolvedUsersPerPage,
    offset,
    roleId: isRolesEnabled ? (filterRole || undefined) : undefined,
    search: resolvedSearch,
    status: filterStatus || undefined,
  }) as AdminUser[] | undefined;

  const totalCountData = useQuery(api.users.countAdmin, {
    roleId: isRolesEnabled ? (filterRole || undefined) : undefined,
    search: resolvedSearch,
    status: filterStatus || undefined,
  });

  const exportData = useQuery(
    api.users.listAdminExport,
    exportRequested
      ? {
          limit: 5000,
          roleId: isRolesEnabled ? (filterRole || undefined) : undefined,
          search: resolvedSearch,
          status: filterStatus || undefined,
        }
      : 'skip'
  ) as AdminUser[] | undefined;

  useEffect(() => {
    if (!exportRequested || exportData === undefined) {return;}
    if (!exportData.length) {
      toast.error('Không có dữ liệu để xuất CSV');
      setExportRequested(false);
      setIsExporting(false);
      return;
    }

    const roleMap = new Map(rolesData?.map(role => [role._id, role.name]));
    const statusLabels: Record<string, string> = {
      Active: 'Hoạt động',
      Banned: 'Bị cấm',
      Inactive: 'Không hoạt động',
    };
    const rows: string[][] = exportData.map(user => {
      const baseRow = [
        user.name,
        user.email,
        user.phone ?? '',
      ];
      if (isRolesEnabled) {
        baseRow.push(roleMap.get(user.roleId) ?? 'Không rõ');
      }
      baseRow.push(statusLabels[user.status] ?? user.status);
      baseRow.push(user.lastLogin ? new Date(user.lastLogin).toLocaleString('vi-VN') : '');
      return baseRow;
    });

    const header = [
      'Họ tên',
      'Email',
      'Số điện thoại',
      ...(isRolesEnabled ? ['Vai trò'] : []),
      'Trạng thái',
      'Đăng nhập cuối',
    ];
    const csv = [header, ...rows]
      .map(row => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setExportRequested(false);
    setIsExporting(false);
  }, [exportRequested, exportData, rolesData, isRolesEnabled]);

  useEffect(() => {
    if (!isRolesEnabled) {
      setFilterRole('');
    }
  }, [isRolesEnabled]);

  const deleteInfo = useQuery(
    api.users.getDeleteInfo,
    deleteTargetId ? { id: deleteTargetId } : 'skip'
  );

  const selectAllData = useQuery(
    api.users.listAdminIds,
    selectionEnabled && isSelectAllActive
      ? {
          excludeSuperAdmin: true,
          roleId: isRolesEnabled ? (filterRole || undefined) : undefined,
          search: resolvedSearch,
          status: filterStatus || undefined,
        }
      : 'skip'
  );

  const isTableLoading = usersData === undefined || totalCountData === undefined || rolesModule === undefined || (isRolesEnabled && rolesData === undefined);

  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach(f => { features[f.featureKey] = f.enabled; });
    return features;
  }, [featuresData]);

  const showAvatar = enabledFeatures.enableAvatar ?? true;
  const showPhone = enabledFeatures.enablePhone ?? true;
  const showLastLogin = enabledFeatures.enableLastLogin ?? true;

  const columns = [
    ...(isRolesEnabled ? [{ key: 'role', label: 'Vai trò', required: true }] : []),
    { key: 'status', label: 'Trạng thái', required: true },
    ...(showPhone ? [{ key: 'phone', label: 'Số điện thoại' }] : []),
    ...(showLastLogin ? [{ key: 'lastLogin', label: 'Đăng nhập cuối' }] : []),
  ];

  const requiredColumnKeys = columns.filter(col => col.required).map(col => col.key);
  const resolvedVisibleColumns = Array.from(new Set([...requiredColumnKeys, ...visibleColumns]))
    .filter(key => columns.some(col => col.key === key));

  useEffect(() => {
    if (selectAllData?.hasMore) {
      toast.info('Đã chọn tối đa 5.000 người dùng phù hợp.');
    }
  }, [selectAllData?.hasMore]);

  const roleMap = useMemo(() => {
    const map: Record<string, { color?: string; isSuperAdmin?: boolean; name: string }> = {};
    rolesData?.forEach(role => { map[role._id] = { color: role.color, isSuperAdmin: role.isSuperAdmin, name: role.name }; });
    return map;
  }, [rolesData]);

  const users = useMemo<AdminUserWithRole[]>(() => usersData?.map(user => ({
    ...user,
    isSuperAdmin: roleMap[user.roleId]?.isSuperAdmin ?? false,
    roleName: isRolesEnabled ? (roleMap[user.roleId]?.name || 'N/A') : 'Full quyền',
    roleColor: isRolesEnabled ? roleMap[user.roleId]?.color : undefined,
  })) ?? [], [usersData, roleMap, isRolesEnabled]);

  const sortedUsers = useSortableData(users, sortConfig);

  const totalCount = totalCountData?.count ?? 0;
  const totalPages = totalCount ? Math.ceil(totalCount / resolvedUsersPerPage) : 1;
  const paginatedUsers = sortedUsers;
  const selectableUsers = paginatedUsers.filter(user => !user.isSuperAdmin);
  const showActions = canEdit || canDelete;
  const tableColumnCount = resolvedVisibleColumns.length + 1 + (selectionEnabled ? 1 : 0) + (showActions ? 1 : 0);
  const selectedIds = selectionEnabled && isSelectAllActive && selectAllData ? selectAllData.ids : manualSelectedIds;
  const resolvedSelectedIds = selectionEnabled ? selectedIds : [];
  const isSelectingAll = selectionEnabled && isSelectAllActive && selectAllData === undefined;

  const applyManualSelection = (nextIds: Id<"users">[]) => {
    setSelectionMode('manual');
    setManualSelectedIds(nextIds);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setFilterRole('');
    setFilterStatus('');
    setCurrentPage(1);
    setPageSizeOverride(null);
    applyManualSelection([]);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => getNextSortState(prev, key));
    setCurrentPage(1);
  };

  const handleFilterRole = (value: string) => {
    setFilterRole(value as Id<"roles"> | '');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const handleFilterStatus = (value: string) => {
    setFilterStatus(value as '' | 'Active' | 'Inactive' | 'Banned');
    setCurrentPage(1);
    applyManualSelection([]);
  };

  const selectedOnPage = selectableUsers.filter(user => resolvedSelectedIds.includes(user._id));
  const isPageSelected = selectionEnabled && selectableUsers.length > 0 && selectedOnPage.length === selectableUsers.length;
  const isPageIndeterminate = selectionEnabled && selectedOnPage.length > 0 && selectedOnPage.length < selectableUsers.length;

  const toggleSelectAll = () => {
    if (!selectionEnabled) {return;}
    if (isPageSelected) {
      const remaining = resolvedSelectedIds.filter(id => !paginatedUsers.some(user => user._id === id));
      applyManualSelection(remaining);
      return;
    }
    const next = new Set(resolvedSelectedIds);
    selectableUsers.forEach(user => next.add(user._id));
    applyManualSelection(Array.from(next));
  };

  const toggleSelectItem = (id: Id<"users">) => {
    if (!selectionEnabled) {return;}
    const target = paginatedUsers.find(user => user._id === id);
    if (target?.isSuperAdmin) {return;}
    const next = resolvedSelectedIds.includes(id)
      ? resolvedSelectedIds.filter(i => i !== id)
      : [...resolvedSelectedIds, id];
    applyManualSelection(next);
  };

  const handleDelete = async (id: Id<"users">) => {
    if (!canDelete) {return;}
    setDeleteTargetId(id);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) {return;}
    if (!token) {
      toast.error('Thiếu token xác thực');
      return;
    }
    setIsDeleteLoading(true);
    try {
      await deleteUser({ cascade: true, id: deleteTargetId, token });
      toast.success('Đã xóa người dùng');
      setIsDeleteOpen(false);
      setDeleteTargetId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete || !selectionEnabled || resolvedSelectedIds.length === 0) {return;}
    if (!token) {
      toast.error('Thiếu token xác thực');
      return;
    }
    if (confirm(`Xóa ${resolvedSelectedIds.length} người dùng đã chọn? Tất cả dữ liệu liên quan sẽ bị xóa.`)) {
      try {
        setIsBulkDeleting(true);
        const count = resolvedSelectedIds.length;
        await bulkDeleteUsers({ cascade: true, ids: resolvedSelectedIds, token });
        applyManualSelection([]);
        toast.success(`Đã xóa ${count} người dùng`);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
      } finally {
        setIsBulkDeleting(false);
      }
    }
  };

  const handleBulkStatusChange = async () => {
    if (!canEdit || !selectionEnabled || resolvedSelectedIds.length === 0) {return;}
    if (!token) {
      toast.error('Thiếu token xác thực');
      return;
    }
    setIsBulkStatusUpdating(true);
    try {
      const result = await bulkStatusChange({ ids: resolvedSelectedIds, status: bulkStatus, token });
      if (result.updated === 0) {
        toast.info('Không có thay đổi trạng thái');
      } else {
        toast.success(`Đã cập nhật ${result.updated} người dùng`);
      }
      applyManualSelection([]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsBulkStatusUpdating(false);
    }
  };

  const handleExport = () => {
    if (isRolesEnabled && !rolesData) {
      toast.error('Đang tải dữ liệu, vui lòng thử lại');
      return;
    }
    if (isExporting) {return;}
    setIsExporting(true);
    setExportRequested(true);
  };

  const formatLastLogin = (timestamp?: number) => {
    if (!timestamp) {return 'Chưa đăng nhập';}
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Người dùng hệ thống"
        description="Quản lý tài khoản truy cập vào Admin"
        addHref={canCreate ? "/admin/users/create" : undefined}
      >
        <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || exportRequested}>
          {isExporting ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2" />
              Đang xuất...
            </>
          ) : (
            'Xuất CSV'
          )}
        </Button>
      </AdminPageHeader>

      {selectionEnabled && canDelete && (
        <BulkActionBar
          selectedCount={resolvedSelectedIds.length}
          entityLabel="người dùng"
          selectionScope={isSelectAllActive ? 'all_results' : isPageSelected ? 'page' : 'partial'}
          pageItemCount={paginatedUsers.length}
          totalMatchingCount={totalCount}
          onSelectPage={() =>{  applyManualSelection(paginatedUsers.map(user => user._id)); }}
          onSelectAllResults={() =>{  setSelectionMode('all'); }}
          isSelectingAllResults={isSelectingAll}
          onDelete={handleBulkDelete}
          onClearSelection={() =>{  applyManualSelection([]); }}
          isLoading={isBulkDeleting}
        />
      )}
      {selectionEnabled && canEdit && resolvedSelectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
            value={bulkStatus}
            onChange={(e) =>{  setBulkStatus(e.target.value as 'Active' | 'Inactive' | 'Banned'); }}
          >
            <option value="Active">Hoạt động</option>
            <option value="Inactive">Không hoạt động</option>
            <option value="Banned">Bị cấm</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkStatusChange}
            disabled={isBulkStatusUpdating}
          >
            {isBulkStatusUpdating && <Loader2 size={14} className="animate-spin mr-2" />}
            Đổi trạng thái
          </Button>
        </div>
      )}

      <Card>
        <TableToolbar
          activeFilterCount={[Boolean(filterRole), Boolean(filterStatus)].filter(Boolean).length}
          onResetFilters={handleResetFilters}
          search={
            <SearchInput
              value={searchTerm}
              onChange={(val) => { setSearchTerm(val); setCurrentPage(1); applyManualSelection([]); }}
              placeholder="Tìm kiếm theo tên, email, SĐT..."
            />
          }
          filters={
            <>
              {isRolesEnabled && (
                <FilterSelect
                  label="Vai trò"
                  value={filterRole}
                  onChange={(val) => handleFilterRole(val)}
                  placeholder="Tất cả vai trò"
                  options={rolesData?.map(r => ({ value: r._id, label: r.name })) || []}
                />
              )}
              <FilterSelect
                label="Trạng thái"
                value={filterStatus}
                onChange={(val) => handleFilterStatus(val)}
                placeholder="Tất cả trạng thái"
                options={[
                  { value: 'Active', label: 'Hoạt động' },
                  { value: 'Inactive', label: 'Không hoạt động' },
                  { value: 'Banned', label: 'Bị cấm' },
                ]}
              />
              <ResetFilterButton isFiltered={Boolean(searchTerm.trim() || filterRole || filterStatus)} onReset={handleResetFilters} />
              <ColumnToggle
                columns={columns}
                visibleColumns={resolvedVisibleColumns}
                onToggle={(key) => toggleColumn(key, columns.map(c => c.key))}
              />
            </>
          }
        />
        {/* Desktop View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader className="[&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:bg-white dark:[&_th]:bg-slate-900">
              <TableRow>
                {selectionEnabled && (
                  <TableHead className="w-[40px]">
                    <SelectCheckbox
                      checked={isPageSelected}
                      onChange={toggleSelectAll}
                      indeterminate={isPageIndeterminate}
                      disabled={selectableUsers.length === 0}
                      title={selectableUsers.length === 0 ? 'Không có user để chọn' : undefined}
                    />
                  </TableHead>
                )}
                <SortableHeader label="Người dùng" sortKey="name" sortConfig={sortConfig} onSort={handleSort} />
                {resolvedVisibleColumns.includes('role') && <SortableHeader label="Vai trò" sortKey="roleName" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('status') && <SortableHeader label="Trạng thái" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('phone') && <SortableHeader label="Số điện thoại" sortKey="phone" sortConfig={sortConfig} onSort={handleSort} />}
                {resolvedVisibleColumns.includes('lastLogin') && <SortableHeader label="Đăng nhập cuối" sortKey="lastLogin" sortConfig={sortConfig} onSort={handleSort} />}
                {showActions && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isTableLoading ? (
                <TableSkeleton rows={resolvedUsersPerPage} cols={tableColumnCount} />
              ) : (
                <>
                  {paginatedUsers.map(user => (
                    <TableRow
                      key={user._id}
                      className={`${resolvedSelectedIds.includes(user._id) ? 'bg-blue-500/5' : ''} ${
                        user.isSuperAdmin ? 'bg-amber-50/60 dark:bg-amber-950/30' : ''
                      }`}
                    >
                      {selectionEnabled && (
                        <TableCell>
                          <SelectCheckbox
                            checked={resolvedSelectedIds.includes(user._id)}
                            onChange={() =>{  toggleSelectItem(user._id); }}
                            disabled={user.isSuperAdmin}
                            title={user.isSuperAdmin ? 'Không thể chọn Super Admin' : undefined}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {showAvatar && (
                            user.avatar ? (
                              <Image src={user.avatar} width={36} height={36} className="w-9 h-9 rounded-full object-cover" alt={user.name} />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-sm font-medium text-slate-500">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                            )
                          )}
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.name}
                              {user.isSuperAdmin && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 font-semibold">
                                  Super Admin
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      {resolvedVisibleColumns.includes('role') && (
                        <TableCell className="whitespace-nowrap">
                          {user.roleColor ? (
                            <span
                              className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                              style={{ backgroundColor: user.roleColor, borderColor: user.roleColor, color: '#fff' }}
                            >
                              {user.roleName}
                            </span>
                          ) : (
                            <Badge variant="secondary">{user.roleName}</Badge>
                          )}
                        </TableCell>
                      )}
                      {resolvedVisibleColumns.includes('status') && (
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={user.status === 'Active' ? 'success' : (user.status === 'Inactive' ? 'secondary' : 'destructive')}>
                            {user.status === 'Active' ? 'Hoạt động' : (user.status === 'Inactive' ? 'Không hoạt động' : 'Bị cấm')}
                          </Badge>
                        </TableCell>
                      )}
                      {resolvedVisibleColumns.includes('phone') && (
                        <TableCell className="text-slate-600 whitespace-nowrap">
                          {user.phone || '—'}
                        </TableCell>
                      )}
                      {resolvedVisibleColumns.includes('lastLogin') && (
                        <TableCell className="text-slate-500 text-sm whitespace-nowrap">{formatLastLogin(user.lastLogin)}</TableCell>
                      )}
                      {showActions && (
                        <TableCell className="text-right whitespace-nowrap">
                          <RowActions>
                            {canEdit && <EditActionButton href={`/admin/users/${user._id}/edit`} />}
                            {canDelete && !user.isSuperAdmin && <DeleteActionButton onClick={async () => handleDelete(user._id)} />}
                          </RowActions>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </>
              )}
              {!isTableLoading && paginatedUsers.length === 0 && (
                <TableEmptyState
                  colSpan={tableColumnCount}
                  message={searchTerm || filterRole || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có người dùng nào'}
                />
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile View */}
        <MobileCardList>
          {isTableLoading ? (
            <div className="p-4 text-center text-xs text-slate-400">Đang tải dữ liệu...</div>
          ) : paginatedUsers.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {searchTerm || filterRole || filterStatus ? 'Không tìm thấy kết quả phù hợp' : 'Chưa có người dùng nào'}
            </div>
          ) : (
            paginatedUsers.map(user => (
              <MobileRowCard
                key={user._id}
                selected={resolvedSelectedIds.includes(user._id)}
                checkbox={
                  selectionEnabled && (
                    <SelectCheckbox
                      checked={resolvedSelectedIds.includes(user._id)}
                      onChange={() => toggleSelectItem(user._id)}
                      disabled={user.isSuperAdmin}
                    />
                  )
                }
                title={
                  <span className="flex items-center gap-2">
                    {user.name}
                    {user.isSuperAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-normal">Super</span>
                    )}
                  </span>
                }
                subtitle={<span className="text-xs text-slate-500">{user.email}</span>}
                badge={
                  <Badge variant={user.status === 'Active' ? 'success' : (user.status === 'Inactive' ? 'secondary' : 'destructive')}>
                    {user.status === 'Active' ? 'Hoạt động' : (user.status === 'Inactive' ? 'Không hoạt động' : 'Bị cấm')}
                  </Badge>
                }
                details={
                  <div className="space-y-1">
                    <div><span className="text-slate-400">Vai trò:</span> {user.roleName}</div>
                    {user.phone && <div><span className="text-slate-400">SĐT:</span> {user.phone}</div>}
                    <div><span className="text-slate-400">Đăng nhập cuối:</span> {formatLastLogin(user.lastLogin)}</div>
                  </div>
                }
                actions={
                  showActions ? (
                    <RowActions>
                      {canEdit && <EditActionButton href={`/admin/users/${user._id}/edit`} />}
                      {canDelete && !user.isSuperAdmin && <DeleteActionButton onClick={async () => handleDelete(user._id)} />}
                    </RowActions>
                  ) : undefined
                }
              />
            ))
          )}
        </MobileCardList>
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          pageSize={resolvedUsersPerPage}
          totalItems={totalCount}
          onPageChange={(page) => { setCurrentPage(page); applyManualSelection([]); }}
          onPageSizeChange={(size) => {
            setPageSizeOverride(size);
            setCurrentPage(1);
            applyManualSelection([]);
          }}
          entityLabel="người dùng"
        />
      </Card>
      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open);
          if (!open) {setDeleteTargetId(null);}
        }}
        title="Xóa người dùng"
        itemName={users.find((user) => user._id === deleteTargetId)?.name ?? 'người dùng'}
        dependencies={deleteInfo?.dependencies ?? []}
        onConfirm={async () => handleConfirmDelete()}
        isLoading={isDeleteLoading}
      />
    </AdminPageLayout>
  );
}

