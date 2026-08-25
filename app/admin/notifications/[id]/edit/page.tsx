'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { Checkbox, Input, Label } from '../../../components/ui';
import { useSetAdminBreadcrumb } from '@/app/admin/context/AdminBreadcrumbContext';
import {
  AdminFormCard,
  AdminFormPageWrapper,
  AdminSelect,
  AdminStickyFooter,
  AdminTitleInput,
} from '@/app/admin/components/FormUtilities';

const MODULE_KEY = 'notifications';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

export default function NotificationEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const notificationData = useQuery(api.notifications.getById, { id: id as Id<"notifications"> });
  useSetAdminBreadcrumb(notificationData?.title);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const updateNotification = useMutation(api.notifications.update);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NotificationType>('info');
  const [targetType, setTargetType] = useState<'all' | 'customers' | 'users' | 'specific'>('all');
  const [sendEmail, setSendEmail] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = notificationData === undefined || fieldsData === undefined;

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  useEffect(() => {
    if (notificationData) {
      setTitle(notificationData.title);
      setContent(notificationData.content);
      setType(notificationData.type);
      setTargetType(notificationData.targetType);
      setSendEmail(notificationData.sendEmail ?? false);
      if (notificationData.scheduledAt) {
        const date = new Date(notificationData.scheduledAt);
        setScheduledAt(date.toISOString().slice(0, 16));
      }
    }
  }, [notificationData]);

  const isReadOnly = notificationData?.status === 'Sent';

  const hasChanges = useMemo(() => {
    if (!notificationData || isReadOnly) return false;
    return (
      title !== notificationData.title ||
      content !== notificationData.content ||
      type !== notificationData.type ||
      targetType !== notificationData.targetType ||
      sendEmail !== (notificationData.sendEmail ?? false)
    );
  }, [notificationData, title, content, type, targetType, sendEmail, isReadOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!title.trim() || !content.trim()) {
      toast.error('Vui lòng điền tiêu đề và nội dung');
      return;
    }
    setIsSubmitting(true);
    try {
      await updateNotification({
        id: id as Id<"notifications">,
        content,
        scheduledAt: enabledFields.has('scheduledAt') && scheduledAt ? new Date(scheduledAt).getTime() : undefined,
        sendEmail: enabledFields.has('sendEmail') ? sendEmail : undefined,
        status: scheduledAt ? 'Scheduled' : 'Draft',
        targetType: enabledFields.has('targetType') ? targetType : 'all',
        title,
        type,
      });
      toast.success('Đã cập nhật thông báo');
      router.push('/admin/notifications');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title={isReadOnly ? 'Chi tiết thông báo' : 'Chỉnh sửa thông báo'}
      backHref="/admin/notifications"
      isLoading={isLoading}
      notFound={!notificationData}
      notFoundMessage="Không tìm thấy thông báo"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        !isReadOnly ? (
          <AdminStickyFooter
            isSubmitting={isSubmitting}
            hasChanges={hasChanges}
            submitLabel="Lưu thay đổi"
            onCancel={() => router.push('/admin/notifications')}
            onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          />
        ) : undefined
      }
    >
      <div className="max-w-2xl space-y-4">
        {isReadOnly && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 p-4 rounded-md text-sm">
            Thông báo này đã được gửi đi. Bạn đang xem chi tiết ở chế độ chỉ đọc.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <AdminFormCard title="Nội dung thông báo">
            <AdminTitleInput
              label="Tiêu đề"
              required
              placeholder="Nhập tiêu đề thông báo..."
              value={title}
              copyLabel="tiêu đề"
              onChange={(e) => setTitle(e.target.value)}
              disabled={isReadOnly}
            />

            <div className="space-y-2">
              <Label>Nội dung <span className="text-red-500">*</span></Label>
              <textarea
                required
                className="w-full min-h-[120px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-75 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500"
                placeholder="Nhập nội dung thông báo..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isReadOnly}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Loại thông báo <span className="text-red-500">*</span></Label>
                <AdminSelect
                  value={type}
                  onChange={(val) => setType(val as NotificationType)}
                  disabled={isReadOnly}
                  options={[
                    { value: 'info', label: 'Thông tin' },
                    { value: 'success', label: 'Thành công' },
                    { value: 'warning', label: 'Cảnh báo' },
                    { value: 'error', label: 'Lỗi' },
                  ]}
                />
              </div>

              {enabledFields.has('targetType') && (
                <div className="space-y-2">
                  <Label>Đối tượng nhận</Label>
                  <AdminSelect
                    value={targetType}
                    onChange={(val) => setTargetType(val as typeof targetType)}
                    disabled={isReadOnly}
                    options={[
                      { value: 'all', label: 'Tất cả' },
                      { value: 'customers', label: 'Khách hàng' },
                      { value: 'users', label: 'Admin' },
                      { value: 'specific', label: 'Cụ thể' },
                    ]}
                  />
                </div>
              )}
            </div>

            {enabledFields.has('scheduledAt') && (
              <div className="space-y-2">
                <Label>Hẹn giờ gửi (để trống nếu lưu nháp)</Label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  disabled={isReadOnly}
                />
              </div>
            )}

            {enabledFields.has('sendEmail') && (
              <div className="flex items-center gap-2 pt-2">
                <Checkbox
                  id="sendEmail"
                  checked={sendEmail}
                  onCheckedChange={(checked) => setSendEmail(Boolean(checked))}
                  disabled={isReadOnly}
                />
                <Label htmlFor="sendEmail" className="cursor-pointer text-sm font-medium">Gửi email kèm theo</Label>
              </div>
            )}
          </AdminFormCard>
        </form>
      </div>
    </AdminFormPageWrapper>
  );
}
