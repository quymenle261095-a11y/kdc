'use client';

import React, { use, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { toast } from 'sonner';
import { getAdminMutationErrorMessage } from '@/app/admin/lib/mutation-error';
import { ModuleGuard } from '../../../components/ModuleGuard';
import { OptionForm, type ProductOptionFormValues } from '../../components/OptionForm';
import { useSetAdminBreadcrumb } from '@/app/admin/context/AdminBreadcrumbContext';
import {
  AdminFormPageWrapper,
} from '@/app/admin/components/FormUtilities';

type DisplayType = 'dropdown' | 'buttons' | 'radio' | 'color_swatch' | 'image_swatch' | 'color_picker' | 'number_input' | 'text_input';
type InputType = 'text' | 'number' | 'color';

export default function ProductOptionEditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ModuleGuard moduleKey="products">
      <ProductOptionEditContent params={params} />
    </ModuleGuard>
  );
}

function ProductOptionEditContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const optionData = useQuery(api.productOptions.getById, { id: id as Id<'productOptions'> });
  useSetAdminBreadcrumb(optionData?.name);
  const updateOption = useMutation(api.productOptions.update);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValues = useMemo<ProductOptionFormValues | undefined>(() => {
    if (!optionData) {return undefined;}
    return {
      active: optionData.active,
      compareUnit: optionData.compareUnit ?? '',
      displayType: optionData.displayType,
      inputType: optionData.inputType ?? '',
      name: optionData.name,
      showPriceCompare: optionData.showPriceCompare ?? false,
      slug: optionData.slug,
      unit: optionData.unit ?? '',
    };
  }, [optionData]);

  const handleSubmit = async (values: ProductOptionFormValues) => {
    if (!optionData) {return;}
    setIsSubmitting(true);
    try {
      await updateOption({
        id: optionData._id,
        active: values.active,
        compareUnit: values.compareUnit || undefined,
        displayType: values.displayType as DisplayType,
        inputType: values.inputType ? (values.inputType as InputType) : undefined,
        name: values.name,
        showPriceCompare: values.showPriceCompare || undefined,
        slug: values.slug,
        unit: values.unit || undefined,
      });
      toast.success('Đã cập nhật option');
    } catch (error) {
      toast.error(getAdminMutationErrorMessage(error, 'Không thể cập nhật option'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminFormPageWrapper
      title="Chỉnh sửa loại tùy chọn"
      subtitle={optionData ? `Cấu hình thuộc tính biến thể: ${optionData.name}` : undefined}
      backHref="/admin/product-options"
      isLoading={optionData === undefined}
      notFound={optionData === null}
      notFoundMessage="Không tìm thấy tùy chọn"
      isSubmitting={isSubmitting}
    >
      <OptionForm
        submitLabel="Lưu thay đổi"
        isSubmitting={isSubmitting}
        onCancel={() => { router.push('/admin/product-options'); }}
        onSubmit={handleSubmit}
        initialValues={initialValues}
      />
    </AdminFormPageWrapper>
  );
}
