'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, ShieldOff } from 'lucide-react';
import { Badge, Button, Card, Input, Label } from '../../../components/ui';
import { useAdminAuth } from '../../../auth/context';
import {
  ACTION_LABELS,
  PERMISSION_ACTIONS,
  getModuleActions,
  isPermissionModule,
  type PermissionAction,
} from '../../permission-config';
import { useSetAdminBreadcrumb } from '@/app/admin/context/AdminBreadcrumbContext';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormPageWrapper,
  AdminFormSidebar,
  AdminStickyFooter,
  AdminTitleInput,
} from '@/app/admin/components/FormUtilities';

const MODULE_KEY = 'roles';

export default function RoleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { hasPermission, isLoading: isAuthLoading, token } = useAdminAuth();
  const canEdit = hasPermission(MODULE_KEY, 'edit');

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <Card className="max-w-4xl mx-auto p-8 text-center">
        <ShieldOff size={40} className="mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Không có quyền truy cập</h2>
        <p className="text-slate-500 mt-2">Bạn không có quyền chỉnh sửa vai trò.</p>
        <div className="mt-6">
          <Link href="/admin/roles">
            <Button>Quay lại danh sách</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return <RoleEditForm params={params} token={token} />;
}

function RoleEditForm({ params, token }: { params: Promise<{ id: string }>; token: string | null }) {
  const { id } = use(params);
  const router = useRouter();
  const roleId = id as Id<'roles'>;

  const roleData = useQuery(api.roles.getById, { id: roleId });
  useSetAdminBreadcrumb(roleData?.name);
  const modulesData = useQuery(api.admin.modules.listModules);
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });
  const updateRole = useMutation(api.roles.update);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [permissions, setPermissions] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  const isLoading = roleData === undefined || modulesData === undefined;

  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach((f) => {
      features[f.featureKey] = f.enabled;
    });
    return features;
  }, [featuresData]);

  const showDescription = enabledFeatures.enableDescription ?? true;
  const showColor = enabledFeatures.enableColor ?? true;

  useEffect(() => {
    if (roleData && !isInitialized) {
      setName(roleData.name);
      setDescription(roleData.description);
      setColor(roleData.color ?? '#3b82f6');
      setPermissions(roleData.permissions);
      setIsInitialized(true);
    }
  }, [roleData, isInitialized]);

  const permissionModules = useMemo(() => {
    if (!modulesData) return [];
    return modulesData
      .filter((m) => m.enabled && isPermissionModule(m.key))
      .map((m) => ({ key: m.key, label: m.name }));
  }, [modulesData]);

  const hasChanges = useMemo(() => {
    if (!roleData || roleData.isSystem) return false;

    const normalizePermissions = (value: Record<string, string[]>) =>
      Object.fromEntries(
        Object.entries(value)
          .sort(([moduleA], [moduleB]) => moduleA.localeCompare(moduleB))
          .map(([module, actions]) => [module, [...actions].sort()]),
      );

    const current = {
      color: showColor ? color : undefined,
      description: showDescription ? description.trim() : '',
      name: name.trim(),
      permissions: normalizePermissions(permissions),
    };
    const original = {
      color: showColor ? (roleData.color ?? '#3b82f6') : undefined,
      description: showDescription ? roleData.description.trim() : '',
      name: roleData.name.trim(),
      permissions: normalizePermissions(roleData.permissions),
    };

    return JSON.stringify(current) !== JSON.stringify(original);
  }, [color, description, name, permissions, roleData, showColor, showDescription]);

  const togglePermission = (module: string, action: PermissionAction) => {
    setPermissions((prev) => {
      const moduleActions = getModuleActions(module);
      if (!moduleActions.includes(action)) {
        return prev;
      }
      const current = prev[module] || [];
      if (current.includes(action)) {
        return { ...prev, [module]: current.filter((a) => a !== action) };
      }
      return { ...prev, [module]: [...current, action] };
    });
  };

  const toggleAllForModule = (module: string) => {
    setPermissions((prev) => {
      const moduleActions = getModuleActions(module);
      const current = new Set(prev[module] || []);
      const hasAll = moduleActions.every((action) => current.has(action));
      if (hasAll) {
        moduleActions.forEach((action) => current.delete(action));
      } else {
        moduleActions.forEach((action) => current.add(action));
      }
      return { ...prev, [module]: Array.from(current) };
    });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập tên vai trò';
    } else if (name.length > 50) {
      newErrors.name = 'Tên vai trò tối đa 50 ký tự';
    }
    if (description.length > 200) {
      newErrors.description = 'Mô tả tối đa 200 ký tự';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasChanges) return;
    if (!validate()) return;
    if (!token) {
      toast.error('Thiếu token xác thực');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateRole({
        color: showColor ? color : undefined,
        description: description.trim(),
        id: roleId,
        name: name.trim(),
        permissions,
        token,
      });
      toast.success('Đã cập nhật vai trò thành công');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi cập nhật vai trò');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSystemRole = roleData?.isSystem;

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa vai trò"
      subtitle={roleData ? `Quản lý quyền hạn và ma trận truy cập cho: ${roleData.name}` : undefined}
      backHref="/admin/roles"
      isLoading={isLoading}
      notFound={roleData === null}
      notFoundMessage="Không tìm thấy thông tin vai trò"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/roles')}
          onClickSave={() => handleSubmit()}
          disableSave={!hasChanges || isSubmitting || isSystemRole}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {isSystemRole && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Vai trò hệ thống</h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Đây là vai trò mặc định của hệ thống. Bạn không thể chỉnh sửa tên, mô tả hoặc quyền hạn của vai trò này.
              </p>
            </div>
          </div>
        )}

        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard title="Thông tin vai trò">
              <AdminTitleInput
                label="Tên vai trò"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSystemRole}
                placeholder="Ví dụ: Biên tập viên..."
                autoFocus
                copyLabel="tên vai trò"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}

              {showDescription && (
                <div className="space-y-2">
                  <Label>Mô tả nhiệm vụ & quyền hạn</Label>
                  <textarea
                    className={`w-full min-h-[80px] rounded-md border ${errors.description ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} bg-white p-3 text-sm dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSystemRole}
                    placeholder="Mô tả quyền hạn của vai trò này..."
                  />
                  {errors.description && <p className="text-red-500 text-xs">{errors.description}</p>}
                </div>
              )}
            </AdminFormCard>

            <AdminFormCard title="Phân quyền chi tiết">
              {isSystemRole ? (
                <div className="text-center py-6 text-slate-500">
                  <Badge variant="secondary" className="text-sm py-1 px-3">Toàn quyền truy cập (Super Admin)</Badge>
                  <p className="text-xs text-slate-400 mt-2">Vai trò hệ thống có toàn quyền trên tất cả các module.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-6 gap-4 pb-2 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-500">
                    <div className="col-span-1">Module</div>
                    <div className="text-center">Tất cả</div>
                    {PERMISSION_ACTIONS.map((action) => (
                      <div key={action} className="text-center">
                        {ACTION_LABELS[action]}
                      </div>
                    ))}
                  </div>
                  {permissionModules.map((module) => {
                    const modulePerms = permissions[module.key] || [];
                    const moduleActions = getModuleActions(module.key);
                    const allChecked = moduleActions.every((action) => modulePerms.includes(action));
                    return (
                      <div key={module.key} className="grid grid-cols-6 gap-4 items-center py-2 text-sm border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{module.label}</div>
                        <div className="flex justify-center">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={() => toggleAllForModule(module.key)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                            disabled={isSystemRole}
                          />
                        </div>
                        {PERMISSION_ACTIONS.map((action) => (
                          <div key={action} className="flex justify-center">
                            {moduleActions.includes(action) ? (
                              <input
                                type="checkbox"
                                checked={modulePerms.includes(action)}
                                onChange={() => togglePermission(module.key, action)}
                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
                                disabled={isSystemRole}
                              />
                            ) : (
                              <span className="text-slate-300 dark:text-slate-600">—</span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {permissionModules.length === 0 && (
                    <p className="text-center text-slate-500 py-4 text-sm italic">Không có module nào để phân quyền</p>
                  )}
                </div>
              )}
            </AdminFormCard>
          </AdminFormMain>

          <AdminFormSidebar>
            {showColor && (
              <AdminFormCard title="Màu sắc đại diện">
                <div className="space-y-3">
                  <Label>Mã màu vai trò</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      disabled={isSystemRole}
                      className="w-10 h-10 rounded cursor-pointer border border-slate-200 dark:border-slate-700 p-0.5 disabled:opacity-50"
                    />
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      disabled={isSystemRole}
                      placeholder="#3b82f6"
                      className="font-mono uppercase text-sm flex-1"
                    />
                  </div>
                </div>
              </AdminFormCard>
            )}
          </AdminFormSidebar>
        </AdminFormGrid>
      </form>
    </AdminFormPageWrapper>
  );
}
