/**
 * The agent's tools: the schemas the model sees, a company resolver, and the handlers.
 * They stand in for the real research APIs — same shapes, local data, plus a little latency.
 */

import type Anthropic from "@anthropic-ai/sdk";
import { companies, documents, financials } from "./data.ts";
import type { Company } from "../shared/research.ts";

/** Thrown when a tool cannot service a request. The message is shown to the model. */
export class ToolError extends Error {}

export const toolSchemas: Anthropic.Tool[] = [
  {
    name: "searchCompanies",
    description:
      "Search the coverage universe for companies matching a name. Returns the company name, ticker and sector for each match.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "A company name or part of one." },
      },
      required: ["query"],
    },
  },
  {
    name: "getCompanyProfile",
    description:
      "Get a company's profile: description, sector, headquarters, headcount, business segments and the filings we hold.",
    input_schema: {
      type: "object",
      properties: {
        company: { type: "string", description: "The company name." },
      },
      required: ["company"],
    },
  },
  {
    name: "getFinancials",
    description:
      "Get annual and quarterly financials for a company: revenue, gross margin, operating income, net income and free cash flow.",
    input_schema: {
      type: "object",
      properties: {
        company: { type: "string", description: "The company name." },
      },
      required: ["company"],
    },
  },
  {
    name: "searchDocuments",
    description:
      "Keyword search over earnings call transcripts, filing excerpts and press releases.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords to search for." },
        company: {
          type: "string",
          description: "Optional. Restrict the search to one company.",
        },
      },
      required: ["query"],
    },
  },
];

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function searchCompanies(query: string) {
  await sleep(250);
  const needle = query.toLowerCase();
  const matches = companies.filter((c) => c.name.toLowerCase().includes(needle));
  return matches.map((c) => ({
    name: c.name,
    ticker: c.ticker,
    sector: c.sector,
  }));
}

async function getCompanyProfile(company: string) {
  await sleep(450);
  return resolveCompany(company);
}

async function getFinancials(company: string) {
  await sleep(800);
  const match = resolveCompany(company);
  const record = financials.find((f) => f.company === match.name);
  if (!record) throw new ToolError(`No financials are held for ${match.name}.`);
  return record;
}

async function searchDocuments(query: string, company?: string) {
  await sleep(700);

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  // The upstream document index rejects long queries.
  if (terms.length > 6) {
    throw new ToolError(
      `document search accepts at most 6 terms (received ${terms.length})`,
    );
  }

  const scoped = company ? resolveCompany(company) : null;
  const pool = scoped ? documents.filter((d) => d.company === scoped.name) : documents;

  const scored = pool.map((doc) => {
    const haystack = `${doc.title} ${doc.body}`.toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (haystack.includes(term)) score += 1;
    }
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((s) => s.doc);
}

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "searchCompanies":
      return searchCompanies(input.query as string);
    case "getCompanyProfile":
      return getCompanyProfile(input.company as string);
    case "getFinancials":
      return getFinancials(input.company as string);
    case "searchDocuments":
      return searchDocuments(input.query as string, input.company as string | undefined);
    default:
      throw new ToolError(`unknown tool "${name}"`);
  }
}
