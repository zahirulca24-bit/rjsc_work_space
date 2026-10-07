"use client";

import { useMemo, useState } from "react";

type DocStatus = "Received" | "Verified" | "Needs Review";
type DocType =
  | "Form XII"
  | "AGM Minutes"
  | "Schedule X"
  | "Audited Financial Statements"
  | "Certificate of Incorporation"
  | "Share Transfer Document"
  | "Challan / Payment Proof"
  | "Other";

type DocRow = {
  id: number;
  fileName: string;
  type: DocType;
  client: string;
  workId: string;
  status: DocStatus;
  size: string;
  uploadedBy: string;
  date: string;
};

const initialDocs: DocRow[] = [
  {
    id: 1,
    fileName: "Form-XII-2021.pdf",
    type: "Form XII",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    workId: "DEMO-001",
    status: "Verified",
    size: "1.8 MB",
    uploadedBy: "Noyon",
    date: "07-Oct-2026",
  },
  {
    id: 2,
    fileName: "Audited-FS-2025-26.xlsx",
    type: "Audited Financial Statements",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    workId: "DEMO-001",
    status: "Received",
    size: "640 KB",
    uploadedBy: "Noyon",
    date: "07-Oct-2026",
  },
  {
    id: 3,
    fileName: "AGM-Minutes.jpg",
    type: "AGM Minutes",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    workId: "DEMO-001",
    status: "Needs Review",
    size: "2.1 MB",
    uploadedBy: "Noyon",
    date: "07-Oct-2026",
  },
];

const supported = [
  "PDF",
  "DOCX",
  "XLSX",
  "XLS",
  "CSV",
  "JPG",
  "JPEG",
  "PNG",
];

const docTypes: DocType[] = [
  "Form XII",
  "AGM Minutes",
  "Schedule X",
  "Audited Financial Statements",
  "Certificate of Incorporation",
  "Share Transfer Document",
  "Challan / Payment Proof",
  "Other",
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState(initialDocs);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedType, setSelectedType] = useState<DocType>("Other");

  const filtered = useMemo(() => {
    return docs.filter((doc) => {
      const q = search.trim().toLowerCase();

      const matchesSearch =
        !q ||
        doc.fileName.toLowerCase().includes(q) ||
        doc.client.toLowerCase().includes(q) ||
        doc.workId.toLowerCase().includes(q) ||
        doc.type.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "All" || doc.status === statusFilter;

      const matchesType =
        typeFilter === "All" || doc.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [docs, search, statusFilter, typeFilter]);

  function addDemoUpload() {
    if (!selectedFile) return;

    const newDoc: DocRow = {
      id: Date.now(),
      fileName: selectedFile.name,
      type: selectedType,
      client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
      workId: "DEMO-001",
      status: "Received",
      size:
        selectedFile.size > 1024 * 1024
          ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB`
          : `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`,
      uploadedBy: "Md. Zahirul Islam",
      date: "07-Oct-2026",
    };

    setDocs((prev) => [newDoc, ...prev]);
    setSelectedFile(null);
  }

  return (
    <div style={{ padding: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 850, margin: 0 }}>
            Documents
          </h1>
          <p style={{ color: "#64748b", marginTop: 7 }}>
            Upload, classify and track RJSC client documents.
          </p>
        </div>

        <div
          style={{
            background: "#ecfdf5",
            color: "#047857",
            padding: "9px 12px",
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          Google Drive integration later
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: ".8fr 1.2fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        <div style={panel}>
          <h2 style={panelTitle}>Upload Document</h2>

          <label
            style={{
              border: "2px dashed #cbd5e1",
              borderRadius: 16,
              padding: 28,
              minHeight: 190,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              cursor: "pointer",
              background: "#f8fafc",
            }}
          >
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.xls,.csv,.jpg,.jpeg,.png"
              style={{ display: "none" }}
              onChange={(e) =>
                setSelectedFile(e.target.files?.[0] || null)
              }
            />

            <div>
              <div style={{ fontSize: 38, marginBottom: 10 }}>↑</div>

              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {selectedFile
                  ? selectedFile.name
                  : "Click to select a document"}
              </div>

              <div
                style={{
                  color: "#94a3b8",
                  fontSize: 13,
                  marginTop: 7,
                }}
              >
                PDF, Word, Excel, CSV, JPG and PNG
              </div>
            </div>
          </label>

          <div style={{ marginTop: 18 }}>
            <label>
              <div style={labelStyle}>Document Type</div>
              <select
                value={selectedType}
                onChange={(e) =>
                  setSelectedType(e.target.value as DocType)
                }
                style={inputStyle}
              >
                {docTypes.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 14 }}>
            <label>
              <div style={labelStyle}>Linked Work</div>
              <select style={inputStyle} defaultValue="DEMO-001">
                <option>DEMO-001</option>
              </select>
            </label>
          </div>

          <button
            onClick={addDemoUpload}
            disabled={!selectedFile}
            style={{
              width: "100%",
              border: 0,
              borderRadius: 11,
              padding: "13px 16px",
              marginTop: 18,
              fontWeight: 800,
              background: selectedFile ? "#0f3d36" : "#cbd5e1",
              color: "#fff",
              cursor: selectedFile ? "pointer" : "not-allowed",
            }}
          >
            Add Document
          </button>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <div style={labelStyle}>Supported Formats</div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 7,
              }}
            >
              {supported.map((x) => (
                <span
                  key={x}
                  style={{
                    padding: "5px 8px",
                    borderRadius: 8,
                    background: "#f1f5f9",
                    color: "#475569",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {x}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div style={panel}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 15,
              alignItems: "center",
              marginBottom: 17,
            }}
          >
            <div>
              <h2 style={{ ...panelTitle, marginBottom: 3 }}>
                Document Register
              </h2>
              <div style={{ color: "#94a3b8", fontSize: 13 }}>
                {filtered.length} document(s)
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 180px 190px",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <input
              placeholder="Search file, client or Work ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={inputStyle}
            />

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={inputStyle}
            >
              <option>All</option>
              {docTypes.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={inputStyle}
            >
              <option>All</option>
              <option>Received</option>
              <option>Verified</option>
              <option>Needs Review</option>
            </select>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: 950,
              }}
            >
              <thead>
                <tr>
                  {[
                    "FILE",
                    "TYPE",
                    "WORK ID",
                    "STATUS",
                    "SIZE",
                    "UPLOADED BY",
                    "DATE",
                    "ACTION",
                  ].map((x) => (
                    <th key={x} style={th}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td style={td}>
                      <div style={{ fontWeight: 800 }}>
                        {doc.fileName}
                      </div>
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: 12,
                          marginTop: 3,
                        }}
                      >
                        {doc.client}
                      </div>
                    </td>

                    <td style={td}>{doc.type}</td>
                    <td style={{ ...td, fontWeight: 750 }}>
                      {doc.workId}
                    </td>

                    <td style={td}>
                      <StatusBadge status={doc.status} />
                    </td>

                    <td style={td}>{doc.size}</td>
                    <td style={td}>{doc.uploadedBy}</td>
                    <td style={td}>{doc.date}</td>

                    <td style={td}>
                      <button style={smallButton}>View</button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: 35,
                        textAlign: "center",
                        color: "#94a3b8",
                      }}
                    >
                      No documents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div
        style={{
          ...panel,
          marginTop: 22,
        }}
      >
        <h2 style={panelTitle}>Future Document Automation</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <AutomationCard
            title="Auto Classification"
            text="Detect Form XII, AGM minutes, certificates, financial statements and other RJSC documents."
          />

          <AutomationCard
            title="Checklist Match"
            text="Match uploaded documents against the selected service requisition automatically."
          />

          <AutomationCard
            title="Data Extraction"
            text="Read usable fields from PDF, images, Excel and CSV for working papers."
          />

          <AutomationCard
            title="Google Drive"
            text="Store the final file in the correct client and work folder automatically."
          />
        </div>
      </div>
    </div>
  );
}

const panel = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 22,
  boxShadow: "0 8px 30px rgba(15,23,42,.04)",
};

const panelTitle = {
  fontSize: 18,
  fontWeight: 850,
  marginTop: 0,
  marginBottom: 16,
};

const labelStyle = {
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
  marginBottom: 7,
};

const inputStyle = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "11px 12px",
  background: "#fff",
  outline: "none",
};

const th = {
  textAlign: "left" as const,
  padding: "11px 10px",
  color: "#64748b",
  fontSize: 11,
  borderBottom: "1px solid #cbd5e1",
  background: "#f8fafc",
};

const td = {
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
  verticalAlign: "middle" as const,
};

const smallButton = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  borderRadius: 8,
  padding: "7px 10px",
  cursor: "pointer",
  fontWeight: 750,
};

function StatusBadge({ status }: { status: DocStatus }) {
  let bg = "#eff6ff";
  let color = "#1d4ed8";

  if (status === "Verified") {
    bg = "#ecfdf5";
    color = "#047857";
  }

  if (status === "Needs Review") {
    bg = "#fff7ed";
    color = "#c2410c";
  }

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 8px",
        borderRadius: 999,
        background: bg,
        color,
        fontWeight: 800,
        fontSize: 11,
      }}
    >
      {status}
    </span>
  );
}

function AutomationCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 13,
        padding: 15,
        background: "#f8fafc",
      }}
    >
      <div style={{ fontWeight: 850, marginBottom: 7 }}>
        {title}
      </div>

      <div
        style={{
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        {text}
      </div>
    </div>
  );
}
