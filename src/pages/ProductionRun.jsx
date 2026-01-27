import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactionQueue } from '../contexts/TransactionQueueContext';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ArrowLeft, Plus, Trash2, Gauge, AlertTriangle, CheckCircle, Save, Printer, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useWriteGuard } from '../lib/writeGuard';
import { toast } from 'react-hot-toast';
import { useUnsavedChanges } from '../lib/useUnsavedChanges';
// Inline all constants to completely avoid circular dependency issues
const GRADES = ['A', 'B', 'C', 'Reject', 'Mix'];

const SIZE_CONFIG = {
    tuna: ['0.5-5 kg', '5-10 kg', '10-20 kg', '20-30 kg', '30-40 kg', '40 kg up'],
    tenggiri: ['1-3 kg', '3-5 kg', '5-10 kg', '10 kg up'],
    grouper: ['0.3-0.5 kg', '0.5-1 kg', '1-10 kg', '10-20 kg', '20-30 kg', '30 kg up'],
    snapper: ['0.3-0.5 kg', '0.5-1 kg', '1-3 kg', '3 kg up'],
    shrimp: ['Size 10', 'Size 15', 'Size 20', 'Size 25', 'Size 30', 'Size 40', 'Mix'],
    octopus: ['0.3-0.5 kg', '0.5-1 kg', '1 kg up'],
    small_fish: ['100g up', '200g up', '300g up', 'Mix'],
    general: ['0.3-0.5 kg', '0.5-1 kg', '1-3 kg', '3-5 kg', '5-10 kg', '10 kg up']
};

const LOCATIONS = {
    jakarta: {
        id: 'jakarta',
        label: 'HQ Jakarta',
        units: [
            { id: 'office', label: 'Office', type: 'OFFICE', capabilities: [] },
            { id: 'cold_storage', label: 'Cold Storage', type: 'COLD_STORAGE', capabilities: ['receiving', 'storage', 'sales'] }
        ]
    },
    kaimana: {
        id: 'kaimana',
        label: 'Kaimana',
        units: [
            { id: 'gudang_ikan_teri', label: 'Gudang Ikan Teri', type: 'PROCESSING_DRY', capabilities: ['receiving', 'processing', 'storage', 'sales'] },
            { id: 'frozen_fish', label: 'Frozen Fish', type: 'FROZEN_FACTORY', capabilities: ['receiving', 'processing', 'storage', 'sales'] }
        ]
    },
    saumlaki: {
        id: 'saumlaki',
        label: 'Saumlaki',
        units: [
            { id: 'frozen_fish', label: 'Frozen Fish', type: 'FROZEN_FACTORY', capabilities: ['receiving', 'processing', 'storage', 'sales'] }
        ]
    }
};

const PROCESSING_CONFIG = {
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

const getProcessingRules = (itemId) => {
    if (!itemId) return PROCESSING_CONFIG.default;
    const lower = itemId.toLowerCase();
    if (lower.includes('tuna')) return PROCESSING_CONFIG.tuna;
    if (lower.includes('shrimp') || lower.includes('vaname')) return PROCESSING_CONFIG.shrimp;
    if (lower.includes('anchovy') || lower.includes('teri')) return PROCESSING_CONFIG.anchovy;
    if (lower.includes('octopus')) return PROCESSING_CONFIG.octopus;
    return PROCESSING_CONFIG.default;
};

// Inline PROCESS_RECIPES to avoid circular dependency issues
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

const DEFAULT_OUTPUT = { process: '', grade: '', packaging: '', quantityKg: '', boxCount: '', id: 0 };

export default function ProductionRun() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { addTransaction } = useTransactionQueue();
    const { t } = useTranslation();

    // -- STATE --
    // -- STATE --
    const [batchId] = useState(() => {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
        return `PRD-${date}-${rand}`;
    });
    const [rawStock, setRawStock] = useState([]);
    const [rawMeta, setRawMeta] = useState({}); // { ID: { category, name, ... } }

    const [finishedProducts, setFinishedProducts] = useState([]); // All FPs

    // M3
    const [isDirty, setIsDirty] = useState(false);
    useUnsavedChanges(isDirty);

    // WRITE GUARD
    const authContext = useAuth();
    const { guardWrite } = useWriteGuard(authContext);

    const [input, setInput] = useState({
        rawStockId: '', // RAW_{itemId}
        rawItemId: '',  // {itemId}
        totalInputKg: '',
        refCode: ''     // Batch Code
    });

    const [rules, setRules] = useState(() => getProcessingRules(null));
    const [outputs, setOutputs] = useState(() => [{ ...DEFAULT_OUTPUT, id: Date.now() }]);

    // -- WASTE & SUMMARY --
    const [waste, setWaste] = useState({ quantityKg: 0, value: 0, description: 'General Waste/Trim' });
    const [submitting, setSubmitting] = useState(false);

    // -- LOAD DATA --
    useEffect(() => {
        const load = async () => {
            if (!currentUser.locationId) return;
            try {
                // 1. Fetch RAW stock for this location
                const stockRef = collection(db, `locations/${currentUser.locationId}/units/${currentUser.unitId}/stock`);
                const snap = await getDocs(stockRef);
                const list = snap.docs
                    .filter(d => d.id.startsWith('RAW_') && d.data().quantityKg > 0)
                    .map(d => ({
                        id: d.id,
                        itemId: d.id.replace('RAW_', ''),
                        qty: d.data().quantityKg
                    }));
                setRawStock(list);

                // 2. Fetch Metadata (Raw & Finished)
                const rawSnap = await getDocs(collection(db, 'raw_materials'));
                const rawMap = {};
                rawSnap.docs.forEach(d => { rawMap[d.id] = d.data(); });
                setRawMeta(rawMap);

                const fpSnap = await getDocs(collection(db, 'finished_products'));
                const fpList = fpSnap.docs.filter(d => d.data().active).map(d => ({ id: d.id, ...d.data() }));
                setFinishedProducts(fpList);

            } catch (e) {
                console.error(e);
            }
        };
        load();
    }, [currentUser.locationId, currentUser.unitId]);

    // -- DERIVE FILTERED PRODUCTS --
    // -- DERIVE FILTERED PRODUCTS --
    // const { PROCESS_RECIPES } = require('../lib/constants/recipes'); // Import local

    // Determine Recipe based on Input - memoized to avoid recomputation
    const currentRecipe = useMemo(() => {
        if (!input.rawItemId) return null;
        if (input.rawItemId.includes('teri') || input.rawItemId.includes('anchovy')) {
            return PROCESS_RECIPES.ANCHOVY_DRYING;
        }
        return PROCESS_RECIPES.FROZEN_CUTS;
    }, [input.rawItemId]);

    // Get filtered products based on current recipe - memoized
    const availableProducts = useMemo(() => {
        if (!currentRecipe) return [];
        return currentRecipe.outputs.map(o => ({
            id: o.id,
            name: o.label,
            active: true
        }));
    }, [currentRecipe]);

    // -- LOAD RULES ON ITEM SELECT --
    useEffect(() => {
        if (!input.rawItemId) {
            setRules(getProcessingRules(null));
            return;
        }
        setRules(getProcessingRules(input.rawItemId));
    }, [input.rawItemId]);

    // -- HANDLERS --
    const handleInput = (k, v) => {
        if (k === 'rawStockId') {
            const stock = rawStock.find(s => s.id === v);
            setInput(prev => ({
                ...prev,
                rawStockId: v,
                rawItemId: stock ? stock.itemId : ''
            }));
        } else {
            setInput(prev => ({ ...prev, [k]: v }));
        }
        setIsDirty(true);
    };

    const updateOutput = (idx, field, val) => {
        const next = [...outputs];
        next[idx][field] = val;

        setOutputs(next);
        setIsDirty(true);
    };

    const addRow = () => { setOutputs([...outputs, { ...DEFAULT_OUTPUT, id: Date.now() }]); setIsDirty(true); };
    const removeRow = (idx) => { setOutputs(outputs.filter((_, i) => i !== idx)); setIsDirty(true); };

    // -- CALCULATIONS --
    const totalOutputKg = outputs.reduce((acc, r) => acc + (parseFloat(r.quantityKg) || 0), 0) + (parseFloat(waste.quantityKg) || 0);
    const inputKg = parseFloat(input.totalInputKg) || 0;
    const yieldPercent = inputKg > 0 ? (totalOutputKg / inputKg) * 100 : 0;

    // Yield Status (Advisory)
    const getYieldStatus = () => {
        if (inputKg === 0) return { color: 'text-gray-400', msg: t('yield_high') }; // Fallback msg for empty

        const range = currentRecipe?.advisoryYield;

        if (range) {
            if (yieldPercent < range.min) return { color: 'text-red-600', msg: `${t('yield_critical_low')} (<${range.min}%)` };
            if (yieldPercent > range.max) return { color: 'text-orange-500', msg: `${t('yield_high')} (>${range.max}%)` };
            return { color: 'text-green-600', msg: t('yield_ok') };
        }

        // Default heuristics
        if (yieldPercent > 100) return { color: 'text-orange-500', msg: t('yield_high') };
        return { color: 'text-blue-600', msg: `Yield: ${Math.round(yieldPercent)}%` };
    };
    const yieldStatus = getYieldStatus();

    const handleSubmit = async () => {
        // WRITE GUARD
        const canProceed = await guardWrite(authContext, `Production Run: ${batchId}`);
        if (!canProceed) return;

        // 1. Strict Validation (Negatives)
        if (inputKg <= 0) return toast.error("Input Weight must be positive.");

        const hasNegatives = outputs.some(r => {
            const q = parseFloat(r.quantityKg);
            const b = parseFloat(r.boxCount);
            return (r.quantityKg !== '' && q <= 0) || (r.boxCount !== '' && b < 0);
        });
        if (hasNegatives) return toast.error("CRITICAL: Output Quantity must be > 0 and Box Count cannot be negative.");

        if (!input.rawStockId) {
            toast.error("Please select Input Stock.");
            return;
        }
        if (totalOutputKg <= 0) {
            toast.error("Please add at least one output.");
            return;
        }

        if (yieldPercent > 120) {
            if (!confirm("Yield is > 120%. This is highly unusual. Continue?")) return;
        } else if (currentRecipe?.advisoryYield && yieldPercent < currentRecipe.advisoryYield.min) {
            if (!confirm(`Yield is below advisory range (<${currentRecipe.advisoryYield.min}%). This will be flagged. Continue?`)) return;
        } else if (currentRecipe?.advisoryYield && yieldPercent > currentRecipe.advisoryYield.max) {
            // Just a warning for above advisory, not blocking unless extreme
            if (!confirm(`Yield is above advisory range (>${currentRecipe.advisoryYield.max}%). Ensure no water weight added. Continue?`)) return;
        }

        setSubmitting(true);

        try {
            for (const row of outputs) {
                const rowQty = parseFloat(row.quantityKg) || 0;
                if (rowQty <= 0) continue;

                const rowRawUsed = (rowQty / totalOutputKg) * inputKg;

                // Use the Selected Product Name for Description/ProcessType
                // We store the Product ID or Name? 
                // Currently system expects 'processType' string.
                // We'll use the Name.

                const payload = {
                    type: 'COLD_STORAGE_IN', // Adds Stock of Result
                    locationId: currentUser.locationId,
                    unitId: currentUser.unitId,

                    itemId: input.rawItemId, // Links back to Raw Material parent? 
                    // Wait, if I produced "Loin", the stock item is "Loin"? 
                    // No, the system seems to track stock by "RAW_ID" and "COLD_ID_GRADE".
                    // Lines 170 in functions/index.js: `COLD_${itemId}_${stockGrade}`
                    // If itemId is rawItemId (e.g. P01), then we are storing "P01_Loin_GradeA"? 
                    // The 'itemId' field in transaction usually means the ITEM being transacted.
                    // If we are creating a FINISHED PRODUCT, we should probably use the FP ID?
                    // BUT, the schema might expect Raw Item ID for tracking?
                    // Let's stick to V1 behavior: Uses Raw Item ID, and ProcessType distinguishes it.
                    // OR, does the user want distinct stock items for FPs?
                    // "Restructuring Database: Establishing a parent-child relationship"
                    // Use Raw Item ID as the base, and ProcessType (FP Name) as the variant.

                    processType: row.process, // This will be "Loin (Skin On)" etc.
                    packaging: row.packaging,
                    gradeId: row.grade,

                    quantityKg: rowQty,
                    boxCount: parseInt(row.boxCount) || 0, // NEW FIELD
                    rawUsedKg: rowRawUsed,

                    batchId: batchId,
                    description: `Production: ${row.process}`,
                    coldStorageReference: input.refCode
                };
                await addTransaction(payload);
            }

            await addTransaction({
                type: 'STOCK_ADJUSTMENT',
                locationId: currentUser.locationId,
                unitId: currentUser.unitId,
                itemId: `RAW_${input.rawItemId}`,
                quantityKg: -inputKg,
                description: `Used in Batch ${batchId}`,
                batchId: batchId
            });



            toast.success(`Production Run Recorded! Batch: ${batchId}`);
            setIsDirty(false);
            navigate('/');

        } catch (e) {
            console.error(e);
            toast.error(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = batchId;
        window.print();
        document.title = originalTitle;
    };

    const locLabel = LOCATIONS[currentUser?.locationId]?.label || currentUser?.locationId;
    const unitLabel = LOCATIONS[currentUser?.locationId]?.units.find(u => u.id === currentUser?.unitId)?.label || currentUser?.unitId;



    // Helper to get raw name
    const getRawName = (id) => {
        if (!id) return '';
        const meta = rawMeta[id];
        return meta ? meta.name : id;
    };

    if (!currentUser.locationId) return <div className="p-8 text-center text-red-500 font-bold">{t('select_location_first') || 'Select Location First'}</div>;

    return (
        <div className="space-y-6 pb-20 print:p-0">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-10 shadow-sm print:hidden">
                <div className="max-w-5xl mx-auto px-4 py-3">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <button onClick={() => { setIsDirty(false); navigate('/'); }} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 text-sm">
                                <ArrowLeft size={16} /> Cancel
                            </button>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span>⚙️</span> {t('production_run')}
                            </h1>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                                <Shield size={10} />
                                <span>{t('traceability_notice')}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-700">{locLabel}</div>
                            <div className="text-xs text-slate-500 font-mono">{unitLabel}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">BATCH: {batchId}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PRINT HEADER */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
                <h1 className="text-2xl font-bold uppercase tracking-wider">Production Report</h1>
                <div className="flex justify-between items-end mt-4">
                    <div className="text-left">
                        <div className="text-sm text-gray-500">Ocean Pearl Seafood</div>
                        <div className="font-bold">{currentUser.locationId?.toUpperCase()}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-mono font-bold">{batchId}</div>
                        <div className="text-xs text-gray-400">Batch ID</div>
                    </div>
                </div>
            </div>

            {/* TOP: INPUT */}
            <div className="bg-slate-800 text-white p-6 rounded-xl shadow-lg print:bg-white print:text-black print:border-2 print:border-black print:shadow-none print:mb-6">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-700 pb-2 print:text-black print:border-black">Source Material</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3">
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1 print:text-gray-600">Raw Stock</label>
                        <select
                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded text-white font-medium focus:ring-2 ring-ocean-dial outline-none print:hidden"
                            value={input.rawStockId}
                            onChange={e => handleInput('rawStockId', e.target.value)}
                        >
                            <option value="">-- Available Stock --</option>
                            {rawStock.map(s => (
                                <option key={s.id} value={s.id}>{getRawName(s.itemId)} ({s.qty.toLocaleString()} kg)</option>
                            ))}
                        </select>
                        <div className="hidden print:block font-bold pl-2 border-b border-black">{getRawName(input.rawItemId) || '________________'}</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1 print:text-gray-600">Input Weight (Kg)</label>
                        <input
                            type="number"
                            step="any"
                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded text-white font-mono text-lg focus:ring-2 ring-ocean-dial outline-none print:hidden"
                            placeholder="0.0"
                            value={input.totalInputKg}
                            onChange={e => handleInput('totalInputKg', e.target.value)}
                        />
                        <div className="hidden print:block font-bold font-mono pl-2 border-b border-black">{input.totalInputKg || '0'} kg</div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-400 block mb-1 print:text-gray-600">Ref Code</label>
                        <input
                            className="w-full p-3 bg-slate-700 border border-slate-600 rounded text-white font-mono text-sm focus:ring-2 ring-ocean-dial outline-none print:hidden"
                            placeholder="Link to RCV-..."
                            value={input.refCode}
                            onChange={e => handleInput('refCode', e.target.value)}
                        />
                        <div className="hidden print:block font-bold pl-2 border-b border-black">{input.refCode || '-'}</div>
                    </div>
                </div>
            </div>

            {/* MIDDLE: OUTPUT GRID */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-t-2 print:border-b-2 print:border-black print:rounded-none">
                <div className="p-4 bg-slate-50 border-b flex justify-between items-center print:bg-white print:border-black">
                    <h2 className="font-bold text-slate-700 print:text-black">Processing Output</h2>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold print:hidden">
                        Filter: {availableProducts.length} Products
                    </span>
                </div>

                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b print:bg-white print:text-black print:border-black print:uppercase">
                        <tr>
                            <th className="p-3">Finished Product</th>
                            <th className="p-3">Grade</th>
                            <th className="p-3">Packaging</th>
                            <th className="p-3 w-24">Boxes</th>
                            <th className="p-3 w-32">Weight (Kg)</th>
                            <th className="p-3 w-10 print:hidden"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y print:divide-slate-300">
                        {outputs.map((row, idx) => (
                            <tr key={row.id}>
                                <td className="p-3 align-top">
                                    <select
                                        className="w-full p-2 border rounded print:hidden"
                                        value={row.process}
                                        onChange={e => updateOutput(idx, 'process', e.target.value)}
                                        disabled={!input.rawItemId}
                                    >
                                        <option value="">{input.rawItemId ? 'Select Product...' : 'Select Raw Material First'}</option>
                                        {availableProducts.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                                    </select>
                                    <div className="hidden print:block">{row.process}</div>
                                </td>
                                <td className="p-3 align-top">
                                    <select
                                        className="w-full p-2 border rounded print:hidden"
                                        value={row.grade}
                                        onChange={e => updateOutput(idx, 'grade', e.target.value)}
                                    >
                                        <option value="">Grade/Size</option>
                                        {(input.rawItemId && rawMeta[input.rawItemId]?.custom_sizes?.length > 0 ? rawMeta[input.rawItemId].custom_sizes : GRADES).map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <div className="hidden print:block">{row.grade}</div>
                                </td>
                                <td className="p-3 align-top">
                                    <select
                                        className="w-full p-2 border rounded print:hidden"
                                        value={row.packaging}
                                        onChange={e => updateOutput(idx, 'packaging', e.target.value)}
                                    >
                                        <option value="">Pack</option>
                                        {rules.packaging.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                    <div className="hidden print:block">{row.packaging}</div>
                                </td>
                                <td className="p-3 align-top">
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded font-mono text-center print:hidden"
                                        placeholder="-"
                                        value={row.boxCount}
                                        onChange={e => updateOutput(idx, 'boxCount', e.target.value)}
                                    />
                                    <div className="hidden print:block text-center">{row.boxCount || '-'}</div>
                                </td>
                                <td className="p-3 align-top">
                                    <input
                                        type="number"
                                        step="any"
                                        className="w-full p-2 border rounded font-mono font-bold text-ocean-dial print:hidden"
                                        value={row.quantityKg}
                                        onChange={e => updateOutput(idx, 'quantityKg', e.target.value)}
                                    />
                                    <div className="hidden print:block font-mono text-right">{row.quantityKg}</div>
                                </td>
                                <td className="p-3 print:hidden">
                                    <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="p-3 border-t bg-slate-50 flex justify-between items-center print:hidden">
                    <button onClick={addRow} className="flex items-center gap-2 text-ocean-dial font-bold hover:underline">
                        <Plus size={18} /> Add Output Line
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
                        <Printer size={16} /> Print Report
                    </button>
                </div>
            </div>

            {/* WASTE & BY-PRODUCTS SECTION */}
            <div className="bg-orange-50 rounded-xl shadow-sm border border-orange-200 p-4 print:bg-white print:border-2 print:border-black">
                <h3 className="text-sm font-bold text-orange-800 uppercase mb-2 print:text-black">Waste & By-Products</h3>
                <div className="flex gap-4 items-end print:block">
                    <div className="flex-1 print:mb-2">
                        <label className="text-xs text-orange-600 font-bold block mb-1 print:text-gray-600">Description</label>
                        <select
                            className="w-full p-2 border border-orange-200 rounded text-sm print:hidden"
                            value={waste.description}

                            onChange={e => { setWaste({ ...waste, description: e.target.value }); setIsDirty(true); }}
                        >
                            <option value="General Waste">General Waste (No Value)</option>
                            <option value="Heads">Heads</option>
                            <option value="Bones">Bones</option>
                            <option value="Skins">Skins</option>
                        </select>
                        <div className="hidden print:block font-bold">{waste.description}</div>
                    </div>
                    <div className="w-32 print:w-full print:mb-2">
                        <label className="text-xs text-orange-600 font-bold block mb-1 print:text-gray-600">Weight (Kg)</label>
                        <input
                            type="number"
                            className="w-full p-2 border border-orange-200 rounded text-sm text-right font-bold print:hidden"
                            value={waste.quantityKg}

                            onChange={e => { setWaste({ ...waste, quantityKg: e.target.value }); setIsDirty(true); }}
                        />
                        <div className="hidden print:block font-mono">{waste.quantityKg} kg</div>
                    </div>
                </div>
            </div>

            {/* PRINT FOOTER - YIELD SUMMARY */}
            <div className="hidden print:block mt-8 border-t-2 border-black pt-4">
                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <div className="font-bold">Total Input: {inputKg.toLocaleString()} kg</div>
                        <div className="font-bold">Total Output: {totalOutputKg.toLocaleString()} kg</div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold">Yield: {Math.round(yieldPercent)}%</div>
                        <div className="text-sm italic">{yieldStatus.msg}</div>
                    </div>
                </div>
                <div className="flex justify-between mt-12 pt-8">
                    <div className="text-center">
                        <div className="h-16 border-b border-black w-48 mb-2"></div>
                        <div className="text-sm font-bold">Processed By</div>
                    </div>
                    <div className="text-center">
                        <div className="h-16 border-b border-black w-48 mb-2"></div>
                        <div className="text-sm font-bold">Supervisor Signature</div>
                    </div>
                </div>
            </div>

            {/* BOTTOM: SHARK AI YIELD */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-2xl z-[100] print:hidden">
                <div className="max-w-screen-xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="relative w-16 h-16 flex items-center justify-center">
                                {/* Simple CSS Gauge */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="8" fill="transparent"
                                        className={yieldPercent < 30 ? "text-red-500" : (yieldPercent > 105 ? "text-orange-500" : "text-green-500")}
                                        strokeDasharray={175}
                                        strokeDashoffset={175 - (175 * Math.min(yieldPercent, 100) / 100)}
                                    />
                                </svg>
                                <span className="absolute text-xs font-bold">{Math.round(yieldPercent)}%</span>
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold">Adjusted Yield</div>
                                <div className={`font-bold ${yieldStatus.color}`}>{yieldStatus.msg}</div>
                            </div>
                        </div>

                        <div className="h-10 border-r mx-2"></div>

                        <div className="text-sm">
                            <div className="text-gray-500">Input: <span className="font-mono text-black">{inputKg.toLocaleString()} kg</span></div>
                            <div className="text-gray-500">Output: <span className="font-mono text-black">{totalOutputKg.toLocaleString()} kg</span></div>
                        </div>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-8 py-3 bg-ocean-dial text-white font-bold rounded shadow-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save size={18} />
                        {submitting ? 'Processing...' : (
                            <>
                                {yieldPercent < 30 && <AlertTriangle size={18} />}
                                {yieldPercent >= 30 && yieldPercent <= 105 && <CheckCircle size={18} />}
                                CONFIRM PRODUCTION
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
