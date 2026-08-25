'use client';

import React, { use, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ChevronLeft, ChevronRight, User as UserIcon, Search, ChevronDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '../../../components/ui';
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

const MODULE_KEY = 'customers';
const ORDERS_PER_PAGE = 10;

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone: string) => /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(phone.replaceAll(/\s|-/g, ''));

// ─── Address Combobox ────────────────────────────────────────────────────────
interface ComboboxOption { code: string; name: string; }
interface AddressComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
  disabled?: boolean;
  hasError?: boolean;
}

function AddressCombobox({ options, value, onChange, placeholder, disabled, hasError }: AddressComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.code === value) ?? null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.name.toLowerCase().includes(q));
  }, [options, query]);

  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setHighlighted(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [disabled]);

  const handleSelect = useCallback((code: string) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  }, [onChange]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') handleOpen();
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    }
    if (e.key === 'Enter' && filtered[highlighted]) {
      handleSelect(filtered[highlighted].code);
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const item = listRef.current.children[highlighted] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  return (
    <div ref={containerRef} className="relative" onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 border rounded-md text-sm transition-colors text-left bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-slate-400 dark:hover:border-slate-600',
          hasError && 'border-red-500',
        )}
      >
        <span className="truncate">{selected ? selected.name : placeholder}</span>
        <ChevronDown size={15} className={cn('shrink-0 ml-1 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg overflow-hidden min-w-[220px]">
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-100 dark:border-slate-900">
            <Search size={13} className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Tìm kiếm..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlighted(0);
              }}
              className="flex-1 text-sm outline-none bg-transparent py-1 text-slate-800 dark:text-slate-200"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setHighlighted(0);
                  inputRef.current?.focus();
                }}
                className="text-xs text-slate-400 hover:text-slate-600 shrink-0"
              >
                ✕
              </button>
            )}
          </div>

          <ul ref={listRef} className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-slate-400 text-center">Không tìm thấy kết quả</li>
            ) : (
              filtered.map((opt, idx) => (
                <li
                  key={opt.code}
                  onMouseEnter={() => setHighlighted(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt.code);
                  }}
                  className={cn(
                    'px-3 py-1.5 text-sm cursor-pointer flex items-center justify-between transition-colors text-slate-800 dark:text-slate-200',
                    idx === highlighted ? 'bg-slate-100 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/30',
                  )}
                >
                  <span>{opt.name}</span>
                  {opt.code === value && <Check size={13} className="text-emerald-500 shrink-0" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface AddressOption { code: string; name: string; parentCode?: string; }
interface TwoLevelProvince { code: number; name: string; wards: { code: number; name: string; }[]; }

interface FormData {
  name: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  notes: string;
  status: 'Active' | 'Inactive';
  addressFormat: 'text' | '2-level' | '3-level';
  addressDetail: string;
  provinceCode: string;
  provinceName: string;
  districtCode: string;
  districtName: string;
  wardCode: string;
  wardName: string;
}

export default function CustomerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const customerId = id as Id<'customers'>;

  const customerData = useQuery(api.customers.getById, { id: customerId });
  useSetAdminBreadcrumb(customerData?.name);
  const ordersData = useQuery(api.orders.listAllByCustomer, { customerId });
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });
  const ordersSettings = useQuery(api.admin.modules.listModuleSettings, { moduleKey: 'orders' });

  const updateCustomer = useMutation(api.customers.update);

  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [initialData, setInitialData] = useState<FormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);

  const [twoLevelData, setTwoLevelData] = useState<TwoLevelProvince[]>([]);
  const [provinceList, setProvinceList] = useState<AddressOption[]>([]);
  const [districtList, setDistrictList] = useState<AddressOption[]>([]);
  const [wardList, setWardList] = useState<AddressOption[]>([]);

  const isLoading = customerData === undefined || ordersSettings === undefined;

  const settingsMap = useMemo(() => {
    const map: Record<string, unknown> = {};
    (ordersSettings ?? []).forEach((setting) => {
      map[setting.settingKey] = setting.value;
    });
    return map;
  }, [ordersSettings]);

  const rawAddressFormat = typeof settingsMap.addressFormat === 'string' ? settingsMap.addressFormat : 'text';
  const addressFormat = rawAddressFormat === '2-level' || rawAddressFormat === '3-level' ? rawAddressFormat : 'text';

  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach((f) => {
      features[f.featureKey] = f.enabled;
    });
    return features;
  }, [featuresData]);

  const showNotes = enabledFeatures.enableNotes ?? true;
  const showAddresses = enabledFeatures.enableAddresses ?? true;
  const showAvatar = enabledFeatures.enableAvatar ?? true;

  useEffect(() => {
    if (customerData && !initialData && ordersSettings !== undefined) {
      const data: FormData = {
        address: customerData.address ?? '',
        city: customerData.city ?? '',
        email: customerData.email,
        name: customerData.name,
        notes: customerData.notes ?? '',
        phone: customerData.phone,
        status: customerData.status,
        addressFormat: customerData.addressFormat ?? 'text',
        addressDetail: customerData.addressDetail ?? '',
        provinceCode: customerData.provinceCode ?? '',
        provinceName: customerData.provinceName ?? '',
        districtCode: customerData.districtCode ?? '',
        districtName: customerData.districtName ?? '',
        wardCode: customerData.wardCode ?? '',
        wardName: customerData.wardName ?? '',
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [customerData, initialData, ordersSettings]);

  useEffect(() => {
    if (addressFormat === '2-level') {
      fetch('/vietnam-administrative/provinces_2_level.json')
        .then((r) => r.json())
        .then((data: TwoLevelProvince[]) => {
          setTwoLevelData(data);
          setProvinceList(data.map((p) => ({ code: String(p.code), name: p.name })));
        })
        .catch((e) => console.error('Lỗi tải 2-level address:', e));
    } else if (addressFormat === '3-level') {
      Promise.all([
        fetch('/vietnam-administrative/provinces.json').then((r) => r.json()),
        fetch('/vietnam-administrative/districts.json').then((r) => r.json()),
        fetch('/vietnam-administrative/wards.json').then((r) => r.json()),
      ])
        .then(([p, d, w]: [AddressOption[], AddressOption[], AddressOption[]]) => {
          setProvinceList(p);
          setDistrictList(d);
          setWardList(w);
        })
        .catch((e) => console.error('Lỗi tải 3-level address:', e));
    }
  }, [addressFormat]);

  const availableDistricts = useMemo(() => {
    if (addressFormat !== '3-level' || !formData?.provinceCode) return [];
    return districtList.filter((d) => d.parentCode === formData.provinceCode);
  }, [addressFormat, formData?.provinceCode, districtList]);

  const availableWards = useMemo(() => {
    if (addressFormat === '2-level') {
      if (!formData?.provinceCode) return [];
      const prov = twoLevelData.find((p) => String(p.code) === formData.provinceCode);
      return (prov?.wards ?? []).map((w) => ({ code: String(w.code), name: w.name }));
    }
    if (addressFormat === '3-level') {
      if (!formData?.districtCode) return [];
      return wardList.filter((w) => w.parentCode === formData.districtCode);
    }
    return [];
  }, [addressFormat, formData?.provinceCode, formData?.districtCode, twoLevelData, wardList]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleProvinceChange = (code: string) => {
    const prov = provinceList.find((p) => p.code === code);
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            provinceCode: code,
            provinceName: prov?.name ?? '',
            districtCode: '',
            districtName: '',
            wardCode: '',
            wardName: '',
          }
        : null,
    );
  };

  const handleDistrictChange = (code: string) => {
    const dist = districtList.find((d) => d.code === code);
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            districtCode: code,
            districtName: dist?.name ?? '',
            wardCode: '',
            wardName: '',
          }
        : null,
    );
  };

  const handleWardChange = (code: string) => {
    const ward = availableWards.find((w) => w.code === code);
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            wardCode: code,
            wardName: ward?.name ?? '',
          }
        : null,
    );
  };

  const hasChanges = useMemo(() => {
    if (!formData || !initialData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData) return;

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
      await updateCustomer({
        id: customerId,
        address: showAddresses && addressFormat === 'text' ? (formData.address.trim() || undefined) : undefined,
        city: showAddresses && addressFormat === 'text' ? (formData.city.trim() || undefined) : undefined,
        email: formData.email.toLowerCase().trim(),
        name: formData.name.trim(),
        notes: showNotes ? (formData.notes.trim() || undefined) : undefined,
        phone: formData.phone.trim(),
        status: formData.status,
        addressFormat: showAddresses ? addressFormat : undefined,
        addressDetail: showAddresses && addressFormat !== 'text' ? (formData.addressDetail.trim() || undefined) : undefined,
        provinceCode: showAddresses && addressFormat !== 'text' ? formData.provinceCode : undefined,
        provinceName: showAddresses && addressFormat !== 'text' ? formData.provinceName : undefined,
        districtCode: showAddresses && addressFormat === '3-level' ? formData.districtCode : undefined,
        districtName: showAddresses && addressFormat === '3-level' ? formData.districtName : undefined,
        wardCode: showAddresses && addressFormat !== 'text' ? formData.wardCode : undefined,
        wardName: showAddresses && addressFormat !== 'text' ? formData.wardName : undefined,
      });

      setInitialData({ ...formData });
      toast.success('Đã lưu thông tin khách hàng thành công');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Có lỗi xảy ra';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thông tin khách hàng"
      subtitle="Quản lý thông tin cá nhân, sổ địa chỉ và lịch sử đơn hàng của khách hàng."
      backHref="/admin/customers"
      isLoading={isLoading}
      notFound={customerData === null}
      notFoundMessage="Không tìm thấy thông tin khách hàng yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/customers')}
          onClickSave={() => handleSubmit()}
          disableSave={isSubmitting || !formData?.name.trim() || !formData?.email.trim() || !formData?.phone.trim()}
        />
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={cn(
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer',
              activeTab === 'profile'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400',
            )}
          >
            Hồ sơ & Địa chỉ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={cn(
              'px-6 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer',
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400',
            )}
          >
            Lịch sử mua hàng ({ordersData?.length ?? 0})
          </button>
        </div>

        {activeTab === 'profile' && formData && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <AdminFormGrid>
              <AdminFormMain>
                <AdminFormCard title="Thông tin cá nhân">
                  <AdminTitleInput
                    label="Họ và tên khách hàng"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                    placeholder="Nhập họ tên khách hàng..."
                    autoFocus
                    copyLabel="họ tên"
                  />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Số điện thoại <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        required
                        placeholder="0901234567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email <span className="text-red-500">*</span></Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        required
                        placeholder="example@gmail.com"
                      />
                    </div>
                  </div>
                </AdminFormCard>

                {showAddresses && (
                  <AdminFormCard title={`Địa chỉ khách hàng (${addressFormat === 'text' ? 'Tự do' : addressFormat})`}>
                    {addressFormat === 'text' ? (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Địa chỉ chi tiết</Label>
                          <Input
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="Số nhà, tên đường, thôn xóm..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tỉnh / Thành phố</Label>
                          <Input
                            value={formData.city}
                            onChange={(e) => handleChange('city', e.target.value)}
                            placeholder="VD: Hà Nội, TP. Hồ Chí Minh..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tỉnh / Thành phố <span className="text-red-500">*</span></Label>
                            <AddressCombobox
                              options={provinceList}
                              value={formData.provinceCode}
                              onChange={handleProvinceChange}
                              placeholder="Chọn Tỉnh/Thành phố..."
                            />
                          </div>

                          {addressFormat === '3-level' && (
                            <div className="space-y-2">
                              <Label>Quận / Huyện <span className="text-red-500">*</span></Label>
                              <AddressCombobox
                                options={availableDistricts}
                                value={formData.districtCode}
                                onChange={handleDistrictChange}
                                placeholder="Chọn Quận/Huyện..."
                                disabled={!formData.provinceCode}
                              />
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label>Phường / Xã <span className="text-red-500">*</span></Label>
                            <AddressCombobox
                              options={availableWards}
                              value={formData.wardCode}
                              onChange={handleWardChange}
                              placeholder="Chọn Phường/Xã..."
                              disabled={addressFormat === '3-level' ? !formData.districtCode : !formData.provinceCode}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Số nhà, tên đường <span className="text-red-500">*</span></Label>
                            <Input
                              value={formData.addressDetail}
                              onChange={(e) => handleChange('addressDetail', e.target.value)}
                              placeholder="Số nhà, số ngõ, tên đường..."
                            />
                          </div>
                        </div>

                        {(formData.provinceCode || formData.addressDetail) && (
                          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg text-xs text-slate-500 leading-relaxed border border-slate-100 dark:border-slate-800/80">
                            <span className="font-semibold block text-slate-700 dark:text-slate-300">Xem trước địa chỉ ghép:</span>
                            {[
                              formData.addressDetail.trim(),
                              formData.wardName,
                              addressFormat === '3-level' ? formData.districtName : null,
                              formData.provinceName,
                            ].filter(Boolean).join(', ') || 'Chưa có thông tin'}
                          </div>
                        )}
                      </div>
                    )}
                  </AdminFormCard>
                )}
              </AdminFormMain>

              <AdminFormSidebar>
                <AdminFormCard title="Tổng quan tài khoản">
                  <div className="flex flex-col items-center text-center pb-2">
                    <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 mb-3 overflow-hidden">
                      {showAvatar && customerData?.avatar ? (
                        <Image src={customerData.avatar} width={80} height={80} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900/30">
                          <UserIcon className="w-10 h-10 text-purple-400" />
                        </div>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{customerData?.name ?? ''}</h3>
                    <p className="text-slate-500 text-xs mb-2">{customerData?.email ?? ''}</p>
                    <Badge variant={customerData?.status === 'Active' ? 'success' : 'secondary'}>
                      {customerData?.status === 'Active' ? 'Hoạt động' : 'Đã khóa'}
                    </Badge>

                    <div className="grid grid-cols-2 gap-3 w-full border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
                      <div>
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">{customerData?.ordersCount ?? 0}</div>
                        <div className="text-[11px] text-slate-500">Đơn hàng</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {new Intl.NumberFormat('vi-VN', { notation: 'compact' }).format(customerData?.totalSpent ?? 0)}
                        </div>
                        <div className="text-[11px] text-slate-500">Chi tiêu</div>
                      </div>
                    </div>
                  </div>
                </AdminFormCard>

                <AdminFormCard title="Trạng thái">
                  <div className="space-y-2">
                    <Label>Trạng thái</Label>
                    <AdminSelect
                      value={formData.status}
                      onChange={(val) => handleChange('status', val)}
                      options={[
                        { value: 'Active', label: 'Hoạt động' },
                        { value: 'Inactive', label: 'Bị khóa' },
                      ]}
                    />
                  </div>
                </AdminFormCard>

                {showNotes && (
                  <AdminFormCard title="Ghi chú nội bộ">
                    <div className="space-y-2">
                      <textarea
                        className="w-full min-h-[100px] rounded-md border border-slate-200 bg-white p-2.5 text-xs dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        placeholder="Ghi chú về khách hàng..."
                      />
                    </div>
                  </AdminFormCard>
                )}
              </AdminFormSidebar>
            </AdminFormGrid>
          </form>
        )}

        {activeTab === 'orders' && (
          <AdminFormCard title="Danh sách đơn hàng của khách">
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mã đơn</TableHead>
                    <TableHead>Ngày đặt</TableHead>
                    <TableHead className="text-right">Tổng tiền</TableHead>
                    <TableHead>Thanh toán</TableHead>
                    <TableHead>Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordersData?.slice((ordersPage - 1) * ORDERS_PER_PAGE, ordersPage * ORDERS_PER_PAGE).map((order) => (
                    <TableRow key={order._id}>
                      <TableCell>
                        <Link href={`/admin/orders/${order._id}/edit`} className="font-medium text-blue-600 hover:underline">
                          {order.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm">
                        {new Date(order._creationTime).toLocaleDateString('vi-VN')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {new Intl.NumberFormat('vi-VN', { currency: 'VND', style: 'currency' }).format(order.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.paymentStatus === 'Paid'
                              ? 'success'
                              : order.paymentStatus === 'Failed'
                              ? 'destructive'
                              : order.paymentStatus === 'Refunded'
                              ? 'secondary'
                              : 'warning'
                          }
                        >
                          {order.paymentStatus === 'Paid'
                            ? 'Đã thanh toán'
                            : order.paymentStatus === 'Failed'
                            ? 'Thất bại'
                            : order.paymentStatus === 'Refunded'
                            ? 'Hoàn tiền'
                            : 'Chờ thanh toán'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === 'Delivered'
                              ? 'success'
                              : order.status === 'Cancelled'
                              ? 'destructive'
                              : order.status === 'Shipped'
                              ? 'default'
                              : 'warning'
                          }
                        >
                          {order.status === 'Pending'
                            ? 'Chờ xử lý'
                            : order.status === 'Processing'
                            ? 'Đang xử lý'
                            : order.status === 'Shipped'
                            ? 'Đang giao'
                            : order.status === 'Delivered'
                            ? 'Hoàn thành'
                            : 'Đã hủy'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!ordersData || ordersData.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                        Chưa có đơn hàng nào.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {ordersData && ordersData.length > ORDERS_PER_PAGE && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Hiển thị {(ordersPage - 1) * ORDERS_PER_PAGE + 1} - {Math.min(ordersPage * ORDERS_PER_PAGE, ordersData.length)} / {ordersData.length} đơn hàng
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ordersPage === 1}
                      onClick={() => setOrdersPage((p) => p - 1)}
                      className="h-8"
                    >
                      <ChevronLeft size={14} />
                    </Button>
                    <span className="text-xs text-slate-600 dark:text-slate-400">
                      Trang {ordersPage} / {Math.ceil(ordersData.length / ORDERS_PER_PAGE)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={ordersPage >= Math.ceil(ordersData.length / ORDERS_PER_PAGE)}
                      onClick={() => setOrdersPage((p) => p + 1)}
                      className="h-8"
                    >
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </AdminFormCard>
        )}
      </div>
    </AdminFormPageWrapper>
  );
}
