import { useState } from "react";
import { useChat, type Run } from "./hooks/useChat.ts";
import { Markdown } from "./components/Markdown.tsx";

const EXAMPLES = [
  "Compare Acme and Globex and tell me which one appears to be growing faster.",
  "What are the biggest risks Umbrella Health flags in its filings?",
  "How is Initech's subscription transition going?",
  "Which company in the universe is growing fastest?",
];

function ActiveRun({ run }: { run: Run }) {
  return (
    <div className="bubble assistant">
      {run.tools.map((tool) => (
        <div key={tool.id} className={`tool ${tool.status}`}>
          {tool.name}
          {tool.ms !== undefined && <span> · {tool.ms}ms</span>}
        </div>
      ))}
      {run.answer ? (
        <Markdown>{run.answer}</Markdown>
      ) : (
        <span className="pending">Researching…</span>
      )}
    </div>
  );
}

export function App() {
  const { messages, run, send, stop } = useChat();
  const [input, setInput] = useState("");

  function submit(question: string) {
    setInput("");
    send(question);
  }

  return (
    <div className="app">
      <header>
        <h1>Rogo Research</h1>
        <p>Ask a question about a company in our coverage universe.</p>
      </header>

      <div className="transcript">
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
          <div key={i} className={`bubble ${message.role}`}>
            {message.role === "assistant" ? (
              <Markdown>{message.text}</Markdown>
            ) : (
              message.text
            )}
            {message.stopped && <span className="stopped">Stopped</span>}
          </div>
        ))}

        {run && <ActiveRun run={run} />}
      </div>

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
          placeholder="Ask a research question…"
        />
        {run ? (
          <button type="button" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="submit">Send</button>
        )}
      </form>
    </div>
  );
}
