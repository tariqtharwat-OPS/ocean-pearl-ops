/**
 * Test T2: Wallet Transaction Handler
 * Tests funding and expense transactions
 */

import admin from 'firebase-admin';
import { walletTransactionHandler } from '../src/handlers/walletTransactionHandler.js';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

async function testT2Funding() {
    console.log('🧪 TEST T2A: Wallet Transaction - FUNDING');
    console.log('=========================================\n');

    const testPayload = {
        operationId: 'test-funding-001-' + Date.now(),
        transactionType: 'FUNDING' as const,
        locationId: 'jakarta',
        unitId: 'jakarta-hq',
        amountIdr: 100000000, // 100M IDR capital injection
        sourceAccount: 'BANK_BCA',
        equityAccount: 'OWNER_EQUITY',
        actorUserId: 'CEO001',
        notes: 'Test T2A: Capital injection for operations',
    };

    console.log('📦 Input Payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    console.log('\n');

    try {
        const mockRequest = {
            auth: { uid: 'CEO001' },
            data: testPayload,
        };

        const result = await walletTransactionHandler(mockRequest as any);

        console.log('✅ SUCCESS!');
        console.log('\n📋 Result:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\n');

        // Verify ledger entry
        const ledgerDoc = await db.collection('ledger_entries').doc(result.ledgerEntryId).get();
        if (!ledgerDoc.exists) {
            throw new Error('Ledger entry not found!');
        }
        const ledgerData = ledgerDoc.data();
        console.log(`✅ Ledger Entry ID: ${result.ledgerEntryId}`);
        console.log(`   Operation Type: ${ledgerData?.operationType}`);
        console.log(`   Debits: ${JSON.stringify(ledgerData?.lines.filter((l: any) => l.direction === 'DEBIT').map((l: any) => ({ account: l.account, amount: l.amountIdr })))}`);
        console.log(`   Credits: ${JSON.stringify(ledgerData?.lines.filter((l: any) => l.direction === 'CREDIT').map((l: any) => ({ account: l.account, amount: l.amountIdr })))}`);

        // Verify balancing
        const debits = ledgerData?.lines.filter((l: any) => l.direction === 'DEBIT').reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        const credits = ledgerData?.lines.filter((l: any) => l.direction === 'CREDIT').reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        if (Math.abs(debits - credits) < 0.01) {
            console.log(`✅ BALANCED: Debits (${debits}) == Credits (${credits})`);
        } else {
            throw new Error(`UNBALANCED: Debits (${debits}) != Credits (${credits})`);
        }

        console.log('\n🎉 TEST T2A: PASS\n');
        return result.ledgerEntryId;

    } catch (error: any) {
        console.error('❌ FAIL:', error.message);
        throw error;
    }
}

async function testT2Expense() {
    console.log('🧪 TEST T2B: Wallet Transaction - EXPENSE');
    console.log('==========================================\n');

    const testPayload = {
        operationId: 'test-expense-001-' + Date.now(),
        transactionType: 'EXPENSE' as const,
        locationId: 'kaimana',
        unitId: 'kaimana-factory-1',
        amountIdr: 5000000, // 5M IDR for diesel
        expenseAccount: 'EXPENSE_DIESEL',
        paymentMethod: 'CASH',
        beneficiaryPartnerId: 'partner-vendor1',
        actorUserId: 'LOC_MGR_KAIMANA',
        notes: 'Test T2B: Diesel purchase for factory',
        attachmentIds: [],
    };

    console.log('📦 Input Payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    console.log('\n');

    try {
        const mockRequest = {
            auth: { uid: 'LOC_MGR_KAIMANA' },
            data: testPayload,
        };

        const result = await walletTransactionHandler(mockRequest as any);

        console.log('✅ SUCCESS!');
        console.log('\n📋 Result:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\n');

        // Verify ledger entry
        const ledgerDoc = await db.collection('ledger_entries').doc(result.ledgerEntryId).get();
        if (!ledgerDoc.exists) {
            throw new Error('Ledger entry not found!');
        }
        const ledgerData = ledgerDoc.data();
        console.log(`✅ Ledger Entry ID: ${result.ledgerEntryId}`);
        console.log(`   Operation Type: ${ledgerData?.operationType}`);
        console.log(`   Debits: ${JSON.stringify(ledgerData?.lines.filter((l: any) => l.direction === 'DEBIT').map((l: any) => ({ account: l.account, amount: l.amountIdr })))}`);
        console.log(`   Credits: ${JSON.stringify(ledgerData?.lines.filter((l: any) => l.direction === 'CREDIT').map((l: any) => ({ account: l.account, amount: l.amountIdr })))}`);

        // Verify balancing
        const debits = ledgerData?.lines.filter((l: any) => l.direction === 'DEBIT').reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        const credits = ledgerData?.lines.filter((l: any) => l.direction === 'CREDIT').reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        if (Math.abs(debits - credits) < 0.01) {
            console.log(`✅ BALANCED: Debits (${debits}) == Credits (${credits})`);
        } else {
            throw new Error(`UNBALANCED: Debits (${debits}) != Credits (${credits})`);
        }

        // Verify payment record
        if (result.paymentId) {
            const paymentDoc = await db.collection('payments').doc(result.paymentId).get();
            if (!paymentDoc.exists) {
                throw new Error('Payment record not found!');
            }
            console.log(`✅ Payment ID: ${result.paymentId}`);
        }

        console.log('\n🎉 TEST T2B: PASS\n');

        // Test idempotency
        console.log('🔄 Testing Idempotency (same operationId)...');
        const result2 = await walletTransactionHandler(mockRequest as any);

        if (result2.ledgerEntryId === result.ledgerEntryId && result2.paymentId === result.paymentId) {
            console.log('✅ IDEMPOTENCY: Same result returned (no duplicate writes)');
        } else {
            throw new Error('IDEMPOTENCY FAILED: Different result returned!');
        }

    } catch (error: any) {
        console.error('❌ FAIL:', error.message);
        throw error;
    }
}

async function testT2() {
    try {
        await testT2Funding();
        await testT2Expense();

        console.log('\n🎉 ALL T2 TESTS: PASS\n');

    } catch (error: any) {
        console.error('\n❌ T2 FAILED\n');
        console.error(error.stack);
        process.exit(1);
    } finally {
        await admin.app().delete();
        process.exit(0);
    }
}

// Run tests
testT2();
