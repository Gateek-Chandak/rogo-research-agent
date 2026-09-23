import { useSyncExternalStore } from "react";
import { useChat } from "./hooks/useChat.ts";
import { useThreads } from "./hooks/useThreads.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { ChatPage } from "./pages/ChatPage.tsx";
import { DataPage } from "./pages/DataPage.tsx";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function App() {
  const { threads, active, activeId, select, append, create, remove } = useThreads();

  // Owned here so a running answer survives a trip to the data page.
  const chat = useChat({ threadId: active.id, threads, append });

  // "#/data/ITCH/FY2025" → page "data", ticker "ITCH", anchor "FY2025".
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const [, page, ticker, anchor] = hash.split("/");
  const onDataPage = page === "data";

  return (
    <div className="shell">
      <Sidebar
        threads={threads}
        activeId={activeId}
        onDataPage={onDataPage}
        onSelect={select}
        onCreate={create}
        onDelete={remove}
      />

      <div className="app">
        {onDataPage ? (
          <DataPage ticker={ticker} anchor={anchor} />
        ) : (
          <ChatPage key={active.id} chat={chat} />
        )}
      </div>
    </div>
  );
}
