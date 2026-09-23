import { companies, type Company } from "../data.ts";

/** Thrown when a tool cannot service a request. The message is shown to the model. */
export class ToolError extends Error {}

const UNIVERSE = companies.map((c) => `${c.name} (${c.ticker})`).join(", ");

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      const swap = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + swap);
    }
    prev = row;
  }

  return prev[b.length];
}

/** How far a typo is from any name a company answers to. */
function typoDistance(needle: string, company: Company): number {
  const names = [company.name, company.name.split(" ")[0], company.ticker];
  return Math.min(...names.map((n) => editDistance(needle, n.toLowerCase())));
}

/**
 * Maps whatever the model passed to a company: exact name, exact ticker,
 * substring, then a near-miss. Tickers match case-sensitively so uppercase
 * "ACME" is Acme Corp while "Acme" stays ambiguous with Acme Robotics.
 */
export function resolveCompany(input: unknown): Company {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) throw new ToolError(`"company" is required. We cover: ${UNIVERSE}.`);

  const needle = raw.toLowerCase();

  const exact = companies.find(
    (c) => c.name.toLowerCase() === needle || c.ticker === raw,
  );
  if (exact) return exact;

  const overlapping = companies.filter((c) => {
    const name = c.name.toLowerCase();
    return name.includes(needle) || needle.includes(name);
  });
  if (overlapping.length === 1) return overlapping[0];
  if (overlapping.length > 1) {
    const options = overlapping.map((c) => `${c.name} (${c.ticker})`).join(" or ");
    throw new ToolError(
      `"${raw}" matches ${options}, which are unrelated companies. Ask the analyst which one they mean.`,
    );
  }

  const limit = needle.length <= 5 ? 1 : 2;
  const near = companies
    .map((c) => ({ company: c, d: typoDistance(needle, c) }))
    .filter((m) => m.d <= limit)
    .sort((a, b) => a.d - b.d);

  if (near.length && (near.length === 1 || near[0].d < near[1].d)) return near[0].company;

  throw new ToolError(`"${raw}" is not in our coverage universe. We cover: ${UNIVERSE}.`);
}
