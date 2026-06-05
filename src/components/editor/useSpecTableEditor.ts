"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  measureColResizeHandles,
  measureRowResizeHandles,
  measureTableOverlayBox,
  screenDeltaToTablePx,
  screenSizeToTablePx,
  type ColResizeHandle,
  type RowResizeHandle,
  type TableOverlayBox
} from "@/lib/tableEditor/tableOverlayMeasure";
import {
  deleteTableColumn,
  deleteTableRow,
  getActiveTableCell,
  getColumnWidthsPx,
  getTableColumnCount,
  getTableFromNode,
  getTableSizePx,
  insertTableColumn,
  insertTableRow,
  removeTable,
  resizeTableWidth,
  setColumnWidthsPx,
  setRowHeightPx,
  type TableCellRef
} from "@/lib/tableEditor/tableDomOps";
import { useSpecEditorViewportStore } from "@/store/specEditorViewportStore";

export type { ColResizeHandle, RowResizeHandle, TableOverlayBox } from "@/lib/tableEditor/tableOverlayMeasure";

interface DragState {
  kind: "col" | "row" | "table-scale";
  table: HTMLTableElement;
  startX: number;
  startY: number;
  colIndex?: number;
  startWidths?: number[];
  startRowHeight?: number;
  startRowIndex?: number;
  startTableWidth?: number;
}

export function useSpecTableEditor(
  scrollRef: React.RefObject<HTMLElement | null>,
  contentRef: React.RefObject<HTMLElement | null>,
  onTableChange: () => void
) {
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);
  const [activeCell, setActiveCell] = useState<TableCellRef | null>(null);
  const [overlay, setOverlay] = useState<TableOverlayBox | null>(null);
  const [colHandles, setColHandles] = useState<ColResizeHandle[]>([]);
  const [rowHandles, setRowHandles] = useState<RowResizeHandle[]>([]);
  const dragRef = useRef<DragState | null>(null);
  const rafRef = useRef<number | null>(null);

  const editorZoom = useSpecEditorViewportStore((s) => s.zoom);

  const measureOverlay = useCallback(() => {
    const table = selectedTable;
    if (!table) {
      setOverlay(null);
      setColHandles([]);
      setRowHandles([]);
      return;
    }

    setOverlay(measureTableOverlayBox(table));
    setColHandles(measureColResizeHandles(table));
    setRowHandles(measureRowResizeHandles(table));
  }, [selectedTable]);

  const scheduleMeasure = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      measureOverlay();
    });
  }, [measureOverlay]);

  useLayoutEffect(() => {
    measureOverlay();
  }, [measureOverlay, editorZoom]);

  useEffect(() => {
    const scroll = scrollRef.current;
    const onScroll = () => scheduleMeasure();
    scroll?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(onScroll) : null;
    if (ro && contentRef.current) ro.observe(contentRef.current);
    if (ro && selectedTable) ro.observe(selectedTable);

    return () => {
      scroll?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      ro?.disconnect();
    };
  }, [scrollRef, contentRef, selectedTable, scheduleMeasure]);

  const selectTable = useCallback(
    (table: HTMLTableElement | null) => {
      contentRef.current?.querySelectorAll("table.spec-table-selected").forEach((t) => {
        t.classList.remove("spec-table-selected");
      });
      if (table) {
        table.classList.add("spec-table-selected");
        setSelectedTable(table);
        setActiveCell(getActiveTableCell(table));
      } else {
        setSelectedTable(null);
        setActiveCell(null);
      }
      scheduleMeasure();
    },
    [contentRef, scheduleMeasure]
  );

  const handleEditorClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as Node;
      const table = getTableFromNode(target);
      if (table && contentRef.current?.contains(table)) {
        selectTable(table);
        setActiveCell(getActiveTableCell(table));
      } else if (!(target as Element).closest?.(".spec-table-chrome-layer, .spec-table-toolbar")) {
        selectTable(null);
      }
    },
    [contentRef, selectTable]
  );

  const endDrag = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    onTableChange();
    scheduleMeasure();
  }, [onTableChange, scheduleMeasure]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.kind === "col" && drag.colIndex !== undefined && drag.startWidths) {
        const delta = screenDeltaToTablePx(e.clientX - drag.startX, editorZoom);
        const widths = [...drag.startWidths];
        const i = drag.colIndex;
        const min = 32;
        widths[i] = Math.max(min, (widths[i] ?? 80) + delta);
        widths[i + 1] = Math.max(min, (widths[i + 1] ?? 80) - delta);
        setColumnWidthsPx(drag.table, widths);
        scheduleMeasure();
      }

      if (drag.kind === "row" && drag.startRowIndex !== undefined && drag.startRowHeight !== undefined) {
        const delta = screenDeltaToTablePx(e.clientY - drag.startY, editorZoom);
        setRowHeightPx(drag.table, drag.startRowIndex, drag.startRowHeight + delta);
        scheduleMeasure();
      }

      if (drag.kind === "table-scale" && drag.startTableWidth) {
        const delta = screenDeltaToTablePx(e.clientX - drag.startX, editorZoom);
        resizeTableWidth(drag.table, Math.max(120, drag.startTableWidth + delta));
        scheduleMeasure();
      }
    };

    const onUp = () => {
      if (dragRef.current) endDrag();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, [endDrag, editorZoom, scheduleMeasure]);

  const startColResize = useCallback(
    (colIndex: number, clientX: number) => {
      if (!selectedTable) return;
      dragRef.current = {
        kind: "col",
        table: selectedTable,
        startX: clientX,
        startY: 0,
        colIndex,
        startWidths: getColumnWidthsPx(selectedTable)
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [selectedTable]
  );

  const startRowResize = useCallback(
    (rowIndex: number, clientY: number) => {
      if (!selectedTable) return;
      const row = selectedTable.rows[rowIndex];
      if (!row) return;
      dragRef.current = {
        kind: "row",
        table: selectedTable,
        startX: 0,
        startY: clientY,
        startRowIndex: rowIndex,
        startRowHeight: screenSizeToTablePx(row.getBoundingClientRect().height, editorZoom)
      };
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [selectedTable, editorZoom]
  );

  const startTableScale = useCallback(
    (clientX: number) => {
      if (!selectedTable) return;
      const { width } = getTableSizePx(selectedTable);
      dragRef.current = {
        kind: "table-scale",
        table: selectedTable,
        startX: clientX,
        startY: 0,
        startTableWidth: screenSizeToTablePx(width, editorZoom)
      };
      document.body.style.cursor = "nwse-resize";
      document.body.style.userSelect = "none";
    },
    [selectedTable, editorZoom]
  );

  const runTableOp = useCallback(
    (fn: () => void) => {
      if (!selectedTable) return;
      fn();
      onTableChange();
      scheduleMeasure();
    },
    [selectedTable, onTableChange, scheduleMeasure]
  );

  const toolbarActions = {
    insertRowAbove: () =>
      runTableOp(() => {
        const r = activeCell?.row ?? 0;
        insertTableRow(selectedTable!, r, "before");
      }),
    insertRowBelow: () =>
      runTableOp(() => {
        const r = activeCell?.row ?? selectedTable!.rows.length - 1;
        insertTableRow(selectedTable!, r, "after");
      }),
    insertColLeft: () =>
      runTableOp(() => {
        const c = activeCell?.col ?? 0;
        insertTableColumn(selectedTable!, c, "before");
      }),
    insertColRight: () =>
      runTableOp(() => {
        const c = activeCell?.col ?? getTableColumnCount(selectedTable!) - 1;
        insertTableColumn(selectedTable!, c, "after");
      }),
    deleteRow: () =>
      runTableOp(() => {
        const r = activeCell?.row ?? selectedTable!.rows.length - 1;
        deleteTableRow(selectedTable!, r);
      }),
    deleteCol: () =>
      runTableOp(() => {
        const c = activeCell?.col ?? getTableColumnCount(selectedTable!) - 1;
        deleteTableColumn(selectedTable!, c);
      }),
    deleteTable: () =>
      runTableOp(() => {
        removeTable(selectedTable!);
        selectTable(null);
      })
  };

  return {
    selectedTable,
    activeCell,
    overlay,
    colHandles,
    rowHandles,
    handleEditorClick,
    selectTable,
    measureOverlay: scheduleMeasure,
    startColResize,
    startRowResize,
    startTableScale,
    toolbarActions
  };
}
