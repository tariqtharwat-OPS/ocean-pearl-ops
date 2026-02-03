// --- HELPERS ---
const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return toast.error("No data to export");

    // Extract headers
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(fieldName => {
            let val = row[fieldName];
            if (val && typeof val === 'object' && val.seconds) { // Timestamp
                val = new Date(val.seconds * 1000).toISOString();
            }
            if (typeof val === 'string') val = `"${val.replace(/"/g, '""')}"`; // Escape quotes
            return val;
        }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

import { toast } from 'react-hot-toast';
import { Download, Sparkles, X } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../lib/firebase';

// ... (Existing component code needs to be stitched carefully)
// I will apply this helper at the bottom and update components individually in subsequent steps if needed, 
// but replace_file_content replaces the BLOCK.
// Actually, I should insert the helper at top or bottom, and then modify components.
// The user instruction "Add downloadCSV helper and Export buttons" implies I should do it in one go if possible or multiple chunks.

// Let's replace the whole file content structure slightly to include imports and helper.

// ... (Imports)
import { Download, Sparkles } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Helper
const downloadCSV = (data, filename) => {
    if (!data.length) return toast.error("No data");
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(r => headers.map(h => {
            let v = r[h];
            if (v && typeof v === 'object' && v.toDate) v = v.toDate().toISOString();
            if (typeof v === 'string') v = `"${v.replace(/"/g, '""')}"`;
            return v;
        }).join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
};

export default function ReportsViewer() {
    const [activeTab, setActiveTab] = useState('stock');

    return (
        <div className="p-4 max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
            </div>

            <div className="flex space-x-4 border-b overflow-x-auto">
                {['stock', 'transactions', 'yield', 'cash'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 px-4 capitalize ${activeTab === tab ? 'border-b-2 border-ocean-dial text-ocean-dial font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="bg-white p-6 rounded-lg shadow min-h-[400px]">
                {activeTab === 'stock' && <StockReport />}
                {activeTab === 'transactions' && <TransactionsReport />}
                {activeTab === 'yield' && <YieldReport />}
                {activeTab === 'cash' && <CashReport />}
            </div>
        </div>
    );
}

function StockReport() {
    const { currentUser } = useAuth();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [insight, setInsight] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        const fetchStock = async () => {
            setLoading(true);
            try {
                let q;
                if (currentUser.unitId && currentUser.locationId) {
                    q = query(collection(db, `locations/${currentUser.locationId}/units/${currentUser.unitId}/stock`));
                } else {
                    q = query(collectionGroup(db, 'stock'));
                }
                const snap = await getDocs(q);
                setStats(snap.docs.map(d => ({ ...d.data(), id: d.id, path: d.ref.path })));
            } catch (err) {
                console.error("Stock Report Error:", err);
            }
            setLoading(false);
        };
        fetchStock();
    }, [currentUser.locationId, currentUser.unitId]);

    const handleExport = () => {
        const cleanData = stats.map(s => ({
            ItemID: s.id,
            Label: s.label || s.id,
            QuantityKg: s.quantityKg,
            Location: s.path.split('/')[1],
            Unit: s.path.split('/')[3],
            LastUpdate: s.updatedAt?.toDate ? s.updatedAt.toDate().toISOString() : ''
        }));
        downloadCSV(cleanData, `Stock_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    const handleAnalyze = async () => {
        if (stats.length === 0) return toast.error("No data to analyze");
        setAnalyzing(true);
        try {
            const summaryData = stats.slice(0, 30).map(s => `${s.id} (${s.quantityKg}kg)`);
            const prompt = `Analyze this Stock Report excerpt: ${JSON.stringify(summaryData)}. Identify critical low stock or excess. Context: ${currentUser.locationId || 'Global'}.`;

            const result = await httpsCallable(functions, 'callShark')({ message: prompt });
            setInsight(result.data.text);
            toast.success("Analysis Complete");
        } catch (e) {
            console.error(e);
            toast.error("Shark Analysis Failed");
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Stock...</div>;

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">{currentUser.unitId ? `${currentUser.unitId.toUpperCase()} Stock` : 'Global Stock Assets'}</h2>
                <div className="flex gap-2">
                    <button onClick={handleAnalyze} disabled={analyzing} className="text-xs flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1 rounded border border-indigo-200">
                        <Sparkles size={14} /> {analyzing ? 'Thinking...' : 'Ask Shark'}
                    </button>
                    <button onClick={handleExport} className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded border">
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {insight && (
                <div className="mb-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg relative">
                    <button onClick={() => setInsight(null)} className="absolute top-2 right-2 text-indigo-400 hover:text-indigo-700"><X size={16} /></button>
                    <h3 className="text-sm font-bold text-indigo-800 flex items-center gap-2 mb-2"><Sparkles size={14} /> Shark Insight</h3>
                    <div className="text-sm text-indigo-900 whitespace-pre-wrap">{insight}</div>
                </div>
            )}
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b">
                    <tr>
                        <th className="p-3">Item/Grade</th>
                        <th className="p-3 text-right">Qty (Kg)</th>
                        <th className="p-3">Location Context</th>
                        <th className="p-3">Last Update</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {stats.map(s => (
                        <tr key={s.path} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold">{s.id}</td>
                            <td className="p-3 text-right font-mono text-ocean-dial font-bold">{s.quantityKg?.toFixed(2)}</td>
                            <td className="p-3 text-[10px] text-slate-400 truncate max-w-[200px]">{s.path.split('/')[1] || 'Global'} / {s.path.split('/')[3]}</td>
                            <td className="p-3 text-[10px] text-slate-400">
                                {s.updatedAt?.toDate ? s.updatedAt.toDate().toLocaleString() : (s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '---')}
                            </td>
                        </tr>
                    ))}
                    {stats.length === 0 && (
                        <tr><td colSpan="4" className="p-8 text-center text-slate-400 italic">No stock records found for this context.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function TransactionsReport() {
    const { currentUser } = useAuth();
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                let q;
                const unitId = currentUser.unitId;
                const locationId = currentUser.locationId;

                if (unitId) {
                    q = query(collection(db, 'transactions'), where('unitId', '==', unitId), orderBy('timestamp', 'desc'), limit(50));
                } else if (locationId && locationId !== 'jakarta') {
                    q = query(collection(db, 'transactions'), where('locationId', '==', locationId), orderBy('timestamp', 'desc'), limit(50));
                } else {
                    q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
                }

                const snap = await getDocs(q);
                setTxns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) {
                console.error("Txn Load Error", e);
            }
            setLoading(false);
        };
        load();
    }, [currentUser.locationId, currentUser.unitId]);

    const handleExport = () => {
        const cleanData = txns.map(t => ({
            Date: t.timestamp?.toDate ? t.timestamp.toDate().toISOString() : '',
            Type: t.type,
            TotalAmount: t.totalAmount,
            Location: t.locationId,
            Unit: t.unitId,
            Description: t.description,
            User: t.userId
        }));
        downloadCSV(cleanData, `Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Transactions...</div>;

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 className="font-bold">Transaction History</h2>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Context: {currentUser.unitId || currentUser.locationId}</div>
                </div>
                <button onClick={handleExport} className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded border">
                    <Download size={14} /> Export CSV
                </button>
            </div>
            <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b">
                    <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Loc/Unit</th>
                        <th className="p-3">Details</th>
                        <th className="p-3 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {txns.map(t => {
                        const date = t.timestamp?.toDate ? t.timestamp.toDate() : (t.timestamp ? new Date(t.timestamp) : null);
                        const displayQty = (t.quantityKg || t.amount_kg) ? `(${(t.quantityKg || t.amount_kg).toFixed(1)}kg)` : '';
                        return (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 whitespace-nowrap text-slate-600 font-mono">
                                    {date ? date.toLocaleDateString() : '---'}
                                </td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type?.includes('EXPENSE') ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                        {t.type}
                                    </span>
                                </td>
                                <td className="p-3 text-slate-400 text-xs">
                                    {t.locationId?.substr(0, 3).toUpperCase()}/{t.unitId?.substr(0, 10)}
                                </td>
                                <td className="p-3 text-slate-700">
                                    <div className="font-medium">{t.description || t.itemId}</div>
                                    <div className="text-[10px] text-slate-400">{displayQty} {t.pricePerKg ? `@ ${t.pricePerKg.toLocaleString()}` : ''}</div>
                                </td>
                                <td className="p-3 text-right font-mono font-bold">
                                    {(t.totalAmount || t.amount || 0).toLocaleString()}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function YieldReport() {
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        const fetchYields = async () => {
            const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
            const snap = await getDocs(q);
            const filtered = snap.docs
                .map(d => ({ ...d.data(), id: d.id }))
                .filter(d => d.type === 'COLD_STORAGE_IN');
            setEntries(filtered);
        };
        fetchYields();
    }, []);

    const handleExport = () => {
        const cleanData = entries.map(e => ({
            Date: e.timestamp?.toDate ? e.timestamp.toDate().toISOString() : '',
            Item: e.itemId,
            Format: e.processType,
            Batch: e.batchId,
            InputKg: e.rawUsedKg,
            OutputKg: e.quantityKg,
            YieldPercent: ((e.quantityKg / (e.rawUsedKg || e.quantityKg)) * 100).toFixed(2)
        }));
        downloadCSV(cleanData, `Yield_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">Processing Yield Traceability</h2>
                <button onClick={handleExport} className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded border">
                    <Download size={14} /> Export CSV
                </button>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Batch/Item</th>
                        <th className="p-2 text-right">Raw Input (Kg)</th>
                        <th className="p-2 text-right">Cold Output (Kg)</th>
                        <th className="p-2 text-right">Yield %</th>
                    </tr>
                </thead>
                <tbody>
                    {entries.map(e => {
                        const input = e.rawUsedKg || e.quantityKg; // Default to 1:1 if not specified
                        const output = e.quantityKg;
                        const yieldPct = ((output / input) * 100).toFixed(1);
                        return (
                            <tr key={e.id} className="border-b">
                                <td className="p-2">{e.serverTimestamp?.toDate ? e.serverTimestamp.toDate().toLocaleDateString() : '---'}</td>
                                <td className="p-2">
                                    <div className="font-bold">{e.itemId}</div>
                                    <div className="text-[10px] text-gray-400">{e.batchId}</div>
                                </td>
                                <td className="p-2 text-right text-red-600 font-medium">-{input}</td>
                                <td className="p-2 text-right text-green-600 font-medium">+{output}</td>
                                <td className="p-2 text-right font-bold">{yieldPct}%</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function CashReport() {
    const [wallets, setWallets] = useState([]);

    useEffect(() => {
        const fetchWallets = async () => {
            const q = query(collection(db, 'site_wallets'));
            const snap = await getDocs(q);
            setWallets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchWallets();
    }, []);

    const handleExport = () => {
        const cleanData = wallets.map(w => ({
            WalletID: w.id,
            Balance: w.balance,
            LastUpdate: w.updatedAt?.toDate ? w.updatedAt.toDate().toISOString() : ''
        }));
        downloadCSV(cleanData, `Cash_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    };

    return (
        <div className="overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">Site Wallet Cash Positions</h2>
                <button onClick={handleExport} className="text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded border">
                    <Download size={14} /> Export CSV
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {wallets.map(w => (
                    <div key={w.id} className="p-4 border rounded-lg bg-slate-50">
                        <h3 className="text-gray-500 text-xs uppercase font-bold">{w.locationId} / {w.id}</h3>
                        <div className={`text-2xl font-bold mt-2 ${w.balance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(w.balance || 0)}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Last Update: {w.updatedAt?.toDate ? w.updatedAt.toDate().toLocaleString() : '---'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
