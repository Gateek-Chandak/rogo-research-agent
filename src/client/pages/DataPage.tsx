import { useEffect, useState } from "react";
import type { CompanyDetail } from "../../shared/types/research.ts";

const money = (n: number | null) =>
  n === null ? "Not filed" : n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const pct = (n: number | null) => (n === null ? "—" : `${(n * 100).toFixed(1)}%`);

// Row and document ids (FY2025, DOC-ACME-001) are what the agent's citation links point to.
function CompanyData({ detail }: { detail: CompanyDetail }) {
  const { company, financials, documents } = detail;
  const notes = [
    ...(financials?.warnings ?? []),
    ...(financials?.provenance.restatements.map((r) => `${r.period} restated: ${r.note}`) ?? []),
  ];

  return (
    <div className="markdown">
      <h2>
        {company.name} ({company.ticker})
      </h2>
      <p>
        {company.sector} · {company.hq} · founded {company.founded} ·{" "}
        {company.employees.toLocaleString("en-US")} employees
      </p>
      <p>{company.description}</p>
      <p>
        Segments: {company.segments.map((s) => `${s.name} ${pct(s.shareOfRevenue)}`).join(" · ")}
      </p>

      {notes.length > 0 && (
        <ul className="notes">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      {financials && (
        <>
          <h3>Annual · {financials.currency} {financials.unit}</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Year</th>
                  <th align="right">Revenue</th>
                  <th align="right">Gross margin</th>
                  <th align="right">Operating income</th>
                  <th align="right">Net income</th>
                  <th align="right">Free cash flow</th>
                </tr>
              </thead>
              <tbody>
                {financials.annual.map((year) => (
                  <tr key={year.fiscalYear} id={`FY${year.fiscalYear}`}>
                    <td>FY{year.fiscalYear}</td>
                    <td align="right">{money(year.revenue)}</td>
                    <td align="right">{pct(year.grossMargin)}</td>
                    <td align="right">{money(year.operatingIncome)}</td>
                    <td align="right">{money(year.netIncome)}</td>
                    <td align="right">{money(year.freeCashFlow)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3>Quarterly</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th align="right">Revenue</th>
                  <th align="right">Gross margin</th>
                  <th align="right">Operating income</th>
                </tr>
              </thead>
              <tbody>
                {financials.quarterly.map((quarter) => (
                  <tr key={quarter.period}>
                    <td>{quarter.period}</td>
                    <td align="right">{money(quarter.revenue)}</td>
                    <td align="right">{pct(quarter.grossMargin)}</td>
                    <td align="right">{money(quarter.operatingIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3>Documents</h3>
      {documents.map((doc) => (
        <article key={doc.id} id={doc.id}>
          <h4>{doc.title}</h4>
          <p className="meta">
            {doc.form} · {doc.date} · {doc.id}
          </p>
          <p>{doc.body}</p>
        </article>
      ))}
    </div>
  );
}

export function DataPage({ ticker, anchor }: { ticker?: string; anchor?: string }) {
  const [all, setAll] = useState<CompanyDetail[]>();
  const selected = all?.find((d) => d.company.ticker === ticker?.toUpperCase());

  useEffect(() => {
    fetch("/api/companies")
      .then((res) => res.json())
      .then(setAll);
  }, []);

  // The hash holds the route, so the browser can't scroll to the anchor itself.
  useEffect(() => {
    if (anchor) document.getElementById(anchor)?.scrollIntoView();
  }, [anchor, selected]);

  return (
    <div className="data-page">
      <aside>
        {all?.map(({ company: c }) => (
          <a key={c.ticker} href={`#/data/${c.ticker}`} className={c === selected?.company ? "active" : ""}>
            {c.name}
            <span>{c.ticker}</span>
          </a>
        ))}
      </aside>

      <main>
        {!all ? (
          <p className="pending">Loading…</p>
        ) : selected ? (
          <CompanyData detail={selected} />
        ) : (
          <p className="pending">
            {ticker ? `We don't cover "${ticker}".` : "Pick a company to see its profile, financials and filings."}
          </p>
        )}
      </main>
    </div>
  );
}
