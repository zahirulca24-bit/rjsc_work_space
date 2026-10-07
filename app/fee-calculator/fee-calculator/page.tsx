"use client";

import { useMemo, useState } from "react";

type ServiceKey =
  | "Name Clearance"
  | "Name Clearance Extension"
  | "Private Company Registration"
  | "Annual Return / Returns Filing"
  | "Change Return / Form XII"
  | "Registered Office Change / Form VI"
  | "Certified Copy - Incorporation Certificate"
  | "Certified Copy - Other Document"
  | "Inspection of Records"
  | "Society Registration"
  | "Society Return Filing"
  | "Partnership Form 2 / 5 / 6";

const services: ServiceKey[] = [
  "Name Clearance",
  "Name Clearance Extension",
  "Private Company Registration",
  "Annual Return / Returns Filing",
  "Change Return / Form XII",
  "Registered Office Change / Form VI",
  "Certified Copy - Incorporation Certificate",
  "Certified Copy - Other Document",
  "Inspection of Records",
  "Society Registration",
  "Society Return Filing",
  "Partnership Form 2 / 5 / 6",
];

export default function FeeCalculatorPage() {
  const [service, setService] =
    useState<ServiceKey>("Annual Return / Returns Filing");

  const [authorizedCapital, setAuthorizedCapital] = useState(1000000);
  const [nameCount, setNameCount] = useState(1);
  const [documentCount, setDocumentCount] = useState(1);
  const [lateDays, setLateDays] = useState(0);
  const [professionalFee, setProfessionalFee] = useState(5000);
  const [otherCost, setOtherCost] = useState(300);

  const breakdown = useMemo(() => {
    const rows: { label: string; amount: number; note?: string }[] = [];

    if (service === "Name Clearance") {
      rows.push({
        label: "Name Clearance Fee",
        amount: nameCount * 500,
        note: "Tk 500 per proposed name",
      });
    }

    if (service === "Name Clearance Extension") {
      rows.push({
        label: "Extension Fee",
        amount: 200,
        note: "Tk 200 per extension application",
      });
    }

    if (service === "Private Company Registration") {
      const moaStamp = 1000;

      const aoaStamp =
        authorizedCapital <= 1000000
          ? 2000
          : authorizedCapital <= 30000000
          ? 4000
          : 10000;

      const filingFee = 1200;

      let capitalFee = 0;

      if (authorizedCapital > 1000000) {
        const firstBand = Math.min(authorizedCapital, 5000000) - 1000000;

        if (firstBand > 0) {
          capitalFee += Math.ceil(firstBand / 100000) * 80;
        }

        if (authorizedCapital > 5000000) {
          capitalFee +=
            Math.ceil((authorizedCapital - 5000000) / 100000) * 130;
        }
      }

      rows.push(
        {
          label: "MOA Stamp",
          amount: moaStamp,
          note: "Fixed",
        },
        {
          label: "AOA Stamp",
          amount: aoaStamp,
          note: "Based on authorized capital",
        },
        {
          label: "Registration Filing Fee",
          amount: filingFee,
          note: "6 documents × Tk 200",
        },
        {
          label: "Capital Registration Fee",
          amount: capitalFee,
          note: "Based on authorized capital",
        }
      );
    }

    if (
      service === "Annual Return / Returns Filing" ||
      service === "Change Return / Form XII" ||
      service === "Registered Office Change / Form VI"
    ) {
      const filing = documentCount * 200;
      const late = Math.min(lateDays * 500, documentCount * 1000);

      rows.push(
        {
          label: "Return / Filing Fee",
          amount: filing,
          note: `${documentCount} document(s) × Tk 200`,
        },
        {
          label: "Late Fee",
          amount: late,
          note: lateDays
            ? `${lateDays} late day(s), capped per document`
            : "No late fee",
        }
      );
    }

    if (
      service === "Certified Copy - Incorporation Certificate" ||
      service === "Certified Copy - Other Document"
    ) {
      rows.push({
        label: "Certified Copy Base Fee",
        amount: 100,
        note: "Minimum/base estimate",
      });
    }

    if (service === "Inspection of Records") {
      rows.push({
        label: "Inspection Fee",
        amount: 100,
      });
    }

    if (service === "Society Registration") {
      rows.push({
        label: "Society Registration Fee",
        amount: 15000,
      });
    }

    if (service === "Society Return Filing") {
      rows.push({
        label: "Society Return Fee",
        amount: documentCount * 800,
        note: `${documentCount} document(s) × Tk 800`,
      });
    }

    if (service === "Partnership Form 2 / 5 / 6") {
      rows.push({
        label: "Partnership Form Fee",
        amount: documentCount * 4,
        note: `${documentCount} form(s) × Tk 4`,
      });
    }

    return rows;
  }, [
    service,
    authorizedCapital,
    nameCount,
    documentCount,
    lateDays,
  ]);

  const govtFee = breakdown.reduce((sum, x) => sum + x.amount, 0);
  const totalClientBill = govtFee + professionalFee + otherCost;

  const showCapital = service === "Private Company Registration";
  const showNameCount = service === "Name Clearance";
  const showDocumentCount =
    service === "Annual Return / Returns Filing" ||
    service === "Change Return / Form XII" ||
    service === "Registered Office Change / Form VI" ||
    service === "Society Return Filing" ||
    service === "Partnership Form 2 / 5 / 6";

  const showLateDays =
    service === "Annual Return / Returns Filing" ||
    service === "Change Return / Form XII" ||
    service === "Registered Office Change / Form VI";

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 850, margin: 0 }}>
          RJSC Fee Calculator
        </h1>

        <p style={{ color: "#64748b", marginTop: 7 }}>
          Estimate RJSC / government fee and total client bill.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: ".9fr 1.1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        <div style={panel}>
          <h2 style={panelTitle}>Calculator Input</h2>

          <div style={{ display: "grid", gap: 16 }}>
            <label>
              <div style={labelStyle}>RJSC Service</div>

              <select
                value={service}
                onChange={(e) =>
                  setService(e.target.value as ServiceKey)
                }
                style={inputStyle}
              >
                {services.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>
            </label>

            {showCapital && (
              <label>
                <div style={labelStyle}>
                  Authorized Capital (BDT)
                </div>

                <input
                  type="number"
                  value={authorizedCapital}
                  onChange={(e) =>
                    setAuthorizedCapital(Number(e.target.value))
                  }
                  style={inputStyle}
                />
              </label>
            )}

            {showNameCount && (
              <label>
                <div style={labelStyle}>
                  Number of Proposed Names
                </div>

                <input
                  type="number"
                  min={1}
                  value={nameCount}
                  onChange={(e) =>
                    setNameCount(Math.max(1, Number(e.target.value)))
                  }
                  style={inputStyle}
                />
              </label>
            )}

            {showDocumentCount && (
              <label>
                <div style={labelStyle}>
                  Number of Documents / Forms
                </div>

                <input
                  type="number"
                  min={1}
                  value={documentCount}
                  onChange={(e) =>
                    setDocumentCount(
                      Math.max(1, Number(e.target.value))
                    )
                  }
                  style={inputStyle}
                />
              </label>
            )}

            {showLateDays && (
              <label>
                <div style={labelStyle}>Late Days</div>

                <input
                  type="number"
                  min={0}
                  value={lateDays}
                  onChange={(e) =>
                    setLateDays(Math.max(0, Number(e.target.value)))
                  }
                  style={inputStyle}
                />
              </label>
            )}

            <div
              style={{
                borderTop: "1px solid #e2e8f0",
                paddingTop: 16,
                marginTop: 4,
              }}
            >
              <div
                style={{
                  fontWeight: 850,
                  marginBottom: 13,
                }}
              >
                Office Billing
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <label>
                  <div style={labelStyle}>
                    Professional Fee
                  </div>

                  <input
                    type="number"
                    value={professionalFee}
                    onChange={(e) =>
                      setProfessionalFee(Number(e.target.value))
                    }
                    style={inputStyle}
                  />
                </label>

                <label>
                  <div style={labelStyle}>Other Cost</div>

                  <input
                    type="number"
                    value={otherCost}
                    onChange={(e) =>
                      setOtherCost(Number(e.target.value))
                    }
                    style={inputStyle}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 20 }}>
          <div style={panel}>
            <h2 style={panelTitle}>Government Fee Breakdown</h2>

            <div style={{ display: "grid", gap: 10 }}>
              {breakdown.map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 20,
                    borderBottom: "1px solid #f1f5f9",
                    paddingBottom: 11,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 750 }}>
                      {row.label}
                    </div>

                    {row.note && (
                      <div
                        style={{
                          color: "#94a3b8",
                          fontSize: 12,
                          marginTop: 3,
                        }}
                      >
                        {row.note}
                      </div>
                    )}
                  </div>

                  <div style={{ fontWeight: 850 }}>
                    ৳ {row.amount.toLocaleString()}
                  </div>
                </div>
              ))}

              {breakdown.length === 0 && (
                <div
                  style={{
                    color: "#94a3b8",
                    padding: "15px 0",
                  }}
                >
                  No automatic fee rule configured.
                </div>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16,
                paddingTop: 15,
                borderTop: "2px solid #e2e8f0",
                fontSize: 19,
                fontWeight: 850,
              }}
            >
              <span>Estimated RJSC Fee</span>
              <span>৳ {govtFee.toLocaleString()}</span>
            </div>
          </div>

          <div style={panel}>
            <h2 style={panelTitle}>Client Bill Summary</h2>

            <SummaryRow
              label="Professional Fee"
              amount={professionalFee}
            />

            <SummaryRow
              label="RJSC / Govt Fee"
              amount={govtFee}
            />

            <SummaryRow
              label="Other Cost"
              amount={otherCost}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 16,
                paddingTop: 16,
                borderTop: "2px solid #cbd5e1",
                fontSize: 22,
                fontWeight: 900,
              }}
            >
              <span>Total Client Bill</span>
              <span>
                ৳ {totalClientBill.toLocaleString()}
              </span>
            </div>
          </div>

          <div
            style={{
              border: "1px solid #fed7aa",
              background: "#fff7ed",
              color: "#9a3412",
              borderRadius: 13,
              padding: 15,
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <strong>Important:</strong> This is an internal
            estimate. Final payable amount should be verified
            against the RJSC portal before submission, especially
            for variable fees, stamps, mortgage/charge and other
            case-specific filings.
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

function SummaryRow({
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
        gap: 20,
        padding: "10px 0",
        borderBottom: "1px solid #f1f5f9",
      }}
    >
      <span style={{ color: "#64748b" }}>{label}</span>

      <span style={{ fontWeight: 800 }}>
        ৳ {amount.toLocaleString()}
      </span>
    </div>
  );
}
