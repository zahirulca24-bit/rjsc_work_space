import { DocumentRequirement, EntityType } from './types';

export const documentRules: DocumentRequirement[] = [
  // Society Registration confirmed requirements
  {
    id: 'DOC_SOC_REG_MOA',
    serviceId: 'society-registration',
    entityType: EntityType.SOCIETY,
    documentName: 'Memorandum of Association',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 1,
    sourceReference: 'SRA_1860_SEC_2'
  },
  {
    id: 'DOC_SOC_REG_NAME',
    serviceId: 'society-registration',
    entityType: EntityType.SOCIETY,
    documentName: 'Society Name',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 2,
    sourceReference: 'SRA_1860_SEC_2'
  },
  {
    id: 'DOC_SOC_REG_OBJECTS',
    serviceId: 'society-registration',
    entityType: EntityType.SOCIETY,
    documentName: 'Objects',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 3,
    sourceReference: 'SRA_1860_SEC_2'
  },
  {
    id: 'DOC_SOC_REG_GOV_BODY',
    serviceId: 'society-registration',
    entityType: EntityType.SOCIETY,
    documentName: 'Names, addresses and occupations of governing body',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 4,
    sourceReference: 'SRA_1860_SEC_2'
  },
  {
    id: 'DOC_SOC_REG_RULES',
    serviceId: 'society-registration',
    entityType: EntityType.SOCIETY,
    documentName: 'Rules and Regulations',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 5,
    sourceReference: 'SRA_1860_SEC_2'
  },
  {
    id: 'DOC_SOC_REG_RULES_CERT',
    serviceId: 'society-registration',
    entityType: EntityType.SOCIETY,
    documentName: 'Rules/regulations certified as correct by at least three governing body members',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 6,
    sourceReference: 'SRA_1860_SEC_2'
  },
  // Form XII Docs
  {
    id: 'DOC_FORM_XII',
    serviceId: 'change-return-form-xii',
    entityType: 'ALL',
    documentName: 'ফরম-XII (Form-XII)',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 1,
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  {
    id: 'DOC_FORM_IX',
    serviceId: 'change-return-form-xii',
    entityType: 'ALL',
    documentName: 'ফরম-IX (Form-IX) (নতুন পরিচালক অন্তর্ভুক্ত, পাবলিক কোম্পানির পরিচালকের অবসর ও পুন: নিয়োগ থাকলে ছবিসহ স্ক্যান করে ফরমটি সংযুক্ত করতে হবে)',
    required: false,
    conditional: true,
    conditionText: 'If new director or reappointment',
    sortOrder: 2,
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  {
    id: 'DOC_E_TIN',
    serviceId: 'change-return-form-xii',
    entityType: 'ALL',
    documentName: 'ই-টিন (eTIN) এবং মোবাইল নম্বর (প্রত্যেকের)',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 3,
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  {
    id: 'DOC_DIR_MEETING_MINUTES',
    serviceId: 'change-return-form-xii',
    entityType: 'ALL',
    documentName: 'পরিচালক সভার নোটিশ এবং কার্যবিবরণী',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 4,
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  {
    id: 'DOC_DIR_NID',
    serviceId: 'change-return-form-xii',
    entityType: 'ALL',
    documentName: 'পরিচালকের ভোটার আইডি-নম্বর (১০ অথবা ১৭ সংখ্যার) অথবা পাসপোর্ট নম্বর',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 5,
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  // Form VI Docs
  {
    id: 'DOC_FORM_VI',
    serviceId: 'registered-office-change-form-vi',
    entityType: 'ALL',
    documentName: 'ফরম-VI',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 1,
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  },
  {
    id: 'DOC_DIR_MEETING_MINUTES_VI',
    serviceId: 'registered-office-change-form-vi',
    entityType: 'ALL',
    documentName: 'পরিচালক সভার নোটিশ এবং কার্যবিবরণী',
    required: true,
    conditional: false,
    conditionText: null,
    sortOrder: 2,
    sourceReference: 'RJSC_CITIZEN_CHARTER_2025'
  }
];

export const getDocumentRulesForService = (serviceId: string, entityType: EntityType): DocumentRequirement[] => {
  return documentRules.filter(r => r.serviceId === serviceId && (r.entityType === entityType || r.entityType === 'ALL'));
};
