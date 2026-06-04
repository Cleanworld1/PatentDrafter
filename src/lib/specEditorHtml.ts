const HTML_TABLE_RE = /<(table|thead|tbody|tfoot|tr|th|td|caption)\b/i;
export const TABLE_BLOCK_RE = /(<table[\s\S]*?<\/table>)/gi;

const ALLOWED_TAGS = new Set([
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "p",
  "br",
  "div",
  "span",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "sub",
  "sup"
]);

const FORBIDDEN_ATTR_RE =
  /\s(on\w+|style|class|id|data-[\w-]+)\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;

export function hasRenderableHtml(content: string): boolean {
  return HTML_TABLE_RE.test(content);
}

export function shouldUseHtmlEditor(content: string): boolean {
  return hasRenderableHtml(content) || /<div class="spec-prose"/i.test(content);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 저장 문자열 → 편집기 innerHTML */
export function contentToEditorHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  if (/<div class="spec-prose"/i.test(trimmed)) {
    return sanitizeSpecHtml(trimmed);
  }

  const parts = trimmed.split(TABLE_BLOCK_RE).filter((p) => p.length > 0);
  if (parts.length <= 1 && !/^<table/i.test(trimmed)) {
    return sanitizeSpecHtml(trimmed);
  }

  return parts
    .map((part) => {
      const piece = part.trim();
      if (!piece) return "";
      if (/^<table/i.test(piece)) {
        return sanitizeSpecHtml(piece);
      }
      const inner = escapeHtml(piece).replace(/\n/g, "<br>");
      return `<div class="spec-prose">${inner}</div>`;
    })
    .join("");
}

function stripForbiddenAttributes(tagHtml: string): string {
  return tagHtml.replace(FORBIDDEN_ATTR_RE, "");
}

function sanitizeWithRegex(html: string): string {
  let out = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  out = out.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag: string) => {
    const lower = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(lower)) return "";
    if (match.startsWith("</")) return `</${lower}>`;
    const cleaned = stripForbiddenAttributes(match);
    const nameMatch = cleaned.match(/^<([a-z][a-z0-9]*)/i);
    if (!nameMatch) return "";
    if (lower === "br") return "<br>";
    if (/\/\s*>$/.test(cleaned)) return `<${lower}>`;
    return `<${lower}>`;
  });

  return out;
}

function sanitizeElement(root: Element): void {
  const toRemove: Element[] = [];
  for (const el of root.querySelectorAll("*")) {
    const tag = el.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      toRemove.push(el);
      continue;
    }
    for (const attr of [...el.attributes]) {
      if (attr.name.startsWith("on") || attr.name === "style") {
        el.removeAttribute(attr.name);
      }
      if (attr.name === "class") {
        const allowed = tag === "div" && attr.value === "spec-prose";
        if (!allowed) el.removeAttribute("class");
      }
    }
  }
  for (const el of toRemove) {
    const parent = el.parentNode;
    if (!parent) continue;
    while (el.firstChild) {
      parent.insertBefore(el.firstChild, el);
    }
    parent.removeChild(el);
  }
}

export function sanitizeSpecHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(`<div id="spec-root">${trimmed}</div>`, "text/html");
    const root = doc.getElementById("spec-root");
    if (root) {
      sanitizeElement(root);
      return root.innerHTML.trim();
    }
  }

  return sanitizeWithRegex(trimmed);
}

/** 편집기 DOM → 저장 문자열 (표는 HTML, 주변 문단은 평문) */
export function normalizeEditorHtmlToStored(html: string): string {
  const safe = sanitizeSpecHtml(html);
  if (!safe) return "";

  if (typeof DOMParser === "undefined") {
    return safe;
  }

  const doc = new DOMParser().parseFromString(`<div id="spec-root">${safe}</div>`, "text/html");
  const root = doc.getElementById("spec-root");
  if (!root) return safe;

  const chunks: string[] = [];

  const pushChunk = (text: string) => {
    const t = text.replace(/\u00a0/g, " ").trim();
    if (t) chunks.push(t);
  };

  for (const node of [...root.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      pushChunk(node.textContent ?? "");
      continue;
    }
    if (!(node instanceof HTMLElement)) continue;

    const tag = node.tagName.toLowerCase();
    if (tag === "table") {
      pushChunk(node.outerHTML);
    } else if (node.classList.contains("spec-prose")) {
      pushChunk(node.innerText);
    } else if (tag === "p") {
      pushChunk(node.innerText);
    } else if (tag === "br") {
      chunks.push("");
    } else {
      const nestedTable = node.querySelector("table");
      if (nestedTable) {
        const clone = node.cloneNode(true) as HTMLElement;
        const before = clone.innerHTML.split(/<table/i)[0];
        if (before.replace(/<[^>]+>/g, "").trim()) {
          pushChunk(clone.innerText);
        }
        pushChunk(nestedTable.outerHTML);
      } else {
        pushChunk(node.innerText || node.outerHTML);
      }
    }
  }

  return chunks.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function applyContentToEditor(el: HTMLElement, content: string): void {
  if (!content.trim()) {
    el.innerHTML = "";
    return;
  }
  if (shouldUseHtmlEditor(content)) {
    el.innerHTML = contentToEditorHtml(content);
    return;
  }
  el.innerHTML = "";
  el.innerText = content;
}

export function readContentFromEditor(el: HTMLElement): string {
  const hasTable = el.querySelector("table") !== null;
  const html = el.innerHTML;
  if (hasTable || hasRenderableHtml(html)) {
    return normalizeEditorHtmlToStored(html);
  }
  return el.innerText;
}

/** Word/Excel 등에서 복사한 HTML에서 본문 fragment 추출 */
export function extractClipboardHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";

  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(trimmed, "text/html");
    const body = doc.body;
    if (body) {
      const tables = body.querySelectorAll("table");
      if (tables.length === 1 && body.childNodes.length <= 3) {
        return sanitizeSpecHtml(tables[0]!.outerHTML);
      }
      return sanitizeSpecHtml(body.innerHTML);
    }
  }

  const bodyMatch = trimmed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return sanitizeSpecHtml(bodyMatch ? bodyMatch[1]! : trimmed);
}

export function clipboardHtmlHasTable(html: string): boolean {
  return HTML_TABLE_RE.test(html);
}

export function insertHtmlAtCursor(html: string): void {
  const clean = sanitizeSpecHtml(html);
  if (!clean || typeof document === "undefined") return;

  const selection = document.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  range.deleteContents();

  const template = document.createElement("template");
  template.innerHTML = clean;
  const fragment = template.content;
  const last = fragment.lastChild;
  range.insertNode(fragment);

  if (last) {
    range.setStartAfter(last);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}
