'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { Badge, Button, Checkbox, Input, Label, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '../../../components/ui';
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

export default function PostCategoryEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const categoryData = useQuery(api.postCategories.getById, { id: id as Id<"postCategories"> });
  const postsData = useQuery(api.posts.listAll, {});
  const updateCategory = useMutation(api.postCategories.update);
  const fieldsData = useQuery(api.admin.modules.listEnabledModuleFields, { moduleKey: MODULE_KEY });
  
  const [activeTab, setActiveTab] = useState<'info' | 'posts'>('info');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabledFields = useMemo(() => {
    const fields = new Set<string>();
    fieldsData?.forEach(f => fields.add(f.fieldKey));
    return fields;
  }, [fieldsData]);

  const relatedPosts = useMemo(() => postsData?.filter(p => p.categoryId === id) ?? [], [postsData, id]);

  useEffect(() => {
    if (categoryData) {
      setName(categoryData.name);
      setSlug(categoryData.slug);
      setDescription(categoryData.description ?? '');
      setThumbnail(categoryData.thumbnail);
      setActive(categoryData.active);
    }
  }, [categoryData]);

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
        id: id as Id<"postCategories">,
        name: name.trim(),
        slug: slug.trim(),
        thumbnail,
      });
      toast.success('Đã cập nhật danh mục bài viết');
      router.push('/admin/post-categories');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật danh mục'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa danh mục bài viết"
      subtitle="Cập nhật thông tin phân loại bài viết."
      backHref="/admin/post-categories"
      isLoading={categoryData === undefined}
      notFound={categoryData === null}
      notFoundMessage="Không tìm thấy danh mục yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      saveLabel="Lưu thay đổi"
      extraHeaderAction={
        slug ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={() => window.open(`/${slug}`, '_blank')}
          >
            <ExternalLink size={13} /> Xem trên web
          </Button>
        ) : null
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={cn(
              "px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors",
              activeTab === 'info'
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            Thông tin danh mục
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('posts')}
            className={cn(
              "px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5",
              activeTab === 'posts'
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400"
            )}
          >
            Bài viết liên quan
            <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-4">
              {relatedPosts.length}
            </Badge>
          </button>
        </div>

        {activeTab === 'info' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <AdminFormGrid>
              <AdminFormMain>
                <AdminFormCard title="Thông tin danh mục">
                  <AdminTitleInput
                    label="Tên danh mục"
                    value={name}
                    onChange={handleNameChange}
                    required
                    placeholder="Ví dụ: Công nghệ, Đời sống..."
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
        ) : (
          <AdminFormCard title={`Danh sách bài viết trong danh mục (${relatedPosts.length})`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Hình ảnh</TableHead>
                  <TableHead>Tiêu đề bài viết</TableHead>
                  <TableHead className="w-32">Ngày tạo</TableHead>
                  <TableHead className="w-20 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatedPosts.map((post) => (
                  <TableRow key={post._id}>
                    <TableCell>
                      {post.thumbnail ? (
                        <Image
                          src={post.thumbnail}
                          width={48}
                          height={36}
                          className="w-12 h-9 object-cover rounded-md"
                          alt={post.title}
                        />
                      ) : (
                        <div className="w-12 h-9 bg-slate-100 dark:bg-slate-800 rounded-md" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-sm text-slate-800 dark:text-slate-200">
                      {post.title}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs font-mono">
                      {new Date(post._creationTime).toLocaleDateString('vi-VN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/posts/${post._id}/edit`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs text-blue-600">
                          Sửa
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {relatedPosts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500 text-sm">
                      Chưa có bài viết nào thuộc danh mục này.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </AdminFormCard>
        )}
      </div>
    </AdminFormPageWrapper>
  );
}
