'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { FileText, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Input, Label } from '../../../components/ui';
import { ModuleGuard } from '../../../components/ModuleGuard';
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

interface FormData {
  authorEmail: string;
  authorName: string;
  content: string;
  rating: '' | number;
  status: 'Pending' | 'Approved' | 'Spam';
}

export default function EditCommentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ModuleGuard moduleKey="comments" requiredModules={['posts', 'products']} requiredModulesType="any">
      <EditCommentContent id={id as Id<'comments'>} />
    </ModuleGuard>
  );
}

function EditCommentContent({ id }: { id: Id<'comments'> }) {
  const router = useRouter();

  const commentData = useQuery(api.comments.getById, { id });
  useSetAdminBreadcrumb(commentData ? `Bình luận của ${commentData.authorName}` : undefined);
  const postsData = useQuery(api.posts.listAll, {});
  const productsData = useQuery(api.products.listAll, {});
  const updateComment = useMutation(api.comments.update);

  const [formData, setFormData] = useState<FormData | null>(null);
  const [initialData, setInitialData] = useState<FormData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = commentData === undefined || postsData === undefined || productsData === undefined;

  useEffect(() => {
    if (commentData && !initialData) {
      const data: FormData = {
        authorEmail: commentData.authorEmail ?? '',
        authorName: commentData.authorName,
        content: commentData.content,
        rating: commentData.rating ?? '',
        status: commentData.status,
      };
      setFormData(data);
      setInitialData(data);
    }
  }, [commentData, initialData]);

  const targetName = useMemo(() => {
    if (!commentData) return '';
    if (commentData.targetType === 'post') {
      return postsData?.find((p) => p._id === commentData.targetId)?.title ?? 'Bài viết không tồn tại';
    }
    return productsData?.find((p) => p._id === commentData.targetId)?.name ?? 'Sản phẩm không tồn tại';
  }, [commentData, postsData, productsData]);

  const hasChanges = useMemo(() => {
    if (!formData || !initialData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialData);
  }, [formData, initialData]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData) return;

    if (!formData.authorName.trim() || !formData.content.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateComment({
        authorEmail: formData.authorEmail.trim() || undefined,
        authorName: formData.authorName.trim(),
        content: formData.content.trim(),
        id,
        rating: formData.rating === '' ? undefined : formData.rating,
        status: formData.status,
      });
      setInitialData({ ...formData });
      toast.success('Đã cập nhật bình luận thành công!');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi cập nhật bình luận');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa bình luận"
      subtitle="Quản lý và kiểm duyệt nội dung phản hồi, đánh giá từ khách hàng."
      backHref="/admin/comments"
      isLoading={isLoading}
      notFound={commentData === null}
      notFoundMessage="Không tìm thấy thông tin bình luận yêu cầu"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          submitLabel="Lưu thay đổi"
          onCancel={() => router.push('/admin/comments')}
          onClickSave={() => handleSubmit()}
          disableSave={isSubmitting || !formData?.authorName.trim() || !formData?.content.trim()}
        />
      }
    >
      {formData && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <AdminFormGrid>
            <AdminFormMain>
              <AdminFormCard title="Thông tin người bình luận">
                <AdminTitleInput
                  label="Tên người bình luận"
                  value={formData.authorName}
                  onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                  required
                  placeholder="Nhập họ tên..."
                  autoFocus
                  copyLabel="tên người bình luận"
                />

                <div className="space-y-2">
                  <Label>Email liên hệ</Label>
                  <Input
                    type="email"
                    value={formData.authorEmail}
                    onChange={(e) => setFormData({ ...formData, authorEmail: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </AdminFormCard>

              <AdminFormCard title="Nội dung bình luận">
                <div className="space-y-2">
                  <Label>Nội dung chi tiết <span className="text-red-500">*</span></Label>
                  <textarea
                    className="w-full min-h-[140px] rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Nhập nội dung bình luận..."
                    required
                  />
                </div>
              </AdminFormCard>
            </AdminFormMain>

            <AdminFormSidebar>
              <AdminFormCard title="Đối tượng được bình luận">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={commentData?.targetType === 'post' ? 'secondary' : 'outline'} className="gap-1">
                      {commentData?.targetType === 'post' ? <FileText size={12} /> : <Package size={12} />}
                      {commentData?.targetType === 'post' ? 'Bài viết' : 'Sản phẩm'}
                    </Badge>
                  </div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 leading-snug">{targetName}</p>
                  <p className="text-xs text-slate-400">
                    Thời gian gửi: {commentData ? new Date(commentData._creationTime).toLocaleString('vi-VN') : ''}
                  </p>
                </div>
              </AdminFormCard>

              <AdminFormCard title="Đánh giá & Trạng thái">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Đánh giá số sao (Rating)</Label>
                    <AdminSelect
                      value={formData.rating === '' ? '' : String(formData.rating)}
                      onChange={(val) => setFormData({ ...formData, rating: val === '' ? '' : Number(val) })}
                      options={[
                        { value: '', label: 'Không đánh giá' },
                        { value: '5', label: '⭐⭐⭐⭐⭐ (5 sao - Rất tốt)' },
                        { value: '4', label: '⭐⭐⭐⭐ (4 sao - Tốt)' },
                        { value: '3', label: '⭐⭐⭐ (3 sao - Trung bình)' },
                        { value: '2', label: '⭐⭐ (2 sao - Tệ)' },
                        { value: '1', label: '⭐ (1 sao - Rất tệ)' },
                      ]}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Trạng thái kiểm duyệt</Label>
                    <AdminSelect
                      value={formData.status}
                      onChange={(val) => setFormData({ ...formData, status: val as 'Pending' | 'Approved' | 'Spam' })}
                      options={[
                        { value: 'Approved', label: 'Đã duyệt (Hiển thị)' },
                        { value: 'Pending', label: 'Chờ duyệt' },
                        { value: 'Spam', label: 'Spam (Ẩn)' },
                      ]}
                    />
                  </div>
                </div>
              </AdminFormCard>
            </AdminFormSidebar>
          </AdminFormGrid>
        </form>
      )}
    </AdminFormPageWrapper>
  );
}
