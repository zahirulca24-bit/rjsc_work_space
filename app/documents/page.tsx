"use client";
import { useState, useEffect } from "react";
import { PageTitle, Card, Badge, PrimaryButton, SecondaryButton } from "@/components/UI";
import { listDocuments, uploadDocument, getDocumentDownloadUrl, updateDocument } from "@/lib/api/documents";
import { getClients } from "@/lib/api/clients";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { FolderOpen, FileText, AlertTriangle, CheckCircle2, BrainCircuit } from "lucide-react";
import DocumentAIModal from "@/components/DocumentAIModal";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("OTHER");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [aiDocument, setAiDocument] = useState<any | null>(null);
  const { user } = useAuth();

  const canApproveAI = ["ADMIN", "MANAGER", "SENIOR"].includes(
    user?.role || ""
  );

  const categories = [
    "INCORPORATION", "MOA", "AOA", "FORM_XII", "FORM_VI",
    "ANNUAL_RETURN", "AGM", "SHARE_TRANSFER", "DIRECTOR_CHANGE",
    "REGISTERED_OFFICE", "CAPITAL", "MORTGAGE_CHARGE", "CERTIFIED_COPY",
    "PAYMENT_CHALLAN", "ACKNOWLEDGEMENT", "BOARD_RESOLUTION",
    "NID_PASSPORT", "TIN_BIN", "OTHER"
  ];

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const data = await listDocuments({ search });
      setDocs(data);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDocs();
  }, [search]);

  useEffect(() => {
    getClients().then(setClients).catch(() => setError("Could not load clients for document upload."));
  }, []);

  const received = docs.filter(d => d.status === "RECEIVED").length;
  const missing = docs.filter(d => d.status === "MISSING").length;

  const formatFileSize = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "Unknown";
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) return "Unknown";
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  };

  const changeCategory = async (documentId: string, newCategory: string) => {
    setSavingCategory(true);
    setError("");
    try {
      await updateDocument(documentId, { category: newCategory });
      await fetchDocs();
      setEditingCategoryId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not update document category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await uploadDocument(file, category, selectedClientId || undefined, undefined, undefined, notes);
      setFile(null);
      setCategory("OTHER");
      setNotes("");
      fetchDocs();
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <PageHeader
        icon={FolderOpen}
        title="Document Center"
        subtitle="Secure document storage for client and working papers."
      />

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard title="Total Documents" value={docs.length} icon={FolderOpen} color="aqua" />
        <StatCard title="Received" value={received} icon={CheckCircle2} color="sage" />
        <StatCard title="Missing" value={missing} icon={AlertTriangle} color="coral" />
        <StatCard title="Unclassified" value={docs.filter(d => d.category==='OTHER').length} icon={FileText} color="yellow" />
      </div>

      <ContentCard className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#fffdf7] border-b border-[#ece5d9]">
        <div className="relative flex-1 max-w-md w-full">
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 text-sm border border-[#d9e3df] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#79b993]"
          />
        </div>
        <div className="flex w-full flex-wrap gap-2 items-center sm:w-auto">
          <select aria-label="Associate document with client" value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="min-w-0 max-w-full rounded-xl border border-[#d9e3df] bg-white px-3 py-2 text-sm">
            <option value="">Unlinked document</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.legal_name}</option>)}
          </select>
          <select aria-label="Upload document category" value={category} onChange={e=>setCategory(e.target.value)} className="px-3 py-2 text-sm border border-[#d9e3df] rounded-xl bg-white">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input aria-label="Choose document" type="file" accept=".pdf,.docx,.xlsx,.xls,.csv,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} className="min-w-0 max-w-full text-sm" />
          <button onClick={handleUpload} disabled={uploading || !file} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#447a5d] px-5 text-sm font-bold text-white shadow-sm transition hover:bg-[#396a50] disabled:opacity-50">
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </ContentCard>

      <ContentCard>
        {error && <div className="p-4 text-[#a03c2a] font-bold bg-[#fce9e4] m-4 rounded-xl">{error}</div>}
        {loading ? (
          <LoadingState />
        ) : docs.length === 0 ? (
          <EmptyState title="No documents found" message="Upload a document or change your search." icon={FileText} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Filename</Th>
                <Th>Category</Th>
                <Th>Uploaded By</Th>
                <Th>Size</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {docs.map(d => (
                <tr key={d.id}>
                  <Td className="font-bold text-[#181818]">{d.original_filename}</Td>
                  <Td>{editingCategoryId === d.id ? (
                    <select aria-label={`Correct category for ${d.original_filename || d.document_name}`} defaultValue={d.category} disabled={savingCategory}
                      onChange={e => void changeCategory(d.id, e.target.value)}
                      className="max-w-40 rounded-lg border border-[#d9e3df] bg-white p-2 text-xs">
                      {categories.concat(["SCHEDULE_X", "AUDIT_REPORT", "DVC", "COURT_ORDER"]).filter((c, i, arr) => arr.indexOf(c) === i).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : (
                    <button type="button" title="Correct document category" className="text-left" onClick={() => setEditingCategoryId(d.id)}>
                      <StatusBadge status={d.category} />
                      <span className="ml-1 text-[10px] underline">Edit</span>
                    </button>
                  )}</Td>
                  <Td className="text-sm">{d.uploaded_by || "Not recorded"}</Td>
                  <Td className="font-mono text-sm">{formatFileSize(d.file_size)}</Td>
                  <Td>
                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={getDocumentDownloadUrl(d.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#447a5d] font-bold hover:underline"
                      >
                        Download
                      </a>

                      <button
                        onClick={() => setAiDocument(d)}
                        className="inline-flex items-center gap-1 text-[#367b86] font-bold hover:underline"
                      >
                        <BrainCircuit className="h-4 w-4" />
                        AI Review
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </ContentCard>

      <DocumentAIModal
        documentId={aiDocument?.id || null}
        documentName={
          aiDocument?.original_filename ||
          aiDocument?.document_name
        }
        canApprove={canApproveAI}
        onClose={() => setAiDocument(null)}
        onApproved={() => {
          fetchDocs();
        }}
      />
    </div>
  );

}
