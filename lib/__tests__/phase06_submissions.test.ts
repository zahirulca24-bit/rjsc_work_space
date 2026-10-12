import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PreSubmissionReview,
  WorkSubmissionRecord,
  WorkQueryRecord,
  WorkDeliveryRecord
} from "../api/submissions";

describe("Phase 06: Manual RJSC Submission Records & Follow-up Contract", () => {
  it("Pre-submission review requires management approval and generated forms", () => {
    const unapprovedReview: PreSubmissionReview = {
      work_id: "work-123",
      client_id: "client-456",
      service_id: "annual-filing",
      work_status: "In Preparation",
      review_status: "DRAFT",
      is_approved_for_submission: false,
      approved_forms: [],
      latest_generated_forms: [],
      required_checklist_items: [
        { id: "chk-1", item_code: "DOC_FORM_XII", item_text: "Form XII", status: "PENDING" }
      ],
      completed_checklist_count: 0,
      total_checklist_count: 1,
      missing_documents: [
        { item_code: "DOC_FORM_XII", item_text: "Form XII", status: "PENDING" }
      ],
      is_submission_ready: false,
      readiness_warnings: [
        "Work review status is 'DRAFT'. Management approval ('APPROVED') is required before submission.",
        "No RJSC statutory forms have been generated yet in Forms Lab."
      ]
    };

    assert.equal(unapprovedReview.is_submission_ready, false);
    assert.equal(unapprovedReview.readiness_warnings.length, 2);

    const approvedReview: PreSubmissionReview = {
      work_id: "work-123",
      client_id: "client-456",
      service_id: "annual-filing",
      work_status: "Ready for Submission",
      review_status: "APPROVED",
      is_approved_for_submission: true,
      approved_forms: [
        {
          id: "form-rec-1",
          form_code: "FORM_XII",
          form_title: "Form XII",
          version: 1,
          file_name: "Form_XII.pdf",
          file_path: "storage/generated/Form_XII.pdf",
          status: "APPROVED_FOR_PORTAL_UPLOAD",
          missing_fields: []
        }
      ],
      latest_generated_forms: [],
      required_checklist_items: [
        { id: "chk-1", item_code: "DOC_FORM_XII", item_text: "Form XII", status: "COMPLETED" }
      ],
      completed_checklist_count: 1,
      total_checklist_count: 1,
      missing_documents: [],
      is_submission_ready: true,
      readiness_warnings: []
    };

    assert.equal(approvedReview.is_submission_ready, true);
    assert.equal(approvedReview.approved_forms.length, 1);
    assert.equal(approvedReview.missing_documents.length, 0);
  });

  it("Manual submission record structure enforces audit trail and tracking number", () => {
    const submission: WorkSubmissionRecord = {
      id: "sub-001",
      work_id: "work-101",
      client_id: "client-202",
      submission_type: "INITIAL",
      submission_number: 1,
      filing_year: "2024",
      forms_submitted: [
        { form_code: "FORM_XII", form_title: "Form XII", version: 1, file_name: "form12.pdf" }
      ],
      submitted_at: "2026-10-12T10:00:00Z",
      submitted_by: "Compliance Officer Rahman",
      rjsc_tracking_no: "RJSC-DHAKA-2026-7891",
      portal_ack_ref: "ACK-PORTAL-9900",
      govt_fee_challan_ref: "CHALLAN-SONALI-1234",
      status: "SUBMITTED",
      created_at: "2026-10-12T10:01:00Z",
      updated_at: "2026-10-12T10:01:00Z"
    };

    assert.equal(submission.submission_type, "INITIAL");
    assert.equal(submission.submission_number, 1);
    assert.equal(submission.rjsc_tracking_no, "RJSC-DHAKA-2026-7891");
    assert.equal(submission.forms_submitted.length, 1);
  });

  it("RJSC query model captures deadlines and link to correction tasks", () => {
    const query: WorkQueryRecord = {
      id: "q-101",
      submission_id: "sub-001",
      work_id: "work-101",
      client_id: "client-202",
      query_date: "2026-10-14",
      query_reference: "RJSC/OBJ/0091",
      query_subject: "Need clear copy of Director NID",
      query_description: "Reviewing officer indicated director national ID was illegible.",
      assigned_to: "Junior Associate",
      deadline_date: "2026-10-24",
      linked_task_id: "task-888",
      status: "OPEN",
      created_at: "2026-10-14T09:00:00Z",
      updated_at: "2026-10-14T09:00:00Z"
    };

    assert.equal(query.status, "OPEN");
    assert.equal(query.deadline_date, "2026-10-24");
    assert.equal(query.linked_task_id, "task-888");
  });

  it("Resubmission preserves parent submission and tracks progressive filing numbers", () => {
    const resubmission: WorkSubmissionRecord = {
      id: "sub-002",
      work_id: "work-101",
      client_id: "client-202",
      submission_type: "RESUBMISSION",
      submission_number: 2,
      parent_submission_id: "sub-001",
      filing_year: "2024",
      forms_submitted: [
        { form_code: "FORM_XII", form_title: "Form XII", version: 2, file_name: "form12_v2.pdf" }
      ],
      submitted_at: "2026-10-18T14:30:00Z",
      submitted_by: "Compliance Officer Rahman",
      rjsc_tracking_no: "RJSC-DHAKA-2026-7891-R1",
      status: "SUBMITTED",
      created_at: "2026-10-18T14:31:00Z",
      updated_at: "2026-10-18T14:31:00Z"
    };

    assert.equal(resubmission.submission_type, "RESUBMISSION");
    assert.equal(resubmission.submission_number, 2);
    assert.equal(resubmission.parent_submission_id, "sub-001");
  });

  it("Final delivery separates operational delivery from financial closure", () => {
    const delivery: WorkDeliveryRecord = {
      id: "del-001",
      work_id: "work-101",
      client_id: "client-202",
      outcome: "APPROVED",
      outcome_date: "2026-10-20",
      rjsc_approval_ref: "RJSC-APP-2026-1122",
      certified_copy_document_name: "Certified_Form_XII.pdf",
      delivered_to_client_at: "2026-10-21T11:00:00Z",
      delivered_by: "Partner Zahir",
      delivery_method: "HAND_DELIVERY",
      client_ack_ref: "SIGNED-CHALLAN-902",
      corporate_history_filing_id: "hist-filing-333",
      operational_closed_at: "2026-10-21T11:30:00Z",
      closed_by: "admin@za.com",
      created_at: "2026-10-20T10:00:00Z",
      updated_at: "2026-10-21T11:30:00Z"
    };

    assert.equal(delivery.outcome, "APPROVED");
    assert.equal(delivery.delivery_method, "HAND_DELIVERY");
    assert.ok(delivery.corporate_history_filing_id);
    assert.ok(delivery.operational_closed_at);
  });
});
