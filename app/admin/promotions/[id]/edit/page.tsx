'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Card, CardContent, CardHeader, CardTitle, Input, Label } from '../../../components/ui';
import { AdminStickyFooter } from '@/app/admin/components/AdminStickyFooter';
import { CopyableInput } from '../../../components/CopyTextButton';
import { SettingsImageUploader } from '../../../components/SettingsImageUploader';

import { useSetAdminBreadcrumb } from '@/app/admin/context/AdminBreadcrumbContext';
import {
  AdminFormPageWrapper,
} from '@/app/admin/components/FormUtilities';

const MODULE_KEY = 'promotions';

export default function PromotionEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const promotionData = useQuery(api.promotions.getById, { id: id as Id<"promotions"> });
  useSetAdminBreadcrumb(promotionData?.name);
  const updatePromotion = useMutation(api.promotions.update);
  const featuresData = useQuery(api.admin.modules.listModuleFeatures, { moduleKey: MODULE_KEY });

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [promotionType, setPromotionType] = useState<'coupon' | 'campaign' | 'flash_sale' | 'bundle' | 'loyalty'>('coupon');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed' | 'buy_x_get_y' | 'buy_a_get_b' | 'tiered' | 'free_shipping' | 'gift'>('percent');
  const [discountValue, setDiscountValue] = useState(0);
  const [discountConfigText, setDiscountConfigText] = useState('');
  const [applicableTo, setApplicableTo] = useState<'all' | 'products' | 'categories' | 'brands' | 'tags'>('all');
  const [applicableIdsText, setApplicableIdsText] = useState('');
  const [excludeIdsText, setExcludeIdsText] = useState('');
  const [minQuantity, setMinQuantity] = useState<number | undefined>();
  const [customerType, setCustomerType] = useState<'all' | 'new' | 'returning' | 'vip'>('all');
  const [customerTierIdsText, setCustomerTierIdsText] = useState('');
  const [customerGroupIdsText, setCustomerGroupIdsText] = useState('');
  const [minOrderHistory, setMinOrderHistory] = useState<number | undefined>();
  const [minTotalSpent, setMinTotalSpent] = useState<number | undefined>();
  const [minOrderAmount, setMinOrderAmount] = useState<number | undefined>();
  const [maxDiscountAmount, setMaxDiscountAmount] = useState<number | undefined>();
  const [usageLimit, setUsageLimit] = useState<number | undefined>();
  const [usagePerCustomer, setUsagePerCustomer] = useState<number | undefined>();
  const [budget, setBudget] = useState<number | undefined>();
  const [scheduleType, setScheduleType] = useState<'always' | 'dateRange' | 'recurring'>('always');
  const [recurringDaysText, setRecurringDaysText] = useState('');
  const [recurringFromTime, setRecurringFromTime] = useState('');
  const [recurringToTime, setRecurringToTime] = useState('');
  const [stackable, setStackable] = useState(true);
  const [priority, setPriority] = useState<number | undefined>();
  const [displayOnPage, setDisplayOnPage] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [maxShippingDiscount, setMaxShippingDiscount] = useState<number | undefined>();
  const [thumbnail, setThumbnail] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive' | 'Scheduled' | 'Expired'>('Active');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [, setIsSaved] = useState(true);
  const initialFormSnapshotRef = React.useRef<string>('');

  // Get enabled features from system config
  const enabledFeatures = useMemo(() => {
    const features: Record<string, boolean> = {};
    featuresData?.forEach(f => { features[f.featureKey] = f.enabled; });
    return features;
  }, [featuresData]);

  const isFeatureEnabled = (key: string, fallback = true) => enabledFeatures[key] ?? fallback;

  const parseList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

  const parseRecurringDays = (value: string) => {
    const parsed = value
      .split(',')
      .map(item => Number(item.trim()))
      .filter((item) => Number.isInteger(item));
    return parsed.length > 0 ? parsed : undefined;
  };

  const parseTimeToMinutes = (value: string) => {
    if (!value) {return undefined;}
    const [hours, minutes] = value.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {return undefined;}
    return hours * 60 + minutes;
  };

  const formatMinutesToTime = (value?: number) => {
    if (value === undefined) {return '';}
    const hours = Math.floor(value / 60).toString().padStart(2, '0');
    const minutes = (value % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const createSnapshot = (data: {
    applicableIdsText: string;
    applicableTo: string;
    budget?: number;
    code: string;
    customerGroupIdsText: string;
    customerTierIdsText: string;
    customerType: string;
    description: string;
    discountConfigText: string;
    discountType: string;
    discountValue: number;
    displayOnPage: boolean;
    endDate: string;
    featured: boolean;
    isPrivate: boolean;
    maxDiscountAmount?: number;
    maxShippingDiscount?: number;
    minOrderAmount?: number;
    minOrderHistory?: number;
    minQuantity?: number;
    minTotalSpent?: number;
    name: string;
    priority?: number;
    promotionType: string;
    recurringDaysText: string;
    recurringFromTime: string;
    recurringToTime: string;
    scheduleType: string;
    stackable: boolean;
    startDate: string;
    status: string;
    thumbnail: string;
    usageLimit?: number;
    usagePerCustomer?: number;
  }) => JSON.stringify(data);

  const currentSnapshot = useMemo(() => {
    return createSnapshot({
      applicableIdsText,
      applicableTo,
      budget,
      code,
      customerGroupIdsText,
      customerTierIdsText,
      customerType,
      description,
      discountConfigText,
      discountType,
      discountValue,
      displayOnPage,
      endDate,
      featured,
      isPrivate,
      maxDiscountAmount,
      maxShippingDiscount,
      minOrderAmount,
      minOrderHistory,
      minQuantity,
      minTotalSpent,
      name,
      priority,
      promotionType,
      recurringDaysText,
      recurringFromTime,
      recurringToTime,
      scheduleType,
      stackable,
      startDate,
      status,
      thumbnail,
      usageLimit,
      usagePerCustomer,
    });
  }, [
    applicableIdsText, applicableTo, budget, code, customerGroupIdsText, customerTierIdsText, customerType, description, discountConfigText, discountType, discountValue, displayOnPage, endDate, featured, isPrivate, maxDiscountAmount, maxShippingDiscount, minOrderAmount, minOrderHistory, minQuantity, minTotalSpent, name, priority, promotionType, recurringDaysText, recurringFromTime, recurringToTime, scheduleType, stackable, startDate, status, thumbnail, usageLimit, usagePerCustomer
  ]);

  useEffect(() => {
    if (initialFormSnapshotRef.current) {
      const isDifferent = currentSnapshot !== initialFormSnapshotRef.current;
      setIsDirty(isDifferent);
      setIsSaved(!isDifferent);
    }
  }, [currentSnapshot]);

  // Load initial promotion data
  useEffect(() => {
    if (promotionData) {
      setName(promotionData.name);
      setCode(promotionData.code ?? '');
      setDescription(promotionData.description ?? '');
      setPromotionType(promotionData.promotionType ?? (promotionData.code ? 'coupon' : 'campaign'));
      setDiscountType(promotionData.discountType);
      setDiscountValue(promotionData.discountValue ?? 0);
      setDiscountConfigText(promotionData.discountConfig ? JSON.stringify(promotionData.discountConfig, null, 2) : '');
      setApplicableTo(promotionData.applicableTo ?? 'all');
      setApplicableIdsText((promotionData.applicableIds ?? []).join(','));
      setExcludeIdsText((promotionData.excludeIds ?? []).join(','));
      setMinQuantity(promotionData.minQuantity);
      setCustomerType(promotionData.customerType ?? 'all');
      setCustomerTierIdsText((promotionData.customerTierIds ?? []).join(','));
      setCustomerGroupIdsText((promotionData.customerGroupIds ?? []).join(','));
      setMinOrderHistory(promotionData.minOrderHistory);
      setMinTotalSpent(promotionData.minTotalSpent);
      setMinOrderAmount(promotionData.minOrderAmount);
      setMaxDiscountAmount(promotionData.maxDiscountAmount);
      setMaxShippingDiscount(promotionData.maxShippingDiscount);
      setIsPrivate(promotionData.isPrivate ?? false);
      setUsageLimit(promotionData.usageLimit);
      setUsagePerCustomer(promotionData.usagePerCustomer);
      setBudget(promotionData.budget);
      setScheduleType(promotionData.scheduleType ?? 'always');
      setRecurringDaysText((promotionData.recurringDays ?? []).join(','));
      const fromTime = formatMinutesToTime(promotionData.recurringHours?.from);
      const toTime = formatMinutesToTime(promotionData.recurringHours?.to);
      setRecurringFromTime(fromTime);
      setRecurringToTime(toTime);
      setStackable(promotionData.stackable ?? true);
      setPriority(promotionData.priority);
      setDisplayOnPage(promotionData.displayOnPage ?? true);
      setFeatured(promotionData.featured ?? false);
      setThumbnail(promotionData.thumbnail ?? '');
      setStatus(promotionData.status);
      
      const startStr = promotionData.startDate ? new Date(promotionData.startDate).toISOString().slice(0, 16) : '';
      const endStr = promotionData.endDate ? new Date(promotionData.endDate).toISOString().slice(0, 16) : '';
      if (promotionData.startDate) {
        setStartDate(startStr);
      }
      if (promotionData.endDate) {
        setEndDate(endStr);
      }

      initialFormSnapshotRef.current = createSnapshot({
        applicableIdsText: (promotionData.applicableIds ?? []).join(','),
        applicableTo: promotionData.applicableTo ?? 'all',
        budget: promotionData.budget,
        code: promotionData.code ?? '',
        customerGroupIdsText: (promotionData.customerGroupIds ?? []).join(','),
        customerTierIdsText: (promotionData.customerTierIds ?? []).join(','),
        customerType: promotionData.customerType ?? 'all',
        description: promotionData.description ?? '',
        discountConfigText: promotionData.discountConfig ? JSON.stringify(promotionData.discountConfig, null, 2) : '',
        discountType: promotionData.discountType,
        discountValue: promotionData.discountValue ?? 0,
        displayOnPage: promotionData.displayOnPage ?? true,
        endDate: endStr,
        featured: promotionData.featured ?? false,
        isPrivate: promotionData.isPrivate ?? false,
        maxDiscountAmount: promotionData.maxDiscountAmount,
        maxShippingDiscount: promotionData.maxShippingDiscount,
        minOrderAmount: promotionData.minOrderAmount,
        minOrderHistory: promotionData.minOrderHistory,
        minQuantity: promotionData.minQuantity,
        minTotalSpent: promotionData.minTotalSpent,
        name: promotionData.name ?? '',
        priority: promotionData.priority,
        promotionType: promotionData.promotionType ?? (promotionData.code ? 'coupon' : 'campaign'),
        recurringDaysText: (promotionData.recurringDays ?? []).join(','),
        recurringFromTime: fromTime,
        recurringToTime: toTime,
        scheduleType: promotionData.scheduleType ?? 'always',
        stackable: promotionData.stackable ?? true,
        startDate: startStr,
        status: promotionData.status,
        thumbnail: promotionData.thumbnail ?? '',
        usageLimit: promotionData.usageLimit,
        usagePerCustomer: promotionData.usagePerCustomer,
      });
      setIsDirty(false);
      setIsSaved(true);
    }
  }, [promotionData]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.toUpperCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (promotionType === 'coupon' && !code.trim())) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    let discountConfig: Record<string, unknown> | undefined;
    if (discountConfigText.trim()) {
      try {
        discountConfig = JSON.parse(discountConfigText);
      } catch {
        toast.error('Cấu hình giảm giá không đúng định dạng JSON');
        return;
      }
    }

    const recurringDays = scheduleType === 'recurring' ? parseRecurringDays(recurringDaysText) : undefined;
    const recurringFrom = scheduleType === 'recurring' ? parseTimeToMinutes(recurringFromTime) : undefined;
    const recurringTo = scheduleType === 'recurring' ? parseTimeToMinutes(recurringToTime) : undefined;
    const recurringHours = scheduleType === 'recurring' && recurringFrom !== undefined && recurringTo !== undefined
      ? { from: recurringFrom, to: recurringTo }
      : undefined;

    setIsSubmitting(true);
    try {
      await updatePromotion({
        applicableIds: isFeatureEnabled('enableApplicable') ? parseList(applicableIdsText) : undefined,
        applicableTo: isFeatureEnabled('enableApplicable') ? applicableTo : undefined,
        budget: isFeatureEnabled('enableBudgetLimit') ? budget : undefined,
        code: promotionType === 'coupon' ? code.trim().toUpperCase() : code.trim() || undefined,
        customerGroupIds: isFeatureEnabled('enableCustomerConditions') ? parseList(customerGroupIdsText) : undefined,
        customerTierIds: isFeatureEnabled('enableCustomerConditions') ? parseList(customerTierIdsText) : undefined,
        customerType: isFeatureEnabled('enableCustomerConditions') ? customerType : undefined,
        description: description.trim() || undefined,
        discountConfig: isFeatureEnabled('enableAdvancedDiscount') ? discountConfig : undefined,
        discountType,
        discountValue: discountType === 'percent' || discountType === 'fixed' ? discountValue : undefined,
        displayOnPage: isFeatureEnabled('enableDisplay') ? displayOnPage : undefined,
        endDate: isFeatureEnabled('enableSchedule') && scheduleType !== 'always' && endDate ? new Date(endDate).getTime() : undefined,
        id: id as Id<"promotions">,
        excludeIds: isFeatureEnabled('enableApplicable') ? parseList(excludeIdsText) : undefined,
        featured: isFeatureEnabled('enableDisplay') ? featured : undefined,
        isPrivate,
        maxDiscountAmount: isFeatureEnabled('enableMaxDiscount') && discountType === 'percent' ? maxDiscountAmount : undefined,
        maxShippingDiscount: discountType === 'free_shipping' ? maxShippingDiscount : undefined,
        minOrderAmount: isFeatureEnabled('enableMinOrder') ? minOrderAmount : undefined,
        minOrderHistory: isFeatureEnabled('enableCustomerConditions') ? minOrderHistory : undefined,
        minQuantity: isFeatureEnabled('enableApplicable') ? minQuantity : undefined,
        minTotalSpent: isFeatureEnabled('enableCustomerConditions') ? minTotalSpent : undefined,
        name: name.trim(),
        priority: isFeatureEnabled('enableStacking') ? priority : undefined,
        promotionType,
        recurringDays,
        recurringHours,
        scheduleType: isFeatureEnabled('enableSchedule') ? scheduleType : undefined,
        stackable: isFeatureEnabled('enableStacking') ? stackable : undefined,
        startDate: isFeatureEnabled('enableSchedule') && scheduleType !== 'always' && startDate ? new Date(startDate).getTime() : undefined,
        status,
        thumbnail: isFeatureEnabled('enableDisplay') && thumbnail.trim() ? thumbnail.trim() : undefined,
        usageLimit: isFeatureEnabled('enableUsageLimit') ? usageLimit : undefined,
        usagePerCustomer: isFeatureEnabled('enableUsageLimit') ? usagePerCustomer : undefined,
      });
      initialFormSnapshotRef.current = currentSnapshot;
      setIsDirty(false);
      setIsSaved(true);
      toast.success('Cập nhật khuyến mãi thành công');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật khuyến mãi'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderScheduleStatusHelper = (startDateStr?: string, endDateStr?: string) => {
    if (!startDateStr && !endDateStr) {return null;}

    const now = Date.now();
    const startTs = startDateStr ? new Date(startDateStr).getTime() : undefined;
    const endTs = endDateStr ? new Date(endDateStr).getTime() : undefined;

    const formatDuration = (ms: number) => {
      const totalMinutes = Math.floor(ms / (1000 * 60));
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      const parts: string[] = [];
      if (days > 0) {parts.push(`${days} ngày`);}
      if (hours > 0) {parts.push(`${hours} giờ`);}
      if (minutes > 0 || parts.length === 0) {parts.push(`${minutes} phút`);}
      return parts.join(' ');
    };

    if (startTs && now < startTs) {
      const diff = startTs - now;
      return (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          <span className="font-semibold shrink-0">⏳ Chưa tới thời gian:</span>
          <span>Còn <strong>{formatDuration(diff)}</strong> nữa khuyến mãi mới chính thức bắt đầu.</span>
        </div>
      );
    }

    if (endTs && now > endTs) {
      const diff = now - endTs;
      return (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          <span className="font-semibold shrink-0">🔴 Đã hết hạn:</span>
          <span>Khuyến mãi đã kết thúc cách đây <strong>{formatDuration(diff)}</strong>.</span>
        </div>
      );
    }

    if (endTs && now <= endTs) {
      const diff = endTs - now;
      return (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <span className="font-semibold shrink-0">✅ Đang áp dụng:</span>
          <span>Còn <strong>{formatDuration(diff)}</strong> nữa mới hết hạn khuyến mãi.</span>
        </div>
      );
    }

    if (startTs && now >= startTs && !endTs) {
      return (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <span className="font-semibold shrink-0">✅ Đang áp dụng:</span>
          <span>Khuyến mãi đang hoạt động (không cài ngày kết thúc).</span>
        </div>
      );
    }

    return null;
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa khuyến mãi"
      subtitle={promotionData ? `Cập nhật thông tin voucher: ${promotionData.code}` : undefined}
      backHref="/admin/promotions"
      isLoading={promotionData === undefined}
      notFound={promotionData === null}
      notFoundMessage="Không tìm thấy khuyến mãi"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={isDirty}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={isDirty}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/promotions')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          disableSave={isSubmitting || !name.trim()}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Thông tin cơ bản</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Loại khuyến mãi <span className="text-red-500">*</span></Label>
                <select
                  value={promotionType}
                  onChange={(e) =>{  setPromotionType(e.target.value as typeof promotionType); }}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="coupon">Coupon nhập mã (Coupon v1)</option>
                </select>
                <p className="text-xs text-slate-500">Các loại Ưu đãi tự động, Flash sale, Combo, Loyalty hiện đang thuộc Roadmap sản phẩm.</p>
              </div>
              <div className="space-y-2">
                <Label>Tên khuyến mãi <span className="text-red-500">*</span></Label>
                <CopyableInput
                  value={name} 
                  onChange={(e) =>{  setName(e.target.value); }} 
                  copyLabel="tên khuyến mãi"
                  required 
                />
              </div>
              
              {promotionType === 'coupon' ? (
                <div className="space-y-2">
                  <Label>Mã voucher <span className="text-red-500">*</span></Label>
                  <Input 
                    value={code} 
                    onChange={handleCodeChange} 
                    required 
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-slate-500">Mã sẽ tự động chuyển thành chữ in hoa</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Mã khuyến mãi (tuỳ chọn)</Label>
                  <Input 
                    value={code} 
                    onChange={handleCodeChange} 
                    className="font-mono uppercase"
                  />
                  <p className="text-xs text-slate-500">Để trống nếu tự động áp dụng</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Mô tả</Label>
                <textarea 
                  value={description}
                  onChange={(e) =>{  setDescription(e.target.value); }}
                  className="w-full min-h-[80px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Giá trị giảm giá</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Loại giảm giá <span className="text-red-500">*</span></Label>
                <select 
                  value={discountType}
                  onChange={(e) =>{  setDiscountType(e.target.value as typeof discountType); }}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="percent">Giảm theo phần trăm (%)</option>
                  <option value="fixed">Giảm số tiền cố định (VND)</option>
                  <option value="free_shipping">Miễn phí vận chuyển (Free Ship)</option>
                </select>
              </div>

              {(discountType === 'percent' || discountType === 'fixed') && (
                <div className="space-y-2">
                  <Label>
                    Giá trị giảm <span className="text-red-500">*</span>
                    {discountType === 'percent' && <span className="text-slate-500 ml-1">(%)</span>}
                    {discountType === 'fixed' && <span className="text-slate-500 ml-1">(VND)</span>}
                  </Label>
                  <Input 
                    type="number"
                    value={discountValue} 
                    onChange={(e) =>{  setDiscountValue(Number(e.target.value)); }}
                    required
                    min={1}
                    max={discountType === 'percent' ? 100 : undefined}
                    placeholder={discountType === 'percent' ? 'VD: 10' : 'VD: 50000'}
                  />
                </div>
              )}

              {discountType === 'free_shipping' && (
                <div className="space-y-2">
                  <Label>Trần giảm phí vận chuyển tối đa (VND)</Label>
                  <Input 
                    type="number"
                    value={maxShippingDiscount ?? ''} 
                    onChange={(e) => { setMaxShippingDiscount(e.target.value ? Number(e.target.value) : undefined); }}
                    min={0}
                    placeholder="VD: 30000 (Để trống nếu miễn phí 100%)"
                  />
                  <p className="text-xs text-slate-500">Để trống để hỗ trợ 100% phí vận chuyển, hoặc nhập số tiền giảm tối đa.</p>
                </div>
              )}

              {isFeatureEnabled('enableMinOrder') && (
                <div className="space-y-2">
                  <Label>Đơn hàng tối thiểu (VND)</Label>
                  <Input 
                    type="number"
                    value={minOrderAmount ?? ''} 
                    onChange={(e) =>{  setMinOrderAmount(e.target.value ? Number(e.target.value) : undefined); }}
                    min={0}
                    placeholder="VD: 500000"
                  />
                </div>
              )}

              {isFeatureEnabled('enableMaxDiscount') && discountType === 'percent' && (
                <div className="space-y-2">
                  <Label>Giảm tối đa (VND)</Label>
                  <Input 
                    type="number"
                    value={maxDiscountAmount ?? ''} 
                    onChange={(e) =>{  setMaxDiscountAmount(e.target.value ? Number(e.target.value) : undefined); }}
                    min={0}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {isFeatureEnabled('enableApplicable') && (
            <Card>
              <CardHeader><CardTitle className="text-base">Điều kiện áp dụng</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Phạm vi áp dụng</Label>
                  <select
                    value={applicableTo}
                    onChange={(e) =>{  setApplicableTo(e.target.value as typeof applicableTo); }}
                    className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="all">Tất cả</option>
                    <option value="products">Sản phẩm</option>
                    <option value="categories">Danh mục</option>
                    <option value="brands">Thương hiệu</option>
                    <option value="tags">Tag</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>ID áp dụng (phân cách bằng dấu phẩy)</Label>
                  <Input
                    value={applicableIdsText}
                    onChange={(e) =>{  setApplicableIdsText(e.target.value); }}
                    placeholder="VD: prod_1,prod_2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ID loại trừ (phân cách bằng dấu phẩy)</Label>
                  <Input
                    value={excludeIdsText}
                    onChange={(e) =>{  setExcludeIdsText(e.target.value); }}
                    placeholder="VD: prod_3"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Số lượng tối thiểu</Label>
                  <Input
                    type="number"
                    value={minQuantity ?? ''}
                    onChange={(e) =>{  setMinQuantity(e.target.value ? Number(e.target.value) : undefined); }}
                    min={1}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {isFeatureEnabled('enableCustomerConditions') && (
            <Card>
              <CardHeader><CardTitle className="text-base">Điều kiện khách hàng</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Loại khách hàng</Label>
                  <select
                    value={customerType}
                    onChange={(e) =>{  setCustomerType(e.target.value as typeof customerType); }}
                    className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="all">Tất cả</option>
                    <option value="new">Khách mới</option>
                    <option value="returning">Khách quay lại</option>
                    <option value="vip">Khách VIP</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>ID hạng thành viên (phân cách bằng dấu phẩy)</Label>
                  <Input
                    value={customerTierIdsText}
                    onChange={(e) =>{  setCustomerTierIdsText(e.target.value); }}
                    placeholder="VD: tier_gold,tier_vip"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ID nhóm khách hàng (phân cách bằng dấu phẩy)</Label>
                  <Input
                    value={customerGroupIdsText}
                    onChange={(e) =>{  setCustomerGroupIdsText(e.target.value); }}
                    placeholder="VD: group_wholesale"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Số đơn tối thiểu</Label>
                    <Input
                      type="number"
                      value={minOrderHistory ?? ''}
                      onChange={(e) =>{  setMinOrderHistory(e.target.value ? Number(e.target.value) : undefined); }}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tổng chi tối thiểu (VND)</Label>
                    <Input
                      type="number"
                      value={minTotalSpent ?? ''}
                      onChange={(e) =>{  setMinTotalSpent(e.target.value ? Number(e.target.value) : undefined); }}
                      min={0}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isFeatureEnabled('enableSchedule') && (
            <Card>
              <CardHeader><CardTitle className="text-base">Thời gian áp dụng</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Chế độ lịch</Label>
                  <select
                    value={scheduleType}
                    onChange={(e) =>{  setScheduleType(e.target.value as typeof scheduleType); }}
                    className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="always">Luôn hoạt động</option>
                    <option value="dateRange">Theo khoảng ngày</option>
                    <option value="recurring">Lặp theo lịch</option>
                  </select>
                </div>
                {scheduleType === 'always' ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    ⚡ <strong>Chế độ luôn hoạt động:</strong> Khuyến mãi được tự động áp dụng ngay lập tức và không bị giới hạn thời gian kết thúc.
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Ngày bắt đầu</Label>
                        <Input 
                          type="datetime-local"
                          value={startDate}
                          onChange={(e) =>{  setStartDate(e.target.value); }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ngày kết thúc</Label>
                        <Input 
                          type="datetime-local"
                          value={endDate}
                          onChange={(e) =>{  setEndDate(e.target.value); }}
                        />
                      </div>
                    </div>
                    {renderScheduleStatusHelper(startDate, endDate)}
                  </>
                )}
                {scheduleType === 'recurring' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Ngày lặp (0-6, phân cách bằng dấu phẩy)</Label>
                      <Input
                        value={recurringDaysText}
                        onChange={(e) =>{  setRecurringDaysText(e.target.value); }}
                        placeholder="VD: 1,2,3,4,5"
                      />
                      <p className="text-xs text-slate-500">0: Chủ nhật, 1-6: Thứ 2-7</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Giờ bắt đầu</Label>
                        <Input
                          type="time"
                          value={recurringFromTime}
                          onChange={(e) =>{  setRecurringFromTime(e.target.value); }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Giờ kết thúc</Label>
                        <Input
                          type="time"
                          value={recurringToTime}
                          onChange={(e) =>{  setRecurringToTime(e.target.value); }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
        
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Xuất bản</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <select 
                  value={status}
                  onChange={(e) =>{  setStatus(e.target.value as 'Active' | 'Inactive' | 'Scheduled' | 'Expired'); }}
                  className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                >
                  <option value="Active">Hoạt động</option>
                  <option value="Inactive">Tạm dừng</option>
                  <option value="Scheduled">Chờ kích hoạt</option>
                  <option value="Expired">Hết hạn</option>
                </select>
              </div>

              {isFeatureEnabled('enableDisplay') && (
                <>
                  <div className="space-y-2">
                    <Label>Mã riêng tư</Label>
                    <select
                      value={isPrivate ? 'true' : 'false'}
                      onChange={(e) => setIsPrivate(e.target.value === 'true')}
                      className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    >
                      <option value="false">Công khai (Hiển thị rộng rãi)</option>
                      <option value="true">Riêng tư (Chăm sóc riêng / CSKH / KOL)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hiển thị ngoài site</Label>
                    <select
                      value={displayOnPage ? 'true' : 'false'}
                      onChange={(e) =>{  setDisplayOnPage(e.target.value === 'true'); }}
                      className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    >
                      <option value="true">Có hiển thị</option>
                      <option value="false">Không hiển thị</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nổi bật</Label>
                    <select
                      value={featured ? 'true' : 'false'}
                      onChange={(e) =>{  setFeatured(e.target.value === 'true'); }}
                      className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    >
                      <option value="false">Bình thường</option>
                      <option value="true">Nổi bật</option>
                    </select>
                  </div>
                  <SettingsImageUploader
                    label="Ảnh đại diện (Thumbnail)"
                    value={thumbnail}
                    onChange={(url) => setThumbnail(url ?? '')}
                    folder="promotions"
                    previewSize="md"
                  />
                </>
              )}

              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <strong>Đã sử dụng:</strong> {promotionData?.usedCount ?? 0} lượt
                </p>
              </div>
            </CardContent>
          </Card>

          {isFeatureEnabled('enableUsageLimit') && (
            <Card>
              <CardHeader><CardTitle className="text-base">Giới hạn sử dụng</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Số lượt sử dụng tối đa</Label>
                  <Input 
                    type="number"
                    value={usageLimit ?? ''} 
                    onChange={(e) =>{  setUsageLimit(e.target.value ? Number(e.target.value) : undefined); }}
                    min={1}
                  />
                  <p className="text-xs text-slate-500">Để trống nếu không giới hạn</p>
                </div>
                <div className="space-y-2">
                  <Label>Lượt/khách hàng</Label>
                  <Input 
                    type="number"
                    value={usagePerCustomer ?? ''} 
                    onChange={(e) =>{  setUsagePerCustomer(e.target.value ? Number(e.target.value) : undefined); }}
                    min={1}
                  />
                </div>
                {isFeatureEnabled('enableBudgetLimit') && (
                  <div className="space-y-2">
                    <Label>Ngân sách tối đa (VND)</Label>
                    <Input 
                      type="number"
                      value={budget ?? ''} 
                      onChange={(e) =>{  setBudget(e.target.value ? Number(e.target.value) : undefined); }}
                      min={0}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {isFeatureEnabled('enableStacking') && (
            <Card>
              <CardHeader><CardTitle className="text-base">Cộng dồn & ưu tiên</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Cho phép cộng dồn</Label>
                  <select
                    value={stackable ? 'true' : 'false'}
                    onChange={(e) =>{  setStackable(e.target.value === 'true'); }}
                    className="w-full h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  >
                    <option value="true">Cho phép</option>
                    <option value="false">Không cho phép</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Độ ưu tiên</Label>
                  <Input
                    type="number"
                    value={priority ?? ''}
                    onChange={(e) =>{  setPriority(e.target.value ? Number(e.target.value) : undefined); }}
                    min={0}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </form>
    </AdminFormPageWrapper>
  );
}
