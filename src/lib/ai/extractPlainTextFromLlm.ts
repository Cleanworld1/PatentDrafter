/** LLM 응답에서 명세서 본문용 순수 텍스트 추출 (JSON·코드펜스 대응) */

function stripMarkdownFences(text: string): string {
  let t = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i;
  const m = t.match(fence);
  if (m) t = m[1].trim();
  return t;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 도면 프롬프트 JSON → 편집기용 읽기 쉬운 텍스트 */
export function formatDrawingPromptJsonAsText(obj: Record<string, unknown>): string {
  const lines: string[] = [];

  const title = obj.title ?? obj.drawing_title;
  if (title != null && String(title).trim()) {
    lines.push(String(title).trim());
  }

  const purpose = obj.purpose ?? obj.drawing_purpose;
  if (purpose != null && String(purpose).trim()) {
    if (lines.length > 0) lines.push("");
    lines.push(String(purpose).trim());
  }

  const append = (label: string, key: string) => {
    const v = obj[key];
    if (v == null) return;
    if (Array.isArray(v) && v.length > 0) {
      lines.push("", `[${label}]`, v.map((x) => String(x)).join(", "));
    } else if (typeof v === "string" && v.trim()) {
      lines.push("", `[${label}]`, v.trim());
    }
  };

  append("도면 유형", "drawing_type");
  append("필수 구성요소", "required_elements");
  append("상대 배치", "relative_layout");
  append("연결·화살표", "arrows_or_connections");
  append("참조부호", "reference_number_guidance");
  append("스타일", "style_instruction");

  return lines.join("\n").trim();
}

function extractFromParsedJson(parsed: unknown, preferDrawingFormat: boolean): string | null {
  if (typeof parsed === "string") return parsed.trim() || null;
  if (!isRecord(parsed)) return null;

  if (typeof parsed.content === "string" && parsed.content.trim()) return parsed.content.trim();
  if (typeof parsed.text === "string" && parsed.text.trim()) return parsed.text.trim();
  if (typeof parsed.body === "string" && parsed.body.trim()) return parsed.body.trim();

  if (preferDrawingFormat || parsed.purpose != null || parsed.required_elements != null) {
    const formatted = formatDrawingPromptJsonAsText(parsed);
    if (formatted) return formatted;
  }

  return null;
}

/**
 * @param preferDrawingFormat - drawing_prompt / drawing_N 섹션일 때 true
 */
export function extractPlainTextFromLlm(raw: string, preferDrawingFormat = false): string {
  const trimmed = stripMarkdownFences(raw);
  if (!trimmed) return "";

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    const extracted = extractFromParsedJson(parsed, preferDrawingFormat);
    if (extracted) return extracted;
  } catch {
    // not JSON
  }

  if (preferDrawingFormat && trimmed.startsWith("{") && trimmed.includes('"purpose"')) {
    try {
      const relaxed = JSON.parse(trimmed.replace(/\n/g, " ")) as unknown;
      const extracted = extractFromParsedJson(relaxed, true);
      if (extracted) return extracted;
    } catch {
      // ignore
    }
  }

  return trimmed;
}
