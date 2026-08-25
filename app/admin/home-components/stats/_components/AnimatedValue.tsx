'use client';

import React from 'react';
import { useCountAnimation } from '../_hooks/useCountAnimation';

interface AnimatedValueProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string;
  enabled: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const AnimatedValue: React.FC<AnimatedValueProps> = ({
  value,
  enabled,
  className,
  style,
  children,
  ...props
}) => {
  const { displayValue, elementRef } = useCountAnimation(value, enabled);
  
  console.log('🔢 AnimatedValue render:', { 
    value, 
    enabled, 
    displayValue,
    willAnimate: enabled && value !== '0'
  });

  return (
    <span
      ref={elementRef}
      className={className}
      style={style}
      {...props}
    >
      {displayValue}
      {children}
    </span>
  );
};