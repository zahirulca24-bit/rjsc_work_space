"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  analyzeDocument,
  approveDocumentAIAnalysis,
  DocumentAIAnalysis,
  getLatestDocumentAIAnalysis,
} from "@/lib/api/document-ai";

type Props = {
  documentId: string | null;
  documentName?: string;
  canApprove: boolean;
  onClose: () => void;
  onApproved?: () => void;
};

export default function DocumentAIModal({
  documentId,
  documentName,
  canApprove,
  onClose,
  onApproved,
}: Props) {
  const [analysis, setAnalysis] =
    useState<DocumentAIAnalysis | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [approving, setApproving] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!documentId) return;

    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const existing =
          await getLatestDocumentAIAnalysis(
            documentId
          );

        if (active) {
          setAnalysis(existing);
        }
      } catch {
        // No previous analysis is a normal state.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [documentId]);

  if (!documentId) {
    return null;
  }

  const runAnalysis = async () => {
    setLoading(true);
    setError("");

    try {
      const result =
        await analyzeDocument(documentId);

      setAnalysis(result);
    } catch (e: any) {
      setError(
        e?.message ||
          "AI analysis failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const approve = async () => {
    if (!analysis) return;

    setApproving(true);
    setError("");

    try {
      const result =
        await approveDocumentAIAnalysis(
          documentId,
          analysis.id,
          true
        );

      setAnalysis(
        result.analysis
      );

      onApproved?.();
    } catch (e: any) {
      setError(
        e?.message ||
          "Approval failed"
      );
    } finally {
      setApproving(false);
    }
  };

  const confidence =
    analysis?.confidence != null
      ? `${Math.round(
          analysis.confidence * 100
        )}%`
      : "?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#dfe9e3] bg-[#fffdf7] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#e7e2d8] bg-[#fffdf7] px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-[#447a5d]" />
              <h2 className="text-xl font-black text-[#171717]">
                AI Document Review
              </h2>
            </div>

            <p className="mt-1 text-sm text-[#66736c]">
              {documentName || "Document"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-black/5"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <div className="rounded-2xl border border-[#dbe9e1] bg-[#eef8f2] p-4">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-[#447a5d]" />

              <div className="text-sm text-[#385447]">
                AI output is a suggestion only.
                Legal deadlines, government fees,
                VAT and penalties are not inferred
                here. Human approval is required
                before document classification is
                applied.
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-2xl border border-[#f1b6aa] bg-[#fff0ec] p-4 text-sm font-semibold text-[#a03c2a]">
              {error}
            </div>
          )}

          {!analysis && !loading && (
            <div className="rounded-2xl border border-dashed border-[#cbd8d1] bg-white p-8 text-center">
              <BrainCircuit className="mx-auto mb-3 h-10 w-10 text-[#79b993]" />

              <h3 className="font-black text-[#171717]">
                No AI analysis yet
              </h3>

              <p className="mt-2 text-sm text-[#6b746f]">
                Run analysis to extract document
                content and receive classification
                and checklist suggestions.
              </p>

              <button
                onClick={runAnalysis}
                className="mt-5 rounded-xl bg-[#447a5d] px-5 py-3 text-sm font-bold text-white hover:bg-[#396a50]"
              >
                Analyze Document
              </button>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center gap-3 rounded-2xl bg-white p-10">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-semibold">
                Analyzing document...
              </span>
            </div>
          )}

          {analysis && !loading && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-[#78827c]">
                    Suggested category
                  </div>

                  <div className="mt-2 font-black text-[#171717]">
                    {analysis.suggested_category ||
                      "OTHER"}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-[#78827c]">
                    Confidence
                  </div>

                  <div className="mt-2 font-black text-[#171717]">
                    {confidence}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4">
                  <div className="text-xs font-bold uppercase tracking-wide text-[#78827c]">
                    Review state
                  </div>

                  <div className="mt-2 flex items-center gap-2 font-black">
                    {analysis.approved ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-[#447a5d]" />
                        Approved
                      </>
                    ) : analysis.needs_source_review ? (
                      <>
                        <AlertTriangle className="h-4 w-4 text-[#c17a19]" />
                        Needs Source Review
                      </>
                    ) : (
                      "AI Suggested"
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h3 className="font-black text-[#171717]">
                  Extracted metadata
                </h3>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {Object.entries(
                    analysis.extracted_metadata ||
                      {}
                  ).map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-xl bg-[#f7f8f5] p-3"
                    >
                      <div className="text-xs font-bold uppercase text-[#7a847e]">
                        {key.replaceAll(
                          "_",
                          " "
                        )}
                      </div>

                      <div className="mt-1 text-sm font-semibold text-[#252525]">
                        {value == null ||
                        value === ""
                          ? "?"
                          : String(value)}
                      </div>
                    </div>
                  ))}

                  {Object.keys(
                    analysis.extracted_metadata ||
                      {}
                  ).length === 0 && (
                    <p className="text-sm text-[#7a847e]">
                      No metadata extracted.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h3 className="font-black">
                  Checklist matches
                </h3>

                <div className="mt-3 space-y-2">
                  {analysis.checklist_matches
                    ?.length ? (
                    analysis.checklist_matches.map(
                      (match) => (
                        <div
                          key={match.item_id}
                          className="rounded-xl bg-[#eef8f2] p-3 text-sm"
                        >
                          <div className="font-bold">
                            Checklist item matched
                          </div>
                          <div className="mt-1 text-[#5d6962]">
                            {match.reason ||
                              match.item_id}
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-sm text-[#7a847e]">
                      No checklist match suggested.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-5">
                <h3 className="font-black">
                  Potential missing documents
                </h3>

                <div className="mt-3 space-y-2">
                  {analysis
                    .missing_checklist_items
                    ?.length ? (
                    analysis.missing_checklist_items.map(
                      (item) => (
                        <div
                          key={item.item_id}
                          className="rounded-xl bg-[#fff7df] p-3"
                        >
                          <div className="text-sm font-bold">
                            {item.item_text ||
                              item.item_code ||
                              item.item_id}
                          </div>

                          <div className="mt-1 text-xs text-[#74694c]">
                            Current status:{" "}
                            {item.current_status ||
                              "PENDING"}
                          </div>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-sm text-[#7a847e]">
                      No additional missing
                      checklist item suggested.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-between gap-3 border-t pt-5">
                <button
                  onClick={runAnalysis}
                  disabled={loading}
                  className="rounded-xl border border-[#b8c9c0] bg-white px-5 py-3 text-sm font-bold hover:bg-[#f6f8f6]"
                >
                  Analyze Again
                </button>

                {!analysis.approved &&
                  canApprove && (
                    <button
                      onClick={approve}
                      disabled={approving}
                      className="rounded-xl bg-[#171717] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {approving
                        ? "Approving..."
                        : "Approve Classification"}
                    </button>
                  )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
