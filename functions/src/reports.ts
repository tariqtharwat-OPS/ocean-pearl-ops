/**
 * Ocean Pearl OPS V2 - Reports Validator
 * Phase 4: Finance Truth (Valuation Check)
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
    const balances: Record<string, number> = {}; // Net Debit - Credit

    Object.keys(accounts).sort().forEach(acc => {
        const { debit, credit } = accounts[acc];
        console.log(
            acc.padEnd(30) +
            debit.toLocaleString('en-ID').padStart(15) +
            credit.toLocaleString('en-ID').padStart(15)
        );
        totalDebit += debit;
        totalCredit += credit;
        balances[acc] = debit - credit;
    });

    console.log('--------------------------------------------------');
    console.log(
        'TOTAL'.padEnd(30) +
        totalDebit.toLocaleString('en-ID').padStart(15) +
        totalCredit.toLocaleString('en-ID').padStart(15)
    );

    const variance = Math.abs(totalDebit - totalCredit);
    if (variance < 1) console.log('✅ BALANCED');
    else {
        console.log(`❌ UNBALANCED (Diff: ${variance})`);
        process.exit(1);
    }

    return balances;
}

async function checkInventoryValuation(ledgerBalances: Record<string, number>) {
    console.log('\n💎 INVENTORY VALUATION CHECK');
    console.log('--------------------------------------------------');

    const lots = await db.collection('inventory_lots').where('quantityKgRemaining', '>', 0).get();
    let lotValue = 0;
    lots.docs.forEach(d => {
        const val = d.data().costTotalIdr || 0;
        lotValue += val;
    });

    // Ledger Assets (Debit is positive)
    const ledgerValue = (ledgerBalances['INVENTORY_RAW'] || 0) +
        (ledgerBalances['INVENTORY_FINISHED'] || 0) +
        (ledgerBalances['INVENTORY_TRANSIT'] || 0) +
        (ledgerBalances['INVENTORY_WASTE'] || 0);

    console.log(`Lots Value (Physical):   IDR ${lotValue.toLocaleString('en-ID')}`);
    console.log(`Ledger Value (Financial): IDR ${ledgerValue.toLocaleString('en-ID')}`);

    const diff = Math.abs(lotValue - ledgerValue);
    if (diff > 100) { // Tolerance 100 IDR (rounding)
        console.error(`❌ VALUATION MISMATCH (Diff: ${diff})`);
        process.exit(1);
    } else {
        console.log('✅ VALUATION MATCH');
    }
}

async function generatePnL(balances: Record<string, number>) {
    console.log('\n📈 P&L SNAPSHOT');
    console.log('--------------------------------------------------');

    // Credits are negative in 'balances' calculation? 
    // Wait, balances = debit - credit.
    // Revenue is Credit, so Balance is Negative.
    // Let's invert for display.

    const revenue = -((balances['REVENUE_SALES'] || 0) + (balances['REVENUE_WASTE'] || 0));
    const cogs = (balances['EXPENSE_COGS'] || 0);
    const grossProfit = revenue - cogs;

    // Other Expenses
    const loss = (balances['EXPENSE_PRODUCTION_LOSS'] || 0);
    const ice = (balances['EXPENSE_ICE'] || 0);
    const totalOpex = loss + ice;

    const netIncome = grossProfit - totalOpex;

    console.log(`Revenue:       IDR ${revenue.toLocaleString('en-ID')}`);
    console.log(`COGS:          IDR ${cogs.toLocaleString('en-ID')}`);
    console.log(`Gross Profit:  IDR ${grossProfit.toLocaleString('en-ID')}`);
    console.log(`Expenses:      IDR ${totalOpex.toLocaleString('en-ID')}`);
    console.log(`Net Income:    IDR ${netIncome.toLocaleString('en-ID')}`);
}

async function main() {
    console.log('📑 Generating Validation Reports...');

    try {
        const balances = await generateTrialBalance();
        await checkInventoryValuation(balances);
        await generatePnL(balances);

        console.log('\n✅ All Validation Checks Passed');
    } catch (error) {
        console.error('❌ Report Generation Failed:', error);
        process.exit(1);
    }
}

main().then(() => process.exit(0));
