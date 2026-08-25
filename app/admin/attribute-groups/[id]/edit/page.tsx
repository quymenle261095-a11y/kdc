'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Loader2, GripVertical, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Badge, Button, Checkbox, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, cn } from '../../../components/ui';
import { IconPopoverPicker } from '../../../home-components/_shared/components/IconPopoverPicker';
import { ATTRIBUTE_ICON_OPTIONS } from '../../_lib/iconRegistry';
import { LexicalEditor } from '@/app/admin/components/LexicalEditor';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AttributeGroupPreview } from '../../_components/AttributeGroupPreview';
import { AiAttributeTermsImportDialog, type PendingAttributeTerm } from '../../_components/AiAttributeTermsImportDialog';
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

interface SortableTermRowProps {
  term: {
    _id: Id<'attributeTerms'>;
    name: string;
    slug: string;
    description?: string;
    order: number;
  };
  checked: boolean;
  onToggle: (id: Id<'attributeTerms'>) => void;
  onRemove: (id: Id<'attributeTerms'>) => void;
  onEdit: (term: { _id: Id<'attributeTerms'>; name: string; slug: string; description?: string }) => void;
  groupSlug: string;
  assignedTypeSlug: string | null;
}

function SortableTermRow({ term, checked, onToggle, onRemove, onEdit }: SortableTermRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: term._id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center justify-between p-2.5 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-sm shadow-sm transition-all',
        isDragging && 'opacity-50 border-orange-500 shadow-md',
      )}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </button>
        <Checkbox
          checked={checked}
          onCheckedChange={() => onToggle(term._id)}
        />
        <div>
          <span className="font-medium text-slate-800 dark:text-slate-200">{term.name}</span>
          <span className="text-xs text-slate-400 font-mono ml-2">({term.slug})</span>
          {term.description && (
            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{term.description.replace(/<[^>]*>?/gm, '')}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(term)}
          className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 h-7 px-2"
        >
          Sửa
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(term._id)}
          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 h-7 px-2"
        >
          Xóa
        </Button>
      </div>
    </div>
  );
}

function AttributeTermsManager({
  groupId,
  terms,
  groupSlug,
  assignedTypeSlug,
}: {
  groupId: Id<'attributeGroups'>;
  terms: { _id: Id<'attributeTerms'>; name: string; slug: string; description?: string; order: number }[] | undefined;
  groupSlug: string;
  assignedTypeSlug: string | null;
}) {
  const createTerm = useMutation(api.attributeTerms.create);
  const removeTerm = useMutation(api.attributeTerms.remove);
  const updateTerm = useMutation(api.attributeTerms.update);
  const reorderTerms = useMutation(api.attributeTerms.reorder);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTermIds, setSelectedTermIds] = useState<Id<'attributeTerms'>[]>([]);

  const [editingTerm, setEditingTerm] = useState<{ _id: Id<'attributeTerms'>; name: string; slug: string; description?: string } | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleTermNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    try {
      await createTerm({
        groupId,
        name: name.trim(),
        slug: slug.trim(),
        active: true,
        order: terms ? terms.length : 0,
      });
      setName('');
      setSlug('');
      toast.success('Đã thêm giá trị thuộc tính');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể thêm giá trị thuộc tính'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async (id: Id<'attributeTerms'>) => {
    if (!confirm('Bạn có chắc chắn muốn xóa giá trị này?')) return;
    try {
      await removeTerm({ id });
      setSelectedTermIds((prev) => prev.filter((item) => item !== id));
      toast.success('Đã xóa giá trị thuộc tính');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể xóa giá trị thuộc tính'));
    }
  };

  const handleStartEdit = (term: { _id: Id<'attributeTerms'>; name: string; slug: string; description?: string }) => {
    setEditingTerm(term);
    setEditName(term.name);
    setEditSlug(term.slug);
    setEditDescription(term.description ?? '');
  };

  const handleCloseEdit = () => {
    setEditingTerm(null);
    setEditName('');
    setEditSlug('');
    setEditDescription('');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTerm || !editName.trim() || !editSlug.trim()) return;

    setIsSavingEdit(true);
    try {
      await updateTerm({
        id: editingTerm._id,
        name: editName.trim(),
        slug: editSlug.trim(),
        description: editDescription.trim(),
      });
      toast.success('Đã cập nhật giá trị thuộc tính');
      handleCloseEdit();
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật giá trị thuộc tính'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  const toggleSelectedTerm = (id: Id<'attributeTerms'>) => {
    setSelectedTermIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleSelectAllTerms = () => {
    if (!terms) return;
    const allIds = terms.map((term) => term._id);
    setSelectedTermIds(selectedTermIds.length === allIds.length ? [] : allIds);
  };

  const handleBulkRemove = async () => {
    if (selectedTermIds.length === 0) return;
    if (!confirm(`Xóa ${selectedTermIds.length} giá trị thuộc tính đã chọn?`)) return;
    try {
      for (const id of selectedTermIds) {
        await removeTerm({ id });
      }
      setSelectedTermIds([]);
      toast.success(`Đã xóa ${selectedTermIds.length} giá trị`);
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể xóa nhiều giá trị thuộc tính'));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !terms) return;

    const oldIndex = terms.findIndex((item) => item._id === active.id);
    const newIndex = terms.findIndex((item) => item._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(terms, oldIndex, newIndex);
    try {
      await reorderTerms({ items: reordered.map((item, index) => ({ id: item._id, order: index })) });
      toast.success('Đã cập nhật thứ tự');
    } catch (error) {
      console.error(error);
      toast.error('Không thể cập nhật thứ tự');
    }
  };

  if (terms === undefined) {
    return (
      <div className="text-center py-4">
        <Loader2 className="animate-spin mx-auto text-slate-400" />
      </div>
    );
  }

  const isAllTermsSelected = terms.length > 0 && selectedTermIds.length === terms.length;

  return (
    <AdminFormCard title="Các giá trị thuộc tính (Terms)">
      <div className="space-y-4">
        <div className="flex gap-3 items-end">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Tên giá trị</Label>
            <Input
              value={name}
              onChange={handleTermNameChange}
              placeholder="VD: Đỏ, XL, 750ml..."
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="do, xl, 750ml..."
              className="font-mono h-9 text-xs"
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleCreate}
            disabled={isSubmitting || !name.trim() || !slug.trim()}
            className="h-9 gap-1 text-xs"
          >
            {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Thêm
          </Button>
        </div>

        {terms.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/50">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Checkbox
                checked={isAllTermsSelected}
                onCheckedChange={toggleSelectAllTerms}
              />
              Chọn tất cả {terms.length} giá trị
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={selectedTermIds.length === 0}
              className="text-red-500 hover:text-red-600 disabled:text-slate-400 text-xs h-7"
              onClick={handleBulkRemove}
            >
              Xóa đã chọn ({selectedTermIds.length})
            </Button>
          </div>
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={terms.map((item) => item._id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {terms.length === 0 ? (
                <p className="text-slate-500 text-xs italic py-2 text-center">Chưa có giá trị nào.</p>
              ) : (
                terms.map((term) => (
                  <SortableTermRow
                    key={term._id}
                    term={term}
                    checked={selectedTermIds.includes(term._id)}
                    onToggle={toggleSelectedTerm}
                    onRemove={handleRemove}
                    onEdit={handleStartEdit}
                    groupSlug={groupSlug}
                    assignedTypeSlug={assignedTypeSlug}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {editingTerm && (
        <Dialog open={editingTerm !== null} onOpenChange={(open) => { if (!open) handleCloseEdit(); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <DialogTitle>Chỉnh sửa giá trị: {editingTerm.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 py-4 scrollbar-thin">
                <div className="space-y-1">
                  <Label>Tên giá trị</Label>
                  <Input
                    value={editName}
                    onChange={(e) => {
                      setEditName(e.target.value);
                      setEditSlug(generateSlugFromTitle(e.target.value));
                    }}
                    required
                    placeholder="VD: Đỏ, XL..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Slug</Label>
                  <Input
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                    placeholder="do, xl..."
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold block">Mô tả (Lexical)</Label>
                  <LexicalEditor
                    key={`${editingTerm._id}:description`}
                    resetKey={`${editingTerm._id}:description`}
                    onChange={setEditDescription}
                    initialContent={editDescription}
                  />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                <Button type="button" variant="ghost" onClick={handleCloseEdit} disabled={isSavingEdit}>
                  Hủy
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                  Lưu thay đổi
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </AdminFormCard>
  );
}

export default function AttributeGroupEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const groupId = id as Id<'attributeGroups'>;

  const groupData = useQuery(api.attributeGroups.getById, { id: groupId });
  useSetAdminBreadcrumb(groupData?.name);
  const updateGroup = useMutation(api.attributeGroups.update);
  const createTerm = useMutation(api.attributeTerms.create);
  const assignedTypes = useQuery(api.attributeGroups.listAssignedProductTypes, { groupId });
  const assignedType = assignedTypes?.find((type) => type.active) ?? assignedTypes?.[0] ?? null;

  const primarySetting = useQuery(api.settings.getByKey, { key: 'site_brand_primary' });
  const secondarySetting = useQuery(api.settings.getByKey, { key: 'site_brand_secondary' });
  const enableProductTypesSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'products', settingKey: 'enableProductTypes' });
  const enableProductTypes = enableProductTypesSetting?.value === true;

  const terms = useQuery(api.attributeTerms.listByGroup, { groupId });

  const brandPrimary = (primarySetting?.value as string) || '#ea580c';
  const brandSecondary = (secondarySetting?.value as string) || '#475569';

  const colorPresets = [
    { label: 'Đen', value: '#000000', class: 'bg-black border-black text-white' },
    { label: 'Trắng', value: '#ffffff', class: 'bg-white border-slate-200 text-slate-800' },
    { label: 'Màu chính', value: brandPrimary, class: 'text-white', style: { backgroundColor: brandPrimary, borderColor: brandPrimary } },
    { label: 'Màu phụ', value: brandSecondary, class: 'text-white', style: { backgroundColor: brandSecondary, borderColor: brandSecondary } },
  ];

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [slug, setSlug] = useState('');
  const [filterType, setFilterType] = useState('single');
  const [inputType, setInputType] = useState('select');
  const [isFilterable, setIsFilterable] = useState(true);
  const [isSpecialFilter, setIsSpecialFilter] = useState(false);
  const [iconName, setIconName] = useState('Wine');
  const [iconColor, setIconColor] = useState('#ea580c');
  const [pendingImportedTerms, setPendingImportedTerms] = useState<PendingAttributeTerm[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [initialData, setInitialData] = useState<{
    name: string;
    code: string;
    slug: string;
    filterType: string;
    inputType: string;
    isFilterable: boolean;
    isSpecialFilter: boolean;
    iconName: string;
    iconColor: string;
  } | null>(null);

  useEffect(() => {
    if (groupData && !initialData) {
      const initName = groupData.name;
      const initCode = groupData.code;
      const initSlug = groupData.slug;
      const initFilter = groupData.filterType;
      const initInput = groupData.inputType;
      const initFilterable = groupData.isFilterable ?? true;
      const initSpecial = groupData.isSpecialFilter ?? false;
      const initIcon = groupData.iconPath ?? 'Wine';
      const initColor = groupData.displayConfig?.iconColor ?? groupData.displayConfig?.color ?? '#ea580c';

      setName(initName);
      setCode(initCode);
      setSlug(initSlug);
      setFilterType(initFilter);
      setInputType(initInput);
      setIsFilterable(initFilterable);
      setIsSpecialFilter(initSpecial);
      setIconName(initIcon);
      setIconColor(initColor);

      setInitialData({
        name: initName,
        code: initCode,
        slug: initSlug,
        filterType: initFilter,
        inputType: initInput,
        isFilterable: initFilterable,
        isSpecialFilter: initSpecial,
        iconName: initIcon,
        iconColor: initColor,
      });
    }
  }, [groupData, initialData]);

  const hasChanges = useMemo(() => {
    if (!initialData) return false;
    return (
      name !== initialData.name ||
      code !== initialData.code ||
      slug !== initialData.slug ||
      filterType !== initialData.filterType ||
      inputType !== initialData.inputType ||
      isFilterable !== initialData.isFilterable ||
      isSpecialFilter !== initialData.isSpecialFilter ||
      iconName !== initialData.iconName ||
      iconColor !== initialData.iconColor ||
      pendingImportedTerms.length > 0
    );
  }, [name, code, slug, filterType, inputType, isFilterable, isSpecialFilter, iconName, iconColor, pendingImportedTerms, initialData]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleApplyAiTerms = (importedTerms: PendingAttributeTerm[]) => {
    const existingSlugs = new Set([
      ...(terms?.map((term) => term.slug) ?? []),
      ...pendingImportedTerms.map((term) => term.slug),
    ]);
    const nextTerms = importedTerms.filter((term) => !existingSlugs.has(term.slug));

    if (nextTerms.length === 0) {
      toast.info('Tất cả giá trị trong import đã tồn tại trong danh sách.');
      return;
    }

    setPendingImportedTerms((prev) => [...prev, ...nextTerms]);
    toast.success(`Đã thêm ${nextTerms.length} giá trị thuộc tính mới vào danh sách chờ lưu.`);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    if (isSpecialFilter && (filterType === 'range' || inputType === 'range')) {
      toast.error('Bộ lọc đặc biệt không được phép sử dụng kiểu khoảng giá (range). Vui lòng chọn kiểu Một lựa chọn hoặc Nhiều lựa chọn.');
      return;
    }

    setIsSubmitting(true);
    try {
      const savedDisplayConfig = groupData?.displayConfig && typeof groupData.displayConfig === 'object' && !Array.isArray(groupData.displayConfig)
        ? (groupData.displayConfig as Record<string, unknown>)
        : {};
      const { range: _range, ...displayConfigWithoutRange } = savedDisplayConfig;

      await updateGroup({
        id: groupId,
        name: name.trim(),
        code: code.trim(),
        slug: slug.trim(),
        filterType,
        inputType,
        isFilterable,
        isSpecialFilter,
        iconPath: iconName,
        displayConfig: {
          ...displayConfigWithoutRange,
          iconColor,
          color: iconColor,
        },
      });

      for (let i = 0; i < pendingImportedTerms.length; i++) {
        const term = pendingImportedTerms[i];
        await createTerm({
          groupId,
          name: term.name,
          slug: term.slug,
          description: term.description,
          active: true,
          order: (terms?.length ?? 0) + i,
        });
      }

      setPendingImportedTerms([]);
      setInitialData({
        name: name.trim(),
        code: code.trim(),
        slug: slug.trim(),
        filterType,
        inputType,
        isFilterable,
        isSpecialFilter,
        iconName,
        iconColor,
      });

      toast.success('Cập nhật nhóm thuộc tính thành công');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật nhóm thuộc tính'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewTerms = useMemo(() => [
    ...(terms ?? []),
    ...pendingImportedTerms.map((term, index) => ({
      _id: `pending-${term.slug}` as Id<'attributeTerms'>,
      name: term.name,
      slug: term.slug,
      order: (terms?.length ?? 0) + index,
    })),
  ], [terms, pendingImportedTerms]);

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa nhóm thuộc tính"
      subtitle="Quản lý cấu hình thuộc tính sản phẩm, kiểu lọc, icon và danh sách các terms."
      backHref="/admin/attribute-groups"
      isLoading={groupData === undefined}
      notFound={groupData === null}
      notFoundMessage="Không tìm thấy nhóm thuộc tính yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/attribute-groups')}
          onClickSave={() => handleSubmit()}
          onViewWeb={() => {
            const baseSlug = assignedType?.slug || 'products';
            window.open(`/${baseSlug}/${slug}`, '_blank');
          }}
          disableViewWeb={!slug.trim()}
          aiImportNode={
            filterType !== 'range' ? (
              <AiAttributeTermsImportDialog
                groupName={name}
                filterType={filterType}
                inputType={inputType}
                onApply={handleApplyAiTerms}
              />
            ) : undefined
          }
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard title="Thông tin nhóm thuộc tính">
              <AdminTitleInput
                label="Tên nhóm thuộc tính"
                value={name}
                onChange={handleNameChange}
                required
                placeholder="VD: Dung tích, Giống nho, Thương hiệu..."
                autoFocus
                copyLabel="tên nhóm thuộc tính"
              />

              <AdminSlugInput
                slug={slug}
                onChange={setSlug}
              />

              <div className="space-y-2">
                <Label>Mã nhóm (Code) <span className="text-red-500">*</span></Label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="VD: volume, grape, brand..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Kiểu lọc (Filter type)</Label>
                  <AdminSelect
                    value={filterType}
                    onChange={setFilterType}
                    options={[
                      { value: 'single', label: 'Một lựa chọn (Single)' },
                      { value: 'multiple', label: 'Nhiều lựa chọn (Multiple)' },
                      { value: 'range', label: 'Khoảng giá trị (Range)' },
                    ]}
                  />
                </div>

                {filterType !== 'range' && (
                  <div className="space-y-2">
                    <Label>Kiểu hiển thị (Input type)</Label>
                    <AdminSelect
                      value={inputType}
                      onChange={setInputType}
                      options={[
                        { value: 'select', label: 'Dropdown (Select)' },
                        { value: 'buttons', label: 'Các nút bấm (Buttons)' },
                        { value: 'radio', label: 'Nút tròn (Radio)' },
                      ]}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isFilterable"
                    checked={isFilterable}
                    onCheckedChange={(checked) => setIsFilterable(Boolean(checked))}
                  />
                  <Label htmlFor="isFilterable" className="cursor-pointer font-medium">
                    Hiển thị nhóm này trong bộ lọc sản phẩm (Filter)
                  </Label>
                </div>

                {enableProductTypes && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isSpecialFilter"
                      checked={isSpecialFilter}
                      onCheckedChange={(checked) => setIsSpecialFilter(Boolean(checked))}
                    />
                    <Label htmlFor="isSpecialFilter" className="cursor-pointer font-medium">
                      Đánh dấu là bộ lọc đặc biệt
                    </Label>
                  </div>
                )}
              </div>
            </AdminFormCard>

            <AdminFormCard title="Icon & Màu sắc nhận diện">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Icon đại diện</Label>
                  <IconPopoverPicker
                    value={iconName}
                    onChange={setIconName}
                    options={ATTRIBUTE_ICON_OPTIONS}
                    brandColor={iconColor}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Màu sắc icon</Label>
                  <div className="flex gap-2 flex-wrap mb-2">
                    {colorPresets.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setIconColor(p.value)}
                        style={p.style}
                        className={`px-3 py-1 rounded text-xs font-medium border transition-all ${p.class} ${iconColor === p.value ? 'ring-2 ring-orange-500 scale-105 shadow-sm' : 'opacity-80 hover:opacity-100'}`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="color"
                      value={iconColor}
                      onChange={(e) => setIconColor(e.target.value)}
                      className="w-12 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={iconColor}
                      onChange={(e) => setIconColor(e.target.value)}
                      placeholder="#ea580c"
                      className="font-mono text-sm uppercase flex-1"
                    />
                  </div>
                </div>
              </div>
            </AdminFormCard>

            <AttributeTermsManager
              groupId={groupId}
              terms={terms}
              groupSlug={slug}
              assignedTypeSlug={assignedType?.slug || null}
            />
          </AdminFormMain>

          <AdminFormSidebar>
            <AdminFormCard title="Xem trước giao diện bộ lọc">
              <AttributeGroupPreview
                name={name}
                filterType={filterType}
                inputType={inputType}
                iconName={iconName}
                iconColor={iconColor}
                terms={previewTerms}
              />
            </AdminFormCard>

            <AdminFormCard title="Kiểu sản phẩm đang dùng nhóm này">
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Nhóm thuộc tính chỉ tạo route SEO khi được gán vào ít nhất một kiểu sản phẩm.
                </p>

                {assignedTypes === undefined ? (
                  <p className="text-xs text-slate-500 italic py-2">Đang tải...</p>
                ) : assignedTypes.length === 0 ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    Chưa được gán vào kiểu sản phẩm nào.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {assignedTypes.map((type) => (
                      <Link
                        key={type._id}
                        href={`/admin/product-types/${type._id}/edit`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-orange-300 hover:text-orange-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"
                      >
                        {type.name}
                        {!type.active && <Badge variant="secondary" className="text-[10px]">Ẩn</Badge>}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </AdminFormCard>
          </AdminFormSidebar>
        </AdminFormGrid>
      </form>
    </AdminFormPageWrapper>
  );
}
