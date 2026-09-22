/** Tool definitions sent to the model. */

import type Anthropic from "@anthropic-ai/sdk";

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
