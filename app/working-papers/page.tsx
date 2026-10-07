"use client";

import { useMemo, useState } from "react";

type WPStatus = "Not Started" | "Prepared" | "Under Review" | "Final";

type WorkingPaper = {
  id: string;
  title: string;
  service: string;
  client: string;
  workId: string;
  preparedBy: string;
  reviewedBy: string;
  status: WPStatus;
  sourceDocs: string[];
  reviewerNote: string;
  conclusion: string;
};

const initialData: WorkingPaper[] = [
  {
    id: "WP-DEMO-001",
    title: "Annual Return Working Paper",
    service: "Annual Return / Returns Filing",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    workId: "DEMO-001",
    preparedBy: "Noyon",
    reviewedBy: "Md. Zahirul Islam",
    status: "Under Review",
    sourceDocs: [
      "Form-XII-2021.pdf",
      "Audited-FS-2025-26.xlsx",
      "AGM-Minutes.jpg",
    ],
    reviewerNote:
      "Verify latest Form XII and confirm whether any director change occurred after 13-Jun-2021.",
    conclusion:
      "Annual return working is in progress. Final conclusion pending latest director information and AGM verification.",
  },
];

export default function WorkingPapersPage() {
  const [items, setItems] = useState(initialData);
  const [selectedId, setSelectedId] = useState(initialData[0].id);

  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) || items[0],
    [items, selectedId]
  );

  function updateField<K extends keyof WorkingPaper>(
    field: K,
    value: WorkingPaper[K]
  ) {
    setItems((prev) =>
      prev.map((x) =>
        x.id === selected.id ? { ...x, [field]: value } : x
      )
    );
  }

  return (
    <div style={{ padding: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 850, margin: 0 }}>
            Working Papers
          </h1>
          <p style={{ color: "#64748b", marginTop: 7 }}>
            Prepare, review and finalize RJSC working papers.
          </p>
        </div>

        <button style={primaryButton}>+ New Working Paper</button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        <div style={panel}>
          <h2 style={panelTitle}>Working Paper Register</h2>

          <div style={{ display: "grid", gap: 10 }}>
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                style={{
                  textAlign: "left",
                  border:
                    selectedId === item.id
                      ? "1px solid #0f766e"
                      : "1px solid #e2e8f0",
                  background:
                    selectedId === item.id ? "#f0fdfa" : "#fff",
                  borderRadius: 12,
                  padding: 14,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 850 }}>{item.title}</div>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  {item.workId} · {item.preparedBy}
                </div>

                <div style={{ marginTop: 9 }}>
                  <StatusBadge status={item.status} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div style={panel}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 20,
                marginBottom: 20,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#94a3b8",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  {selected.id}
                </div>

                <h2
                  style={{
                    fontSize: 23,
                    fontWeight: 850,
                    margin: "5px 0 0",
                  }}
                >
                  {selected.title}
                </h2>
              </div>

              <StatusBadge status={selected.status} />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: 18,
              }}
            >
              <Info label="Work ID" value={selected.workId} />
              <Info label="Prepared By" value={selected.preparedBy} />
              <Info label="Reviewed By" value={selected.reviewedBy} />
            </div>

            <div style={{ marginTop: 18 }}>
              <Info label="Client" value={selected.client} />
            </div>

            <div style={{ marginTop: 18 }}>
              <Info label="Service" value={selected.service} />
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 20,
            }}
          >
            <div style={panel}>
              <h2 style={panelTitle}>Source Documents</h2>

              <div style={{ display: "grid", gap: 9 }}>
                {selected.sourceDocs.map((doc) => (
                  <div
                    key={doc}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: "11px 12px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 750 }}>{doc}</div>
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: 12,
                          marginTop: 3,
                        }}
                      >
                        Linked to {selected.workId}
                      </div>
                    </div>

                    <button style={smallButton}>Open</button>
                  </div>
                ))}
              </div>
            </div>

            <div style={panel}>
              <h2 style={panelTitle}>Review Status</h2>

              <label>
                <div style={labelStyle}>Working Paper Status</div>

                <select
                  value={selected.status}
                  onChange={(e) =>
                    updateField("status", e.target.value as WPStatus)
                  }
                  style={inputStyle}
                >
                  <option>Not Started</option>
                  <option>Prepared</option>
                  <option>Under Review</option>
                  <option>Final</option>
                </select>
              </label>

              <div style={{ marginTop: 16 }}>
                <Info label="Prepared By" value={selected.preparedBy} />
              </div>

              <div style={{ marginTop: 12 }}>
                <Info label="Reviewer" value={selected.reviewedBy} />
              </div>
            </div>
          </div>

          <div style={panel}>
            <h2 style={panelTitle}>Reviewer Note</h2>

            <textarea
              value={selected.reviewerNote}
              onChange={(e) =>
                updateField("reviewerNote", e.target.value)
              }
              style={{
                ...inputStyle,
                minHeight: 110,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={panel}>
            <h2 style={panelTitle}>Conclusion</h2>

            <textarea
              value={selected.conclusion}
              onChange={(e) =>
                updateField("conclusion", e.target.value)
              }
              style={{
                ...inputStyle,
                minHeight: 130,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </div>

          <div style={panel}>
            <h2 style={panelTitle}>Output Documents</h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
              }}
            >
              <div style={outputCard}>
                <div>
                  <div style={{ fontWeight: 850 }}>
                    Editable Working Paper
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      marginTop: 5,
                    }}
                  >
                    Word / DOCX output
                  </div>
                </div>

                <button style={smallButton}>Generate Word</button>
              </div>

              <div style={outputCard}>
                <div>
                  <div style={{ fontWeight: 850 }}>
                    Final Working Paper
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      marginTop: 5,
                    }}
                  >
                    Reviewed PDF output
                  </div>
                </div>

                <button style={smallButton}>Generate PDF</button>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: 12,
                borderRadius: 10,
                background: "#fff7ed",
                color: "#9a3412",
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              Frontend demo only — document generation and Google Drive
              saving will activate after backend integration.
            </div>
          </div>
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

const primaryButton = {
  border: 0,
  background: "#0f3d36",
  color: "#fff",
  borderRadius: 11,
  padding: "12px 17px",
  fontWeight: 800,
  cursor: "pointer",
};

const smallButton = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  borderRadius: 8,
  padding: "7px 10px",
  fontWeight: 750,
  cursor: "pointer",
};

const outputCard = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 15,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  background: "#f8fafc",
};

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <div
        style={{
          color: "#94a3b8",
          fontSize: 11,
          fontWeight: 800,
          marginBottom: 5,
        }}
      >
        {label.toUpperCase()}
      </div>

      <div style={{ fontWeight: 750 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: WPStatus }) {
  const styles: Record<WPStatus, { bg: string; color: string }> = {
    "Not Started": { bg: "#f1f5f9", color: "#475569" },
    Prepared: { bg: "#eff6ff", color: "#1d4ed8" },
    "Under Review": { bg: "#fff7ed", color: "#c2410c" },
    Final: { bg: "#ecfdf5", color: "#047857" },
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "6px 9px",
        borderRadius: 999,
        background: styles[status].bg,
        color: styles[status].color,
        fontSize: 11,
        fontWeight: 850,
      }}
    >
      {status}
    </span>
  );
}
