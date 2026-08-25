'use client';

import React from 'react';
import {
  Aperture,
  ArrowRight,
  Battery,
  Camera,
  Cpu,
  Eye,
  Globe2,
  Menu,
  PenLine,
  Rotate3D,
  Smartphone,
  X,
  Zap,
} from 'lucide-react';
import { Badge, cn } from '@/app/admin/components/ui';
import {
  GALAXY_COLOR_PRESETS,
  GalaxyS23Viewer,
  type GalaxyColorKey,
  type GalaxyHotspotKey,
} from './GalaxyS23Viewer';

type GalaxyS23MiniAppProps = {
  appConfig?: Record<string, unknown>;
  appName?: string;
  editable?: boolean;
  standalone?: boolean;
};

const getString = (value: unknown, fallback: string) => (
  typeof value === 'string' && value.trim() ? value : fallback
);

const HOTSPOT_COPY: Record<GalaxyHotspotKey, { desc: string; icon: React.ComponentType<{ className?: string }>; label: string; title: string }> = {
  overall: {
    desc: 'Drag to rotate the device. Scroll to zoom. Explore every angle of the premium architectural design.',
    icon: Globe2,
    label: 'Full Device (360°)',
    title: 'Interactive 3D Model',
  },
  camera: {
    desc: 'Zoom in on the state-of-the-art camera cluster with nightography enhancement.',
    icon: Camera,
    label: '200MP Camera Array',
    title: '200MP Super Quad Pixel',
  },
  screen: {
    desc: '6.8-inch display with Vision Booster and up to 120Hz adaptive refresh rate.',
    icon: Smartphone,
    label: 'AMOLED 2X Display',
    title: 'Dynamic AMOLED 2X Display',
  },
  spen: {
    desc: 'The iconic stylus is fully integrated for sketching, notes and remote control.',
    icon: PenLine,
    label: 'Embedded S Pen',
    title: 'Built-in S Pen',
  },
};

const SPECIFICATIONS = [
  { label: 'Camera', value: '200 MP Ultra High Res', desc: 'Revolutionary sensor with Adaptive Pixels and Nightography.' },
  { label: 'Processor', value: 'Snapdragon® 8 Gen 2', desc: 'Custom engineered for Galaxy, offering unparalleled gaming and multitasking.' },
  { label: 'Display', value: '6.8" Dynamic AMOLED 2X', desc: '120Hz refresh rate and 1750 nits peak brightness for outdoor visibility.' },
  { label: 'Battery', value: '5000 mAh Intelligent Power', desc: 'Long-lasting battery optimized to power through your day.' },
  { label: 'Stylus', value: 'Embedded S Pen', desc: 'Precision control, built-in sketching, note-taking, and remote control.' },
];

export function GalaxyS23MiniApp({
  appConfig,
  appName = 'Galaxy S23 Ultra 3D',
  editable = false,
  standalone = false,
}: GalaxyS23MiniAppProps) {
  const accent = getString(appConfig?.accent, '#18181b');
  const modelPath = getString(appConfig?.modelPath, '/models/samsung_s23_ultra.glb');
  const [activeColor, setActiveColor] = React.useState<GalaxyColorKey>('phantom_black');
  const [activeHotspot, setActiveHotspot] = React.useState<GalaxyHotspotKey>('overall');
  const [activeSpecTab, setActiveSpecTab] = React.useState(0);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isControlsOpen, setIsControlsOpen] = React.useState(false);
  const [loadProgress, setLoadProgress] = React.useState(0);
  const activeHotspotCopy = HOTSPOT_COPY[activeHotspot];

  return (
    <main className={cn(
      'min-h-screen bg-white text-slate-950 dark:bg-slate-950 dark:text-slate-50',
      standalone ? 'p-0' : 'rounded-3xl border border-slate-200 p-3 shadow-sm dark:border-slate-800',
    )}>
      {editable && !standalone && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div
              className="grid size-10 place-items-center rounded-xl text-white"
              style={{ backgroundColor: accent }}
            >
              <Smartphone className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-slate-900 dark:text-slate-100">{appName}</h2>
                <Badge variant="secondary" className="gap-1">
                  <Rotate3D className="size-3" />
                  3D
                </Badge>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mini app React/Three.js dùng model GLB trong public.
              </p>
            </div>
          </div>
          <code className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {modelPath}
          </code>
        </div>
      )}

      <section className="relative h-screen min-h-[760px] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,.95),rgba(244,244,245,.68)_34%,rgba(241,245,249,.95)_100%)] dark:bg-[radial-gradient(circle_at_50%_35%,rgba(30,41,59,.9),rgba(15,23,42,.9)_38%,rgba(2,6,23,.96)_100%)]" />
        <div className="absolute -left-20 -top-20 size-[50vw] rounded-full bg-blue-100 opacity-60 blur-[110px]" />
        <div className="absolute -bottom-24 -right-20 size-[50vw] rounded-full bg-purple-100 opacity-60 blur-[110px]" />

        <GalaxyS23Viewer
          activeColorKey={activeColor}
          activeHotspot={activeHotspot}
          modelPath={modelPath}
          onLoadProgress={setLoadProgress}
          onModelLoaded={() => setIsLoaded(true)}
        />

        {!isLoaded && (
          <div className="absolute inset-0 z-50 grid place-items-center bg-white dark:bg-slate-950">
            <div className="w-[min(400px,90%)] text-center">
              <h1 className="bg-gradient-to-br from-slate-950 to-slate-500 bg-clip-text text-4xl font-black tracking-[.25em] text-transparent dark:from-white dark:to-slate-400">
                GALAXY S23 ULTRA
              </h1>
              <p className="mt-3 text-sm tracking-wide text-slate-500">Loading 3D Experience...</p>
              <div className="mt-5 h-0.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full bg-slate-950 transition-all dark:bg-white" style={{ width: `${loadProgress}%` }} />
              </div>
              <p className="mt-3 text-xs font-medium text-slate-500">{loadProgress}%</p>
            </div>
          </div>
        )}

        {isLoaded && (
          <div className="pointer-events-none absolute left-4 right-4 top-4 z-20 flex items-start justify-between gap-3">
            <div className="pointer-events-auto rounded-[1.4rem] border border-slate-200 bg-white/80 px-5 py-3 text-slate-950 shadow-xl shadow-slate-900/10 backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/80 dark:text-white">
              <div className="text-xs font-black tracking-[.36em]">SAMSUNG</div>
              <div className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{appName}</div>
              <div className="text-xs text-slate-500 sm:text-sm">Epic camera. Epic performance.</div>
            </div>
            <button
              type="button"
              aria-label={isControlsOpen ? 'Close controls' : 'Open controls'}
              aria-expanded={isControlsOpen}
              className="pointer-events-auto grid size-12 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-white/85 text-slate-950 shadow-xl shadow-slate-900/10 backdrop-blur-2xl transition hover:-translate-y-0.5 hover:bg-white dark:border-slate-800 dark:bg-slate-900/85 dark:text-white dark:hover:bg-slate-900"
              onClick={() => setIsControlsOpen((open) => !open)}
            >
              {isControlsOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        )}

        <div className={cn('absolute inset-0 z-10 grid grid-cols-[330px_1fr_360px] grid-rows-[90px_1fr_90px] p-7 pointer-events-none max-xl:grid-cols-1 max-xl:grid-rows-[auto_auto_auto] max-xl:gap-4 max-xl:overflow-y-auto max-xl:px-4 max-xl:pb-4 max-xl:pt-[500px] max-sm:pt-[460px]', !isLoaded && 'opacity-0')}>
          <header className="hidden">
            <div className="rounded-full border border-slate-200 bg-white/75 px-5 py-2.5 text-sm font-black tracking-[.36em] shadow-sm backdrop-blur">
              SAMSUNG
            </div>
            <div className="text-right max-xl:text-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{appName}</h1>
              <p className="text-sm text-slate-500">Epic camera. Epic performance.</p>
            </div>
          </header>

          <aside className={cn(
            'pointer-events-auto col-start-1 row-start-2 self-center rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl transition duration-300 max-xl:col-start-1 max-xl:row-start-1 max-xl:self-auto dark:border-slate-800 dark:bg-slate-900/80',
            isControlsOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
          )}>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.15em] text-slate-500">Explore Details</h2>
            <div className="mb-4 flex flex-col gap-2">
              {(Object.keys(HOTSPOT_COPY) as GalaxyHotspotKey[]).map((key) => {
                const Icon = HOTSPOT_COPY[key].icon;
                return (
                  <button
                    key={key}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-left text-sm font-medium transition hover:translate-x-1 hover:border-slate-200 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800',
                      activeHotspot === key && 'border-slate-950 bg-slate-950 text-white shadow-xl shadow-slate-900/20 hover:bg-slate-950 dark:border-white dark:bg-white dark:text-slate-950 dark:hover:bg-white',
                    )}
                    onClick={() => setActiveHotspot(key)}
                  >
                    <Icon className="size-4 shrink-0" />
                    {HOTSPOT_COPY[key].label}
                  </button>
                );
              })}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="mb-1 text-sm font-semibold">{activeHotspotCopy.title}</h3>
              <p className="text-xs leading-6 text-slate-500">{activeHotspotCopy.desc}</p>
            </div>
          </aside>

          <aside className={cn(
            'pointer-events-auto col-start-3 row-start-2 self-center rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl transition duration-300 max-xl:col-start-1 max-xl:row-start-2 max-xl:self-auto dark:border-slate-800 dark:bg-slate-900/80',
            isControlsOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
          )}>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[.15em] text-slate-500">Choose Color</h2>
            <div className="mb-4 flex flex-col gap-2">
              {(Object.keys(GALAXY_COLOR_PRESETS) as GalaxyColorKey[]).map((key) => {
                const color = GALAXY_COLOR_PRESETS[key];
                return (
                  <button
                    key={key}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl border border-transparent px-4 py-2.5 text-sm font-medium transition hover:border-slate-200 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800',
                      activeColor === key && 'border-slate-300 bg-white shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-950',
                    )}
                    onClick={() => setActiveColor(key)}
                  >
                    <span className="size-6 rounded-full border border-slate-200 shadow-inner ring-4 ring-white" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </button>
                );
              })}
            </div>

            <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <h3 className="mb-3 text-sm font-semibold">Hardware Details</h3>
              <div className="mb-3 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2 dark:border-slate-800">
                {SPECIFICATIONS.map((spec, index) => (
                  <button
                    key={spec.label}
                    className={cn('whitespace-nowrap rounded-md px-2 py-1 text-xs text-slate-500', activeSpecTab === index && 'bg-white text-slate-950 shadow-sm dark:bg-slate-900 dark:text-white')}
                    onClick={() => setActiveSpecTab(index)}
                  >
                    {spec.label}
                  </button>
                ))}
              </div>
              <h4 className="mb-1 text-sm font-semibold">{SPECIFICATIONS[activeSpecTab].value}</h4>
              <p className="text-xs leading-5 text-slate-500">{SPECIFICATIONS[activeSpecTab].desc}</p>
            </div>

            <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-4 text-sm font-bold text-white shadow-xl shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950">
              Experience Order
              <ArrowRight className="size-4" />
            </button>
          </aside>

          <footer className={cn(
            'pointer-events-auto col-span-full row-start-3 flex flex-wrap items-center justify-center gap-3 self-center transition duration-300 max-xl:row-start-3 max-xl:flex-col',
            isControlsOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
          )}>
            {[
              { icon: Zap, value: 'Snapdragon 8 Gen 2', label: 'Mobile Platform' },
              { icon: Battery, value: '5000 mAh', label: 'Intelligent Battery' },
              { icon: Eye, value: '100x Space Zoom', label: 'Dual Telephoto' },
              { icon: Cpu, value: 'AI Optimized', label: 'Performance Core' },
              { icon: Aperture, value: 'Nightography', label: 'Adaptive Pixels' },
            ].map((item) => (
              <div key={item.value} className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2.5 shadow-lg shadow-slate-900/10 backdrop-blur-xl max-xl:w-full max-xl:justify-center dark:border-slate-800 dark:bg-slate-900/80">
                <item.icon className="size-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{item.value}</span>
                  <span className="text-xs text-slate-500">{item.label}</span>
                </div>
              </div>
            ))}
          </footer>
        </div>
      </section>
    </main>
  );
}
