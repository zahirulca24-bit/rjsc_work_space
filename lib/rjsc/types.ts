export enum EntityType {
  PRIVATE_COMPANY = 'PRIVATE_COMPANY',
  PUBLIC_COMPANY = 'PUBLIC_COMPANY',
  FOREIGN_COMPANY = 'FOREIGN_COMPANY',
  SOCIETY = 'SOCIETY',
  PARTNERSHIP = 'PARTNERSHIP',
  TRADE_ORGANIZATION = 'TRADE_ORGANIZATION'
}

export type SourceStatus = 'VERIFIED' | 'NEEDS_SOURCE_REVIEW' | 'UNSPECIFIED';

export interface RJSCServiceRule {
  id: string;
  serviceName: string;
  entityTypes: EntityType[];
  category: string;
  description: string;
  requiredDocuments: string[]; // references DocumentRequirement ids
  checklist: string[];
  deadlineRuleId: string | null;
  nextAction: string | null;
  legalReferences: string[]; // references LegalReference ids
  sourceStatus: SourceStatus;
}

export type CalculationType = 'PER_DOCUMENT' | 'PER_FORM' | 'SLAB_BASED' | 'FIXED' | 'COMPLEX_COMPANY_REGISTRATION' | 'CERTIFIED_COPY' | 'MORTGAGE_SLAB' | 'NAME_CLEARANCE';

export interface FeeSlab {
  min: number;
  max: number | null;
  baseAmount?: number;
  perUnitAmount?: number;
  unitSize?: number;
  fee?: number;
}

export interface CertifiedCopyRules {
  memorandumStampFee: number;
  articlesStampFee: number;
  otherDocumentStampFee: number;
  courtFeePerApplication: number;
  recordInspection: {
    society: number;
    default: number;
  };
  incorporationCertificateCopy: number;
  commencementCertificateCopy: number;
  copyOfAnyDocument: number;
  comparisonWithOriginal: number;
}

export interface ArticlesStampSlab {
  min: number;
  max: number | null;
  fee: number;
}

export interface CapitalFeeSlab {
  min: number;
  max: number | null;
  base: number;
  perUnit: number;
  unitSize: number;
}

export interface RegistrationRules {
  memorandumStampFee: number;
  filingFeePerDocument: number;
  filingDocumentCount: number;
  digitalCertificateFee: number;
  articlesStampSlabs: ArticlesStampSlab[];
  capitalFeeSlabs: CapitalFeeSlab[];
}

export interface MortgageRules {
  firstSlabBase: number;
  secondSlabPerUnit: number;
  thirdSlabPerUnit: number;
  unitSize: number;
}

export interface FeeRule {
  id: string;
  serviceId: string;
  entityType: EntityType | 'ALL';
  effectiveFrom: string; // ISO date
  effectiveTo: string | null; // ISO date
  calculationType: CalculationType;
  baseFee?: number;
  perDocumentFee?: number;
  lateFeeRules?: {
    upToYears: number;
    feePerYear: number;
    beyondYears?: number;
    feeBeyondPerYear?: number;
  };
  slabs?: FeeSlab[];
  vatApplicable: boolean;
  notes: string;
  sourceReference: string;
  
  // Custom properties for specific complex rules
  certifiedCopyRules?: CertifiedCopyRules; 
  registrationRules?: RegistrationRules;
  mortgageRules?: MortgageRules;
}

export interface DocumentRequirement {
  id: string;
  serviceId: string;
  entityType: EntityType | 'ALL';
  documentName: string;
  required: boolean;
  conditional: boolean;
  conditionText: string | null;
  sortOrder: number;
  sourceReference: string;
}

export interface DeadlineRule {
  id: string;
  serviceId: string;
  entityType: EntityType | 'ALL';
  trigger: string;
  daysAfterTrigger: number;
  fixedRuleText: string;
  sourceReference: string;
}

export interface LegalReference {
  id: string;
  lawName: string;
  section: string;
  ruleText: string;
  sourceDocument: string;
  sourcePage: string;
  effectiveDate: string | null;
  status: string;
}
