'use client';

import React from 'react';
import { cn } from '../../../components/ui';

type EditablePreviewTextProps<T extends React.ElementType = 'span'> = {
  active: boolean;
  value?: string;
  fallback?: string;
  as?: T;
  className?: string;
  style?: React.CSSProperties;
  onChange?: (value: string) => void;
  stopPropagation?: boolean;
} & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className' | 'contentEditable' | 'onBlur' | 'onChange' | 'style'>;

export function EditablePreviewText<T extends React.ElementType = 'span'>({
  active,
  value,
  fallback = '',
  as,
  className,
  style,
  onChange,
  stopPropagation = true,
  ...props
}: EditablePreviewTextProps<T>) {
  const Element = as ?? 'span';
  const displayValue = value?.trim() ? value : fallback;
  const stop = active && stopPropagation
    ? (event: React.SyntheticEvent) => { event.stopPropagation(); }
    : undefined;

  return (
    <Element
      {...props}
      contentEditable={active}
      suppressContentEditableWarning={active}
      onClick={stop}
      onMouseDown={stop}
      onKeyDown={stop}
      onBlur={active ? (event: React.FocusEvent<HTMLElement>) => {
        const nextValue = event.currentTarget.textContent?.trim() ?? '';
        if (nextValue !== (value ?? '')) {
          onChange?.(nextValue);
        }
      } : undefined}
      className={cn(
        className,
        active && 'outline-dashed outline-1 outline-blue-500 hover:bg-blue-50/50 cursor-text select-text',
      )}
      style={style}
    >
      {displayValue}
    </Element>
  );
}
