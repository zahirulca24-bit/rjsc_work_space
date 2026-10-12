"use client";

import { useState } from "react";
import { Printer, AlertTriangle, CheckCircle2 } from "lucide-react";
import { CompanyData, DirectorRecord, ShareholderRecord } from "@/lib/api/working-papers";

interface ScheduleXProps {
  companyData?: CompanyData;
  directors?: DirectorRecord[];
  shareholders?: ShareholderRecord[];
  agmDate?: string;
  financialYear?: string;
}

const DEFAULT_COMPANY: CompanyData = {
  legal_name: "SAMPLE ENTERPRISES LTD.",
  registration_no: "C-123456/2020",
  entity_type: "PRIVATE_LIMITED",
  incorporation_date: "2020-01-15",
  registered_office: "Motijheel Commercial Area, Dhaka-1000",
  authorized_capital: 10000000,
  paid_up_capital: 5000000,
};

const DEFAULT_DIRECTORS: DirectorRecord[] = [
  { id: "1", full_name: "Md. Zahirul Islam", designation: "Managing Director", is_current: true },
  { id: "2", full_name: "Nasrin Akhter", designation: "Director", is_current: true }
];

const DEFAULT_SHAREHOLDERS: ShareholderRecord[] = [
  { id: "1", shareholder_name: "Md. Zahirul Islam", share_count: 30000, share_value: 100, total_value: 3000000, ownership_percentage: 60 },
  { id: "2", shareholder_name: "Nasrin Akhter", share_count: 20000, share_value: 100, total_value: 2000000, ownership_percentage: 40 }
];

export default function ScheduleXWorkingDraft({
  companyData = DEFAULT_COMPANY,
  directors = DEFAULT_DIRECTORS,
  shareholders = DEFAULT_SHAREHOLDERS,
  agmDate,
  financialYear = "2023-2024"
}: ScheduleXProps) {
  const [agm, setAgm] = useState(agmDate || "");
  const [totalAuthorized, setTotalAuthorized] = useState(
    companyData?.authorized_capital ? String(companyData.authorized_capital) : "10000000"
  );
  const [totalPaidUp, setTotalPaidUp] = useState(
    companyData?.paid_up_capital ? String(companyData.paid_up_capital) : "5000000"
  );
  const [reviewed, setReviewed] = useState(false);

  const activeDirectors = (directors || []).filter((d) => d.is_current !== false);
  const totalShares = (shareholders || []).reduce((acc, s) => acc + (s.share_count || 0), 0);

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #schedule-x-print, #schedule-x-print * { visibility: visible !important; }
          #schedule-x-print { position: absolute !important; top: 0; left: 0; width: 100%; padding: 12mm; background: white; color: black; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 12mm; }
          #schedule-x-print table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 8px; }
          #schedule-x-print th, #schedule-x-print td { border: 1px solid #333; padding: 6px; font-size: 10px; vertical-align: top; }
        }
      `}</style>

      {/* Editor Controls */}
      <div className="no-print space-y-4 rounded-xl border border-[#d9e3df] bg-[#fffdf7] p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#ece5d9] pb-3">
          <div>
            <h3 className="text-base font-black text-[#181818]">Schedule X Form Parameters</h3>
            <p className="text-xs text-[#6c7671]">Review statutory values before producing working printout.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-[#181818] cursor-pointer">
              <input
                type="checkbox"
                checked={reviewed}
                onChange={(e) => setReviewed(e.target.checked)}
                className="rounded border-[#d9e3df] text-[#447a5d] focus:ring-[#447a5d]"
              />
              Verified against evidenced AGM records
            </label>
            <button
              type="button"
              disabled={!reviewed}
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#447a5d] px-4 py-2 text-xs font-bold text-white hover:bg-[#396a50] transition disabled:opacity-40"
            >
              <Printer size={15} /> Print / Save Schedule X PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-[#6c7671] uppercase">Evidenced AGM Date</label>
            <input
              type="date"
              value={agm}
              onChange={(e) => setAgm(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d9e3df] bg-white p-2 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#6c7671] uppercase">Nominal / Authorized Capital (BDT)</label>
            <input
              type="number"
              value={totalAuthorized}
              onChange={(e) => setTotalAuthorized(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d9e3df] bg-white p-2 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[#6c7671] uppercase">Paid-up Share Capital (BDT)</label>
            <input
              type="number"
              value={totalPaidUp}
              onChange={(e) => setTotalPaidUp(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[#d9e3df] bg-white p-2 text-xs font-bold text-[#181818] outline-none focus:border-[#447a5d]"
            />
          </div>
        </div>
      </div>

      {/* Official Schedule X Layout */}
      <section
        id="schedule-x-print"
        className="rounded-2xl border border-slate-300 bg-white p-6 sm:p-8 text-black shadow-sm"
      >
        <div className="text-center border-b pb-4 mb-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-500">The Companies Act, 1994 (Section 36)</div>
          <h2 className="text-xl font-black mt-1">SCHEDULE X</h2>
          <div className="text-xs font-bold mt-1">ANNUAL RETURN OF A COMPANY HAVING A SHARE CAPITAL</div>
          <div className="text-[10px] text-slate-600 mt-0.5">
            Annual Return of <strong>{companyData.legal_name}</strong> made up to the date of the Annual General Meeting held on <strong>{agm || "________[Pending Evidence]"}</strong> for FY <strong>{financialYear}</strong>.
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs mb-4">
          <div>
            <p><strong>1. Name of Company:</strong> {companyData.legal_name}</p>
            <p className="mt-1"><strong>2. Registration No.:</strong> {companyData.registration_no || "________________"}</p>
            <p className="mt-1"><strong>3. Date of Incorporation:</strong> {companyData.incorporation_date || "________________"}</p>
          </div>
          <div>
            <p><strong>4. Registered Office:</strong> {companyData.registered_office || "________________"}</p>
            <p className="mt-1"><strong>5. Date of AGM:</strong> {agm || "Pending verification"}</p>
            <p className="mt-1"><strong>6. Filing Period:</strong> FY {financialYear}</p>
          </div>
        </div>

        <div className="border-t pt-3 mb-4">
          <h4 className="text-xs font-black uppercase text-slate-700 mb-2">Summary of Share Capital and Shares</h4>
          <table className="w-full border-collapse text-[10px]">
            <tbody>
              <tr>
                <td className="w-2/3 border p-1.5 font-bold">Nominal (Authorized) Share Capital</td>
                <td className="border p-1.5 font-mono text-right font-black">৳ {parseFloat(totalAuthorized || "0").toLocaleString()}</td>
              </tr>
              <tr>
                <td className="border p-1.5 font-bold">Total Paid-up Capital</td>
                <td className="border p-1.5 font-mono text-right font-black">৳ {parseFloat(totalPaidUp || "0").toLocaleString()}</td>
              </tr>
              <tr>
                <td className="border p-1.5 font-bold">Total Number of Shares Taken up to AGM date</td>
                <td className="border p-1.5 font-mono text-right">{totalShares.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="border p-1.5 font-bold">Total amount of calls received</td>
                <td className="border p-1.5 font-mono text-right font-black">৳ {parseFloat(totalPaidUp || "0").toLocaleString()}</td>
              </tr>
              <tr>
                <td className="border p-1.5 font-bold">Total amount of calls unpaid</td>
                <td className="border p-1.5 font-mono text-right">৳ 0</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-t pt-3 mb-4">
          <h4 className="text-xs font-black uppercase text-slate-700 mb-2">Particulars of Directors (at date of Return)</h4>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-1 text-left">Sl.</th>
                <th className="border p-1 text-left">Full Name</th>
                <th className="border p-1 text-left">Designation</th>
                <th className="border p-1 text-left">Appointment Date</th>
                <th className="border p-1 text-left">Residential Address</th>
              </tr>
            </thead>
            <tbody>
              {activeDirectors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border p-2 text-center text-slate-500">No active directors recorded.</td>
                </tr>
              ) : (
                activeDirectors.map((d, idx) => (
                  <tr key={idx}>
                    <td className="border p-1 text-center">{idx + 1}</td>
                    <td className="border p-1 font-bold">{d.full_name}</td>
                    <td className="border p-1">{d.designation || "Director"}</td>
                    <td className="border p-1">{d.appointment_date || "—"}</td>
                    <td className="border p-1">{d.residential_address || companyData.registered_office || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t pt-3 mb-4">
          <h4 className="text-xs font-black uppercase text-slate-700 mb-2">List of Persons holding Shares (Member Register)</h4>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className="border p-1 text-left">Sl.</th>
                <th className="border p-1 text-left">Member / Shareholder Name</th>
                <th className="border p-1 text-right">Shares Held</th>
                <th className="border p-1 text-right">Value (BDT)</th>
                <th className="border p-1 text-right">% Holding</th>
              </tr>
            </thead>
            <tbody>
              {shareholders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border p-2 text-center text-slate-500">No shareholders recorded in Master register.</td>
                </tr>
              ) : (
                shareholders.map((s, idx) => (
                  <tr key={idx}>
                    <td className="border p-1 text-center">{idx + 1}</td>
                    <td className="border p-1 font-bold">{s.shareholder_name}</td>
                    <td className="border p-1 font-mono text-right">{s.share_count.toLocaleString()}</td>
                    <td className="border p-1 font-mono text-right">৳ {s.total_value.toLocaleString()}</td>
                    <td className="border p-1 font-mono text-right">
                      {s.ownership_percentage !== null && s.ownership_percentage !== undefined
                        ? `${s.ownership_percentage}%`
                        : `${totalShares > 0 ? ((s.share_count / totalShares) * 100).toFixed(1) : 0}%`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t pt-6 mt-6 flex justify-between text-xs">
          <div>
            <p>Date: {agm || new Date().toISOString().split("T")[0]}</p>
            <p className="text-[10px] text-slate-500 mt-1">Prepared at ZA Corporate Desk</p>
          </div>
          <div className="text-right">
            <p className="border-t border-slate-400 pt-1 mt-6">Signature of Managing Director / Director / Secretary</p>
          </div>
        </div>
      </section>
    </div>
  );
}
