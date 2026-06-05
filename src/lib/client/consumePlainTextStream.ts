import { parseApiErrorResponse } from "@/lib/client/parseApiError";

export async function consumePlainTextSseStream(
  response: Response,
  onText: (accumulated: string) => void
): Promise<string> {
  if (!response.ok) {
    throw new Error(await parseApiErrorResponse(response, "스트리밍 요청 실패"));
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("스트리밍 응답 본문이 없습니다.");

  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload) as { text?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (typeof parsed.text === "string") {
          full = parsed.text;
          onText(full);
        }
      } catch (err) {
        if (err instanceof Error && err.message !== "Unexpected end of JSON input") {
          throw err;
        }
      }
    }
  }

  return full;
}
