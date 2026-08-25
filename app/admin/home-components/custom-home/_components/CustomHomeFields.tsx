'use client';

import React from 'react';
import { Code2, FileCode2, ShieldCheck } from 'lucide-react';
import { ToggleSwitch } from '@/components/modules/shared';
import { Card, CardContent, CardHeader, CardTitle, Input, Label, cn } from '@/app/admin/components/ui';
import type { CustomHomeConfig, CustomHomeHeightMode } from '../_lib/customHomeDocument';

type CustomHomeFieldsProps = {
  config: CustomHomeConfig;
  onChange: (next: CustomHomeConfig) => void;
};

const updateConfig = (
  config: CustomHomeConfig,
  onChange: (next: CustomHomeConfig) => void,
  patch: Partial<CustomHomeConfig>,
) => {
  onChange({ ...config, ...patch });
};

const heightModeOptions: Array<{ label: string; value: CustomHomeHeightMode }> = [
  { label: 'Auto height', value: 'auto' },
  { label: 'Fixed height', value: 'fixed' },
];

export function CustomHomeFields({ config, onChange }: CustomHomeFieldsProps) {
  const setConfig = (patch: Partial<CustomHomeConfig>) => updateConfig(config, onChange, patch);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileCode2 size={18} />
            Mã giao diện custom
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>HTML đầy đủ hoặc fragment</Label>
            <textarea
              value={config.source ?? ''}
              onChange={(event) => setConfig({ source: event.target.value })}
              spellCheck={false}
              className={cn(
                'min-h-[360px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                'dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100',
              )}
              placeholder="Dán <!DOCTYPE html>... hoặc phần body HTML tại đây"
            />
            <p className="text-xs text-slate-500">
              Mã này chạy trong iframe sandbox. Nên dùng token như <code>var(--va-color-primary)</code>, <code>var(--va-color-background)</code>, <code>var(--va-font-active)</code>.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>CSS bổ sung</Label>
              <textarea
                value={config.css ?? ''}
                onChange={(event) => setConfig({ css: event.target.value })}
                spellCheck={false}
                className="min-h-[180px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder=".my-section { color: var(--va-color-primary); }"
              />
            </div>
            <div className="space-y-2">
              <Label>JavaScript bổ sung</Label>
              <textarea
                value={config.js ?? ''}
                onChange={(event) => setConfig({ js: event.target.value })}
                spellCheck={false}
                className="min-h-[180px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                placeholder="document.querySelector(...)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck size={18} />
            Sandbox & responsive
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Chiều cao iframe</Label>
            <div className="grid grid-cols-2 gap-2">
              {heightModeOptions.map((option) => {
                const selected = (config.heightMode ?? 'auto') === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setConfig({ heightMode: option.value })}
                    className={cn(
                      'h-10 rounded-md border text-xs font-medium transition-colors',
                      selected
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Chiều cao tối thiểu</Label>
            <Input
              type="number"
              min={160}
              max={4000}
              value={config.minHeight ?? 640}
              onChange={(event) => setConfig({ minHeight: Number(event.target.value) })}
            />
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label>Cho chạy script</Label>
                <p className="mt-1 text-xs text-slate-500">Bật cho HTML có animation, menu, form logic.</p>
              </div>
              <ToggleSwitch enabled={config.allowScripts !== false} onChange={() => setConfig({ allowScripts: config.allowScripts === false })} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label>Cho submit form</Label>
                <p className="mt-1 text-xs text-slate-500">Chỉ bật khi form trỏ tới endpoint an toàn.</p>
              </div>
              <ToggleSwitch enabled={config.allowForms !== false} onChange={() => setConfig({ allowForms: config.allowForms === false })} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label>Cho mở popup</Label>
                <p className="mt-1 text-xs text-slate-500">Dùng cho link cần mở cửa sổ mới.</p>
              </div>
              <ToggleSwitch enabled={config.allowPopups === true} onChange={() => setConfig({ allowPopups: config.allowPopups !== true })} />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Label>Nền tự quản</Label>
                <p className="mt-1 text-xs text-slate-500">Bật nếu code custom đã tự xử lý background.</p>
              </div>
              <ToggleSwitch enabled={config.isolateBackground === true} onChange={() => setConfig({ isolateBackground: config.isolateBackground !== true })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 pt-6 text-sm text-slate-600 dark:text-slate-300">
          <Code2 size={18} className="mt-0.5 shrink-0 text-blue-500" />
          <div className="space-y-1">
            <p className="font-medium text-slate-800 dark:text-slate-100">Vị trí render</p>
            <p>Custom Home là một home-component đặc biệt trong body trang chủ, nên mặc định nằm dưới header, trên footer và dưới lớp nổi của Speed Dial.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
