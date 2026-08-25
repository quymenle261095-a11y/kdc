'use client';

import { AdminStickyFooter, type AdminStickyFooterProps } from '@/app/admin/components/AdminStickyFooter';

export type HomeComponentStickyFooterProps = AdminStickyFooterProps;

/**
 * @deprecated Dùng `AdminStickyFooter` từ `@/app/admin/components/AdminStickyFooter` cho tất cả các trang Admin.
 * Component này được giữ lại để tương thích ngược với các trang hiện tại.
 */
export function HomeComponentStickyFooter(props: HomeComponentStickyFooterProps) {
  return <AdminStickyFooter {...props} />;
}
