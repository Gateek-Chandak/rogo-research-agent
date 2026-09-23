import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { PluggableList } from "unified";
import type { Chat } from "../hooks/useChat.ts";
import type { Message, Run, ToolActivity } from "../types.ts";

interface TranscriptProps {
  messages: Message[];
  run: Run | null;
  onExample: (question: string) => void;
}

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

/** How close to the bottom still counts as following along. */
const FOLLOW_THRESHOLD = 140;

// singleTilde off, or "~5.3%" pairs render as strikethrough.
const plugins = [[remarkGfm, { singleTilde: false }]] as PluggableList;

function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        remarkPlugins={plugins}
        components={{
          table: (props) => (
            <div className="table-scroll">
              <table {...props} />
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

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
  return (
    <details className="trail">
      <summary>
        {tools.length} {tools.length === 1 ? "lookup" : "lookups"}
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

function Transcript({ messages, run, onExample }: TranscriptProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Follow new output, unless the reader has scrolled up to re-read something.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < FOLLOW_THRESHOLD) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, run]);

  return (
    <div className="transcript" ref={ref}>
      {messages.length === 0 && !run && (
        <div className="examples">
          {EXAMPLES.map((example) => (
            <button key={example} onClick={() => onExample(example)}>
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
  );
}

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
