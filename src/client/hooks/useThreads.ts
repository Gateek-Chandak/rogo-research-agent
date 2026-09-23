import { useCallback, useState } from "react";
import type { Message, Thread } from "../types.ts";

const TITLE_LIMIT = 44;

function blankThread(): Thread {
  return { id: crypto.randomUUID(), title: "New chat", messages: [] };
}

/** A thread is named after the question that started it. */
function titleFrom(message: Message): string {
  const text = message.text.trim();
  return text.length > TITLE_LIMIT ? `${text.slice(0, TITLE_LIMIT)}…` : text;
}

export function useThreads() {
  const [threads, setThreads] = useState<Thread[]>(() => [blankThread()]);
  const [activeId, setActiveId] = useState(() => threads[0].id);

  const active = threads.find((t) => t.id === activeId) ?? threads[0];

  const append = useCallback((threadId: string, message: Message) => {
    setThreads((prev) =>
      prev.map((thread) => {
        if (thread.id !== threadId) return thread;
        const first = thread.messages.length === 0 && message.role === "user";
        return {
          ...thread,
          title: first ? titleFrom(message) : thread.title,
          messages: [...thread.messages, message],
        };
      }),
    );
  }, []);

  const create = useCallback(() => {
    const thread = blankThread();
    setThreads((prev) => [thread, ...prev]);
    setActiveId(thread.id);
  }, []);

  // Deleting the last thread leaves a fresh one rather than an empty screen.
  const remove = useCallback(
    (threadId: string) => {
      const remaining = threads.filter((t) => t.id !== threadId);
      const next = remaining.length ? remaining : [blankThread()];

      setThreads(next);
      if (threadId === activeId) setActiveId(next[0].id);
    },
    [threads, activeId],
  );

  return { threads, active, activeId, select: setActiveId, append, create, remove };
}
