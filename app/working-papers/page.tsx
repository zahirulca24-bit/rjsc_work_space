"use client";

import { useState } from "react";
import { PageHeader, ContentCard } from "@/components/SharedUI";
import { ClipboardList, FileText, ShieldAlert } from "lucide-react";
import FormXiiWorkingDraft from "@/components/working-papers/FormXiiWorkingDraft";

const GROUPS = [
  { group: "Company Registration / Corporate", forms: ["Form I","Form III","Form IV","Form VI","Form VII","Form VIII","Form IX","Form X","Form XII","Form XIV","Form XV","Schedule X","Form 23B","Form 117"] },
  { group: "Mortgage / Charge", forms: ["Form XVIII","Form XIX","Form XXVIII"] },
  { group: "Foreign Company", forms: ["Form XXXVI","Form XXXVII","Form XXXVIII","Form XXXIX","Form XL","Form XLI"] },
  { group: "Other RJSC Working Formats", forms: ["Certified Copy Application","Court Order to Stay Winding Up","Summary Balance Sheet & Profit/Loss","Income & Expenditure","Name Clearance Application","Name Clearance 1st Extension","Name Clearance 2nd Extension","Promoters' Board Resolution"] },
];

export default function WorkingPapersPage() {
  const [active, setActive] = useState("Form XII");
  const ready = active === "Form XII";
  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <PageHeader icon={ClipboardList} title="Working Papers & RJSC Forms" subtitle="Official-source form layouts and client-linked draft preparation." />
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <ShieldAlert size={18} className="shrink-0" />
        <p>Forms listed here are based on provided RJSC samples. Only Form XII has an interactive draft generator in this first release. Remaining templates require field mapping and format validation. No demo records are represented as real work.</p>
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <ContentCard>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-3">
            {GROUPS.map(section => (
              <section key={section.group}>
                <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-[#556e63]">{section.group}</h2>
                <div className="space-y-1">
                  {section.forms.map(form => (
                    <button type="button" key={form} onClick={() => setActive(form)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${active === form ? "bg-[#dff1e7] font-black text-[#315f55]" : "hover:bg-[#f7f4eb]"}`}>
                      <span>{form}</span>
                      {form === "Form XII" && <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Draft</span>}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </ContentCard>
        <ContentCard>
          <div className="min-w-0 p-3 sm:p-5">
            <h2 className="mb-3 text-lg font-black">{active}</h2>
            {ready ? <FormXiiWorkingDraft /> : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-[#65776e]">
                <FileText size={24} />
                <p className="font-bold">Format mapping pending</p>
                <p className="max-w-lg text-sm">This form is listed in the library roadmap, but automatic data filling and printable draft are not implemented yet. A generic template is intentionally not substituted for the official format.</p>
              </div>
            )}
          </div>
        </ContentCard>
      </div>
    </div>
  );
}
