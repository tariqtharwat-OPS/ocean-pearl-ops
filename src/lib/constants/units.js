export const UNIT_TEMPLATES = {
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

export const UNIT_MAPPING = {
    // Jakarta
    'office': 'OFFICE',
    'cold_storage': 'COLD_STORAGE',

    // Kaimana
    'gudang_ikan_teri': 'PROCESSING_DRY',
    'frozen_fish': 'FROZEN_FACTORY',

    // Global / Fallback (if needed)
};
