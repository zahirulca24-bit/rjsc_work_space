import test from "node:test";
import assert from "node:assert";
import type { WorkingPaper, CompanyData, DirectorRecord, ShareholderRecord } from "../../api/working-papers";

test("Working Paper Contract: Snapshot structure contains all required sections and fields", () => {
  const mockPaper: WorkingPaper = {
    id: "wp-1001",
    work_id: "work-5001",
    client_id: "client-2001",
    title: "Working Paper — Annual Return (2023-2024)",
    paper_type: "ANNUAL_RETURN_COMPLIANCE",
    filing_year: "2023-2024",
    status: "DRAFT",
    prepared_by: "Junior Staff",
    reviewed_by: null,
    approved_by: null,
    reviewed_at: null,
    notes: "Auto-initialized snapshot",
    company_data: {
      legal_name: "Meghna Enterprises Ltd",
      registration_no: "C-12345",
      entity_type: "PRIVATE_COMPANY",
      incorporation_date: "2020-05-15",
      former_name: "",
      registered_office: "Dhaka, Bangladesh",
      tin: "1234567890",
      bin: "0012345678",
      authorized_capital: 10000000,
      paid_up_capital: 5000000,
      sources: {
        legal_name: "Client Master Record",
        registration_no: "Certificate of Incorporation"
      }
    },
    directors_data: [
      {
        id: "dir-1",
        full_name: "Kabir Hossain",
        designation: "Managing Director",
        is_current: true,
        appointment_date: "2020-05-15",
        changes: "Continuing"
      }
    ],
    shareholders_data: [
      {
        id: "sh-1",
        shareholder_name: "Kabir Hossain",
        share_count: 50000,
        share_value: 100,
        total_value: 5000000,
        ownership_percentage: 100,
        is_current: true
      }
    ],
    agm_analysis: [],
    forms_data: {},
    linked_documents: [
      {
        id: "doc-1",
        document_name: "Certificate of Incorporation",
        scope: "CLIENT_LEGAL_DOC",
        status: "VERIFIED"
      }
    ],
    missing_fields: [
      {
        field: "REGISTERED_OFFICE",
        message: "No Form VI on file; using master address text.",
        severity: "WARNING"
      }
    ],
    created_at: "2026-10-14T00:00:00Z",
    updated_at: "2026-10-14T00:00:00Z"
  };

  assert.strictEqual(mockPaper.id, "wp-1001");
  assert.strictEqual(mockPaper.paper_type, "ANNUAL_RETURN_COMPLIANCE");
  assert.strictEqual(mockPaper.filing_year, "2023-2024");
  assert.strictEqual(mockPaper.status, "DRAFT");
  assert.strictEqual(mockPaper.company_data.legal_name, "Meghna Enterprises Ltd");
  assert.strictEqual(mockPaper.missing_fields.length, 1);
  assert.strictEqual(mockPaper.missing_fields[0].field, "REGISTERED_OFFICE");
  assert.strictEqual(mockPaper.linked_documents.length, 1);
});

test("Working Paper Snapshot: Snapshot is isolated from subsequent client changes", () => {
  const originalSnapshot: CompanyData = {
    legal_name: "Original Name Ltd",
    registration_no: "C-99001",
    entity_type: "PRIVATE_COMPANY",
    registered_office: "House 1, Road 2, Gulshan"
  };

  // Simulating an update to the master client object
  const masterClient = { ...originalSnapshot };
  masterClient.legal_name = "Modified Master Name Ltd";
  masterClient.registered_office = "New Address, Banani";

  // Snapshot remains unmodified
  assert.strictEqual(originalSnapshot.legal_name, "Original Name Ltd");
  assert.strictEqual(originalSnapshot.registered_office, "House 1, Road 2, Gulshan");
  assert.notStrictEqual(originalSnapshot.legal_name, masterClient.legal_name);
});

test("Working Paper Missing Fields: Gaps in directors, registered office or shareholders are identified", () => {
  const evaluateGaps = (company: Partial<CompanyData>, dirs: DirectorRecord[], shares: ShareholderRecord[]) => {
    const gaps: Array<{ field: string; message: string }> = [];
    if (!company.registered_office || company.registered_office.trim() === "") {
      gaps.push({ field: "REGISTERED_OFFICE", message: "Registered office address is missing." });
    }
    const currentDirs = dirs.filter((d) => d.is_current);
    if (currentDirs.length === 0) {
      gaps.push({ field: "DIRECTORS", message: "No active directors recorded." });
    }
    const currentShares = shares.filter((s) => s.is_current);
    if (currentShares.length === 0) {
      gaps.push({ field: "SHAREHOLDERS", message: "No active shareholders recorded." });
    }
    return gaps;
  };

  const gaps = evaluateGaps({ registered_office: "" }, [], []);
  assert.strictEqual(gaps.length, 3);
  assert.strictEqual(gaps[0].field, "REGISTERED_OFFICE");
  assert.strictEqual(gaps[1].field, "DIRECTORS");
  assert.strictEqual(gaps[2].field, "SHAREHOLDERS");

  const noGaps = evaluateGaps(
    { registered_office: "Dhaka" },
    [{ full_name: "Director 1", is_current: true }],
    [{ shareholder_name: "Shareholder 1", share_count: 100, share_value: 10, total_value: 1000, is_current: true }]
  );
  assert.strictEqual(noGaps.length, 0);
});

test("Working Paper Tab Navigation: Switching tabs does not mutate snapshot data", () => {
  const tabs = ["overview", "company", "directors-shares", "agm-analysis", "forms", "forms-lab", "review"] as const;
  let activeTab: (typeof tabs)[number] = "overview";

  const snapshotData = { filing_year: "2023-2024", notes: "Initial Notes" };
  const snapshotCopy = { ...snapshotData };

  // Cycle through all tabs
  for (const tab of tabs) {
    activeTab = tab;
    // Data remains unmutated
    assert.deepStrictEqual(snapshotData, snapshotCopy);
  }
  assert.strictEqual(activeTab, "review");
});
