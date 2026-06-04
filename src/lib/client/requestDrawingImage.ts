export interface DrawingImageResult {
  mimeType: string;
  imageBase64: string;
}

export class DrawingImageNotConfiguredError extends Error {
  readonly code = "GEMINI_NOT_CONFIGURED";

  constructor(message: string) {
    super(message);
    this.name = "DrawingImageNotConfiguredError";
  }
}

export async function requestDrawingImage(prompt: string): Promise<DrawingImageResult> {
  const res = await fetch("/api/generate-drawing-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    code?: string;
    mimeType?: string;
    imageBase64?: string;
  };

  if (res.status === 503 && data.code === "GEMINI_NOT_CONFIGURED") {
    throw new DrawingImageNotConfiguredError(
      data.error || "GEMINI_API_KEY가 설정되지 않았습니다."
    );
  }

  if (!res.ok) {
    throw new Error(data.error || `도면 생성 실패 (HTTP ${res.status})`);
  }

  if (!data.imageBase64) {
    throw new Error("이미지 데이터가 없습니다.");
  }

  return {
    mimeType: data.mimeType || "image/png",
    imageBase64: data.imageBase64
  };
}

export function downloadBase64Image(
  imageBase64: string,
  mimeType: string,
  fileName: string
): void {
  const href = `data:${mimeType};base64,${imageBase64}`;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
}
