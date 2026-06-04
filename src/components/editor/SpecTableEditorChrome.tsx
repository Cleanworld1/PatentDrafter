"use client";

import { createPortal } from "react-dom";
import type {
  ColResizeHandle,
  RowResizeHandle,
  TableOverlayBox
} from "@/lib/tableEditor/tableOverlayMeasure";

function preventBlur(event: React.MouseEvent) {
  event.preventDefault();
}

interface ToolbarActions {
  insertRowAbove: () => void;
  insertRowBelow: () => void;
  insertColLeft: () => void;
  insertColRight: () => void;
  deleteRow: () => void;
  deleteCol: () => void;
  deleteTable: () => void;
}

interface SpecTableEditorChromeProps {
  overlay: TableOverlayBox;
  colHandles: ColResizeHandle[];
  rowHandles: RowResizeHandle[];
  toolbarActions: ToolbarActions;
  onColResizeStart: (index: number, clientX: number) => void;
  onRowResizeStart: (index: number, clientY: number) => void;
  onTableScaleStart: (clientX: number) => void;
}

function ChromeLayer({
  overlay,
  colHandles,
  rowHandles,
  toolbarActions,
  onColResizeStart,
  onRowResizeStart,
  onTableScaleStart
}: SpecTableEditorChromeProps) {
  const toolbarTop = Math.max(8, overlay.top - 44);

  return (
    <div className="spec-table-chrome-layer" role="presentation">
      <div
        className="spec-table-toolbar"
        style={{ top: toolbarTop, left: overlay.left, maxWidth: overlay.width }}
        role="toolbar"
        aria-label="표 편집"
      >
        <button type="button" title="위에 행 삽입" onMouseDown={preventBlur} onClick={toolbarActions.insertRowAbove}>
          행↑
        </button>
        <button type="button" title="아래에 행 삽입" onMouseDown={preventBlur} onClick={toolbarActions.insertRowBelow}>
          행↓
        </button>
        <button type="button" title="왼쪽에 열 삽입" onMouseDown={preventBlur} onClick={toolbarActions.insertColLeft}>
          열←
        </button>
        <button type="button" title="오른쪽에 열 삽입" onMouseDown={preventBlur} onClick={toolbarActions.insertColRight}>
          열→
        </button>
        <span className="spec-table-toolbar-sep" />
        <button type="button" title="행 삭제" onMouseDown={preventBlur} onClick={toolbarActions.deleteRow}>
          행 삭제
        </button>
        <button type="button" title="열 삭제" onMouseDown={preventBlur} onClick={toolbarActions.deleteCol}>
          열 삭제
        </button>
        <button
          type="button"
          className="spec-table-toolbar-danger"
          title="표 삭제"
          onMouseDown={preventBlur}
          onClick={toolbarActions.deleteTable}
        >
          표 삭제
        </button>
      </div>

      <div
        className="spec-table-selection-frame"
        style={{
          top: overlay.top,
          left: overlay.left,
          width: overlay.width,
          height: overlay.height
        }}
      />

      {colHandles.map((h) => (
        <div
          key={`col-${h.index}`}
          className="spec-table-col-resize"
          style={{
            top: overlay.top,
            left: h.left - 3,
            height: overlay.height
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onColResizeStart(h.index, e.clientX);
          }}
          title="열 너비 조절"
        />
      ))}

      {rowHandles.map((h) => (
        <div
          key={`row-${h.index}`}
          className="spec-table-row-resize"
          style={{
            top: h.top - 3,
            left: overlay.left,
            width: overlay.width
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onRowResizeStart(h.index, e.clientY);
          }}
          title="행 높이 조절"
        />
      ))}

      <div
        className="spec-table-scale-handle"
        style={{
          top: overlay.top + overlay.height - 6,
          left: overlay.left + overlay.width - 6
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          onTableScaleStart(e.clientX);
        }}
        title="표 전체 크기 조절"
      />
    </div>
  );
}

/** body 포털 + position:fixed — viewport 좌표와 표 경계 일치 */
export function SpecTableEditorChrome(props: SpecTableEditorChromeProps) {
  if (typeof document === "undefined") return null;
  return createPortal(<ChromeLayer {...props} />, document.body);
}
