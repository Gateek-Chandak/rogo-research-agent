import { useCallback, useRef, useState } from "react";
import { streamChat } from "../lib/chatStream.ts";
import type { AgentEvent, ChatTurn } from "../../shared/types.ts";

export interface Message extends ChatTurn {
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
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const send = useCallback(
    async (question: string) => {
      if (!question.trim() || abortRef.current) return;

      const history = messages.map(({ role, text }) => ({ role, text }));
      setMessages((prev) => [...prev, { role: "user", text: question }]);

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
        { role: "assistant", text: failure ?? state.answer.trim(), stopped },
      ]);
      setRun(null);
      abortRef.current = null;
    },
    [messages],
  );

  return { messages, run, send, stop };
}
