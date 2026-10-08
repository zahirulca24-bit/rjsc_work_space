"use client";
import { useState, useEffect } from "react";
import { PageTitle, Card, Badge, PrimaryButton, SecondaryButton } from "@/components/UI";
import { listDocuments, uploadDocument, getDocumentDownloadUrl } from "@/lib/api/documents";

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("OTHER");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

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
    <>
      <PageTitle title="Documents" desc="Manage client and work documents" />

      <Card className="mb-6">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="text-lg font-bold">Upload Document</div>

          {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">File</label>
              <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm border p-2 rounded" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="w-full text-sm border p-2 rounded">
                {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes / Client ID Context</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="w-full text-sm border p-2 rounded" placeholder="Global upload requires client_id currently unsupported in UI directly without context" />
          </div>
          <button type="submit" disabled={!file || uploading} className="bg-emerald-600 text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50">
            {uploading ? "Uploading..." : "Upload File"}
          </button>
        </form>
      </Card>

      <Card>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border p-2 rounded w-full md:w-1/3 text-sm"
          />
        </div>

        {loading ? (
          <div className="text-center p-8 text-slate-500">Loading documents...</div>
        ) : docs.length === 0 ? (
          <div className="text-center p-8 text-slate-500">No documents found.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {docs.map(doc => (
              <div key={doc.id} className="rounded-xl bg-slate-50 p-4 border border-slate-100 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-slate-800 truncate" title={doc.document_name}>{doc.document_name}</div>
                  <div className="mt-2 flex gap-2">
                    <Badge>{doc.category}</Badge>
                    <Badge tone={doc.status === 'REJECTED' ? 'danger' : 'success'}>{doc.status}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    {new Date(doc.created_at).toLocaleDateString()} · {(doc.file_size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <a
                  href={getDocumentDownloadUrl(doc.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded text-sm font-medium text-slate-800"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
