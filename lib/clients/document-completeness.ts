export type LegalDocType = 'INCORPORATION' | 'FORM_XII' | 'SCHEDULE_X';

export interface LegalDocStatus {
  type: LegalDocType;
  label: string;
  status: 'MISSING' | 'UPLOADED' | 'VERIFIED' | 'OUTDATED';
  documentId?: string;
  documentDate?: string;
  notes?: string;
  originalFilename?: string;
}

export interface DocumentCompletenessSummary {
  verifiedCount: number;
  uploadedCount: number;
  totalRequired: number; // always 3
  isComplete: boolean;
  scoreText: string; // e.g. "2/3"
  items: LegalDocStatus[];
}

export function computeDocumentCompleteness(documents: any[]): DocumentCompletenessSummary {
  const activeDocs = (documents || []).filter(d => d.status !== 'DELETED');

  // Look for relevant docs by category
  const findDoc = (category: string) => {
    return activeDocs.find(d => d.category === category);
  };

  const getDocStatus = (doc: any, label: string, type: LegalDocType): LegalDocStatus => {
    if (!doc) {
      return {
        type,
        label,
        status: 'MISSING'
      };
    }

    const docStatus = (doc.status || '').toUpperCase();
    let status: 'MISSING' | 'UPLOADED' | 'VERIFIED' | 'OUTDATED' = 'UPLOADED';

    if (docStatus === 'VERIFIED') {
      status = 'VERIFIED';
    } else if (docStatus === 'OUTDATED') {
      status = 'OUTDATED';
    } else {
      status = 'UPLOADED';
    }

    return {
      type,
      label,
      status,
      documentId: doc.id,
      documentDate: doc.document_date,
      notes: doc.notes,
      originalFilename: doc.original_filename || doc.document_name
    };
  };

  const incDoc = findDoc('INCORPORATION');
  const formXiiDoc = findDoc('FORM_XII');
  const schedXDoc = findDoc('SCHEDULE_X');

  const items: LegalDocStatus[] = [
    getDocStatus(incDoc, 'Certificate of Incorporation', 'INCORPORATION'),
    getDocStatus(formXiiDoc, 'Form XII (Directors)', 'FORM_XII'),
    getDocStatus(schedXDoc, 'Schedule X (Annual Return)', 'SCHEDULE_X')
  ];

  const presentCount = items.filter(i => i.status !== 'MISSING').length;
  const verifiedCount = items.filter(i => i.status === 'VERIFIED').length;

  return {
    verifiedCount,
    uploadedCount: presentCount,
    totalRequired: 3,
    isComplete: presentCount === 3,
    scoreText: `${presentCount}/3`,
    items
  };
}
