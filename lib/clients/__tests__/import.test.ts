import test from 'node:test';
import assert from 'node:assert';
import { validateRows, CanonicalRow } from '../import-utils';
import { clientStore } from '../client-store';
import { EntityType } from '../../rjsc/types';
import { Client } from '../types';

test('valid manual client normalization & sequential client ID generation', () => {
  // We can test clientStore adding and ID generation
  const id1 = clientStore.generateNextId();
  assert.match(id1, /^RJSC-\d{4}$/);
  
  clientStore.addClient({
    id: id1,
    name: "Test Client",
    type: EntityType.PRIVATE_COMPANY,
    regNo: "C-111",
    incorporationDate: "2020-01-01",
    status: "Active",
    formerName: "", tin: "", bin: "", registeredOffice: "", contactPerson: "", mobile: "", email: "", assigned: "", notes: ""
  });
  
  const id2 = clientStore.generateNextId();
  assert.notStrictEqual(id1, id2);
});

test('generateNextId uses highest ID + 1', () => {
  clientStore.addClient({
    id: 'RJSC-0999',
    name: "Jump Client",
    type: EntityType.PRIVATE_COMPANY,
    regNo: "C-999",
    incorporationDate: "",
    status: "Active",
    formerName: "", tin: "", bin: "", registeredOffice: "", contactPerson: "", mobile: "", email: "", assigned: "", notes: ""
  });
  const nextId = clientStore.generateNextId();
  assert.strictEqual(nextId, 'RJSC-1000');
});

test('invalid entity type rejection', () => {
  const rows: CanonicalRow[] = [{
    _index: 1, client_name: "Test", entity_type: "Unknown Type", registration_no: "", incorporation_date: "",
    former_name: "", tin: "", bin: "", registered_office: "", contact_person: "", mobile: "", email: "", assigned_staff: "", status: "", notes: ""
  }];
  const res = validateRows(rows, []);
  assert.strictEqual(res[0].validationStatus, 'Error');
  assert.ok(res[0].validationErrors.some(e => e.includes('Entity Type')));
});

test('invalid email rejection', () => {
  const rows: CanonicalRow[] = [{
    _index: 1, client_name: "Test", entity_type: "Private Company", registration_no: "", incorporation_date: "",
    former_name: "", tin: "", bin: "", registered_office: "", contact_person: "", mobile: "", email: "bad-email", assigned_staff: "", status: "", notes: ""
  }];
  const res = validateRows(rows, []);
  assert.strictEqual(res[0].validationStatus, 'Error');
  assert.ok(res[0].validationErrors.some(e => e.includes('email')));
});

test('date validation', () => {
  const rows: CanonicalRow[] = [{
    _index: 1, client_name: "Test", entity_type: "Private Company", registration_no: "", incorporation_date: "not-a-date",
    former_name: "", tin: "", bin: "", registered_office: "", contact_person: "", mobile: "", email: "", assigned_staff: "", status: "", notes: ""
  }];
  const res = validateRows(rows, []);
  assert.strictEqual(res[0].validationStatus, 'Error');
  assert.ok(res[0].validationErrors.some(e => e.includes('date')));
});

test('duplicate by registration number', () => {
  const existing: Client[] = [{
    id: 'RJSC-9999', name: 'Existing', regNo: 'C-999', type: EntityType.PRIVATE_COMPANY,
    incorporationDate: '', status: '', formerName: '', tin: '', bin: '', registeredOffice: '',
    contactPerson: '', mobile: '', email: '', assigned: '', notes: '', openWorks: 0, totalBill: 0, due: 0
  }];
  const rows: CanonicalRow[] = [{
    _index: 1, client_name: "Test", entity_type: "Private Company", registration_no: "c-999", incorporation_date: "",
    former_name: "", tin: "", bin: "", registered_office: "", contact_person: "", mobile: "", email: "", assigned_staff: "", status: "", notes: ""
  }];
  const res = validateRows(rows, existing);
  assert.strictEqual(res[0].duplicateStatus, 'Existing Client');
});

test('duplicate by normalized client name', () => {
  const existing: Client[] = [{
    id: 'RJSC-9998', name: 'Existing Ltd.', regNo: '', type: EntityType.PRIVATE_COMPANY,
    incorporationDate: '', status: '', formerName: '', tin: '', bin: '', registeredOffice: '',
    contactPerson: '', mobile: '', email: '', assigned: '', notes: '', openWorks: 0, totalBill: 0, due: 0
  }];
  const rows: CanonicalRow[] = [{
    _index: 1, client_name: "EXISTING LTD", entity_type: "Private Company", registration_no: "", incorporation_date: "",
    former_name: "", tin: "", bin: "", registered_office: "", contact_person: "", mobile: "", email: "", assigned_staff: "", status: "", notes: ""
  }];
  const res = validateRows(rows, existing);
  assert.strictEqual(res[0].duplicateStatus, 'Possible Duplicate');
});

test('duplicate inside import file', () => {
  const rows: CanonicalRow[] = [
    {
      _index: 1, client_name: "Dup", entity_type: "Private Company", registration_no: "C-123", incorporation_date: "",
      former_name: "", tin: "", bin: "", registered_office: "", contact_person: "", mobile: "", email: "", assigned_staff: "", status: "", notes: ""
    },
    {
      _index: 2, client_name: "Dup", entity_type: "Private Company", registration_no: "C-123", incorporation_date: "",
      former_name: "", tin: "", bin: "", registered_office: "", contact_person: "", mobile: "", email: "", assigned_staff: "", status: "", notes: ""
    }
  ];
  const res = validateRows(rows, []);
  assert.strictEqual(res[0].duplicateStatus, 'None');
  assert.strictEqual(res[1].duplicateStatus, 'Duplicate in File');
});

test('valid row imported (validation simulation)', () => {
  const rows: CanonicalRow[] = [{
    _index: 1, client_name: "Good Client", entity_type: "Private Company", registration_no: "C-000", incorporation_date: "2020-01-01",
    former_name: "", tin: "", bin: "", registered_office: "", contact_person: "", mobile: "", email: "test@example.com", assigned_staff: "", status: "Active", notes: ""
  }];
  const res = validateRows(rows, []);
  assert.strictEqual(res[0].validationStatus, 'Valid');
  assert.strictEqual(res[0].duplicateStatus, 'None');
});
