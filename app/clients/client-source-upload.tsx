"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileImage, FileText, Upload } from "lucide-react";
import { EntityType } from "@/lib/rjsc/types";
import { createClient, addClientHistory } from "@/lib/api/clients";
import { uploadDocument } from "@/lib/api/documents";
import { fieldClass, PrimaryButton } from "@/components/UI";
import { fetchApi } from "@/lib/api/fetchApi";

const MAX_SIZE = 20 * 1024 * 1024;
const accepted = new Set(["application/pdf", "image/jpeg", "image/png"]);

type Props = {
  existingClients: any[];
  onClose: () => void;
  onSuccess: () => void;
};

const normalize = (text: string) => text.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export default function ClientSourceUpload({ existingClients, onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [name, setName] = useState("");
  const [regNo, setRegNo] = useState("");
  const [entityType, setEntityType] = useState<EntityType>(EntityType.PRIVATE_COMPANY);
  const [incorporationDate, setIncorporationDate] = useState("");
  const [registeredOffice, setRegisteredOffice] = useState("");
  const [authCapital, setAuthCapital] = useState<number | string>("");
  const [paidCapital, setPaidCapital] = useState<number | string>("");
  const [extractedDirectors, setExtractedDirectors] = useState<any[]>([]);
  const [category, setCategory] = useState("INCORPORATION");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdClientId, setCreatedClientId] = useState("");
  const [fileSaved, setFileSaved] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractionMessage, setExtractionMessage] = useState("");
  const [extractedFields, setExtractedFields] = useState<string[]>([]);


  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const duplicate = useMemo(() => {
    const registered = regNo.trim().toLowerCase();
    const normalizedName = normalize(name);
    return existingClients.find(c =>
      (registered && String(c.registration_no || "").trim().toLowerCase() === registered) ||
      (normalizedName && normalize(String(c.legal_name || "")) === normalizedName)
    );
  }, [existingClients, regNo, name]);

  const extractFromFile = async (selected: File) => {
    setExtracting(true);
    setExtractionMessage("Reading document and suggesting client details...");
    setExtractedFields([]);
    try {
      const data = new FormData();
      data.append("file", selected);
      const response = await fetchApi("/api/client-intake/extract-client", {
        method: "POST", body: data,
      });
      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(typeof failure.detail === "string" ? failure.detail : "Unable to extract details");
      }
      const result = await response.json();
      const fields = result.fields || {};
      const found: string[] = [];
      if (typeof fields.legal_name === "string" && fields.legal_name.trim()) {
        setName(fields.legal_name.trim()); found.push("Company Name");
      }
      if (typeof fields.registration_no === "string" && fields.registration_no.trim()) {
        setRegNo(fields.registration_no.trim()); found.push("Registration No.");
      }
      if (typeof fields.incorporation_date === "string" && fields.incorporation_date.trim()) {
        setIncorporationDate(fields.incorporation_date.trim()); found.push("Incorporation Date");
      }
      if (fields.entity_type) {
        setEntityType(fields.entity_type as EntityType); found.push("Entity Type");
      }
      if (fields.registered_office) {
        setRegisteredOffice(fields.registered_office); found.push("Registered Office");
      }
      if (fields.authorized_capital) {
        setAuthCapital(fields.authorized_capital); found.push("Authorized Capital");
      }
      if (fields.paid_up_capital) {
        setPaidCapital(fields.paid_up_capital); found.push("Paid-up Capital");
      }
      if (fields.directors && fields.directors.length > 0) {
        setExtractedDirectors(fields.directors); found.push(`${fields.directors.length} Director(s)`);
      }
      setExtractedFields(found);
      setExtractionMessage(
        found.length
          ? `Auto-extracted fields: ${found.join(", ")}. Please review every value against the document before confirming.`
          : (result.message || "No fields extracted. Enter missing details manually.")
      );
    } catch (err: unknown) {
      setExtractionMessage(
        `Auto-extraction unavailable: ${err instanceof Error ? err.message : "Unknown error"}. You may fill the fields manually.`
      );
    } finally {
      setExtracting(false);
    }
  };

  const selectFile = (selected?: File) => {
    setError("");
    setFileError("");
    setConfirmed(false);
    setFile(null);
    setExtractedFields([]);
    setExtractionMessage("");
    setName(""); setRegNo(""); setIncorporationDate("");
    if (!selected) return;
    const ext = selected.name.toLowerCase().split(".").pop();
    if (!accepted.has(selected.type) || !["pdf", "jpg", "jpeg", "png"].includes(ext || "")) {
      setFileError("Please select a PDF, JPG or PNG file.");
      return;
    }
    if (!selected.size || selected.size > MAX_SIZE) {
      setFileError("File must be non-empty and 20 MB or smaller.");
      return;
    }
    setFile(selected);
    void extractFromFile(selected);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || extracting || createdClientId || !file || !confirmed || duplicate || !name.trim()) return;
    const capitalProvided = authCapital !== "" || paidCapital !== "";
    if (capitalProvided && (
      !incorporationDate ||
      authCapital === "" || paidCapital === "" ||
      !Number.isFinite(Number(authCapital)) ||
      !Number.isFinite(Number(paidCapital)) ||
      Number(authCapital) <= 0 || Number(paidCapital) < 0 ||
      Number(paidCapital) > Number(authCapital)
    )) {
      setError("Provide valid authorized and paid-up capital (paid-up ≤ authorized) and verified incorporation date before saving capital history.");
      return;
    }
    setError("");
    setSaving(true);
    let newClient: any;
    try {
      // The document is evidence, not a trusted automated source of company facts.
      newClient = await createClient({
        legal_name: name.trim(),
        entity_type: entityType,
        registration_no: regNo.trim() || undefined,
        incorporation_date: incorporationDate || undefined,
        registered_office_text: registeredOffice.trim() || undefined,
        status: "ACTIVE",
      });
      setCreatedClientId(newClient.id);
      if (capitalProvided) {
        await addClientHistory(newClient.id, "capital-history", {
          authorized_capital: Number(authCapital),
          paid_up_capital: Number(paidCapital),
          effective_date: incorporationDate,
          change_type: "INITIAL",
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not create client.");
      setSaving(false);
      return;
    }
    try {
      await uploadDocument(file, category, newClient.id, undefined, undefined,
        `Client onboarding source: ${notes.trim() || "Original document uploaded by staff. Details manually reviewed."}`);
      setFileSaved(true);
      onSuccess();
    } catch (err: unknown) {
      setError(`Client created, but the source document was NOT uploaded: ${err instanceof Error ? err.message : "Unknown error"}. Open the client profile to upload it. Do not create the client again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="rounded-xl border border-[#d9e3df] bg-[#eef7f3] p-4 text-sm text-[#315f55]">
        Upload a Form XII PDF or screenshot. The system will suggest company details automatically;
        check and correct every suggested field before confirming. Nothing is saved until you approve.
      </div>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#b8dfc6] bg-[#fffdf7] px-4 py-7 text-center">
        <Upload className="h-8 w-8 text-[#447a5d]" />
        <span className="text-sm font-bold">Select PDF or Screenshot</span>
        <span className="text-xs text-[#6c7671]">PDF, JPG, JPEG, PNG · Maximum 20 MB</span>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="sr-only"
          disabled={Boolean(createdClientId)} onChange={e => selectFile(e.target.files?.[0])} />
      </label>
      {fileError && <p role="alert" className="text-sm text-red-700">{fileError}</p>}
      {file && (extracting || extractionMessage) && (
        <p role="status" className="rounded-lg bg-[#eef7f3] p-3 text-sm text-[#315f55]">
          {extracting ? "Reading uploaded document..." : extractionMessage}
          {!extracting && extractedFields.length > 0 && <span className="mt-1 block text-xs font-bold">Auto-filled: {extractedFields.join(", ")}</span>}
        </p>
      )}
      {file && previewUrl && (
        <div className="space-y-2 rounded-xl border border-[#ece5d9] p-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#22342d]">
            {file.type === "application/pdf" ? <FileText size={18} /> : <FileImage size={18} />}
            <span className="break-all">{file.name}</span>
          </div>
          {file.type === "application/pdf"
            ? <iframe title="PDF source preview" src={previewUrl} className="h-72 w-full rounded-lg border bg-white" />
            : <img alt="Uploaded screenshot preview" src={previewUrl} className="mx-auto max-h-72 max-w-full rounded-lg object-contain" />}
          <p className="text-xs text-[#6c7671]">Preview is local to your browser until submission.</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Company Legal Name *
          <input required className={fieldClass} value={name} disabled={Boolean(createdClientId)} onChange={e => { setName(e.target.value); setConfirmed(false); }} />
        </label>
        <label className="text-sm font-bold">Registration No.
          <input className={fieldClass} value={regNo} disabled={Boolean(createdClientId)} onChange={e => { setRegNo(e.target.value); setConfirmed(false); }} />
        </label>
        <label className="text-sm font-bold">Entity Type *
          <select className={fieldClass} value={entityType} disabled={Boolean(createdClientId)} onChange={e => setEntityType(e.target.value as EntityType)}>
            {Object.values(EntityType).map(t => <option key={t} value={t}>{t.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label className="text-sm font-bold">Incorporation Date (if on source)
          <input type="date" className={fieldClass} value={incorporationDate} disabled={Boolean(createdClientId)} onChange={e => setIncorporationDate(e.target.value)} />
        </label>
        <label className="text-sm font-bold">Document Category
          <select className={fieldClass} value={category} disabled={Boolean(createdClientId)} onChange={e => setCategory(e.target.value)}>
            <option value="INCORPORATION">Certificate of Incorporation</option>
            <option value="CERTIFIED_COPY">RJSC Certified Copy</option>
            <option value="FORM_XII">Form XII — Directors</option>
            <option value="SCHEDULE_X">Schedule X — Annual Return</option>
            <option value="OTHER">Other Source / Screenshot</option>
          </select>
        </label>
        <label className="text-sm font-bold">Registered Office (if detected)
          <input className={fieldClass} value={registeredOffice} disabled={Boolean(createdClientId)} onChange={e => setRegisteredOffice(e.target.value)} placeholder="Office Address from PDF" />
        </label>
        <label className="text-sm font-bold">Authorized Capital (BDT)
          <input type="number" className={fieldClass} value={authCapital} disabled={Boolean(createdClientId)} onChange={e => setAuthCapital(e.target.value)} placeholder="e.g. 10000000" />
        </label>
        <label className="text-sm font-bold">Paid-up Capital (BDT)
          <input type="number" className={fieldClass} value={paidCapital} disabled={Boolean(createdClientId)} onChange={e => setPaidCapital(e.target.value)} placeholder="e.g. 5000000" />
        </label>
        <label className="text-sm font-bold sm:col-span-2">Source Notes (optional)
          <input className={fieldClass} value={notes} disabled={Boolean(createdClientId)} onChange={e => setNotes(e.target.value)} placeholder="Origin of screenshot / PDF" />
        </label>
      </div>
      {extractedDirectors.length > 0 && (
        <div className="rounded-xl border border-[#b8dfc6] bg-[#e7f5ec] p-3 text-xs">
          <span className="font-bold text-[#234a32]">Detected Directors ({extractedDirectors.length}): </span>
          {extractedDirectors.map((d: any) => d.full_name).join(", ")}
          <span className="ml-1 text-[#44765b]">(Review and record under Corporate History after client creation)</span>
        </div>
      )}

      {duplicate && !createdClientId && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mr-2 inline h-4 w-4" />
          A similar client already exists: <strong>{duplicate.legal_name}</strong>.
          Open the existing client instead of creating a duplicate.
          {duplicate.id && <Link href={`/clients/${duplicate.id}`} className="ml-2 font-bold underline">View existing client</Link>}
        </div>
      )}
      {!createdClientId && (
        <label className="flex items-start gap-2 text-sm text-[#4b4d47]">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
          I checked the PDF/screenshot myself and confirmed the entered client details.
        </label>
      )}
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
      {createdClientId && (
        <div className="rounded-lg bg-[#e7f5ec] p-3 text-sm text-[#315f55]">
          Client created. {fileSaved ? "Source document attached." : "Source attachment needs attention."}
          <Link className="ml-2 font-bold underline" href={`/clients/${createdClientId}`}>Open Client Profile</Link>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Close</button>
        {!createdClientId && <PrimaryButton disabled={saving || extracting || !file || !confirmed || Boolean(duplicate) || !name.trim()}>
          {saving ? "Creating & Uploading..." : extracting ? "Extracting..." : "Confirm, Create Client & Attach Document"}
        </PrimaryButton>}
      </div>
    </form>
  );
}
