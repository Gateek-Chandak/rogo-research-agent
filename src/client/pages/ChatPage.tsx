import { useEffect, useRef, useState } from "react";
import { Transcript } from "../components/Transcript.tsx";
import type { Chat } from "../hooks/useChat.ts";

export function ChatPage({ chat }: { chat: Chat }) {
  const { messages, run, queue, send, stop, unqueue } = chat;
  const [input, setInput] = useState("");
  const composerRef = useRef<HTMLInputElement>(null);

  // ChatPage is keyed by thread in App, so this also fires on a chat switch.
  useEffect(() => composerRef.current?.focus(), []);

  function submit(question: string) {
    setInput("");
    send(question);
    composerRef.current?.focus();
  }

  return (
    <>
      <Transcript messages={messages} run={run} onExample={submit} />

      {queue.length > 0 && (
        <ul className="queue">
          {queue.map((question, i) => (
            <li key={i}>
              <span>{question}</span>
              <button onClick={() => unqueue(i)} aria-label="Remove from queue">
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault();
          submit(input);
        }}
      >
        <input
          ref={composerRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={run ? "Queue another question…" : "Ask a research question…"}
        />
        {run ? (
          <button type="button" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="submit">Send</button>
        )}
      </form>
    </>
  );
}
