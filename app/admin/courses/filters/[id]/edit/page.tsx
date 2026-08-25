'use client';

import React, { use, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Filter, Loader2, Plus, Edit, Trash2, LayoutGrid, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '@/app/admin/components/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/admin/components/ui';
import { SettingsImageUploader } from '@/app/admin/components/SettingsImageUploader';
import { ModuleGuard } from '@/app/admin/components/ModuleGuard';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import type { Id } from '@/convex/_generated/dataModel';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AdminFormCard,
  AdminFormPageWrapper,
  AdminSelect,
  AdminSlugInput,
  AdminStickyFooter,
  AdminTitleInput,
  generateSlugFromTitle,
  useSetAdminBreadcrumb,
} from '@/app/admin/components/FormUtilities';

interface SortableValueRowProps {
  valueItem: {
    _id: Id<'courseFilterValues'>;
    name: string;
    slug: string;
    active: boolean;
    icon?: string;
  };
  onEdit: () => void;
  onDelete: () => void;
}

function SortableValueRow({ valueItem, onEdit, onDelete }: SortableValueRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: valueItem._id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'bg-slate-100 dark:bg-slate-800 opacity-80')}
    >
      <TableCell className="w-[40px]">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-grab active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>
      </TableCell>
      <TableCell>
        {valueItem.icon ? (
          <div className="relative h-8 w-8 rounded overflow-hidden bg-slate-50 border border-slate-200">
            <Image src={valueItem.icon} alt={valueItem.name} fill className="object-contain p-0.5" />
          </div>
        ) : (
          <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
            <Filter size={14} />
          </div>
        )}
      </TableCell>
      <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{valueItem.name}</TableCell>
      <TableCell className="font-mono text-xs text-slate-500">{valueItem.slug}</TableCell>
      <TableCell>
        <Badge variant={valueItem.active ? 'success' : 'secondary'}>
          {valueItem.active ? 'Hiện' : 'Ẩn'}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} title="Sửa">
            <Edit size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50/50" onClick={onDelete} title="Xóa">
            <Trash2 size={14} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function CourseFilterEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ModuleGuard moduleKey="courses">
      <CourseFilterEditContent id={id as Id<'courseFilters'>} />
    </ModuleGuard>
  );
}

function CourseFilterEditContent({ id }: { id: Id<'courseFilters'> }) {
  const router = useRouter();
  
  // Queries & Mutations
  const filterData = useQuery(api.courseFilters.getById, { id });
  useSetAdminBreadcrumb(filterData?.name);
  const updateFilter = useMutation(api.courseFilters.update);
  
  const filterValues = useQuery(api.courseFilters.listValuesByFilter, { filterId: id });
  const createValue = useMutation(api.courseFilters.createValue);
  const updateValue = useMutation(api.courseFilters.updateValue);
  const removeValue = useMutation(api.courseFilters.removeValue);
  const reorderValues = useMutation(api.courseFilters.reorderValue);

  // Group filter states (cha)
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [active, setActive] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const initialSnapshotRef = useRef<{ name: string; slug: string; active: boolean } | null>(null);

  // Modal states for Filter Values (con)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingValueId, setEditingValueId] = useState<Id<'courseFilterValues'> | null>(null);
  const [valName, setValName] = useState('');
  const [valSlug, setValSlug] = useState('');
  const [valActive, setValActive] = useState(true);
  const [valOrder, setValOrder] = useState(0);
  const [valIcon, setValIcon] = useState('');
  const [valIconStorageId, setValIconStorageId] = useState<Id<'_storage'> | null>(null);
  const [copyToPartner, setCopyToPartner] = useState(true);
  const [isSavingValue, setIsSavingValue] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !filterValues) return;

    const oldIndex = filterValues.findIndex(item => item._id === active.id);
    const newIndex = filterValues.findIndex(item => item._id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(filterValues, oldIndex, newIndex);
    try {
      await reorderValues({ items: reordered.map((item, index) => ({ id: item._id, order: index })) });
      toast.success('Đã cập nhật thứ tự');
    } catch (error) {
      console.error(error);
      toast.error('Không thể cập nhật thứ tự');
    }
  };

  useEffect(() => {
    if (filterData && !initialized) {
      setName(filterData.name);
      setSlug(filterData.slug);
      setActive(filterData.active);

      initialSnapshotRef.current = {
        name: filterData.name.trim(),
        slug: filterData.slug.trim(),
        active: filterData.active,
      };
      setInitialized(true);
    }
  }, [filterData, initialized]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setSlug(generateSlugFromTitle(value));
  };

  const currentSnapshot = useMemo(() => ({
    name: name.trim(),
    slug: slug.trim(),
    active,
  }), [name, slug, active]);

  const hasChanges = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return JSON.stringify(initialSnapshotRef.current) !== JSON.stringify(currentSnapshot);
  }, [currentSnapshot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error('Vui lòng điền đầy đủ tên và slug');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateFilter({
        id,
        name: name.trim(),
        slug: slug.trim(),
        active,
      });
      initialSnapshotRef.current = currentSnapshot;
      toast.success('Đã cập nhật nhóm bộ lọc thành công');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu thay đổi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddValue = () => {
    setEditingValueId(null);
    setValName('');
    setValSlug('');
    setValActive(true);
    setValOrder(filterValues ? filterValues.length : 0);
    setValIcon('');
    setValIconStorageId(null);
    setCopyToPartner(true);
    setIsModalOpen(true);
  };

  const handleEditValue = (val: {
    _id: Id<'courseFilterValues'>;
    name: string;
    slug: string;
    active: boolean;
    order: number;
    icon?: string;
    iconStorageId?: Id<'_storage'> | null;
  }) => {
    setEditingValueId(val._id);
    setValName(val.name);
    setValSlug(val.slug);
    setValActive(val.active);
    setValOrder(val.order);
    setValIcon(val.icon || '');
    setValIconStorageId(val.iconStorageId || null);
    setCopyToPartner(false);
    setIsModalOpen(true);
  };

  const handleValNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValName(value);
    if (!editingValueId) {
      setValSlug(generateSlugFromTitle(value));
    }
  };

  const handleSaveValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valName.trim() || !valSlug.trim()) {
      toast.error('Vui lòng nhập tên và slug');
      return;
    }

    setIsSavingValue(true);
    try {
      if (editingValueId) {
        await updateValue({
          id: editingValueId,
          name: valName.trim(),
          slug: valSlug.trim(),
          active: valActive,
          icon: valIcon.trim() || undefined,
          iconStorageId: valIconStorageId ?? undefined,
        });
        toast.success('Đã cập nhật giá trị bộ lọc');
      } else {
        await createValue({
          filterId: id,
          name: valName.trim(),
          slug: valSlug.trim(),
          active: valActive,
          order: valOrder,
          icon: valIcon.trim() || undefined,
          iconStorageId: valIconStorageId ?? undefined,
          copyToPartner,
        });
        toast.success('Đã thêm giá trị bộ lọc mới');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lỗi khi lưu giá trị');
    } finally {
      setIsSavingValue(false);
    }
  };

  const handleDeleteValue = async (valId: Id<'courseFilterValues'>, valTitle: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa giá trị "${valTitle}" không?`)) {
      return;
    }
    try {
      await removeValue({ id: valId });
      toast.success('Đã xóa giá trị bộ lọc thành công');
    } catch {
      toast.error('Không thể xóa giá trị bộ lọc');
    }
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa bộ lọc"
      subtitle="Cập nhật thông tin và danh sách các giá trị lựa chọn của bộ lọc."
      backHref="/admin/courses/filters"
      isLoading={filterData === undefined}
      notFound={filterData === null}
      notFoundMessage="Không tìm thấy bộ lọc yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/courses/filters')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
        />
      }
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit}>
          <AdminFormCard title="Thông tin chung nhóm bộ lọc">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdminTitleInput
                label="Tên bộ lọc"
                value={name}
                onChange={handleNameChange}
                required
                placeholder="Ví dụ: Phần mềm, Cấp độ..."
                copyLabel="tên bộ lọc"
              />

              <AdminSlugInput
                slug={slug}
                onChange={setSlug}
              />
            </div>

            <div className="space-y-2 max-w-xs pt-2">
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
        </form>

        <AdminFormCard
          title={
            <div className="flex items-center gap-2">
              <LayoutGrid size={18} className="text-slate-500" />
              <span>Danh sách giá trị của bộ lọc</span>
            </div>
          }
          description="Thêm và chỉnh sửa các giá trị con (ví dụ: AutoCAD, Revit). Logo/Icon sẽ đi kèm với các giá trị này."
          extra={
            <Button
              type="button"
              size="sm"
              onClick={handleAddValue}
              className="gap-1.5 bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Plus size={14} /> Thêm giá trị
            </Button>
          }
        >
          <div className="border border-slate-100 dark:border-slate-800 rounded-md overflow-hidden">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead className="w-[80px]">Logo/Icon</TableHead>
                    <TableHead>Tên giá trị</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead className="w-[120px]">Trạng thái</TableHead>
                    <TableHead className="w-[100px] text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <SortableContext items={filterValues ? filterValues.map(item => item._id) : []} strategy={verticalListSortingStrategy}>
                  <TableBody>
                    {filterValues === undefined ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-slate-400">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                          <span className="text-xs mt-1 block">Đang tải danh sách giá trị...</span>
                        </TableCell>
                      </TableRow>
                    ) : filterValues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-slate-500 italic">
                          Chưa có giá trị bộ lọc nào. Hãy click "Thêm giá trị" để bắt đầu.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterValues.map((val) => (
                        <SortableValueRow
                          key={val._id}
                          valueItem={val}
                          onEdit={() => handleEditValue(val)}
                          onDelete={() => handleDeleteValue(val._id, val.name)}
                        />
                      ))
                    )}
                  </TableBody>
                </SortableContext>
              </Table>
            </DndContext>
          </div>
        </AdminFormCard>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-lg">
          <form onSubmit={handleSaveValue}>
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {editingValueId ? 'Chỉnh sửa giá trị bộ lọc' : 'Thêm giá trị bộ lọc mới'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <AdminTitleInput
                label="Tên giá trị"
                value={valName}
                onChange={handleValNameChange}
                required
                placeholder="Ví dụ: AutoCAD, Revit, 3DS Max..."
                autoFocus
                copyLabel="tên giá trị"
              />

              <AdminSlugInput
                slug={valSlug}
                onChange={setValSlug}
              />

              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <AdminSelect
                  value={valActive ? 'active' : 'inactive'}
                  onChange={(val) => setValActive(val === 'active')}
                  options={[
                    { value: 'active', label: 'Hiện' },
                    { value: 'inactive', label: 'Ẩn' },
                  ]}
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <Label>Logo / Icon giá trị</Label>
                <SettingsImageUploader
                  value={valIcon}
                  storageId={valIconStorageId}
                  onChange={(url, storageId) => {
                    setValIcon(url ?? '');
                    setValIconStorageId(storageId ?? null);
                  }}
                  folder="course-filter-values"
                  previewSize="sm"
                />
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSavingValue}>
                Hủy bỏ
              </Button>
              <Button type="submit" disabled={isSavingValue} className="bg-blue-600 hover:bg-blue-500 text-white">
                {isSavingValue ? (
                  <span className="flex items-center gap-1">
                    <Loader2 size={14} className="animate-spin" />
                    Đang lưu...
                  </span>
                ) : 'Lưu giá trị'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminFormPageWrapper>
  );
}
