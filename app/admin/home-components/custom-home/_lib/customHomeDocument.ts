export type CustomHomeHeightMode = 'auto' | 'fixed';

export type CustomHomeConfig = {
  allowForms?: boolean;
  allowPopups?: boolean;
  allowScripts?: boolean;
  css?: string;
  heightMode?: CustomHomeHeightMode;
  isolateBackground?: boolean;
  js?: string;
  minHeight?: number;
  preview?: string;
  source?: string;
};

export const DEFAULT_CUSTOM_HOME_SOURCE = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Custom Home</title>
  <style>
    body {
      margin: 0;
      font-family: var(--va-font-active);
      background: var(--va-color-background);
      color: var(--va-color-foreground);
    }
    .hero {
      min-height: 72vh;
      display: grid;
      place-items: center;
      padding: 64px 20px;
      text-align: center;
      background:
        radial-gradient(circle at top left, var(--va-color-primary-soft), transparent 36%),
        linear-gradient(135deg, var(--va-color-background), var(--va-color-surface));
    }
    .badge {
      display: inline-flex;
      border-radius: 999px;
      padding: 8px 14px;
      background: var(--va-color-primary-soft);
      color: var(--va-color-primary);
      font-size: 13px;
      font-weight: 700;
    }
    h1 {
      margin: 18px auto 0;
      max-width: 760px;
      font-size: clamp(40px, 8vw, 96px);
      line-height: .92;
      letter-spacing: -.06em;
    }
    p {
      max-width: 560px;
      margin: 22px auto 0;
      color: var(--va-color-muted);
      font-size: clamp(16px, 2vw, 20px);
      line-height: 1.7;
    }
    a {
      display: inline-flex;
      margin-top: 32px;
      border-radius: 999px;
      padding: 13px 22px;
      background: var(--va-color-primary);
      color: var(--va-color-primary-foreground);
      text-decoration: none;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main class="hero">
    <div>
      <span class="badge">Custom Home Component</span>
      <h1>Giao diện custom vẫn chạy trong hệ thống VietAdmin</h1>
      <p>Dán HTML/CSS/JS của khách vào đây. Nên dùng các biến token như <code>var(--va-color-primary)</code> để đồng bộ màu, dark mode và font.</p>
      <a href="/lien-he">Bắt đầu</a>
    </div>
  </main>
</body>
</html>`;

export const DEFAULT_CUSTOM_HOME_CONFIG: CustomHomeConfig = {
  allowForms: true,
  allowPopups: true,
  allowScripts: true,
  css: '',
  heightMode: 'fixed',
  isolateBackground: true,
  js: '',
  minHeight: 640,
  preview: 'Custom HTML/CSS/JS sandbox',
  source: DEFAULT_CUSTOM_HOME_SOURCE,
};

const EMPTY_CUSTOM_HOME_SOURCE = `<main style="min-height: 420px; display: grid; place-items: center; padding: 40px 20px; font-family: var(--va-font-active); color: var(--va-color-muted); background: var(--va-color-background);">
  <div style="text-align: center;">
    <strong style="display: block; color: var(--va-color-foreground); font-size: 20px;">Chưa có mã custom</strong>
    <span>Dán HTML/CSS/JS trong admin để hiển thị giao diện tại đây.</span>
  </div>
</main>`;

const clampHeight = (value: unknown) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_CUSTOM_HOME_CONFIG.minHeight ?? 640;
  }
  return Math.min(4000, Math.max(160, Math.round(parsed)));
};

const getString = (value: unknown, fallback = '') => (
  typeof value === 'string' ? value : fallback
);

export function normalizeCustomHomeConfig(value: unknown): CustomHomeConfig {
  const record = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const source = getString(record.source, getString(record.html, DEFAULT_CUSTOM_HOME_CONFIG.source));
  
  const heightMode = record.heightMode === 'auto' || record.heightMode === 'fixed'
    ? record.heightMode
    : DEFAULT_CUSTOM_HOME_CONFIG.heightMode;

  return {
    allowForms: typeof record.allowForms === 'boolean' ? record.allowForms : DEFAULT_CUSTOM_HOME_CONFIG.allowForms,
    allowPopups: typeof record.allowPopups === 'boolean' ? record.allowPopups : DEFAULT_CUSTOM_HOME_CONFIG.allowPopups,
    allowScripts: typeof record.allowScripts === 'boolean' ? record.allowScripts : DEFAULT_CUSTOM_HOME_CONFIG.allowScripts,
    css: getString(record.css),
    heightMode,
    isolateBackground: typeof record.isolateBackground === 'boolean' ? record.isolateBackground : DEFAULT_CUSTOM_HOME_CONFIG.isolateBackground,
    js: getString(record.js),
    minHeight: record.minHeight !== undefined ? clampHeight(record.minHeight) : DEFAULT_CUSTOM_HOME_CONFIG.minHeight,
    preview: getString(record.preview, getCustomHomePreviewText(source)),
    source,
  };
}

export function getCustomHomePreviewText(source: string) {
  const text = source
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, 160) || 'Custom HTML/CSS/JS sandbox';
}

const injectIntoHead = (documentHtml: string, content: string) => {
  if (/<\/head>/i.test(documentHtml)) {
    return documentHtml.replace(/<\/head>/i, `${content}</head>`);
  }
  if (/<body\b/i.test(documentHtml)) {
    return documentHtml.replace(/<body\b/i, `<head>${content}</head><body`);
  }
  if (/<html\b[^>]*>/i.test(documentHtml)) {
    return documentHtml.replace(/<html\b[^>]*>/i, (match) => `${match}<head>${content}</head>`);
  }
  return `<head>${content}</head>${documentHtml}`;
};

const injectIntoBodyEnd = (documentHtml: string, content: string) => {
  if (/<\/body>/i.test(documentHtml)) {
    return documentHtml.replace(/<\/body>/i, `${content}</body>`);
  }
  if (/<\/html>/i.test(documentHtml)) {
    return documentHtml.replace(/<\/html>/i, `${content}</html>`);
  }
  return `${documentHtml}${content}`;
};

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const escapeScript = (value: string) => value.replace(/<\/script/gi, '<\\/script');

const ensureDocumentShell = (source: string, title: string) => {
  const trimmed = source.trim() || EMPTY_CUSTOM_HOME_SOURCE;
  if (/<html\b/i.test(trimmed)) {
    return trimmed;
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title || 'Custom Home')}</title>
</head>
<body>
${trimmed}
</body>
</html>`;
};

const setThemeAttribute = (documentHtml: string, theme: 'light' | 'dark') => {
  if (!/<html\b[^>]*>/i.test(documentHtml)) {
    return documentHtml;
  }

  return documentHtml.replace(/<html\b([^>]*)>/i, (_match, attrs: string) => {
    const cleanAttrs = attrs.replace(/\sdata-theme=(["']).*?\1/i, '');
    return `<html${cleanAttrs} data-theme="${theme}">`;
  });
};

const buildTokenStyle = (params: {
  brandColor: string;
  fontFamily: string;
  isDark: boolean;
  isolateBackground: boolean;
  secondary: string;
  viewportHeight: number;
}) => {
  const background = params.isDark ? '#020617' : '#ffffff';
  const surface = params.isDark ? '#0f172a' : '#f8fafc';
  const foreground = params.isDark ? '#f8fafc' : '#0f172a';
  const muted = params.isDark ? '#cbd5e1' : '#475569';
  const border = params.isDark ? 'rgba(148, 163, 184, .28)' : 'rgba(15, 23, 42, .12)';
  const bodyBackground = params.isolateBackground ? 'transparent' : 'var(--va-color-background)';

  return `<style id="vietadmin-custom-home-tokens">
:root {
  --va-color-primary: ${params.brandColor};
  --va-color-secondary: ${params.secondary};
  --va-color-primary-soft: color-mix(in srgb, var(--va-color-primary) 13%, transparent);
  --va-color-secondary-soft: color-mix(in srgb, var(--va-color-secondary) 13%, transparent);
  --va-color-primary-foreground: #ffffff;
  --va-color-background: ${background};
  --va-color-surface: ${surface};
  --va-color-foreground: ${foreground};
  --va-color-muted: ${muted};
  --va-color-border: ${border};
  --va-font-active: ${params.fontFamily};
  --va-screen-height: ${params.viewportHeight}px;
}
html {
  background: ${bodyBackground};
}
html,
body {
  margin: 0;
  min-width: 0;
  overflow-x: hidden !important;
  overflow-y: visible !important;
  scrollbar-width: none;
}
html::-webkit-scrollbar,
body::-webkit-scrollbar {
  display: none;
}
*,
*::before,
*::after {
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
*::-webkit-scrollbar {
  width: 0 !important;
  height: 0 !important;
  display: none !important;
}
a {
  color: inherit;
}
img, video, canvas, svg {
  max-width: 100%;
}
* {
  box-sizing: border-box;
}
.h-screen,
.h-\\[100vh\\],
.h-\\[100dvh\\],
.h-\\[100svh\\] {
  height: var(--va-screen-height) !important;
}
.min-h-screen,
.min-h-\\[100vh\\],
.min-h-\\[100dvh\\],
.min-h-\\[100svh\\] {
  min-height: var(--va-screen-height) !important;
}
.max-h-screen,
.max-h-\\[100vh\\],
.max-h-\\[100dvh\\],
.max-h-\\[100svh\\] {
  max-height: var(--va-screen-height) !important;
}
</style>`;
};

const buildBridgeScript = (componentId: string, minHeight: number) => `<script id="vietadmin-custom-home-bridge">
(function () {
  var componentId = ${JSON.stringify(componentId)};
  var minHeight = ${minHeight};
  var lastHeight = 0;
  var ignoredTags = { SCRIPT: true, STYLE: true, LINK: true, META: true, TITLE: true, TEMPLATE: true, BASE: true };
  function isInsideFixed(node) {
    var current = node;
    while (current && current !== document.body) {
      var style = window.getComputedStyle(current);
      if (style && style.position === 'fixed') return true;
      current = current.parentElement;
    }
    return false;
  }
  function getFlowBottom() {
    var body = document.body;
    if (!body) return 0;
    var bottom = 0;
    var nodes = body.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      if (!node || ignoredTags[node.tagName]) continue;
      var style = window.getComputedStyle(node);
      if (!style || style.display === 'none' || style.position === 'fixed') continue;
      if (isInsideFixed(node)) continue;
      var rect = node.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) continue;
      bottom = Math.max(bottom, rect.bottom + (window.scrollY || 0));
    }
    return Math.ceil(bottom);
  }
  function getHeight() {
    var body = document.body;
    var html = document.documentElement;
    var flowBottom = getFlowBottom();
    if (flowBottom > 0) return flowBottom;
    return Math.max(1, body ? body.scrollHeight : 0, html ? html.scrollHeight : 0, minHeight);
  }
  function sendHeight() {
    var nextHeight = getHeight();
    if (Math.abs(nextHeight - lastHeight) < 2) return;
    lastHeight = nextHeight;
    parent.postMessage({ type: 'vietadmin:custom-home:height', id: componentId, height: nextHeight }, '*');
  }
  window.addEventListener('load', sendHeight);
  window.addEventListener('resize', sendHeight);
  if ('ResizeObserver' in window) {
    var observer = new ResizeObserver(sendHeight);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }
  if ('MutationObserver' in window && document.body) {
    var mutationObserver = new MutationObserver(sendHeight);
    mutationObserver.observe(document.body, { attributes: true, childList: true, subtree: true });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(sendHeight).catch(function () {});
  }
  Array.prototype.forEach.call(document.images || [], function (image) {
    if (!image.complete) {
      image.addEventListener('load', sendHeight, { once: true });
      image.addEventListener('error', sendHeight, { once: true });
    }
  });
  var ticks = 0;
  var interval = setInterval(function () {
    ticks += 1;
    sendHeight();
    if (ticks >= 80) clearInterval(interval);
  }, 100);
  setTimeout(sendHeight, 50);
  setTimeout(sendHeight, 400);
  setTimeout(sendHeight, 1200);
})();
</script>`;

export function buildCustomHomeSandbox(config: CustomHomeConfig) {
  const tokens = ['allow-downloads', 'allow-same-origin'];
  if (config.allowScripts) {
    tokens.push('allow-scripts');
  }
  if (config.allowForms) {
    tokens.push('allow-forms');
  }
  if (config.allowPopups) {
    tokens.push('allow-popups');
  }
  return tokens.join(' ');
}

export function buildCustomHomeSrcDoc(params: {
  brandColor: string;
  componentId: string;
  config: CustomHomeConfig;
  fontFamily?: string;
  isDark?: boolean;
  secondary: string;
  title: string;
}) {
  const config = normalizeCustomHomeConfig(params.config);
  const theme = params.isDark ? 'dark' : 'light';
  const fontFamily = params.fontFamily || 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  const headContent = [
    '<meta charset="UTF-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '<base target="_blank" />',
    buildTokenStyle({
      brandColor: params.brandColor,
      fontFamily,
      isDark: Boolean(params.isDark),
      isolateBackground: Boolean(config.isolateBackground),
      secondary: params.secondary,
      viewportHeight: config.minHeight ?? 640,
    }),
    config.css?.trim() ? `<style id="vietadmin-custom-home-extra-css">${config.css}</style>` : '',
  ].filter(Boolean).join('\n');
  const bodyContent = [
    config.allowScripts ? buildBridgeScript(params.componentId, config.minHeight ?? 640) : '',
    config.allowScripts && config.js?.trim()
      ? `<script id="vietadmin-custom-home-extra-js">${escapeScript(config.js)}</script>`
      : '',
  ].filter(Boolean).join('\n');

  let documentHtml = ensureDocumentShell(config.source ?? '', params.title);
  documentHtml = setThemeAttribute(documentHtml, theme);
  documentHtml = injectIntoHead(documentHtml, headContent);
  documentHtml = injectIntoBodyEnd(documentHtml, bodyContent);
  return documentHtml;
}
