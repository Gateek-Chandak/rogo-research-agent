import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "../lib/chatStream.ts";
import type { AgentEvent, ChatTurn } from "../../shared/types.ts";

export interface Message extends ChatTurn {
  at: number;
  tools?: ToolActivity[];
  stopped?: boolean;
}

export interface ToolActivity {
  id: string;
  name: string;
  status: "running" | "done" | "failed";
  ms?: number;
}

/** Null when nothing is running. */
export interface Run {
  answer: string;
  tools: ToolActivity[];
}

const DROPPED =
  "The connection to the research server dropped. Your question is still in the box — send it again.";

function applyEvent(run: Run, event: AgentEvent): Run {
  switch (event.type) {
    case "text_delta":
      return { ...run, answer: run.answer + event.text };
    case "tool_start":
      return {
        ...run,
        tools: [...run.tools, { id: event.id, name: event.name, status: "running" }],
      };
    case "tool_end":
    case "tool_failed":
      return {
        ...run,
        tools: run.tools.map((tool) =>
          tool.id === event.id
            ? {
                ...tool,
                status: event.type === "tool_end" ? "done" : "failed",
                ms: event.ms,
              }
            : tool,
        ),
      };
    default:
      return run;
  }
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Read inside start() so a queued question sees the turns before it.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const start = useCallback(async (question: string) => {
    const history = messagesRef.current.map(({ role, text }) => ({ role, text }));
    setMessages((prev) => [...prev, { role: "user", text: question, at: Date.now() }]);

    const controller = new AbortController();
    abortRef.current = controller;

    let state: Run = { answer: "", tools: [] };
    let failure: string | null = null;
    let stopped = false;
    setRun(state);

    try {
      for await (const event of streamChat({
        message: question,
        history,
        signal: controller.signal,
      })) {
        if (event.type === "error") {
          failure = event.message;
          break;
        }
        if (event.type === "done") {
          state = { ...state, answer: event.answer };
          break;
        }
        state = applyEvent(state, event);
        setRun(state);
      }
    } catch {
      stopped = controller.signal.aborted;
      if (!stopped) failure = DROPPED;
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: failure ?? state.answer.trim(),
        at: Date.now(),
        tools: state.tools,
        stopped,
      },
    ]);
    abortRef.current = null;
    setRun(null);
  }, []);

  const send = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;
      if (abortRef.current) setQueue((prev) => [...prev, text]);
      else start(text);
    },
    [start],
  );

  const unqueue = useCallback(
    (index: number) => setQueue((prev) => prev.filter((_, i) => i !== index)),
    [],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  useEffect(() => {
    if (run || !queue.length) return;
    const [next, ...rest] = queue;
    setQueue(rest);
    start(next);
  }, [run, queue, start]);

  return { messages, run, queue, send, stop, unqueue };
}
