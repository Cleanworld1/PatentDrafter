export function sanitizeDownloadBaseName(title: string): string {
  const base = title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  return base || "patent-draft";
}

export function downloadTextFile(content: string, fileName: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName.endsWith(".txt") ? fileName : `${fileName}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
}
