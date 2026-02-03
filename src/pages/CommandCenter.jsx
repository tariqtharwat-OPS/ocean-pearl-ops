import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { LOCATIONS } from '../lib/constants';

/**
 * CommandCenter
 * 
 * CEO / HQ Admin View: Fast Global View + Shark AI Feed.
 * High-performance dashboard for top-level operations.
 */
export default function CommandCenter() {
    const [stats, setStats] = useState({
        totalCash: 0,
        estRevenue: 0,
        activeWallets: 0
    });
    const [feed, setFeed] = useState([]);
    const [locationsStatus, setLocationsStatus] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [processingId, setProcessingId] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Live Financials (Wallets)
        const unsubWallets = onSnapshot(collection(db, 'site_wallets'), (snap) => {
            let total = 0;
            let count = 0;
            snap.forEach(doc => {
                const data = doc.data();
                if (typeof data.balance === 'number') total += data.balance;
                count++;
            });
            setStats(prev => ({ ...prev, totalCash: total, activeWallets: count }));
        });

        // 2. System Feed (Live Notifications)
        const qFeed = query(collection(db, 'admin_notifications'), orderBy('timestamp', 'desc'), limit(20));
        const unsubFeed = onSnapshot(qFeed, (snap) => {
            setFeed(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 3. Map Status (Locations)
        const locs = Object.values(LOCATIONS).map(l => ({
            id: l.id,
            label: l.label,
            status: 'online',
            units: l.units.length
        }));
        setLocationsStatus(locs);

        // 4. Pending Requests (V2 Finance Approvals)
        const qReq = query(collection(db, 'financial_requests'), where('status', '==', 'PENDING'), orderBy('createdAt', 'desc'));
        const unsubReq = onSnapshot(qReq, (snap) => {
            setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        setLoading(false);

        return () => {
            unsubWallets();
            unsubFeed();
            unsubReq();
        };
    }, []);

    const handleAction = async (reqId, action) => {
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;
        setProcessingId(reqId);
        try {
            const functions = getFunctions(getApp(), 'asia-southeast1');
            const fnName = action === 'APPROVE' ? 'approveFinancialRequest' : 'rejectFinancialRequest';
            const fn = httpsCallable(functions, fnName);
            await fn({ requestId: reqId, reason: action === 'REJECT' ? 'Admin rejection via Dashboard' : undefined });
        } catch (error) {
            console.error(error);
            alert("Action failed: " + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 animate-pulse">Initializing Command Center...</div>;

    const formatCurrency = (amount) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
            {/* ACTION REQUIRED: PENDING APPROVALS */}
            {pendingRequests.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-amber-800 font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Action Required ({pendingRequests.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm relative hover:border-amber-300 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="text-xs font-bold text-slate-500 uppercase">{req.type} • {req.locationId}</div>
                                    <div className="text-xs text-slate-400">{req.createdAt?.seconds ? new Date(req.createdAt.seconds * 1000).toLocaleDateString() : 'Recent'}</div>
                                </div>
                                <div className="font-bold text-slate-800 text-lg mb-1">
                                    {formatCurrency(req.amount)}
                                </div>
                                <div className="text-sm text-slate-600 mb-4 line-clamp-2" title={req.description}>
                                    {req.description} <span className="text-slate-400 italic">({req.requesterName})</span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        disabled={!!processingId}
                                        onClick={() => handleAction(req.id, 'APPROVE')}
                                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        {processingId === req.id ? '...' : 'APPROVE'}
                                    </button>
                                    <button
                                        disabled={!!processingId}
                                        onClick={() => handleAction(req.id, 'REJECT')}
                                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                                    >
                                        REJECT
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="bg-slate-900 text-white p-2 rounded-lg text-xl">⚡</span>
                    OPS COMMAND CENTER
                </h1>
                <div className="text-xs font-mono text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    REAL-TIME MONITORING ACTIVE
                </div>
            </div>

            {/* WIDGET ROW 1: Kpis */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* FINANCIALS WIDGET */}
                <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <h2 className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-1">Global Cash Liquidity</h2>
                        <div className="text-4xl font-bold tracking-tighter">{formatCurrency(stats.totalCash)}</div>
                        <div className="mt-4 flex gap-4 text-xs font-mono opacity-80">
                            <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> WALLETS: {stats.activeWallets}</div>
                            <div>•</div>
                            <div className="hover:text-white transition-colors cursor-help">EST. REVENUE: {formatCurrency(stats.totalCash * 1.5)}*</div>
                        </div>
                    </div>
                    {/* Decorative Background */}
                    <div className="absolute -right-6 -bottom-6 opacity-10 text-9xl group-hover:scale-110 transition-transform duration-500">💰</div>
                </div>

                {/* MAP STATUS WIDGET */}
                <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <h2 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4">Location Status</h2>
                    <div className="space-y-3">
                        {locationsStatus.map(loc => (
                            <div key={loc.id} className="flex justify-between items-center group">
                                <span className="font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{loc.label}</span>
                                <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border border-emerald-100">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                    Online
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="md:col-span-1 bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner">
                    <h2 className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4">System Control</h2>
                    <div className="space-y-2">
                        <button onClick={() => window.location.href = '/admin'} className="w-full py-2.5 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-bold hover:bg-slate-900 hover:text-white transition-all text-slate-700">
                            Manage Users
                        </button>
                        <button onClick={() => window.location.href = '/reports'} className="w-full py-2.5 bg-white border border-slate-200 shadow-sm rounded-lg text-sm font-bold hover:bg-slate-900 hover:text-white transition-all text-slate-700">
                            View Reports
                        </button>
                    </div>
                </div>
            </div>

            {/* WIDGET ROW 2: SHARK FEED */}
            <div className="bg-slate-950 text-slate-200 rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
                <div className="p-4 bg-slate-900/50 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-teal-400 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)] animate-pulse"></span>
                        SHARK AI FEED (LIVE)
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Global Audit Log</span>
                </div>
                <div className="h-96 overflow-y-auto p-4 space-y-3 font-mono text-[13px] scrollbar-thin scrollbar-thumb-slate-800 hover:scrollbar-thumb-slate-600 transition-colors">
                    {feed.length === 0 && <div className="text-slate-600 italic py-8 text-center uppercase tracking-widest text-xs">No anomalies detected. Structure silent.</div>}
                    {feed.map(item => (
                        <div key={item.id} className={`p-4 rounded-xl border-l-4 flex gap-4 transition-all hover:translate-x-1 ${item.type === 'alert' || item.severity === 'high' ? 'bg-red-900/10 border-red-500 text-red-200' : 'bg-slate-900/50 border-cyan-500 text-emerald-100'}`}>
                            <div className="text-[10px] opacity-40 whitespace-nowrap pt-1 font-bold">
                                {item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000).toLocaleTimeString() : 'Recent'}
                            </div>
                            <div className="flex-1">
                                <div className="font-bold mb-1 uppercase tracking-tight flex items-center gap-2">
                                    {item.title || 'System Event'}
                                    {item.locationId && <span className="text-[9px] px-1.5 py-0.5 bg-white/10 rounded uppercase">{item.locationId}</span>}
                                </div>
                                <div className="opacity-70 leading-relaxed">{item.message}</div>
                            </div>
                            {item.transactionId && (
                                <div className="text-[9px] text-slate-500 self-end font-bold opacity-50 hover:opacity-100 transition-opacity">
                                    TXN: {item.transactionId.substring(0, 8)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
