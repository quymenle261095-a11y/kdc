'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Checkbox, Input, Label } from '../../../components/ui';
import {
  AdminFormCard,
  AdminFormPageWrapper,
  AdminSlugInput,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';

const MODULE_KEY = 'serviceCategories';

export default function ServiceCategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const categoryData = useQuery(api.serviceCategories.getById, { id: id as Id<"serviceCategories"> });
  const updateCategory = useMutation(api.serviceCategories.update);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  useEffect(() => {
    if (categoryData && !initialized) {
      setName(categoryData.name);
      setSlug(categoryData.slug);
      setDescription(categoryData.description ?? '');
      setActive(categoryData.active);
      setInitialized(true);
    }
  }, [categoryData, initialized]);

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
      await updateCategory({
        active,
        description: description.trim() || undefined,
        id: id as Id<"serviceCategories">,
        name: name.trim(),
        slug: slug.trim(),
      });
      toast.success('Đã cập nhật danh mục dịch vụ');
      router.push('/admin/service-categories');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật danh mục'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Sửa danh mục dịch vụ"
      subtitle="Chỉnh sửa thông tin phân loại dịch vụ."
      backHref="/admin/service-categories"
      isLoading={categoryData === undefined}
      notFound={categoryData === null}
      notFoundMessage="Không tìm thấy danh mục yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      saveLabel="Lưu thay đổi"
    >
      <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
        <AdminFormCard title="Thông tin danh mục">
          <AdminTitleInput
            label="Tên danh mục"
            value={name}
            onChange={handleNameChange}
            required
            placeholder="Ví dụ: Tư vấn, Thiết kế..."
            autoFocus
            copyLabel="tên danh mục"
          />

          <AdminSlugInput
            slug={slug}
            onChange={setSlug}
            categorySlug="services"
          />

          {enabledFields.has('description') && (
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn về danh mục..."
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
