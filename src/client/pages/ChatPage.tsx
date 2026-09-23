import { useEffect, useRef, useState } from "react";
import type { Message, Run, ToolActivity, useChat } from "../hooks/useChat.ts";
import { Markdown } from "../components/Markdown.tsx";

const clock = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

const EXAMPLES = [
  "Compare Acme and Globex and tell me which one appears to be growing faster.",
  "What are the biggest risks Umbrella Health flags in its filings?",
  "How is Initech's subscription transition going?",
  "Which company in the universe is growing fastest?",
];

function ToolTrail({ tools }: { tools: ToolActivity[] }) {
  return (
    <div className="tools">
      {tools.map((tool) => (
        <div key={tool.id} className={`tool ${tool.status}`}>
          {tool.name}
          {tool.ms !== undefined && <span> · {tool.ms}ms</span>}
        </div>
      ))}
    </div>
  );
}

function ToolSummary({ tools }: { tools: ToolActivity[] }) {
  const elapsed = tools.reduce((total, tool) => total + (tool.ms ?? 0), 0);
  return (
    <details className="trail">
      <summary>
        {tools.length} {tools.length === 1 ? "lookup" : "lookups"} ·{" "}
        {(elapsed / 1000).toFixed(1)}s
      </summary>
      <ToolTrail tools={tools} />
    </details>
  );
}

function Turn({ message }: { message: Message }) {
  return (
    <div className={`turn ${message.role}`}>
      <div className={`bubble ${message.role}`}>
        {message.tools?.length ? <ToolSummary tools={message.tools} /> : null}
        {message.role === "assistant" ? (
          <Markdown>{message.text}</Markdown>
        ) : (
          message.text
        )}
        {message.stopped && <span className="stopped">Stopped</span>}
      </div>
      <time className="stamp">{clock.format(message.at)}</time>
    </div>
  );
}

function ActiveRun({ run }: { run: Run }) {
  return (
    <div className="bubble assistant">
      <ToolTrail tools={run.tools} />
      {run.answer ? (
        <Markdown>{run.answer}</Markdown>
      ) : (
        <span className="pending">Researching…</span>
      )}
    </div>
  );
}

export function ChatPage({ chat }: { chat: ReturnType<typeof useChat> }) {
  const { messages, run, queue, send, stop, unqueue } = chat;
  const [input, setInput] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Follow new output, unless the reader has scrolled up to re-read something.
  useEffect(() => {
    const el = transcriptRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 140) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, run]);

  function submit(question: string) {
    setInput("");
    send(question);
  }

  return (
    <>
      <div className="transcript" ref={transcriptRef}>
        {messages.length === 0 && !run && (
          <div className="examples">
            {EXAMPLES.map((example) => (
              <button key={example} onClick={() => submit(example)}>
                {example}
              </button>
            ))}
          </div>
        )}

        {messages.map((message, i) => (
          <Turn key={i} message={message} />
        ))}

        {run && <ActiveRun run={run} />}
      </div>

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
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
