'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Checkbox, Label } from '../../../components/ui';
import { ModuleGuard } from '../../../components/ModuleGuard';
import {
  AdminFormCard,
  AdminFormPageWrapper,
  AdminSelect,
  AdminSlugInput,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';

export default function ProjectCategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ModuleGuard moduleKey="projects">
      <ProjectCategoryEditContent params={params} />
    </ModuleGuard>
  );
}

function ProjectCategoryEditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const categoryData = useQuery(api.projectCategories.getById, { id: id as Id<'projectCategories'> });
  const categoriesData = useQuery(api.projectCategories.listAll, {});
  const updateCategory = useMutation(api.projectCategories.update);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (categoryData && !initialized) {
      setName(categoryData.name);
      setSlug(categoryData.slug);
      setDescription(categoryData.description ?? '');
      setParentId(categoryData.parentId ?? '');
      setActive(categoryData.active);
      setInitialized(true);
    }
  }, [categoryData, initialized]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setIsSubmitting(true);
    try {
      await updateCategory({
        active,
        description: description.trim() || undefined,
        id: id as Id<'projectCategories'>,
        name: name.trim(),
        parentId: parentId ? parentId as Id<'projectCategories'> : undefined,
        slug: slug.trim(),
      });
      toast.success('Đã cập nhật danh mục dự án');
      router.push('/admin/project-categories');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật danh mục dự án'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentOptions = [
    { value: '', label: 'Không có (Danh mục gốc)' },
    ...(categoriesData
      ?.filter((cat) => cat._id !== categoryData?._id)
      .map((c) => ({ value: c._id, label: c.name })) || []),
  ];

  return (
    <AdminFormPageWrapper
      title="Sửa danh mục dự án"
      subtitle="Chỉnh sửa thông tin phân loại dự án."
      backHref="/admin/project-categories"
      isLoading={categoryData === undefined}
      notFound={categoryData === null}
      notFoundMessage="Không tìm thấy danh mục dự án"
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
            placeholder="VD: Website, Branding..."
            autoFocus
            copyLabel="tên danh mục"
          />

          <AdminSlugInput
            slug={slug}
            onChange={setSlug}
            categorySlug="projects"
          />

          <div className="space-y-2">
            <Label>Danh mục cha</Label>
            <AdminSelect
              value={parentId}
              onChange={setParentId}
              options={parentOptions}
            />
          </div>

          <div className="space-y-2">
            <Label>Mô tả</Label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Mô tả ngắn về danh mục dự án..."
              className="min-h-[100px] w-full rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 leading-relaxed"
            />
          </div>

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
