/**
 * UNIT TYPE VALIDATION - BACKEND ENFORCEMENT
 * 
 * Server-side validation for unit type specialization rules
 */

const UNIT_TYPES_V2 = {
    GUDANG_IKAN_TERI: {
        id: 'GUDANG_IKAN_TERI',
        allowedItemTypes: ['anchovy', 'teri'],
        allowedGrades: ['Super', 'Standard', 'Broken'],
        allowedProcesses: ['Dried', 'Boiled (Salted)', 'Raw Frozen']
    },
    FACTORY: {
        id: 'FACTORY',
        allowedItemTypes: ['tuna', 'shrimp', 'octopus', 'grouper', 'snapper', 'tenggiri', 'general'],
        allowedGrades: ['A', 'B', 'C', 'Reject', 'Mix'],
        allowedProcesses: [
            'Whole Round', 'G&G (Gilled Gutted)', 'Loin', 'Steak', 'Cube', 'Saku', 
            'Ground Meat', 'Belly', 'HOSO (Head On)', 'HLSO (Headless)', 
            'P&D (Peel Deveined)', 'PTO (Peel Tail On)', 'Butterfly',
            'Whole Cleaned', 'Flower', 'Cut', 'Ball', 'Gutted', 'Fillet'
        ]
    },
    COLD_STORAGE: {
        id: 'COLD_STORAGE',
        allowedItemTypes: ['all'],
        allowedGrades: ['A', 'B', 'C', 'Reject', 'Mix', 'Super', 'Standard', 'Broken'],
        allowedProcesses: []
    },
    FROZEN_FACTORY: {
        id: 'FROZEN_FACTORY',
        allowedItemTypes: ['tuna', 'shrimp', 'octopus', 'grouper', 'snapper', 'tenggiri', 'general'],
        allowedGrades: ['A', 'B', 'C', 'Reject', 'Mix'],
        allowedProcesses: [
            'Whole Round', 'G&G (Gilled Gutted)', 'Loin', 'Steak', 'Cube', 'Saku', 
            'Ground Meat', 'Belly', 'HOSO (Head On)', 'HLSO (Headless)', 
            'P&D (Peel Deveined)', 'PTO (Peel Tail On)', 'Butterfly',
            'Whole Cleaned', 'Flower', 'Cut', 'Ball', 'Gutted', 'Fillet'
        ]
    },
    PROCESSING_DRY: {
        id: 'PROCESSING_DRY',
        allowedItemTypes: ['anchovy', 'teri'],
        allowedGrades: ['Super', 'Standard', 'Broken'],
        allowedProcesses: ['Dried', 'Boiled (Salted)', 'Raw Frozen']
    },
    OFFICE: {
        id: 'OFFICE',
        allowedItemTypes: [],
        allowedGrades: [],
        allowedProcesses: []
    }
};

const UNIT_TYPE_MAPPING = {
    'office': 'OFFICE',
    'cold_storage': 'COLD_STORAGE',
    'gudang_ikan_teri': 'PROCESSING_DRY',
    'frozen_fish': 'FROZEN_FACTORY'
};

/**
 * Get unit type from unit ID
 */
function getUnitType(unitId) {
    return UNIT_TYPE_MAPPING[unitId] || null;
}

/**
 * Validate if an item is allowed for a unit type
 */
function isItemAllowed(unitType, itemId) {
    const type = UNIT_TYPES_V2[unitType];
    if (!type) return true; // Unknown unit type, allow all
    
    if (type.allowedItemTypes.includes('all')) return true;
    
    if (type.allowedItemTypes.length === 0) return false; // No items allowed
    
    const itemLower = itemId.toLowerCase();
    return type.allowedItemTypes.some(t => itemLower.includes(t));
}

/**
 * Validate if a grade is allowed for a unit type
 */
function isGradeAllowed(unitType, grade) {
    const type = UNIT_TYPES_V2[unitType];
    if (!type) return true; // Unknown unit type, allow all
    
    if (type.allowedGrades.length === 0) return true; // All grades allowed
    
    return type.allowedGrades.includes(grade);
}

/**
 * Validate if a process is allowed for a unit type
 */
function isProcessAllowed(unitType, process) {
    const type = UNIT_TYPES_V2[unitType];
    if (!type) return true; // Unknown unit type, allow all
    
    if (type.allowedProcesses.length === 0) return false; // No processing allowed
    
    return type.allowedProcesses.includes(process);
}

/**
 * Validate transaction against unit type rules
 */
function validateTransaction(unitId, itemId, gradeId, processType = null) {
    const unitType = getUnitType(unitId);
    
    if (!unitType) {
        // Unknown unit type, skip validation
        return { valid: true };
    }
    
    // Validate item
    if (itemId && !isItemAllowed(unitType, itemId)) {
        return {
            valid: false,
            error: `Item ${itemId} is not allowed for unit type ${unitType}`
        };
    }
    
    // Validate grade
    if (gradeId && gradeId !== 'NA' && !isGradeAllowed(unitType, gradeId)) {
        return {
            valid: false,
            error: `Grade ${gradeId} is not allowed for unit type ${unitType}`
        };
    }
    
    // Validate process
    if (processType && !isProcessAllowed(unitType, processType)) {
        return {
            valid: false,
            error: `Process ${processType} is not allowed for unit type ${unitType}`
        };
    }
    
    return { valid: true };
}

module.exports = {
    UNIT_TYPES_V2,
    getUnitType,
    isItemAllowed,
    isGradeAllowed,
    isProcessAllowed,
    validateTransaction
};
