'use client';

import React from 'react';
import { Sparkles, Lock, CheckCircle2 } from 'lucide-react';
import { ToggleSwitch } from './toggle-switch';
import type { ModuleCapability } from '@/lib/modules/define-module';

interface CapabilitiesCardProps {
  capabilities: ModuleCapability[];
  onToggle?: (key: string) => void;
  title?: string;
  toggleColor?: string;
}

export const CapabilitiesCard: React.FC<CapabilitiesCardProps> = ({
  capabilities,
  onToggle,
  title = 'Khả năng (Capabilities)',
  toggleColor = 'bg-blue-600',
}) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3">
    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
      <Sparkles size={16} className="text-amber-500" /> {title}
    </h3>
    <p className="text-xs text-slate-500 dark:text-slate-400">
      Phân định capability đã đạt trạng thái Production và capability Roadmap bị khóa.
    </p>

    <div className="space-y-2.5">
      {capabilities.map((cap) => {
        const isReady = cap.status === 'ready';
        const isRoadmap = cap.status === 'roadmap';

        return (
          <div
            key={cap.key}
            className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
              isReady
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-80'
            }`}
          >
            <div className="flex items-start gap-2.5 flex-1 min-w-0">
              {isReady ? (
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Lock size={16} className="text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {cap.name}
                  </span>
                  {isReady && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      Sẵn sàng v1
                    </span>
                  )}
                  {isRoadmap && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 flex items-center gap-1">
                      <Lock size={10} /> Roadmap (Khóa)
                    </span>
                  )}
                </div>
                {cap.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {cap.description}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <ToggleSwitch
                enabled={cap.enabled}
                onChange={() => {
                  if (!cap.disabledToggle && onToggle) {
                    onToggle(cap.key);
                  }
                }}
                color={toggleColor}
              />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
