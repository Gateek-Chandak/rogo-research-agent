/** Research data shapes, shared by the server and the data page. */

export interface Company {
  name: string;
  ticker: string;
  sector: string;
  hq: string;
  founded: number;
  employees: number;
  description: string;
  segments: { name: string; shareOfRevenue: number }[];
  filings: { id: string; form: string; period: string; filedOn: string }[];
}

export interface AnnualFigures {
  fiscalYear: number;
  revenue: number | null;
  grossMargin: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  freeCashFlow: number | null;
}

export interface QuarterlyFigures {
  period: string;
  revenue: number;
  grossMargin: number;
  operatingIncome: number;
}

export interface FinancialRecord {
  company: string;
  ticker: string;
  currency: string;
  unit: string;
  annual: AnnualFigures[];
  quarterly: QuarterlyFigures[];
  provenance: {
    source: string;
    ingestedAt: string;
    pipelineVersion: string;
    checksum: string;
    restatements: { period: string; note: string }[];
  };
  warnings?: string[];
}

export interface ResearchDocument {
  id: string;
  company: string;
  form: string;
  title: string;
  date: string;
  body: string;
}

export interface CompanyDetail {
  company: Company;
  financials: FinancialRecord | null;
  documents: ResearchDocument[];
}
