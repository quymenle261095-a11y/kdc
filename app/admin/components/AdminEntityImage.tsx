'use client';

import React, { useState } from 'react';
import { AdminImage as Image } from '@/app/admin/components/AdminImage';
import { Image as ImageIcon } from 'lucide-react';
import { cn } from './ui';
import { isValidImageSrc } from '@/lib/utils/image';

export type AdminEntityImageVariant = 'post' | 'service' | 'product' | 'course' | 'project' | 'resource' | 'default';

export type AdminEntityImageProps = {
  alt: string;
  className?: string;
  height?: number;
  src?: string | null;
  variant?: AdminEntityImageVariant;
  width?: number;
};

export function AdminEntityImage({ alt, className, height = 36, src, width = 36 }: AdminEntityImageProps) {
  const [hasError, setHasError] = useState(false);
  const isValid = isValidImageSrc(src);

  return (
    <div className={cn('relative shrink-0 overflow-hidden rounded-md border border-slate-200/60 bg-slate-100 dark:border-slate-700/60 dark:bg-slate-800/80 flex items-center justify-center', className)}>
      {isValid && !hasError ? (
        <Image
          src={src as string}
          width={width}
          height={height}
          className="h-full w-full object-cover"
          alt={alt}
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-slate-400 dark:text-slate-500">
          <ImageIcon size={15} strokeWidth={1.75} />
        </div>
      )}
    </div>
  );
}

