'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Checkbox, Label } from '../../components/ui';
import { ModuleGuard } from '../../components/ModuleGuard';
import {
  AdminFormCard,
  AdminFormPageWrapper,
  AdminSelect,
  AdminSlugInput,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';

export default function ProjectCategoryCreatePage() {
  return (
    <ModuleGuard moduleKey="projects">
      <ProjectCategoryCreateContent />
    </ModuleGuard>
  );
}

function ProjectCategoryCreateContent() {
  const router = useRouter();
  const createCategory = useMutation(api.projectCategories.create);
  const categoriesData = useQuery(api.projectCategories.listAll, {});
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(generateSlugFromTitle(val));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await createCategory({
        active,
        description: description.trim() || undefined,
        name: name.trim(),
        parentId: parentId ? parentId as Id<'projectCategories'> : undefined,
        slug: slug.trim() || generateSlugFromTitle(name.trim()),
      });
      toast.success('Tạo danh mục dự án thành công');
      router.push('/admin/project-categories');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể tạo danh mục dự án'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const parentOptions = [
    { value: '', label: 'Không có (Danh mục gốc)' },
    ...(categoriesData?.map((c) => ({ value: c._id, label: c.name })) || []),
  ];

  return (
    <AdminFormPageWrapper
      title="Thêm danh mục dự án"
      subtitle="Tạo danh mục để phân loại dự án."
      backHref="/admin/project-categories"
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
            placeholder="VD: Website, Branding, Thiết kế kiến trúc..."
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
