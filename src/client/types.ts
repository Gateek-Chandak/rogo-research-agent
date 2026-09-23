import type { ChatTurn } from "../shared/chat.ts";

export interface ToolActivity {
  id: string;
  name: string;
  status: "running" | "done" | "failed";
  ms?: number;
}

export interface Message extends ChatTurn {
  at: number;
  tools?: ToolActivity[];
  stopped?: boolean;
}

/** What a question has produced so far. */
export interface Run {
  answer: string;
  tools: ToolActivity[];
}

export interface Thread {
  id: string;
  title: string;
  messages: Message[];
}
