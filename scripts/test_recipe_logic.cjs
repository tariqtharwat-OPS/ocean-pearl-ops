// Simulate the Logic from ProductionRun.jsx
const { PROCESS_RECIPES } = require('../functions/recipes'); // Use backend version for CJS test
const { PROCESSING_CONFIG } = require('../functions/index'); // Might not export constants directly?
// actually constants are in src/lib/constants.js (ESM) and functions/index.js (CJS mix).
// I created functions/recipes.js in Step 1911 as CJS.

function getYieldStatus(recipe, inputKg, outputKg) {
    if (inputKg === 0) return { msg: 'Enter Input' };
    const yieldPercent = (outputKg / inputKg) * 100;

    // Logic from ProductionRun.jsx
    if (recipe && recipe.advisoryYield) {
        if (yieldPercent < recipe.advisoryYield.min) return { status: 'LOW_YIELD', msg: `Yield ${yieldPercent.toFixed(1)}% < ${recipe.advisoryYield.min}%` };
        if (yieldPercent > recipe.advisoryYield.max) return { status: 'HIGH_YIELD', msg: `Yield ${yieldPercent.toFixed(1)}% > ${recipe.advisoryYield.max}%` };
        return { status: 'OK', msg: `Yield ${yieldPercent.toFixed(1)}% OK` };
    }

    return { status: 'INFO', msg: `Yield ${yieldPercent.toFixed(1)}% (No Limit)` };
}

console.log("=== PHASE 6.2 LOGIC VERIFICATION ===");

// 1. ANCHOVY
const anchovyRecipe = PROCESS_RECIPES.ANCHOVY_DRYING;
console.log(`\nRecipe: ${anchovyRecipe.label}`);
console.log(`Range: ${anchovyRecipe.advisoryYield.min}% - ${anchovyRecipe.advisoryYield.max}%`);

// Test A: Normal (33%)
const resA = getYieldStatus(anchovyRecipe, 100, 33);
console.log(`[TEST] Input 100, Output 33 -> ${resA.status} (${resA.msg})`);
if (resA.status !== 'OK') console.error("FAIL: 33% should be OK");

// Test B: Low (25%)
const resB = getYieldStatus(anchovyRecipe, 100, 25);
console.log(`[TEST] Input 100, Output 25 -> ${resB.status} (${resB.msg})`);
if (resB.status !== 'LOW_YIELD') console.error("FAIL: 25% should be LOW_YIELD");

// Test C: High (40%)
const resC = getYieldStatus(anchovyRecipe, 100, 40);
console.log(`[TEST] Input 100, Output 40 -> ${resC.status} (${resC.msg})`);
if (resC.status !== 'HIGH_YIELD') console.error("FAIL: 40% should be HIGH_YIELD");

// 2. FROZEN
const frozenRecipe = PROCESS_RECIPES.FROZEN_CUTS;
console.log(`\nRecipe: ${frozenRecipe.label}`);
console.log(`Range: ${frozenRecipe.advisoryYield ? 'Has Range' : 'No Advisory Range'}`);

// Test D: Normal
const resD = getYieldStatus(frozenRecipe, 100, 50);
console.log(`[TEST] Input 100, Output 50 -> ${resD.status} (${resD.msg})`);
if (resD.status !== 'INFO') console.error("FAIL: Frozen should be INFO only");

console.log("\n=== VERIFICATION COMPLETE ===");
