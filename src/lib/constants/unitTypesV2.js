/**
 * UNIT TYPES V2 - PRODUCTION SPEC
 * 
 * Unit-Centric Model: Each Unit has a UnitType that strictly controls:
 * - Allowed items
 * - Allowed grades
 * - Allowed processes
 * - Allowed outputs
 */

export const UNIT_TYPES_V2 = {
    GUDANG_IKAN_TERI: {
        id: 'GUDANG_IKAN_TERI',
        label: 'Gudang Ikan Teri',
        label_id: 'Gudang Ikan Teri',
        description: 'Anchovy ONLY - 3 local grades - No Tuna, no Tuna sizes, ever',
        capabilities: ['receiving', 'processing', 'storage', 'sales'],
        
        // Strict Item Control
        allowedItemTypes: ['anchovy', 'teri'],
        allowedItemIds: ['anchovy_teri', 'teri_raw', 'teri_dried_super', 'teri_dried_std', 'teri_dried_broken'],
        
        // Strict Grade Control (3 local grades)
        allowedGrades: ['Super', 'Standard', 'Broken'],
        
        // Strict Process Control
        allowedProcesses: ['Dried', 'Boiled (Salted)', 'Raw Frozen'],
        
        // Strict Output Control
        allowedOutputs: ['teri_dried_super', 'teri_dried_std', 'teri_dried_broken'],
        
        // No Tuna sizes allowed
        allowedSizes: ['100g up', '200g up', '300g up', 'Mix'],
        
        // Processing Rules
        processingRules: {
            inputTypes: ['RAW_ANCHOVY'],
            outputTypes: ['DRIED_ANCHOVY'],
            advisoryYield: { min: 30, max: 35 }
        }
    },
    
    FACTORY: {
        id: 'FACTORY',
        label: 'Factory',
        label_id: 'Pabrik',
        description: 'Multi-species processing - Recipe-based - Optional by-products',
        capabilities: ['receiving', 'processing', 'storage', 'sales'],
        
        // Multi-species allowed
        allowedItemTypes: ['tuna', 'shrimp', 'octopus', 'grouper', 'snapper', 'tenggiri', 'general'],
        allowedItemIds: [], // Dynamic based on catalog
        
        // Standard grades
        allowedGrades: ['A', 'B', 'C', 'Reject', 'Mix'],
        
        // Multi-process
        allowedProcesses: [
            'Whole Round', 'G&G (Gilled Gutted)', 'Loin', 'Steak', 'Cube', 'Saku', 
            'Ground Meat', 'Belly', 'HOSO (Head On)', 'HLSO (Headless)', 
            'P&D (Peel Deveined)', 'PTO (Peel Tail On)', 'Butterfly',
            'Whole Cleaned', 'Flower', 'Cut', 'Ball', 'Gutted', 'Fillet'
        ],
        
        // Recipe-based outputs
        allowedOutputs: [], // Dynamic based on recipe
        
        // All sizes allowed
        allowedSizes: [], // Dynamic based on item type
        
        // Processing Rules
        processingRules: {
            inputTypes: ['RAW_FISH', 'RAW_SHRIMP', 'RAW_OCTOPUS'],
            outputTypes: ['PROCESSED_FISH', 'PROCESSED_SHRIMP', 'PROCESSED_OCTOPUS'],
            byProductsOptional: true,
            advisoryYield: null // Informational only
        }
    },
    
    COLD_STORAGE: {
        id: 'COLD_STORAGE',
        label: 'Cold Storage',
        label_id: 'Gudang Beku',
        description: 'Storage only - kg/day costing ALWAYS enabled',
        capabilities: ['receiving', 'storage', 'sales'],
        
        // All items allowed for storage
        allowedItemTypes: ['all'],
        allowedItemIds: [], // Dynamic based on catalog
        
        // All grades allowed
        allowedGrades: ['A', 'B', 'C', 'Reject', 'Mix', 'Super', 'Standard', 'Broken'],
        
        // No processing
        allowedProcesses: [],
        
        // No outputs (storage only)
        allowedOutputs: [],
        
        // All sizes allowed
        allowedSizes: [], // Dynamic based on item type
        
        // Storage Rules
        storageRules: {
            costingEnabled: true,
            costPerKgPerDay: 0.10, // Default, can be overridden
            minStorageDays: 1
        }
    },
    
    TRANSPORT_BOAT: {
        id: 'TRANSPORT_BOAT',
        label: 'Transport Boat',
        label_id: 'Kapal Transportasi',
        description: 'OUR + THIRD_PARTY cargo in same trip allowed - Freight revenue per kg AND per trip - No ownership change during transport',
        capabilities: ['transport'],
        
        // All items allowed for transport
        allowedItemTypes: ['all'],
        allowedItemIds: [], // Dynamic based on catalog
        
        // All grades allowed
        allowedGrades: ['A', 'B', 'C', 'Reject', 'Mix', 'Super', 'Standard', 'Broken'],
        
        // No processing
        allowedProcesses: [],
        
        // No outputs
        allowedOutputs: [],
        
        // All sizes allowed
        allowedSizes: [], // Dynamic based on item type
        
        // Transport Rules
        transportRules: {
            allowMixedOwnership: true, // OUR + THIRD_PARTY in same trip
            freightRevenuePerKg: true,
            freightRevenuePerTrip: true,
            noOwnershipChange: true // Ownership remains unchanged during transport
        }
    },
    
    OFFICE: {
        id: 'OFFICE',
        label: 'Office / HQ',
        label_id: 'Kantor / HQ',
        description: 'Administrative unit - No operations',
        capabilities: [],
        
        // No items allowed
        allowedItemTypes: [],
        allowedItemIds: [],
        
        // No grades
        allowedGrades: [],
        
        // No processing
        allowedProcesses: [],
        
        // No outputs
        allowedOutputs: [],
        
        // No sizes
        allowedSizes: []
    }
};

/**
 * Get allowed items for a unit type
 */
export function getAllowedItems(unitType, catalog = []) {
    const type = UNIT_TYPES_V2[unitType];
    if (!type) return [];
    
    if (type.allowedItemTypes.includes('all')) {
        return catalog;
    }
    
    if (type.allowedItemIds.length > 0) {
        return catalog.filter(item => type.allowedItemIds.includes(item.id));
    }
    
    return catalog.filter(item => {
        const itemLower = item.id.toLowerCase();
        return type.allowedItemTypes.some(t => itemLower.includes(t));
    });
}

/**
 * Get allowed grades for a unit type
 */
export function getAllowedGrades(unitType) {
    const type = UNIT_TYPES_V2[unitType];
    if (!type) return [];
    return type.allowedGrades;
}

/**
 * Get allowed processes for a unit type
 */
export function getAllowedProcesses(unitType) {
    const type = UNIT_TYPES_V2[unitType];
    if (!type) return [];
    return type.allowedProcesses;
}

/**
 * Get allowed sizes for a unit type and item
 */
export function getAllowedSizes(unitType, itemId) {
    const type = UNIT_TYPES_V2[unitType];
    if (!type) return [];
    
    if (type.allowedSizes.length > 0) {
        return type.allowedSizes;
    }
    
    // Dynamic based on item type (will be implemented in phase 2)
    return [];
}

/**
 * Validate if an item is allowed for a unit type
 */
export function isItemAllowed(unitType, itemId, catalog = []) {
    const allowedItems = getAllowedItems(unitType, catalog);
    return allowedItems.some(item => item.id === itemId);
}

/**
 * Validate if a grade is allowed for a unit type
 */
export function isGradeAllowed(unitType, grade) {
    const allowedGrades = getAllowedGrades(unitType);
    return allowedGrades.includes(grade);
}

/**
 * Validate if a process is allowed for a unit type
 */
export function isProcessAllowed(unitType, process) {
    const allowedProcesses = getAllowedProcesses(unitType);
    return allowedProcesses.includes(process);
}
