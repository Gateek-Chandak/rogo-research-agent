/**
 * The contract between the agent and the UI. Defined once here so the server
 * that emits these events and the client that renders them cannot drift.
 */

export type AgentEvent =
  | { type: "iteration"; n: number }
  | { type: "tool_start"; name: string; input: unknown }
  | { type: "tool_end"; name: string; ms: number }
  | { type: "tool_failed"; name: string; message: string };
