"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

const clientData: Record<string, any> = {
  "RJSC-0001": {
    id: "RJSC-0001",
    name: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    regNo: "C-118168",
    type: "Private Company",
    contact: "MD SAKHAWAT HOSSAIN",
    assignedTo: "Noyon",
    status: "Active",
    address:
      "177 Mahtab Center 8th Floor, Shaheed Syed Nazrul Islam Saroni, Bijoy Nagar, Dhaka",
  },

  "RJSC-0002": {
    id: "RJSC-0002",
    name: "Bangladesh Film Club Limited",
    regNo: "-",
    type: "Private Limited",
    contact: "Rokon Vai",
    assignedTo: "Noyon",
    status: "Active",
    address: "Not entered",
  },
};

const works = [
  {
    id: "DEMO-001",
    service: "Annual Return / Returns Filing",
    status: "In Progress",
    dueDate: "15-Oct-2026",
    bill: 5500,
    collection: 3000,
    due: 2500,
  },
];

export default function ClientDetailsPage() {
  const params = useParams();
  const id = String(params.id || "RJSC-0001");

  const client =
    clientData[id] || clientData["RJSC-0001"];

  const [tab, setTab] = useState("Overview");

  const clientWorks =
    client.id === "RJSC-0001" ? works : [];

  const totalBill = clientWorks.reduce(
    (sum, x) => sum + x.bill,
    0
  );

  const totalCollection = clientWorks.reduce(
    (sum, x) => sum + x.collection,
    0
  );

  const totalDue = clientWorks.reduce(
    (sum, x) => sum + x.due,
    0
  );

  return (
    <div style={{ padding: 28 }}>
      <Link
        href="/clients"
        style={{
          color: "#0f766e",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        ← Back to Clients
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 20,
          marginTop: 20,
          marginBottom: 22,
        }}
      >
        <div>
          <div
            style={{
              color: "#0f766e",
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            {client.id}
          </div>

          <h1
            style={{
              fontSize: 30,
              margin: "5px 0 8px",
              fontWeight: 900,
            }}
          >
            {client.name}
          </h1>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <Badge text={client.status} />
            <Badge text={client.type} />
            <Badge text={`Assigned: ${client.assignedTo}`} />
          </div>
        </div>

        <Link
          href="/new-work"
          style={{
            background: "#0f3d36",
            color: "#fff",
            textDecoration: "none",
            padding: "12px 16px",
            borderRadius: 10,
            fontWeight: 850,
            height: "fit-content",
          }}
        >
          + New Work
        </Link>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Stat
          label="Open Works"
          value={String(clientWorks.length)}
        />
        <Stat
          label="Total Bill"
          value={`৳ ${totalBill.toLocaleString()}`}
        />
        <Stat
          label="Collection"
          value={`৳ ${totalCollection.toLocaleString()}`}
        />
        <Stat
          label="Due"
          value={`৳ ${totalDue.toLocaleString()}`}
          warning
        />
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 14,
          padding: 7,
          display: "flex",
          gap: 5,
          marginBottom: 20,
        }}
      >
        {["Overview", "Works", "Billing"].map((x) => (
          <button
            key={x}
            onClick={() => setTab(x)}
            style={{
              border: 0,
              borderRadius: 8,
              padding: "10px 15px",
              cursor: "pointer",
              fontWeight: 800,
              background:
                tab === x ? "#0f3d36" : "transparent",
              color:
                tab === x ? "#fff" : "#475569",
            }}
          >
            {x}
          </button>
        ))}
      </div>

      {tab === "Overview" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 20,
          }}
        >
          <Panel title="Company Information">
            <Info label="Client ID" value={client.id} />
            <Info
              label="RJSC Registration"
              value={client.regNo}
            />
            <Info label="Entity Type" value={client.type} />
            <Info
              label="Contact Person"
              value={client.contact}
            />
            <Info
              label="Assigned To"
              value={client.assignedTo}
            />
          </Panel>

          <Panel title="Address">
            <div
              style={{
                lineHeight: 1.7,
                color: "#475569",
              }}
            >
              {client.address}
            </div>
          </Panel>
        </div>
      )}

      {tab === "Works" && (
        <Panel title="Work History">
          {clientWorks.length === 0 ? (
            <div style={{ color: "#94a3b8" }}>
              No work recorded.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "WORK ID",
                      "SERVICE",
                      "STATUS",
                      "DUE DATE",
                      "BILL",
                      "DUE",
                    ].map((x) => (
                      <th key={x} style={th}>
                        {x}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {clientWorks.map((work) => (
                    <tr key={work.id}>
                      <td style={td}>
                        <strong>{work.id}</strong>
                      </td>
                      <td style={td}>{work.service}</td>
                      <td style={td}>{work.status}</td>
                      <td style={td}>{work.dueDate}</td>
                      <td style={td}>
                        ৳ {work.bill.toLocaleString()}
                      </td>
                      <td style={td}>
                        <strong style={{ color: "#b91c1c" }}>
                          ৳ {work.due.toLocaleString()}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === "Billing" && (
        <Panel title="Billing Summary">
          <Info
            label="Total Bill"
            value={`৳ ${totalBill.toLocaleString()}`}
          />
          <Info
            label="Collection"
            value={`৳ ${totalCollection.toLocaleString()}`}
          />
          <Info
            label="Outstanding Due"
            value={`৳ ${totalDue.toLocaleString()}`}
          />
        </Panel>
      )}
    </div>
  );
}

const th = {
  textAlign: "left" as const,
  padding: 11,
  fontSize: 11,
  color: "#64748b",
  background: "#f8fafc",
  borderBottom: "1px solid #cbd5e1",
};

const td = {
  padding: 13,
  fontSize: 13,
  borderBottom: "1px solid #f1f5f9",
};

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: 18,
        padding: 22,
      }}
    >
      <h2
        style={{
          margin: "0 0 16px",
          fontSize: 18,
        }}
      >
        {title}
      </h2>

      {children}
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 20,
        padding: "10px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span style={{ color: "#64748b" }}>
        {label}
      </span>

      <strong style={{ textAlign: "right" }}>
        {value}
      </strong>
    </div>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        background: "#ecfdf5",
        color: "#047857",
        padding: "5px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 850,
      }}
    >
      {text}
    </span>
  );
}

function Stat({
  label,
  value,
  warning = false,
}: {
  label: string;
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
        padding: 18,
        borderRadius: 15,
      }}
    >
      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          fontWeight: 850,
        }}
      >
        {label.toUpperCase()}
      </div>

      <div
        style={{
          fontSize: 24,
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
