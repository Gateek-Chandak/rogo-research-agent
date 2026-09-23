/** Runs the agent once and records what it did. The only file in quality/ that imports the agent. */

import "dotenv/config";
import { runAgent } from "../../src/server/agent/agent.ts";
import type { ChatTurn } from "../../src/shared/chat.ts";

export interface Trace {
  answer: string;
  ms: number;
  firstTokenMs: number;
  toolCalls: { name: string; input: unknown }[];
  turns: number;
}

export async function runTrace(question: string, history: ChatTurn[] = []): Promise<Trace> {
  const startedAt = Date.now();
  const toolCalls: Trace["toolCalls"] = [];
  let firstTokenMs = 0;

  const result = await runAgent({
    question,
    history,
    onEvent: (event) => {
      if (event.type === "tool_start") toolCalls.push({ name: event.name, input: event.input });
      if (event.type === "text_delta" && !firstTokenMs) firstTokenMs = Date.now() - startedAt;
    },
  });

  return { answer: result.answer, ms: result.ms, firstTokenMs, toolCalls, turns: result.iterations };
}
