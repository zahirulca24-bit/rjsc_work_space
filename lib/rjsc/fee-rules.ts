import { FeeRule, EntityType, CalculationType } from './types';

export const feeRules: FeeRule[] = [
  // A. Private/Public Company return filing
  {
    id: 'FEE_COMP_RETURN',
    serviceId: 'annual-return',
    entityType: 'ALL', // Private and Public are handled same
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'PER_DOCUMENT',
    perDocumentFee: 200,
    lateFeeRules: {
      upToYears: 3,
      feePerYear: 500,
      beyondYears: 3,
      feeBeyondPerYear: 700
    },
    vatApplicable: false,
    notes: 'Private/Public Company return filing',
    sourceReference: 'RJSC_RETURN_FEE_SCHEDULE'
  },
  // B. Foreign company return filing
  {
    id: 'FEE_FOREIGN_RETURN',
    serviceId: 'annual-return',
    entityType: EntityType.FOREIGN_COMPANY,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'PER_DOCUMENT',
    perDocumentFee: 500,
    vatApplicable: false,
    notes: 'Foreign company return filing',
    sourceReference: 'RJSC_RETURN_FEE_SCHEDULE'
  },
  // C. Trade organization return filing
  {
    id: 'FEE_TRADE_ORG_RETURN',
    serviceId: 'annual-return',
    entityType: EntityType.TRADE_ORGANIZATION,
    effectiveFrom: '1995-01-01',
    effectiveTo: null,
    calculationType: 'PER_DOCUMENT',
    perDocumentFee: 400,
    lateFeeRules: {
      upToYears: 3,
      feePerYear: 500,
      beyondYears: 3,
      feeBeyondPerYear: 700
    },
    vatApplicable: false,
    notes: 'Trade organization return filing',
    sourceReference: 'RJSC_RETURN_FEE_SCHEDULE'
  },
  {
    id: 'FEE_OTHER_DOCUMENT_NON_SHARE_CAPITAL',
    serviceId: 'other-document-filing',
    entityType: EntityType.TRADE_ORGANIZATION,
    effectiveFrom: '2023-07-09',
    effectiveTo: null,
    calculationType: 'PER_DOCUMENT',
    perDocumentFee: 500,
    vatApplicable: false,
    notes: 'Generic other document filing (non-share capital)',
    sourceReference: 'RJSC_FEE_GAZETTE_2023'
  },
  // D. Society document filing
  {
    id: 'FEE_SOC_RETURN',
    serviceId: 'society-return-filing',
    entityType: EntityType.SOCIETY,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'PER_DOCUMENT',
    perDocumentFee: 800,
    vatApplicable: false,
    notes: 'Society document filing',
    sourceReference: 'RJSC_RETURN_FEE_SCHEDULE'
  },
  // E. Partnership Form II / V / VI
  {
    id: 'FEE_PARTNERSHIP_FORM',
    serviceId: 'partnership-forms',
    entityType: EntityType.PARTNERSHIP,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'PER_FORM',
    perDocumentFee: 500,
    vatApplicable: false,
    notes: 'Partnership Form II / V / VI',
    sourceReference: 'RJSC_RETURN_FEE_SCHEDULE'
  },
  // F. Winding Up
  {
    id: 'FEE_WINDING_UP',
    serviceId: 'winding-up',
    entityType: 'ALL',
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'PER_DOCUMENT',
    perDocumentFee: 200,
    vatApplicable: false,
    notes: 'Winding Up',
    sourceReference: 'RJSC_WINDING_UP_FEE_SCHEDULE'
  },
  // G. Certified Copy
  {
    id: 'FEE_CERTIFIED_COPY',
    serviceId: 'certified-copy',
    entityType: 'ALL',
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'CERTIFIED_COPY',
    vatApplicable: false,
    notes: 'Certified Copy',
    sourceReference: 'RJSC_CERT_COPY_FEE_SCHEDULE',
    certifiedCopyRules: {
      memorandumStampFee: 100,
      articlesStampFee: 100,
      otherDocumentStampFee: 100,
      courtFeePerApplication: 20,
      recordInspection: {
        society: 500,
        default: 200 // company/public/foreign/trade organization/partnership
      },
      incorporationCertificateCopy: 500,
      commencementCertificateCopy: 500,
      copyOfAnyDocument: 500,
      comparisonWithOriginal: 500
    }
  },
  // H. Private Company Registration
  {
    id: 'FEE_PVT_REGISTRATION',
    serviceId: 'private-company-registration',
    entityType: EntityType.PRIVATE_COMPANY,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'COMPLEX_COMPANY_REGISTRATION',
    vatApplicable: false,
    notes: 'Private Company Registration',
    sourceReference: 'RJSC_REG_FEE_SCHEDULE',
    registrationRules: {
      memorandumStampFee: 2000,
      filingFeePerDocument: 200,
      filingDocumentCount: 6,
      digitalCertificateFee: 0,
      articlesStampSlabs: [
        { min: 0, max: 4000000, fee: 10000 },
        { min: 4000001, max: 120000000, fee: 30000 },
        { min: 120000001, max: null, fee: 50000 }
      ],
      capitalFeeSlabs: [
        { min: 0, max: 1000000, base: 0, perUnit: 0, unitSize: 100000 },
        { min: 1000001, max: 5000000, base: 0, perUnit: 80, unitSize: 100000 },
        { min: 5000001, max: null, base: 3200, perUnit: 130, unitSize: 100000 }
      ]
    }
  },
  // I. Society Registration
  {
    id: 'FEE_SOC_REGISTRATION',
    serviceId: 'society-registration',
    entityType: EntityType.SOCIETY,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'FIXED',
    baseFee: 15000,
    perDocumentFee: 800, // registration filing fee
    vatApplicable: false,
    notes: 'Society Registration',
    sourceReference: 'RJSC_REG_FEE_SCHEDULE'
  },
  // 1. Name Clearance
  {
    id: 'FEE_NAME_CLEARANCE_COMPANY',
    serviceId: 'name-clearance',
    entityType: EntityType.PRIVATE_COMPANY, // Also covers Public
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    calculationType: 'NAME_CLEARANCE',
    baseFee: 500,
    vatApplicable: true,
    notes: 'Name Clearance for Company',
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  {
    id: 'FEE_NAME_CLEARANCE_PUBLIC_COMPANY',
    serviceId: 'name-clearance',
    entityType: EntityType.PUBLIC_COMPANY,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    calculationType: 'NAME_CLEARANCE',
    baseFee: 500,
    vatApplicable: true,
    notes: 'Name Clearance for Public Company',
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  {
    id: 'FEE_NAME_CLEARANCE_SOCIETY',
    serviceId: 'name-clearance',
    entityType: EntityType.SOCIETY,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    calculationType: 'NAME_CLEARANCE',
    baseFee: 2000,
    vatApplicable: true,
    notes: 'Name Clearance for Society',
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  {
    id: 'FEE_NAME_CLEARANCE_TRADE_ORG',
    serviceId: 'name-clearance',
    entityType: EntityType.TRADE_ORGANIZATION,
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    calculationType: 'NAME_CLEARANCE',
    baseFee: 500,
    vatApplicable: true,
    notes: 'Name Clearance for Trade Org',
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  // 2. Name Clearance Review
  {
    id: 'FEE_NAME_CLEARANCE_REVIEW',
    serviceId: 'name-clearance-review',
    entityType: 'ALL',
    effectiveFrom: '2025-01-01',
    effectiveTo: null,
    calculationType: 'NAME_CLEARANCE',
    baseFee: 200,
    vatApplicable: true,
    notes: 'Name Clearance Review',
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  // 3. Public Company Registration
  {
    id: 'FEE_PUB_REGISTRATION',
    serviceId: 'public-company-registration',
    entityType: EntityType.PUBLIC_COMPANY,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'COMPLEX_COMPANY_REGISTRATION',
    vatApplicable: false,
    notes: 'Public Company Registration',
    sourceReference: 'RJSC_REG_FEE_SCHEDULE',
    registrationRules: {
      memorandumStampFee: 2000,
      filingFeePerDocument: 200,
      filingDocumentCount: 8, // Usually 8 documents
      digitalCertificateFee: 0,
      articlesStampSlabs: [
        { min: 0, max: 4000000, fee: 10000 },
        { min: 4000001, max: 120000000, fee: 30000 },
        { min: 120000001, max: null, fee: 50000 }
      ],
      capitalFeeSlabs: [
        { min: 0, max: 1000000, base: 0, perUnit: 0, unitSize: 100000 },
        { min: 1000001, max: 5000000, base: 0, perUnit: 80, unitSize: 100000 },
        { min: 5000001, max: null, base: 3200, perUnit: 130, unitSize: 100000 }
      ]
    }
  },
  // 4. Change Return / Form XII
  {
    id: 'FEE_FORM_XII',
    serviceId: 'change-return-form-xii',
    entityType: 'ALL',
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'PER_DOCUMENT',
    perDocumentFee: 200,
    lateFeeRules: {
      upToYears: 3,
      feePerYear: 500,
      beyondYears: 3,
      feeBeyondPerYear: 700
    },
    vatApplicable: false,
    notes: 'Form XII',
    sourceReference: 'RJSC_RETURN_FEE_SCHEDULE'
  },
  // 5. Registered Office Change / Form VI
  {
    id: 'FEE_FORM_VI',
    serviceId: 'registered-office-change-form-vi',
    entityType: 'ALL',
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'PER_DOCUMENT',
    perDocumentFee: 200,
    lateFeeRules: {
      upToYears: 3,
      feePerYear: 500,
      beyondYears: 3,
      feeBeyondPerYear: 700
    },
    vatApplicable: false,
    notes: 'Form VI',
    sourceReference: 'RJSC_RETURN_FEE_SCHEDULE'
  },
  // 6. Mortgage / Charge Registration
  {
    id: 'FEE_MORTGAGE_COMPANY',
    serviceId: 'mortgage-charge-registration',
    entityType: EntityType.PRIVATE_COMPANY,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'MORTGAGE_SLAB',
    vatApplicable: false,
    notes: 'Mortgage Company',
    sourceReference: 'RJSC_FEE_GAZETTE_2023',
    mortgageRules: {
      firstSlabBase: 300,
      secondSlabPerUnit: 200,
      thirdSlabPerUnit: 100,
      unitSize: 500000
    }
  },
  {
    id: 'FEE_MORTGAGE_PUB_COMPANY',
    serviceId: 'mortgage-charge-registration',
    entityType: EntityType.PUBLIC_COMPANY,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'MORTGAGE_SLAB',
    vatApplicable: false,
    notes: 'Mortgage Public Company',
    sourceReference: 'RJSC_FEE_GAZETTE_2023',
    mortgageRules: {
      firstSlabBase: 300,
      secondSlabPerUnit: 200,
      thirdSlabPerUnit: 100,
      unitSize: 500000
    }
  },
  {
    id: 'FEE_MORTGAGE_FOREIGN',
    serviceId: 'mortgage-charge-registration',
    entityType: EntityType.FOREIGN_COMPANY,
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'MORTGAGE_SLAB',
    vatApplicable: false,
    notes: 'Mortgage Foreign Company',
    sourceReference: 'RJSC_FEE_GAZETTE_2023',
    mortgageRules: {
      firstSlabBase: 400,
      secondSlabPerUnit: 300,
      thirdSlabPerUnit: 200,
      unitSize: 500000
    }
  },
  // 7. Receiver Appointment
  {
    id: 'FEE_RECEIVER',
    serviceId: 'receiver-appointment',
    entityType: 'ALL',
    effectiveFrom: '2023-01-01',
    effectiveTo: null,
    calculationType: 'FIXED',
    baseFee: 500,
    perDocumentFee: 0,
    vatApplicable: false,
    notes: 'Receiver Appointment',
    sourceReference: 'RJSC_FEE_GAZETTE_2023'
  }
];

export const getFeeRuleForService = (serviceId: string, entityType: EntityType): FeeRule | undefined => {
  const activeRules = feeRules.filter(r => r.effectiveTo === null);
  const specificRule = activeRules.find(r => r.serviceId === serviceId && r.entityType === entityType);
  if (specificRule) return specificRule;
  return activeRules.find(r => r.serviceId === serviceId && r.entityType === 'ALL');
};
