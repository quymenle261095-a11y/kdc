'use client';

import React, { use, useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Label } from '../../../components/ui';
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

const MENU_ITEMS_LIMIT = 500;

interface MenuItem {
  _id: Id<'menuItems'>;
  _creationTime: number;
  menuId: Id<'menus'>;
  label: string;
  url: string;
  order: number;
  depth: number;
  parentId?: Id<'menuItems'>;
  icon?: string;
  openInNewTab?: boolean;
  active: boolean;
}

export default function MenuEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const menuId = id as Id<'menus'>;

  const menu = useQuery(api.menus.getMenuById, { id: menuId });
  useSetAdminBreadcrumb(menu?.name);
  const menuItemsData = useQuery(api.menus.listMenuItems, menu ? { menuId: menu._id } : 'skip');

  const updateMenu = useMutation(api.menus.updateMenu);
  const createMenuItem = useMutation(api.menus.createMenuItem);
  const updateMenuItem = useMutation(api.menus.updateMenuItem);
  const removeMenuItem = useMutation(api.menus.removeMenuItem);
  const reorderMenuItems = useMutation(api.menus.reorderMenuItems);

  const [formData, setFormData] = useState({ location: 'header', name: '' });
  const [initialFormData, setInitialFormData] = useState<{ location: string; name: string } | null>(null);
  const [localItems, setLocalItems] = useState<Map<string, { label: string; url: string }>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const items = useMemo(
    () => (menuItemsData ? [...menuItemsData].sort((a, b) => a.order - b.order) : []),
    [menuItemsData],
  );
  const isAtMenuLimit = items.length >= MENU_ITEMS_LIMIT;

  useEffect(() => {
    if (menu && !initialFormData) {
      const data = { location: menu.location, name: menu.name };
      setFormData(data);
      setInitialFormData(data);
    }
  }, [menu, initialFormData]);

  const isLoading = menu === undefined;

  const hasChanges = useMemo(() => {
    if (!initialFormData) return false;
    const formChanged = formData.name !== initialFormData.name || formData.location !== initialFormData.location;
    const itemsChanged = localItems.size > 0;
    return formChanged || itemsChanged;
  }, [formData, initialFormData, localItems]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên menu');
      return;
    }

    setIsSubmitting(true);
    try {
      if (menu) {
        await updateMenu({
          id: menu._id,
          location: formData.location,
          name: formData.name.trim(),
        });
      }

      for (const [itemId, values] of localItems.entries()) {
        await updateMenuItem({
          id: itemId as Id<'menuItems'>,
          label: values.label.trim(),
          url: values.url.trim(),
        });
      }

      setLocalItems(new Map());
      setInitialFormData({ ...formData });
      toast.success('Đã lưu thay đổi menu thành công');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi lưu menu');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItem = async () => {
    if (!menu) return;
    if (isAtMenuLimit) {
      toast.error(`Menu đã đạt giới hạn tối đa ${MENU_ITEMS_LIMIT} mục`);
      return;
    }
    try {
      await createMenuItem({
        menuId: menu._id,
        label: 'Mục mới',
        url: '/',
        order: items.length,
        depth: 0,
        active: true,
      });
      toast.success('Đã thêm mục mới');
    } catch (error) {
      toast.error('Lỗi khi thêm mục');
      console.error(error);
    }
  };

  const handleDeleteItem = async (itemId: Id<'menuItems'>) => {
    if (!confirm('Bạn có chắc muốn xóa mục này?')) return;
    try {
      await removeMenuItem({ id: itemId });
      setLocalItems((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });
      toast.success('Đã xóa mục');
    } catch (error) {
      toast.error('Lỗi khi xóa');
      console.error(error);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, moved);

    try {
      await reorderMenuItems({
        items: newItems.map((item, i) => ({ id: item._id, order: i })),
      });
    } catch (error) {
      toast.error('Lỗi khi sắp xếp');
      console.error(error);
    }
  };

  const updateLocalItem = (itemId: string, field: 'label' | 'url', value: string) => {
    setLocalItems((prev) => {
      const next = new Map(prev);
      const current = next.get(itemId) || {
        label: items.find((i) => i._id === itemId)?.label || '',
        url: items.find((i) => i._id === itemId)?.url || '',
      };
      next.set(itemId, { ...current, [field]: value });
      return next;
    });
  };

  const getItemValue = (item: MenuItem, field: 'label' | 'url') => {
    const local = localItems.get(item._id);
    if (local) return local[field];
    return item[field];
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa Menu"
      subtitle="Quản lý cấu trúc phân cấp các liên kết điều hướng trên website."
      backHref="/admin/menus"
      isLoading={isLoading}
      notFound={menu === null}
      notFoundMessage="Không tìm thấy cấu hình menu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/menus')}
          onClickSave={() => handleSubmit()}
          disableSave={isSubmitting || !formData.name.trim()}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard title="Thông tin cơ bản">
              <AdminTitleInput
                label="Tên Menu"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
                placeholder="VD: Menu chính Header, Menu Footer..."
                autoFocus
                copyLabel="tên menu"
              />
            </AdminFormCard>

            <AdminFormCard
              title={`Danh sách liên kết (${items.length}/${MENU_ITEMS_LIMIT})`}
              extra={
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs font-semibold"
                  onClick={handleAddItem}
                  disabled={isAtMenuLimit}
                >
                  <Plus size={14} />
                  {isAtMenuLimit ? `Đã đạt giới hạn ${MENU_ITEMS_LIMIT}` : 'Thêm mục mới'}
                </Button>
              }
            >
              <div className="space-y-2.5">
                {items.map((item, index) => (
                  <div
                    key={item._id}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/60 dark:border-slate-700/60"
                    style={{ marginLeft: item.depth * 20 }}
                  >
                    <div className="flex flex-col gap-0.5 text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        className="hover:text-orange-600 disabled:opacity-30 p-0.5 transition-colors cursor-pointer"
                        disabled={index === 0}
                        title="Di chuyển lên"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <GripVertical size={14} className="mx-auto" />
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        className="hover:text-orange-600 disabled:opacity-30 p-0.5 transition-colors cursor-pointer"
                        disabled={index === items.length - 1}
                        title="Di chuyển xuống"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={getItemValue(item, 'label')}
                        onChange={(e) => updateLocalItem(item._id, 'label', e.target.value)}
                        className="h-9 text-sm"
                        placeholder="Tiêu đề hiển thị"
                      />
                      <Input
                        value={getItemValue(item, 'url')}
                        onChange={(e) => updateLocalItem(item._id, 'url', e.target.value)}
                        className="h-9 font-mono text-xs"
                        placeholder="/duong-dan-trang"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-9 w-9 shrink-0"
                      onClick={() => handleDeleteItem(item._id)}
                      title="Xóa mục này"
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-sm italic">
                    Chưa có mục nào trong menu này. Nhấn &quot;Thêm mục mới&quot; để bắt đầu.
                  </div>
                )}
              </div>
            </AdminFormCard>
          </AdminFormMain>

          <AdminFormSidebar>
            <AdminFormCard title="Vị trí hiển thị">
              <div className="space-y-2">
                <Label>Vị trí Menu</Label>
                <AdminSelect
                  value={formData.location}
                  onChange={(val) => setFormData((prev) => ({ ...prev, location: val }))}
                  options={[
                    { value: 'header', label: 'Header (Menu điều hướng chính)' },
                    { value: 'footer', label: 'Footer (Chân trang)' },
                    { value: 'sidebar', label: 'Sidebar (Thanh bên)' },
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
