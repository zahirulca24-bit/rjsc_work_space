export type WorkStatus = "Pending" | "In Progress" | "Waiting Client" | "Submitted" | "Completed" | "On Hold";

export const services = [
  { name: "Name Clearance", fee: 500, category: "Pre-Registration", action: "Prepare/search proposed name and submit Name Clearance application" },
  { name: "Name Clearance Extension", fee: 200, category: "Pre-Registration", action: "Apply for extension before clearance validity expires" },
  { name: "Private Company Registration", fee: 1200, category: "Registration", action: "Collect incorporation documents and calculate final RJSC fee" },
  { name: "Annual Return / Returns Filing", fee: 200, category: "Post-Registration", action: "Prepare prescribed annual return documents and verify filing deadline" },
  { name: "Change Return / Form XII", fee: 200, category: "Post-Registration", action: "Prepare Form XII and supporting board/shareholder documents" },
  { name: "Registered Office Change / Form VI", fee: 200, category: "Post-Registration", action: "Prepare Form VI and supporting resolution/address documents" },
  { name: "Certified Copy - Other Document", fee: 100, category: "Certified Copy", action: "Identify exact historical document and submit certified copy application" },
  { name: "Inspection of Records", fee: 100, category: "Certified Copy", action: "Apply for record inspection" },
  { name: "Society Registration", fee: 15000, category: "Registration", action: "Collect society constitution/member documents and submit registration" },
  { name: "Society Return Filing", fee: 800, category: "Post-Registration", action: "Prepare society return document and submit" }
];

export { clientStore } from './clients/client-store';
export const works = [
  { id: "DEMO-001", client: "SILVEE AND SINTHEE TRAVEL AGENCY LTD.", service: "Annual Return / Returns Filing", assigned: "Noyon", status: "In Progress" as WorkStatus, due: "15-Oct-2026", bill: 5500, collection: 3000, dueAmount: 2500 }
];

export const requiredDocs: Record<string, string[]> = {
  "Annual Return / Returns Filing": ["Latest Form XII", "AGM Minutes / Resolution", "Schedule X information", "Audited Financial Statements", "Director & Shareholder information", "Previous filing / challan if available"],
  "Change Return / Form XII": ["Board / Shareholder Resolution", "Updated director particulars", "NID/Passport copies", "Share transfer/appointment/resignation support", "Existing Form XII"],
  "Private Company Registration": ["Name Clearance", "MOA", "AOA", "Form I", "Form VI", "Form IX", "Form X", "Form XII", "Director/Shareholder NID/Passport"],
  "Name Clearance": ["Proposed company names", "Applicant contact details"],
};
