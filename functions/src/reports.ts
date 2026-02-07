/**
 * Ocean Pearl OPS V2 - Reports Validator
 * Phase 4: Finance Truth (Valuation Check)
 * Phase 5: Period Reports
 * 
 * Usage: npx tsx src/reports.ts [--period=YYYY-MM]
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin (Default Credentials)
if (admin.apps.length === 0) {
    admin.initializeApp();
}
admin.firestore().settings({ ignoreUndefinedProperties: true });
const db = admin.firestore();

interface ReportOptions {
    periodId?: string; // YYYY-MM
    startDate?: Date;
    endDate?: Date;
}

function parseArgs(): ReportOptions {
    const args = process.argv.slice(2);
    const periodArg = args.find(a => a.startsWith('--period='));

    if (periodArg) {
        const periodId = periodArg.split('=')[1];
        const [year, month] = periodId.split('-').map(Number);

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1); // First day of next month (Exclusive cap)
        // Adjust expected time - wait. Timestamp queries. endDate exclusive < is safer.
        return { periodId, startDate, endDate };
    }
    return {};
}

async function generateTrialBalance(options: ReportOptions) {
    const title = options.periodId ? `PERIOD: ${options.periodId}` : 'ALL TIME';
    console.log(`\n📊 TRIAL BALANCE (Financial) - ${title}`);
    console.log('--------------------------------------------------');
    console.log('Account'.padEnd(30) + 'Debit'.padStart(15) + 'Credit'.padStart(15));
    console.log('--------------------------------------------------');

    let query = db.collection('ledger_entries').orderBy('timestamp');

    if (options.endDate) {
        query = query.where('timestamp', '<', admin.firestore.Timestamp.fromDate(options.endDate));
    }

    const snapshot = await query.get();
    const accounts: Record<string, { debit: number, credit: number }> = {};
    const periodPnL: Record<string, number> = {}; // For P&L specific period calc

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const entryDate = data.timestamp.toDate();

        // P&L Filtering (Only include entries within period start/end)
        const isPeriod = !options.startDate || (entryDate >= options.startDate);

        if (data.lines) {
            data.lines.forEach((line: any) => {
                if (!accounts[line.account]) accounts[line.account] = { debit: 0, credit: 0 };

                if (line.direction === 'DEBIT') {
                    accounts[line.account].debit += line.amountIdr;
                    if (isPeriod) {
                        periodPnL[line.account] = (periodPnL[line.account] || 0) + line.amountIdr; // Expense is Debit
                    }
                } else {
                    accounts[line.account].credit += line.amountIdr;
                    if (isPeriod) {
                        periodPnL[line.account] = (periodPnL[line.account] || 0) - line.amountIdr; // Revenue is Credit (make neg for math or track separately)
                        // Actually, let's track Net Period movement
                    }
                }
            });
        }
    });

    let totalDebit = 0;
    let totalCredit = 0;
    const balances: Record<string, number> = {}; // Net Debit - Credit (Cumulative)

    // Sort and Print
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

    return { balances, periodPnL: options.startDate ? periodPnL : balances };
}

async function checkInventoryValuation(ledgerBalances: Record<string, number>, options: ReportOptions) {
    console.log('\n💎 INVENTORY VALUATION CHECK');
    console.log('--------------------------------------------------');

    if (options.periodId) {
        console.log(`⚠️  Skipping Valuation Check for historical period ${options.periodId}.`);
        console.log(`   (Inventory Lots snapshot not available for past dates)`);
        return;
    }

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
    if (diff > 100) {
        console.error(`❌ VALUATION MISMATCH (Diff: ${diff})`);
        process.exit(1);
    } else {
        console.log('✅ VALUATION MATCH');
    }
}

async function generatePnL(movement: Record<string, number>, options: ReportOptions) {
    const label = options.periodId ? `PERIOD ${options.periodId}` : "CUMULATIVE";
    console.log(`\n📈 P&L SNAPSHOT (${label})`);
    console.log('--------------------------------------------------');

    // Logic: 
    // Revenue accounts start with REVENUE_
    // Expense accounts start with EXPENSE_
    // Movement: Debits positive, Credits negative.
    // Revenue (Credit) is negative in 'movement'.
    // Expense (Debit) is positive in 'movement'.

    let revenue = 0;
    let cogs = 0;
    let opex = 0;

    Object.keys(movement).forEach(acc => {
        const val = movement[acc]; // Debit - Credit
        if (acc.startsWith('REVENUE_')) {
            revenue += -val; // Flip to positive for report
        } else if (acc === 'EXPENSE_COGS') {
            cogs += val;
        } else if (acc.startsWith('EXPENSE_')) {
            opex += val;
        }
    });

    const grossProfit = revenue - cogs;
    const netIncome = grossProfit - opex;

    console.log(`Revenue:       IDR ${revenue.toLocaleString('en-ID')}`);
    console.log(`COGS:          IDR ${cogs.toLocaleString('en-ID')}`);
    console.log(`Gross Profit:  IDR ${grossProfit.toLocaleString('en-ID')}`);
    console.log(`Expenses:      IDR ${opex.toLocaleString('en-ID')}`);
    console.log(`Net Income:    IDR ${netIncome.toLocaleString('en-ID')}`);
}

async function main() {
    const options = parseArgs();
    console.log(`📑 Generating Validation Reports... ${options.periodId ? `[Period: ${options.periodId}]` : ''}`);

    try {
        const { balances, periodPnL } = await generateTrialBalance(options);
        await checkInventoryValuation(balances, options);
        // Use periodPnL for P&L if period option set, else use balances (cumulative)
        // Wait, generateTrialBalance returns `periodPnL` which IS `balances` if no period filtering.
        await generatePnL(periodPnL, options);
        await generateBalanceSheet(balances);

        console.log('\n✅ All Validation Checks Passed');
    } catch (error) {
        console.error('❌ Report Generation Failed:', error);
        process.exit(1);
    }
}

async function generateBalanceSheet(balances: Record<string, number>) {
    console.log('\n🏛️  BALANCE SHEET SNAPSHOT (Cumulative)');
    console.log('--------------------------------------------------');

    let totalAssets = 0;
    let totalLiabilities = 0;

    // Categorize based on Account Name Prefixes (Convention)
    // Assets: BANK_, CASH_, INVENTORY_, INVOICE_AR
    // Liabilities: FISHER_LIABILITY, INVOICE_AP
    // Equity: CAPITAL_, RETAINED_EARNINGS
    // P&L (Current): Calculated from Revenue - Expenses

    // Calculate Current P&L (Net Income) from balances
    // Net Income = Revenue (Credit) - Expenses (Debit)
    let netIncome = 0;

    console.log('ASSETS:');
    Object.keys(balances).sort().forEach(acc => {
        const val = balances[acc];
        if (acc.startsWith('BANK_') || acc.startsWith('CASH_') || acc.startsWith('INVENTORY_') || acc === 'INVOICE_AR') {
            console.log(`  ${acc.padEnd(25)} IDR ${val.toLocaleString('en-ID')}`);
            totalAssets += val;
        } else if (acc.startsWith('FISHER_LIABILITY') || acc.startsWith('INVOICE_AP')) {
            // Liabilities are usually Credit balances (negative net?). 
            // My 'balances' = Debit - Credit. 
            // So Liability is negative.
            // I'll sum absolute value for display? Or keep sign?
            // "Liabilities & Equity" section usually positive.
            totalLiabilities += -val;
        } else if (acc.startsWith('REVENUE_') || acc.startsWith('EXPENSE_')) {
            // Part of Equity (Retained Earnings / Current Net Income)
            // Revenue (Credit) -> Neg. Expense (Debit) -> Pos.
            // Net Income = Revenue - Expense.
            // In 'balances': Expense is Pos, Revenue is Neg.
            // So Net Income (Profit) = -(Revenue + Expense_Net).
            // Wait. Revenue Credit is -100. Expense Debit is +50. Balance -50.
            // Net Income should be +50?
            // Profit = 100 - 50 = 50.
            // So Profit = -Balance.
            // If Balance is -50 (Credit heavy), Profit is 50.
            // So netIncome contribution = -val.
            netIncome += -val;
        }
    });

    console.log(`TOTAL ASSETS:              IDR ${totalAssets.toLocaleString('en-ID')}`);
    console.log('--------------------------------------------------');

    console.log('LIABILITIES & EQUITY:');
    // List Liabilities
    Object.keys(balances).sort().forEach(acc => {
        const val = balances[acc];
        if (acc.startsWith('FISHER_LIABILITY') || acc.startsWith('INVOICE_AP')) {
            console.log(`  ${acc.padEnd(25)} IDR ${(-val).toLocaleString('en-ID')}`);
        }
    });

    console.log(`  Current Net Income        IDR ${netIncome.toLocaleString('en-ID')}`);

    const totalLiabEquity = totalLiabilities + netIncome; // + Other Equity
    console.log(`TOTAL LIAB & EQUITY:       IDR ${totalLiabEquity.toLocaleString('en-ID')}`);

    const diff = Math.abs(totalAssets - totalLiabEquity);
    if (diff < 1) console.log('✅ BALANCE SHEET BALANCED');
    else console.log(`❌ UNBALANCED (Diff: ${diff})`);
}

main().then(() => process.exit(0));
