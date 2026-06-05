export interface TableOverlayBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface ColResizeHandle {
  index: number;
  /** viewport X (px) */
  left: number;
}

export interface RowResizeHandle {
  index: number;
  /** viewport Y (px) */
  top: number;
}

/** 표·캡션·셀의 실제 화면 경계 (viewport 좌표) */
export function measureTableVisualRect(table: HTMLTableElement): TableOverlayBox {
  const rects: DOMRect[] = [];

  const caption = table.querySelector("caption");
  if (caption) {
    rects.push(caption.getBoundingClientRect());
  }

  table.querySelectorAll("th, td").forEach((cell) => {
    rects.push(cell.getBoundingClientRect());
  });

  if (rects.length === 0) {
    const t = table.getBoundingClientRect();
    return { top: t.top, left: t.left, width: t.width, height: t.height };
  }

  let top = Infinity;
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const r of rects) {
    top = Math.min(top, r.top);
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }

  return {
    top,
    left,
    width: right - left,
    height: bottom - top
  };
}

export function measureTableOverlayBox(table: HTMLTableElement): TableOverlayBox {
  return measureTableVisualRect(table);
}

export function measureColResizeHandles(table: HTMLTableElement): ColResizeHandle[] {
  const row = table.rows[0];
  if (!row || row.cells.length < 2) return [];

  const handles: ColResizeHandle[] = [];
  for (let i = 0; i < row.cells.length - 1; i += 1) {
    const cell = row.cells[i]!;
    const next = row.cells[i + 1]!;
    const cellRect = cell.getBoundingClientRect();
    const nextRect = next.getBoundingClientRect();
    handles.push({
      index: i,
      left: (cellRect.right + nextRect.left) / 2
    });
  }
  return handles;
}

export function measureRowResizeHandles(table: HTMLTableElement): RowResizeHandle[] {
  const handles: RowResizeHandle[] = [];

  for (let r = 0; r < table.rows.length - 1; r += 1) {
    const row = table.rows[r]!;
    const next = table.rows[r + 1]!;
    const rowRect = row.getBoundingClientRect();
    const nextRect = next.getBoundingClientRect();
    handles.push({
      index: r,
      top: (rowRect.bottom + nextRect.top) / 2
    });
  }
  return handles;
}

/** 화면 픽셀 → 표 CSS px (편집기 줌 계수) */
export function screenDeltaToTablePx(delta: number, editorZoom: number): number {
  const z = editorZoom > 0 ? editorZoom : 1;
  return delta / z;
}

export function screenSizeToTablePx(sizePx: number, editorZoom: number): number {
  const z = editorZoom > 0 ? editorZoom : 1;
  return sizePx / z;
}
