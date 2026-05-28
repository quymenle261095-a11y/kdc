'use client';

/**
 * RangeSlider – Dual-thumb slider dựa trên Radix UI Slider primitive.
 *
 * Tại sao dùng Radix?
 * - Radix dùng một element duy nhất (không chồng 2 <input>), xử lý pointer
 *   capture đúng chuẩn → thumb không bao giờ bị "ẩn" khi kéo.
 * - Built-in keyboard navigation, ARIA, accessibility.
 * - Shadcn/ui, Vercel, Linear, Notion đều wrap Radix Slider.
 */

import * as SliderPrimitive from '@radix-ui/react-slider';
import { X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface RangeSliderProps {
  /** Giá trị min của toàn bộ dải */
  minLimit: number;
  /** Giá trị max của toàn bộ dải */
  maxLimit: number;
  /** Giá trị min hiện tại đang chọn */
  valueMin: number;
  /** Giá trị max hiện tại đang chọn */
  valueMax: number;
  /** Bước nhảy */
  step?: number;
  /** Màu chủ đạo (hex/rgb/hsl) */
  primaryColor: string;
  /** Màu track chưa chọn */
  trackColor?: string;
  /** Màu thumb border */
  thumbBorderColor?: string;
  /** Callback khi người dùng đang kéo (real-time) */
  onValueChange?: (min: number, max: number) => void;
  /** Callback khi thả tay (commit filter) */
  onValueCommit?: (min: number, max: number) => void;
  /** Đơn vị hiển thị (%, %, °C…) */
  unit?: string;
}

export function RangeSlider({
  minLimit,
  maxLimit,
  valueMin,
  valueMax,
  step = 1,
  primaryColor,
  trackColor = '#e2e8f0',
  thumbBorderColor = '#ffffff',
  onValueChange,
  onValueCommit,
  unit = '',
}: RangeSliderProps) {
  // Local state để hiển thị real-time mà không gây navigate
  const [localValues, setLocalValues] = useState<[number, number]>([valueMin, valueMax]);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync khi props thay đổi từ bên ngoài (URL change)
  const prevExternalRef = useRef<[number, number]>([valueMin, valueMax]);
  useEffect(() => {
    const [prevMin, prevMax] = prevExternalRef.current;
    if (prevMin !== valueMin || prevMax !== valueMax) {
      prevExternalRef.current = [valueMin, valueMax];
      setLocalValues([valueMin, valueMax]);
    }
  }, [valueMin, valueMax]);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleChange = useCallback(
    (values: number[]) => {
      const [min, max] = values as [number, number];
      setLocalValues([min, max]);
      onValueChange?.(min, max);

      // Debounce: hẹn giờ 500ms để trigger commit
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        onValueCommit?.(min, max);
      }, 500);
    },
    [onValueChange, onValueCommit]
  );

  const handleCommit = useCallback(
    (values: number[]) => {
      const [min, max] = values as [number, number];
      // Hủy timer đang chờ vì đã commit trực tiếp
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setLocalValues([min, max]);
      onValueCommit?.(min, max);
    },
    [onValueCommit]
  );

  const handleReset = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setLocalValues([minLimit, maxLimit]);
    onValueCommit?.(minLimit, maxLimit);
  }, [minLimit, maxLimit, onValueCommit]);

  const [min, max] = localValues;

  return (
    <div className="space-y-4 py-1 select-none">
      {/* Badge hiển thị dải đang chọn */}
      <div className="flex items-center justify-between text-sm font-medium">
        <span style={{ color: '#64748b' }}>Dải chọn:</span>
        <div className="flex items-center gap-1.5">
          <span
            className="px-2.5 py-0.5 rounded-md font-mono text-sm tabular-nums"
            style={{ backgroundColor: primaryColor, color: '#fff' }}
          >
            {min}{unit} – {max}{unit}
          </span>
          {(min !== minLimit || max !== maxLimit) && (
            <button
              type="button"
              onClick={handleReset}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-slate-600 flex items-center justify-center"
              title="Đặt lại khoảng lọc"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Radix Slider */}
      <SliderPrimitive.Root
        className="relative flex items-center w-full touch-none"
        min={minLimit}
        max={maxLimit}
        step={step}
        value={localValues}
        onValueChange={handleChange}
        onValueCommit={handleCommit}
        minStepsBetweenThumbs={0}
        style={{ height: 20 }}
      >
        {/* Track nền */}
        <SliderPrimitive.Track
          className="relative w-full rounded-full overflow-hidden"
          style={{ height: 6, backgroundColor: trackColor }}
        >
          {/* Vùng đã chọn */}
          <SliderPrimitive.Range
            className="absolute h-full rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
        </SliderPrimitive.Track>

        {/* Thumb MIN */}
        <SliderPrimitive.Thumb
          className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 relative after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-11 after:h-11 after:rounded-full"
          style={{
            width: 18,
            height: 18,
            backgroundColor: primaryColor,
            border: `2.5px solid ${thumbBorderColor}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            cursor: 'grab',
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          }}
          aria-label="Giá trị nhỏ nhất"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)';
            (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px rgba(0,0,0,0.35)`;
            (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
          }}
          onPointerUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.25)';
            (e.currentTarget as HTMLElement).style.cursor = 'grab';
          }}
        />

        {/* Thumb MAX */}
        <SliderPrimitive.Thumb
          className="block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 relative after:content-[''] after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:w-11 after:h-11 after:rounded-full"
          style={{
            width: 18,
            height: 18,
            backgroundColor: primaryColor,
            border: `2.5px solid ${thumbBorderColor}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
            cursor: 'grab',
            transition: 'transform 0.1s ease, box-shadow 0.1s ease',
          }}
          aria-label="Giá trị lớn nhất"
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1.2)';
            (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px rgba(0,0,0,0.35)`;
            (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
          }}
          onPointerUp={(e) => {
            (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.25)';
            (e.currentTarget as HTMLElement).style.cursor = 'grab';
          }}
        />
      </SliderPrimitive.Root>

      {/* Min / Max limit labels */}
      <div className="flex justify-between text-xs font-mono" style={{ color: '#94a3b8' }}>
        <span>{minLimit}{unit}</span>
        <span>{maxLimit}{unit}</span>
      </div>
    </div>
  );
}
