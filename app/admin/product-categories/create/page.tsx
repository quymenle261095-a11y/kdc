'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Checkbox, Label } from '../../components/ui';
import {
  AdminFormCard,
  AdminFormPageWrapper,
  AdminSlugInput,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';

const MODULE_KEY = 'productCategories';

export default function ProductCategoryCreatePage() {
  const router = useRouter();
  const createCategory = useMutation(api.productCategories.create);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    try {
      await createCategory({
        active,
        description: description.trim() || undefined,
        name: name.trim(),
        slug: slug.trim(),
      });
      toast.success('Tạo danh mục sản phẩm thành công');
      router.push('/admin/product-categories');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể tạo danh mục'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm danh mục sản phẩm"
      subtitle="Tạo phân loại danh mục mới cho các sản phẩm."
      backHref="/admin/product-categories"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      saveLabel="Tạo danh mục"
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
        <AdminFormCard title="Thông tin danh mục">
          <AdminTitleInput
            label="Tên danh mục"
            value={name}
            onChange={handleNameChange}
            required
            placeholder="Ví dụ: Thời trang nam, Điện thoại, Phụ kiện..."
            autoFocus
            copyLabel="tên danh mục"
          />

          <AdminSlugInput
            slug={slug}
            onChange={setSlug}
            categorySlug="products"
          />

          {enabledFields.has('description') && (
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn về danh mục sản phẩm..."
                className="w-full min-h-[90px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Checkbox
              id="active"
              checked={active}
              onCheckedChange={(checked) => setActive(Boolean(checked))}
            />
            <Label htmlFor="active" className="cursor-pointer text-sm font-medium">
              Kích hoạt hiển thị danh mục
            </Label>
          </div>
        </AdminFormCard>
      </form>
    </AdminFormPageWrapper>
  );
}
