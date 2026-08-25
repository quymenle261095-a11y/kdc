'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Input, Label } from '../../components/ui';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormSidebar,
  AdminSelect,
  AdminSlugInput,
  AdminStickyFooter,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';

export type ProductOptionFormValues = {
  active: boolean;
  compareUnit: string;
  displayType: string;
  inputType: string;
  name: string;
  showPriceCompare: boolean;
  slug: string;
  unit: string;
};

interface OptionFormProps {
  initialValues?: ProductOptionFormValues;
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: (values: ProductOptionFormValues) => Promise<void>;
  submitLabel: string;
  title?: string;
  autoSlug?: boolean;
}

const DISPLAY_TYPE_OPTIONS = [
  { label: 'Dropdown (Danh sách thả xuống)', value: 'dropdown' },
  { label: 'Buttons/Pills (Nút bấm chọn)', value: 'buttons' },
  { label: 'Radio (Nút tròn đơn chọn)', value: 'radio' },
  { label: 'Color Swatch (Ô màu sắc)', value: 'color_swatch' },
  { label: 'Image Swatch (Ô ảnh mẫu)', value: 'image_swatch' },
  { label: 'Color Picker (Bộ chọn mã màu)', value: 'color_picker' },
  { label: 'Number Input (Ô nhập số lượng)', value: 'number_input' },
  { label: 'Text Input (Ô nhập văn bản tự do)', value: 'text_input' },
];

const INPUT_TYPE_OPTIONS = [
  { label: 'Text (Chuỗi ký tự)', value: 'text' },
  { label: 'Number (Số nguyên/thực)', value: 'number' },
  { label: 'Color (Mã màu HEX)', value: 'color' },
];

const buildDefaults = (): ProductOptionFormValues => ({
  active: true,
  compareUnit: '',
  displayType: 'dropdown',
  inputType: '',
  name: '',
  showPriceCompare: false,
  slug: '',
  unit: '',
});

export function OptionForm({
  initialValues,
  isSubmitting,
  onCancel,
  onSubmit,
  submitLabel,
  autoSlug = false,
}: OptionFormProps) {
  const [form, setForm] = useState<ProductOptionFormValues>(buildDefaults());
  const [initialForm, setInitialForm] = useState<ProductOptionFormValues | null>(null);

  useEffect(() => {
    if (initialValues) {
      const merged = { ...buildDefaults(), ...initialValues };
      setForm(merged);
      setInitialForm(merged);
    }
  }, [initialValues]);

  const hasChanges = useMemo(() => {
    if (!initialForm) return true;
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  const inputTypeOptions = useMemo(() => {
    if (form.displayType === 'color_picker') {
      return INPUT_TYPE_OPTIONS.filter((option) => option.value === 'color');
    }
    return INPUT_TYPE_OPTIONS.filter((option) => option.value !== 'color');
  }, [form.displayType]);

  const requiresInputType = ['number_input', 'text_input', 'color_picker'].includes(form.displayType);
  const showUnit = form.displayType === 'number_input';
  const showPriceCompare = form.displayType === 'radio';

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: autoSlug && (!initialForm || prev.slug === initialForm.slug) ? generateSlugFromTitle(value) : prev.slug,
    }));
  };

  const handleDisplayTypeChange = (value: string) => {
    setForm((prev) => {
      let nextInputType = prev.inputType;
      if (value === 'number_input') nextInputType = 'number';
      if (value === 'text_input') nextInputType = 'text';
      if (value === 'color_picker') nextInputType = 'color';
      if (!['number_input', 'text_input', 'color_picker'].includes(value)) nextInputType = '';

      return {
        ...prev,
        compareUnit: value === 'radio' ? prev.compareUnit : '',
        inputType: nextInputType,
        showPriceCompare: value === 'radio' ? prev.showPriceCompare : false,
        unit: value === 'number_input' ? prev.unit : '',
        displayType: value,
      };
    });
  };

  const handleSubmit = async (event?: React.FormEvent) => {
    if (event) event.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return;
    await onSubmit({
      ...form,
      name: form.name.trim(),
      slug: form.slug.trim(),
      compareUnit: form.compareUnit.trim(),
      unit: form.unit.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AdminFormGrid>
        <AdminFormMain>
          <AdminFormCard title="Thông tin loại tùy chọn">
            <AdminTitleInput
              label="Tên tùy chọn"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="VD: Màu sắc, Dung lượng, Size áo..."
              autoFocus
              copyLabel="tên option"
            />

            <AdminSlugInput
              slug={form.slug}
              onChange={(val) => setForm((prev) => ({ ...prev, slug: val }))}
              categorySlug="product-options"
            />
          </AdminFormCard>

          <AdminFormCard title="Cấu hình hiển thị & dữ liệu">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Kiểu hiển thị trên trang sản phẩm</Label>
                <AdminSelect
                  value={form.displayType}
                  onChange={handleDisplayTypeChange}
                  options={DISPLAY_TYPE_OPTIONS}
                />
              </div>

              {requiresInputType && (
                <div className="space-y-2">
                  <Label>Kiểu dữ liệu nhập vào</Label>
                  <AdminSelect
                    value={form.inputType || inputTypeOptions[0]?.value}
                    onChange={(val) => setForm((prev) => ({ ...prev, inputType: val }))}
                    options={inputTypeOptions}
                  />
                </div>
              )}

              {showUnit && (
                <div className="space-y-2">
                  <Label>Đơn vị đo lường</Label>
                  <Input
                    value={form.unit}
                    onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
                    placeholder="VD: kg, ml, cm..."
                  />
                </div>
              )}

              {showPriceCompare && (
                <div className="space-y-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      id="showPriceCompare"
                      checked={form.showPriceCompare}
                      onChange={(e) => setForm((prev) => ({ ...prev, showPriceCompare: e.target.checked }))}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showPriceCompare" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                      Hiển thị giá quy đổi so sánh
                    </label>
                  </div>
                  {form.showPriceCompare && (
                    <div className="space-y-1.5 pl-6">
                      <Label className="text-xs">Đơn vị so sánh</Label>
                      <Input
                        value={form.compareUnit}
                        onChange={(e) => setForm((prev) => ({ ...prev, compareUnit: e.target.value }))}
                        placeholder="VD: tháng, ngày, 100g..."
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </AdminFormCard>
        </AdminFormMain>

        <AdminFormSidebar>
          <AdminFormCard title="Trạng thái">
            <div className="space-y-2">
              <Label>Trạng thái hoạt động</Label>
              <AdminSelect
                value={form.active ? 'active' : 'inactive'}
                onChange={(val) => setForm((prev) => ({ ...prev, active: val === 'active' }))}
                options={[
                  { value: 'active', label: 'Hoạt động' },
                  { value: 'inactive', label: 'Ẩn tạm thời' },
                ]}
              />
            </div>
          </AdminFormCard>
        </AdminFormSidebar>
      </AdminFormGrid>

      <AdminStickyFooter
        isSubmitting={isSubmitting}
        hasChanges={hasChanges}
        submitLabel={submitLabel}
        onCancel={onCancel}
        onClickSave={() => handleSubmit()}
        disableSave={isSubmitting || !form.name.trim() || !form.slug.trim()}
      />
    </form>
  );
}
