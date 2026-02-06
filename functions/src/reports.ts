/**
 * Ocean Pearl OPS V2 - Reports Validator
 * Phase 3: Financial & Inventory Reporting
 * 
 * Usage: npx tsx src/reports.ts
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin (Default Credentials)
if (admin.apps.length === 0) {
    admin.initializeApp();
}
admin.firestore().settings({ ignoreUndefinedProperties: true });
const db = admin.firestore();

async function generateTrialBalance() {
    console.log('\n📊 TRIAL BALANCE (Financial)');
    console.log('--------------------------------------------------');
    console.log('Account'.padEnd(30) + 'Debit'.padStart(15) + 'Credit'.padStart(15));
    console.log('--------------------------------------------------');

    const snapshot = await db.collection('ledger_entries').get();
    const accounts: Record<string, { debit: number, credit: number }> = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.lines) {
            data.lines.forEach((line: any) => {
                if (!accounts[line.account]) accounts[line.account] = { debit: 0, credit: 0 };

                if (line.direction === 'DEBIT') accounts[line.account].debit += line.amountIdr;
                else accounts[line.account].credit += line.amountIdr;
            });
        }
    });

    let totalDebit = 0;
    let totalCredit = 0;

    Object.keys(accounts).sort().forEach(acc => {
        const { debit, credit } = accounts[acc];
        console.log(
            acc.padEnd(30) +
            debit.toLocaleString('en-ID').padStart(15) +
            credit.toLocaleString('en-ID').padStart(15)
        );
        totalDebit += debit;
        totalCredit += credit;
    });

    console.log('--------------------------------------------------');
    console.log(
        'TOTAL'.padEnd(30) +
        totalDebit.toLocaleString('en-ID').padStart(15) +
        totalCredit.toLocaleString('en-ID').padStart(15)
    );

    const variance = Math.abs(totalDebit - totalCredit);
    if (variance < 1) console.log('✅ BALANCED');
    else console.log(`❌ UNBALANCED (Diff: ${variance})`);

    return accounts;
}

async function generateInventoryReport() {
    console.log('\n📦 INVENTORY REPORT (Operational)');
    console.log('-----------------------------------------------------------');
    console.log('Item'.padEnd(20) + 'Status'.padEnd(15) + 'Location'.padEnd(15) + 'Quantity (kg)'.padStart(10));
    console.log('-----------------------------------------------------------');

    const snapshot = await db.collection('inventory_lots').where('quantityKgRemaining', '>', 0).get();
    const inventory: Record<string, number> = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        // Key: Item | Status | Location
        const key = `${data.itemId}|${data.status}|${data.locationId}`;
        inventory[key] = (inventory[key] || 0) + data.quantityKgRemaining;
    });

    let totalKg = 0;
    Object.keys(inventory).sort().forEach(key => {
        const [item, status, loc] = key.split('|');
        const qty = inventory[key];
        console.log(
            item.padEnd(20) +
            status.padEnd(15) +
            loc.padEnd(15) +
            qty.toLocaleString('en-ID').padStart(10)
        );
        totalKg += qty;
    });

    console.log('-----------------------------------------------------------');
    console.log('TOTAL ON HAND'.padEnd(50) + totalKg.toLocaleString('en-ID').padStart(10));
}

async function main() {
    console.log('📑 Generating Validation Reports...');

    try {
        await generateTrialBalance();
        await generateInventoryReport();
        console.log('\n✅ Reports Generated Successfully');
    } catch (error) {
        console.error('❌ Report Generation Failed:', error);
        process.exit(1);
    }
}

main().then(() => process.exit(0));
