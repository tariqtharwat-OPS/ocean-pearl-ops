
// -- GLOBAL CONSTANTS (V2 Blueprint Compliant) --

export const ITEM_TYPES = {
    RAW_FISH: 'raw_material',
    PROCESSED_FISH: 'finished_product',
    BY_PRODUCT: 'by_product',
    MATERIAL: 'material'
};

export const EXPENSE_CATEGORIES = [
    'Operational',
    'Fuel',
    'Ice & Salt',
    'Labor',
    'Maintenance',
    'Logistics',
    'Meals',
    'Electricity',
    'Packaging',
    'Other'
];

export const GRADES = ['A', 'B', 'C', 'Reject', 'Mix', 'NA'];

// -- SIZE CONFIGURATION --
export const SIZE_CONFIG = {
    tuna: ['0.5-5 kg', '5-10 kg', '10-20 kg', '20-30 kg', '30-40 kg', '40 kg up'],
    tenggiri: ['1-3 kg', '3-5 kg', '5-10 kg', '10 kg up'],
    grouper: ['0.3-0.5 kg', '0.5-1 kg', '1-10 kg', '10-20 kg', '20-30 kg', '30 kg up'],
    snapper: ['0.3-0.5 kg', '0.5-1 kg', '1-3 kg', '3 kg up'],
    shrimp: ['Size 10', 'Size 15', 'Size 20', 'Size 25', 'Size 30', 'Size 40', 'Mix'],
    octopus: ['0.3-0.5 kg', '0.5-1 kg', '1 kg up'],
    small_fish: ['100g up', '200g up', '300g up', 'Mix'],
    general: ['0.3-0.5 kg', '0.5-1 kg', '1-3 kg', '3-5 kg', '5-10 kg', '10 kg up']
};

export const getSizeList = (itemId) => {
    if (!itemId) return SIZE_CONFIG.general;
    const lower = itemId.toLowerCase();
    if (lower.includes('tuna')) return SIZE_CONFIG.tuna;
    if (lower.includes('tenggiri') || lower.includes('wahoo') || lower.includes('kingfish')) return SIZE_CONFIG.tenggiri;
    if (lower.includes('kerapu') || lower.includes('grouper') || lower.includes('sunu')) return SIZE_CONFIG.grouper;
    if (lower.includes('merah') || lower.includes('kakap') || lower.includes('snapper')) return SIZE_CONFIG.snapper;
    if (lower.includes('shrimp') || lower.includes('vaname') || lower.includes('udang')) return SIZE_CONFIG.shrimp;
    if (lower.includes('gurita') || lower.includes('octopus') || lower.includes('sontong')) return SIZE_CONFIG.octopus;
    if (lower.includes('ikor') || lower.includes('pisang')) return SIZE_CONFIG.small_fish;
    return SIZE_CONFIG.general;
};

// -- LOCATIONS (V2 Core) --
export const LOCATIONS = {
    jakarta: {
        id: 'jakarta',
        label: 'HQ Jakarta',
        units: [
            { id: 'hq_office', label: 'HQ Office', type: 'ADMIN' },
            { id: 'jk_cold_storage', label: 'Jakarta Cold Storage', type: 'COLD_STORAGE' },
            { id: 'jk_transport', label: 'Jakarta Transport', type: 'LOGISTICS' }
        ]
    },
    kaimana: {
        id: 'kaimana',
        label: 'Kaimana',
        units: [
            { id: 'kn_warehouse', label: 'Kaimana Warehouse', type: 'STATIONARY_UNIT' },
            { id: 'kn_factory', label: 'Kaimana Factory', type: 'FACTORY' },
            { id: 'kn_boats', label: 'Kaimana Boats', type: 'MOBILE_UNIT' },
            { id: 'kn_transport', label: 'Kaimana Transport', type: 'LOGISTICS' }
        ]
    },
    saumlaki: {
        id: 'saumlaki',
        label: 'Saumlaki',
        units: [
            { id: 'sl_warehouse', label: 'Saumlaki Warehouse', type: 'STATIONARY_UNIT' },
            { id: 'sl_factory', label: 'Saumlaki Factory', type: 'FACTORY' },
            { id: 'sl_boats', label: 'Saumlaki Boats', type: 'MOBILE_UNIT' }
        ]
    }
};

// -- PROCESSING RULES --
export const PROCESSING_CONFIG = {
    'tuna': {
        label: 'Tuna Processing',
        processes: ['Whole Round', 'G&G (Gilled Gutted)', 'Loin', 'Steak', 'Cube', 'Saku', 'Ground Meat', 'Belly'],
        byProducts: ['Head', 'Tail', 'Bone', 'Skin', 'Fish Maw'],
        packaging: ['Bulk', 'IQF', 'IVP', 'Vacuum Pack', 'Block']
    },
    'shrimp': {
        label: 'Shrimp Processing',
        processes: ['HOSO (Head On)', 'HLSO (Headless)', 'P&D (Peel Deveined)', 'PTO (Peel Tail On)', 'Butterfly'],
        byProducts: ['Heads', 'Shells'],
        packaging: ['Block', 'IQF', 'Tray']
    },
    'anchovy': {
        label: 'Anchovy Processing',
        processes: ['Dried', 'Boiled (Salted)', 'Raw Frozen'],
        byProducts: ['Dust/Broken'],
        packaging: ['Sack (25kg)', 'Box (10kg)', 'Retail Pack']
    },
    'octopus': {
        label: 'Octopus Processing',
        processes: ['Whole Cleaned', 'Flower', 'Cut', 'Ball'],
        byProducts: ['Ink', 'Guts'],
        packaging: ['Block', 'IQF']
    },
    'default': {
        label: 'General Fish',
        processes: ['Whole Round', 'Gutted', 'Fillet', 'Steak'],
        byProducts: ['Offal', 'Bone'],
        packaging: ['Bulk', 'Plastik']
    }
};

export const getProcessingRules = (itemId) => {
    if (!itemId) return PROCESSING_CONFIG.default;
    const lower = itemId.toLowerCase();
    if (lower.includes('tuna')) return PROCESSING_CONFIG.tuna;
    if (lower.includes('shrimp') || lower.includes('vaname')) return PROCESSING_CONFIG.shrimp;
    if (lower.includes('anchovy') || lower.includes('teri')) return PROCESSING_CONFIG.anchovy;
    if (lower.includes('octopus')) return PROCESSING_CONFIG.octopus;
    return PROCESSING_CONFIG.default;
};

// Legacy support
export const UNITS = {};
export const SIZES = SIZE_CONFIG.general;
