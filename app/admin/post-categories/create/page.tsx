'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Input, Label } from '../../components/ui';
import {
  AdminFormCard,
  AdminFormGrid,
  AdminFormMain,
  AdminFormPageWrapper,
  AdminFormSidebar,
  AdminSlugInput,
  AdminThumbnailSidebarCard,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';

const MODULE_KEY = 'postCategories';

export default function PostCategoryCreatePage() {
  const router = useRouter();
  const createCategory = useMutation(api.postCategories.create);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<string | undefined>();
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
        active: true,
        description: description.trim() || undefined,
        name: name.trim(),
        slug: slug.trim(),
        thumbnail,
      });
      toast.success('Đã tạo danh mục bài viết');
      router.push('/admin/post-categories');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể tạo danh mục'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm danh mục bài viết"
      subtitle="Tạo phân loại mới cho bài viết và tin tức trên website."
      backHref="/admin/post-categories"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      saveLabel="Tạo danh mục"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard title="Thông tin danh mục">
              <AdminTitleInput
                label="Tên danh mục"
                value={name}
                onChange={handleNameChange}
                required
                placeholder="Ví dụ: Tin tức, Đời sống, Công nghệ..."
                autoFocus
                copyLabel="tên danh mục"
              />

              <AdminSlugInput
                slug={slug}
                onChange={setSlug}
                categorySlug="posts"
              />

              {enabledFields.has('description') && (
                <div className="space-y-2">
                  <Label>Mô tả</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Mô tả ngắn về danh mục bài viết..."
                  />
                </div>
              )}
            </AdminFormCard>
          </AdminFormMain>

          <AdminFormSidebar>
            {enabledFields.has('thumbnail') && (
              <AdminThumbnailSidebarCard
                thumbnail={thumbnail}
                onThumbnailChange={(url) => setThumbnail(url)}
                folder="post-categories"
                entitySlug={slug}
                aspectRatio="video"
              />
            )}
          </AdminFormSidebar>
        </AdminFormGrid>
      </form>
    </AdminFormPageWrapper>
  );
}
