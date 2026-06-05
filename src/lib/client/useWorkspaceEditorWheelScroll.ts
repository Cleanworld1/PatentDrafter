"use client";

import { useEffect, type RefObject } from "react";

function isVerticallyScrollable(el: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== "auto" && overflowY !== "scroll") return false;
  return el.scrollHeight > el.clientHeight + 1;
}

function canConsumeVerticalScroll(el: HTMLElement, deltaY: number): boolean {
  if (deltaY < 0) return el.scrollTop > 0;
  return el.scrollTop + el.clientHeight < el.scrollHeight - 1;
}

function findVerticalScrollTarget(start: Element | null, stopAt: HTMLElement): HTMLElement | null {
  let cur = start;
  while (cur && cur !== stopAt) {
    if (cur instanceof HTMLElement && isVerticallyScrollable(cur)) {
      return cur;
    }
    cur = cur.parentElement;
  }
  return null;
}

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * 편집 영역 위에서 휠할 때 오른쪽 설정 패널이 스크롤되지 않도록 함.
 * (설정 입력에 포커스가 있어도 커서가 편집기 위면 편집기 쪽 스크롤)
 */
export function useWorkspaceEditorWheelScroll(
  editorAreaRef: RefObject<HTMLElement | null>
): void {
  useEffect(() => {
    const area = editorAreaRef.current;
    if (!area) return;

    const onWheelCapture = (event: WheelEvent) => {
      if (event.ctrlKey) return;

      const rect = area.getBoundingClientRect();
      if (!pointInRect(event.clientX, event.clientY, rect)) return;

      const tabContent = area.querySelector<HTMLElement>(".tab-content");
      const hit =
        document.elementFromPoint(event.clientX, event.clientY) ??
        (event.target instanceof Element ? event.target : null);

      if (!hit || !area.contains(hit)) return;

      const inner = findVerticalScrollTarget(hit, area);
      if (inner && canConsumeVerticalScroll(inner, event.deltaY)) {
        inner.scrollTop += event.deltaY;
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (tabContent && isVerticallyScrollable(tabContent)) {
        if (canConsumeVerticalScroll(tabContent, event.deltaY)) {
          tabContent.scrollTop += event.deltaY;
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      const settingsPanel = document.querySelector(".settings-panel");
      const active = document.activeElement;
      if (settingsPanel?.contains(active ?? null)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    document.addEventListener("wheel", onWheelCapture, { capture: true, passive: false });
    return () => document.removeEventListener("wheel", onWheelCapture, { capture: true });
  }, [editorAreaRef]);
}
