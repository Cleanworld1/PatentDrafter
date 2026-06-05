"use client";

import type { HistoryEntry } from "@/lib/historyService";
import { PROJECT_STATUS_LABELS } from "@/types/patentDraft";

interface HistoryItemProps {
  entry: HistoryEntry;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function HistoryItem({ entry, isActive, onSelect, onDelete }: HistoryItemProps) {
  const date = new Date(entry.updatedAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  return (
    <div className={`history-item-row${isActive ? " active" : ""}`}>
      <button type="button" className="history-item" onClick={onSelect}>
        <span className="history-item-title">{entry.title}</span>
        <span className="history-item-meta">
          <span>{date}</span>
          <span className="history-item-status">{PROJECT_STATUS_LABELS[entry.status]}</span>
        </span>
      </button>
      <button
        type="button"
        className="history-item-delete"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="작업 삭제"
        aria-label={`${entry.title} 삭제`}
      >
        삭제
      </button>
    </div>
  );
}
