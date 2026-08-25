'use client';

import React from 'react';
import { cn } from '@/app/admin/components/ui';
import {
  buildCustomHomeSandbox,
  buildCustomHomeSrcDoc,
  normalizeCustomHomeConfig,
  type CustomHomeConfig,
} from '@/app/admin/home-components/custom-home/_lib/customHomeDocument';
import {
  getEditableTextNodes,
} from '@/app/admin/home-components/custom-home/_lib/customHomeTextEditing';
import { FONT_REGISTRY_BY_KEY } from '@/lib/fonts/registry';
import type { HomeComponentSectionProps } from '../types';

type CustomHomeRuntimeSectionProps = HomeComponentSectionProps & {
  editorBridge?: {
    enabled: boolean;
    onTextUpdate?: (textIndex: number, newText: string) => void;
  };
  fontKey?: string;
  isDark?: boolean;
};

const getFontFamily = (fontKey?: string) => {
  const label = fontKey ? FONT_REGISTRY_BY_KEY[fontKey]?.label : null;
  return label
    ? `"${label}", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
    : 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
};

export function CustomHomeRuntimeSection({
  config,
  brandColor,
  secondary,
  title,
  isDark,
  fontKey,
  editorBridge,
}: CustomHomeRuntimeSectionProps) {
  const componentId = React.useId();
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const iframeCleanupRef = React.useRef<(() => void) | null>(null);
  const editorCleanupRef = React.useRef<(() => void) | null>(null);
  const editorEnabled = editorBridge?.enabled === true;
  const resolvedConfig = React.useMemo(
    () => normalizeCustomHomeConfig(config as CustomHomeConfig),
    [config],
  );
  const minHeight = resolvedConfig.minHeight ?? 640;
  const [autoHeight, setAutoHeight] = React.useState(minHeight);
  const applyMeasuredHeight = React.useCallback((nextHeight: number) => {
    if (!Number.isFinite(nextHeight)) {
      return;
    }
    setAutoHeight(Math.min(30000, Math.max(1, Math.ceil(nextHeight))));
  }, []);

  const measureIframeDocument = React.useCallback(() => {
    const doc = iframeRef.current?.contentDocument;
    const body = doc?.body;
    const html = doc?.documentElement;
    if (!doc || !body || !html) {
      return;
    }

    const ignoredTags = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'TEMPLATE', 'BASE']);
    const isInsideFixed = (element: Element) => {
      let current: Element | null = element;
      while (current && current !== body) {
        const style = doc.defaultView?.getComputedStyle(current);
        if (style?.position === 'fixed') {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    };

    let bottom = 0;
    body.querySelectorAll('*').forEach((node) => {
      const element = node as Element;
      if (ignoredTags.has(element.tagName) || isInsideFixed(element)) {
        return;
      }
      const style = doc.defaultView?.getComputedStyle(element);
      if (!style || style.display === 'none' || style.position === 'fixed') {
        return;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        return;
      }
      bottom = Math.max(bottom, rect.bottom + (doc.defaultView?.scrollY ?? 0));
    });

    const fallbackHeight = Math.max(body.scrollHeight, body.offsetHeight, html.scrollHeight, html.offsetHeight);
    applyMeasuredHeight(bottom > 0 ? bottom : fallbackHeight);
  }, [applyMeasuredHeight]);

  const clearEditorState = React.useCallback((doc: Document) => {
    doc.body?.removeAttribute('data-va-editor');
    doc.querySelectorAll('[data-va-editor-selected="true"]').forEach((element) => {
      element.removeAttribute('data-va-editor-selected');
    });
  }, []);

  const attachEditorBridge = React.useCallback(() => {
    editorCleanupRef.current?.();
    editorCleanupRef.current = null;

    const doc = iframeRef.current?.contentDocument;
    const body = doc?.body;
    const head = doc?.head;
    const view = doc?.defaultView;
    if (!doc || !body || !head || !view) {
      return;
    }
    clearEditorState(doc);

    if (!editorEnabled) {
      return;
    }

    body.setAttribute('data-va-editor', 'true');
    const style = doc.createElement('style');
    style.id = 'vietadmin-custom-home-visual-editor';
    style.textContent = `
body[data-va-editor="true"] [contenteditable="true"] {
  outline: 1px dashed #2563eb !important;
  outline-offset: 2px !important;
  cursor: text !important;
}
body[data-va-editor="true"] [contenteditable="true"]:hover {
  background-color: rgba(37, 99, 235, 0.03) !important;
}
body[data-va-editor="true"] [contenteditable="true"]:focus,
body[data-va-editor="true"] [data-va-editor-selected="true"] {
  outline: 2px solid #2563eb !important;
  outline-offset: 3px !important;
  border-radius: 4px !important;
  background-color: rgba(37, 99, 235, 0.06) !important;
}
body[data-va-editor="true"] a,
body[data-va-editor="true"] button,
body[data-va-editor="true"] [role="button"],
body[data-va-editor="true"] [onclick] {
  cursor: text !important;
}
`;
    head.appendChild(style);

    const nodes = getEditableTextNodes(body);
    nodes.forEach((node, index) => {
      const parent = node.parentElement;
      if (parent) {
        parent.setAttribute('contenteditable', 'true');
        parent.setAttribute('data-va-editable-index', String(index));
      }
    });

    let initialText = '';
    let activeNodeIndex: number | null = null;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !target.hasAttribute('contenteditable')) {
        return;
      }
      const indexAttr = target.getAttribute('data-va-editable-index');
      if (indexAttr === null) {
        return;
      }
      const index = parseInt(indexAttr, 10);
      const currentNodes = getEditableTextNodes(body);
      const node = currentNodes[index];
      if (node) {
        activeNodeIndex = index;
        initialText = node.nodeValue ?? '';
        target.setAttribute('data-va-editor-selected', 'true');
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (activeNodeIndex === null) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      target.removeAttribute('data-va-editor-selected');
      const currentNodes = getEditableTextNodes(body);
      const node = currentNodes[activeNodeIndex];
      if (node) {
        const currentText = target.textContent ?? '';
        if (currentText !== initialText) {
          editorBridge?.onTextUpdate?.(activeNodeIndex, currentText);
        }
      }
      activeNodeIndex = null;
      initialText = '';
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target.hasAttribute('contenteditable')) {
        if (event.key === 'Enter') {
          event.preventDefault();
          target.blur();
        } else if (event.key === 'Escape') {
          if (activeNodeIndex !== null) {
            const currentNodes = getEditableTextNodes(body);
            const node = currentNodes[activeNodeIndex];
            if (node) {
              target.textContent = initialText;
            }
          }
          event.preventDefault();
          target.blur();
        }
      }
    };

    const handleCaptureClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const editable = target.closest('[contenteditable="true"]');
      if (editable) {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          event.preventDefault();
        }
      }
    };

    body.addEventListener('focusin', handleFocusIn);
    body.addEventListener('focusout', handleFocusOut);
    body.addEventListener('keydown', handleKeyDown);
    body.addEventListener('click', handleCaptureClick, true);

    editorCleanupRef.current = () => {
      body.removeEventListener('focusin', handleFocusIn);
      body.removeEventListener('focusout', handleFocusOut);
      body.removeEventListener('keydown', handleKeyDown);
      body.removeEventListener('click', handleCaptureClick, true);
      
      const currentNodes = getEditableTextNodes(body);
      currentNodes.forEach((node) => {
        const parent = node.parentElement;
        if (parent) {
          parent.removeAttribute('contenteditable');
          parent.removeAttribute('data-va-editable-index');
          parent.removeAttribute('data-va-editor-selected');
        }
      });
      style.remove();
      clearEditorState(doc);
    };
  }, [clearEditorState, editorEnabled, editorBridge]);

  React.useEffect(() => {
    setAutoHeight(minHeight);
  }, [componentId, minHeight, resolvedConfig.source, resolvedConfig.css, resolvedConfig.js]);

  React.useEffect(() => {
    if (!resolvedConfig.allowScripts) {
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') {
        return;
      }
      const payload = data as { height?: unknown; id?: unknown; type?: unknown };
      if (payload.type !== 'vietadmin:custom-home:height' || payload.id !== componentId) {
        return;
      }
      const nextHeight = typeof payload.height === 'number' ? payload.height : minHeight;
      if (!Number.isFinite(nextHeight)) {
        return;
      }
      applyMeasuredHeight(nextHeight);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [applyMeasuredHeight, componentId, minHeight, resolvedConfig.allowScripts]);

  const handleIframeLoad = React.useCallback(() => {
    iframeCleanupRef.current?.();
    iframeCleanupRef.current = null;
    editorCleanupRef.current?.();
    editorCleanupRef.current = null;
    measureIframeDocument();
    const doc = iframeRef.current?.contentDocument;
    const body = doc?.body;
    const html = doc?.documentElement;
    if (!doc || !body || !html) {
      return;
    }

    const timers = [50, 250, 800, 1600, 3000].map((delay) => window.setTimeout(measureIframeDocument, delay));
    const interval = window.setInterval(measureIframeDocument, 500);
    window.setTimeout(() => window.clearInterval(interval), 8000);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(measureIframeDocument);
      resizeObserver.observe(html);
      resizeObserver.observe(body);
    }

    let mutationObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== 'undefined') {
      mutationObserver = new MutationObserver(measureIframeDocument);
      mutationObserver.observe(body, { attributes: true, childList: true, subtree: true });
    }

    iframeCleanupRef.current = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearInterval(interval);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
    attachEditorBridge();
  }, [attachEditorBridge, measureIframeDocument]);

  const srcDoc = React.useMemo(
    () => buildCustomHomeSrcDoc({
      brandColor,
      componentId,
      config: resolvedConfig,
      fontFamily: getFontFamily(fontKey),
      isDark,
      secondary,
      title,
    }),
    [brandColor, componentId, fontKey, isDark, resolvedConfig, secondary, title],
  );
  const sandbox = React.useMemo(() => buildCustomHomeSandbox(resolvedConfig), [resolvedConfig]);
  const height = Math.max(minHeight, autoHeight);

  React.useEffect(() => {
    attachEditorBridge();
    return () => {
      editorCleanupRef.current?.();
      editorCleanupRef.current = null;
    };
  }, [attachEditorBridge, srcDoc]);

  React.useEffect(() => () => {
    iframeCleanupRef.current?.();
    iframeCleanupRef.current = null;
    editorCleanupRef.current?.();
    editorCleanupRef.current = null;
  }, [srcDoc]);

  return (
    <section className="relative z-0 w-full overflow-hidden">
      <iframe
        ref={iframeRef}
        title={title || 'Custom Home'}
        srcDoc={srcDoc}
        sandbox={sandbox}
        referrerPolicy="no-referrer"
        loading="lazy"
        scrolling="no"
        onLoad={handleIframeLoad}
        className={cn('block w-full border-0 bg-transparent')}
        style={{ height, overflow: 'hidden' }}
      />
    </section>
  );
}
