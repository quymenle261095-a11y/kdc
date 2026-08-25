'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Loader2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Input, Label } from '../../../components/ui';
import { ImageUploader } from '../../../components/ImageUploader';
import { useSetAdminBreadcrumb } from '@/app/admin/context/AdminBreadcrumbContext';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormPageWrapper,
  AdminFormSidebar,
  AdminSelect,
  AdminStickyFooter,
  AdminTitleInput,
} from '@/app/admin/components/FormUtilities';
import { useAdminAuth } from '../../../auth/context';

const MODULE_KEY = 'users';

export default function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
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
      <Card className="max-w-2xl mx-auto p-8 text-center">
        <ShieldOff size={40} className="mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Không có quyền truy cập</h2>
        <p className="text-slate-500 mt-2">Bạn không có quyền chỉnh sửa người dùng.</p>
        <div className="mt-6">
          <Link href="/admin/users">
            <Button>Quay lại danh sách</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return <UserEditForm params={params} token={token} />;
}

function UserEditForm({ params, token }: { params: Promise<{ id: string }>; token: string | null }) {
  const { id } = use(params);
  const router = useRouter();
  const userId = id as Id<'users'>;

  const userData = useQuery(api.users.getById, { id: userId });
  useSetAdminBreadcrumb(userData?.name);
  const rolesData = useQuery(api.roles.listAll);
  const rolesModule = useQuery(api.admin.modules.getModuleByKey, { key: 'roles' });
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const activityLogs = useQuery(api.activityLogs.getRecentByUser, { limit: 10, userId });
  const updateUser = useMutation(api.users.update);
  const changePassword = useMutation(api.users.changePassword);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [roleId, setRoleId] = useState<Id<'roles'> | ''>('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Banned'>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const isRolesEnabled = rolesModule?.enabled ?? false;
  const isLoading = userData === undefined || fieldsData === undefined || rolesModule === undefined || (isRolesEnabled && rolesData === undefined);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach((f) => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const hasChanges = useMemo(() => {
    if (!userData) return false;

    const current = {
      avatar: enabledFields.has('avatar') ? avatar : undefined,
      email: email.trim(),
      name: name.trim(),
      phone: enabledFields.has('phone') ? phone.trim() : undefined,
      roleId: isRolesEnabled ? (roleId || undefined) : undefined,
      status,
    };
    const original = {
      avatar: enabledFields.has('avatar') ? userData.avatar : undefined,
      email: userData.email.trim(),
      name: userData.name.trim(),
      phone: enabledFields.has('phone') ? (userData.phone ?? '').trim() : undefined,
      roleId: isRolesEnabled ? userData.roleId : undefined,
      status: userData.status,
    };

    return JSON.stringify(current) !== JSON.stringify(original);
  }, [avatar, email, enabledFields, isRolesEnabled, name, phone, roleId, status, userData]);

  useEffect(() => {
    if (userData) {
      setName(userData.name);
      setEmail(userData.email);
      setPhone(userData.phone ?? '');
      setAvatar(userData.avatar);
      setRoleId(userData.roleId ?? '');
      setStatus(userData.status);
    }
  }, [userData]);

  const validateEmail = (emailStr: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasChanges) return;
    if (!token) {
      toast.error('Thiếu token xác thực');
      return;
    }
    if (!name.trim()) {
      toast.error('Vui lòng nhập họ tên');
      return;
    }
    if (!email.trim() || !validateEmail(email)) {
      toast.error('Email không hợp lệ');
      return;
    }
    if (isRolesEnabled && !roleId) {
      toast.error('Vui lòng chọn vai trò');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateUser({
        avatar: enabledFields.has('avatar') ? avatar : undefined,
        email: email.trim().toLowerCase(),
        id: userId,
        name: name.trim(),
        phone: enabledFields.has('phone') && phone ? phone.trim() : undefined,
        roleId: isRolesEnabled ? (roleId || undefined) : undefined,
        status,
        token,
      });
      toast.success('Đã cập nhật thông tin người dùng thành công');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Thiếu token xác thực');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Xác nhận mật khẩu không khớp');
      return;
    }
    setIsChangingPassword(true);
    try {
      await changePassword({ id: userId, password: newPassword, token });
      toast.success('Đã cập nhật mật khẩu mới thành công');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa người dùng"
      subtitle={userData ? `Cập nhật hồ sơ tài khoản: ${userData.email}` : undefined}
      backHref="/admin/users"
      isLoading={isLoading}
      notFound={userData === null}
      notFoundMessage="Không tìm thấy người dùng"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/users')}
          onClickSave={() => handleSubmit()}
          disableSave={!hasChanges || isSubmitting || !name.trim() || !email.trim()}
        />
      }
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit}>
          <AdminFormGrid>
            <AdminFormMain>
              <AdminFormCard title="Thông tin tài khoản">
                <AdminTitleInput
                  label="Họ và tên"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Nhập họ và tên đầy đủ..."
                  autoFocus
                  copyLabel="họ và tên"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Email đăng nhập <span className="text-red-500">*</span></Label>
                    <Input
                      type="email"
                      required
                      placeholder="example@admin.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {enabledFields.has('phone') && (
                    <div className="space-y-2">
                      <Label>Số điện thoại</Label>
                      <Input
                        placeholder="0901234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </AdminFormCard>
            </AdminFormMain>

            <AdminFormSidebar>
              <AdminFormCard title="Phân quyền & Trạng thái">
                <div className="space-y-4">
                  {isRolesEnabled ? (
                    <div className="space-y-2">
                      <Label>Vai trò <span className="text-red-500">*</span></Label>
                      <AdminSelect
                        value={roleId}
                        onChange={(val) => setRoleId(val as Id<'roles'>)}
                        placeholder="Chọn vai trò..."
                        options={(rolesData ?? []).map((r) => ({ value: r._id, label: r.name }))}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Vai trò</Label>
                      <div className="rounded-md border border-dashed border-slate-200 p-2.5 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800">
                        Module vai trò đang tắt. Không thể đổi vai trò trong lúc này.
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <AdminSelect
                      value={status}
                      onChange={(val) => setStatus(val as 'Active' | 'Inactive' | 'Banned')}
                      options={[
                        { value: 'Active', label: 'Hoạt động' },
                        { value: 'Inactive', label: 'Không hoạt động' },
                        { value: 'Banned', label: 'Bị cấm' },
                      ]}
                    />
                  </div>

                  {enabledFields.has('lastLogin') && userData?.lastLogin && (
                    <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-500 dark:bg-slate-800/80">
                      Đăng nhập lần cuối: {new Date(userData.lastLogin).toLocaleString('vi-VN')}
                    </div>
                  )}
                </div>
              </AdminFormCard>

              {enabledFields.has('avatar') && (
                <AdminFormCard title="Ảnh đại diện (Avatar)">
                  <ImageUploader
                    value={avatar}
                    onChange={(url) => setAvatar(url)}
                    folder="users"
                    aspectRatio="square"
                  />
                </AdminFormCard>
              )}
            </AdminFormSidebar>
          </AdminFormGrid>
        </form>

        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard
              title="Đổi mật khẩu"
              description="Nhập mật khẩu mới để cấp lại quyền truy cập cho người dùng này."
            >
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Mật khẩu mới</Label>
                    <Input
                      type="password"
                      placeholder="Tối thiểu 6 ký tự..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Xác nhận mật khẩu</Label>
                    <Input
                      type="password"
                      placeholder="Nhập lại mật khẩu..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-500 font-medium"
                    disabled={isChangingPassword || !newPassword}
                  >
                    {isChangingPassword && <Loader2 size={16} className="animate-spin mr-2" />}
                    Cập nhật mật khẩu
                  </Button>
                </div>
              </form>
            </AdminFormCard>
          </AdminFormMain>

          <AdminFormSidebar>
            <AdminFormCard
              title="Hoạt động gần đây"
              description="10 nhật ký hoạt động mới nhất."
            >
              {activityLogs === undefined ? (
                <div className="flex items-center justify-center h-20">
                  <Loader2 size={20} className="animate-spin text-slate-400" />
                </div>
              ) : activityLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa ghi nhận hoạt động nào.</p>
              ) : (
                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {activityLogs.map((log) => {
                    const detailsText =
                      typeof log.details === 'string'
                        ? log.details
                        : log.details
                          ? JSON.stringify(log.details)
                          : '';
                    return (
                      <div
                        key={log._id}
                        className="rounded-lg border border-slate-100 p-2.5 dark:border-slate-800 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {new Date(log._creationTime).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {log.targetType} · {log.targetId}
                        </div>
                        {detailsText && (
                          <div className="text-[11px] text-slate-400 mt-1 break-words font-mono bg-slate-50 dark:bg-slate-900/50 p-1 rounded">
                            {detailsText}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminFormCard>
          </AdminFormSidebar>
        </AdminFormGrid>
      </div>
    </AdminFormPageWrapper>
  );
}
