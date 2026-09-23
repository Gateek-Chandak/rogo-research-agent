import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat } from "../lib/chatStream.ts";
import type { Message, Run, Thread } from "../types.ts";
import type { AgentEvent, ChatTurn } from "../../shared/chat.ts";

interface ChatOptions {
  threadId: string;
  threads: Thread[];
  append: (threadId: string, message: Message) => void;
}

/** How a question ended: an answer, a failure to report, or a cancellation. */
interface Outcome {
  run: Run;
  failure: string | null;
  stopped: boolean;
}

const EMPTY_RUN: Run = { answer: "", tools: [] };

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

async function research(
  question: string,
  history: ChatTurn[],
  signal: AbortSignal,
  onProgress: (run: Run) => void,
): Promise<Outcome> {
  let run = EMPTY_RUN;

  try {
    for await (const event of streamChat({ message: question, history, signal })) {
      if (event.type === "error") return { run, failure: event.message, stopped: false };
      if (event.type === "done") {
        return { run: { ...run, answer: event.answer }, failure: null, stopped: false };
      }
      run = applyEvent(run, event);
      onProgress(run);
    }
  } catch {
    if (signal.aborted) return { run, failure: null, stopped: true };
    return { run, failure: DROPPED, stopped: false };
  }

  return { run, failure: null, stopped: false };
}

function historyOf(threads: Thread[], threadId: string): ChatTurn[] {
  const thread = threads.find((t) => t.id === threadId);
  return thread?.messages.map(({ role, text }) => ({ role, text })) ?? [];
}

function without<T>(map: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = map;
  return rest;
}

export type Chat = ReturnType<typeof useChat>;

/** Every thread runs and queues on its own; nothing here is shared between them. */
export function useChat({ threadId, threads, append }: ChatOptions) {
  const [runs, setRuns] = useState<Record<string, Run>>({});
  const [queues, setQueues] = useState<Record<string, string[]>>({});
  const controllers = useRef(new Map<string, AbortController>());

  // Read inside start() so a queued question sees the turns before it, and so
  // a run keeps writing to its own thread when the reader moves away.
  const latest = useRef({ threadId, threads, append });
  latest.current = { threadId, threads, append };

  const start = useCallback(async (id: string, question: string) => {
    const { threads: all, append: add } = latest.current;
    const history = historyOf(all, id);

    add(id, { role: "user", text: question, at: Date.now() });

    const controller = new AbortController();
    controllers.current.set(id, controller);
    setRuns((prev) => ({ ...prev, [id]: EMPTY_RUN }));

    const { run, failure, stopped } = await research(
      question,
      history,
      controller.signal,
      (progress) => setRuns((prev) => ({ ...prev, [id]: progress })),
    );

    add(id, {
      role: "assistant",
      text: failure ?? run.answer.trim(),
      at: Date.now(),
      tools: run.tools,
      stopped,
    });

    controllers.current.delete(id);
    setRuns((prev) => without(prev, id));
  }, []);

  const send = useCallback(
    (question: string) => {
      const text = question.trim();
      if (!text) return;

      const { threadId: id } = latest.current;
      if (controllers.current.has(id)) {
        setQueues((prev) => ({ ...prev, [id]: [...(prev[id] ?? []), text] }));
      } else {
        start(id, text);
      }
    },
    [start],
  );

  const stop = useCallback(
    () => controllers.current.get(latest.current.threadId)?.abort(),
    [],
  );

  const unqueue = useCallback((index: number) => {
    const { threadId: id } = latest.current;
    setQueues((prev) => ({
      ...prev,
      [id]: (prev[id] ?? []).filter((_, i) => i !== index),
    }));
  }, []);

  // Drain every thread's queue, not just the one being viewed.
  useEffect(() => {
    for (const [id, pending] of Object.entries(queues)) {
      if (!pending.length || controllers.current.has(id)) continue;
      setQueues((prev) => ({ ...prev, [id]: pending.slice(1) }));
      start(id, pending[0]);
    }
  }, [runs, queues, start]);

  return {
    messages: threads.find((t) => t.id === threadId)?.messages ?? [],
    run: runs[threadId] ?? null,
    queue: queues[threadId] ?? [],
    send,
    stop,
    unqueue,
  };
}
