"use client";

import { useCallback, useEffect, useRef } from "react";
import { SpecTableEditorChrome } from "@/components/editor/SpecTableEditorChrome";
import { useSpecTableEditor } from "@/components/editor/useSpecTableEditor";
import {
  applyContentToEditor,
  clipboardHtmlHasTable,
  extractClipboardHtml,
  insertHtmlAtCursor,
  readContentFromEditor
} from "@/lib/specEditorHtml";
import { enhanceTablesInEditor } from "@/lib/tableEditor/tableDomOps";

interface SpecSectionEditorProps {
  content: string;
  onContentChange: (content: string) => void;
}

export function SpecSectionEditor({ content, onContentChange }: SpecSectionEditorProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isFocused = useRef(false);

  const commitEditorContent = useCallback(() => {
    if (!contentRef.current) return;
    onContentChange(readContentFromEditor(contentRef.current));
  }, [onContentChange]);

  const {
    selectedTable,
    overlay,
    colHandles,
    rowHandles,
    handleEditorClick,
    measureOverlay,
    startColResize,
    startRowResize,
    startTableScale,
    toolbarActions
  } = useSpecTableEditor(scrollRef, contentRef, commitEditorContent);

  useEffect(() => {
    if (contentRef.current && !isFocused.current) {
      applyContentToEditor(contentRef.current, content);
      enhanceTablesInEditor(contentRef.current);
      requestAnimationFrame(measureOverlay);
    }
  }, [content, measureOverlay]);

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const html = event.clipboardData.getData("text/html");
      if (html && clipboardHtmlHasTable(html)) {
        event.preventDefault();
        const fragment = extractClipboardHtml(html);
        if (fragment) {
          insertHtmlAtCursor(fragment);
          if (contentRef.current) enhanceTablesInEditor(contentRef.current);
          commitEditorContent();
          requestAnimationFrame(measureOverlay);
        }
        return;
      }

      const plain = event.clipboardData.getData("text/plain");
      if (plain && /\t/.test(plain) && plain.includes("\n")) {
        const rows = plain
          .trim()
          .split(/\r?\n/)
          .map((row) => row.split("\t").map((cell) => cell.trim()));
        if (rows.length >= 1 && rows[0]!.length >= 2) {
          event.preventDefault();
          const tableHtml = [
            "<table>",
            "<tbody>",
            ...rows.map(
              (cells) =>
                `<tr>${cells.map((c) => `<td>${c.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>`).join("")}</tr>`
            ),
            "</tbody>",
            "</table>"
          ].join("");
          insertHtmlAtCursor(tableHtml);
          if (contentRef.current) enhanceTablesInEditor(contentRef.current);
          commitEditorContent();
          requestAnimationFrame(measureOverlay);
        }
      }
    },
    [commitEditorContent, measureOverlay]
  );

  return (
    <div className="spec-section-editor-host">
      <div className="spec-section-scroll-clip">
        <div ref={scrollRef} className="spec-section-scroll">
          <div
            ref={contentRef}
            className="spec-section-content"
          contentEditable
          suppressContentEditableWarning
          onFocus={() => {
            isFocused.current = true;
          }}
          onClick={handleEditorClick}
          onKeyUp={() => requestAnimationFrame(measureOverlay)}
          onPaste={handlePaste}
          onBlur={() => {
            isFocused.current = false;
            commitEditorContent();
          }}
          />
        </div>
      </div>

      {selectedTable && overlay && (
        <SpecTableEditorChrome
          overlay={overlay}
          colHandles={colHandles}
          rowHandles={rowHandles}
          toolbarActions={toolbarActions}
          onColResizeStart={startColResize}
          onRowResizeStart={startRowResize}
          onTableScaleStart={startTableScale}
        />
      )}
    </div>
  );
}
