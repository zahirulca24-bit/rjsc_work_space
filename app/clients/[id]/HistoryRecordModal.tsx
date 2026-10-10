import { useState, useEffect } from "react";
import { Modal, PrimaryButton, SecondaryButton, fieldClass } from "@/components/UI";
import { CorporateEvent } from "@/lib/clients/history-types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: CorporateEvent) => Promise<void>;
  clientId: string;
  editEvent?: CorporateEvent | null;
}

export function HistoryRecordModal({ isOpen, onClose, onSave, clientId, editEvent }: Props) {
  const [type, setType] = useState<CorporateEvent['type']>('NAME_CHANGE');
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (editEvent) {
      setType(editEvent.type);
      setFormData({ ...editEvent });
    } else {
      setType("NAME_CHANGE");
      setFormData({});
    }
    setSaveError("");
  }, [editEvent, isOpen]);

  const handleChange = (k: string, v: any) => setFormData({ ...formData, [k]: v });

  const handleSave = async () => {
    if (saving) return;
    setSaveError("");
    // Validation
    if (type === 'NAME_CHANGE' && (!formData.newName || !formData.effectiveDate)) return alert("New Name and Effective Date are required.");
    if (type === 'REGISTERED_OFFICE_CHANGE' && (!formData.address || !formData.effectiveFrom)) return alert("Address and Effective From date are required.");
    if (type === 'CAPITAL_CHANGE' && (Number(formData.authorizedCapital) < 0 || Number(formData.paidUpCapital) < 0 || !formData.effectiveDate)) return alert("Valid Capitals and Effective Date are required.");
    if (type === 'DIRECTOR_CHANGE' && (!formData.fullName || !formData.appointmentDate)) return alert("Full Name and Appointed Date are required.");
    if (type === 'SHAREHOLDER_CHANGE' && (!formData.shareholderName || Number(formData.shareCount) < 0 || !formData.effectiveFrom)) return alert("Shareholder Name, valid Share Count, and Effective From date are required.");
    if (type === 'AGM' && (!formData.financialYear || ((formData.status || 'HELD') === 'HELD' && !formData.agmDate))) return alert("Financial Year is required; AGM Date is required only when Held.");
    if (type === 'ANNUAL_RETURN' && (!formData.financialYear || ((formData.filingStatus || 'PENDING') === 'FILED' && !formData.filedDate))) return alert("Financial Year is required; Filed Date is required when Filed.");
    if (type === 'RJSC_FILING' && (!formData.serviceType || !formData.formName)) return alert("Service Type and Form Name are required.");
    if (type === 'MORTGAGE' && (!formData.lender || Number(formData.securedAmount) < 0 || !formData.creationDate)) return alert("Lender, valid Secured Amount, and Creation Date are required.");
    if (type === 'COMPLIANCE_ISSUE' && (!formData.title || !formData.identifiedDate)) return alert("Title and Identified Date are required.");

    const checkDates = (start?: string, end?: string) => {
      if (start && end && new Date(end).getTime() < new Date(start).getTime()) {
        alert("End/Cessation date cannot be before start/appointment date.");
        return false;
      }
      return true;
    }
    if (type === 'REGISTERED_OFFICE_CHANGE' && !checkDates(formData.effectiveFrom, formData.effectiveTo)) return;
    if (type === 'DIRECTOR_CHANGE' && !checkDates(formData.appointmentDate, formData.cessationDate)) return;
    if (type === 'SHAREHOLDER_CHANGE' && !checkDates(formData.effectiveFrom, formData.effectiveTo)) return;
    if (type === 'COMPLIANCE_ISSUE' && !checkDates(formData.identifiedDate, formData.resolutionDate)) return;

    const ev: CorporateEvent = {
      ...formData,
      ...(type === "AGM" ? { status: formData.status || "HELD", agmDate: (formData.status || "HELD") === "HELD" ? formData.agmDate : null } : {}),
      ...(type === "ANNUAL_RETURN" ? { filingStatus: formData.filingStatus || "PENDING", filedDate: (formData.filingStatus || "PENDING") === "FILED" ? formData.filedDate : null } : {}),
      id: editEvent ? editEvent.id : `evt-${Date.now()}`,
      clientId,
      type
    } as CorporateEvent;

    setSaving(true);
    try {
      await onSave(ev);
    } catch (err: any) {
      setSaveError(err?.message || "Could not save record.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editEvent ? "Edit Record" : "Add Corporate Record"} size="lg">
      <div className="p-6 space-y-4">
        {!editEvent && (
          <div>
            <label className="text-xs font-bold uppercase tracking-wide text-slate-600">Event Type</label>
            <select className={fieldClass} value={type} onChange={e => { setType(e.target.value as CorporateEvent['type']); setFormData({}); }}>
              <option value="NAME_CHANGE">Name Change</option>
              <option value="REGISTERED_OFFICE_CHANGE">Registered Office Change</option>
              <option value="CAPITAL_CHANGE">Capital Change</option>
              <option value="DIRECTOR_CHANGE">Director Change</option>
              <option value="SHAREHOLDER_CHANGE">Shareholder Change</option>
              <option value="AGM">AGM</option>
              <option value="ANNUAL_RETURN">Annual Return</option>
              <option value="RJSC_FILING">RJSC Filing</option>
              <option value="MORTGAGE">Mortgage / Charge</option>
              <option value="COMPLIANCE_ISSUE">Compliance Issue</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          {type === 'NAME_CHANGE' && (
            <>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Previous Name</label><input className={fieldClass} value={formData.previousName||''} onChange={e=>handleChange('previousName', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">New Name</label><input className={fieldClass} value={formData.newName||''} onChange={e=>handleChange('newName', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Effective Date</label><input type="date" className={fieldClass} value={formData.effectiveDate||''} onChange={e=>handleChange('effectiveDate', e.target.value)}/></div>
            </>
          )}
          {type === 'REGISTERED_OFFICE_CHANGE' && (
            <>
              <div className="col-span-2"><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Address</label><input className={fieldClass} value={formData.address||''} onChange={e=>handleChange('address', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Effective From</label><input type="date" className={fieldClass} value={formData.effectiveFrom||''} onChange={e=>handleChange('effectiveFrom', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Effective To</label><input type="date" className={fieldClass} value={formData.effectiveTo||''} onChange={e=>handleChange('effectiveTo', e.target.value)}/></div>
            </>
          )}
          {type === 'CAPITAL_CHANGE' && (
            <>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Authorized Capital</label><input type="number" className={fieldClass} value={formData.authorizedCapital||''} onChange={e=>handleChange('authorizedCapital', Number(e.target.value))}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Paid Up Capital</label><input type="number" className={fieldClass} value={formData.paidUpCapital||''} onChange={e=>handleChange('paidUpCapital', Number(e.target.value))}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Change Type</label><select className={fieldClass} value={formData.changeType||'INITIAL'} onChange={e=>handleChange('changeType', e.target.value)}><option value="INITIAL">Initial</option><option value="INCREASE">Increase</option><option value="DECREASE">Decrease</option></select></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Effective Date</label><input type="date" className={fieldClass} value={formData.effectiveDate||''} onChange={e=>handleChange('effectiveDate', e.target.value)}/></div>
            </>
          )}
          {type === 'DIRECTOR_CHANGE' && (
            <>
              <div className="col-span-2"><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Full Name</label><input className={fieldClass} value={formData.fullName||''} onChange={e=>handleChange('fullName', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Designation</label><input className={fieldClass} value={formData.designation||''} onChange={e=>handleChange('designation', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Current?</label><select className={fieldClass} value={String(formData.current)} onChange={e=>handleChange('current', e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Appointed</label><input type="date" className={fieldClass} value={formData.appointmentDate||''} onChange={e=>handleChange('appointmentDate', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Ceased</label><input type="date" className={fieldClass} value={formData.cessationDate||''} onChange={e=>handleChange('cessationDate', e.target.value)}/></div>
            </>
          )}
          {type === 'SHAREHOLDER_CHANGE' && (
            <>
              <div className="col-span-2"><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Shareholder Name</label><input className={fieldClass} value={formData.shareholderName||''} onChange={e=>handleChange('shareholderName', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Share Count</label><input type="number" className={fieldClass} value={formData.shareCount||''} onChange={e=>handleChange('shareCount', Number(e.target.value))}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Current?</label><select className={fieldClass} value={String(formData.current)} onChange={e=>handleChange('current', e.target.value === 'true')}><option value="true">Yes</option><option value="false">No</option></select></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Effective From</label><input type="date" className={fieldClass} value={formData.effectiveFrom||''} onChange={e=>handleChange('effectiveFrom', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Effective To</label><input type="date" className={fieldClass} value={formData.effectiveTo||''} onChange={e=>handleChange('effectiveTo', e.target.value)}/></div>
            </>
          )}
          {type === 'AGM' && (
            <>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Financial Year</label><input className={fieldClass} value={formData.financialYear||''} onChange={e=>handleChange('financialYear', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">AGM Date (if held)</label><input type="date" disabled={(formData.status || 'HELD') !== 'HELD'} className={fieldClass} value={formData.agmDate||''} onChange={e=>handleChange('agmDate', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Status</label><select className={fieldClass} value={formData.status||'HELD'} onChange={e=>handleChange('status', e.target.value)}><option value="HELD">Held</option><option value="PENDING">Pending</option><option value="NOT_HELD">Not Held</option></select></div>
            </>
          )}
          {type === 'ANNUAL_RETURN' && (
            <>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Financial Year</label><input className={fieldClass} value={formData.financialYear||''} onChange={e=>handleChange('financialYear', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Status</label><select className={fieldClass} value={formData.filingStatus||'PENDING'} onChange={e=>handleChange('filingStatus', e.target.value)}><option value="FILED">Filed</option><option value="PENDING">Pending</option><option value="OVERDUE">Overdue</option></select></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Due Date</label><input type="date" className={fieldClass} value={formData.dueDate||''} onChange={e=>handleChange('dueDate', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Filed Date</label><input type="date" className={fieldClass} value={formData.filedDate||''} onChange={e=>handleChange('filedDate', e.target.value)}/></div>
            </>
          )}
          {type === 'RJSC_FILING' && (
            <>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Service Type</label><input className={fieldClass} value={formData.serviceType||''} onChange={e=>handleChange('serviceType', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Form Name</label><input className={fieldClass} value={formData.formName||''} onChange={e=>handleChange('formName', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Status</label><select className={fieldClass} value={formData.status||'SUBMITTED'} onChange={e=>handleChange('status', e.target.value)}><option value="SUBMITTED">Submitted</option><option value="APPROVED">Approved</option><option value="PENDING">Pending</option><option value="REJECTED">Rejected</option></select></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Submission Date</label><input type="date" className={fieldClass} value={formData.submissionDate||''} onChange={e=>handleChange('submissionDate', e.target.value)}/></div>
            </>
          )}
          {type === 'MORTGAGE' && (
            <>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Lender</label><input className={fieldClass} value={formData.lender||''} onChange={e=>handleChange('lender', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Secured Amount</label><input type="number" className={fieldClass} value={formData.securedAmount||''} onChange={e=>handleChange('securedAmount', Number(e.target.value))}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Status</label><select className={fieldClass} value={formData.status||'ACTIVE'} onChange={e=>handleChange('status', e.target.value)}><option value="ACTIVE">Active</option><option value="SATISFIED">Satisfied</option></select></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Creation Date</label><input type="date" className={fieldClass} value={formData.creationDate||''} onChange={e=>handleChange('creationDate', e.target.value)}/></div>
            </>
          )}
          {type === 'COMPLIANCE_ISSUE' && (
            <>
              <div className="col-span-2"><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Title</label><input className={fieldClass} value={formData.title||''} onChange={e=>handleChange('title', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Status</label><select className={fieldClass} value={formData.status||'OPEN'} onChange={e=>handleChange('status', e.target.value)}><option value="OPEN">Open</option><option value="RESOLVED">Resolved</option></select></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Due Date</label><input type="date" className={fieldClass} value={formData.dueDate||''} onChange={e=>handleChange('dueDate', e.target.value)}/></div>
              <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Identified Date</label><input type="date" className={fieldClass} value={formData.identifiedDate||''} onChange={e=>handleChange('identifiedDate', e.target.value)}/></div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Source Document</label><input className={fieldClass} value={formData.sourceDocument||''} onChange={e=>handleChange('sourceDocument', e.target.value)}/></div>
          <div><label className="text-xs font-bold uppercase tracking-wide text-slate-600 block mb-1">Notes</label><input className={fieldClass} value={formData.notes||''} onChange={e=>handleChange('notes', e.target.value)}/></div>
        </div>

        {saveError && <p role="alert" className="text-sm font-semibold text-red-600">{saveError}</p>}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave}>{saving ? "Saving..." : "Save Record"}</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
