'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { Input, Label } from '../../components/ui';
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

const MODULE_KEY = 'customers';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(phone.replaceAll(/\s|-/g, ''));

interface FormData {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  status: 'Active' | 'Inactive';
}

export default function CustomerCreatePage() {
  const router = useRouter();

  const createCustomer = useMutation(api.customers.create);
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });

  const [formData, setFormData] = useState<FormData>({
    address: '',
    city: '',
    email: '',
    name: '',
    notes: '',
    phone: '',
    status: 'Active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach((f) => {
      features[f.featureKey] = f.enabled;
    });
    return features;
  }, [featuresData]);

  const showNotes = enabledFeatures.enableNotes ?? true;
  const showAddresses = enabledFeatures.enableAddresses ?? true;

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập họ tên');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Vui lòng nhập email');
      return;
    }
    if (!isValidEmail(formData.email.trim())) {
      toast.error('Email không hợp lệ');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Vui lòng nhập số điện thoại');
      return;
    }
    if (!isValidPhone(formData.phone.trim())) {
      toast.error('Số điện thoại không hợp lệ (VD: 0901234567 hoặc +84901234567)');
      return;
    }

    setIsSubmitting(true);
    try {
      await createCustomer({
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        email: formData.email.toLowerCase().trim(),
        name: formData.name.trim(),
        notes: formData.notes.trim() || undefined,
        phone: formData.phone.trim(),
        status: formData.status,
      });
      toast.success('Đã tạo khách hàng mới thành công');
      router.push('/admin/customers');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm khách hàng mới"
      subtitle="Nhập thông tin liên hệ và địa chỉ của khách hàng vào hệ thống."
      backHref="/admin/customers"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Tạo khách hàng"
          onCancel={() => router.push('/admin/customers')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          disableSave={isSubmitting || !formData.name.trim() || !formData.email.trim() || !formData.phone.trim()}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard title="Thông tin cá nhân">
              <AdminTitleInput
                label="Họ tên khách hàng"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                placeholder="Nhập họ tên khách hàng..."
                autoFocus
                copyLabel="họ tên"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số điện thoại <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="0901234567"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                  />
                </div>
              </div>

              {showNotes && (
                <div className="space-y-2">
                  <Label>Ghi chú nội bộ</Label>
                  <textarea
                    className="w-full min-h-[100px] rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Ghi chú về thói quen, sở thích, yêu cầu của khách hàng..."
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                  />
                </div>
              )}
            </AdminFormCard>

            {showAddresses && (
              <AdminFormCard title="Địa chỉ liên hệ">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Tỉnh / Thành phố</Label>
                    <Input
                      placeholder="VD: Hà Nội, TP. Hồ Chí Minh, Đà Nẵng..."
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Địa chỉ chi tiết</Label>
                    <Input
                      placeholder="Số nhà, tên đường, phường/xã..."
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                    />
                  </div>
                </div>
              </AdminFormCard>
            )}
          </AdminFormMain>

          <AdminFormSidebar>
            <AdminFormCard title="Trạng thái tài khoản">
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <AdminSelect
                  value={formData.status}
                  onChange={(val) => handleChange('status', val)}
                  options={[
                    { value: 'Active', label: 'Hoạt động' },
                    { value: 'Inactive', label: 'Đã khóa' },
                  ]}
                />
              </div>
            </AdminFormCard>
          </AdminFormSidebar>
        </AdminFormGrid>
      </form>
    </AdminFormPageWrapper>
  );
}
