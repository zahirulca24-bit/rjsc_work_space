import assert from 'node:assert';
import { test } from 'node:test';
import { calculateRJSCFee } from '../rule-engine';
import { EntityType } from '../types';

test('private company on-time return filing: 3 documents = Tk 600', () => {
  const result = calculateRJSCFee({
    serviceId: 'annual-return',
    entityType: EntityType.PRIVATE_COMPANY,
    documentCount: 3,
    yearsLate: 0
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 600);
});

test('rule result includes sourceReference', () => {
  const result = calculateRJSCFee({
    serviceId: 'annual-return',
    entityType: EntityType.PRIVATE_COMPANY,
    documentCount: 3,
    yearsLate: 0
  });
  assert.ok(result);
  assert.strictEqual(result.sourceReference, 'RJSC_RETURN_FEE_SCHEDULE');
});

test('private company 2 years late: ensure late rule is separately calculated', () => {
  const result = calculateRJSCFee({
    serviceId: 'annual-return',
    entityType: EntityType.PRIVATE_COMPANY,
    documentCount: 1, // Base fee 200
    yearsLate: 2 // 2 * 500 = 1000
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 1200);
  assert.strictEqual(result.breakdown['Late Fee'], 1000);
});

test('foreign company filing 2 documents = Tk 1,000', () => {
  const result = calculateRJSCFee({
    serviceId: 'annual-return',
    entityType: EntityType.FOREIGN_COMPANY,
    documentCount: 2
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 1000);
});

test('society filing 2 documents = Tk 1,600', () => {
  const result = calculateRJSCFee({
    serviceId: 'society-return-filing',
    entityType: EntityType.SOCIETY,
    documentCount: 2
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 1600);
});

test('partnership Form II = Tk 500', () => {
  const result = calculateRJSCFee({
    serviceId: 'partnership-forms',
    entityType: EntityType.PARTNERSHIP,
    documentCount: 1
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 500);
});

test('winding-up 3 documents = Tk 600', () => {
  const result = calculateRJSCFee({
    serviceId: 'winding-up',
    entityType: EntityType.PRIVATE_COMPANY,
    documentCount: 3
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 600);
});

test('certified copy incorporation certificate = correct configured charge', () => {
  const result = calculateRJSCFee({
    serviceId: 'certified-copy',
    entityType: EntityType.PRIVATE_COMPANY,
    certifiedCopyType: 'incorporation'
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 500);
});

test('private company registration slab calculations', () => {
  const result = calculateRJSCFee({
    serviceId: 'private-company-registration',
    entityType: EntityType.PRIVATE_COMPANY,
    authorizedCapital: 2000000 // 2M
  });
  assert.ok(result);
  // Memo: 2000
  // Articles: 10000 (since 2M <= 4M)
  // Filing: 6 * 200 = 1200
  // Capital: First 1M zero. Next 1M = 10 units of 100k = 10 * 80 = 800.
  // Total: 2000 + 10000 + 1200 + 800 = 14000
  assert.strictEqual(result.totalFee, 14000);
});

test('unknown service must NOT return guessed fee', () => {
  const result = calculateRJSCFee({
    serviceId: 'unknown-service',
    entityType: EntityType.PRIVATE_COMPANY
  });
  assert.strictEqual(result, null);
});

test('Name Clearance for Company', () => {
  const result = calculateRJSCFee({
    serviceId: 'name-clearance',
    entityType: EntityType.PRIVATE_COMPANY
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 575); // 500 + 75 VAT
  assert.strictEqual(result.breakdown['VAT (15%)'], 75);
});

test('Name Clearance for Society', () => {
  const result = calculateRJSCFee({
    serviceId: 'name-clearance',
    entityType: EntityType.SOCIETY
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 2300); // 2000 + 300 VAT
});

test('Name Clearance Review', () => {
  const result = calculateRJSCFee({
    serviceId: 'name-clearance-review',
    entityType: EntityType.PRIVATE_COMPANY
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 230); // 200 + 30 VAT
});

test('Public Company Registration basic calculation', () => {
  const result = calculateRJSCFee({
    serviceId: 'public-company-registration',
    entityType: EntityType.PUBLIC_COMPANY,
    authorizedCapital: 2000000 // 2M
  });
  assert.ok(result);
  // Memo: 2000
  // Articles: 10000 (since 2M <= 4M)
  // Filing: 8 * 200 = 1600
  // Capital: First 1M zero. Next 1M = 10 units of 100k = 10 * 80 = 800.
  // Total: 2000 + 10000 + 1600 + 800 = 14400
  assert.strictEqual(result.totalFee, 14400);
});

test('Form XII filing', () => {
  const result = calculateRJSCFee({
    serviceId: 'change-return-form-xii',
    entityType: EntityType.PRIVATE_COMPANY,
    documentCount: 1
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 200);
});

test('Form VI filing', () => {
  const result = calculateRJSCFee({
    serviceId: 'registered-office-change-form-vi',
    entityType: EntityType.PUBLIC_COMPANY,
    documentCount: 1
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 200);
});

test('Mortgage/Charge amount within first slab', () => {
  const result = calculateRJSCFee({
    serviceId: 'mortgage-charge-registration',
    entityType: EntityType.PRIVATE_COMPANY,
    authorizedCapital: 300000 // up to 5L
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 300);
});

test('Mortgage/Charge amount middle slab', () => {
  const result = calculateRJSCFee({
    serviceId: 'mortgage-charge-registration',
    entityType: EntityType.PRIVATE_COMPANY,
    authorizedCapital: 1000000 // 10L: Base 300 for first 5L + (5L in second slab -> 1 unit * 200 = 200) = 500
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 500);
});

test('Mortgage/Charge amount above 50L', () => {
  const result = calculateRJSCFee({
    serviceId: 'mortgage-charge-registration',
    entityType: EntityType.FOREIGN_COMPANY, // Testing foreign company rates
    authorizedCapital: 6000000 // 60L
  });
  assert.ok(result);
  // Base 5L: 400
  // Next 45L: 9 units * 300 = 2700
  // Above 50L: 10L = 2 units * 200 = 400
  // Total = 400 + 2700 + 400 = 3500
  assert.strictEqual(result.totalFee, 3500);
});

test('Receiver Appointment', () => {
  const result = calculateRJSCFee({
    serviceId: 'receiver-appointment',
    entityType: EntityType.PRIVATE_COMPANY
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 500);
});

test('Trade Organization return filing = correct source-specific fee', () => {
  const result = calculateRJSCFee({
    serviceId: 'annual-return',
    entityType: EntityType.TRADE_ORGANIZATION,
    documentCount: 1,
    yearsLate: 0
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 400); // Specific RJSC return filing source
  assert.strictEqual(result.sourceReference, 'RJSC_RETURN_FEE_SCHEDULE');
});

test('Generic non-share capital other-document filing = Tk 500', () => {
  const result = calculateRJSCFee({
    serviceId: 'other-document-filing',
    entityType: EntityType.TRADE_ORGANIZATION,
    documentCount: 1,
    yearsLate: 0
  });
  assert.ok(result);
  assert.strictEqual(result.totalFee, 500); // 2023 Gazette fee for other documents
  assert.strictEqual(result.sourceReference, 'RJSC_FEE_GAZETTE_2023');
});
