"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const clients = [
  {
    id: "RJSC-0001",
    name: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.",
    regNo: "C-118168",
    type: "Private Company",
    contact: "MD SAKHAWAT HOSSAIN",
    assignedTo: "Noyon",
    status: "Active",
    openWorks: 1,
    totalBill: 5500,
    due: 2500,
  },
  {
    id: "RJSC-0002",
    name: "Bangladesh Film Club Limited",
    regNo: "-",
    type: "Private Limited",
    contact: "Rokon Vai",
    assignedTo: "Noyon",
    status: "Active",
    openWorks: 0,
    totalBill: 0,
    due: 0,
  },
];

export default function ClientsPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return clients.filter(
      (x) =>
        !q ||
        x.name.toLowerCase().includes(q) ||
        x.id.toLowerCase().includes(q) ||
        x.regNo.toLowerCase().includes(q)
    );
  }, [search]);

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
            Clients
          </h1>

          <p style={{ color: "#64748b", marginTop: 7 }}>
            RJSC client master and engagement history.
          </p>
        </div>

        <button style={primaryButton}>+ Add Client</button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 20,
        }}
      >
        <Stat title="Total Clients" value="2" />
        <Stat title="Active Clients" value="2" />
        <Stat title="Open Works" value="1" />
        <Stat title="Total Due" value="৳ 2,500" />
      </div>

      <div style={panel}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            marginBottom: 17,
          }}
        >
          <input
            placeholder="Search client, ID or registration no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: 430 }}
          />

          <div style={{ color: "#64748b", fontSize: 13 }}>
            {filtered.length} client(s)
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 1050,
            }}
          >
            <thead>
              <tr>
                {[
                  "CLIENT",
                  "REGISTRATION",
                  "TYPE",
                  "CONTACT",
                  "ASSIGNED",
                  "OPEN WORK",
                  "TOTAL BILL",
                  "DUE",
                  "STATUS",
                  "ACTION",
                ].map((x) => (
                  <th key={x} style={th}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filtered.map((client) => (
                <tr key={client.id}>
                  <td style={td}>
                    <div style={{ fontWeight: 850 }}>{client.name}</div>
                    <div
                      style={{
                        color: "#94a3b8",
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {client.id}
                    </div>
                  </td>

                  <td style={td}>{client.regNo}</td>
                  <td style={td}>{client.type}</td>
                  <td style={td}>{client.contact}</td>
                  <td style={td}>{client.assignedTo}</td>

                  <td style={td}>
                    <strong>{client.openWorks}</strong>
                  </td>

                  <td style={td}>
                    ৳ {client.totalBill.toLocaleString()}
                  </td>

                  <td style={td}>
                    <strong
                      style={{
                        color:
                          client.due > 0 ? "#b91c1c" : "#047857",
                      }}
                    >
                      ৳ {client.due.toLocaleString()}
                    </strong>
                  </td>

                  <td style={td}>
                    <span style={activeBadge}>{client.status}</span>
                  </td>

                  <td style={td}>
                    <Link
                      href={`/clients/${client.id}`}
                      style={{
                        textDecoration: "none",
                        ...smallButton,
                      }}
                    >
                      Open Client
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

const primaryButton = {
  border: 0,
  background: "#0f3d36",
  color: "#fff",
  borderRadius: 11,
  padding: "12px 17px",
  fontWeight: 850,
  cursor: "pointer",
};

const smallButton = {
  display: "inline-block",
  border: "1px solid #cbd5e1",
  color: "#334155",
  background: "#fff",
  borderRadius: 8,
  padding: "7px 10px",
  fontWeight: 750,
};

const activeBadge = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  background: "#ecfdf5",
  color: "#047857",
  fontWeight: 850,
  fontSize: 11,
};

const inputStyle = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "11px 12px",
  outline: "none",
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
  padding: "14px 10px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
  verticalAlign: "middle" as const,
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
