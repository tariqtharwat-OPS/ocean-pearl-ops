import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collectionGroup, getDocs as getDocsGroup, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default function ReportsViewer() {
    const [activeTab, setActiveTab] = useState('stock');

    return (
        <div className="p-4 max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Reports (Phase 2)</h1>

            <div className="flex space-x-4 border-b overflow-x-auto">
                {['stock', 'transactions', 'yield', 'cash'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-2 px-4 capitalize ${activeTab === tab ? 'border-b-2 border-ocean-dial text-ocean-dial' : 'text-slate-500'}`}
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
    const [stats, setStats] = useState([]);

    useEffect(() => {
        const fetchStock = async () => {
            const q = query(collectionGroup(db, 'stock'));
            const snap = await getDocsGroup(q);
            const raw = snap.docs.map(d => ({ ...d.data(), id: d.id, path: d.ref.path }));
            setStats(raw);
        };
        fetchStock();
    }, []);

    return (
        <div className="overflow-x-auto">
            <h2 className="font-bold mb-4">Global Stock Assets</h2>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="p-2">Item/Grade</th>
                        <th className="p-2 text-right">Qty (Kg)</th>
                        <th className="p-2">Last Update</th>
                    </tr>
                </thead>
                <tbody>
                    {stats.map(s => (
                        <tr key={s.path} className="border-b">
                            <td className="p-2 font-mono">{s.id}</td>
                            <td className="p-2 text-right font-bold">{s.quantityKg?.toFixed(2)}</td>
                            <td className="p-2 text-xs text-gray-400">{s.updatedAt?.toDate().toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function TransactionsReport() {
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTxns = async () => {
            const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
            const snap = await getDocs(q);
            setTxns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        };
        fetchTxns();
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="overflow-x-auto">
            <h2 className="font-bold mb-4">Recent Transactions</h2>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Type</th>
                        <th className="p-2">Loc/Unit</th>
                        <th className="p-2">Details</th>
                        <th className="p-2 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {txns.map(t => (
                        <tr key={t.id} className="border-b hover:bg-slate-50">
                            <td className="p-2">{t.serverTimestamp?.toDate().toLocaleDateString()}</td>
                            <td className="p-2"><span className="px-2 py-1 rounded bg-slate-200 text-xs">{t.type}</span></td>
                            <td className="p-2">{t.locationId}/{t.unitId}</td>
                            <td className="p-2">{t.description || `${t.itemId || ''} (${t.quantityKg || '-'}kg)`}</td>
                            <td className="p-2 text-right">{t.totalAmount?.toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function YieldReport() {
    const [entries, setEntries] = useState([]);

    useEffect(() => {
        const fetchYields = async () => {
            // Processing events are COLD_STORAGE_IN
            // Only those are relevant for yield (Traceability)
            const q = query(collection(db, 'transactions'), orderBy('timestamp', 'desc'), limit(50));
            const snap = await getDocs(q);
            // Filter client side for simplicity in V1
            const filtered = snap.docs
                .map(d => ({ ...d.data(), id: d.id }))
                .filter(d => d.type === 'COLD_STORAGE_IN');
            setEntries(filtered);
        };
        fetchYields();
    }, []);

    return (
        <div className="overflow-x-auto">
            <h2 className="font-bold mb-4">Processing Yield Traceability</h2>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="p-2">Date</th>
                        <th className="p-2">Item</th>
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
                                <td className="p-2">{e.serverTimestamp?.toDate().toLocaleDateString()}</td>
                                <td className="p-2">{e.itemId}</td>
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
            // Note: 'site_wallets' is root collection in my index.js logic "db.doc('site_wallets/${unitId}')"
            // Wait, index.js used db.doc(`site_wallets/${unitId}`);
            // This creates a root collection "site_wallets".
            const snap = await getDocs(q);
            setWallets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetchWallets();
    }, []);

    return (
        <div className="overflow-x-auto">
            <h2 className="font-bold mb-4">Site Wallet Cash Positions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {wallets.map(w => (
                    <div key={w.id} className="p-4 border rounded-lg bg-slate-50">
                        <h3 className="text-gray-500 text-xs uppercase font-bold">{w.locationId} / {w.id}</h3>
                        <div className={`text-2xl font-bold mt-2 ${w.balance < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(w.balance || 0)}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Last Update: {w.updatedAt?.toDate().toLocaleString()}</p>
                    </div>
                ))}
                {wallets.length === 0 && <p className="text-gray-400 italic">No wallet activity recorded yet.</p>}
            </div>
        </div>
    );
}
