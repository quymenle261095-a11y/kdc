'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import type { Id } from '@/convex/_generated/dataModel';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, cn } from '../components/ui';

type MenuItem = {
  _id: Id<'menuItems'>;
  label: string;
  url: string;
  order: number;
  depth: number;
  active: boolean;
};

export function SimpleMenuPreview({ items }: { items: MenuItem[] }) {
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye size={16} /> Preview Menu
          </CardTitle>
          <Link href="/system/experiences/menu" className="text-sm text-orange-600 hover:underline">
            Cấu hình header →
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {sortedItems.length === 0 ? (
          <div className="text-sm text-slate-500">Chưa có menu items.</div>
        ) : (
          sortedItems.map((item) => (
            <div
              key={item._id}
              className={cn('flex items-center gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm', !item.active && 'opacity-50')}
              style={{ marginLeft: item.depth * 16 }}
            >
              <span className="font-medium text-slate-800">{item.label}</span>
              <span className="text-xs text-slate-400 truncate">{item.url}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
