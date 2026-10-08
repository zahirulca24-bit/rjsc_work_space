import { CorporateEvent, DirectorHistory, ShareholderHistory, CapitalHistory, RegisteredOfficeHistory, TimelineEvent } from './history-types';

export function getCurrentDirectors(events: CorporateEvent[]): DirectorHistory[] {
  const dirs = events.filter((e): e is DirectorHistory => e.type === 'DIRECTOR_CHANGE');
  return dirs.filter(d => d.current && !d.cessationDate);
}

export function getCurrentShareholders(events: CorporateEvent[]): ShareholderHistory[] {
  const shares = events.filter((e): e is ShareholderHistory => e.type === 'SHAREHOLDER_CHANGE');
  return shares.filter(s => s.current && !s.effectiveTo);
}

export function getCurrentCapital(events: CorporateEvent[]): CapitalHistory | null {
  const capitals = events.filter((e): e is CapitalHistory => e.type === 'CAPITAL_CHANGE');
  if (capitals.length === 0) return null;
  // Sort descending by date
  capitals.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  return capitals[0];
}

export function getCurrentRegisteredOffice(events: CorporateEvent[]): RegisteredOfficeHistory | null {
  const offices = events.filter((e): e is RegisteredOfficeHistory => e.type === 'REGISTERED_OFFICE_CHANGE');
  if (offices.length === 0) return null;
  // Find current one (effectiveTo is null), fallback to latest date
  const current = offices.find(o => !o.effectiveTo);
  if (current) return current;
  offices.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());
  return offices[0];
}

export function buildTimeline(events: CorporateEvent[]): TimelineEvent[] {
  const timeline: TimelineEvent[] = [];

  for (const e of events) {
    let reference = e.sourceDocument;
    
    switch(e.type) {
      case 'NAME_CHANGE':
        timeline.push({ id: e.id, date: e.effectiveDate, eventType: e.type, title: `Name changed from ${e.previousName} to ${e.newName}`, reference, note: e.notes, originalEvent: e });
        break;
      case 'REGISTERED_OFFICE_CHANGE':
        timeline.push({ id: e.id, date: e.effectiveFrom, eventType: e.type, title: `Registered Office changed to ${e.address}`, reference: e.filingReference || reference, note: e.notes, originalEvent: e });
        break;
      case 'CAPITAL_CHANGE':
        timeline.push({ id: e.id, date: e.effectiveDate, eventType: e.type, title: `Capital ${e.changeType.toLowerCase()}: Auth ${e.authorizedCapital}, Paid ${e.paidUpCapital}`, reference, note: e.notes, originalEvent: e });
        break;
      case 'DIRECTOR_CHANGE':
        if (e.appointmentDate) {
          timeline.push({ id: e.id + '-app', date: e.appointmentDate, eventType: e.type, title: `Director ${e.fullName} appointed as ${e.designation}`, reference, note: e.notes, originalEvent: e });
        }
        if (e.cessationDate) {
          timeline.push({ id: e.id + '-cess', date: e.cessationDate, eventType: e.type, title: `Director ${e.fullName} ceased (${e.designation})`, reference, note: e.notes, originalEvent: e });
        }
        break;
      case 'SHAREHOLDER_CHANGE':
        if (e.effectiveFrom) {
          timeline.push({ id: e.id + '-start', date: e.effectiveFrom, eventType: e.type, title: `Shareholder ${e.shareholderName} registered (${e.shareCount} shares)`, reference, note: e.notes, originalEvent: e });
        }
        if (e.effectiveTo) {
          timeline.push({ id: e.id + '-end', date: e.effectiveTo, eventType: e.type, title: `Shareholder ${e.shareholderName} transferred/ceased`, reference, note: e.notes, originalEvent: e });
        }
        break;
      case 'AGM':
        timeline.push({ id: e.id, date: e.agmDate, eventType: e.type, title: `AGM for FY ${e.financialYear}`, status: e.status, reference, note: e.notes, originalEvent: e });
        break;
      case 'ANNUAL_RETURN':
        timeline.push({ id: e.id, date: e.filedDate || e.dueDate || '', eventType: e.type, title: `Annual Return for FY ${e.financialYear}`, status: e.filingStatus, reference: e.acknowledgementReference || reference, note: e.notes, originalEvent: e });
        break;
      case 'RJSC_FILING':
        timeline.push({ id: e.id, date: e.submissionDate || e.effectiveDate || '', eventType: e.type, title: `${e.formName} - ${e.serviceType}`, status: e.status, reference: e.reference || reference, note: e.notes, originalEvent: e });
        break;
      case 'MORTGAGE':
        timeline.push({ id: e.id + '-cre', date: e.creationDate, eventType: e.type, title: `Mortgage/Charge with ${e.lender} for ${e.securedAmount}`, status: 'CREATED', reference: e.filingReference || reference, note: e.notes, originalEvent: e });
        if (e.satisfactionDate) {
          timeline.push({ id: e.id + '-sat', date: e.satisfactionDate, eventType: e.type, title: `Mortgage/Charge satisfied with ${e.lender}`, status: 'SATISFIED', reference: e.filingReference || reference, note: e.notes, originalEvent: e });
        }
        break;
      case 'COMPLIANCE_ISSUE':
        timeline.push({ id: e.id, date: e.identifiedDate, eventType: e.type, title: `Compliance Issue: ${e.title}`, status: e.status, reference, note: e.notes, originalEvent: e });
        if (e.resolutionDate) {
          timeline.push({ id: e.id + '-res', date: e.resolutionDate, eventType: e.type, title: `Compliance Issue Resolved: ${e.title}`, status: 'RESOLVED', reference, note: e.notes, originalEvent: e });
        }
        break;
    }
  }

  // Sort descending (newest first), ignore empty dates, put empty dates at the bottom
  timeline.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return timeline;
}

export function getCurrentLegalName(events: CorporateEvent[], fallback: string): string {
  const names = events.filter((e): e is import('./history-types').NameHistory => e.type === 'NAME_CHANGE');
  if (names.length === 0) return fallback;
  names.sort((a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime());
  return names[0].newName;
}

export function getLastAGM(events: CorporateEvent[]): import('./history-types').AgmHistory | null {
  const agms = events.filter((e): e is import('./history-types').AgmHistory => e.type === 'AGM' && e.status === 'HELD');
  if (agms.length === 0) return null;
  agms.sort((a, b) => new Date(b.agmDate).getTime() - new Date(a.agmDate).getTime());
  return agms[0];
}

export function getLastAnnualReturn(events: CorporateEvent[]): import('./history-types').AnnualReturnHistory | null {
  const returns = events.filter((e): e is import('./history-types').AnnualReturnHistory => e.type === 'ANNUAL_RETURN' && !!e.filedDate);
  if (returns.length === 0) return null;
  returns.sort((a, b) => new Date(b.filedDate!).getTime() - new Date(a.filedDate!).getTime());
  return returns[0];
}

export function getLatestFiling(events: CorporateEvent[]): import('./history-types').RjscFilingHistory | null {
  const filings = events.filter((e): e is import('./history-types').RjscFilingHistory => e.type === 'RJSC_FILING' && !!e.submissionDate);
  if (filings.length === 0) return null;
  filings.sort((a, b) => new Date(b.submissionDate!).getTime() - new Date(a.submissionDate!).getTime());
  return filings[0];
}

export function getPendingFilingCount(events: CorporateEvent[]): number {
  return events.filter(e => e.type === 'RJSC_FILING' && (e.status === 'PENDING' || e.status === 'SUBMITTED')).length;
}

export function getNextKnownComplianceAction(events: CorporateEvent[]): import('./history-types').ComplianceIssue | null {
  const compliance = events.filter((e): e is import('./history-types').ComplianceIssue => e.type === 'COMPLIANCE_ISSUE' && e.status === 'OPEN');
  if (compliance.length === 0) return null;
  // sort by due date ascending, empty due dates at end
  compliance.sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });
  return compliance[0];
}

export type ComplianceStatus = 'FILED' | 'PENDING' | 'OVERDUE' | 'NEEDS_INFORMATION' | 'NEEDS_SOURCE_REVIEW';

export function getComplianceStatus(dueDate: string | null, filedDate: string | null): ComplianceStatus {
  if (filedDate) return 'FILED';
  if (!dueDate) return 'NEEDS_INFORMATION';
  // Form VI / XII missing due dates handled by passing null. 
  // If there's a valid date and it's in the past:
  const due = new Date(dueDate).getTime();
  if (!isNaN(due) && due < Date.now()) {
    return 'OVERDUE';
  }
  return 'PENDING';
}
