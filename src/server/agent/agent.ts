/**
 * The research agent: a tool-use loop over the mocked research tools.
 */

import Anthropic from "@anthropic-ai/sdk";
import { executeTool, toolSchemas } from "../tools/index.ts";
import { SYSTEM_PROMPT } from "./prompts.ts";
import {
  MAX_HISTORY_TURNS,
  type AgentEvent,
  type ChatTurn,
} from "../../shared/types.ts";

const MODEL = process.env.ROGO_MODEL ?? "claude-sonnet-5";
const MAX_ITERATIONS = 12;
const MAX_TOKENS = 16000;

const client = new Anthropic();

export interface RunAgentOptions {
  question: string;
  history?: ChatTurn[];
  onEvent?: (event: AgentEvent) => void;
  signal?: AbortSignal;
}

export interface AgentResult {
  answer: string;
  iterations: number;
  ms: number;
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export async function runAgent({
  question,
  history = [],
  onEvent = () => {},
  signal,
}: RunAgentOptions): Promise<AgentResult> {
  const startedAt = Date.now();

  const messages: Anthropic.MessageParam[] = [
    ...history.slice(-MAX_HISTORY_TURNS).map(({ role, text }) => ({
      role,
      content: text,
    })),
    { role: "user", content: question },
  ];

  let answer = "";
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    onEvent({ type: "iteration", n: iterations });

    const stream = client.messages.stream(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: toolSchemas,
        messages,
      },
      { signal },
    );

    stream.on("text", (text) => onEvent({ type: "text_delta", text }));
    const response = await stream.finalMessage();

    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
    );

    if (toolUses.length === 0) {
      answer = textOf(response);
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const use of toolUses) {
      const startedToolAt = Date.now();
      onEvent({ type: "tool_start", id: use.id, name: use.name, input: use.input });

      let content: string;
      try {
        const output = await executeTool(use.name, use.input as Record<string, unknown>);
        content = JSON.stringify(output);
        onEvent({
          type: "tool_end",
          id: use.id,
          name: use.name,
          ms: Date.now() - startedToolAt,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        content = `${use.name} returned: ${message}`;
        onEvent({
          type: "tool_failed",
          id: use.id,
          name: use.name,
          ms: Date.now() - startedToolAt,
          message,
        });
      }

      toolResults.push({ type: "tool_result", tool_use_id: use.id, content });
    }

    messages.push({ role: "user", content: toolResults });
  }

  if (!answer) {
    onEvent({ type: "notice", text: "Ran out of research steps." });
    answer =
      "I looked at a number of sources but ran out of research steps before I could pull the answer together. Try asking a narrower question.";
  }

  return { answer, iterations, ms: Date.now() - startedAt };
}
