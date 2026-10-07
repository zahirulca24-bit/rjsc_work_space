"use client";

import { useMemo, useState } from "react";

type Transaction = {
  id: string;
  date: string;
  workId: string;
  client: string;
  type: string;
  description: string;
  amount: number;
  method: string;
  reference: string;
  handledBy: string;
};

const works = [
  {
    workId: "DEMO-001",
    client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
  },
];

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "TXN-DEMO-001",
      date: "07-Oct-2026",
      workId: "DEMO-001",
      client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
      type: "Money Received",
      description:
        "Advance collection against Annual Return / Returns Filing",
      amount: 3000,
      method: "Bank",
      reference: "DEMO-REF-001",
      handledBy: "Noyon",
    },
  ]);

  const [workId, setWorkId] = useState("DEMO-001");
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState("Bank");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");

  const selectedWork = useMemo(
    () => works.find((x) => x.workId === workId) || works[0],
    [workId]
  );

  function addTransaction() {
    if (amount <= 0) return;

    const txn: Transaction = {
      id: `TXN-${Date.now()}`,
      date: "07-Oct-2026",
      workId,
      client: selectedWork.client,
      type: "Money Received",
      description: description || "Client collection",
      amount,
      method,
      reference: reference || "-",
      handledBy: "Md. Zahirul Islam",
    };

    setTransactions((prev) => [txn, ...prev]);

    setAmount(0);
    setReference("");
    setDescription("");
  }

  const totalReceived = transactions.reduce(
    (sum, x) => sum + x.amount,
    0
  );

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 850, margin: 0 }}>
          Transactions
        </h1>

        <p style={{ color: "#64748b", marginTop: 7 }}>
          Record client collection and job-related money movement.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        <div style={panel}>
          <h2 style={panelTitle}>Add Transaction</h2>

          <div style={{ display: "grid", gap: 14 }}>
            <label>
              <div style={labelStyle}>Work ID</div>

              <select
                value={workId}
                onChange={(e) => setWorkId(e.target.value)}
                style={inputStyle}
              >
                {works.map((x) => (
                  <option key={x.workId}>
                    {x.workId}
                  </option>
                ))}
              </select>
            </label>

            <Info label="Client" value={selectedWork.client} />

            <label>
              <div style={labelStyle}>Amount Received</div>

              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) =>
                  setAmount(
                    Math.max(0, Number(e.target.value))
                  )
                }
                style={inputStyle}
              />
            </label>

            <label>
              <div style={labelStyle}>Payment Method</div>

              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={inputStyle}
              >
                <option>Bank</option>
                <option>Cash</option>
                <option>Mobile Banking</option>
                <option>Cheque</option>
              </select>
            </label>

            <label>
              <div style={labelStyle}>Reference</div>

              <input
                value={reference}
                onChange={(e) =>
                  setReference(e.target.value)
                }
                style={inputStyle}
                placeholder="Bank ref / cheque / txn ID"
              />
            </label>

            <label>
              <div style={labelStyle}>Description</div>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                style={{
                  ...inputStyle,
                  minHeight: 85,
                  resize: "vertical",
                  fontFamily: "inherit",
                }}
              />
            </label>

            <button
              onClick={addTransaction}
              style={primaryButton}
            >
              Save Transaction
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 18 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,1fr)",
              gap: 14,
            }}
          >
            <Stat
              title="Transactions"
              value={String(transactions.length)}
            />

            <Stat
              title="Money Received"
              value={`৳ ${totalReceived.toLocaleString()}`}
            />

            <Stat
              title="Linked Work"
              value="DEMO-001"
            />
          </div>

          <div style={panel}>
            <h2 style={panelTitle}>Transaction Register</h2>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 1000,
                }}
              >
                <thead>
                  <tr>
                    {[
                      "TRANSACTION ID",
                      "DATE",
                      "WORK ID",
                      "CLIENT",
                      "TYPE",
                      "DESCRIPTION",
                      "AMOUNT",
                      "METHOD",
                      "REFERENCE",
                      "HANDLED BY",
                    ].map((x) => (
                      <th key={x} style={th}>
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td style={td}>
                        <strong>{txn.id}</strong>
                      </td>

                      <td style={td}>{txn.date}</td>

                      <td style={td}>
                        <strong>{txn.workId}</strong>
                      </td>

                      <td style={td}>{txn.client}</td>

                      <td style={td}>
                        <span style={badge}>
                          {txn.type}
                        </span>
                      </td>

                      <td style={td}>
                        {txn.description}
                      </td>

                      <td style={td}>
                        <strong>
                          ৳ {txn.amount.toLocaleString()}
                        </strong>
                      </td>

                      <td style={td}>{txn.method}</td>
                      <td style={td}>{txn.reference}</td>
                      <td style={td}>{txn.handledBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  padding: "12px 16px",
  fontWeight: 850,
  cursor: "pointer",
};

const badge = {
  display: "inline-block",
  padding: "5px 8px",
  borderRadius: 999,
  background: "#ecfdf5",
  color: "#047857",
  fontWeight: 800,
  fontSize: 11,
};

const th = {
  textAlign: "left" as const,
  padding: "11px 10px",
  background: "#f8fafc",
  borderBottom: "1px solid #cbd5e1",
  color: "#64748b",
  fontSize: 11,
};

const td = {
  padding: "13px 10px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
  verticalAlign: "middle" as const,
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
          marginBottom: 4,
        }}
      >
        {label.toUpperCase()}
      </div>

      <div style={{ fontWeight: 750 }}>
        {value}
      </div>
    </div>
  );
}

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
          fontSize: 24,
          fontWeight: 900,
          marginTop: 7,
        }}
      >
        {value}
      </div>
    </div>
  );
}
