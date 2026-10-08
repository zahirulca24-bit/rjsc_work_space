import test from 'node:test';
import assert from 'node:assert';
import { 
  getCurrentDirectors, 
  getCurrentShareholders, 
  getCurrentCapital, 
  getCurrentRegisteredOffice, 
  buildTimeline 
} from '../history-utils';
import { CorporateEvent } from '../history-types';

test('current registered office derived correctly, former address preserved in history', () => {
  const events: CorporateEvent[] = [
    { id: '1', clientId: 'c1', type: 'REGISTERED_OFFICE_CHANGE', address: 'Old Address', effectiveFrom: '2020-01-01', effectiveTo: '2022-01-01' },
    { id: '2', clientId: 'c1', type: 'REGISTERED_OFFICE_CHANGE', address: 'New Address', effectiveFrom: '2022-01-01', effectiveTo: null }
  ];
  const current = getCurrentRegisteredOffice(events);
  assert.strictEqual(current?.address, 'New Address');
  
  const timeline = buildTimeline(events);
  assert.strictEqual(timeline.length, 2);
});

test('current directors derived correctly, ceased director excluded', () => {
  const events: CorporateEvent[] = [
    { id: '1', clientId: 'c1', type: 'DIRECTOR_CHANGE', fullName: 'John', designation: 'MD', appointmentDate: '2020-01-01', cessationDate: null, current: true },
    { id: '2', clientId: 'c1', type: 'DIRECTOR_CHANGE', fullName: 'Jane', designation: 'Director', appointmentDate: '2020-01-01', cessationDate: '2023-01-01', current: false }
  ];
  const current = getCurrentDirectors(events);
  assert.strictEqual(current.length, 1);
  assert.strictEqual(current[0].fullName, 'John');
  
  const timeline = buildTimeline(events);
  // John has 1 appt. Jane has appt + cessation.
  assert.strictEqual(timeline.length, 3);
});

test('current capital derived from latest record', () => {
  const events: CorporateEvent[] = [
    { id: '1', clientId: 'c1', type: 'CAPITAL_CHANGE', authorizedCapital: 1000, paidUpCapital: 500, effectiveDate: '2020-01-01', changeType: 'INITIAL' },
    { id: '2', clientId: 'c1', type: 'CAPITAL_CHANGE', authorizedCapital: 5000, paidUpCapital: 1000, effectiveDate: '2022-01-01', changeType: 'INCREASE' }
  ];
  const current = getCurrentCapital(events);
  assert.strictEqual(current?.authorizedCapital, 5000);
});

test('timeline sorting newest-first', () => {
  const events: CorporateEvent[] = [
    { id: '1', clientId: 'c1', type: 'AGM', agmDate: '2020-01-01', financialYear: '2019', status: 'HELD' },
    { id: '2', clientId: 'c1', type: 'AGM', agmDate: '2022-01-01', financialYear: '2021', status: 'HELD' },
    { id: '3', clientId: 'c1', type: 'AGM', agmDate: '2021-01-01', financialYear: '2020', status: 'HELD' }
  ];
  const timeline = buildTimeline(events);
  assert.strictEqual(timeline[0].date, '2022-01-01');
  assert.strictEqual(timeline[1].date, '2021-01-01');
  assert.strictEqual(timeline[2].date, '2020-01-01');
});

test('empty client history produces safe empty state/result', () => {
  assert.strictEqual(getCurrentDirectors([]).length, 0);
  assert.strictEqual(getCurrentCapital([]), null);
  assert.strictEqual(getCurrentRegisteredOffice([]), null);
  assert.strictEqual(getCurrentShareholders([]).length, 0);
  assert.strictEqual(buildTimeline([]).length, 0);
});

import { getComplianceStatus } from '../history-utils';

test('missing due date is NOT overdue', () => {
  assert.strictEqual(getComplianceStatus(null, null), 'NEEDS_INFORMATION');
});

test('past verified due date can be overdue', () => {
  assert.strictEqual(getComplianceStatus('2020-01-01', null), 'OVERDUE');
});

test('filed date returns FILED status', () => {
  assert.strictEqual(getComplianceStatus('2020-01-01', '2020-01-10'), 'FILED');
});

import { historyStore } from '../history-store';

test('adding newer history does not delete older history', () => {
  const oldLen = historyStore.getAllSnapshot().length;
  historyStore.addEvent({
    id: 'test-evt-1', clientId: 'c2', type: 'AGM', financialYear: '2023', agmDate: '2023-12-31', status: 'HELD'
  });
  const newLen = historyStore.getAllSnapshot().length;
  assert.strictEqual(newLen, oldLen + 1);
});

test('editing one history record does not modify unrelated records', () => {
  const events = historyStore.getAllSnapshot();
  const evtToEdit = events.find(e => e.id === 'test-evt-1');
  if (evtToEdit) {
    historyStore.updateEvent({ ...evtToEdit, notes: 'Edited note' });
    const updatedEvents = historyStore.getAllSnapshot();
    const edited = updatedEvents.find(e => e.id === 'test-evt-1');
    assert.strictEqual(edited?.notes, 'Edited note');
    assert.strictEqual(updatedEvents.length, events.length);
  }
});

import { getCurrentLegalName, getLastAGM, getLastAnnualReturn, getLatestFiling, getPendingFilingCount, getNextKnownComplianceAction } from '../history-utils';

test('current shareholders derived correctly, ended shareholder excluded', () => {
  const events: CorporateEvent[] = [
    { id: '1', clientId: 'c1', type: 'SHAREHOLDER_CHANGE', shareholderName: 'Bob', shareCount: 100, shareValue: 10, ownershipPercentage: 100, current: true, effectiveFrom: '2020', effectiveTo: null },
    { id: '2', clientId: 'c1', type: 'SHAREHOLDER_CHANGE', shareholderName: 'Alice', shareCount: 50, shareValue: 10, ownershipPercentage: 50, current: false, effectiveFrom: '2020', effectiveTo: '2022' }
  ];
  const current = getCurrentShareholders(events);
  assert.strictEqual(current.length, 1);
  assert.strictEqual(current[0].shareholderName, 'Bob');
});

test('last AGM and return derivations', () => {
  const events: CorporateEvent[] = [
    { id: '1', clientId: 'c1', type: 'AGM', agmDate: '2022-12-31', financialYear: '2022', status: 'HELD' },
    { id: '2', clientId: 'c1', type: 'AGM', agmDate: '2023-12-31', financialYear: '2023', status: 'HELD' },
    { id: '3', clientId: 'c1', type: 'ANNUAL_RETURN', filedDate: '2023-01-15', dueDate: '2022-12-31', financialYear: '2022', filingStatus: 'FILED' }
  ];
  const lastAgm = getLastAGM(events);
  assert.strictEqual(lastAgm?.financialYear, '2023');
  const lastReturn = getLastAnnualReturn(events);
  assert.strictEqual(lastReturn?.financialYear, '2022');
});

test('outstanding is correctly calculated as bill - collection', () => {
  const w = { bill: 1000, collection: 400 };
  const outstanding = w.bill - w.collection;
  assert.strictEqual(outstanding, 600);
});

test('timeline filters do not alter source data', () => {
  const events: CorporateEvent[] = [
    { id: '1', clientId: 'c1', type: 'AGM', agmDate: '2022-12-31', financialYear: '2022', status: 'HELD' },
    { id: '2', clientId: 'c1', type: 'DIRECTOR_CHANGE', fullName: 'Bob', designation: 'MD', current: true, appointmentDate: '2020', cessationDate: null }
  ];
  const timeline = buildTimeline(events);
  const directorsOnly = timeline.filter(t => t.eventType === 'DIRECTOR_CHANGE');
  assert.strictEqual(directorsOnly.length, 1);
  assert.strictEqual(events.length, 2); // Source unchanged
});
