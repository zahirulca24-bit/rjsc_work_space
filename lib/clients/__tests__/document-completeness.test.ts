import test from 'node:test';
import assert from 'node:assert';
import { computeDocumentCompleteness } from '../document-completeness';

test('computeDocumentCompleteness with no documents returns 0/3 with all missing', () => {
  const result = computeDocumentCompleteness([]);
  assert.strictEqual(result.uploadedCount, 0);
  assert.strictEqual(result.verifiedCount, 0);
  assert.strictEqual(result.scoreText, '0/3');
  assert.strictEqual(result.isComplete, false);
  assert.strictEqual(result.items.length, 3);
  assert.ok(result.items.every(i => i.status === 'MISSING'));
});

test('computeDocumentCompleteness with partial uploads returns 2/3 with correct statuses', () => {
  const docs = [
    { id: '1', category: 'INCORPORATION', status: 'VERIFIED', document_date: '2020-01-01' },
    { id: '2', category: 'FORM_XII', status: 'UPLOADED', document_date: '2022-05-10' }
  ];
  const result = computeDocumentCompleteness(docs);
  assert.strictEqual(result.uploadedCount, 2);
  assert.strictEqual(result.verifiedCount, 1);
  assert.strictEqual(result.scoreText, '2/3');
  assert.strictEqual(result.items.find(i => i.type === 'INCORPORATION')?.status, 'VERIFIED');
  assert.strictEqual(result.items.find(i => i.type === 'FORM_XII')?.status, 'UPLOADED');
  assert.strictEqual(result.items.find(i => i.type === 'SCHEDULE_X')?.status, 'MISSING');
});

test('computeDocumentCompleteness with outdated status preserves OUTDATED', () => {
  const docs = [
    { id: '1', category: 'INCORPORATION', status: 'VERIFIED' },
    { id: '2', category: 'FORM_XII', status: 'OUTDATED' },
    { id: '3', category: 'SCHEDULE_X', status: 'UPLOADED' }
  ];
  const result = computeDocumentCompleteness(docs);
  assert.strictEqual(result.uploadedCount, 3);
  assert.strictEqual(result.verifiedCount, 1);
  assert.strictEqual(result.scoreText, '3/3');
  assert.strictEqual(result.items.find(i => i.type === 'FORM_XII')?.status, 'OUTDATED');
});
