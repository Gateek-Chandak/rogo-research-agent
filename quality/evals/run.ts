/** npm run eval [name filter] — runs every eval case in parallel and reports pass/fail. */

import { EVALS } from "./cases.ts";
import { validLinks } from "./checks.ts";
import { runTrace } from "../shared/trace.ts";

const filter = process.argv[2]?.toLowerCase() ?? "";
const cases = EVALS.filter((c) => c.name.toLowerCase().includes(filter));

const results = await Promise.all(
  cases.map(async (c) => {
    try {
      const trace = await runTrace(c.question, c.history);
      const failures = [...c.expect, validLinks].map((check) => check(trace)).filter((f) => f !== null);
      return { name: c.name, failures, answer: trace.answer };
    } catch (err) {
      return { name: c.name, failures: [`crashed: ${err}`], answer: "" };
    }
  }),
);

for (const { name, failures, answer } of results) {
  if (!failures.length) {
    console.log(`✓ ${name}`);
    continue;
  }
  console.log(`✗ ${name} — ${failures.join("; ")}`);
  console.log(`  ${answer.replaceAll("\n", "\n  ")}\n`);
}

const passed = results.filter((r) => !r.failures.length).length;
console.log(`\n${passed}/${results.length} passed`);
process.exitCode = passed === results.length ? 0 : 1;
