'use client';

import React from 'react';

export type PublicPostFaqItem = { question: string; answer: string };

export const normalizePublicPostFaqItems = (items?: PublicPostFaqItem[]) => (items ?? [])
  .map((item) => ({
    answer: item.answer.trim(),
    question: item.question.trim(),
  }))
  .filter((item) => item.question && item.answer);

export function PostFaqSection({
  brandColor,
  items,
}: {
  brandColor: string;
  items: PublicPostFaqItem[];
}) {
  if (items.length === 0) {return null;}

  return (
    <section className="mx-auto max-w-4xl px-4 pb-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-5">
          <div className="text-sm font-semibold" style={{ color: brandColor }}>FAQ</div>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-zinc-50">Câu hỏi thường gặp</h2>
        </div>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={`${item.question}-${index}`} className="rounded-xl bg-slate-50 p-4 dark:bg-zinc-950">
              <h3 className="font-semibold text-slate-900 dark:text-zinc-50">{item.question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-zinc-300">{item.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
