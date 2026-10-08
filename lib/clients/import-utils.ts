import * as XLSX from 'xlsx';
import { EntityType } from '../rjsc/types';
import { Client } from './types';
import { clientStore } from './client-store';

export type ValidationStatus = 'Valid' | 'Warning' | 'Error';
export type DuplicateStatus = 'None' | 'Possible Duplicate' | 'Existing Client' | 'Duplicate in File';

export interface ParsedRow {
  _index: number;
  [key: string]: any;
}

export interface CanonicalRow {
  _index: number;
  client_name: string;
  entity_type: string;
  registration_no: string;
  incorporation_date: string;
  former_name: string;
  tin: string;
  bin: string;
  registered_office: string;
  contact_person: string;
  mobile: string;
  email: string;
  assigned_staff: string;
  status: string;
  notes: string;
}

export interface ValidatedRow extends CanonicalRow {
  validationStatus: ValidationStatus;
  validationErrors: string[];
  duplicateStatus: DuplicateStatus;
  duplicateReference?: string;
  parsedEntityType?: EntityType;
}

export const CANONICAL_FIELDS = [
  'client_name', 'entity_type', 'registration_no', 'incorporation_date', 
  'former_name', 'tin', 'bin', 'registered_office', 'contact_person', 
  'mobile', 'email', 'assigned_staff', 'status', 'notes'
];

export async function parseFile(file: File): Promise<ParsedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet) as any[];
        resolve(json.map((row, i) => ({ ...row, _index: i + 1 })));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function normalizeStatus(status?: string): string {
  if (!status) return 'Active';
  const s = status.toLowerCase().trim();
  if (['active', 'live', 'running'].includes(s)) return 'Active';
  if (['inactive', 'closed', 'wound up'].includes(s)) return 'Inactive';
  if (['pending', 'on hold'].includes(s)) return 'Pending';
  // Default fallback
  return status.trim() || 'Active';
}

function mapToEntityType(type?: string): EntityType | undefined {
  if (!type) return undefined;
  const t = type.toLowerCase().trim();
  if (t.includes('private') || t === 'pvt ltd' || t === 'pvt') return EntityType.PRIVATE_COMPANY;
  if (t.includes('public') || t === 'plc') return EntityType.PUBLIC_COMPANY;
  if (t.includes('foreign')) return EntityType.FOREIGN_COMPANY;
  if (t.includes('society')) return EntityType.SOCIETY;
  if (t.includes('partner')) return EntityType.PARTNERSHIP;
  if (t.includes('trade')) return EntityType.TRADE_ORGANIZATION;
  
  // Try exact match
  const val = Object.values(EntityType).find(e => e.toLowerCase() === t.replace(/ /g, '_'));
  if (val) return val as EntityType;
  return undefined;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidDate(dateStr: string) {
  if (!dateStr) return true; // optional
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

export function validateRows(rows: CanonicalRow[], existingClients: Client[]): ValidatedRow[] {
  const result: ValidatedRow[] = [];
  const fileRegNos = new Map<string, number>();
  const fileNameMap = new Map<string, number>();

  for (const row of rows) {
    const v: ValidatedRow = { 
      ...row, 
      validationStatus: 'Valid', 
      validationErrors: [], 
      duplicateStatus: 'None' 
    };

    // 1. Validation
    if (!v.client_name?.trim()) {
      v.validationStatus = 'Error';
      v.validationErrors.push('Client Name is required.');
    }

    const eType = mapToEntityType(v.entity_type);
    if (!eType) {
      v.validationStatus = 'Error';
      v.validationErrors.push(`Invalid Entity Type: ${v.entity_type}`);
    } else {
      v.parsedEntityType = eType;
    }

    if (v.email && v.email.trim() && !isValidEmail(v.email.trim())) {
      v.validationStatus = 'Error';
      v.validationErrors.push('Invalid email format.');
    }

    if (v.incorporation_date && v.incorporation_date.trim() && !isValidDate(v.incorporation_date.trim())) {
      v.validationStatus = 'Error';
      v.validationErrors.push('Unparseable date.');
    }

    v.status = normalizeStatus(v.status);

    // 2. Duplicate Detection inside file
    const regNo = (v.registration_no || '').trim().toLowerCase();
    const normalizedName = (v.client_name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    if (regNo) {
      if (fileRegNos.has(regNo)) {
        v.duplicateStatus = 'Duplicate in File';
        v.duplicateReference = `Row ${fileRegNos.get(regNo)}`;
        if (v.validationStatus !== 'Error') v.validationStatus = 'Warning';
      } else {
        fileRegNos.set(regNo, v._index);
      }
    }

    if (v.duplicateStatus === 'None' && normalizedName) {
       if (fileNameMap.has(normalizedName)) {
         v.duplicateStatus = 'Duplicate in File';
         v.duplicateReference = `Row ${fileNameMap.get(normalizedName)}`;
         if (v.validationStatus !== 'Error') v.validationStatus = 'Warning';
       } else {
         fileNameMap.set(normalizedName, v._index);
       }
    }

    // 3. Duplicate Detection against existing clients
    if (v.duplicateStatus === 'None') {
      const existingByReg = regNo ? existingClients.find(c => (c.regNo || '').trim().toLowerCase() === regNo) : null;
      if (existingByReg) {
        v.duplicateStatus = 'Existing Client';
        v.duplicateReference = existingByReg.id;
        if (v.validationStatus !== 'Error') v.validationStatus = 'Warning';
      } else if (normalizedName) {
        const existingByName = existingClients.find(c => c.name.trim().toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName);
        if (existingByName) {
          v.duplicateStatus = 'Possible Duplicate';
          v.duplicateReference = existingByName.id;
          if (v.validationStatus !== 'Error') v.validationStatus = 'Warning';
        }
      }
    }

    result.push(v);
  }
  return result;
}
