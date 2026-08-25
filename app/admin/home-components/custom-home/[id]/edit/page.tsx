'use client';

import React, { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Input, Label } from '@/app/admin/components/ui';
import { HomeComponentStickyFooter } from '../../../_shared/components/HomeComponentStickyFooter';
import { TypeColorOverrideCard } from '../../../_shared/components/TypeColorOverrideCard';
import { TypeFontOverrideCard } from '../../../_shared/components/TypeFontOverrideCard';
import { useTypeColorOverrideState } from '../../../_shared/hooks/useTypeColorOverride';
import { useTypeFontOverrideState } from '../../../_shared/hooks/useTypeFontOverride';
import { useUnsavedGuard } from '../../../_shared/hooks/useUnsavedGuard';
import { getSuggestedSecondary, resolveSecondaryByMode } from '../../../_shared/lib/typeColorOverride';
import { CustomHomeFields } from '../../_components/CustomHomeFields';
import { CustomHomePreview } from '../../_components/CustomHomePreview';
import {
  getCustomHomePreviewText,
  normalizeCustomHomeConfig,
  type CustomHomeConfig,
} from '../../_lib/customHomeDocument';

const COMPONENT_TYPE = 'CustomHome';

type InitialData = {
  active: boolean;
  config: CustomHomeConfig;
  title: string;
};

export default function CustomHomeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const component = useQuery(api.homeComponents.getById, { id: id as Id<'homeComponents'> });
  const updateMutation = useMutation(api.homeComponents.update);
  const setTypeColorOverride = useMutation(api.homeComponentSystemConfig.setTypeColorOverride);
  const setTypeFontOverride = useMutation(api.homeComponentSystemConfig.setTypeFontOverride);
  const {
    customState,
    effectiveColors,
    initialCustom,
    setCustomState,
    setInitialCustom,
    showCustomBlock,
  } = useTypeColorOverrideState(COMPONENT_TYPE);
  const {
    customState: customFontState,
    effectiveFont,
    initialCustom: initialFontCustom,
    setCustomState: setCustomFontState,
    setInitialCustom: setInitialFontCustom,
    showCustomBlock: showFontCustomBlock,
  } = useTypeFontOverrideState(COMPONENT_TYPE);

  const [title, setTitle] = useState('');
  const [active, setActive] = useState(true);
  const [config, setConfig] = useState<CustomHomeConfig>(() => normalizeCustomHomeConfig({}));
  const [initialData, setInitialData] = useState<InitialData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolvedCustomSecondary = resolveSecondaryByMode(customState.mode, customState.primary, customState.secondary);
  const resolvedInitialSecondary = resolveSecondaryByMode(initialCustom.mode, initialCustom.primary, initialCustom.secondary);

  useEffect(() => {
    if (!component) {
      return;
    }
    if (component.type !== COMPONENT_TYPE) {
      router.replace(`/admin/home-components/${id}/edit`);
      return;
    }

    const normalized = normalizeCustomHomeConfig(component.config);
    setTitle(component.title);
    setActive(component.active);
    setConfig(normalized);
    setInitialData({
      active: component.active,
      config: normalized,
      title: component.title,
    });
  }, [component, id, router]);

  const hasChanges = useMemo(() => {
    if (!initialData) {
      return false;
    }
    const customChanged = showCustomBlock
      ? customState.enabled !== initialCustom.enabled
        || customState.mode !== initialCustom.mode
        || customState.primary !== initialCustom.primary
        || resolvedCustomSecondary !== resolvedInitialSecondary
      : false;
    const customFontChanged = showFontCustomBlock
      ? customFontState.enabled !== initialFontCustom.enabled
        || customFontState.fontKey !== initialFontCustom.fontKey
      : false;

    return title !== initialData.title
      || active !== initialData.active
      || JSON.stringify(normalizeCustomHomeConfig(config)) !== JSON.stringify(normalizeCustomHomeConfig(initialData.config))
      || customChanged
      || customFontChanged;
  }, [
    active,
    config,
    customFontState.enabled,
    customFontState.fontKey,
    customState.enabled,
    customState.mode,
    customState.primary,
    initialData,
    initialCustom.enabled,
    initialCustom.mode,
    initialCustom.primary,
    initialFontCustom.enabled,
    initialFontCustom.fontKey,
    resolvedCustomSecondary,
    resolvedInitialSecondary,
    showCustomBlock,
    showFontCustomBlock,
    title,
  ]);

  useUnsavedGuard(hasChanges);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting || !component) {
      return;
    }

    const normalized = normalizeCustomHomeConfig({
      ...config,
      preview: getCustomHomePreviewText(config.source ?? ''),
    });

    setIsSubmitting(true);
    try {
      if (showCustomBlock) {
        const isCustomEnabled = customState.enabled;
        const mode = isCustomEnabled ? customState.mode : effectiveColors.mode;
        const primary = isCustomEnabled ? customState.primary : effectiveColors.primary;
        const secondary = isCustomEnabled ? customState.secondary : effectiveColors.secondary;
        await setTypeColorOverride({
          type: COMPONENT_TYPE,
          enabled: isCustomEnabled,
          mode,
          primary,
          secondary: resolveSecondaryByMode(mode, primary, secondary),
        });
        setInitialCustom({
          enabled: isCustomEnabled,
          mode,
          primary,
          secondary: resolveSecondaryByMode(mode, primary, secondary),
        });
      }

      if (showFontCustomBlock) {
        await setTypeFontOverride({
          type: COMPONENT_TYPE,
          enabled: customFontState.enabled,
          fontKey: customFontState.fontKey,
        });
        setInitialFontCustom({
          enabled: customFontState.enabled,
          fontKey: customFontState.fontKey,
        });
      }

      await updateMutation({
        active,
        config: normalized,
        id: component._id,
        title,
      });
      setConfig(normalized);
      setInitialData({ active, config: normalized, title });
      toast.success('Đã lưu Custom Home');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu Custom Home');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (component === undefined) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (component === null) {
    return (
      <div className="py-8 text-center text-slate-500">
        Không tìm thấy component
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Chỉnh sửa Custom Home</h1>
        <Link href="/admin/home-components" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-2">
            <Label>Tên hiển thị <span className="text-red-500">*</span></Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </div>
        </div>

        <CustomHomeFields config={config} onChange={setConfig} />

        {showCustomBlock && (
          <div className="mt-4">
            <TypeColorOverrideCard
              title="Màu custom Custom Home"
              enabled={customState.enabled}
              mode={customState.mode}
              primary={customState.primary}
              secondary={customState.secondary}
              compact
              toggleLabel="Custom"
              primaryLabel="Chính"
              secondaryLabel="Phụ"
              onEnabledChange={(next) => setCustomState((prev) => ({ ...prev, enabled: next }))}
              onModeChange={(next) => {
                if (next === 'single') {
                  setCustomState((prev) => ({ ...prev, mode: 'single', secondary: prev.primary }));
                  return;
                }
                setCustomState((prev) => ({
                  ...prev,
                  mode: 'dual',
                  secondary: prev.mode === 'single' ? getSuggestedSecondary(prev.primary) : prev.secondary,
                }));
              }}
              onPrimaryChange={(value) => {
                setCustomState((prev) => ({
                  ...prev,
                  primary: value,
                  secondary: prev.mode === 'single' ? value : prev.secondary,
                }));
              }}
              onSecondaryChange={(value) => setCustomState((prev) => ({ ...prev, secondary: value }))}
            />
          </div>
        )}

        {showFontCustomBlock && (
          <div className="mt-4">
            <TypeFontOverrideCard
              title="Font custom Custom Home"
              enabled={customFontState.enabled}
              fontKey={customFontState.fontKey}
              compact
              toggleLabel="Custom"
              fontLabel="Font"
              onEnabledChange={(next) => setCustomFontState((prev) => ({ ...prev, enabled: next }))}
              onFontChange={(next) => setCustomFontState((prev) => ({ ...prev, fontKey: next }))}
            />
          </div>
        )}

        <div className="mt-4">
          <CustomHomePreview
            title={title}
            config={config}
            onChange={setConfig}
            brandColor={effectiveColors.primary}
            secondary={effectiveColors.secondary}
            mode={effectiveColors.mode}
            fontKey={effectiveFont.fontKey}
          />
        </div>

        <HomeComponentStickyFooter
          isSubmitting={isSubmitting}
          hasChanges={hasChanges}
          onCancel={() => router.push('/admin/home-components')}
          submitLabel="Lưu thay đổi"
          submittingLabel="Đang lưu..."
          active={active}
          onActiveChange={setActive}
        />
      </form>
    </div>
  );
}
