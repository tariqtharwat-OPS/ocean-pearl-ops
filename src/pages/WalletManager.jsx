import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { LOCATIONS } from '../lib/constants';
import { ArrowLeft, Plus, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// V2 API
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function WalletManager() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('requests');
    const functions = getFunctions(undefined, 'asia-southeast2');

    // Permissions
    const isHQ = currentUser?.role_v2 === 'HQ_ADMIN';
    const isManager = currentUser?.role_v2 === 'LOC_MANAGER' || isHQ;
    const isUnit = currentUser?.role_v2 === 'UNIT_OP';

    // If Unit Op, force tab to 'requests' and hide others
    useEffect(() => {
        if (isUnit) setActiveTab('requests');
    }, [isUnit]);

    return (
        <div className="space-y-4 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-10 shadow-sm mb-4">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <div className="flex justify-between items-center">
                        <div>
                            <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 text-sm">
                                <ArrowLeft size={16} /> Back
                            </button>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span>💸</span> {isHQ ? 'Global Finance' : 'Wallet & Requests'}
                            </h1>
                        </div>
                        {/* Only Manager/HQ sees wallet balance in header */}
                        {isManager && (
                            <WalletBalanceIndicator currentUser={currentUser} isHQ={isHQ} />
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4">
                {/* Tabs */}
                {isManager && (
                    <div className="flex p-1 bg-slate-100 rounded-xl mb-6">
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'requests' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                        >
                            Approvals & Requests
                        </button>
                        <button
                            onClick={() => setActiveTab('wallet')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'wallet' ? 'bg-white shadow text-emerald-600' : 'text-slate-500'}`}
                        >
                            Wallet Management
                        </button>
                    </div>
                )}

                {/* VIEWS */}
                {activeTab === 'requests' ? (
                    <RequestsView currentUser={currentUser} isManager={isManager} isHQ={isHQ} functions={functions} />
                ) : (
                    <WalletView currentUser={currentUser} isHQ={isHQ} functions={functions} />
                )}
            </div>
        </div>
    );
}

// === COMPONENT: Wallet Balance (Header) ===
function WalletBalanceIndicator({ currentUser, isHQ }) {
    const [balance, setBalance] = useState(0);

    useEffect(() => {
        const walletId = isHQ ? 'HQ' : currentUser?.target_id; // target_id for manager is location
        if (!walletId) return;

        // This fails if user not allowed to read wallet (backend rule)
        // But isManager check passed.
        try {
            const unsub = onSnapshot(collection(db, 'site_wallets'), (snap) => {
                const doc = snap.docs.find(d => d.id === walletId);
                if (doc) setBalance(doc.data().balance || 0);
            });
            return () => unsub();
        } catch (e) {
            console.error("Wallet Read Error", e);
        }
    }, [isHQ, currentUser]);

    const formatMoney = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);

    return (
        <div className="text-right">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                {isHQ ? 'HQ Treasury' : 'Location Wallet'}
            </div>
            <div className={`text-xl font-mono font-bold ${balance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {formatMoney(balance)}
            </div>
        </div>
    );
}

// === VIEW: Requests List & Creation ===
function RequestsView({ currentUser, isManager, isHQ, functions }) {
    const [requests, setRequests] = useState([]);
    const [showCreate, setShowCreate] = useState(false);

    // Fetch Requests related to user scope
    useEffect(() => {
        let q;
        const col = collection(db, 'financial_requests');

        if (isHQ) {
            // HQ sees all Funding Requests (and maybe audits expenses)
            // For MVP, HQ Admin sees ALL pending requests to approve Funding
            // Or maybe separate lists? Let's just fetch all PENDING for now.
            q = query(col, where('status', '==', 'PENDING'), orderBy('createdAt', 'desc'));
        } else if (isManager) {
            // Manager sees requests for their Location
            q = query(col, where('locationId', '==', currentUser.target_id), orderBy('createdAt', 'desc'));
        } else {
            // Unit Op sees their own requests
            q = query(col, where('requesterId', '==', currentUser.uid), orderBy('createdAt', 'desc'));
        }

        const unsub = onSnapshot(q, (snap) => {
            setRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => console.error("Req Fetch Error", err));

        return () => unsub();
    }, [currentUser, isHQ, isManager]);

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-700">
                    {isManager ? 'Pending Approvals' : 'My Requests'}
                </h3>
                <button
                    onClick={() => setShowCreate(true)}
                    className="btn btn-primary flex items-center gap-2 text-sm px-4 py-2"
                >
                    <Plus size={16} /> New Request
                </button>
            </div>

            {/* Creation Modal/Form */}
            {showCreate && (
                <CreateRequestForm
                    onClose={() => setShowCreate(false)}
                    currentUser={currentUser}
                    isManager={isManager}
                    functions={functions}
                />
            )}

            {/* List */}
            <div className="space-y-3">
                {requests.length === 0 && (
                    <div className="text-center py-10 text-slate-400 italic bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        No pending requests found.
                    </div>
                )}

                {requests.map(req => (
                    <RequestCard
                        key={req.id}
                        req={req}
                        currentUser={currentUser}
                        isManager={isManager}
                        isHQ={isHQ}
                        functions={functions}
                    />
                ))}
            </div>
        </div>
    );
}

function RequestCard({ req, currentUser, isManager, isHQ, functions }) {
    const [processing, setProcessing] = useState(false);

    // Can Approve Logic
    // HQ approves FUNDING.
    // Manager approves EXPENSE (if matches loc).
    const canApprove = (isHQ && req.type === 'FUNDING') || (isManager && !isHQ && req.type === 'EXPENSE');

    // Unit Op cannot approve anything.

    const handleAction = async (action) => {
        if (!confirm(`Are you sure you want to ${action} this request?`)) return;
        setProcessing(true);
        try {
            const endpoint = action === 'APPROVE' ? 'approveFinancialRequest' : 'rejectFinancialRequest';
            const fn = httpsCallable(functions, endpoint);
            await fn({ requestId: req.id, reason: action === 'REJECT' ? 'Manager Rejected' : null });
            // UI updates via snapshot
        } catch (e) {
            alert(`Error: ${e.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const formatMoney = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(n);

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
            <div className="flex justify-between items-start">
                <div>
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit mb-1 ${req.type === 'FUNDING' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {req.type}
                    </div>
                    <h4 className="font-bold text-slate-800">{req.description}</h4>
                    <p className="text-xs text-slate-500">
                        Requested by {req.requesterName} • {new Date(req.createdAt?.toDate()).toLocaleDateString()}
                    </p>
                </div>
                <div className="text-right">
                    <div className="font-mono font-bold text-lg text-slate-800">{formatMoney(req.amount)}</div>
                    <div className={`text-xs font-bold uppercase ${req.status === 'PENDING' ? 'text-amber-500' : req.status === 'APPROVED' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {req.status}
                    </div>
                </div>
            </div>

            {/* Approval Actions */}
            {req.status === 'PENDING' && canApprove && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-slate-100">
                    <button
                        onClick={() => handleAction('REJECT')}
                        disabled={processing}
                        className="flex-1 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center gap-1"
                    >
                        <X size={14} /> Reject
                    </button>
                    <button
                        onClick={() => handleAction('APPROVE')}
                        disabled={processing}
                        className="flex-1 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center justify-center gap-1"
                    >
                        <Check size={14} /> Approve
                    </button>
                </div>
            )}
        </div>
    );
}

// === FORM: Create Request ===
function CreateRequestForm({ onClose, currentUser, isManager, functions }) {
    const [type, setType] = useState('EXPENSE');
    const [amount, setAmount] = useState('');
    const [desc, setDesc] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Only Manager can create FUNDING
    const canFunding = isManager;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const fn = httpsCallable(functions, 'createFinancialRequest');
            await fn({
                type,
                amount: parseFloat(amount),
                description: desc,
                locationId: currentUser.locationId || currentUser.target_id, // Safety fallback
                unitId: currentUser.unitId || currentUser.target_id, // If unit_op, target_id is unit
                category: 'General'
            });
            onClose();
        } catch (e) {
            alert(e.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Create Request</h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type Selector */}
                    {canFunding && type !== 'EXPENSE' && (
                        <div className="p-3 bg-purple-50 text-purple-700 text-sm rounded-lg flex gap-2">
                            <AlertTriangle size={16} />
                            Requesting funds from HQ for this Location.
                        </div>
                    )}

                    {canFunding && (
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button
                                type="button"
                                onClick={() => setType('EXPENSE')}
                                className={`flex-1 py-1 text-sm font-bold rounded ${type === 'EXPENSE' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
                            >
                                Expense
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('FUNDING')}
                                className={`flex-1 py-1 text-sm font-bold rounded ${type === 'FUNDING' ? 'bg-white shadow text-purple-600' : 'text-slate-500'}`}
                            >
                                HQ Funding
                            </button>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-bold text-slate-700">Amount (IDR)</label>
                        <input
                            type="number"
                            className="input-field text-lg font-bold"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                            min="100"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-bold text-slate-700">Description</label>
                        <textarea
                            className="input-field"
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            required
                            placeholder={type === 'EXPENSE' ? "e.g. Bought Ice, Fuel Repair" : "e.g. Weekly Operations Budget"}
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 btn bg-slate-100 text-slate-600">Cancel</button>
                        <button type="submit" disabled={submitting} className="flex-1 btn btn-primary">
                            {submitting ? 'Creating...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// === VIEW: Wallet Management (Manager Only) ===
function WalletView({ currentUser, isHQ, functions }) {
    // Current Balance managed by Header
    // Here we can show Transaction History or "Direct Actions" if any allowed (e.g. Supplier Payment)
    // For V2: Keep it simple. Show "Recent Transactions" for this wallet.

    // This is optional for Phase 4 but good for visibility.
    return (
        <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-600 mb-2">Wallet Ledger</h3>
            <p className="text-sm">Use "Requests" to initiate new expenses or funding.</p>
            <p className="text-xs mt-4 opacity-50">Transaction History View coming in 4.1</p>
        </div>
    );
}
