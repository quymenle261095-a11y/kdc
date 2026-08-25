export type CustomHomeTextSelection = {
  elementLabel: string;
  text: string;
  textIndex: number;
};

export type CustomHomeTextUpdateResult =
  | { source: string; success: true }
  | { message: string; success: false };

const TEXT_NODE_TYPE = 3;
const SHOW_TEXT = 4;
const FILTER_ACCEPT = 1;
const FILTER_REJECT = 2;
const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'SVG', 'MATH']);

const isFullDocument = (source: string) => /<!doctype\b/i.test(source) || /<html\b/i.test(source);

const isEditableTextNode = (node: Node) => {
  const text = node.nodeValue ?? '';
  const parent = node.parentElement;
  if (!parent || text.trim().length === 0) {
    return false;
  }
  let current: Element | null = parent;
  while (current) {
    if (IGNORED_TAGS.has(current.tagName)) {
      return false;
    }
    current = current.parentElement;
  }
  return true;
};

const getEditableTextNodes = (root: ParentNode) => {
  const ownerDocument = root instanceof Document ? root : root.ownerDocument;
  if (!ownerDocument) {
    return [];
  }

  const walker = ownerDocument.createTreeWalker(root, SHOW_TEXT, {
    acceptNode: (node) => (isEditableTextNode(node) ? FILTER_ACCEPT : FILTER_REJECT),
  });
  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
};

const serializeDocument = (doc: Document, sourceWasFullDocument: boolean) => {
  if (!sourceWasFullDocument) {
    return doc.body.innerHTML;
  }
  const doctype = doc.doctype
    ? `<!DOCTYPE ${doc.doctype.name}>`
    : '';
  return `${doctype}${doctype ? '\n' : ''}${doc.documentElement.outerHTML}`;
};

export function updateCustomHomeTextNode(
  source: string,
  selection: CustomHomeTextSelection,
  nextText: string,
): CustomHomeTextUpdateResult {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return { message: 'Visual editor chỉ chạy trong trình duyệt.', success: false };
  }

  const sourceWasFullDocument = isFullDocument(source);
  const parser = new DOMParser();
  const doc = parser.parseFromString(sourceWasFullDocument ? source : `<body>${source}</body>`, 'text/html');
  const nodes = getEditableTextNodes(doc.body);
  const node = nodes[selection.textIndex];

  if (!node) {
    return { message: 'Không tìm thấy đoạn text trong HTML gốc.', success: false };
  }
  if ((node.nodeValue ?? '') !== selection.text) {
    return { message: 'HTML đã thay đổi, vui lòng chọn lại đoạn text.', success: false };
  }

  node.nodeValue = nextText;
  return {
    source: serializeDocument(doc, sourceWasFullDocument),
    success: true,
  };
}

export function getElementLabel(element: Element | null) {
  if (!element) {
    return 'Text';
  }
  const tag = element.tagName.toLowerCase();
  const label = element.getAttribute('aria-label') || element.getAttribute('title') || '';
  return label ? `${tag} • ${label}` : tag;
}

export { getEditableTextNodes, isEditableTextNode, TEXT_NODE_TYPE };
