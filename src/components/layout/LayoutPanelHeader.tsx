"use client";

import { useResponsiveLayoutStore } from "@/store/responsiveLayoutStore";

interface LayoutPanelHeaderProps {
  title: string;
  onClose: () => void;
}

export function LayoutPanelHeader({ title, onClose }: LayoutPanelHeaderProps) {
  const isCompact = useResponsiveLayoutStore((s) => s.isCompact);

  if (!isCompact) return null;

  return (
    <div className="layout-panel-header">
      <h2 className="layout-panel-title">{title}</h2>
      <button type="button" className="layout-panel-close" onClick={onClose} aria-label="패널 닫기">
        닫기
      </button>
    </div>
  );
}
