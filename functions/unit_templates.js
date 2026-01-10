const UNIT_TEMPLATES = {
    OFFICE: {
        label: "Office / HQ",
        capabilities: []
    },
    PROCESSING_WET: {
        label: "Wet Processing",
        capabilities: ['receiving', 'processing', 'storage', 'sales']
    },
    PROCESSING_DRY: {
        label: "Dry Processing (Teri)",
        capabilities: ['receiving', 'processing', 'storage', 'sales']
    },
    FROZEN_FACTORY: {
        label: "Frozen Factory",
        capabilities: ['receiving', 'processing', 'storage', 'sales']
    },
    COLD_STORAGE: {
        label: "Cold Storage",
        capabilities: ['receiving', 'storage', 'sales']
    }
};

const UNIT_MAPPING = {
    // Jakarta
    'office': 'OFFICE',
    'cold_storage': 'COLD_STORAGE',

    // Kaimana
    'gudang_ikan_teri': 'PROCESSING_DRY',
    'frozen_fish': 'FROZEN_FACTORY',

    // Saumlaki (assumes 'frozen_fish' ID is unique per location, but IDs in map are just the leaf ID?)
    // Actually IDs in 'locations/{loc}/units/{id}' are unique per location.
    // This simple mapping assumes 'frozen_fish' is always FROZEN_FACTORY.
};

module.exports = { UNIT_TEMPLATES, UNIT_MAPPING };
