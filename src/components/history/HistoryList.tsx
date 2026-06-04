"use client";

import { useEffect, useMemo, useState } from "react";
import { HistoryItem } from "@/components/history/HistoryItem";
import { listHistory, searchHistory } from "@/lib/historyService";
import { useMobileShellStore } from "@/store/mobileShellStore";
import { usePatentDraftStore } from "@/store/patentDraftStore";

export function HistoryList() {
  const closePanels = useMobileShellStore((s) => s.closePanels);
  const [query, setQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const currentId = usePatentDraftStore((s) => s.currentProject.id);
  const historyVersion = usePatentDraftStore((s) => s.historyVersion);
  const loadProject = usePatentDraftStore((s) => s.loadProject);
  const deleteHistoryProject = usePatentDraftStore((s) => s.deleteHistoryProject);

  useEffect(() => {
    setMounted(true);
  }, []);

  const entries = useMemo(() => {
    if (!mounted) return [];
    void historyVersion;
    return query ? searchHistory(query) : listHistory();
  }, [query, historyVersion, mounted]);

  return (
    <div className="history-list">
      <input
        className="history-search"
        type="search"
        placeholder="작업 검색..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="history-items">
        {entries.length === 0 ? (
          <p className="history-empty">저장된 작업이 없습니다.</p>
        ) : (
          entries.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              isActive={entry.id === currentId}
              onSelect={() => {
                loadProject(entry.snapshot);
                closePanels();
              }}
              onDelete={() => deleteHistoryProject(entry.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
