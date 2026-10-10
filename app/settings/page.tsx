"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [firmName, setFirmName] = useState("Zahir & Associate");
  const [department, setDepartment] = useState("RJSC Department");
  const [manager, setManager] = useState("Md. Zahirul Islam");
  const [defaultReviewer, setDefaultReviewer] = useState("Md. Zahirul Islam");
  const [currency, setCurrency] = useState("BDT");
  const [timezone, setTimezone] = useState("Asia/Dhaka");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [dueAlerts, setDueAlerts] = useState(true);
  const [reviewAlerts, setReviewAlerts] = useState(true);

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>
          Settings
        </h1>

        <p style={{ color: "#64748b", marginTop: 7 }}>
          Configure RJSC office workflow, review controls and system defaults.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        <div style={panel}>
          <h2 style={panelTitle}>Firm & Department</h2>

          <div style={{ display: "grid", gap: 15 }}>
            <Field
              label="Firm Name"
              value={firmName}
              onChange={setFirmName}
            />

            <Field
              label="Department"
              value={department}
              onChange={setDepartment}
            />

            <Field
              label="Department Manager"
              value={manager}
              onChange={setManager}
            />
          </div>
        </div>

        <div style={panel}>
          <h2 style={panelTitle}>Workflow Defaults</h2>

          <div style={{ display: "grid", gap: 15 }}>
            <label>
              <div style={labelStyle}>Default Reviewer</div>

              <select
                value={defaultReviewer}
                onChange={(e) =>
                  setDefaultReviewer(e.target.value)
                }
                style={inputStyle}
              >
                <option>Md. Zahirul Islam</option>
                <option>Hemadry Roy</option>
              </select>
            </label>

            <label>
              <div style={labelStyle}>Default Currency</div>

              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={inputStyle}
              >
                <option>BDT</option>
                <option>USD</option>
              </select>
            </label>

            <label>
              <div style={labelStyle}>Timezone</div>

              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={inputStyle}
              >
                <option>Asia/Dhaka</option>
              </select>
            </label>
          </div>
        </div>

        <div style={panel}>
          <h2 style={panelTitle}>Document Storage</h2>

          <StatusRow
            title="Google Drive"
            text="Client folders and working documents"
            status="Not Connected"
            warning
          />

          <StatusRow
            title="Local Upload"
            text="Temporary frontend document selection"
            status="Enabled"
          />

          <StatusRow
            title="Automatic Folder Creation"
            text="Create client/work folder on new engagement"
            status="Backend Required"
            warning
          />
        </div>

        <div style={panel}>
          <h2 style={panelTitle}>Notifications</h2>

          <ToggleRow
            title="Email Alerts"
            text="Send important work notifications"
            checked={emailAlerts}
            onChange={setEmailAlerts}
          />

          <ToggleRow
            title="Due Date Alerts"
            text="Notify before work becomes overdue"
            checked={dueAlerts}
            onChange={setDueAlerts}
          />

          <ToggleRow
            title="Review Alerts"
            text="Notify manager when work is ready for review"
            checked={reviewAlerts}
            onChange={setReviewAlerts}
          />
        </div>

        <div
          style={{
            ...panel,
            gridColumn: "1 / -1",
          }}
        >
          <h2 style={panelTitle}>Workflow Control</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 12,
            }}
          >
            <Flow
              no="01"
              title="Prepare"
              text="Junior / Executive prepares documents and working paper."
            />

            <Flow
              no="02"
              title="Review"
              text="Senior reviews documents, exceptions and completeness."
            />

            <Flow
              no="03"
              title="Approve"
              text="Manager approves submission readiness."
            />

            <Flow
              no="04"
              title="Complete"
              text="Submission, acknowledgement, billing and archive."
            />
          </div>
        </div>

        <div
          style={{
            ...panel,
            gridColumn: "1 / -1",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontWeight: 900, fontSize: 17 }}>
                Save Settings
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 13,
                  marginTop: 5,
                }}
              >
                Frontend demo only. Persistent settings will activate after
                backend integration.
              </div>
            </div>

            <button style={primaryButton}>Save Changes</button>
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
  fontWeight: 900,
  margin: "0 0 16px",
};

const labelStyle = {
  color: "#64748b",
  fontSize: 11,
  fontWeight: 850,
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
  borderRadius: 10,
  padding: "11px 16px",
  fontWeight: 850,
  cursor: "pointer",
};

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <div style={labelStyle}>{label}</div>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </label>
  );
}

function StatusRow({
  title,
  text,
  status,
  warning = false,
}: {
  title: string;
  text: string;
  status: string;
  warning?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 18,
        alignItems: "center",
        padding: "13px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <div>
        <div style={{ fontWeight: 850 }}>{title}</div>

        <div
          style={{
            color: "#64748b",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {text}
        </div>
      </div>

      <span
        style={{
          padding: "5px 8px",
          borderRadius: 999,
          background: warning ? "#fff7ed" : "#ecfdf5",
          color: warning ? "#c2410c" : "#047857",
          fontSize: 11,
          fontWeight: 850,
        }}
      >
        {status}
      </span>
    </div>
  );
}

function ToggleRow({
  title,
  text,
  checked,
  onChange,
}: {
  title: string;
  text: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 18,
        alignItems: "center",
        padding: "13px 0",
        borderBottom: "1px solid #f1f5f9",
        cursor: "pointer",
      }}
    >
      <div>
        <div style={{ fontWeight: 850 }}>{title}</div>

        <div
          style={{
            color: "#64748b",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {text}
        </div>
      </div>

      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 18,
          height: 18,
          cursor: "pointer",
        }}
      />
    </label>
  );
}

function Flow({
  no,
  title,
  text,
}: {
  no: string;
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
      <div
        style={{
          color: "#0f766e",
          fontSize: 11,
          fontWeight: 900,
        }}
      >
        STEP {no}
      </div>

      <div
        style={{
          fontWeight: 900,
          marginTop: 6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: "#64748b",
          fontSize: 12,
          lineHeight: 1.5,
          marginTop: 6,
        }}
      >
        {text}
      </div>
    </div>
  );
}
