'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Copy, Edit, Grid, GripVertical, History, Layers, Loader2, MousePointer2, PanelBottom, PanelTop, Plus, Search, Settings2, Trash2, Wand2, X, Monitor, Smartphone, Tablet, Sun, Moon, ChevronLeft } from 'lucide-react';

import { toast } from 'sonner';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { Button, Card, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from '../components/ui';
import { BulkActionBar, ColumnToggle, FilterSelect, ResetFilterButton, SearchInput, SelectCheckbox } from '../components/TableUtilities';
import { ModuleGuard } from '../components/ModuleGuard';
import { COMPONENT_TYPES } from './create/shared';
import { getEditRoute as getEditRouteByType } from './_shared/lib/componentRoutes';
import { HomepageSnapshotDialog } from '@/components/modules/homepage/HomepageSnapshotDialog';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useComponentListFilter } from './_shared/hooks/useComponentListFilter';
import { getQuickSyncedReorderedComponents, buildQuickSyncedComponent } from './_shared/lib/quickSync';
import { useBrandColors } from './create/shared';
import { resolveTypeOverrideColors } from '@/app/admin/home-components/_shared/lib/typeColorOverride';
import { resolveTypeOverrideFont } from '@/app/admin/home-components/_shared/lib/typeFontOverride';
import { BrowserFrame } from './_shared/components/BrowserFrame';
import { LiveEditorContext, PreviewDarkContext, PreviewVisualEditContext } from './_shared/components/PreviewWrapper';
import { LiveComponentPreviewRenderer } from './_shared/components/LiveComponentPreviewRenderer';


export default function HomeComponentsPageWrapper() {
  return (
    <ModuleGuard moduleKey="homepage">
      <HomeComponentsPage />
    </ModuleGuard>
  );
}

const getEditRoute = (type: string, id: string) => (
  getEditRouteByType(type, id) ?? `/admin/home-components/${id}/edit`
);

type PageTab = 'components' | 'chrome' | 'live-editor';
type HomePageChromeConfig = {

  showFooter: boolean;
  showHeader: boolean;
  showSpeedDial: boolean;
};

const DEFAULT_HOME_PAGE_CHROME: HomePageChromeConfig = {
  showFooter: true,
  showHeader: true,
  showSpeedDial: true,
};

const tabItems: Array<{ key: PageTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
  { key: 'components', label: 'Components', icon: Layers },
  { key: 'chrome', label: 'Khung trang', icon: Settings2 },
];

interface SortableRowProps {
  comp: { _id: string; title: string; type: string; active: boolean; config?: { preview?: string; description?: string } };
  index: number;
  isSelected: boolean;
  visibleColumns: string[];
  onToggleSelect: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SortableRow({ comp, index, isSelected, visibleColumns, onToggleSelect, onToggleActive, onDelete, onDuplicate }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: comp._id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const TypeIcon = COMPONENT_TYPES.find(t => t.value === comp.type)?.icon ?? Grid;

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style} 
      className={cn(isSelected && 'bg-blue-500/5', isDragging && 'bg-slate-100 dark:bg-slate-800 opacity-80')}
    >
      <TableCell>
        <SelectCheckbox checked={isSelected} onChange={onToggleSelect} />
      </TableCell>
      <TableCell className="w-[50px]">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
          <GripVertical size={16} className="text-slate-400" />
        </button>
      </TableCell>
      {visibleColumns.includes('index') && <TableCell className="font-medium text-slate-500">{index + 1}</TableCell>}
      {visibleColumns.includes('title') && (
        <TableCell>
          <div className="font-medium">{comp.title}</div>
          <div className="text-xs text-slate-400 truncate max-w-[300px]">{(comp.config?.preview ?? comp.config?.description) ?? ''}</div>
        </TableCell>
      )}
      {visibleColumns.includes('type') && (
        <TableCell>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-slate-100 dark:bg-slate-800 rounded">
              <TypeIcon size={14} className="text-slate-600 dark:text-slate-400" />
            </div>
            <span className="text-sm">{comp.type}</span>
          </div>
        </TableCell>
      )}
      {visibleColumns.includes('active') && (
        <TableCell className="text-center">
          <div 
            className={cn(
              "cursor-pointer inline-flex items-center justify-center rounded-full w-8 h-4 transition-colors",
              comp.active ? "bg-green-500" : "bg-slate-300"
            )}
            onClick={onToggleActive}
          >
            <div className={cn("w-3 h-3 bg-white rounded-full transition-transform", comp.active ? "translate-x-2" : "-translate-x-2")}></div>
          </div>
        </TableCell>
      )}
      <TableCell className="text-right">
        <div className="flex justify-end gap-1">
          <Link href={getEditRoute(comp.type, comp._id)}>
            <Button variant="ghost" size="icon" title="Chỉnh sửa"><Edit size={16} /></Button>
          </Link>
          <Button variant="ghost" size="icon" title="Nhân bản" onClick={onDuplicate}>
            <Copy size={16} />
          </Button>
          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" title="Xóa" onClick={onDelete}>
            <Trash2 size={16} />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function ChromeToggleCard({
  description,
  icon: Icon,
  isLoading,
  label,
  onChange,
  value,
}: {
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  isLoading: boolean;
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon size={18} />
        </div>
        <div>
          <div className="font-semibold text-slate-900 dark:text-slate-100">{label}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400">{description}</div>
        </div>
      </div>
      <button
        type="button"
        disabled={isLoading}
        aria-pressed={value}
        onClick={() => onChange(!value)}
        className={cn(
          'inline-flex h-9 min-w-[6rem] items-center justify-center rounded-full px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          value
            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
            : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
        )}
      >
        {isLoading ? <Loader2 size={15} className="animate-spin" /> : value ? 'Đang hiện' : 'Đang ẩn'}
      </button>
    </div>
  );
}

function HomePageChromeTab() {
  const config = useQuery(api.homeComponentSystemConfig.getConfig);
  const setHomePageChrome = useMutation(api.homeComponentSystemConfig.setHomePageChrome);
  const [draft, setDraft] = useState<HomePageChromeConfig>(DEFAULT_HOME_PAGE_CHROME);
  const [savingKey, setSavingKey] = useState<keyof HomePageChromeConfig | null>(null);

  useEffect(() => {
    if (config?.homePageChrome) {
      setDraft({
        showFooter: config.homePageChrome.showFooter,
        showHeader: config.homePageChrome.showHeader,
        showSpeedDial: config.homePageChrome.showSpeedDial,
      });
    }
  }, [config?.homePageChrome]);

  const updateChrome = async (key: keyof HomePageChromeConfig, value: boolean) => {
    const previous = draft;
    const next = { ...previous, [key]: value };
    setDraft(next);
    setSavingKey(key);
    try {
      await setHomePageChrome(next);
      toast.success('Đã cập nhật khung trang chủ');
    } catch {
      setDraft(previous);
      toast.error('Không thể cập nhật khung trang chủ');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Khung trang chủ</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Điều khiển Header, Footer và SpeedDial mặc định chỉ cho trang chủ.
          </p>
        </div>
        {config === undefined ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-3">
            <ChromeToggleCard
              label="Header"
              description="Ẩn/hiện thanh header mặc định phía trên trang chủ."
              icon={PanelTop}
              value={draft.showHeader}
              isLoading={savingKey === 'showHeader'}
              onChange={(value) => updateChrome('showHeader', value)}
            />
            <ChromeToggleCard
              label="Footer"
              description="Ẩn/hiện footer mặc định phía dưới trang chủ."
              icon={PanelBottom}
              value={draft.showFooter}
              isLoading={savingKey === 'showFooter'}
              onChange={(value) => updateChrome('showFooter', value)}
            />
            <ChromeToggleCard
              label="SpeedDial"
              description="Ẩn/hiện nút SpeedDial nổi trên trang chủ."
              icon={MousePointer2}
              value={draft.showSpeedDial}
              isLoading={savingKey === 'showSpeedDial'}
              onChange={(value) => updateChrome('showSpeedDial', value)}
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function HomeComponentsPage() {
  const components = useQuery(api.homeComponents.listAll);
  const removeMutation = useMutation(api.homeComponents.remove);
  const toggleMutation = useMutation(api.homeComponents.toggle);
  const updateMutation = useMutation(api.homeComponents.update);
  const reorderMutation = useMutation(api.homeComponents.reorder);
  const duplicateMutation = useMutation(api.homeComponents.duplicate);
  const wizardSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'homepage', settingKey: 'enableSmartWizard' });
  const legacySnapshotQuickCreateSetting = useQuery(api.admin.modules.getModuleSetting, { moduleKey: 'homepage', settingKey: 'enableLegacySnapshotQuickCreate' });
  const router = useRouter();
  const searchParams = useSearchParams();
  const isLiveParam = searchParams.get('live') === 'true';
  const [localActiveTab, setLocalActiveTab] = useState<PageTab>('components');
  const activeTab = isLiveParam ? 'live-editor' : localActiveTab;
  const systemColors = useBrandColors();
  const systemConfig = useQuery(api.homeComponentSystemConfig.getConfig);
  const [liveComponents, setLiveComponents] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSavingLive, setIsSavingLive] = useState(false);
  const [liveDevice, setLiveDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [liveIsDark, setLiveIsDark] = useState(false);

  const { filtered, search, setSearch, typeFilter, setTypeFilter, statusFilter, setStatusFilter, resetFilters, hasActiveFilter, availableTypes } =
    useComponentListFilter(components);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openWizard, setOpenWizard] = useState(false);
  const [openQuickCreate, setOpenQuickCreate] = useState(false);
  const [statusLoading, setStatusLoading] = useState<'show' | 'hide' | null>(null);

  const homeColumns = useMemo(() => [
    { key: 'index', label: 'STT' },
    { key: 'title', label: 'Tên Component', required: true },
    { key: 'type', label: 'Loại' },
    { key: 'active', label: 'Trạng thái' },
  ], []);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['index', 'title', 'type', 'active']);
  const resolvedVisibleColumns = useMemo(() => {
    const requiredKeys = homeColumns.filter(c => c.required).map(c => c.key);
    return Array.from(new Set([...requiredKeys, ...(visibleColumns.length > 0 ? visibleColumns : homeColumns.map(c => c.key))]));
  }, [visibleColumns, homeColumns]);
  const [isQuickSyncing, setIsQuickSyncing] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  useEffect(() => {
    if (components && activeTab === 'live-editor' && liveComponents.length === 0) {
      const getSortWeightLocal = (type: string) => {
        if (type === 'Footer') return 2;
        if (type === 'SpeedDial') return 1;
        return 0;
      };
      const sorted = [...components].sort((a, b) => {
        const weightA = getSortWeightLocal(a.type);
        const weightB = getSortWeightLocal(b.type);
        if (weightA !== weightB) {
          return weightA - weightB;
        }
        return a.order - b.order;
      });
      setLiveComponents(JSON.parse(JSON.stringify(sorted)));
    }
  }, [components, activeTab, liveComponents.length]);

  if (components === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const getSortWeight = (type: string) => {
    if (type === 'Footer') return 2;
    if (type === 'SpeedDial') return 1;
    return 0;
  };

  const sortedComponents = [...components].sort((a, b) => {
    const weightA = getSortWeight(a.type);
    const weightB = getSortWeight(b.type);
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    return a.order - b.order;
  });

  const handleLiveConfigChange = (id: string, nextConfig: Record<string, any>) => {
    setLiveComponents((prev) =>
      prev.map((c) => (c._id === id ? { ...c, config: nextConfig } : c))
    );
    setHasChanges(true);
  };

  const handleLiveTitleChange = (id: string, nextTitle: string) => {
    setLiveComponents((prev) =>
      prev.map((c) => (c._id === id ? { ...c, title: nextTitle } : c))
    );
    setHasChanges(true);
  };

  const handleSaveLiveChanges = async () => {
    setIsSavingLive(true);
    try {
      const changed = liveComponents.filter((c) => {
        const original = components?.find((o) => o._id === c._id);
        if (!original) return false;
        return (
          JSON.stringify(original.config) !== JSON.stringify(c.config) ||
          original.title !== c.title
        );
      });

      if (changed.length === 0) {
        toast.info('Không có thay đổi nào cần lưu');
        return;
      }

      await Promise.all(
        changed.map((c) =>
          updateMutation({
            id: c._id as Id<'homeComponents'>,
            config: c.config,
            title: c.title,
          })
        )
      );
      toast.success(`Đã lưu thành công ${changed.length} component`);
      setHasChanges(false);
    } catch {
      toast.error('Lỗi khi lưu các thay đổi');
    } finally {
      setIsSavingLive(false);
    }
  };

  const handleExitLiveEditor = () => {
    if (hasChanges) {
      if (confirm('Bạn có thay đổi chưa lưu. Thoát và hủy các thay đổi này?')) {
        setLiveComponents([]);
        setHasChanges(false);
        router.push('/admin/home-components');
      }
    } else {
      setLiveComponents([]);
      router.push('/admin/home-components');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {return;}

    const oldIndex = sortedComponents.findIndex(c => c._id === active.id);
    const newIndex = sortedComponents.findIndex(c => c._id === over.id);
    const reordered = arrayMove(sortedComponents, oldIndex, newIndex);

    try {
      await reorderMutation({ items: reordered.map((c, i) => ({ id: c._id, order: i })) });
      toast.success('Đã cập nhật thứ tự');
    } catch {
      toast.error('Lỗi khi cập nhật thứ tự');
    }
  };

  // sortedFiltered: lọc từ sortedComponents (đã có order) → không cần re-sort
  const sortedFilteredIds = new Set(filtered.map(c => c._id));
  const sortedFiltered = sortedComponents.filter(c => sortedFilteredIds.has(c._id));


  const toggleSelectAll = () =>{
    setSelectedIds(selectedIds.length === sortedFiltered.length ? [] : sortedFiltered.map(c => c._id));
  };
  const toggleSelectItem = (id: string) =>{  setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]); };

  const handleDuplicate = async (id: Id<"homeComponents">) => {
    try {
      await duplicateMutation({ id });
      toast.success('Đã nhân bản component');
    } catch {
      toast.error('Lỗi khi nhân bản component');
    }
  };

  const handleDelete = async (id: Id<"homeComponents">) => {
    if (confirm('Xóa component này khỏi trang chủ?')) {
      try {
        await removeMutation({ id });
        toast.success('Đã xóa component');
      } catch {
        toast.error('Lỗi khi xóa component');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Xóa ${selectedIds.length} component đã chọn?`)) {
      try {
        await Promise.all(selectedIds.map( async id => removeMutation({ id: id as Id<"homeComponents"> })));
        setSelectedIds([]);
        toast.success(`Đã xóa ${selectedIds.length} component`);
      } catch {
        toast.error('Lỗi khi xóa components');
      }
    }
  };

  const handleQuickSyncAll = async () => {
    if (!components || components.length === 0) {
      toast.error('Chưa có component để đồng bộ');
      return;
    }
    setIsQuickSyncing(true);
    try {
      const reordered = getQuickSyncedReorderedComponents(components);
      await Promise.all(
        reordered.map(async (c) => 
          updateMutation({
            id: c._id as Id<"homeComponents">,
            config: c.config,
            order: c.order,
          })
        )
      );
      toast.success('Đã đồng bộ nhanh toàn bộ component: bo góc ít, spacing hẹp, tiêu đề căn giữa, SpeedDial kế cuối, Footer cuối cùng');
    } catch {
      toast.error('Lỗi khi đồng bộ nhanh components');
    } finally {
      setIsQuickSyncing(false);
    }
  };

  const handleBulkQuickSync = async () => {
    if (selectedIds.length === 0) return;
    setStatusLoading('show');
    try {
      const updatedComponents = components.map(c => {
        if (selectedIds.includes(c._id)) {
          return buildQuickSyncedComponent(c);
        }
        return c;
      });
      const reordered = getQuickSyncedReorderedComponents(updatedComponents);
      await Promise.all(
        reordered.map(async (c) => {
          const isSelected = selectedIds.includes(c._id);
          await updateMutation({
            id: c._id as Id<"homeComponents">,
            order: c.order,
            ...(isSelected ? { config: c.config } : {}),
          });
        })
      );
      setSelectedIds([]);
      toast.success(`Đã đồng bộ nhanh ${selectedIds.length} component được chọn`);
    } catch {
      toast.error('Lỗi khi đồng bộ nhanh các component được chọn');
    } finally {
      setStatusLoading(null);
    }
  };

  const toggleActive = async (id: Id<"homeComponents">) => {
    try {
      await toggleMutation({ id });
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  };

  const handleBulkShow = async () => {
    setStatusLoading('show');
    try {
      await Promise.all(
        selectedIds.map( async id => {
          const comp = sortedComponents.find(c => c._id === id);
          if (comp && !comp.active) {
            await updateMutation({ id: id as Id<"homeComponents">, active: true });
          }
        })
      );
      setSelectedIds([]);
      toast.success(`Đã hiển thị ${selectedIds.length} component`);
    } catch {
      toast.error('Lỗi khi hiển thị components');
    } finally {
      setStatusLoading(null);
    }
  };

  const handleBulkHide = async () => {
    setStatusLoading('hide');
    try {
      await Promise.all(
        selectedIds.map( async id => {
          const comp = sortedComponents.find(c => c._id === id);
          if (comp && comp.active) {
            await updateMutation({ id: id as Id<"homeComponents">, active: false });
          }
        })
      );
      setSelectedIds([]);
      toast.success(`Đã ẩn ${selectedIds.length} component`);
    } catch {
      toast.error('Lỗi khi ẩn components');
    } finally {
      setStatusLoading(null);
    }
  };

  const showWizard = wizardSetting?.value !== false;
  const showLegacySnapshotQuickCreate = showWizard && legacySnapshotQuickCreateSetting?.value === true;

  if (activeTab === 'live-editor') {
    const activeLiveComponents = liveComponents.filter(c => c.active);
    const deviceWidthClass = liveDevice === 'desktop' ? 'w-full max-w-7xl' : liveDevice === 'tablet' ? 'w-[768px]' : 'w-[375px]';

    return (
      <div className="flex flex-col min-h-screen bg-slate-100 dark:bg-slate-950 -m-4 md:-m-6">
        {/* Sticky Header Toolbar */}
        <div className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <Button type="button" variant="ghost" className="gap-2" onClick={handleExitLiveEditor}>
              <ChevronLeft size={16} /> Quay lại
            </Button>
            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Editor (WYSIWYG)
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chỉnh sửa trực tiếp nội dung trên giao diện</p>
            </div>
          </div>

          {/* Controls: Device & Dark mode */}
          <div className="flex items-center gap-6">
            {/* Device Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setLiveDevice('desktop')}
                title="Desktop (1280px)"
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  liveDevice === 'desktop'
                    ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                )}
              >
                <Monitor size={16} />
              </button>
              <button
                type="button"
                onClick={() => setLiveDevice('tablet')}
                title="Tablet (768px)"
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  liveDevice === 'tablet'
                    ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                )}
              >
                <Tablet size={16} />
              </button>
              <button
                type="button"
                onClick={() => setLiveDevice('mobile')}
                title="Mobile (375px)"
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  liveDevice === 'mobile'
                    ? "bg-white text-slate-800 dark:bg-slate-700 dark:text-slate-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-100"
                )}
              >
                <Smartphone size={16} />
              </button>
            </div>

            {/* Dark mode switcher */}
            <button
              type="button"
              onClick={() => setLiveIsDark(!liveIsDark)}
              title={liveIsDark ? "Chuyển sang chế độ Sáng" : "Chuyển sang chế độ Tối"}
              className={cn(
                "p-2 rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              {liveIsDark ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} />}
            </button>
          </div>

          {/* Action: Save change */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">
              {hasChanges ? (
                <span className="text-amber-500 font-medium">● Có thay đổi chưa lưu</span>
              ) : (
                <span className="text-slate-400">✓ Đã lưu tất cả</span>
              )}
            </span>
            <Button
              className="gap-2"
              variant="accent"
              disabled={isSavingLive || !hasChanges}
              onClick={handleSaveLiveChanges}
            >
              {isSavingLive ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
              Lưu thay đổi
            </Button>
          </div>
        </div>

        {/* Workspace Area */}
        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <div className={cn("transition-all duration-300", deviceWidthClass)}>
            <BrowserFrame url="yoursite.com">
              <LiveEditorContext.Provider value={{ isLiveEditor: true }}>
                <PreviewVisualEditContext.Provider value={{ active: true }}>
                  <PreviewDarkContext.Provider value={{ isDark: liveIsDark }}>
                  <div className={cn("min-h-[600px] flex flex-col transition-colors duration-300", liveIsDark ? "dark bg-slate-950 text-slate-100" : "bg-white text-slate-900")}>
                    {activeLiveComponents.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400">
                        <Layers size={48} className="mb-4 text-slate-300" />
                        <p>Không có component nào đang hoạt động trên trang chủ.</p>
                        <p className="text-xs">Vui lòng quay lại kích hoạt ít nhất một component.</p>
                      </div>
                    ) : (
                      activeLiveComponents.map((comp) => {
                        const resolvedColors = resolveTypeOverrideColors({
                          type: comp.type,
                          systemColors,
                          overrides: systemConfig?.typeColorOverrides ?? null,
                        });
                        const resolvedFont = resolveTypeOverrideFont({
                          type: comp.type,
                          overrides: systemConfig?.typeFontOverrides ?? null,
                          globalOverride: systemConfig?.globalFontOverride ?? null,
                        });

                        const fontStyle = { '--font-active': `var(${resolvedFont.fontVariable})` } as React.CSSProperties;

                        return (
                          <div
                            key={comp._id}
                            className="font-active relative group"
                            style={fontStyle}
                          >
                            <div className="absolute left-0 right-0 top-0 h-[1px] border-t border-dashed border-slate-200 dark:border-slate-800 opacity-50 z-20 group-hover:opacity-100 pointer-events-none transition-opacity" />
                            
                            <LiveComponentPreviewRenderer
                              component={comp}
                              brandColor={resolvedColors.primary}
                              secondary={resolvedColors.secondary}
                              mode={resolvedColors.mode}
                              fontStyle={fontStyle}
                              fontClassName="font-active"
                              onConfigChange={(nextConfig) => handleLiveConfigChange(comp._id, nextConfig)}
                              onTitleChange={(nextTitle) => handleLiveTitleChange(comp._id, nextTitle)}
                            />

                            <div className="absolute left-2 top-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white dark:bg-slate-800/80 dark:text-slate-100 text-[10px] px-2 py-0.5 rounded font-mono pointer-events-none uppercase">
                              {comp.type}: {comp.title}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </PreviewDarkContext.Provider>
              </PreviewVisualEditContext.Provider>
            </LiveEditorContext.Provider>
            </BrowserFrame>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Giao diện Trang chủ</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Quản lý các khối nội dung hiển thị trên trang chủ</p>
        </div>
        {activeTab === 'components' && (
        <div className="flex items-center gap-2">
          {showWizard && (
            <div className="relative">
              <Button className="gap-2" variant="outline" onClick={() => setOpenQuickCreate((open) => !open)}>
                <Wand2 size={16} /> Tạo nhanh <ChevronDown size={14} />
              </Button>
              {openQuickCreate && (
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    onClick={() => {
                      setOpenQuickCreate(false);
                      setOpenWizard(true);
                    }}
                  >
                    <Wand2 size={15} /> Tạo nhanh snapshot
                  </button>
                  {showLegacySnapshotQuickCreate && (
                    <Link
                      href="/admin/home-components/snapshots/clone"
                      className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      onClick={() => setOpenQuickCreate(false)}
                    >
                      <History size={15} /> Từ snapshot cũ
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
          <Button
            className="gap-2"
            variant="outline"
            onClick={handleQuickSyncAll}
            disabled={isQuickSyncing || !components || components.length === 0}
          >
            {isQuickSyncing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            Đồng bộ nhanh
          </Button>
          <Button
            className="gap-2 text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-900 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
            variant="outline"
            onClick={() => {
              router.push('/admin/home-components?live=true');
            }}
            disabled={!components || components.length === 0}
          >
            <MousePointer2 size={16} />
            Biên tập trực quan
          </Button>
          <Link href="/admin/home-components/create">
            <Button className="gap-2" variant="accent">
              <Plus size={16} /> Thêm Component
            </Button>
          </Link>
        </div>
        )}
      </div>


      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setLocalActiveTab(tab.key);
                if (isLiveParam) {
                  router.push('/admin/home-components');
                }
              }}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              )}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {showWizard && <HomepageSnapshotDialog open={openWizard} onOpenChange={setOpenWizard} />}

      {activeTab === 'components' ? (
      <>
      {/* Filter bar */}
      <Card>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên, loại..."
          />

          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end ml-auto">
            <FilterSelect
              value={typeFilter}
              onChange={val => setTypeFilter(val)}
              placeholder="Tất cả loại"
              options={availableTypes.map(t => ({ value: t, label: t }))}
            />
            <FilterSelect
              value={statusFilter === 'all' ? '' : statusFilter}
              onChange={val => setStatusFilter((val || 'all') as 'all' | 'active' | 'inactive')}
              placeholder="Tất cả trạng thái"
              options={[
                { value: 'active', label: 'Hiện' },
                { value: 'inactive', label: 'Ẩn' },
              ]}
            />
            <ResetFilterButton isFiltered={hasActiveFilter} onReset={resetFilters} />
            <ColumnToggle
              columns={homeColumns}
              visibleColumns={resolvedVisibleColumns}
              onToggle={(key) => {
                setVisibleColumns(prev => {
                  const base = prev.length > 0 ? prev : homeColumns.map(c => c.key);
                  return base.includes(key) ? base.filter(col => col !== key) : [...base, key];
                });
              }}
            />
          </div>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <SelectCheckbox
                    checked={selectedIds.length === sortedFiltered.length && sortedFiltered.length > 0}
                    onChange={toggleSelectAll}
                    indeterminate={selectedIds.length > 0 && selectedIds.length < sortedFiltered.length}
                  />
                </TableHead>
                <TableHead className="w-[50px]"></TableHead>
                {resolvedVisibleColumns.includes('index') && <TableHead className="w-[50px]">TT</TableHead>}
                {resolvedVisibleColumns.includes('title') && <TableHead>Tên Component</TableHead>}
                {resolvedVisibleColumns.includes('type') && <TableHead>Loại</TableHead>}
                {resolvedVisibleColumns.includes('active') && <TableHead className="text-center">Trạng thái</TableHead>}
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <SortableContext items={sortedFiltered.map(c => c._id)} strategy={verticalListSortingStrategy}>
                {sortedFiltered.map((comp, index) => (
                  <SortableRow
                    key={comp._id}
                    comp={comp as typeof comp & { config?: { preview?: string; description?: string } }}
                    index={index}
                    isSelected={selectedIds.includes(comp._id)}
                    visibleColumns={resolvedVisibleColumns}
                    onToggleSelect={() => { toggleSelectItem(comp._id); }}
                    onToggleActive={async () => toggleActive(comp._id)}
                    onDelete={async () => handleDelete(comp._id)}
                    onDuplicate={async () => handleDuplicate(comp._id)}
                  />
                ))}
              </SortableContext>
              {sortedFiltered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={resolvedVisibleColumns.length + 3} className="text-center py-8 text-slate-500">
                    {hasActiveFilter ? 'Không tìm thấy component phù hợp' : 'Chưa có component nào'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DndContext>
        {sortedFiltered.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-500">
            {hasActiveFilter
              ? `Lọc: ${sortedFiltered.length} / ${components?.length ?? 0} component`
              : `${sortedFiltered.length} component — Kéo thả để xếp thứ tự`}
          </div>
        )}
      </Card>
      </>
      ) : (
        <HomePageChromeTab />
      )}
    </div>
  );
}
