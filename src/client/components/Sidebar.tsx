import type { Thread } from "../types.ts";

interface SidebarProps {
  threads: Thread[];
  activeId: string;
  onDataPage: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

export function Sidebar({
  threads,
  activeId,
  onDataPage,
  onSelect,
  onCreate,
  onDelete,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">Rogo</div>

      <a href="#/data" className={`nav-item ${onDataPage ? "active" : ""}`}>
        Data
      </a>

      <div className="section">
        <span>Chats</span>
        <button onClick={onCreate} title="New chat" aria-label="New chat">
          +
        </button>
      </div>

      <ul className="threads">
        {threads.map((thread) => (
          <li
            key={thread.id}
            className={!onDataPage && thread.id === activeId ? "active" : ""}
          >
            <a href="#/" onClick={() => onSelect(thread.id)}>
              {thread.title}
            </a>
            <button
              onClick={() => onDelete(thread.id)}
              title="Delete chat"
              aria-label={`Delete ${thread.title}`}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
