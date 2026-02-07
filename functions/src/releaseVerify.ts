import { execSync } from 'child_process';

console.log('🏁 Starting PHASE 6 RELEASE VERIFICATION...\n');

const run = (cmd: string, desc: string) => {
    console.log(`\n👉 START: ${desc}`);
    console.log(`   Command: ${cmd}`);
    try {
        execSync(cmd, { stdio: 'inherit', cwd: process.cwd(), encoding: 'utf-8' });
        console.log(`✅ PASS: ${desc}`);
    } catch (e) {
        console.error(`\n❌ FAIL: ${desc}`);
        process.exit(1);
    }
};

// A) Seed Reset
run('npm run seed -- --reset', 'Initial Seed Reset');

// B) Run Critical Tests (With Isolation Resets)
run('npx tsx tests/testT7.ts', 'Test T7 (Cost/Trace)');

run('npm run seed -- --reset', 'Reset for T8');
run('npx tsx tests/testT8.ts', 'Test T8 (Inventory Sync)');

run('npm run seed -- --reset', 'Reset for T9');
run('npx tsx tests/testT9.ts', 'Test T9 (Period Locking)');

run('npm run seed -- --reset', 'Reset for T10');
run('npx tsx tests/testT10.ts', 'Test T10 (AR Settlement)');

run('npm run seed -- --reset', 'Reset for T11');
run('npx tsx tests/testT11.ts', 'Test T11 (Fisher Payment)');

// C) Run Simulation
run('npm run seed -- --reset', 'Reset for Simulation');
run('npx tsx src/simulation.ts', '7-Day Simulation');

// D) Run Reports Validation
run('npx tsx src/reports.ts', 'Reports & Invariant Check');

console.log('\n✨ RELEASE CANDIDATE VERIFIED: GO');
