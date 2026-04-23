'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { Download, FileUp, Loader2, PackageCheck, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/admin/components/ui';
import {
  createHomepageSnapshotZip,
  parseHomepageSnapshotFile,
} from '@/lib/homepage-snapshot/client';
import type {
  HomepageSnapshotImportReport,
  HomepageSnapshotPayload,
} from '@/lib/homepage-snapshot/types';

type HomepageSnapshotDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function HomepageSnapshotDialog({ open, onOpenChange }: HomepageSnapshotDialogProps) {
  const captureSnapshot = useQuery(api.homepageSnapshots.captureHomepageSnapshot, { label: 'Tạo nhanh snapshot' }) as HomepageSnapshotPayload | undefined;
  const savedSnapshots = useQuery(api.homepageSnapshots.listHomepageSnapshots) ?? [];
  const preflightSnapshot = useMutation(api.homepageSnapshots.preflightHomepageSnapshot);
  const importSnapshot = useMutation(api.homepageSnapshots.importHomepageSnapshot);
  const saveSnapshot = useMutation(api.homepageSnapshots.saveHomepageSnapshot);
  const applySnapshot = useMutation(api.homepageSnapshots.applyHomepageSnapshot);
  const removeSnapshot = useMutation(api.homepageSnapshots.removeHomepageSnapshot);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const saveImage = useMutation(api.storage.saveImage);
  const cleanupImportedBinOrphans = useMutation(api.storage.cleanupImportedBinOrphans);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingId, setIsApplyingId] = useState<string | null>(null);
  const [profileLabel, setProfileLabel] = useState('');
  const [parsedBundle, setParsedBundle] = useState<Awaited<ReturnType<typeof parseHomepageSnapshotFile>> | null>(null);
  const [report, setReport] = useState<HomepageSnapshotImportReport | null>(null);

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    if (!captureSnapshot) {
      toast.error('Snapshot chưa sẵn sàng');
      return;
    }
    setIsExporting(true);
    try {
      const zip = await createHomepageSnapshotZip(captureSnapshot);
      downloadBlob(zip, `homepage-snapshot-${new Date().toISOString().slice(0, 10)}.zip`);
      toast.success('Đã export snapshot ZIP');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Export snapshot thất bại');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!captureSnapshot) {
      toast.error('Snapshot chưa sẵn sàng');
      return;
    }
    setIsSaving(true);
    try {
      await saveSnapshot({
        label: profileLabel.trim() || `zip ${savedSnapshots.length + 1}`,
        payload: captureSnapshot,
      });
      setProfileLabel('');
      toast.success('Đã lưu profile giao diện');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể lưu profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {return;}
    try {
      const parsed = await parseHomepageSnapshotFile(file);
      setParsedBundle(parsed);
      const nextReport = await preflightSnapshot({ payload: parsed.payload }) as HomepageSnapshotImportReport;
      setReport(nextReport);
      toast.success(`Đã tải snapshot: ${parsed.fileName}`);
    } catch (error) {
      setParsedBundle(null);
      setReport(null);
      toast.error(error instanceof Error ? error.message : 'File snapshot không hợp lệ');
    }
  };

  const handleImport = async () => {
    if (!parsedBundle || !report) {
      toast.error('Cần chọn snapshot hợp lệ trước');
      return;
    }
    if (report.summary.blocking > 0) {
      toast.error('Snapshot đang có lỗi blocking');
      return;
    }

    setIsImporting(true);
    try {
      const uploadedMediaMap: Record<string, { url: string; storageId?: string | null }> = {};
      for (const media of parsedBundle.mediaFiles) {
        const uploadUrl = await generateUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': media.file.type || 'application/octet-stream' },
          body: media.file,
        });
        if (!response.ok) {
          throw new Error(`Upload media thất bại: ${media.logicalPath}`);
        }
        const body = await response.json() as { storageId: string };
        const saved = await saveImage({
          storageId: body.storageId as Id<'_storage'>,
          filename: media.file.name,
          folder: media.logicalPath.split('/').slice(0, -1).join('/'),
          mimeType: media.file.type || 'application/octet-stream',
          size: media.file.size,
        });
        uploadedMediaMap[media.logicalPath] = {
          url: saved.url ?? media.logicalPath,
          storageId: body.storageId,
        };
      }

      const result = await importSnapshot({
        payload: parsedBundle.payload,
        mode: 'replace_all',
        uploadedMediaMap,
      }) as { applied: boolean; created: number; report: HomepageSnapshotImportReport };

      setReport(result.report);
      if (!result.applied) {
        toast.error('Import snapshot bị chặn');
        return;
      }
      const cleanup = await cleanupImportedBinOrphans({});
      toast.success(`Đã replace ${result.created} home-component từ snapshot`);
      if (cleanup.deleted > 0) {
        toast.success(`Đã dọn ${cleanup.deleted} file .bin dư`);
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import snapshot thất bại');
    } finally {
      setIsImporting(false);
    }
  };

  const handleApplySavedProfile = async (snapshotId: string) => {
    setIsApplyingId(snapshotId);
    try {
      const result = await applySnapshot({ snapshotId: snapshotId as Id<'homeComponentSnapshots'>, mode: 'replace_all' }) as { applied: boolean; created: number };
      if (!result.applied) {
        toast.error('Áp dụng profile bị chặn');
        return;
      }
      toast.success(`Đã áp dụng profile với ${result.created} component`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể áp dụng profile');
    } finally {
      setIsApplyingId(null);
    }
  };

  const handleDeleteSavedProfile = async (snapshotId: string) => {
    try {
      await removeSnapshot({ snapshotId: snapshotId as Id<'homeComponentSnapshots'> });
      toast.success('Đã xóa profile');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể xóa profile');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-cyan-500" />
            Tạo nhanh
          </DialogTitle>
          <DialogDescription>
            Snapshot bộ homepage thật để export/import giữa nhiều dự án, có fallback tĩnh khi thiếu dữ liệu động.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Snapshot hiện tại</div>
            <div className="text-sm text-slate-500">
              {captureSnapshot
                ? `${captureSnapshot.manifest.componentCount} component, ${captureSnapshot.index.mediaIndex.length} media refs`
                : 'Đang chuẩn bị snapshot...'}
            </div>
            <Button variant="accent" onClick={() => { void handleExport(); }} disabled={isExporting || !captureSnapshot}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export ZIP
            </Button>
            <div className="flex gap-2">
              <input
                value={profileLabel}
                onChange={(event) => setProfileLabel(event.target.value)}
                placeholder="Tên profile, ví dụ zip 1"
                className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              <Button variant="outline" onClick={() => { void handleSaveProfile(); }} disabled={isSaving || !captureSnapshot}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Lưu profile
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Kho profile giao diện</div>
            {savedSnapshots.length === 0 ? (
              <div className="text-sm text-slate-500">Chưa có profile nào được lưu.</div>
            ) : (
              <div className="space-y-2">
                {savedSnapshots.map((item) => (
                  <div key={item._id} className="flex items-center justify-between rounded-md bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.componentCount} component · {new Date(item.createdAt).toLocaleString('vi-VN')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { void handleApplySavedProfile(item._id); }} disabled={isApplyingId === item._id}>
                        {isApplyingId === item._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Áp dụng
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => { void handleDeleteSavedProfile(item._id); }}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">Import snapshot ZIP</div>
            <label className="inline-flex">
              <input type="file" accept=".zip,application/zip" className="hidden" onChange={(event) => { void handleFileChange(event); }} />
              <Button
                type="button"
                variant="outline"
                onClick={(event) => {
                  const input = event.currentTarget.parentElement?.querySelector('input[type=file]') as HTMLInputElement | null;
                  input?.click();
                }}
              >
                <FileUp className="mr-2 h-4 w-4" />
                Chọn ZIP
              </Button>
            </label>

            {parsedBundle ? (
              <div className="space-y-2 rounded-md bg-slate-50 dark:bg-slate-900 p-3 text-sm">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 text-emerald-600" />
                  <span>{parsedBundle.fileName}</span>
                </div>
                <div className="text-slate-500">
                  {parsedBundle.payload.homepage.components.length} component, {parsedBundle.mediaFiles.length} media files
                </div>
                {report ? (
                  <div className="text-xs text-slate-500">
                    Blocking: {report.summary.blocking} · Warning: {report.summary.warnings}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
          <Button onClick={() => { void handleImport(); }} disabled={!parsedBundle || !report || isImporting || report.summary.blocking > 0}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Import replace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
