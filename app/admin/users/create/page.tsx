'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Loader2, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, Input, Label } from '../../components/ui';
import { ImageUploader } from '../../components/ImageUploader';
import { useAdminAuth } from '../../auth/context';
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

const MODULE_KEY = 'users';

export default function UserCreatePage() {
  const { hasPermission, isLoading: isAuthLoading, token } = useAdminAuth();
  const canCreate = hasPermission(MODULE_KEY, 'create');

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!canCreate) {
    return (
      <Card className="max-w-2xl mx-auto p-8 text-center">
        <ShieldOff size={40} className="mx-auto text-slate-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Không có quyền truy cập</h2>
        <p className="text-slate-500 mt-2">Bạn không có quyền tạo người dùng mới.</p>
        <div className="mt-6">
          <Link href="/admin/users">
            <Button>Quay lại danh sách</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return <UserCreateForm token={token} />;
}

function UserCreateForm({ token }: { token: string | null }) {
  const router = useRouter();
  const rolesData = useQuery(api.roles.listAll);
  const rolesModule = useQuery(api.admin.modules.getModuleByKey, { key: 'roles' });
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const createUser = useMutation(api.users.create);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState<string | undefined>();
  const [roleId, setRoleId] = useState<Id<'roles'> | ''>('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Banned'>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isRolesEnabled = rolesModule?.enabled ?? false;
  const isLoading = fieldsData === undefined || rolesModule === undefined || (isRolesEnabled && rolesData === undefined);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach((f) => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const validateEmail = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    if (password.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Xác nhận mật khẩu không khớp');
      return;
    }
    setIsSubmitting(true);
    try {
      await createUser({
        avatar: enabledFields.has('avatar') && avatar ? avatar : undefined,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password,
        phone: enabledFields.has('phone') && phone ? phone.trim() : undefined,
        roleId: isRolesEnabled ? (roleId || undefined) : undefined,
        status,
        token,
      });
      toast.success('Đã tạo người dùng mới thành công');
      router.push('/admin/users');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo người dùng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm người dùng mới"
      subtitle="Tạo tài khoản quản trị viên hoặc thành viên vận hành hệ thống."
      backHref="/admin/users"
      isLoading={isLoading}
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Tạo người dùng"
          onCancel={() => router.push('/admin/users')}
          onClickSave={() => handleSubmit()}
          disableSave={isSubmitting || !name.trim() || !email.trim() || !password || password !== confirmPassword}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
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

            <AdminFormCard title="Bảo mật & Mật khẩu">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Mật khẩu khởi tạo <span className="text-red-500">*</span></Label>
                  <Input
                    type="password"
                    required
                    placeholder="Tối thiểu 6 ký tự..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Xác nhận lại mật khẩu <span className="text-red-500">*</span></Label>
                  <Input
                    type="password"
                    required
                    placeholder="Nhập lại mật khẩu..."
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
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
                      Module vai trò chưa bật, user sẽ gán role Admin mặc định.
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
    </AdminFormPageWrapper>
  );
}
