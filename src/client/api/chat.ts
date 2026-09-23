/** Reads the SSE body of POST /api/chat and yields typed events. */

import type { ChatTurn, StreamEvent } from "../../shared/chat.ts";

interface StreamChatOptions {
  message: string;
  history: ChatTurn[];
  signal: AbortSignal;
}

async function* readEvents(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Blank line separates events; the tail may be partial.
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const data = chunk
          .split("\n")
          .filter((line) => line.startsWith("data: "))
          .map((line) => line.slice(6))
          .join("");
        if (data) yield data;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function* streamChat({
  message,
  history,
  signal,
}: StreamChatOptions): AsyncGenerator<StreamEvent> {
  let res: Response;
  try {
    res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
      signal,
    });
  } catch {
    if (signal.aborted) return;
    yield {
      type: "error",
      message:
        "I can't reach the research server. Check that it's running, then try again.",
    };
    return;
  }

  if (!res.ok || !res.body) {
    const { error } = await res.json().catch(() => ({ error: "" }));
    yield {
      type: "error",
      message:
        error ||
        "The research server turned that request down. Try asking again in a moment.",
    };
    return;
  }

  for await (const data of readEvents(res.body, signal)) {
    try {
      yield JSON.parse(data) as StreamEvent;
    } catch {
      // Skip a truncated frame rather than failing the run.
    }
  }
}
