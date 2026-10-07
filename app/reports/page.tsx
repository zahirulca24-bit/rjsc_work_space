"use client";

const workSummary = [
  { label: "Open", value: 7 },
  { label: "In Progress", value: 4 },
  { label: "Waiting Client", value: 2 },
  { label: "Completed", value: 18 },
];

const services = [
  { name: "Annual Return / Returns Filing", jobs: 8, bill: 42000 },
  { name: "Form XII / Change Return", jobs: 5, bill: 27500 },
  { name: "Name Clearance", jobs: 4, bill: 12000 },
  { name: "Private Company Registration", jobs: 3, bill: 75000 },
];

const team = [
  { name: "Md. Zahirul Islam", open: 4, review: 3, completed: 18 },
  { name: "Hemadry Roy", open: 3, review: 1, completed: 12 },
  { name: "Md. Bayezid", open: 3, review: 0, completed: 8 },
  { name: "Noyon", open: 2, review: 1, completed: 14 },
];

const overdue = [
  {
    workId: "RJSC-0041",
    client: "Example Client A",
    service: "Annual Return / Returns Filing",
    dueDate: "03-Oct-2026",
    assigned: "Noyon",
    due: 3500,
  },
  {
    workId: "RJSC-0044",
    client: "Example Client B",
    service: "Form XII / Change Return",
    dueDate: "05-Oct-2026",
    assigned: "Md. Bayezid",
    due: 2200,
  },
];

export default function ReportsPage() {
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
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>
            Reports
          </h1>

          <p style={{ color: "#64748b", marginTop: 7 }}>
            Management summary for RJSC operations, billing and team performance.
          </p>
        </div>

        <button style={primaryButton}>Export Report</button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <Stat title="Total Bill" value="৳ 1,56,500" />
        <Stat title="Collection" value="৳ 1,08,000" />
        <Stat title="Outstanding Due" value="৳ 48,500" warning />
        <Stat title="Overdue Jobs" value="2" warning />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 22,
        }}
      >
        <div style={panel}>
          <h2 style={panelTitle}>Work Status Summary</h2>

          <div style={{ display: "grid", gap: 10 }}>
            {workSummary.map((x) => (
              <div
                key={x.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid #f1f5f9",
                  paddingBottom: 10,
                }}
              >
                <span style={{ color: "#64748b" }}>{x.label}</span>
                <strong style={{ fontSize: 18 }}>{x.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div style={panel}>
          <h2 style={panelTitle}>Financial Position</h2>

          <MoneyRow label="Total Bill" amount={156500} />
          <MoneyRow label="Collection" amount={108000} />
          <MoneyRow label="Outstanding Due" amount={48500} strong />
          <MoneyRow label="Collection Rate" text="69%" />
        </div>
      </div>

      <div style={{ ...panel, marginBottom: 22 }}>
        <h2 style={panelTitle}>Service Performance</h2>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 700,
            }}
          >
            <thead>
              <tr>
                {["SERVICE", "JOBS", "TOTAL BILL", "AVG. BILL"].map((x) => (
                  <th key={x} style={th}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {services.map((x) => (
                <tr key={x.name}>
                  <td style={td}>
                    <strong>{x.name}</strong>
                  </td>

                  <td style={td}>{x.jobs}</td>

                  <td style={td}>
                    ৳ {x.bill.toLocaleString()}
                  </td>

                  <td style={td}>
                    ৳ {Math.round(x.bill / x.jobs).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
          marginBottom: 22,
        }}
      >
        <div style={panel}>
          <h2 style={panelTitle}>Team Performance</h2>

          <div style={{ display: "grid", gap: 10 }}>
            {team.map((x) => (
              <div
                key={x.name}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <strong>{x.name}</strong>
                  <span style={activeBadge}>Active</span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <Mini label="Open" value={x.open} />
                  <Mini label="Review" value={x.review} />
                  <Mini label="Done" value={x.completed} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={panel}>
          <h2 style={panelTitle}>Management Notes</h2>

          <div style={{ display: "grid", gap: 10 }}>
            <Note
              title="Outstanding Collection"
              text="Tk 48,500 remains outstanding across active engagements."
            />

            <Note
              title="Review Queue"
              text="5 items are currently pending senior/manager review."
            />

            <Note
              title="Overdue Work"
              text="2 engagements are past due and require immediate follow-up."
            />

            <Note
              title="Highest Activity"
              text="Annual Return / Returns Filing currently has the highest job volume."
            />
          </div>
        </div>
      </div>

      <div style={panel}>
        <h2 style={panelTitle}>Overdue Jobs</h2>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: 900,
            }}
          >
            <thead>
              <tr>
                {[
                  "WORK ID",
                  "CLIENT",
                  "SERVICE",
                  "DUE DATE",
                  "ASSIGNED",
                  "OUTSTANDING",
                ].map((x) => (
                  <th key={x} style={th}>
                    {x}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {overdue.map((x) => (
                <tr key={x.workId}>
                  <td style={td}>
                    <strong>{x.workId}</strong>
                  </td>

                  <td style={td}>{x.client}</td>
                  <td style={td}>{x.service}</td>

                  <td style={td}>
                    <span style={overdueBadge}>{x.dueDate}</span>
                  </td>

                  <td style={td}>{x.assigned}</td>

                  <td style={td}>
                    <strong style={{ color: "#b91c1c" }}>
                      ৳ {x.due.toLocaleString()}
                    </strong>
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

const panelTitle = {
  fontSize: 18,
  fontWeight: 900,
  margin: "0 0 16px",
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

const th = {
  textAlign: "left" as const,
  padding: "11px 10px",
  background: "#f8fafc",
  color: "#64748b",
  fontSize: 11,
  borderBottom: "1px solid #cbd5e1",
};

const td = {
  padding: "13px 10px",
  borderBottom: "1px solid #f1f5f9",
  fontSize: 13,
};

const activeBadge = {
  background: "#ecfdf5",
  color: "#047857",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 850,
};

const overdueBadge = {
  background: "#fff7ed",
  color: "#c2410c",
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 850,
};

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

function MoneyRow({
  label,
  amount,
  text,
  strong = false,
}: {
  label: string;
  amount?: number;
  text?: string;
  strong?: boolean;
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
      <span style={{ color: "#64748b" }}>{label}</span>

      <strong style={{ color: strong ? "#b91c1c" : "#0f172a" }}>
        {text ?? `৳ ${(amount || 0).toLocaleString()}`}
      </strong>
    </div>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      style={{
        background: "#f8fafc",
        borderRadius: 9,
        padding: 10,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 900 }}>{value}</div>
      <div style={{ color: "#64748b", fontSize: 11 }}>{label}</div>
    </div>
  );
}

function Note({
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
        borderRadius: 12,
        padding: 14,
        background: "#f8fafc",
      }}
    >
      <div style={{ fontWeight: 900 }}>{title}</div>

      <div
        style={{
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.5,
          marginTop: 5,
        }}
      >
        {text}
      </div>
    </div>
  );
}
