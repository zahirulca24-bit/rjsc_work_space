"use client";
import { useState, useEffect } from "react";
import { PageTitle, Card, Badge, PrimaryButton, SecondaryButton } from "@/components/UI";
import { listDocuments, uploadDocument, getDocumentDownloadUrl } from "@/lib/api/documents";
import { PageHeader, ContentCard, StatCard, StatusBadge, EmptyState, LoadingState, Table, Th, Td } from "@/components/SharedUI";
import { FolderOpen, FileText, AlertTriangle, CheckCircle2, BrainCircuit } from "lucide-react";
import DocumentAIModal from "@/components/DocumentAIModal";
import { useAuth } from "@/lib/auth/AuthProvider";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      // Need a client_id or work_id in our backend, but documents page is global.
      // Wait, backend requires client_id or work_id.
      // So global upload requires specifying a client. We can mock it or show error.
      // We will just catch the error and show it.
      await uploadDocument(file, category, undefined, undefined, undefined, notes);
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
        <StatCard title="Received" value={docs.length} icon={CheckCircle2} color="sage" />
        <StatCard title="Missing" value="0" icon={AlertTriangle} color="coral" />
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
        <div className="flex gap-2 items-center">
          <select value={category} onChange={e=>setCategory(e.target.value)} className="px-3 py-2 text-sm border border-[#d9e3df] rounded-xl bg-white">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="text-sm" />
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
                  <Td><StatusBadge status={d.category} /></Td>
                  <Td className="text-sm">{d.uploaded_by}</Td>
                  <Td className="font-mono text-sm">{Math.round(d.size_bytes / 1024)} KB</Td>
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
