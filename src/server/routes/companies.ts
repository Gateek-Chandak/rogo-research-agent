/** GET /api/companies — every company with its financials and documents, for the data page. */

import { Router } from "express";
import { companyDetails } from "../data.ts";

export const companiesRouter = Router();

companiesRouter.get("/", (_req, res) => {
  res.json(companyDetails);
});
