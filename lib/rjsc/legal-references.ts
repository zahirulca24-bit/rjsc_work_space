import { LegalReference } from './types';

export const legalReferences: Record<string, LegalReference> = {
  'COMPANIES_ACT_1994': {
    id: 'COMPANIES_ACT_1994',
    lawName: 'Companies Act, 1994',
    section: 'General',
    ruleText: 'Primary legislation governing companies in Bangladesh.',
    sourceDocument: 'Companies Act, 1994',
    sourcePage: 'Various',
    effectiveDate: '1995-01-01',
    status: 'ACTIVE'
  },
  'SRA_1860_SEC_2': {
    id: 'SRA_1860_SEC_2',
    lawName: 'Societies Registration Act, 1860',
    section: 'Section 2',
    ruleText: 'Memorandum of association rules and required contents.',
    sourceDocument: 'Societies Registration Act, 1860',
    sourcePage: 'Section 2',
    effectiveDate: '1860-05-21',
    status: 'ACTIVE'
  },
  'SRA_1860_SEC_4': {
    id: 'SRA_1860_SEC_4',
    lawName: 'Societies Registration Act, 1860',
    section: 'Section 4',
    ruleText: 'Annual managing-body list filing requirements.',
    sourceDocument: 'Societies Registration Act, 1860',
    sourcePage: 'Section 4',
    effectiveDate: '1860-05-21',
    status: 'ACTIVE'
  },
  'RJSC_FEE_GAZETTE_2023': {
    id: 'RJSC_FEE_GAZETTE_2023',
    lawName: 'Bangladesh Gazette - RJSC Fee Update',
    section: 'Schedule 2',
    ruleText: 'Updated fees for company registration, mortgage, receiver appointment, and filing.',
    sourceDocument: 'gazette2023.pdf',
    sourcePage: 'Schedule 2',
    effectiveDate: '2023-07-09',
    status: 'ACTIVE'
  },
  'RJSC_CITIZEN_CHARTER_2025': {
    id: 'RJSC_CITIZEN_CHARTER_2025',
    lawName: 'RJSC Citizen Charter',
    section: 'Updated 2025',
    ruleText: 'Lists service fees, VAT requirements, and processing times for various RJSC services.',
    sourceDocument: 'charter2025.pdf',
    sourcePage: 'Various',
    effectiveDate: '2025-01-01',
    status: 'ACTIVE'
  },
  'RJSC_REG_FEE_SCHEDULE': {
    id: 'RJSC_REG_FEE_SCHEDULE',
    lawName: 'RJSC Registration Fee Schedule',
    section: 'Registration',
    ruleText: 'Fees for new entity registrations.',
    sourceDocument: 'RJSC Fee Schedule',
    sourcePage: 'Registration',
    effectiveDate: null,
    status: 'ACTIVE'
  },
  'RJSC_RETURN_FEE_SCHEDULE': {
    id: 'RJSC_RETURN_FEE_SCHEDULE',
    lawName: 'RJSC Return Filing Fee Schedule',
    section: 'Returns',
    ruleText: 'Fees for filing regular returns.',
    sourceDocument: 'RJSC Fee Schedule',
    sourcePage: 'Returns',
    effectiveDate: null,
    status: 'ACTIVE'
  },
  'RJSC_CERT_COPY_FEE_SCHEDULE': {
    id: 'RJSC_CERT_COPY_FEE_SCHEDULE',
    lawName: 'RJSC Certified Copy Fee Schedule',
    section: 'Certified Copies',
    ruleText: 'Fees for issuance of certified copies and record inspection.',
    sourceDocument: 'RJSC Fee Schedule',
    sourcePage: 'Certified Copies',
    effectiveDate: null,
    status: 'ACTIVE'
  },
  'RJSC_WINDING_UP_FEE_SCHEDULE': {
    id: 'RJSC_WINDING_UP_FEE_SCHEDULE',
    lawName: 'RJSC Winding-up Fee Schedule',
    section: 'Winding Up',
    ruleText: 'Fees related to winding up proceedings.',
    sourceDocument: 'RJSC Fee Schedule',
    sourcePage: 'Winding Up',
    effectiveDate: null,
    status: 'ACTIVE'
  },
};
