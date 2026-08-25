'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { FileText, Package } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Input, Label } from '../../components/ui';
import { ModuleGuard } from '../../components/ModuleGuard';
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

export default function CreateCommentPage() {
  return (
    <ModuleGuard moduleKey="comments" requiredModules={['posts', 'products']} requiredModulesType="any">
      <CreateCommentContent />
    </ModuleGuard>
  );
}

function CreateCommentContent() {
  const router = useRouter();
  const postsData = useQuery(api.posts.listAll, {});
  const productsData = useQuery(api.products.listAll, {});
  const createComment = useMutation(api.comments.create);

  const [formData, setFormData] = useState({
    authorEmail: '',
    authorName: '',
    content: '',
    rating: '' as '' | number,
    status: 'Pending' as 'Pending' | 'Approved' | 'Spam',
    targetId: '',
    targetType: 'post' as 'post' | 'product',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLoading = postsData === undefined || productsData === undefined;

  const targets = useMemo(() => {
    if (formData.targetType === 'post') {
      return postsData?.map((p) => ({ id: p._id, name: p.title })) ?? [];
    }
    return productsData?.map((p) => ({ id: p._id, name: p.name })) ?? [];
  }, [formData.targetType, postsData, productsData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.authorName.trim() || !formData.content.trim() || !formData.targetId) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment({
        authorEmail: formData.authorEmail.trim() || undefined,
        authorName: formData.authorName.trim(),
        content: formData.content.trim(),
        rating: formData.rating === '' ? undefined : formData.rating,
        status: formData.status,
        targetId: formData.targetId,
        targetType: formData.targetType,
      });
      toast.success('Đã tạo bình luận thành công!');
      router.push('/admin/comments');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi tạo bình luận');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm bình luận mới"
      subtitle="Tạo bình luận và đánh giá thủ công cho bài viết hoặc sản phẩm."
      backHref="/admin/comments"
      isLoading={isLoading}
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      stickyFooter={
        <AdminStickyFooter
          isSubmitting={isSubmitting}
          submitLabel="Tạo bình luận"
          onCancel={() => router.push('/admin/comments')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
          disableSave={isSubmitting || !formData.authorName.trim() || !formData.content.trim() || !formData.targetId}
        />
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <AdminFormGrid>
          <AdminFormMain>
            <AdminFormCard title="Thông tin người bình luận">
              <AdminTitleInput
                label="Tên người bình luận"
                value={formData.authorName}
                onChange={(e) => setFormData({ ...formData, authorName: e.target.value })}
                required
                placeholder="Nhập họ tên người đánh giá/bình luận..."
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nội dung chi tiết <span className="text-red-500">*</span></Label>
                  <textarea
                    className="w-full min-h-[140px] rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Nhập nội dung nhận xét hoặc bình luận..."
                    required
                  />
                </div>
              </div>
            </AdminFormCard>
          </AdminFormMain>

          <AdminFormSidebar>
            <AdminFormCard title="Đối tượng nhận bình luận">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Loại đối tượng</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={formData.targetType === 'post' ? 'default' : 'outline'}
                      className="gap-2 h-9 text-xs"
                      onClick={() => setFormData({ ...formData, targetType: 'post', targetId: '' })}
                    >
                      <FileText size={14} /> Bài viết
                    </Button>
                    <Button
                      type="button"
                      variant={formData.targetType === 'product' ? 'default' : 'outline'}
                      className="gap-2 h-9 text-xs"
                      onClick={() => setFormData({ ...formData, targetType: 'product', targetId: '' })}
                    >
                      <Package size={14} /> Sản phẩm
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>
                    Chọn {formData.targetType === 'post' ? 'bài viết' : 'sản phẩm'} <span className="text-red-500">*</span>
                  </Label>
                  <AdminSelect
                    value={formData.targetId}
                    onChange={(val) => setFormData({ ...formData, targetId: val })}
                    placeholder={`-- Chọn ${formData.targetType === 'post' ? 'bài viết' : 'sản phẩm'} --`}
                    options={targets.map((t) => ({ value: t.id, label: t.name }))}
                  />
                </div>

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
              </div>
            </AdminFormCard>

            <AdminFormCard title="Trạng thái kiểm duyệt">
              <div className="space-y-2">
                <Label>Trạng thái</Label>
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
            </AdminFormCard>
          </AdminFormSidebar>
        </AdminFormGrid>
      </form>
    </AdminFormPageWrapper>
  );
}
