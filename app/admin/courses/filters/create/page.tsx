'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { toast } from 'sonner';
import { ModuleGuard } from '../../../components/ModuleGuard';
import {
  AdminFormCard,
  AdminFormPageWrapper,
  AdminSelect,
  AdminSlugInput,
  AdminStickyFooter,
  AdminTitleInput,
  generateSlugFromTitle,
} from '@/app/admin/components/FormUtilities';
import { Label, cn } from '../../../components/ui';

export default function CourseFilterCreatePage() {
  return (
    <ModuleGuard moduleKey="courses">
      <CourseFilterCreateContent />
    </ModuleGuard>
  );
}

function CourseFilterCreateContent() {
  const router = useRouter();
  const createFilter = useMutation(api.courseFilters.create);
  const partnerFilters = useQuery(api.courseFilters.listUnmappedPartnerFilters, {});

  const [creationMode, setCreationMode] = useState<'new' | 'copy'>('new');
  const [selectedPartnerSlug, setSelectedPartnerSlug] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    setSlug(generateSlugFromTitle(value));
  };

  const handlePartnerFilterChange = (val: string) => {
    setSelectedPartnerSlug(val);
    const filter = partnerFilters?.find((f) => f.slug === val);
    if (filter) {
      setName(filter.name);
      setSlug(filter.slug);
      setActive(filter.active);
    } else {
      setName('');
      setSlug('');
    }
  };

  // Dirty state detection
  const hasChanges = useMemo(() => {
    if (creationMode === 'copy') {
      return selectedPartnerSlug !== '';
    }
    return name.trim() !== '' || slug.trim() !== '' || active !== true;
  }, [name, slug, active, creationMode, selectedPartnerSlug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error('Vui lòng điền đầy đủ tên và slug');
      return;
    }

    setIsSubmitting(true);
    try {
      await createFilter({
        active,
        name: name.trim(),
        slug: slug.trim(),
        copyValuesFromPartnerSlug: creationMode === 'copy' && selectedPartnerSlug ? selectedPartnerSlug : undefined,
      });
      toast.success('Đã thêm bộ lọc mới thành công');
      router.push('/admin/courses/filters');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể tạo bộ lọc');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Thêm bộ lọc mới"
      subtitle="Tạo nhóm bộ lọc mới cho danh sách khóa học."
      backHref="/admin/courses/filters"
      onSave={handleSubmit}
      isSubmitting={isSubmitting}
      isDirty={hasChanges}
      stickyFooter={
        <AdminStickyFooter
          mode="create"
          isSubmitting={isSubmitting}
          submitLabel="Tạo bộ lọc"
          onCancel={() => router.push('/admin/courses/filters')}
          onClickSave={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
        />
      }
    >
      <form onSubmit={handleSubmit} className="max-w-2xl">
        <AdminFormCard title="Thông tin bộ lọc">
          <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 mb-2">
            <button
              type="button"
              className={cn(
                "pb-2 text-sm font-semibold border-b-2 transition-colors",
                creationMode === 'new'
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
              onClick={() => {
                setCreationMode('new');
                setName('');
                setSlug('');
                setSelectedPartnerSlug('');
              }}
            >
              Tạo mới hoàn toàn
            </button>
            <button
              type="button"
              className={cn(
                "pb-2 text-sm font-semibold border-b-2 transition-colors",
                creationMode === 'copy'
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              )}
              onClick={() => {
                setCreationMode('copy');
                setName('');
                setSlug('');
                setSelectedPartnerSlug('');
              }}
            >
              Sao chép & Liên kết từ Tài nguyên
            </button>
          </div>

          {creationMode === 'copy' && (
            <div className="space-y-2">
              <Label>Chọn bộ lọc từ Tài nguyên <span className="text-red-500">*</span></Label>
              <AdminSelect
                value={selectedPartnerSlug}
                onChange={handlePartnerFilterChange}
                placeholder="-- Chọn bộ lọc đối tác để copy --"
                options={partnerFilters?.map((f) => ({
                  value: f.slug,
                  label: `${f.name} (${f.slug})`,
                })) || []}
              />
              {partnerFilters && partnerFilters.length === 0 && (
                <p className="text-xs text-amber-500 font-medium">Tất cả bộ lọc của Tài nguyên đã được liên kết sang.</p>
              )}
            </div>
          )}

          <AdminTitleInput
            label="Tên bộ lọc"
            value={name}
            onChange={handleNameChange}
            required
            placeholder="Ví dụ: Phần mềm, Cấp độ..."
            disabled={creationMode === 'copy'}
            autoFocus={creationMode === 'new'}
            copyLabel="tên bộ lọc"
          />

          <AdminSlugInput
            slug={slug}
            onChange={setSlug}
          />

          <div className="space-y-2">
            <Label>Trạng thái</Label>
            <AdminSelect
              value={active ? 'active' : 'inactive'}
              onChange={(val) => setActive(val === 'active')}
              disabled={creationMode === 'copy'}
              options={[
                { value: 'active', label: 'Hoạt động' },
                { value: 'inactive', label: 'Ẩn' },
              ]}
            />
          </div>

          {creationMode === 'copy' && selectedPartnerSlug && (
            <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-3 text-xs text-blue-600 dark:text-blue-400">
              Hệ thống sẽ tự động sao chép toàn bộ các giá trị con (bao gồm ảnh/icon và thứ tự) từ bộ lọc Tài nguyên sang bộ lọc mới tạo.
            </div>
          )}
        </AdminFormCard>
      </form>
    </AdminFormPageWrapper>
  );
}
