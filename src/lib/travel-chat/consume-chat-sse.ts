/**
 * `/api/chat` 스트리밍 응답(SSE)을 ReadableStream reader로 소비합니다.
 * `data: {"type":"delta"|"done"|"error",...}` 및 `event: error` 를 처리합니다.
 */

export type ConsumeChatSseResult =
  | { ok: true; warning?: string }
  | { ok: false; message: string; code?: string };

export async function consumeTravelChatSse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<ConsumeChatSseResult> {
  const decoder = new TextDecoder();
  let buffer = "";
  let pendingErrorEvent = false;

  const processLine = (trimmed: string): ConsumeChatSseResult | null => {
    if (trimmed.startsWith("event:")) {
      if (trimmed.slice(6).trim() === "error") pendingErrorEvent = true;
      return null;
    }
    if (!trimmed.startsWith("data:")) return null;
    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr) return null;
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(jsonStr) as Record<string, unknown>;
    } catch {
      return null;
    }
    if (pendingErrorEvent) {
      pendingErrorEvent = false;
      return {
        ok: false,
        message:
          typeof obj.message === "string"
            ? obj.message
            : "스트림 오류가 발생했습니다.",
      };
    }
    const typ = obj.type;
    if (typ === "delta" && typeof obj.text === "string") {
      onDelta(obj.text);
      return null;
    }
    if (typ === "done") {
      return {
        ok: true,
        warning: typeof obj.warning === "string" ? obj.warning : undefined,
      };
    }
    if (typ === "error") {
      return {
        ok: false,
        message:
          typeof obj.message === "string" ? obj.message : "오류가 발생했습니다.",
        code: typeof obj.code === "string" ? obj.code : undefined,
      };
    }
    return null;
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (signal?.aborted) {
        return { ok: false, message: "요청이 취소되었습니다.", code: "ABORTED" };
      }
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.replace(/\r$/, "");
        const out = processLine(trimmed);
        if (out) return out;
      }
    }

    if (buffer.trim()) {
      for (const line of `${buffer}\n`.split("\n")) {
        const trimmed = line.replace(/\r$/, "");
        if (!trimmed) continue;
        const out = processLine(trimmed);
        if (out) return out;
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* 이미 해제됨 */
    }
  }

  return { ok: false, message: "스트림이 비정상 종료되었습니다.", code: "INCOMPLETE" };
}
