/**
 * npm run bench [--save] — times each case against baseline.json.
 * The model varies run to run, so each case runs RUNS times and we compare medians.
 * Cases run one at a time so they don't slow each other down.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { BENCHMARKS } from "./cases.ts";
import { runTrace, type Trace } from "../shared/trace.ts";

const METRICS = ["seconds", "firstTokenSeconds", "toolCalls", "repeatedCalls", "turns"] as const;
type Metrics = Record<(typeof METRICS)[number], number>;

const RUNS = 3;
const BASELINE = new URL("./baseline.json", import.meta.url);

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const toSeconds = (ms: number) => Math.round(ms / 100) / 10;

function measure(trace: Trace): Metrics {
  const calls = trace.toolCalls.map((call) => JSON.stringify(call));
  return {
    seconds: toSeconds(trace.ms),
    firstTokenSeconds: toSeconds(trace.firstTokenMs),
    toolCalls: calls.length,
    repeatedCalls: calls.length - new Set(calls).size,
    turns: trace.turns,
  };
}

async function bench(question: string): Promise<Metrics> {
  const runs: Metrics[] = [];
  for (let i = 0; i < RUNS; i++) runs.push(measure(await runTrace(question)));

  const result = {} as Metrics;
  for (const key of METRICS) result[key] = median(runs.map((run) => run[key]));
  return result;
}

// "before → now" for each metric, or just now when there's no baseline yet.
function vsBaseline(now: Metrics, before?: Metrics) {
  if (!before) return now;
  const row: Record<string, string> = {};
  for (const key of METRICS) row[key] = `${before[key]} → ${now[key]}`;
  return row;
}

const baseline: Record<string, Metrics> = existsSync(BASELINE)
  ? JSON.parse(readFileSync(BASELINE, "utf8"))
  : {};
const results: Record<string, Metrics> = {};
const table: Record<string, object> = {};

for (const [name, question] of Object.entries(BENCHMARKS)) {
  console.log(`running ${name}…`);
  results[name] = await bench(question);
  table[name] = vsBaseline(results[name], baseline[name]);
}

console.table(table);

if (process.argv.includes("--save")) {
  writeFileSync(BASELINE, JSON.stringify(results, null, 2) + "\n");
  console.log("Saved as the new baseline.");
}
