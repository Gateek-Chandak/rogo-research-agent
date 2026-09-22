/** POST /api/chat — runs the agent for one question. */

import { Router } from "express";
import { runAgent, type AgentResult } from "./agent/agent.ts";
import type { AgentEvent } from "../shared/events.ts";

export const apiRouter = Router();

/** The terminal log is the fastest way to see what the agent actually did. */
function logAgentEvent(event: AgentEvent): void {
  switch (event.type) {
    case "iteration":
      console.log(`[agent] iteration ${event.n}`);
      break;
    case "tool_start":
      console.log(`[tool]  → ${event.name} ${JSON.stringify(event.input)}`);
      break;
    case "tool_end":
      console.log(`[tool]  ← ${event.name} (${event.ms}ms)`);
      break;
    case "tool_failed":
      console.log(`[tool]  ! ${event.name}: ${event.message}`);
      break;
  }
}

apiRouter.post("/chat", async (req, res) => {
  const message = String(req.body.message ?? "");
  console.log(`\n[chat] ${message}`);

  try {
    const result: AgentResult = await runAgent(message, logAgentEvent);
    res.json({ answer: result.answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
});
