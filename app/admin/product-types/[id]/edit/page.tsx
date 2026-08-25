'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Button, Checkbox, Input, Label, cn } from '../../../components/ui';
import { getAttributeIconComponent } from '../../../attribute-groups/_lib/iconRegistry';
import { useSetAdminBreadcrumb } from '@/app/admin/context/AdminBreadcrumbContext';
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

const MODULE_KEY = 'productTypes';

interface PriceRange {
  label: string;
  slug: string;
  minPrice?: number;
  maxPrice?: number;
}

type AttributeGroupItem = {
  _id: Id<'attributeGroups'>;
  name: string;
  code: string;
  iconPath?: string;
  displayConfig?: {
    iconColor?: string;
    color?: string;
  };
};

function SortableAssignedGroupRow({
  group,
  index,
  onRemove,
}: {
  group: AttributeGroupItem;
  index: number;
  onRemove: (id: Id<'attributeGroups'>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group._id });
  const IconComponent = getAttributeIconComponent(group.iconPath);
  const iconColor = group.displayConfig?.iconColor || group.displayConfig?.color || '#ea580c';
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'grid grid-cols-[32px_32px_1fr_auto] items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-sm shadow-sm dark:bg-slate-950',
        isDragging ? 'border-orange-300 shadow-md opacity-90' : 'border-slate-200 dark:border-slate-800',
      )}
    >
      <button
        type="button"
        className="flex h-7 w-7 cursor-grab items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-orange-600 active:cursor-grabbing dark:hover:bg-slate-800"
        {...attributes}
        {...listeners}
        aria-label={`Kéo thả ${group.name}`}
      >
        <GripVertical size={15} />
      </button>
      <Checkbox
        checked
        onCheckedChange={() => onRemove(group._id)}
        aria-label={`Bỏ gán ${group.name}`}
      />
      <div className="min-w-0 flex items-center gap-2">
        <IconComponent size={15} style={{ color: iconColor }} className="shrink-0" />
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-800 dark:text-slate-100">{group.name}</div>
          <div className="truncate font-mono text-[11px] text-slate-400">{group.code}</div>
        </div>
      </div>
      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
        #{index + 1}
      </span>
    </div>
  );
}

function AssignedAttributeGroupsManager({
  groups,
  selectedIds,
  onChange,
}: {
  groups: AttributeGroupItem[] | undefined;
  selectedIds: Id<'attributeGroups'>[];
  onChange: (ids: Id<'attributeGroups'>[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const groupMap = useMemo(() => new Map((groups ?? []).map((group) => [group._id, group])), [groups]);
  const selectedGroups = selectedIds
    .map((groupId) => groupMap.get(groupId))
    .filter((group): group is AttributeGroupItem => Boolean(group));
  const selectedSet = new Set(selectedIds);
  const unselectedGroups = (groups ?? []).filter((group) => !selectedSet.has(group._id));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = selectedIds.findIndex((groupId) => groupId === active.id);
    const newIndex = selectedIds.findIndex((groupId) => groupId === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(selectedIds, oldIndex, newIndex));
  };

  if (groups === undefined) {
    return <p className="text-sm text-slate-500 italic py-2 text-center">Đang tải...</p>;
  }

  if (groups.length === 0) {
    return <p className="text-sm text-slate-500 italic py-2 text-center">Chưa có nhóm thuộc tính nào.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đã chọn & sắp xếp</p>
          <span className="text-[11px] text-slate-400">{selectedGroups.length} nhóm</span>
        </div>
        {selectedGroups.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-400">
            Chưa có nhóm nào được chọn. Chọn ở danh sách bên dưới.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={selectedIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                {selectedGroups.map((group, index) => (
                  <SortableAssignedGroupRow
                    key={group._id}
                    group={group}
                    index={index}
                    onRemove={(removeId) => onChange(selectedIds.filter((id) => id !== removeId))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {unselectedGroups.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nhóm khả dụng (chưa gán)</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {unselectedGroups.map((group) => {
              const IconComponent = getAttributeIconComponent(group.iconPath);
              const iconColor = group.displayConfig?.iconColor || group.displayConfig?.color || '#ea580c';
              return (
                <label
                  key={group._id}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-1.5 text-xs hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/40 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => onChange([...selectedIds, group._id])}
                  />
                  <IconComponent size={14} style={{ color: iconColor }} />
                  <span className="font-medium text-slate-700 dark:text-slate-200">{group.name}</span>
                  <span className="font-mono text-[10px] text-slate-400">({group.code})</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductTypeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const productTypeId = id as Id<'productTypes'>;

  const typeData = useQuery(api.productTypes.getById, { id: productTypeId });
  useSetAdminBreadcrumb(typeData?.name);
  const updateType = useMutation(api.productTypes.update);
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

  const [newRangeLabel, setNewRangeLabel] = useState('');
  const [newRangeSlug, setNewRangeSlug] = useState('');
  const [newRangeMin, setNewRangeMin] = useState('');
  const [newRangeMax, setNewRangeMax] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialData, setInitialData] = useState<{
    name: string;
    slug: string;
    description: string;
    active: boolean;
    attributeGroupIds: Id<'attributeGroups'>[];
    categoryIds: Id<'productCategories'>[];
    priceRanges: PriceRange[];
  } | null>(null);

  const attributeGroups = useQuery(api.attributeGroups.listAll, {});
  const productCategories = useQuery(api.productCategories.listAll, {});
  const assignedGroupsData = useQuery(api.productTypes.listAssignedGroups, { typeId: productTypeId });
  const assignedCategoriesData = useQuery(api.productTypes.listAssignedCategories, { typeId: productTypeId });

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

  useEffect(() => {
    if (typeData && assignedGroupsData && assignedCategoriesData && !initialData) {
      const initialGroups = assignedGroupsData.map((g) => g._id);
      const initialCats = assignedCategoriesData.map((c) => c._id);
      const initialRanges = typeData.priceRanges ?? [];

      setName(typeData.name);
      setSlug(typeData.slug);
      setDescription(typeData.description ?? '');
      setActive(typeData.active);
      setAttributeGroupIds(initialGroups);
      setCategoryIds(initialCats);
      setPriceRanges(initialRanges);

      setInitialData({
        name: typeData.name,
        slug: typeData.slug,
        description: typeData.description ?? '',
        active: typeData.active,
        attributeGroupIds: initialGroups,
        categoryIds: initialCats,
        priceRanges: initialRanges,
      });
    }
  }, [typeData, assignedGroupsData, assignedCategoriesData, initialData]);

  const hasChanges = useMemo(() => {
    if (!initialData) return false;

    const isGroupsChanged = JSON.stringify(attributeGroupIds) !== JSON.stringify(initialData.attributeGroupIds);
    const isCatsChanged = JSON.stringify([...categoryIds].sort()) !== JSON.stringify([...initialData.categoryIds].sort());
    const isRangesChanged = JSON.stringify([...priceRanges].sort((a, b) => a.slug.localeCompare(b.slug))) !== JSON.stringify([...initialData.priceRanges].sort((a, b) => a.slug.localeCompare(b.slug)));

    return name !== initialData.name
      || slug !== initialData.slug
      || description !== initialData.description
      || active !== initialData.active
      || isGroupsChanged
      || isCatsChanged
      || isRangesChanged;
  }, [name, slug, description, active, attributeGroupIds, categoryIds, priceRanges, initialData]);

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
      toast.success('Đã thêm nấc giá mới dùng chung');
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    try {
      await updateType({
        active,
        description: description.trim() || undefined,
        id: productTypeId,
        name: name.trim(),
        slug: slug.trim(),
        attributeGroupIds,
        categoryIds,
        priceRanges,
      });
      setInitialData({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        active,
        attributeGroupIds,
        categoryIds,
        priceRanges,
      });
      toast.success('Cập nhật kiểu sản phẩm thành công');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật kiểu sản phẩm'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa kiểu sản phẩm"
      subtitle="Quản lý cấu hình thuộc tính, danh mục gán và các nấc giá bán dùng chung."
      backHref="/admin/product-types"
      isLoading={typeData === undefined}
      notFound={typeData === null}
      notFoundMessage="Không tìm thấy kiểu sản phẩm yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/product-types')}
          onClickSave={() => handleSubmit()}
          onViewWeb={slug ? () => window.open(`/${slug}`, '_blank') : undefined}
          disableViewWeb={!slug.trim()}
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
                placeholder="Nhập tên kiểu..."
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

            <AdminFormCard title="Quản lý thứ tự nhóm thuộc tính">
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Kéo thả để sắp xếp thứ tự hiển thị của các nhóm thuộc tính trong form sản phẩm.
                </p>
                <AssignedAttributeGroupsManager
                  groups={attributeGroups as AttributeGroupItem[] | undefined}
                  selectedIds={attributeGroupIds}
                  onChange={setAttributeGroupIds}
                />
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
