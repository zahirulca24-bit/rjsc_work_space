"use client";

import { useState } from "react";
import { Modal, PrimaryButton, SecondaryButton, fieldClass } from "@/components/UI";
import { X, Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react";
import { EntityType } from "@/lib/rjsc/types";
import { CANONICAL_FIELDS, parseFile, ParsedRow, CanonicalRow, validateRows, ValidatedRow } from "@/lib/clients/import-utils";
import { createClient, bulkImportClients } from "@/lib/api/clients";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingClients: any[];
}

export function AddClientModal({ isOpen, onClose, onSuccess, existingClients }: Props) {
  const [mode, setMode] = useState<'manual' | 'import'>('manual');

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Client" size={mode === 'import' ? 'xl' : 'lg'}>
      <div className="flex gap-4 border-b border-slate-200 px-6 py-3">
        <button
          className={`text-sm font-semibold pb-3 border-b-2 -mb-[13px] ${mode === 'manual' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setMode('manual')}
        >
          Manual Entry
        </button>
        <button
          className={`text-sm font-semibold pb-3 border-b-2 -mb-[13px] ${mode === 'import' ? 'border-emerald-600 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setMode('import')}
        >
          Bulk Import
        </button>
      </div>

      <div className="px-6 py-6">
        {mode === 'manual' ? (
          <ManualEntryForm onClose={onClose} onSuccess={onSuccess} />
        ) : (
          <ImportFlow onClose={onClose} onSuccess={onSuccess} existingClients={existingClients} />
        )}
      </div>
    </Modal>
  );
}

function ManualEntryForm({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    legal_name: "",
    entity_type: EntityType.PRIVATE_COMPANY,
    registration_no: "",
    status: "Active"
  });
  const [error, setError] = useState<string|null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createClient(formData);
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600 bg-red-50 p-3 rounded">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Legal Name *</label>
        <input
          type="text"
          required
          value={formData.legal_name}
          onChange={e => setFormData({...formData, legal_name: e.target.value})}
          className={fieldClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Entity Type *</label>
          <select
            value={formData.entity_type}
            onChange={e => setFormData({...formData, entity_type: e.target.value as EntityType})}
            className={fieldClass}
          >
            {Object.values(EntityType).map(t => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Registration No.</label>
          <input
            type="text"
            value={formData.registration_no}
            onChange={e => setFormData({...formData, registration_no: e.target.value})}
            className={fieldClass}
          />
        </div>
      </div>

      <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
        <SecondaryButton  onClick={onClose}>Cancel</SecondaryButton>
        <PrimaryButton >Create Client</PrimaryButton>
      </div>
    </form>
  );
}

function ImportFlow({ onClose, onSuccess, existingClients }: { onClose: () => void, onSuccess: () => void, existingClients: any[] }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{created: number, conflicts: number, errors: number}|null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const f = e.target.files[0];
    setFile(f);
    try {
      const data = await parseFile(f);
      setParsed(data);
      const headers = Object.keys(data[0] || {}).filter(k => k !== '_index');

      const initialMap: Record<string, string> = {};
      CANONICAL_FIELDS.forEach(cf => {
        const match = headers.find(h => h.toLowerCase().replace(/[^a-z]/g, '') === cf.toLowerCase().replace(/[^a-z]/g, ''));
        if (match) initialMap[cf] = match;
      });
      setMapping(initialMap);
      setStep(2);
    } catch (err) {
      alert("Failed to parse file.");
    }
  };

  const proceedToValidate = () => {
    const canonicals: CanonicalRow[] = parsed.map(p => {
      const row: any = { _index: p._index };
      CANONICAL_FIELDS.forEach(cf => {
        const sourceCol = mapping[cf];
        row[cf] = sourceCol ? p[sourceCol]?.toString() : '';
      });
      return row;
    });

    // We map existingClients to what validateRows expects: { id, name, regNo }
    const adaptedExisting = existingClients.map(c => ({
      id: c.client_code,
      name: c.legal_name,
      regNo: c.registration_no || ''
    }));

    const v = validateRows(canonicals, adaptedExisting as any);
    setValidated(v);
    setStep(3);
  };

  const confirmImport = async () => {
    const validRows = validated.filter(r => r.validationStatus !== 'Error');
    if (!validRows.length) return;

    setImporting(true);
    const payloads = validRows.map(r => ({
      legal_name: r.client_name,
      entity_type: r.parsedEntityType || EntityType.PRIVATE_COMPANY,
      registration_no: r.registration_no || undefined,
      incorporation_date: r.incorporation_date || undefined,
      status: r.status,
      former_name: r.former_name || undefined,
      tin: r.tin || undefined,
      bin: r.bin || undefined,
      registered_office_text: r.registered_office || undefined,
      contact_person: r.contact_person || undefined,
      mobile: r.mobile || undefined,
      email: r.email || undefined,
      assigned_staff: r.assigned_staff || undefined,
      notes: r.notes || undefined
    }));

    const res = await bulkImportClients(payloads);
    setResult(res);
    setImporting(false);
    setStep(4);
  };

  if (step === 1) {
    return (
      <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
        <input type="file" accept=".xlsx,.csv" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
        <Upload className="w-10 h-10 text-emerald-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-900">Upload Data File</h3>
        <p className="text-sm text-slate-500 mt-1">Excel (.xlsx) or CSV</p>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-lg">
          <FileText className="w-5 h-5 text-emerald-600" />
          <span className="font-medium text-emerald-900">{file?.name}</span>
          <span className="text-emerald-700 text-sm ml-auto">{parsed.length} rows</span>
        </div>

        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600 w-1/2">Required Field</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600 w-1/2">Map to Column</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CANONICAL_FIELDS.map(cf => (
                <tr key={cf}>
                  <td className="px-4 py-3 text-slate-700">
                    {cf.replace(/_/g, ' ').replace(/\w/g, l => l.toUpperCase())}
                    {['client_name', 'entity_type'].includes(cf) && <span className="text-red-500 ml-1">*</span>}
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={mapping[cf] || ''}
                      onChange={e => setMapping({...mapping, [cf]: e.target.value})}
                      className={fieldClass}
                    >
                      <option value="">-- Ignore --</option>
                      {Object.keys(parsed[0] || {}).filter(k => k !== '_index').map(k => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pt-4 flex justify-end gap-3">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={proceedToValidate}>Validate Data</PrimaryButton>
        </div>
      </div>
    );
  }

  if (step === 3) {
    const valid = validated.filter(v => v.validationStatus !== 'Error').length;
    const errors = validated.filter(v => v.validationStatus === 'Error').length;
    const warnings = validated.filter(v => v.validationStatus === 'Warning').length;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex flex-col items-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mb-1" />
            <div className="text-2xl font-bold text-emerald-700">{valid}</div>
            <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Ready</div>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 flex flex-col items-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 mb-1" />
            <div className="text-2xl font-bold text-amber-700">{warnings}</div>
            <div className="text-xs font-medium text-amber-600 uppercase tracking-wider">Warnings</div>
          </div>
          <div className="bg-rose-50 border border-rose-100 rounded-lg p-4 flex flex-col items-center">
            <XCircle className="w-6 h-6 text-rose-600 mb-1" />
            <div className="text-2xl font-bold text-rose-700">{errors}</div>
            <div className="text-xs font-medium text-rose-600 uppercase tracking-wider">Errors</div>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto border border-slate-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 sticky top-0 shadow-sm">
              <tr>
                <th className="px-4 py-2">Row</th>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {validated.map(v => (
                <tr key={v._index}>
                  <td className="px-4 py-2">{v._index}</td>
                  <td className="px-4 py-2 font-medium">{v.client_name || '-'}</td>
                  <td className="px-4 py-2">
                    {v.validationStatus === 'Error' ? (
                      <span className="text-rose-600 font-medium flex items-center gap-1"><XCircle className="w-3 h-3"/> Error</span>
                    ) : v.validationStatus === 'Warning' ? (
                      <span className="text-amber-600 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Warning</span>
                    ) : (
                      <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Valid</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600 text-xs max-w-xs truncate">
                    {v.validationErrors.join(', ')}
                    {v.duplicateStatus !== 'None' && ` (${v.duplicateStatus}: ${v.duplicateReference})`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <SecondaryButton onClick={() => setStep(1)}>Start Over</SecondaryButton>
          <PrimaryButton onClick={confirmImport} disabled={importing || valid === 0}>
            {importing ? "Importing..." : `Import ${valid} Rows`}
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-2">Import Complete</h3>
      <p className="text-slate-600 mb-6">
        Successfully created {result?.created} clients.
      </p>
      {((result?.conflicts || 0) > 0 || (result?.errors || 0) > 0) && (
        <div className="bg-rose-50 text-rose-700 p-3 rounded text-sm mb-6 inline-block">
          {result?.conflicts} duplicates skipped, {result?.errors} errors encountered.
        </div>
      )}
      <PrimaryButton onClick={onSuccess}>View Clients</PrimaryButton>
    </div>
  );
}
