/** POST /api/chat — streams one agent run as Server-Sent Events. */

import { Router, type Response } from "express";
import { runAgent } from "../agent/agent.ts";
import {
  type AgentEvent,
  type ChatRequest,
  type ChatTurn,
  type StreamEvent,
} from "../../shared/chat.ts";

export const chatRouter = Router();

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
    case "notice":
      console.log(`[agent] ${event.text}`);
      break;
  }
}

function parseRequest(body: unknown): ChatRequest | null {
  const { message, history } = (body ?? {}) as Partial<ChatRequest>;
  const question = typeof message === "string" ? message.trim() : "";

  if (!question) return null;

  const turns = Array.isArray(history)
    ? history.filter(
        (turn): turn is ChatTurn =>
          !!turn &&
          (turn.role === "user" || turn.role === "assistant") &&
          typeof turn.text === "string",
      )
    : [];

  return { message: question, history: turns };
}

function openStream(res: Response): (event: StreamEvent) => void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  return (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
}

chatRouter.post("/", async (req, res) => {
  const parsed = parseRequest(req.body);

  if (!parsed) {
    res.status(400).json({ error: "That request could not be read." });
    return;
  }

  console.log(`\n[chat] ${parsed.message}`);
  const send = openStream(res);

  const controller = new AbortController();
  res.on("close", () => controller.abort());

  try {
    const result = await runAgent({
      question: parsed.message,
      history: parsed.history,
      signal: controller.signal,
      onEvent: (event) => {
        logAgentEvent(event);
        send(event);
      },
    });

    console.log(`[chat] done in ${result.ms}ms over ${result.iterations} iterations`);
    send({ type: "done", ...result });
  } catch (err) {
    if (controller.signal.aborted) {
      console.log("[chat] cancelled by client");
    } else {
      console.error(err);
      send({
        type: "error",
        message:
          "I hit a problem partway through researching that. Nothing was saved — try asking again.",
      });
    }
  } finally {
    res.end();
  }
});
