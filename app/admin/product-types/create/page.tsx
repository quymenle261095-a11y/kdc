'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Button, Checkbox, Input, Label } from '../../components/ui';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormPageWrapper,
  AdminFormSidebar,
  AdminSelect,
  AdminSlugInput,
  AdminStickyFooter,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';
import { getAttributeIconComponent } from '../../attribute-groups/_lib/iconRegistry';

const MODULE_KEY = 'productTypes';

interface PriceRange {
  label: string;
  slug: string;
  minPrice?: number;
  maxPrice?: number;
}

export default function ProductTypeCreatePage() {
  const router = useRouter();
  const createType = useMutation(api.productTypes.create);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  const masterPriceRangesData = useQuery(api.settings.getValue, { key: 'global_price_ranges', defaultValue: [] });
  const updateSettings = useMutation(api.settings.set);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [attributeGroupIds, setAttributeGroupIds] = useState<Id<'attributeGroups'>[]>([]);
  const [categoryIds, setCategoryIds] = useState<Id<'productCategories'>[]>([]);
  const [priceRanges, setPriceRanges] = useState<PriceRange[]>([]);

  // Price range temporary states
  const [newRangeLabel, setNewRangeLabel] = useState('');
  const [newRangeSlug, setNewRangeSlug] = useState('');
  const [newRangeMin, setNewRangeMin] = useState('');
  const [newRangeMax, setNewRangeMax] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const attributeGroups = useQuery(api.attributeGroups.listAll, {});
  const productCategories = useQuery(api.productCategories.listAll, {});

  const masterPriceRanges = useMemo(() => {
    return (masterPriceRangesData as PriceRange[]) || [];
  }, [masterPriceRangesData]);

  const mergedPriceRanges = useMemo(() => {
    const masterMap = new Map(masterPriceRanges.map((r) => [r.slug, r]));
    const result = [...masterPriceRanges];
    priceRanges.forEach((r) => {
      if (!masterMap.has(r.slug)) {
        result.push(r);
      }
    });
    return result;
  }, [masterPriceRanges, priceRanges]);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach((f) => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleRangeLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewRangeLabel(val);
    setNewRangeSlug(generateSlugFromTitle(val));
  };

  const handleTogglePriceRange = (range: PriceRange, checked: boolean) => {
    if (checked) {
      setPriceRanges((prev) => {
        if (prev.some((r) => r.slug === range.slug)) return prev;
        return [...prev, range];
      });
    } else {
      setPriceRanges((prev) => prev.filter((r) => r.slug !== range.slug));
    }
  };

  const handleAddPriceRange = async () => {
    if (!newRangeLabel.trim() || !newRangeSlug.trim()) {
      toast.error('Vui lòng nhập tên và slug nấc giá');
      return;
    }

    if (masterPriceRanges.some((r) => r.slug === newRangeSlug)) {
      toast.error('Slug nấc giá đã tồn tại trong danh sách dùng chung');
      return;
    }

    const min = newRangeMin ? parseFloat(newRangeMin) : undefined;
    const max = newRangeMax ? parseFloat(newRangeMax) : undefined;

    if (min !== undefined && max !== undefined && min >= max) {
      toast.error('Giá tối thiểu phải nhỏ hơn giá tối đa');
      return;
    }

    const newRange: PriceRange = {
      label: newRangeLabel.trim(),
      slug: newRangeSlug.trim(),
      minPrice: min,
      maxPrice: max,
    };

    try {
      const updatedMaster = [...masterPriceRanges, newRange];
      await updateSettings({
        group: 'productTypes',
        key: 'global_price_ranges',
        value: updatedMaster,
      });

      setPriceRanges((prev) => [...prev, newRange]);
      setNewRangeLabel('');
      setNewRangeSlug('');
      setNewRangeMin('');
      setNewRangeMax('');
      toast.success('Đã thêm nấc giá vào thư viện dùng chung');
    } catch (err) {
      console.error(err);
      toast.error('Không thể cập nhật danh sách nấc giá dùng chung');
    }
  };

  const handleRemoveFromMaster = async (rangeSlug: string) => {
    try {
      const updatedMaster = masterPriceRanges.filter((r) => r.slug !== rangeSlug);
      await updateSettings({
        group: 'productTypes',
        key: 'global_price_ranges',
        value: updatedMaster,
      });

      setPriceRanges((prev) => prev.filter((r) => r.slug !== rangeSlug));
      toast.success('Đã xóa nấc giá khỏi danh sách dùng chung');
    } catch (err) {
      console.error(err);
      toast.error('Không thể xóa nấc giá');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    try {
      await createType({
        active,
        description: description.trim() || undefined,
        name: name.trim(),
        slug: slug.trim(),
        attributeGroupIds,
        categoryIds,
        priceRanges,
      });
      toast.success('Tạo kiểu sản phẩm thành công');
      router.push('/admin/product-types');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể tạo kiểu sản phẩm'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm kiểu sản phẩm"
      subtitle="Tạo kiểu sản phẩm mới, thiết lập nhóm thuộc tính và khoảng giá dùng chung."
      backHref="/admin/product-types"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Tạo kiểu sản phẩm"
          onCancel={() => router.push('/admin/product-types')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          disableSave={isSubmitting || !name.trim() || !slug.trim()}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard title="Thông tin cơ bản">
              <AdminTitleInput
                label="Tên kiểu sản phẩm"
                value={name}
                onChange={handleNameChange}
                required
                placeholder="Nhập tên kiểu (VD: Điện thoại, Laptop, Quần áo)..."
                autoFocus
                copyLabel="tên kiểu"
              />

              <AdminSlugInput
                slug={slug}
                onChange={setSlug}
              />

              {enabledFields.has('description') && (
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả ngắn về kiểu sản phẩm..."
                    className="w-full min-h-[90px] rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <AdminSelect
                  value={active ? 'active' : 'inactive'}
                  onChange={(val) => setActive(val === 'active')}
                  options={[
                    { value: 'active', label: 'Hoạt động' },
                    { value: 'inactive', label: 'Ẩn' },
                  ]}
                />
              </div>
            </AdminFormCard>

            <AdminFormCard title="Nhóm thuộc tính áp dụng">
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Chọn các nhóm thuộc tính sẽ xuất hiện trong form nhập liệu của sản phẩm thuộc kiểu này.
                </p>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-72 overflow-y-auto space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                  {attributeGroups === undefined ? (
                    <p className="text-sm text-slate-500 italic py-2 text-center">Đang tải nhóm thuộc tính...</p>
                  ) : attributeGroups.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-2 text-center">Chưa có nhóm thuộc tính nào.</p>
                  ) : (
                    attributeGroups.map((group) => {
                      const IconComponent = getAttributeIconComponent(group.iconPath);
                      const iconColor = group.displayConfig?.iconColor || group.displayConfig?.color || '#ea580c';
                      const isChecked = attributeGroupIds.includes(group._id);

                      return (
                        <label
                          key={group._id}
                          className="flex items-center gap-2.5 rounded-md p-2 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setAttributeGroupIds((prev) => [...prev, group._id]);
                              } else {
                                setAttributeGroupIds((prev) => prev.filter((id) => id !== group._id));
                              }
                            }}
                          />
                          <IconComponent size={16} style={{ color: iconColor }} />
                          <span className="text-sm font-medium">{group.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </AdminFormCard>
          </AdminFormMain>

          <AdminFormSidebar>
            <AdminFormCard title="Danh mục sản phẩm gán vào kiểu này">
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Mỗi danh mục chỉ thuộc tối đa một kiểu sản phẩm.
                </p>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 max-h-60 overflow-y-auto space-y-2 bg-slate-50/50 dark:bg-slate-900/30">
                  {productCategories === undefined ? (
                    <p className="text-sm text-slate-500 italic py-2 text-center">Đang tải danh mục...</p>
                  ) : productCategories.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-2 text-center">Chưa có danh mục sản phẩm nào.</p>
                  ) : (
                    productCategories.map((cat) => (
                      <label
                        key={cat._id}
                        className="flex items-center gap-2.5 rounded-md p-1.5 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Checkbox
                          checked={categoryIds.includes(cat._id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setCategoryIds((prev) => [...prev, cat._id]);
                            } else {
                              setCategoryIds((prev) => prev.filter((id) => id !== cat._id));
                            }
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{cat.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">/{cat.slug}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </AdminFormCard>

            <AdminFormCard title="Các nấc giá bán dùng chung">
              <div className="space-y-4">
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border border-slate-100 dark:border-slate-800 rounded-lg p-2 bg-slate-50/50 dark:bg-slate-900/20">
                  {mergedPriceRanges.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3 text-center">Chưa có nấc giá dùng chung nào.</p>
                  ) : (
                    mergedPriceRanges.map((range) => {
                      const isChecked = priceRanges.some((r) => r.slug === range.slug);
                      const isGlobal = masterPriceRanges.some((r) => r.slug === range.slug);
                      return (
                        <div
                          key={range.slug}
                          className="flex justify-between items-center p-2 border border-slate-100 dark:border-slate-800 rounded-md bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <label className="flex items-start gap-2 cursor-pointer flex-1 py-0.5">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => handleTogglePriceRange(range, Boolean(checked))}
                            />
                            <div className="space-y-0.5">
                              <div className="text-xs font-semibold">{range.label}</div>
                              <div className="text-[10px] text-slate-500">
                                {range.minPrice !== undefined && `Từ: ${range.minPrice.toLocaleString()}đ`}
                                {range.maxPrice !== undefined && ` - Đến: ${range.maxPrice.toLocaleString()}đ`}
                                {range.minPrice === undefined && range.maxPrice === undefined && 'Không giới hạn'}
                              </div>
                            </div>
                          </label>
                          {isGlobal && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromMaster(range.slug)}
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                              title="Xóa khỏi danh sách dùng chung"
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <Label className="text-xs font-semibold">Tạo nấc giá mới dùng chung</Label>
                  <div className="p-2.5 mt-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50 space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Tên nấc giá</Label>
                        <Input
                          value={newRangeLabel}
                          onChange={handleRangeLabelChange}
                          placeholder="VD: Dưới 500k"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Slug</Label>
                        <Input
                          value={newRangeSlug}
                          onChange={(e) => setNewRangeSlug(e.target.value)}
                          placeholder="duoi-500k"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Giá tối thiểu (đ)</Label>
                        <Input
                          type="number"
                          value={newRangeMin}
                          onChange={(e) => setNewRangeMin(e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Giá tối đa (đ)</Label>
                        <Input
                          type="number"
                          value={newRangeMax}
                          onChange={(e) => setNewRangeMax(e.target.value)}
                          placeholder="Không giới hạn"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddPriceRange}
                      className="w-full h-8 text-xs gap-1"
                    >
                      <Plus size={12} /> Thêm vào dùng chung
                    </Button>
                  </div>
                </div>
              </div>
            </AdminFormCard>
          </AdminFormSidebar>
        </AdminFormGrid>
      </form>
    </AdminFormPageWrapper>
  );
}
