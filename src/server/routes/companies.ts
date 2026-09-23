/** GET /api/companies — every company with its financials and documents, for the data page. */

import { Router } from "express";
import { companies, documents, financials } from "../data.ts";
import type { CompanyDetail } from "../../shared/research.ts";

const all: CompanyDetail[] = companies.map((company) => ({
  company,
  financials: financials.find((f) => f.ticker === company.ticker) ?? null,
  documents: documents.filter((d) => d.company === company.name),
}));

export const companiesRouter = Router();

companiesRouter.get("/", (_req, res) => {
  res.json(all);
});
