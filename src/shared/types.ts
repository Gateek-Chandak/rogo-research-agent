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
  | { type: "tool_failed"; id: string; name: string; ms: number; message: string }
  | { type: "notice"; text: string };

/** Exactly one of these ends every stream. */
export type StreamEnd =
  | { type: "done"; answer: string; iterations: number; ms: number }
  | { type: "error"; message: string };

export type StreamEvent = AgentEvent | StreamEnd;

export const MAX_HISTORY_TURNS = 20;

export function isStreamEnd(event: StreamEvent): event is StreamEnd {
  return event.type === "done" || event.type === "error";
}
