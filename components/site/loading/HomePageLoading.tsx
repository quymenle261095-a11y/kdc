import React from 'react';

/**
 * HomePageLoading: Skeleton loading chuẩn quốc tế (KISS & High-Performance)
 * - Tối ưu 60fps bằng GPU hardware acceleration (opacity & transform)
 * - Không gây giật khung hình (Zero CLS - Cumulative Layout Shift)
 * - Tương thích hoàn hảo cho SEO & Next.js Streaming SSR
 */
export function HomePageLoading() {
  return (
    <div className="min-h-screen w-full bg-white dark:bg-slate-950 overflow-hidden" aria-busy="true" aria-label="Đang tải trang...">
      {/* 1. Hero Banner Skeleton */}
      <div className="relative w-full h-[55vh] min-h-[420px] max-h-[620px] bg-slate-100 dark:bg-slate-900 animate-pulse">
        <div className="container mx-auto h-full px-4 flex flex-col justify-center space-y-4 max-w-6xl">
          <div className="h-6 w-32 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-12 w-3/4 max-w-lg rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-4 w-1/2 max-w-md rounded-md bg-slate-200 dark:bg-slate-800" />
          <div className="flex gap-3 pt-4">
            <div className="h-11 w-36 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-11 w-32 rounded-lg bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>

      {/* 2. Content Grid Skeleton */}
      <div className="container mx-auto px-4 py-12 max-w-6xl space-y-12">
        {/* Section 1: Features / Categories */}
        <div className="space-y-4">
          <div className="h-8 w-48 rounded-lg bg-slate-100 dark:bg-slate-900 animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-slate-100 dark:bg-slate-900 animate-pulse p-4 flex flex-col justify-end space-y-2">
                <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Products / Cards Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-56 rounded-lg bg-slate-100 dark:bg-slate-900 animate-pulse" />
            <div className="h-4 w-20 rounded bg-slate-100 dark:bg-slate-900 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 p-4 space-y-3 animate-pulse">
                <div className="h-48 w-full rounded-xl bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                <div className="flex justify-between items-center pt-2">
                  <div className="h-6 w-24 rounded bg-slate-100 dark:bg-slate-800" />
                  <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
