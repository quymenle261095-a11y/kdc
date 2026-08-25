'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, cn } from '@/app/admin/components/ui';
import { TagInput } from '@/app/admin/components/TagInput';

export type SeoFormTab = 'content' | 'advanced';
export type SeoFaqItem = { question: string; answer: string };

export const normalizeSeoStringList = (items: string[], limit = 20) => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of items) {
    const value = item.trim();
    const key = value.toLocaleLowerCase('vi-VN');
    if (!value || seen.has(key)) {continue;}
    seen.add(key);
    normalized.push(value);
    if (normalized.length >= limit) {break;}
  }

  return normalized;
};

export const normalizeSeoFaqItems = (items: SeoFaqItem[], limit = 10) => items
  .map((item) => ({
    answer: item.answer.trim(),
    question: item.question.trim(),
  }))
  .filter((item) => item.question && item.answer)
  .slice(0, limit);

const parseCsv = (value: string) => normalizeSeoStringList(value.split(','), 20);

export function SeoFormTabs({
  activeTab,
  onChange,
}: {
  activeTab: SeoFormTab;
  onChange: (tab: SeoFormTab) => void;
}) {
  const tabs: Array<{ key: SeoFormTab; label: string }> = [
    { key: 'content', label: 'Nội dung' },
    { key: 'advanced', label: 'Nâng cao' },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-700">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
            activeTab === tab.key
              ? 'border-blue-500 text-slate-900 dark:text-slate-100'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function AdvancedSeoFields({
  faqItems,
  focusKeyword,
  onFaqItemsChange,
  onFocusKeywordChange,
  onRelatedQueriesChange,
  onTagsChange,
  relatedQueries,
  showFaqItems = true,
  showFocusKeyword = true,
  showRelatedQueries = true,
  showTags = true,
  tags,
}: {
  faqItems: SeoFaqItem[];
  focusKeyword: string;
  onFaqItemsChange: (items: SeoFaqItem[]) => void;
  onFocusKeywordChange: (value: string) => void;
  onRelatedQueriesChange: (items: string[]) => void;
  onTagsChange: (items: string[]) => void;
  relatedQueries: string[];
  showFaqItems?: boolean;
  showFocusKeyword?: boolean;
  showRelatedQueries?: boolean;
  showTags?: boolean;
  tags: string[];
}) {
  if (!showFaqItems && !showFocusKeyword && !showRelatedQueries && !showTags) {
    return null;
  }

  const updateFaqItem = (index: number, field: keyof SeoFaqItem, value: string) => {
    const nextItems = faqItems.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    ));
    onFaqItemsChange(nextItems);
  };

  const removeFaqItem = (index: number) => {
    onFaqItemsChange(faqItems.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">SEO nâng cao</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {showFocusKeyword && (
          <div className="space-y-2">
            <Label>Từ khóa chính</Label>
            <Input
              value={focusKeyword}
              onChange={(event) => onFocusKeywordChange(event.target.value)}
              placeholder="Ví dụ: thiết lập dịch vụ spa"
            />
            <p className="text-xs text-slate-500">Dùng làm trọng tâm để AI viết title, heading, nội dung và meta nhất quán.</p>
          </div>
        )}

        {showTags && (
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              value={tags.join(', ')}
              onChange={(value) => onTagsChange(parseCsv(value))}
              placeholder="Nhập tag rồi Enter..."
            />
            <p className="text-xs text-slate-500">Tags nên là cụm ngắn, tự nhiên và có thể hiển thị ở trang public.</p>
          </div>
        )}

        {showRelatedQueries && (
          <div className="space-y-2">
            <Label>Cách khách hay tìm</Label>
            <TagInput
              value={relatedQueries.join(', ')}
              onChange={(value) => onRelatedQueriesChange(parseCsv(value))}
              placeholder="Ví dụ: tạo dịch vụ spa mới, setup dịch vụ spa..."
            />
            <p className="text-xs text-slate-500">Các biến thể truy vấn giúp AI phủ đúng ngữ cảnh Google Search, không dùng để nhồi keyword.</p>
          </div>
        )}

        {showFaqItems && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label>FAQ</Label>
                <p className="mt-1 text-xs text-slate-500">Câu hỏi thường gặp có thể dùng cho nội dung và FAQ schema.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onFaqItemsChange([...faqItems, { answer: '', question: '' }])}
                className="gap-2"
              >
                <Plus size={14} />
                Thêm FAQ
              </Button>
            </div>

            {faqItems.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
                Chưa có FAQ nào.
              </div>
            ) : (
              <div className="space-y-3">
                {faqItems.map((item, index) => (
                  <div key={index} className="rounded-md border border-slate-200 p-4 space-y-3 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">FAQ {index + 1}</div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFaqItem(index)}
                        className="gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                        Xóa
                      </Button>
                    </div>
                    <Input
                      value={item.question}
                      onChange={(event) => updateFaqItem(index, 'question', event.target.value)}
                      placeholder="Câu hỏi"
                    />
                    <textarea
                      value={item.answer}
                      onChange={(event) => updateFaqItem(index, 'answer', event.target.value)}
                      placeholder="Câu trả lời"
                      className="w-full min-h-[90px] rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
