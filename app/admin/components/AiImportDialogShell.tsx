'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Code2,
  Copy,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  cn,
} from './ui';
import { AiDirectGeneratePanel } from './AiDirectGenerateButton';

const AI_TOOLS = [
  { id: 'chatgpt', name: 'ChatGPT', url: 'https://chatgpt.com' },
  { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com' },
  { id: 'claude', name: 'Claude', url: 'https://claude.ai' },
  { id: 'deepseek', name: 'DeepSeek', url: 'https://chat.deepseek.com' },
  { id: 'copilot', name: 'Copilot', url: 'https://copilot.microsoft.com' },
];

export interface AiImportDialogShellProps<T> {
  // 1. Quản lý trạng thái mở/đóng
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // 2. Nội dung Tiêu đề & Mô tả
  title: string;
  description?: string;

  // 3. Prompt & Mẫu JSON
  prompt: string;
  sampleJson: string;

  // 4. Tùy chọn Fill Missing (Chỉ tạo phần còn thiếu) & Toggles bổ sung
  enableFillMissing?: boolean;
  fillMissingPrompt?: string;
  fillMissingSampleJson?: string;
  fillMissingHint?: string;
  onFillMissingChange?: (isFillMissing: boolean) => void;
  extraToggles?: React.ReactNode;

  // 5. Direct AI Panel (Nếu được bật trong /system)
  directSessionId?: string;
  directSourcePath?: string;
  directPlaceholder?: string;

  // 6. Hàm xử lý Parse & Validate JSON
  parse: (rawInput: string, isFillMissing: boolean) => { data: T | null; errors: string[] };

  // 7. Render Preview kết quả trực quan & nội dung bổ sung
  renderPreview?: (data: T) => React.ReactNode;
  extraContent?: React.ReactNode;
  extraBelowPreview?: (data: T) => React.ReactNode;

  // 8. Callback khi bấm Áp dụng
  onApply: (data: T) => void | Promise<void>;
  applyButtonText?: string;
  disableApply?: boolean;
}

const cleanJsonInput = (raw: string): string => {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // 1. Tìm code block ```json ... ``` hoặc ``` ... ``` bất kỳ đâu trong chuỗi (bỏ qua text mở đầu/kết thúc của AI)
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const candidate = codeBlockMatch[1].trim();
    if (candidate.startsWith('{') || candidate.startsWith('[')) {
      return candidate;
    }
  }

  // 2. Nếu không có markdown fence, tìm từ dấu { đầu tiên đến dấu } cuối cùng (hoặc [ đến ])
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  const firstBracket = trimmed.indexOf('[');
  const lastBracket = trimmed.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    return trimmed.slice(firstBracket, lastBracket + 1);
  }

  return trimmed;
};

export function AiImportDialogShell<T>({
  open,
  onOpenChange,
  title,
  description = 'Quy trình 1 chạm: Sao chép Prompt ➔ Nhờ AI tạo JSON ➔ Dán kết quả vào đây.',
  prompt,
  sampleJson,
  enableFillMissing = false,
  fillMissingPrompt,
  fillMissingSampleJson,
  fillMissingHint,
  onFillMissingChange,
  extraToggles,
  directSessionId,
  directSourcePath,
  directPlaceholder,
  parse,
  renderPreview,
  extraContent,
  extraBelowPreview,
  onApply,
  applyButtonText = 'Áp dụng nội dung',
  disableApply = false,
}: AiImportDialogShellProps<T>) {
  const [inputJson, setInputJson] = useState('');
  const [isFillMissing, setIsFillMissing] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [showCodeDetails, setShowCodeDetails] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const handleToggleFillMissing = (checked: boolean) => {
    setIsFillMissing(checked);
    onFillMissingChange?.(checked);
  };
  // Active prompt & sample based on fillMissing mode
  const activePrompt = useMemo(() => {
    if (isFillMissing && fillMissingPrompt) {
      return fillMissingPrompt;
    }
    return prompt;
  }, [isFillMissing, fillMissingPrompt, prompt]);

  const activeSampleJson = useMemo(() => {
    if (isFillMissing && fillMissingSampleJson) {
      return fillMissingSampleJson;
    }
    return sampleJson;
  }, [isFillMissing, fillMissingSampleJson, sampleJson]);

  // Parse result calculation
  const parseResult = useMemo(() => {
    const cleaned = cleanJsonInput(inputJson);
    if (!cleaned) {
      return { data: null, errors: [] };
    }
    return parse(cleaned, isFillMissing);
  }, [inputJson, isFillMissing, parse]);

  // Reset state when closed
  React.useEffect(() => {
    if (!open) {
      setInputJson('');
      setIsFillMissing(false);
      setCopiedPrompt(false);
      setCopiedSample(false);
      setShowCodeDetails(false);
      setIsApplying(false);
    }
  }, [open]);

  // Copy Prompt handler
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(activePrompt);
      setCopiedPrompt(true);
      toast.success('Đã sao chép prompt!');
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      toast.error('Không thể tự động sao chép. Hãy mở chi tiết để copy thủ công.');
    }
  };

  // Copy Sample JSON handler
  const handleCopySample = async () => {
    try {
      await navigator.clipboard.writeText(activeSampleJson);
      setCopiedSample(true);
      toast.success('Đã sao chép JSON mẫu!');
      setTimeout(() => setCopiedSample(false), 2500);
    } catch {
      toast.error('Không thể sao chép JSON mẫu.');
    }
  };

  // 1-Click Paste from Clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text || !text.trim()) {
        toast.warning('Bộ nhớ tạm (Clipboard) đang trống.');
        return;
      }
      setInputJson(text);
      toast.success('Đã dán kết quả từ Clipboard!');
    } catch {
      toast.info('Trình duyệt chưa cấp quyền đọc Clipboard. Bạn hãy click vào ô và nhấn Ctrl + V để dán nhé.');
    }
  };

  // Apply handler
  const handleApply = async () => {
    if (!parseResult.data || parseResult.errors.length > 0) {
      toast.error('Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }
    try {
      setIsApplying(true);
      await onApply(parseResult.data);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể áp dụng dữ liệu.');
    } finally {
      setIsApplying(false);
    }
  };

  const hasData = Boolean(parseResult.data && parseResult.errors.length === 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto sm:max-w-3xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Bot size={18} />
            </div>
            <span>{title}</span>
          </DialogTitle>
          {description && (
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── Optional Direct AI Panel (Hidden by default unless enabled in /system) ── */}
        <AiDirectGeneratePanel
          prompt={activePrompt}
          sessionId={directSessionId}
          sourcePath={directSourcePath}
          placeholder={directPlaceholder}
          onGenerated={(generatedText) => {
            setInputJson(generatedText);
            toast.success('Đã nhận kết quả từ AI!');
          }}
        />

        {/* ── 3-STEP ACTION FLOW (CHUẨN TONE MÀU ADMIN) ── */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-center">
            {/* Step 1: Copy Prompt */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                1. Sao chép câu lệnh
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPrompt}
                className={cn(
                  'w-full justify-center gap-1.5 font-medium transition-all shadow-2xs text-xs h-9',
                  copiedPrompt
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                )}
              >
                {copiedPrompt ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedPrompt ? 'Đã sao chép!' : 'Sao chép Prompt'}</span>
              </Button>
            </div>

            {/* Step 2: Open Copilot */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                2. Mở AI (Khuyên dùng)
              </p>
              <a
                href="https://copilot.microsoft.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs transition-colors hover:bg-slate-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-blue-400"
              >
                <span>Mở Copilot</span>
                <ExternalLink size={12} className="text-slate-400" />
              </a>
            </div>

            {/* Step 3: 1-Click Paste from Clipboard */}
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                3. Dán kết quả về đây
              </p>
              <Button
                type="button"
                size="sm"
                onClick={handlePasteFromClipboard}
                className="w-full justify-center gap-1.5 bg-blue-600 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 h-9"
              >
                <ClipboardPaste size={14} />
                <span>Dán từ Clipboard</span>
              </Button>
            </div>
          </div>

          {/* Quick links to popular AI */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-200/80 pt-2 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span className="font-medium text-slate-600 dark:text-slate-300">Mở nhanh:</span>
            {AI_TOOLS.map((ai) => (
              <a
                key={ai.id}
                href={ai.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] text-slate-600 hover:bg-slate-200/60 hover:text-blue-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-blue-400"
              >
                <span>{ai.name}</span>
                <ExternalLink size={9} className="opacity-50" />
              </a>
            ))}
          </div>

          {/* Fill Missing Toggle Option & Extra Toggles */}
          {(enableFillMissing || extraToggles) && (
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-2.5 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-4">
                {enableFillMissing && (
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 select-none">
                    <Checkbox
                      checked={isFillMissing}
                      onCheckedChange={(checked) => handleToggleFillMissing(Boolean(checked))}
                    />
                    <span>Chỉ tạo phần còn thiếu (Giữ nguyên các dữ liệu đã nhập)</span>
                  </label>
                )}
                {extraToggles}
              </div>
              {fillMissingHint && (
                <span className="hidden text-[11px] text-slate-500 sm:inline dark:text-slate-400">
                  {fillMissingHint}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── COLLAPSIBLE TECHNICAL PROMPT & SAMPLE CODE (DEFAULT CLOSED) ── */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={() => setShowCodeDetails((prev) => !prev)}
            className="flex w-full items-center justify-between px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <div className="flex items-center gap-1.5">
              <Code2 size={13} className="text-slate-400" />
              <span>Xem chi tiết câu lệnh Prompt & JSON mẫu</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <span>{showCodeDetails ? 'Thu gọn' : 'Mở rộng'}</span>
              {showCodeDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {showCodeDetails && (
            <div className="grid grid-cols-1 gap-3 border-t border-slate-200 p-3 lg:grid-cols-2 dark:border-slate-800">
              {/* Prompt Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Prompt chuẩn
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyPrompt}
                    className="h-6 gap-1 px-2 text-[10px]"
                  >
                    {copiedPrompt ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedPrompt ? 'Đã copy' : 'Copy'}</span>
                  </Button>
                </div>
                <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white p-2.5 font-mono text-[11px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <pre className="whitespace-pre-wrap font-mono">{activePrompt}</pre>
                </div>
              </div>

              {/* Sample JSON Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    JSON mẫu
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopySample}
                    className="h-6 gap-1 px-2 text-[10px]"
                  >
                    {copiedSample ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedSample ? 'Đã copy' : 'Copy'}</span>
                  </Button>
                </div>
                <div className="max-h-44 overflow-y-auto rounded-md border border-slate-200 bg-white p-2.5 font-mono text-[11px] leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                  <pre className="whitespace-pre-wrap font-mono">{activeSampleJson}</pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── PASTE / INPUT SECTION ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Kết quả phản hồi từ AI
            </Label>
            {inputJson && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setInputJson('')}
                className="h-6 gap-1 text-[11px] text-slate-500 hover:text-red-600"
              >
                <RotateCcw size={11} />
                <span>Xóa làm lại</span>
              </Button>
            )}
          </div>

          <textarea
            value={inputJson}
            onChange={(e) => setInputJson(e.target.value)}
            placeholder="Dán nội dung JSON từ AI vào đây (hoặc bấm nút 'Dán từ Clipboard' ở Bước 3)..."
            className="min-h-[110px] w-full rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>

        {/* ── EXTRA CONTENT (IF ANY) ── */}
        {extraContent}

        {/* ── VALIDATION ERRORS OR SUCCESS VISUAL PREVIEW ── */}
        {parseResult.errors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50/70 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertTriangle size={14} className="shrink-0" />
              <span>Dữ liệu AI chưa đúng định dạng:</span>
            </div>
            <ul className="mt-1 list-inside list-disc space-y-0.5 pl-1 text-[11px]">
              {parseResult.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {hasData && (
          <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <Check size={14} className="text-blue-600 dark:text-blue-400" />
              <span>Dữ liệu AI hợp lệ — Xem trước kết quả:</span>
            </div>
            {renderPreview ? (
              <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
                {renderPreview(parseResult.data as T)}
              </div>
            ) : (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Đã nhận diện thành công dữ liệu từ AI. Nhấn &quot;{applyButtonText}&quot; để lưu.
              </p>
            )}
            {extraBelowPreview && extraBelowPreview(parseResult.data as T)}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isApplying}
          >
            Đóng
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={!hasData || isApplying || disableApply}
            className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {isApplying ? 'Đang áp dụng...' : applyButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
