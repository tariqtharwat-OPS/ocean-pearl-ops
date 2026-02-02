/**
 * PROCESSING RUN V2 - FACTORY OUTPUT MODEL
 * 
 * Each ProcessingRun may produce:
 * - Primary products (stocked)
 * - Secondary products / by-products (optional, stocked, ad-hoc)
 * - True waste (logged only, never stocked)
 */

export const OUTPUT_TYPES = {
    PRIMARY: 'PRIMARY',
    BY_PRODUCT: 'BY_PRODUCT',
    WASTE: 'WASTE'
};

export const PROCESSING_STATUS = {
    PLANNED: 'PLANNED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
};

/**
 * Create a new Processing Run V2 record
 */
export function createProcessingRunV2({
    runId,
    locationId,
    unitId,
    recipeId,
    recipeName,
    inputBatchIds = [],
    inputItemId,
    inputQuantityKg,
    outputs = [], // Array of { type, itemId, quantityKg, gradeId, sizeId, batchId }
    wasteKg = 0,
    wasteDescription = '',
    operatorId,
    timestamp = new Date()
}) {
    // Calculate yield
    const totalOutputKg = outputs
        .filter(o => o.type !== OUTPUT_TYPES.WASTE)
        .reduce((sum, o) => sum + o.quantityKg, 0);
    
    const yieldPercentage = inputQuantityKg > 0 
        ? (totalOutputKg / inputQuantityKg) * 100 
        : 0;
    
    return {
        runId,
        locationId,
        unitId,
        recipeId,
        recipeName,
        
        // Input tracking
        inputBatchIds,
        inputItemId,
        inputQuantityKg,
        
        // Output tracking
        outputs: outputs.map(o => ({
            type: o.type || OUTPUT_TYPES.PRIMARY,
            itemId: o.itemId,
            quantityKg: o.quantityKg,
            gradeId: o.gradeId || 'NA',
            sizeId: o.sizeId || 'NA',
            batchId: o.batchId, // Generated batch ID for this output
            stocked: o.type !== OUTPUT_TYPES.WASTE
        })),
        
        // Waste tracking
        wasteKg,
        wasteDescription,
        
        // Yield calculation
        totalInputKg: inputQuantityKg,
        totalOutputKg,
        totalWasteKg: wasteKg,
        yieldPercentage,
        
        // Metadata
        operatorId,
        status: PROCESSING_STATUS.COMPLETED,
        createdAt: timestamp,
        updatedAt: timestamp
    };
}

/**
 * Add by-product to processing run
 */
export function addByProduct(processingRun, byProduct) {
    const newOutput = {
        type: OUTPUT_TYPES.BY_PRODUCT,
        itemId: byProduct.itemId,
        quantityKg: byProduct.quantityKg,
        gradeId: byProduct.gradeId || 'NA',
        sizeId: byProduct.sizeId || 'NA',
        batchId: byProduct.batchId,
        stocked: true
    };
    
    const updatedOutputs = [...processingRun.outputs, newOutput];
    
    // Recalculate yield
    const totalOutputKg = updatedOutputs
        .filter(o => o.type !== OUTPUT_TYPES.WASTE)
        .reduce((sum, o) => sum + o.quantityKg, 0);
    
    const yieldPercentage = processingRun.inputQuantityKg > 0 
        ? (totalOutputKg / processingRun.inputQuantityKg) * 100 
        : 0;
    
    return {
        ...processingRun,
        outputs: updatedOutputs,
        totalOutputKg,
        yieldPercentage,
        updatedAt: new Date()
    };
}

/**
 * Validate yield against advisory range
 */
export function validateYield(processingRun, advisoryYield = null) {
    if (!advisoryYield) return { valid: true, warning: null };
    
    const { yieldPercentage } = processingRun;
    const { min, max } = advisoryYield;
    
    if (yieldPercentage < min) {
        return {
            valid: true,
            warning: 'CRITICAL_LOW_YIELD',
            message: `Yield ${yieldPercentage.toFixed(1)}% is below advisory minimum ${min}%`
        };
    }
    
    if (yieldPercentage > max) {
        return {
            valid: true,
            warning: 'HIGH_YIELD',
            message: `Yield ${yieldPercentage.toFixed(1)}% is above advisory maximum ${max}%`
        };
    }
    
    return {
        valid: true,
        warning: null,
        message: `Yield ${yieldPercentage.toFixed(1)}% is within advisory range ${min}%-${max}%`
    };
}

/**
 * Calculate material cost per kg for outputs
 */
export function calculateOutputCost(processingRun, inputCostPerKg) {
    const totalOutputKg = processingRun.totalOutputKg;
    
    if (totalOutputKg === 0) return 0;
    
    // Total material cost
    const totalMaterialCost = processingRun.inputQuantityKg * inputCostPerKg;
    
    // Cost per kg of output (material only, excludes processing cost)
    const materialCostPerKg = totalMaterialCost / totalOutputKg;
    
    return {
        totalMaterialCost,
        materialCostPerKg,
        outputs: processingRun.outputs
            .filter(o => o.type !== OUTPUT_TYPES.WASTE)
            .map(o => ({
                ...o,
                materialCost: o.quantityKg * materialCostPerKg,
                materialCostPerKg
            }))
    };
}

/**
 * Get processing run summary
 */
export function getProcessingRunSummary(processingRun) {
    const primaryOutputs = processingRun.outputs.filter(o => o.type === OUTPUT_TYPES.PRIMARY);
    const byProducts = processingRun.outputs.filter(o => o.type === OUTPUT_TYPES.BY_PRODUCT);
    const waste = processingRun.outputs.filter(o => o.type === OUTPUT_TYPES.WASTE);
    
    return {
        runId: processingRun.runId,
        recipeName: processingRun.recipeName,
        inputKg: processingRun.inputQuantityKg,
        primaryOutputKg: primaryOutputs.reduce((sum, o) => sum + o.quantityKg, 0),
        byProductKg: byProducts.reduce((sum, o) => sum + o.quantityKg, 0),
        wasteKg: processingRun.wasteKg,
        yieldPercentage: processingRun.yieldPercentage,
        primaryOutputCount: primaryOutputs.length,
        byProductCount: byProducts.length,
        status: processingRun.status,
        createdAt: processingRun.createdAt
    };
}
