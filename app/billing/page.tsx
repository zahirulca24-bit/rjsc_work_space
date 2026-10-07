"use client";

import { useMemo, useState } from "react";

const works = [
  {
    workId: "DEMO-001",
    clientId: "RJSC-0001",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    service: "Annual Return / Returns Filing",
    professionalFee: 5000,
    govtFee: 200,
    otherCost: 300,
    collection: 3000,
  },
];

export default function BillingPage() {
  const [workId, setWorkId] = useState("DEMO-001");
  const [extraCollection, setExtraCollection] = useState(0);

  const work = useMemo(
    () => works.find((x) => x.workId === workId) || works[0],
    [workId]
  );

  const totalBill =
    work.professionalFee + work.govtFee + work.otherCost;

  const totalCollection = work.collection + extraCollection;
  const due = Math.max(0, totalBill - totalCollection);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 850, margin: 0 }}>
          Billing
        </h1>

        <p style={{ color: "#64748b", marginTop: 7 }}>
          Client bill, collection and outstanding balance.
        </p>
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
          <h2 style={panelTitle}>Select Work</h2>

          <label>
            <div style={labelStyle}>Work ID</div>

            <select
              value={workId}
              onChange={(e) => setWorkId(e.target.value)}
              style={inputStyle}
            >
              {works.map((x) => (
                <option key={x.workId}>{x.workId}</option>
              ))}
            </select>
          </label>

          <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
            <Info label="Client ID" value={work.clientId} />
            <Info label="Client" value={work.client} />
            <Info label="Service" value={work.service} />
          </div>

          <div
            style={{
              marginTop: 20,
              paddingTop: 18,
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <label>
              <div style={labelStyle}>
                Additional Collection
              </div>

              <input
                type="number"
                min={0}
                value={extraCollection}
                onChange={(e) =>
                  setExtraCollection(
                    Math.max(0, Number(e.target.value))
                  )
                }
                style={inputStyle}
              />
            </label>
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
            }}
          >
            <Stat
              title="Total Bill"
              value={`৳ ${totalBill.toLocaleString()}`}
            />

            <Stat
              title="Collection"
              value={`৳ ${totalCollection.toLocaleString()}`}
            />

            <Stat
              title="Due"
              value={`৳ ${due.toLocaleString()}`}
              warning={due > 0}
            />
          </div>

          <div style={panel}>
            <h2 style={panelTitle}>Bill Breakdown</h2>

            <BillRow
              label="Professional Fee"
              amount={work.professionalFee}
            />

            <BillRow
              label="RJSC / Govt Fee"
              amount={work.govtFee}
            />

            <BillRow
              label="Other Cost"
              amount={work.otherCost}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "2px solid #cbd5e1",
                marginTop: 15,
                paddingTop: 15,
                fontSize: 20,
                fontWeight: 900,
              }}
            >
              <span>Total Bill</span>
              <span>৳ {totalBill.toLocaleString()}</span>
            </div>
          </div>

          <div style={panel}>
            <h2 style={panelTitle}>Collection Summary</h2>

            <BillRow
              label="Previous Collection"
              amount={work.collection}
            />

            <BillRow
              label="New Collection"
              amount={extraCollection}
            />

            <BillRow
              label="Total Collection"
              amount={totalCollection}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                borderTop: "2px solid #cbd5e1",
                marginTop: 15,
                paddingTop: 15,
                fontSize: 20,
                fontWeight: 900,
                color: due > 0 ? "#b91c1c" : "#047857",
              }}
            >
              <span>Outstanding Due</span>
              <span>৳ {due.toLocaleString()}</span>
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
          fontSize: 11,
          color: "#94a3b8",
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        {label.toUpperCase()}
      </div>

      <div style={{ fontWeight: 750 }}>{value}</div>
    </div>
  );
}

function BillRow({
  label,
  amount,
}: {
  label: string;
  amount: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span style={{ color: "#64748b" }}>{label}</span>

      <strong>৳ {amount.toLocaleString()}</strong>
    </div>
  );
}

function Stat({
  title,
  value,
  warning = false,
}: {
  title: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        background: warning ? "#fff7ed" : "#fff",
        border: warning
          ? "1px solid #fed7aa"
          : "1px solid #e2e8f0",
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
          color: warning ? "#c2410c" : "#0f172a",
        }}
      >
        {value}
      </div>
    </div>
  );
}
