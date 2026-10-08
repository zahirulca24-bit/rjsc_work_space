"use client";

import { useMemo, useState, useEffect } from "react";
import { services } from "@/lib/rjsc/services";
import { getRequiredDocuments } from "@/lib/rjsc/rule-engine";
import { EntityType } from "@/lib/rjsc/types";
import { AlertTriangle } from "lucide-react";

type Status = "Missing" | "Received" | "N/A";

type DocItem = {
  id: string;
  name: string;
  status: Status;
};

export default function ChecklistRequisitionPage() {
  const [serviceId, setServiceId] = useState(services[11].id); // Society Reg
  const [entityType, setEntityType] = useState<EntityType>(EntityType.SOCIETY);
  
  const [docs, setDocs] = useState<DocItem[]>([]);

  const selectedService = services.find(x => x.id === serviceId);
  const availableEntities = selectedService?.entityTypes || [];
  const currentEntity = availableEntities.includes(entityType) ? entityType : (availableEntities[0] || EntityType.PRIVATE_COMPANY);

  useEffect(() => {
    const required = getRequiredDocuments(serviceId, currentEntity);
    setDocs(required.map(r => ({
      id: r.id,
      name: r.documentName,
      status: "Missing" as Status
    })));
    if (entityType !== currentEntity) setEntityType(currentEntity);
  }, [serviceId, currentEntity]); // intentional minimal dependency

  const received = docs.filter((x) => x.status === "Received").length;
  const applicable = docs.filter((x) => x.status !== "N/A").length;

  const progress = useMemo(
    () => (applicable ? Math.round((received / applicable) * 100) : 100),
    [received, applicable]
  );

  const missing = docs.filter((x) => x.status === "Missing");

  function updateStatus(id: string, status: Status) {
    setDocs((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status } : x))
    );
  }

  const hasDocs = docs.length > 0;

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>
          Checklist / Requisition
        </h1>
        <p style={{ color: "#64748b", marginTop: 7 }}>
          Track required documents and prepare client requisitions.
        </p>
      </div>

      <div style={{ display: "flex", gap: 20, marginBottom: 24 }}>
        <label style={{ display: "grid", gap: 8, fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#475569", flex: 1 }}>
          Service
          <select 
            value={serviceId} 
            onChange={e => setServiceId(e.target.value)}
            style={{ padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, fontWeight: 500, color: "#000" }}
          >
            {services.map(s => <option key={s.id} value={s.id}>{s.serviceName}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 8, fontSize: 13, fontWeight: 700, textTransform: "uppercase", color: "#475569", flex: 1 }}>
          Entity Type
          <select 
            value={currentEntity} 
            onChange={e => setEntityType(e.target.value as EntityType)}
            style={{ padding: 12, borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 14, fontWeight: 500, color: "#000" }}
          >
            {availableEntities.map(e => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Stat title="Required" value={String(applicable)} />
        <Stat title="Received" value={String(received)} />
        <Stat title="Missing" value={String(missing.length)} />
        <Stat title="Progress" value={`${progress}%`} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr .85fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        <div style={panel}>
          <h2 style={panelTitle}>Required Documents</h2>

          {!hasDocs ? (
             <div style={{ padding: 20, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, color: "#92400e", display: "flex", alignItems: "center", gap: 12 }}>
                <AlertTriangle size={24} />
                <div style={{ fontWeight: 600 }}>No verified document rule loaded yet.</div>
             </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {docs.map((doc, index) => (
                <div
                  key={doc.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "38px 1fr 150px",
                    gap: 12,
                    alignItems: "center",
                    border: "1px solid #e2e8f0",
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "#ecfdf5",
                      color: "#047857",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>

                  <div style={{ fontWeight: 750 }}>{doc.name}</div>

                  <select
                    value={doc.status}
                    onChange={(e) =>
                      updateStatus(doc.id, e.target.value as Status)
                    }
                    style={{
                      width: "100%",
                      borderRadius: 9,
                      padding: "9px 10px",
                      fontWeight: 800,
                      border:
                        doc.status === "Missing"
                          ? "1px solid #fdba74"
                          : doc.status === "Received"
                          ? "1px solid #86efac"
                          : "1px solid #cbd5e1",
                      background:
                        doc.status === "Missing"
                          ? "#fff7ed"
                          : doc.status === "Received"
                          ? "#f0fdf4"
                          : "#f8fafc",
                    }}
                  >
                    <option>Missing</option>
                    <option>Received</option>
                    <option>N/A</option>
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div style={panel}>
            <h2 style={panelTitle}>Requisition Preview</h2>

            {!hasDocs ? (
               <div style={{ color: "#64748b", fontStyle: "italic" }}>
                 Requisition is empty.
               </div>
            ) : missing.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  borderRadius: 11,
                  background: "#ecfdf5",
                  color: "#047857",
                  fontWeight: 800,
                }}
              >
                All required documents received.
              </div>
            ) : (
              <>
                <p style={{ color: "#64748b", lineHeight: 1.6 }}>
                  Please provide the following documents for:
                </p>

                <strong>
                  {selectedService?.serviceName}
                </strong>

                <ol style={{ paddingLeft: 20, lineHeight: 1.9 }}>
                  {missing.map((doc) => (
                    <li key={doc.id}>{doc.name}</li>
                  ))}
                </ol>

                <button style={primaryButton}>
                  Generate Requisition
                </button>
              </>
            )}
          </div>

          <div style={panel}>
            <h2 style={panelTitle}>Work Checklist</h2>

            {selectedService?.checklist.length ? (
              <div style={{ display: "grid", gap: 9 }}>
                {selectedService.checklist.map((item) => (
                  <label
                    key={item}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                      paddingBottom: 8,
                      borderBottom: "1px solid #f1f5f9",
                    }}
                  >
                    <input type="checkbox" />
                    <span style={{ fontSize: 14 }}>{item}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div style={{ color: "#64748b", fontSize: 14 }}>
                No specific checklist items loaded for this service.
              </div>
            )}
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
  margin: "0 0 16px",
  fontSize: 18,
  fontWeight: 850,
};

const primaryButton = {
  border: 0,
  background: "#0f3d36",
  color: "#fff",
  borderRadius: 10,
  padding: "11px 14px",
  fontWeight: 850,
  cursor: "pointer",
};

function Stat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 15,
        padding: 18,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontWeight: 850,
        }}
      >
        {title.toUpperCase()}
      </div>

      <div
        style={{
          fontSize: 25,
          fontWeight: 900,
          marginTop: 7,
        }}
      >
        {value}
      </div>
    </div>
  );
}
