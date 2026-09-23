/** The building blocks of an eval. A check returns why the answer failed, or null if it passed. */

import { companyDetails } from "../../src/server/data.ts";
import { dataLinks } from "../../src/shared/research.ts";
import type { ChatTurn } from "../../src/shared/chat.ts";
import type { Trace } from "../shared/trace.ts";

export type Check = (trace: Trace) => string | null;

export interface EvalCase {
  name: string;
  question: string;
  history?: ChatTurn[];
  expect: Check[];
}

const VALID_LINKS = new Set(companyDetails.flatMap(dataLinks));

const has = (answer: string, text: string) => answer.toLowerCase().includes(text.toLowerCase());
const linksIn = (answer: string) => answer.match(/#\/data[^)\s]*/g) ?? [];

export const includes = (text: string): Check => ({ answer }) =>
  has(answer, text) ? null : `missing "${text}"`;

export const excludes = (text: string): Check => ({ answer }) =>
  has(answer, text) ? `should not say "${text}"` : null;

export const matches = (pattern: RegExp): Check => ({ answer }) =>
  pattern.test(answer) ? null : `does not match ${pattern}`;

export const usesTool = (name: string): Check => ({ toolCalls }) =>
  toolCalls.some((call) => call.name === name) ? null : `never called ${name}`;

export const cites: Check = ({ answer }) => (linksIn(answer).length ? null : "no source links");

/** Runs on every case: a link the data page can't open is worse than no link. */
export const validLinks: Check = ({ answer }) => {
  const broken = linksIn(answer).filter((link) => !VALID_LINKS.has(link));
  return broken.length ? `broken links: ${broken.join(", ")}` : null;
};
