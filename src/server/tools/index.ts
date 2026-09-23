/**
 * Tool implementations and the name→handler registry. These stand in for
 * the real research APIs — same shapes, local data, plus a little latency
 * so the app behaves like the real thing.
 */

import { companies, documents, financials } from "../data.ts";
import { resolveCompany, ToolError } from "./resolve.ts";

export { toolSchemas } from "./schemas.ts";
export { ToolError } from "./resolve.ts";

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
