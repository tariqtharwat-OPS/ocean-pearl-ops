/**
 * Test T4: Waste Sale Handler
 * Flow: Receive -> Produce (Generate Waste) -> Sell Waste
 */

import admin from 'firebase-admin';
import { receivingLogic } from '../src/handlers/receivingHandler.js';
import { productionLogic } from '../src/handlers/productionHandler.js';
import { wasteSaleLogic } from '../src/handlers/wasteSaleHandler.js';

// Initialize Firebase Admin
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

// Test Data Matches T3 Scenario
const TEST_UNIT_ID = 'kaimana-factory-1';
const TEST_BOAT_ID = 'kaimana-fishing-1';
const RAW_ITEM_ID = 'shark-sardine';
const FROZEN_ITEM_ID = 'sardine-frozen';
const WASTE_ITEM_ID = 'waste-mix';
const BUYER_ID = 'local-buyer-1';

// Helper: Setup Waste Lot (Runs T1 and T3 Logic)
async function setupWasteLot() {
    console.log('🔧 Setup: Creating Waste Lot via Receive -> Produce...');

    // 1. Receive 500kg Raw
    const receiveOpId = `setup-recv-t4-${Date.now()}`;
    const recvRes = await receivingLogic({
        auth: { uid: 'SETUP_BOT' },
        data: {
            operationId: receiveOpId,
            locationId: 'kaimana',
            unitId: TEST_UNIT_ID,
            boatId: TEST_BOAT_ID,
            itemId: RAW_ITEM_ID,
            quantityKg: 500,
            pricePerKgIdr: 15000,
            fisherId: 'partner-123',
            actorUserId: 'SETUP_BOT'
        }
    } as any);
    console.log(`   Received Lot: ${recvRes.lotId}`);

    // 2. Produce (Raw -> Frozen + Waste)
    const prodOpId = `setup-prod-t4-${Date.now()}`;
    const prodRes = await productionLogic({
        auth: { uid: 'SETUP_BOT' },
        data: {
            operationId: prodOpId,
            locationId: 'kaimana',
            unitId: TEST_UNIT_ID,
            inputLots: [{ lotId: recvRes.lotId, quantityKg: 500 }],
            outputLots: [
                { itemId: FROZEN_ITEM_ID, quantityKg: 480, grade: 'A', status: 'FROZEN' },
                { itemId: WASTE_ITEM_ID, quantityKg: 20, status: 'REJECT_SELLABLE' } // Waste Lot @ Index 1
            ],
            costPerKgIdr: 15000,
            actorUserId: 'SETUP_BOT'
        }
    } as any);

    const wasteLotId = prodRes.outputLotIds[1];
    console.log(`   Produced Waste Lot: ${wasteLotId} (20 kg)`);
    return wasteLotId;
}

// Main Test
async function runTest() {
    console.log('\n🧪 TEST T4: Waste Sale Handler');
    console.log('=====================================');

    try {
        const wasteLotId = await setupWasteLot();

        console.log('\n▶️  Executing Waste Sale...');
        const operationId = `test-sale-waste-${Date.now()}`;
        const salePrice = 5000; // 5000 IDR/kg for waste

        const salePayload = {
            operationId,
            locationId: 'kaimana',
            unitId: TEST_UNIT_ID,
            buyerId: BUYER_ID,
            items: [
                {
                    lotId: wasteLotId,
                    quantityKg: 20, // Sell ALL 20kg
                    pricePerKgIdr: salePrice
                }
            ],
            actorUserId: 'UNIT_OP_FACTORY1',
            notes: 'Test T4: Selling waste to local buyer'
        };

        // CALL HANDLER LOGIC
        const result = await wasteSaleLogic({
            auth: { uid: 'UNIT_OP_FACTORY1' },
            data: salePayload
        } as any);

        console.log('\n✅ Sale Success!');
        console.log(`   Ledger Entry ID: ${result.ledgerEntryId}`);
        console.log(`   Invoice ID: ${result.invoiceId}`);

        // Step 3: Verify Ledger
        console.log('\n🔍 Verifying Ledger...');
        const ledgerDoc = await db.collection('ledger_entries').doc(result.ledgerEntryId).get();
        const ledgerData = ledgerDoc.data();
        if (!ledgerData) throw new Error('Ledger entry not found');

        const debits = ledgerData.lines.filter((l: any) => l.direction === 'DEBIT');
        const credits = ledgerData.lines.filter((l: any) => l.direction === 'CREDIT');

        const totalDebit = debits.reduce((sum: number, l: any) => sum + l.amountIdr, 0);
        const totalCredit = credits.reduce((sum: number, l: any) => sum + l.amountIdr, 0);

        console.log(`   Total DEBIT (AR): ${totalDebit}`);
        console.log(`   Total CREDIT (REVENUE): ${totalCredit}`);

        const expectedAmount = 20 * salePrice; // 100,000
        if (totalDebit !== expectedAmount) throw new Error(`Debit mismatch: expected ${expectedAmount}, got ${totalDebit}`);
        if (Math.abs(totalDebit - totalCredit) > 1) throw new Error('Unbalanced Ledger');

        if (debits[0].account !== 'INVOICE_AR') throw new Error('First debit must be INVOICE_AR');
        if (credits[0].account !== 'REVENUE_WASTE') throw new Error('First credit must be REVENUE_WASTE');

        console.log('✅ Ledger Correct and Balanced');

        // Step 4: Verify Invoice
        console.log('\n🔍 Verifying Invoice...');
        const invoiceDoc = await db.collection('invoices').doc(result.invoiceId).get();
        const invoiceData = invoiceDoc.data();
        if (!invoiceData) throw new Error('Invoice not found');

        if (invoiceData.totalAmountIdr !== expectedAmount) throw new Error('Invoice amount mismatch');
        if (invoiceData.partnerId !== BUYER_ID) throw new Error('Invoice partner mismatch');
        console.log('✅ Invoice Correct');

        // Step 5: Verify Lot Consumption
        console.log('\n🔍 Verifying Lot Consumption...');
        const lotDoc = await db.collection('inventory_lots').doc(wasteLotId).get();
        const lotData = lotDoc.data();
        console.log(`   Remaining Qty: ${lotData?.quantityKgRemaining}`);
        if (lotData?.quantityKgRemaining !== 0) throw new Error('Lot not fully consumed');
        console.log('✅ Lot Updated');

        // Step 6: Verify Trace Links
        console.log('\n🔍 Verifying Trace Links...');
        const traces = await db.collection('trace_links')
            .where('eventId', '==', result.ledgerEntryId)
            .get();

        console.log(`   Trace Links Found: ${traces.size}`);
        if (traces.size !== 1) throw new Error(`Expected 1 trace link, got ${traces.size}`);

        const traceData = traces.docs[0].data();
        if (traceData.type !== 'SELL') throw new Error('Trace link type must be SELL');
        if (traceData.toLotId !== BUYER_ID) throw new Error('Trace link toLotId must be buyerId');
        console.log('✅ Trace Link Correct');

        // Step 7: Idempotency
        console.log('\n🔄 Checking Idempotency...');
        const retryResult = await wasteSaleLogic({
            auth: { uid: 'UNIT_OP_FACTORY1' },
            data: salePayload
        } as any);

        if (retryResult.ledgerEntryId === result.ledgerEntryId) {
            console.log('✅ IDEMPOTENCY: Same result returned');
        } else {
            throw new Error('Idempotency failed');
        }

        console.log('\n🎉 TEST T4: PASS');

    } catch (error) {
        console.error('\n❌ FAIL:', error);
        process.exit(1);
    }
}

runTest();
