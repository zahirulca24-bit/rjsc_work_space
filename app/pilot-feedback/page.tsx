"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ClipboardCheck, Send, RefreshCcw } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const modules = ["Login & Dashboard", "Clients", "Work Register", "Tasks", "Documents", "Billing", "Reports", "Other"] as const;
const suggestions: Record<string, string[]> = {
  "Login & Dashboard": ["Login & open dashboard", "Check dashboard numbers", "Logout and login again"],
  Clients: ["Open client list", "Find a client", "Create or edit client (test data only)"],
  "Work Register": ["Open work register", "Find existing work", "Check work details and status"],
  Tasks: ["View assigned tasks", "Update task status", "Check deadlines"],
  Documents: ["Open documents", "Preview or download a document", "Upload a test document"],
  Billing: ["Open billing", "Check invoice details", "Find payment status"],
  Reports: ["Open reports", "Apply a report filter", "View report summary"],
  Other: ["General navigation", "Something else"],
};

type Entry = {
  id: string; user_name: string; user_email: string; module: string; test_case: string;
  result: string; ease: string; comment: string | null; created_at: string;
};

export default function PilotFeedbackPage() {
  const { user } = useAuth();
  const [moduleName, setModuleName] = useState<string>(modules[0]);
  const [caseName, setCaseName] = useState(suggestions[modules[0]][0]);
  const [result, setResult] = useState("WORKING");
  const [ease, setEase] = useState("EASY");
  const [comment, setComment] = useState("");
  const [rows, setRows] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/pilot-feedback`, { credentials: "include" });
      if (!res.ok) throw new Error("Feedback list could not be loaded");
      setRows(await res.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load feedback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE}/api/pilot-feedback`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: moduleName, test_case: caseName, result, ease, comment: comment.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.detail === "string" ? data.detail : "Could not submit feedback");
      }
      setSuccess("Feedback saved. Thank you!");
      setComment("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback");
    } finally { setBusy(false); }
  }

  const field = "w-full rounded-xl border border-[#ded7c8] bg-white px-3 py-3 text-sm text-[#294f48] outline-none focus:ring-2 focus:ring-[#80ac98]";

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="rounded-2xl bg-[#fff8e8] p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="text-[#315f55]" size={29} />
          <div>
            <h1 className="text-2xl font-black text-[#294f48]">App Testing Feedback</h1>
            <p className="text-sm text-[#657b70]">Test one feature at a time, choose a result and send your feedback. No AI API needed.</p>
          </div>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-[#fff8e8] p-6 shadow-sm">
        <h2 className="text-lg font-bold text-[#294f48]">Submit a test result</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-[#294f48]">Which module?
            <select className={field} value={moduleName} onChange={e => {
              const value = e.target.value; setModuleName(value); setCaseName(suggestions[value][0]);
            }}>{modules.map(v => <option key={v}>{v}</option>)}</select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-[#294f48]">What did you test?
            <select className={field} value={caseName} onChange={e => setCaseName(e.target.value)}>
              {suggestions[moduleName].map(v => <option key={v}>{v}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-[#294f48]">Result
            <select className={field} value={result} onChange={e => setResult(e.target.value)}>
              <option value="WORKING">Working fine</option>
              <option value="ISSUE">Problem found</option>
              <option value="BLOCKED">Cannot continue / stuck</option>
              <option value="NOT_TESTED">Not tested yet</option>
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-[#294f48]">Was it easy?
            <select className={field} value={ease} onChange={e => setEase(e.target.value)}>
              <option value="EASY">Easy to use</option>
              <option value="NEEDS_GUIDANCE">Need guidance</option>
              <option value="CONFUSING">Confusing</option>
            </select>
          </label>
        </div>
        <label className="block space-y-2 text-sm font-semibold text-[#294f48]">Notes (optional)
          <textarea className={field} rows={3} maxLength={2000} value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="কোথায় আটকে গেছেন, কী সমস্যা হয়েছে, বা কী উন্নতি দরকার লিখুন।" />
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-[#315f55] px-5 py-3 font-semibold text-white disabled:opacity-50">
          <Send size={17} />{busy ? "Saving..." : "Submit Feedback"}
        </button>
      </form>

      <section className="rounded-2xl bg-[#fff8e8] p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[#294f48]">{user?.role === "ADMIN" ? "All Staff Test Results" : "My Test Results"}</h2>
            <p className="text-xs text-[#657b70]">{user?.role === "ADMIN" ? "Admin can review feedback from every tester." : "Your submitted feedback is saved here."}</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm"><RefreshCcw size={15} /> Refresh</button>
        </div>
        {loading ? <p>Loading...</p> : rows.length === 0 ? <p className="text-sm text-[#657b70]">No test feedback submitted yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-left text-sm">
              <thead><tr className="border-b text-[#315f55]"><th className="p-2">Tester</th><th className="p-2">Module / Test</th><th className="p-2">Result</th><th className="p-2">Ease</th><th className="p-2">Comments</th><th className="p-2">Date</th></tr></thead>
              <tbody>{rows.map(row => <tr key={row.id} className="border-b border-[#e4ddcf] align-top">
                <td className="p-2 font-semibold">{row.user_name}</td>
                <td className="p-2">{row.module}<div className="text-xs text-[#657b70]">{row.test_case}</div></td>
                <td className="p-2">{row.result.replaceAll("_", " ")}</td>
                <td className="p-2">{row.ease.replaceAll("_", " ")}</td>
                <td className="max-w-[250px] break-words p-2">{row.comment || "—"}</td>
                <td className="p-2 whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
