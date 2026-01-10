const PROCESS_RECIPES = {
    ANCHOVY_DRYING: {
        id: 'ANCHOVY_DRYING',
        label: 'Anchovy Drying',
        inputType: 'RAW_ANCHOVY',
        outputCategory: 'DRIED_ANCHOVY',
        advisoryYield: { min: 30, max: 35 },
        outputs: [
            { id: 'teri_dried_super', label: 'Super (Small/Clean)' },
            { id: 'teri_dried_std', label: 'Standard' },
            { id: 'teri_dried_broken', label: 'Broken/Reject' }
        ]
    },
    FROZEN_CUTS: {
        id: 'FROZEN_CUTS',
        label: 'Frozen Fish Processing',
        inputType: 'RAW_FISH',
        outputCategory: 'PROCESSED_FISH',
        advisoryYield: null,
        outputs: [
            { id: 'whole_frozen', label: 'Whole Round (Frozen)' },
            { id: 'loin', label: 'Loin' },
            { id: 'steak', label: 'Steak' },
            { id: 'fillet', label: 'Fillet' },
            { id: 'cube', label: 'Cube/Kirimi' }
        ]
    }
};

module.exports = { PROCESS_RECIPES };
