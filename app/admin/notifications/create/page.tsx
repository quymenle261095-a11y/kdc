'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { Checkbox, Input, Label } from '../../components/ui';
import {
  AdminFormCard,
  AdminFormPageWrapper,
  AdminSelect,
  AdminStickyFooter,
  AdminTitleInput,
} from '@/app/admin/components/FormUtilities';

const MODULE_KEY = 'notifications';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

export default function NotificationCreatePage() {
  const router = useRouter();
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const settingsData = useQuery(api.admin.modules.listModuleSettings, { moduleKey: MODULE_KEY });
  const createNotification = useMutation(api.notifications.create);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<NotificationType>('info');
  const [targetType, setTargetType] = useState<'all' | 'customers' | 'users' | 'specific'>('all');
  const [sendEmail, setSendEmail] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = fieldsData === undefined;

  // Lấy defaultType từ settings
  const defaultType = useMemo(() => {
    const setting = settingsData?.find(s => s.settingKey === 'defaultType');
    return (setting?.value as NotificationType) || 'info';
  }, [settingsData]);

  // Sync type với defaultType khi settings load
  useEffect(() => {
    if (defaultType) {
      setType(defaultType);
    }
  }, [defaultType]);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const hasChanges = useMemo(() => {
    return title.trim() !== '' || content.trim() !== '' || sendEmail || scheduledAt !== '';
  }, [title, content, sendEmail, scheduledAt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error('Vui lòng điền tiêu đề và nội dung');
      return;
    }
    setIsSubmitting(true);
    try {
      await createNotification({
        content,
        scheduledAt: enabledFields.has('scheduledAt') && scheduledAt ? new Date(scheduledAt).getTime() : undefined,
        sendEmail: enabledFields.has('sendEmail') ? sendEmail : undefined,
        status: scheduledAt ? 'Scheduled' : 'Draft',
        targetType: enabledFields.has('targetType') ? targetType : 'all',
        title,
        type,
      });
      toast.success('Đã tạo thông báo');
      router.push('/admin/notifications');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Có lỗi xảy ra');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Tạo thông báo mới"
      backHref="/admin/notifications"
      isLoading={isLoading}
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          mode="create"
          isSubmitting={isSubmitting}
          submitLabel={scheduledAt ? 'Lên lịch gửi' : 'Lưu nháp'}
          onCancel={() => router.push('/admin/notifications')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
        />
      }
    >
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
        <AdminFormCard title="Nội dung thông báo">
          <AdminTitleInput
            label="Tiêu đề"
            required
            placeholder="Nhập tiêu đề thông báo..."
            value={title}
            copyLabel="tiêu đề"
            onChange={(e) => setTitle(e.target.value)}
          />

          <div className="space-y-2">
            <Label>Nội dung <span className="text-red-500">*</span></Label>
            <textarea
              required
              className="w-full min-h-[120px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Nhập nội dung thông báo..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Loại thông báo <span className="text-red-500">*</span></Label>
              <AdminSelect
                value={type}
                onChange={(val) => setType(val as NotificationType)}
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
              />
            </div>
          )}

          {enabledFields.has('sendEmail') && (
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="sendEmail"
                checked={sendEmail}
                onCheckedChange={(checked) => setSendEmail(Boolean(checked))}
              />
              <Label htmlFor="sendEmail" className="cursor-pointer text-sm font-medium">Gửi email kèm theo</Label>
            </div>
          )}
        </AdminFormCard>
      </form>
    </AdminFormPageWrapper>
  );
}
