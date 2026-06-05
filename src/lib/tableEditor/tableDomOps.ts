export interface TableCellRef {
  row: number;
  col: number;
  cell: HTMLTableCellElement;
}

export function getTableFromNode(node: Node | null): HTMLTableElement | null {
  if (!node) return null;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  return el?.closest("table") ?? null;
}

export function getActiveTableCell(table: HTMLTableElement): TableCellRef | null {
  if (typeof window === "undefined") return null;
  const sel = window.getSelection();
  const node = sel?.anchorNode;
  if (!node) return null;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  const cell = el?.closest("td,th");
  if (!cell || !table.contains(cell)) return null;
  const rowEl = cell.closest("tr");
  if (!rowEl) return null;
  return {
    row: (rowEl as HTMLTableRowElement).rowIndex,
    col: (cell as HTMLTableCellElement).cellIndex,
    cell: cell as HTMLTableCellElement
  };
}

export function getTableColumnCount(table: HTMLTableElement): number {
  let max = 0;
  for (const row of table.rows) {
    max = Math.max(max, row.cells.length);
  }
  return max;
}

function ensureColgroup(table: HTMLTableElement): HTMLTableColElement[] {
  const count = getTableColumnCount(table);
  let cg = table.querySelector("colgroup");
  if (!cg) {
    cg = document.createElement("colgroup");
    table.insertBefore(cg, table.firstChild);
  }
  while (cg.children.length < count) {
    cg.appendChild(document.createElement("col"));
  }
  while (cg.children.length > count) {
    cg.removeChild(cg.lastChild!);
  }
  return [...cg.querySelectorAll("col")];
}

export function getColumnWidthsPx(table: HTMLTableElement): number[] {
  const cols = ensureColgroup(table);
  const count = cols.length;
  if (count === 0) return [];

  const widths: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const w = cols[i]!.style.width;
    if (w.endsWith("px")) {
      widths.push(parseFloat(w));
      continue;
    }
    const cell = table.rows[0]?.cells[i];
    widths.push(cell?.getBoundingClientRect().width ?? 80);
  }
  return widths;
}

export function setColumnWidthsPx(table: HTMLTableElement, widths: number[]): void {
  const cols = ensureColgroup(table);
  table.style.tableLayout = "fixed";
  widths.forEach((w, i) => {
    if (cols[i]) cols[i]!.style.width = `${Math.max(32, w)}px`;
  });
  const total = widths.reduce((a, b) => a + b, 0);
  table.style.width = `${total}px`;
}

export function setRowHeightPx(table: HTMLTableElement, rowIndex: number, heightPx: number): void {
  const row = table.rows[rowIndex];
  if (!row) return;
  const h = `${Math.max(24, heightPx)}px`;
  for (const cell of row.cells) {
    cell.style.height = h;
  }
}

export function getTableSizePx(table: HTMLTableElement): { width: number; height: number } {
  const rect = table.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

/** 표 전체 너비를 비율에 맞게 조절 (열 너비 동시 확대·축소) */
export function resizeTableWidth(table: HTMLTableElement, newTotalWidthPx: number): void {
  const widths = getColumnWidthsPx(table);
  const total = widths.reduce((a, b) => a + b, 0) || table.getBoundingClientRect().width || 1;
  const ratio = Math.min(3, Math.max(0.35, newTotalWidthPx / total));
  setColumnWidthsPx(
    table,
    widths.map((w) => Math.max(32, w * ratio))
  );
}

export function insertTableRow(
  table: HTMLTableElement,
  refRow: number,
  position: "before" | "after"
): void {
  const row = table.rows[refRow];
  if (!row) return;
  const newRow = row.cloneNode(true) as HTMLTableRowElement;
  for (const cell of newRow.cells) {
    cell.innerHTML = "";
  }
  if (position === "before") {
    row.parentElement?.insertBefore(newRow, row);
  } else {
    row.parentElement?.insertBefore(newRow, row.nextSibling);
  }
}

export function insertTableColumn(
  table: HTMLTableElement,
  refCol: number,
  position: "before" | "after"
): void {
  const insertAt = position === "before" ? refCol : refCol + 1;
  for (const row of table.rows) {
    const refCell = row.cells[refCol] ?? row.cells[row.cells.length - 1];
    if (!refCell) continue;
    const tag = refCell.tagName.toLowerCase() === "th" ? "th" : "td";
    const cell = document.createElement(tag);
    cell.innerHTML = "";
    if (insertAt >= row.cells.length) {
      row.appendChild(cell);
    } else {
      row.insertBefore(cell, row.cells[insertAt] ?? null);
    }
  }
  const widths = getColumnWidthsPx(table);
  const refW = widths[refCol] ?? 80;
  widths.splice(insertAt, 0, refW);
  setColumnWidthsPx(table, widths);
}

export function deleteTableRow(table: HTMLTableElement, rowIndex: number): void {
  if (table.rows.length <= 1) return;
  table.rows[rowIndex]?.remove();
}

export function deleteTableColumn(table: HTMLTableElement, colIndex: number): void {
  if (getTableColumnCount(table) <= 1) return;
  for (const row of table.rows) {
    row.cells[colIndex]?.remove();
  }
  const widths = getColumnWidthsPx(table);
  widths.splice(colIndex, 1);
  if (widths.length > 0) setColumnWidthsPx(table, widths);
}

export function removeTable(table: HTMLTableElement): void {
  table.remove();
}

export function prepareTableForEditing(table: HTMLTableElement): void {
  table.classList.add("spec-table-widget");
  if (!table.style.tableLayout) table.style.tableLayout = "fixed";
  const widths = getColumnWidthsPx(table);
  if (widths.length > 0) {
    setColumnWidthsPx(table, widths);
  }
}

export function enhanceTablesInEditor(root: HTMLElement): void {
  root.querySelectorAll("table").forEach((t) => prepareTableForEditing(t as HTMLTableElement));
}
