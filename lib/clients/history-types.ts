export type DateString = string; // YYYY-MM-DD format usually

export interface BaseHistoryRecord {
  id: string;
  clientId: string;
  sourceDocument?: string;
  notes?: string;
}

export interface NameHistory extends BaseHistoryRecord {
  type: 'NAME_CHANGE';
  previousName: string;
  newName: string;
  effectiveDate: DateString;
}

export interface RegisteredOfficeHistory extends BaseHistoryRecord {
  type: 'REGISTERED_OFFICE_CHANGE';
  address: string;
  effectiveFrom: DateString;
  effectiveTo: DateString | null;
  filingReference?: string;
}

export interface CapitalHistory extends BaseHistoryRecord {
  type: 'CAPITAL_CHANGE';
  authorizedCapital: number;
  paidUpCapital: number;
  effectiveDate: DateString;
  changeType: 'INCREASE' | 'DECREASE' | 'INITIAL';
}

export interface DirectorHistory extends BaseHistoryRecord {
  type: 'DIRECTOR_CHANGE';
  fullName: string;
  designation: string;
  nidOrPassportReference?: string;
  appointmentDate: DateString;
  cessationDate: DateString | null;
  current: boolean;
}

export interface ShareholderHistory extends BaseHistoryRecord {
  type: 'SHAREHOLDER_CHANGE';
  shareholderName: string;
  shareCount: number;
  shareValue: number;
  ownershipPercentage: number;
  effectiveFrom: DateString;
  effectiveTo: DateString | null;
  current: boolean;
}

export interface AgmHistory extends BaseHistoryRecord {
  type: 'AGM';
  financialYear: string;
  agmDate: DateString;
  status: 'HELD' | 'PENDING' | 'NOT_HELD';
}

export interface AnnualReturnHistory extends BaseHistoryRecord {
  type: 'ANNUAL_RETURN';
  financialYear: string;
  dueDate: DateString | null;
  filedDate: DateString | null;
  filingStatus: 'FILED' | 'OVERDUE' | 'PENDING';
  acknowledgementReference?: string;
  govtFee?: number;
  lateFee?: number;
}

export interface RjscFilingHistory extends BaseHistoryRecord {
  type: 'RJSC_FILING';
  serviceType: string;
  formName: string;
  effectiveDate: DateString | null;
  submissionDate: DateString | null;
  approvalDate: DateString | null;
  status: 'SUBMITTED' | 'APPROVED' | 'PENDING' | 'REJECTED';
  reference?: string;
}

export interface MortgageHistory extends BaseHistoryRecord {
  type: 'MORTGAGE';
  lender: string;
  securedAmount: number;
  creationDate: DateString;
  modificationDate: DateString | null;
  satisfactionDate: DateString | null;
  status: 'ACTIVE' | 'SATISFIED';
  filingReference?: string;
}

export interface ComplianceIssue extends BaseHistoryRecord {
  type: 'COMPLIANCE_ISSUE';
  title: string;
  category: string;
  identifiedDate: DateString;
  dueDate: DateString | null;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'RESOLVED';
  resolutionDate: DateString | null;
}

export type CorporateEvent = 
  | NameHistory 
  | RegisteredOfficeHistory 
  | CapitalHistory 
  | DirectorHistory 
  | ShareholderHistory 
  | AgmHistory 
  | AnnualReturnHistory 
  | RjscFilingHistory 
  | MortgageHistory 
  | ComplianceIssue;

export interface TimelineEvent {
  id: string;
  date: string;
  eventType: string;
  title: string;
  reference?: string;
  status?: string;
  note?: string;
  originalEvent: CorporateEvent;
}
