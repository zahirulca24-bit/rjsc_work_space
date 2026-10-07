"use client";

const members = [
  {
    name: "Md. Zahirul Islam",
    role: "Manager",
    initials: "ZI",
    assigned: 6,
    open: 4,
    review: 3,
    completed: 18,
    status: "Active",
  },
  {
    name: "Hemadry Roy",
    role: "Senior Auditor",
    initials: "HR",
    assigned: 5,
    open: 3,
    review: 1,
    completed: 12,
    status: "Active",
  },
  {
    name: "Md. Bayezid",
    role: "Audit Associate",
    initials: "MB",
    assigned: 4,
    open: 3,
    review: 0,
    completed: 8,
    status: "Active",
  },
  {
    name: "Noyon",
    role: "RJSC Executive",
    initials: "N",
    assigned: 5,
    open: 2,
    review: 1,
    completed: 14,
    status: "Active",
  },
];

export default function TeamPage() {
  return (
    <div style={{ padding: 28 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>
            Team
          </h1>

          <p style={{ color: "#64748b", marginTop: 7 }}>
            Workload, review status and team performance.
          </p>
        </div>

        <button style={primaryButton}>+ Add Team Member</button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <Stat title="Team Members" value="4" />
        <Stat title="Open Assignments" value="12" />
        <Stat title="Pending Review" value="5" />
        <Stat title="Completed Jobs" value="52" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2,1fr)",
          gap: 18,
        }}
      >
        {members.map((member) => (
          <div key={member.name} style={panel}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 18,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: "#0f3d36",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                  }}
                >
                  {member.initials}
                </div>

                <div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                    }}
                  >
                    {member.name}
                  </div>

                  <div
                    style={{
                      color: "#64748b",
                      marginTop: 4,
                    }}
                  >
                    {member.role}
                  </div>
                </div>
              </div>

              <span style={activeBadge}>
                {member.status}
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 10,
                marginTop: 20,
              }}
            >
              <MiniStat label="Assigned" value={member.assigned} />
              <MiniStat label="Open" value={member.open} />
              <MiniStat label="Review" value={member.review} />
              <MiniStat label="Done" value={member.completed} />
            </div>

            <div
              style={{
                marginTop: 18,
                paddingTop: 15,
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <button style={secondaryButton}>
                View Assignments
              </button>

              <button style={secondaryButton}>
                Performance
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          ...panel,
          marginTop: 22,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 900,
            marginTop: 0,
          }}
        >
          Review Workflow
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr auto 1fr",
            alignItems: "center",
            gap: 15,
            marginTop: 20,
          }}
        >
          <FlowBox
            title="Junior / Executive"
            text="Prepare documents, checklist and working paper."
          />

          <div style={arrow}>→</div>

          <FlowBox
            title="Senior"
            text="Review documents, working paper and exceptions."
          />

          <div style={arrow}>→</div>

          <FlowBox
            title="Manager"
            text="Final approval, submission readiness and completion."
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

const primaryButton = {
  border: 0,
  background: "#0f3d36",
  color: "#fff",
  borderRadius: 11,
  padding: "12px 17px",
  fontWeight: 850,
  cursor: "pointer",
};

const secondaryButton = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  borderRadius: 9,
  padding: "8px 11px",
  fontWeight: 800,
  cursor: "pointer",
};

const activeBadge = {
  background: "#ecfdf5",
  color: "#047857",
  padding: "5px 9px",
  borderRadius: 999,
  fontWeight: 850,
  fontSize: 11,
};

const arrow = {
  fontSize: 26,
  fontWeight: 900,
  color: "#94a3b8",
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

function MiniStat({
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
        border: "1px solid #e2e8f0",
        borderRadius: 11,
        padding: 11,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 18,
          fontWeight: 900,
        }}
      >
        {value}
      </div>

      <div
        style={{
          color: "#64748b",
          fontSize: 11,
          marginTop: 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function FlowBox({
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
        padding: 16,
        background: "#f8fafc",
      }}
    >
      <div style={{ fontWeight: 900 }}>
        {title}
      </div>

      <div
        style={{
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.5,
          marginTop: 6,
        }}
      >
        {text}
      </div>
    </div>
  );
}
