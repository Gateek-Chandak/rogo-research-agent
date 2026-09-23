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

// Ids on the data page. Citation links (#/data/TICKER/ID) point to them.
export const yearId = (year: AnnualFigures) => `FY${year.fiscalYear}`;
export const quarterId = (quarter: QuarterlyFigures) => quarter.period.replace(" ", "-");

/** Every link the data page can open for a company. */
export function dataLinks({ company, financials, documents }: CompanyDetail): string[] {
  const ids = [
    ...(financials?.annual.map(yearId) ?? []),
    ...(financials?.quarterly.map(quarterId) ?? []),
    ...documents.map((doc) => doc.id),
  ];
  return [`#/data/${company.ticker}`, ...ids.map((id) => `#/data/${company.ticker}/${id}`)];
}
