"use client";

import { CorporateEvent, AgmHistory, AnnualReturnHistory } from "@/lib/clients/history-types";

type Props = { events: CorporateEvent[] };

export default function ComplianceReview({ events }: Props) {
  const agms = events.filter((e): e is AgmHistory => e.type === "AGM");
  const returns = events.filter((e): e is AnnualReturnHistory => e.type === "ANNUAL_RETURN");
  const held = agms.filter(a => a.status === "HELD" && Boolean(a.agmDate))
    .sort((a, b) => b.agmDate.localeCompare(a.agmDate));
  const filed = returns.filter(r => r.filingStatus === "FILED" && Boolean(r.filedDate))
    .sort((a, b) => (b.filedDate || "").localeCompare(a.filedDate || ""));
  const years = Array.from(new Set([...agms.map(a => a.financialYear), ...returns.map(r => r.financialYear)]))
    .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

  const statusFor = (year: string, kind: "agm" | "return") => {
    if (kind === "agm") {
      const rows = agms.filter(a => a.financialYear === year);
      if (rows.length === 0) return "Not recorded";
      const statuses = Array.from(new Set(rows.map(r => r.status)));
      if (statuses.length > 1) return "Conflicting records — review";
      return statuses[0] === "HELD" && !rows.some(r => r.agmDate) ? "Held claimed — date missing" : statuses[0].replaceAll("_", " ");
    }
    const rows = returns.filter(r => r.financialYear === year);
    if (rows.length === 0) return "Not recorded";
    const statuses = Array.from(new Set(rows.map(r => r.filingStatus)));
    if (statuses.length > 1) return "Conflicting records — review";
    return statuses[0] === "FILED" && !rows.some(r => r.filedDate) ? "Filed claimed — date missing" : statuses[0].replaceAll("_", " ");
  };

  return (
    <section className="rounded-[20px] border border-[#d9e3df] bg-[#fffdf7] p-5 space-y-5">
      <div>
        <h3 className="text-lg font-black text-[#22342d]">Compliance Review — Recorded Facts</h3>
        <p className="mt-1 text-xs text-[#6c7671]">
          Based only on saved office history, not a live RJSC verification or legal determination.
          An unrecorded event is not proof that it never occurred.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-[#e7f5ec] p-4">
          <div className="text-xs font-bold text-[#44765b]">Last recorded HELD AGM</div>
          <div className="mt-1 text-lg font-black text-[#22342d]">{held[0] ? held[0].agmDate : "Not verified in records"}</div>
          {held[0] && <div className="mt-1 text-xs">Financial year: {held[0].financialYear}</div>}
        </div>
        <div className="rounded-xl bg-[#e8f7f9] p-4">
          <div className="text-xs font-bold text-[#327382]">Last recorded FILED Annual Return</div>
          <div className="mt-1 text-lg font-black text-[#22342d]">{filed[0] ? filed[0].filedDate : "Not verified in records"}</div>
          {filed[0] && <div className="mt-1 text-xs">Financial year: {filed[0].financialYear}</div>}
        </div>
      </div>

      {years.length === 0 ? (
        <p className="rounded-xl border border-[#ece5d9] bg-white p-4 text-sm text-[#6c7671]">
          No AGM or Annual Return history entered. Record verified information under Corporate History before assessing compliance.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead><tr className="border-b border-[#d9e3df] text-[#44765b]">
              <th className="py-2 pr-3">Financial Year</th><th className="py-2 pr-3">AGM</th><th className="py-2">Annual Return</th>
            </tr></thead>
            <tbody>
              {years.map(year => (
                <tr key={year} className="border-b border-[#ece5d9]">
                  <td className="py-3 pr-3 font-bold">{year}</td>
                  <td className="py-3 pr-3">{statusFor(year, "agm")}</td>
                  <td className="py-3">{statusFor(year, "return")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rounded-xl bg-[#fff5df] p-4">
        <h4 className="text-sm font-bold text-[#715923]">Evidence & next review</h4>
        <p className="mt-2 text-sm leading-6 text-[#615b4c]">
          Compare saved history against the latest RJSC record and filing acknowledgements.
          Check AGM notice, attendance/minutes and resolutions separately from Annual Return or Schedule X.
          Audit reports and DVC are supporting accounting documents, not proof of an AGM date.
          If an AGM is marked Not Held, verify the circumstances and available lawful steps before proposing a service.
        </p>
      </div>
      <p className="text-xs text-[#6c7671]">Staff must confirm source documents and legal position before advising the client, calculating fees or opening a work.</p>
    </section>
  );
}
