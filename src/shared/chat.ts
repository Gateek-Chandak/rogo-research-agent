/** Shared by the server and the client so the two cannot drift. */

export interface ChatTurn {
  role: "user" | "assistant";
  text: string;
}

export interface ChatRequest {
  message: string;
  /** Oldest first. Without it, "and its margin?" has no referent. */
  history?: ChatTurn[];
}

export type AgentEvent =
  | { type: "iteration"; n: number }
  | { type: "text_delta"; text: string }
  | { type: "tool_start"; id: string; name: string; input: unknown }
  | { type: "tool_end"; id: string; name: string; ms: number }
  | { type: "tool_failed"; id: string; name: string; ms: number; message: string };

/** Agent events, then exactly one "done" or "error" to end the stream. */
export type StreamEvent =
  | AgentEvent
  | { type: "done"; answer: string }
  | { type: "error"; message: string };
