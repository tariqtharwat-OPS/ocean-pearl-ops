/**
 * Test T1: Receiving Handler
 * Tests boat catch delivery workflow
 */

import admin from 'firebase-admin';
import { receivingHandler } from '../src/handlers/receivingHandler.js';

// Initialize Firebase Admin (use your service account)
admin.initializeApp();

const db = admin.firestore();

async function testT1() {
    console.log('🧪 TEST T1: Receiving Handler');
    console.log('=====================================\n');

    const testPayload = {
        operationId: 'test-receive-001-' + Date.now(), // Unique for idempotency
        locationId: 'kaimana',
        unitId: 'kaimana-fishing-1',
        boatId: 'kaimana-fishing-1',
        itemId: 'sardine',
        quantityKg: 500,
        grade: 'A',
        pricePerKgIdr: 15000,
        fisherId: 'partner-fisher1',
        actorUserId: 'UNIT_OP_FACTORY1',
        notes: 'Test T1: Morning catch delivery',
    };

    console.log('📦 Input Payload:');
    console.log(JSON.stringify(testPayload, null, 2));
    console.log('\n');

    try {
        // Simulate authenticated request
        const mockRequest = {
            auth: {
                uid: 'UNIT_OP_FACTORY1',
            },
            data: testPayload,
        };

        // Call handler directly (simulating Cloud Function call)
        const result = await receivingHandler(mockRequest as any);

        console.log('✅ SUCCESS!');
        console.log('\n📋 Result:');
        console.log(JSON.stringify(result, null, 2));
        console.log('\n');

        // Verify data in Firestore
        console.log('🔍 Verification:');

        // 1. Check Ledger Entry
        const ledgerDoc = await db.collection('ledger_entries').doc(result.ledgerEntryId).get();
        if (!ledgerDoc.exists) {
            throw new Error('Ledger entry not found!');
        }
        const ledgerData = ledgerDoc.data();
        console.log(`✅ Ledger Entry ID: ${result.ledgerEntryId}`);
        console.log(`   Operation ID: ${ledgerData?.operationId}`);
        console.log(`   Debits: ${JSON.stringify(ledgerData?.lines.filter((l: any) => l.direction === 'DEBIT').map((l: any) => ({ account: l.account, amount: l.amountIdr })))}`);
        console.log(`   Credits: ${JSON.stringify(ledgerData?.lines.filter((l: any) => l.direction === 'CREDIT').map((l: any) => ({ account: l.account, amount: l.amountIdr })))}`);

        // Verify double-entry balancing
        const debits = ledgerData?.lines.filter((l: any) => l.direction === 'DEBIT').reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        const credits = ledgerData?.lines.filter((l: any) => l.direction === 'CREDIT').reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        if (Math.abs(debits - credits) < 0.01) {
            console.log(`✅ BALANCED: Debits (${debits}) == Credits (${credits})`);
        } else {
            throw new Error(`UNBALANCED: Debits (${debits}) != Credits (${credits})`);
        }

        // 2. Check Inventory Lot
        const lotDoc = await db.collection('inventory_lots').doc(result.lotId).get();
        if (!lotDoc.exists) {
            throw new Error('Inventory lot not found!');
        }
        const lotData = lotDoc.data();
        console.log(`✅ Inventory Lot ID: ${result.lotId}`);
        console.log(`   Item: ${lotData?.itemId}, Quantity: ${lotData?.quantityKgRemaining} KG`);
        console.log(`   Origin: ${lotData?.origin.sourceType} from ${lotData?.origin.boatId}`);

        // 3. Check Trace Link
        const traceLinkDoc = await db.collection('trace_links').doc(result.traceLinkId).get();
        if (!traceLinkDoc.exists) {
            throw new Error('Trace link not found!');
        }
        console.log(`✅ Trace Link ID: ${result.traceLinkId}`);

        console.log('\n🎉 TEST T1: PASS\n');

        // Test idempotency: call again with same operationId
        console.log('🔄 Testing Idempotency (same operationId)...');
        const result2 = await receivingHandler(mockRequest as any);

        if (result2.ledgerEntryId === result.ledgerEntryId && result2.lotId === result.lotId) {
            console.log('✅ IDEMPOTENCY: Same result returned (no duplicate writes)');
        } else {
            throw new Error('IDEMPOTENCY FAILED: Different result returned!');
        }

    } catch (error: any) {
        console.error('❌ FAIL:', error.message);
        console.error(error.stack);
        console.log('\n');
        process.exit(1);
    } finally {
        await admin.app().delete();
        process.exit(0);
    }
}

// Run test
testT1();
