"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, X, Send, ClipboardCheck, MessageCircle, Grip, RefreshCcw, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const topics = [
  { label: "নতুন Client কীভাবে Add করব?", answer: "Sidebar থেকে Clients খুলুন। নতুন client তৈরির অপশন নির্বাচন করে প্রয়োজনীয় তথ্য পূরণ করে Save করুন।" },
  { label: "নতুন RJSC Work কীভাবে তৈরি করব?", answer: "Work Register খুলুন। নতুন কাজ তৈরির অপশন থেকে client, service ও কাজের বিবরণ দিয়ে Save করুন।" },
  { label: "Work Status কীভাবে Update করব?", answer: "Work Register-এ সংশ্লিষ্ট কাজটি খুলে status পরিবর্তনের অপশন ব্যবহার করুন। প্রয়োজন হলে Admin-এর সঙ্গে নিশ্চিত করুন।" },
  { label: "Document কোথায় পাব?", answer: "Sidebar থেকে Documents খুলুন। সংশ্লিষ্ট client বা work দিয়ে প্রয়োজনীয় নথি খুঁজুন।" },
  { label: "Billing কোথায় দেখব?", answer: "Sidebar-এর Finance অংশে Billing খুলুন। Client অনুযায়ী bill ও outstanding দেখুন।" },
  { label: "Testing Feedback কীভাবে দেব?", answer: "এই Assistant-এর Testing Feedback tab খুলুন। Module, test, result ও ease dropdown থেকে নির্বাচন করে Submit করুন।" },
];
const modules = ["Login & Dashboard", "Clients", "Work Register", "Tasks", "Documents", "Billing", "Reports", "Other"];
const checks: Record<string, string[]> = {
  "Login & Dashboard": ["Login & open dashboard", "Check dashboard numbers", "Logout and login again"],
  Clients: ["Open client list", "Find a client", "Create or edit client (test data only)"],
  "Work Register": ["Open work register", "Find existing work", "Check work details and status"],
  Tasks: ["View assigned tasks", "Update task status", "Check deadlines"],
  Documents: ["Open documents", "Preview or download a document", "Upload a test document"],
  Billing: ["Open billing", "Check invoice details", "Find payment status"],
  Reports: ["Open reports", "Apply a report filter", "View report summary"],
  Other: ["General navigation", "Something else"],
};
type Entry = { id: string; user_name: string; module: string; test_case: string; result: string; ease: string; comment: string | null; created_at: string };
const control = "w-full rounded-xl border border-[#ded7c8] bg-white px-3 py-2 text-sm text-[#294f48]";

export default function FloatingAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"help" | "feedback">("help");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [moduleName, setModuleName] = useState(modules[0]);
  const [testCase, setTestCase] = useState(checks[modules[0]][0]);
  const [result, setResult] = useState("WORKING");
  const [ease, setEase] = useState("EASY");
  const [comment, setComment] = useState("");
  const [rows, setRows] = useState<Entry[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ pointer: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const moved = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/pilot-feedback`, { credentials: "include" });
      if (!response.ok) throw new Error("Could not load feedback");
      setRows(await response.json());
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load feedback"); }
  }, []);
  useEffect(() => { if (open && tab === "feedback") void load(); }, [open, tab, load]);

  const choose = (value: string) => {
    setQuestion(value);
    const text = value.toLowerCase().trim();
    const found = topics.find(t => t.label === value) || topics.find(t =>
      t.label.toLowerCase().includes(text) || text.includes(t.label.toLowerCase()) ||
      (text.includes("client") && t.label.includes("Client")) ||
      (text.includes("work") && t.label.includes("Work")) ||
      (text.includes("document") && t.label.includes("Document")) ||
      (text.includes("billing") && t.label.includes("Billing")) ||
      (text.includes("feedback") && t.label.includes("Feedback"))
    );
    setAnswer(found?.answer || "এই প্রশ্নের প্রস্তুত উত্তর এখনো নেই। Testing Feedback-এ গিয়ে Other নির্বাচন করে প্রশ্নটি Admin-কে জানান।");
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`${API_BASE}/api/pilot-feedback`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ module: moduleName, test_case: testCase, result, ease, comment: comment.trim() || null }),
      });
      if (!response.ok) throw new Error("Feedback submission failed");
      setSuccess("Feedback saved successfully!");
      setComment("");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to submit"); }
    finally { setBusy(false); }
  };

  function beginDrag(e: React.PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = position?.x ?? rect.left;
    const y = position?.y ?? rect.top;
    drag.current = { pointer: e.pointerId, startX: e.clientX, startY: e.clientY, originX: x, originY: y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function moveDrag(e: React.PointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.pointer !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
    if (d.moved) {
      moved.current = true;
      setPosition({ x: Math.max(8, Math.min(window.innerWidth - 72, d.originX + dx)), y: Math.max(8, Math.min(window.innerHeight - 72, d.originY + dy)) });
    }
  }
  function endDrag(e: React.PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointer !== e.pointerId) return;
    if (drag.current.moved) moved.current = true;
    drag.current = null;
  }
  function toggle() {
    if (moved.current) { moved.current = false; return; }
    setOpen(v => !v);
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {open && (
        <section aria-label="ZA Desk Assistant" className="pointer-events-auto fixed bottom-24 right-4 flex max-h-[min(72vh,650px)] w-[min(390px,calc(100vw-24px))] flex-col overflow-hidden rounded-[24px] border border-[#afcdbb] bg-[#fff8e8] shadow-[0_20px_60px_rgba(26,66,54,0.26)] sm:right-6">
          <header className="flex items-center justify-between bg-gradient-to-r from-[#315f55] to-[#477c69] px-4 py-3 text-white">
            <div className="flex items-center gap-2"><Bot size={22} /><div><div className="text-sm font-black">ZA Desk Assistant</div><div className="text-[10px] opacity-80">Prepared answers · No AI API</div></div></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="rounded-lg p-2 hover:bg-white/10"><X size={18} /></button>
          </header>
          <div className="flex gap-2 border-b border-[#ded7c8] p-3">
            <button type="button" onClick={() => setTab("help")} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold ${tab === "help" ? "bg-[#315f55] text-white" : "bg-white text-[#315f55]"}`}><MessageCircle className="mr-1 inline" size={15} /> Help</button>
            <button type="button" onClick={() => setTab("feedback")} className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold ${tab === "feedback" ? "bg-[#315f55] text-white" : "bg-white text-[#315f55]"}`}><ClipboardCheck className="mr-1 inline" size={15} /> Testing Feedback</button>
          </div>
          <div className="overflow-y-auto p-4">
            {tab === "help" ? (
              <div className="space-y-3">
                <div className="rounded-xl bg-[#deeee4] p-3 text-sm text-[#294f48]">স্বাগতম! ZA Corporate Desk ব্যবহার করতে সাহায্য দরকার? নিচের প্রশ্নগুলো থেকে বেছে নিন।</div>
                <div className="space-y-2">{topics.map(t => <button type="button" key={t.label} onClick={() => choose(t.label)} className="block w-full rounded-xl border border-[#d2e3d8] bg-white px-3 py-2 text-left text-xs font-semibold text-[#315f55] hover:bg-[#ecf4ed]">{t.label}</button>)}</div>
                {answer && <div role="status" className="rounded-xl border border-[#bcdbc8] bg-[#eef7ef] p-3 text-sm text-[#294f48]">{answer}</div>}
                <form onSubmit={e => { e.preventDefault(); if (question.trim()) choose(question.trim()); }} className="flex gap-2">
                  <input aria-label="Help question" className={control} value={question} onChange={e => setQuestion(e.target.value)} placeholder="আপনার প্রশ্ন লিখুন..." />
                  <button type="submit" aria-label="Ask" className="rounded-xl bg-[#315f55] px-3 text-white"><Send size={16} /></button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <form onSubmit={submit} className="space-y-3">
                  <p className="text-sm font-bold text-[#294f48]">Test a feature and submit feedback</p>
                  <label className="block text-xs font-semibold text-[#294f48]">Module<select className={control} value={moduleName} onChange={e => { setModuleName(e.target.value); setTestCase(checks[e.target.value][0]); }}>{modules.map(m => <option key={m}>{m}</option>)}</select></label>
                  <label className="block text-xs font-semibold text-[#294f48]">What did you test?<select className={control} value={testCase} onChange={e => setTestCase(e.target.value)}>{checks[moduleName].map(c => <option key={c}>{c}</option>)}</select></label>
                  <label className="block text-xs font-semibold text-[#294f48]">Result<select className={control} value={result} onChange={e => setResult(e.target.value)}><option value="WORKING">Working fine</option><option value="ISSUE">Problem found</option><option value="BLOCKED">Stuck / cannot continue</option><option value="NOT_TESTED">Not tested yet</option></select></label>
                  <label className="block text-xs font-semibold text-[#294f48]">Ease of use<select className={control} value={ease} onChange={e => setEase(e.target.value)}><option value="EASY">Easy</option><option value="NEEDS_GUIDANCE">Need guidance</option><option value="CONFUSING">Confusing</option></select></label>
                  <label className="block text-xs font-semibold text-[#294f48]">Notes (optional)<textarea maxLength={2000} rows={3} className={control} value={comment} onChange={e => setComment(e.target.value)} placeholder="সমস্যা বা পরামর্শ লিখুন" /></label>
                  {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
                  {success && <p role="status" className="text-xs text-green-700">{success}</p>}
                  <button disabled={busy} className="flex items-center gap-2 rounded-xl bg-[#315f55] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"><Send size={14} />{busy ? "Saving..." : "Submit Feedback"}</button>
                </form>
                <div className="border-t border-[#ded7c8] pt-3">
                  <div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-bold text-[#294f48]">{user?.role === "ADMIN" ? "All Staff Test Results" : "My Test Results"}</h3><button type="button" onClick={() => void load()} aria-label="Refresh feedback"><RefreshCcw size={16} /></button></div>
                  {rows.length === 0 ? <p className="text-xs text-[#64796c]">No feedback yet.</p> : <div className="space-y-2">{rows.map(r => <div key={r.id} className="rounded-xl border border-[#ded7c8] bg-white p-3 text-xs text-[#294f48]"><div className="font-bold">{r.user_name} · {r.result.replaceAll("_", " ")}</div><div>{r.module} — {r.test_case}</div><div>{r.ease.replaceAll("_", " ")}</div>{r.comment && <p className="mt-1 break-words">{r.comment}</p>}</div>)}</div>}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
      <button type="button" aria-label={open ? "Close ZA Assistant" : "Open ZA Assistant"} title="Drag to move · Click for help" onClick={toggle} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} style={position ? { left: position.x, top: position.y, bottom: "auto", right: "auto", touchAction: "none" } : { bottom: 22, right: 22, touchAction: "none" }} className="pointer-events-auto fixed flex h-16 w-16 select-none items-center justify-center rounded-[22px] border border-[#92c0a6] bg-gradient-to-br from-[#77bea0] via-[#315f55] to-[#193e35] text-white shadow-[inset_3px_3px_6px_rgba(255,255,255,0.28),inset_-4px_-5px_9px_rgba(0,0,0,0.2),0_12px_24px_rgba(28,75,58,0.35)] transition-shadow hover:shadow-[0_15px_30px_rgba(28,75,58,0.5)]">
        <Bot size={30} /><Grip size={11} className="absolute bottom-1 right-1 opacity-60" />
      </button>
    </div>
  );
}
