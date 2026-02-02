/**
 * UNIT TYPE FILTERING - V2
 * Simple filtering logic for unit-specific constraints
 */

// Unit type definitions with allowed items and grades
export const UNIT_TYPE_RULES = {
    gudang_ikan_teri: {
        allowedItemKeywords: ['anchovy', 'teri'],
        allowedGrades: ['Super', 'Standard', 'Broken'],
        blockedItemKeywords: ['tuna', 'yellowfin', 'skipjack']
    },
    frozen_fish: {
        allowedItemKeywords: [], // All items allowed
        allowedGrades: ['A', 'B', 'C', 'Reject', 'Mix'],
        blockedItemKeywords: []
    },
    cold_storage: {
        allowedItemKeywords: [], // All items allowed
        allowedGrades: ['A', 'B', 'C', 'Reject', 'Mix'],
        blockedItemKeywords: []
    },
    office: {
        allowedItemKeywords: [],
        allowedGrades: [],
        blockedItemKeywords: []
    }
};

/**
 * Filter items based on unit type
 */
export function filterItemsByUnit(items, unitId) {
    console.log('[V2 Filter] Unit ID:', unitId);
    console.log('[V2 Filter] Total items before filter:', items.length);
    
    if (!unitId || !UNIT_TYPE_RULES[unitId]) {
        console.log('[V2 Filter] No rules found for unit, returning all items');
        return items; // No filtering if unit not recognized
    }

    const rules = UNIT_TYPE_RULES[unitId];
    console.log('[V2 Filter] Rules:', rules);
    
    // If no allowed keywords specified, allow all (unless blocked)
    if (rules.allowedItemKeywords.length === 0 && rules.blockedItemKeywords.length === 0) {
        return items;
    }

    const filteredItems = items.filter(item => {
        const itemName = (item.name || '').toLowerCase();
        const itemLabel = (item.label || '').toLowerCase();
        const itemId = (item.id || '').toLowerCase();
        const searchText = `${itemName} ${itemLabel} ${itemId}`;

        // Check if blocked
        if (rules.blockedItemKeywords.length > 0) {
            const isBlocked = rules.blockedItemKeywords.some(keyword => 
                searchText.includes(keyword.toLowerCase())
            );
            if (isBlocked) return false;
        }

        // Check if allowed (if allowedKeywords specified)
        if (rules.allowedItemKeywords.length > 0) {
            const isAllowed = rules.allowedItemKeywords.some(keyword =>
                searchText.includes(keyword.toLowerCase())
            );
            return isAllowed;
        }

        return true;
    });
    
    console.log('[V2 Filter] Items after filter:', filteredItems.length);
    filteredItems.forEach(item => {
        console.log('[V2 Filter] Allowed item:', item.id, item.label || item.name);
    });
    
    return filteredItems;
}

/**
 * Get allowed grades for a unit
 */
export function getAllowedGrades(unitId) {
    if (!unitId || !UNIT_TYPE_RULES[unitId]) {
        return ['A', 'B', 'C', 'Reject', 'Mix']; // Default grades
    }

    const rules = UNIT_TYPE_RULES[unitId];
    return rules.allowedGrades.length > 0 ? rules.allowedGrades : ['A', 'B', 'C', 'Reject', 'Mix'];
}
