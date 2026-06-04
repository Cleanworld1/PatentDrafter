"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  getSpecEditorZoomPercent,
  useSpecEditorViewportStore
} from "@/store/specEditorViewportStore";

const ZOOM_STEP = 0.05;

interface SpecEditorZoomViewportProps {
  children: ReactNode;
  className?: string;
}

/**
 * CSS zoom — 레이아웃이 함께 축소·확대되어 이중 스크롤바가 생기지 않음.
 * 표 오버레이는 viewport fixed 좌표 + 줌 스토어 보정으로 맞춤.
 */
export function SpecEditorZoomViewport({ children, className = "" }: SpecEditorZoomViewportProps) {
  const zoom = useSpecEditorViewportStore((s) => s.zoom);
  const adjustZoom = useSpecEditorViewportStore((s) => s.adjustZoom);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const delta = event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
      adjustZoom(delta);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [adjustZoom]);

  return (
    <div
      ref={viewportRef}
      className={`spec-editor-zoom-viewport ${className}`.trim()}
      data-zoom={getSpecEditorZoomPercent(zoom)}
    >
      <div className="spec-editor-zoom-inner" style={{ zoom }} data-spec-zoom={zoom}>
        {children}
      </div>
    </div>
  );
}
