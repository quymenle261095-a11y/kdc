'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from 'convex/react';
import {
  AlertTriangle,
  Briefcase,
  CalendarDays,
  CreditCard,
  FileText,
  Heart,
  Loader2,
  Mail,
  Menu as MenuIcon,
  MessageSquare,
  Package,
  Search,
  ShoppingCart,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { Card, CardContent, Input } from '@/app/admin/components/ui';
import { api } from '@/convex/_generated/api';
import { useI18n } from '../i18n/context';

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  FileText,
  Briefcase,
  CalendarDays,
  Package,
  Menu: MenuIcon,
  Heart,
  User,
  ShoppingCart,
  CreditCard,
  MessageSquare,
  Mail,
  AlertTriangle,
  Ticket,
};

export default function ExperiencesPage() {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query to optimize network requests
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // Fetch filtered experiences using Convex search query
  const experiences = useQuery(api.experiences.search, { query: debouncedQuery });

  const handleClear = () => {
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <span className="w-2.5 h-6 rounded-full bg-cyan-500 inline-block"></span>
              {t.pages.experiences}
            </h2>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cấu hình theo trải nghiệm người dùng, dễ quan sát và mở rộng.
          </p>
        </div>

        {/* Premium Search Bar */}
        <div className="relative w-full sm:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
          </div>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm trải nghiệm..."
            className="pl-9 pr-9 h-10 w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500 dark:focus-visible:border-cyan-400 transition-all rounded-lg"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid View */}
      {experiences === undefined ? (
        // Loading State
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải dữ liệu trải nghiệm...</p>
        </div>
      ) : experiences.length === 0 ? (
        // Empty Search Results State
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3">
            <Search className="h-5 w-5 text-slate-400 dark:text-slate-600" />
          </div>
          <h3 className="font-semibold text-slate-700 dark:text-slate-300">Không tìm thấy kết quả</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            Không tìm thấy trải nghiệm nào phù hợp với từ khóa &ldquo;{debouncedQuery}&rdquo;. Vui lòng thử lại bằng từ khóa khác.
          </p>
        </div>
      ) : (
        // Results Grid
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {experiences.map((exp) => {
            const Icon = iconMap[exp.icon] || FileText;
            return (
              <Link key={exp.href} href={exp.href} className="group">
                <Card className="border border-slate-200 dark:border-slate-800 hover:border-cyan-500/60 dark:hover:border-cyan-500/60 hover:shadow-sm transition-all duration-200 rounded-xl">
                  <CardContent className="p-4 flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform duration-200 shrink-0">
                      <Icon size={18} />
                    </div>
                    <div className="space-y-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                        {exp.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {exp.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
