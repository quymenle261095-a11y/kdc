'use client';

import React from 'react';
import Image, { type ImageProps } from 'next/image';

type AdminImageProps = ImageProps & {
  alt?: string;
  unoptimized?: boolean;
  fallback?: React.ReactNode;
};

export function AdminImage({ alt = '', unoptimized = true, fallback = null, onError, ...props }: AdminImageProps) {
  const [hasError, setHasError] = React.useState(false);
  const { src, ...imageProps } = props;

  React.useEffect(() => {
    setHasError(false);
  }, [src]);

  if (hasError) {
    return fallback;
  }

  if (typeof src === 'string') {
    const normalizedSrc = src.trim();

    if (
      !normalizedSrc
      || (!normalizedSrc.startsWith('/')
        && !normalizedSrc.startsWith('http://')
        && !normalizedSrc.startsWith('https://')
        && !normalizedSrc.startsWith('data:image/'))
    ) {
      return null;
    }

    return (
      <Image
        alt={alt}
        unoptimized={unoptimized}
        src={normalizedSrc}
        onError={(event) => {
          onError?.(event);
          setHasError(true);
        }}
        {...imageProps}
      />
    );
  }

  if (!src) {
    return null;
  }

  return (
    <Image
      alt={alt}
      unoptimized={unoptimized}
      src={src}
      onError={(event) => {
        onError?.(event);
        setHasError(true);
      }}
      {...imageProps}
    />
  );
}
