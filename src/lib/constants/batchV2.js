/**
 * BATCH V2 - TRACEABILITY MODEL
 * 
 * Batch-based traceability is mandatory
 * Every operation touches a Batch with parent lineage
 * No batch mixing: OUR, PURCHASED, THIRD_PARTY must remain separate
 */

export const BATCH_OWNERSHIP_TYPES = {
    OUR: 'OUR',
    PURCHASED: 'PURCHASED',
    THIRD_PARTY: 'THIRD_PARTY'
};

export const BATCH_STATUS = {
    ACTIVE: 'ACTIVE',
    CONSUMED: 'CONSUMED',
    SOLD: 'SOLD',
    TRANSFERRED: 'TRANSFERRED',
    EXPIRED: 'EXPIRED'
};

/**
 * Create a new Batch V2 record
 */
export function createBatchV2({
    batchId,
    locationId,
    unitId,
    itemId,
    quantityKg,
    gradeId = 'NA',
    sizeId = 'NA',
    ownershipType = BATCH_OWNERSHIP_TYPES.OUR,
    parentBatchIds = [],
    sourceType = 'PURCHASE', // PURCHASE, PRODUCTION, TRANSFER
    sourceRef = null,
    timestamp = new Date()
}) {
    return {
        batchId,
        locationId,
        unitId,
        itemId,
        quantityKg,
        gradeId,
        sizeId,
        ownershipType,
        parentBatchIds, // Array of parent batch IDs for traceability
        sourceType,
        sourceRef, // Reference to source transaction/production run
        status: BATCH_STATUS.ACTIVE,
        createdAt: timestamp,
        updatedAt: timestamp,
        
        // Traceability metadata
        metadata: {
            generation: parentBatchIds.length > 0 ? Math.max(...parentBatchIds.map(p => p.generation || 0)) + 1 : 0,
            lineage: parentBatchIds.length > 0 ? [...new Set([...parentBatchIds.flatMap(p => p.lineage || []), ...parentBatchIds])] : []
        }
    };
}

/**
 * Update batch quantity (for consumption/sale)
 */
export function updateBatchQuantity(batch, quantityChange, reason = 'ADJUSTMENT') {
    const newQuantity = batch.quantityKg + quantityChange;
    
    if (newQuantity < 0) {
        throw new Error(`Insufficient quantity in batch ${batch.batchId}. Available: ${batch.quantityKg}, Requested: ${Math.abs(quantityChange)}`);
    }
    
    return {
        ...batch,
        quantityKg: newQuantity,
        status: newQuantity === 0 ? BATCH_STATUS.CONSUMED : batch.status,
        updatedAt: new Date(),
        history: [
            ...(batch.history || []),
            {
                timestamp: new Date(),
                reason,
                quantityChange,
                quantityBefore: batch.quantityKg,
                quantityAfter: newQuantity
            }
        ]
    };
}

/**
 * Validate batch ownership mixing
 */
export function validateBatchMixing(batches) {
    if (batches.length === 0) return true;
    
    const ownershipTypes = [...new Set(batches.map(b => b.ownershipType))];
    
    if (ownershipTypes.length > 1) {
        throw new Error(`Batch mixing violation: Cannot mix ${ownershipTypes.join(', ')} in the same operation`);
    }
    
    return true;
}

/**
 * Generate batch lineage report
 */
export function getBatchLineage(batch, allBatches = []) {
    const lineage = [];
    const visited = new Set();
    
    function traverse(currentBatch) {
        if (visited.has(currentBatch.batchId)) return;
        visited.add(currentBatch.batchId);
        
        lineage.push({
            batchId: currentBatch.batchId,
            itemId: currentBatch.itemId,
            quantityKg: currentBatch.quantityKg,
            ownershipType: currentBatch.ownershipType,
            sourceType: currentBatch.sourceType,
            createdAt: currentBatch.createdAt
        });
        
        if (currentBatch.parentBatchIds && currentBatch.parentBatchIds.length > 0) {
            currentBatch.parentBatchIds.forEach(parentId => {
                const parentBatch = allBatches.find(b => b.batchId === parentId);
                if (parentBatch) {
                    traverse(parentBatch);
                }
            });
        }
    }
    
    traverse(batch);
    return lineage;
}
