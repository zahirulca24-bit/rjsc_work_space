
import test from 'node:test';
import assert from 'node:assert';
import { getInvoices, createInvoice } from '../invoices';
import { getTransactions, createTransaction } from '../transactions';
import { getFinanceSummary } from '../analytics';
import { getWorkFinancialSummary } from '../works';

// Mock fetch globally
(global as any).fetch = async (url: string, options?: any) => {
    return {
        ok: true,
        json: async () => ({ url, options })
    };
};

test('Finance API Helpers', async (t) => {
    await t.test('invoice API URL construction', async () => {
        const res: any = await getInvoices({ status: 'ISSUED' });
        assert.ok(res.url.includes('/api/invoices?status=ISSUED'));
    });

    await t.test('invoice filters', async () => {
        const res: any = await getInvoices({ client_id: '123', status: 'PAID' });
        assert.ok(res.url.includes('client_id=123'));
        assert.ok(res.url.includes('status=PAID'));
    });

    await t.test('transaction API URL construction', async () => {
        const res: any = await getTransactions({ invoice_id: 'abc' });
        assert.ok(res.url.includes('/api/transactions?invoice_id=abc'));
    });

    await t.test('analytics API URL construction', async () => {
        const res: any = await getFinanceSummary('2026-01-01', '2026-12-31');
        assert.ok(res.url.includes('/api/analytics/finance-summary?date_from=2026-01-01&date_to=2026-12-31'));
    });

    await t.test('POST invoice payload', async () => {
        const res: any = await createInvoice({ client_id: '123' });
        assert.strictEqual(res.options.method, 'POST');
        assert.strictEqual(res.options.body, JSON.stringify({ client_id: '123' }));
    });

    await t.test('API error propagation', async () => {
        (global as any).fetch = async () => ({
            ok: false,
            json: async () => ({ detail: 'Custom error message' })
        });
        
        try {
            await createInvoice({});
            assert.fail('Should have thrown error');
        } catch (e: any) {
            assert.strictEqual(e.message, 'Custom error message');
        }
        
        // Restore mock
        (global as any).fetch = async (url: string, options?: any) => ({
            ok: true,
            json: async () => ({ url, options })
        });
    });
await t.test('empty financial summary state', async () => {
        (global as any).fetch = async () => ({
            ok: true,
            json: async () => ({ total_billed: 0, total_collected: 0 })
        });
        const res: any = await getFinanceSummary();
        assert.strictEqual(res.total_billed, 0);
    });

    await t.test('Government Fee Pending state (Work Summary)', async () => {
        (global as any).fetch = async (url: string) => ({
            ok: true,
            json: async () => ({ government_fee: null, professional_fee: '1000' })
        });
        const res: any = await getWorkFinancialSummary('1');
        assert.strictEqual(res.government_fee, null);
    });
});
