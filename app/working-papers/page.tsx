"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader, ContentCard, LoadingState } from "@/components/SharedUI";
import {
  ClipboardList, FileText, ShieldAlert, BriefcaseBusiness,
  Building2, Layers, ExternalLink, ArrowRight, CheckCircle2
} from "lucide-react";
import { getWorks } from "@/lib/api/works";
import WorkingPaperWorkspace from "@/components/working-papers/WorkingPaperWorkspace";
import FormXiiWorkingDraft from "@/components/working-papers/FormXiiWorkingDraft";
import ScheduleXWorkingDraft from "@/components/working-papers/ScheduleXWorkingDraft";

const GROUPS = [
  { group: "Company Registration / Corporate", forms: ["Form I","Form III","Form IV","Form VI","Form VII","Form VIII","Form IX","Form X","Form XII","Form XIV","Form XV","Schedule X","Form 23B","Form 117"] },
  { group: "Mortgage / Charge", forms: ["Form XVIII","Form XIX","Form XXVIII"] },
  { group: "Foreign Company", forms: ["Form XXXVI","Form XXXVII","Form XXXVIII","Form XXXIX","Form XL","Form XLI"] },
  { group: "Other RJSC Working Formats", forms: ["Certified Copy Application","Court Order to Stay Winding Up","Summary Balance Sheet & Profit/Loss","Income & Expenditure","Name Clearance Application","Name Clearance 1st Extension","Name Clearance 2nd Extension","Promoters' Board Resolution"] },
];

export default function WorkingPapersPage() {
  const [activeTab, setActiveTab] = useState<"workspace" | "library">("workspace");
  const [works, setWorks] = useState<any[]>([]);
  const [selectedWorkId, setSelectedWorkId] = useState<string>("");
  const [loadingWorks, setLoadingWorks] = useState(true);
  const [activeForm, setActiveForm] = useState("Form XII");

  useEffect(() => {
    getWorks()
      .then((data) => {
        setWorks(data || []);
        if (data && data.length > 0) {
          setSelectedWorkId(data[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch works for working papers", err);
      })
      .finally(() => {
        setLoadingWorks(false);
      });
  }, []);

  const selectedWork = works.find((w) => w.id === selectedWorkId);

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <PageHeader
        icon={ClipboardList}
        title="Working Papers & Compliance Calculation"
        subtitle="Work-linked statutory draft preparation, compliance analysis, and RJSC form library."
      />

      {/* Mode Navigation Bar */}
      <div className="flex border-b border-[#e1dcd0] space-x-6">
        <button
          type="button"
          onClick={() => setActiveTab("workspace")}
          className={`pb-3 text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "workspace"
              ? "border-b-2 border-[#447a5d] text-[#24523c]"
              : "text-[#6c7671] hover:text-[#181818]"
          }`}
        >
          <BriefcaseBusiness size={16} />
          Active Work Workspace
          {works.length > 0 && (
            <span className="rounded-full bg-[#e8f3ed] px-2 py-0.5 text-xs text-[#2b6449]">
              {works.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("library")}
          className={`pb-3 text-sm font-bold transition flex items-center gap-2 ${
            activeTab === "library"
              ? "border-b-2 border-[#447a5d] text-[#24523c]"
              : "text-[#6c7671] hover:text-[#181818]"
          }`}
        >
          <Layers size={16} />
          Statutory Form Catalog
        </button>
      </div>

      {/* TAB 1: Active Work Workspace */}
      {activeTab === "workspace" && (
        <div className="space-y-6">
          {/* Work Order Selector Card */}
          <ContentCard className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <label className="block text-xs font-black uppercase tracking-wider text-[#6c7671] mb-1.5">
                  Select Work Order / Filing
                </label>
                {loadingWorks ? (
                  <div className="text-xs text-[#6c7671]">Loading work orders...</div>
                ) : works.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                    No work orders found. Create a work order in Work Register to prepare working papers.
                  </div>
                ) : (
                  <select
                    value={selectedWorkId}
                    onChange={(e) => setSelectedWorkId(e.target.value)}
                    className="w-full sm:max-w-xl rounded-xl border border-[#d9e3df] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#181818] outline-none focus:border-[#447a5d] focus:ring-1 focus:ring-[#447a5d]"
                  >
                    {works.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.work_reference ? `[${w.work_reference}] ` : ""}
                        {w.company_name || w.client_name || "Client #" + w.client_id.slice(0, 8)}
                        {" — "}
                        {w.service_type || "RJSC Service"}
                        {w.financial_year ? ` (${w.financial_year})` : ""}
                        {` [${w.status}]`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {selectedWork && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/work-register/${selectedWork.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#d9e3df] bg-[#fcfbf7] px-3.5 py-2 text-xs font-bold text-[#447a5d] hover:bg-[#eef5f1] transition"
                  >
                    <ExternalLink size={14} /> Open Work Details
                  </Link>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Render Full Workspace for Selected Work */}
          {selectedWorkId ? (
            <WorkingPaperWorkspace workId={selectedWorkId} />
          ) : (
            <div className="p-12 text-center text-[#6c7671] border border-dashed rounded-2xl">
              <ClipboardList className="mx-auto h-12 w-12 text-[#9ba8a2] mb-3" />
              <h3 className="font-bold text-[#181818]">Select a Work Order to begin</h3>
              <p className="text-xs mt-1">Working papers are strictly isolated to their associated statutory filing.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Statutory Form Catalog */}
      {activeTab === "library" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <ShieldAlert size={18} className="shrink-0" />
            <p>
              Forms listed here are based on provided official RJSC samples. Form XII and Schedule X have full interactive draft preparation linked to Client Master records. Remaining templates require format field mapping and are displayed for reference.
            </p>
          </div>

          <div className="grid min-w-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
            <ContentCard>
              <div className="max-h-[72vh] space-y-4 overflow-y-auto p-3">
                {GROUPS.map((section) => (
                  <section key={section.group}>
                    <h2 className="mb-2 text-xs font-black uppercase tracking-wide text-[#556e63]">
                      {section.group}
                    </h2>
                    <div className="space-y-1">
                      {section.forms.map((form) => {
                        const isInteractive = form === "Form XII" || form === "Schedule X";
                        return (
                          <button
                            type="button"
                            key={form}
                            onClick={() => setActiveForm(form)}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm ${
                              activeForm === form
                                ? "bg-[#dff1e7] font-black text-[#315f55]"
                                : "hover:bg-[#f7f4eb]"
                            }`}
                          >
                            <span>{form}</span>
                            {isInteractive && (
                              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                Live Draft
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </ContentCard>

            <ContentCard>
              <div className="min-w-0 p-3 sm:p-5">
                <div className="mb-4 flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-lg font-black text-[#181818]">{activeForm}</h2>
                    <p className="text-xs text-[#6c7671]">Official Bangladesh RJSC Statutory Template</p>
                  </div>
                  {(activeForm === "Form XII" || activeForm === "Schedule X") && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={12} /> Auto-fill Ready
                    </span>
                  )}
                </div>

                {activeForm === "Form XII" ? (
                  <FormXiiWorkingDraft />
                ) : activeForm === "Schedule X" ? (
                  <ScheduleXWorkingDraft />
                ) : (
                  <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-10 text-center text-[#65776e]">
                    <FileText size={28} className="text-[#9ba8a2]" />
                    <p className="font-bold text-[#181818]">Format Mapping Pending</p>
                    <p className="max-w-md text-xs text-[#6c7671]">
                      This form is scheduled in the RJSC compliance registry. Direct auto-fill and printable draft will activate once field specifications are validated against verified client filings.
                    </p>
                  </div>
                )}
              </div>
            </ContentCard>
          </div>
        </div>
      )}
    </div>
  );
}
