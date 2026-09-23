import { useSyncExternalStore } from "react";
import { useChat } from "./hooks/useChat.ts";
import { ChatPage } from "./pages/ChatPage.tsx";
import { DataPage } from "./pages/DataPage.tsx";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

export function App() {
  // Owned here so a running answer survives a trip to the data page.
  const chat = useChat();

  // "#/data/ITCH/FY2025" → page "data", ticker "ITCH", anchor "FY2025".
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const [, page, ticker, anchor] = hash.split("/");
  const onDataPage = page === "data";

  return (
    <div className="app">
      <header>
        <h1>Rogo Research</h1>
        <nav>
          <a href="#/" className={onDataPage ? "" : "active"}>
            Chat
          </a>
          <a href="#/data" className={onDataPage ? "active" : ""}>
            Data
          </a>
        </nav>
      </header>

      {onDataPage ? <DataPage ticker={ticker} anchor={anchor} /> : <ChatPage chat={chat} />}
    </div>
  );
}
