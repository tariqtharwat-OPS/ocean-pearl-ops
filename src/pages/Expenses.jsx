import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import {
    collection, query, where, orderBy, onSnapshot,
    addDoc, updateDoc, deleteDoc, doc, serverTimestamp, limit
} from 'firebase/firestore';
import {
    Plus, Filter, Search, Calendar, Check, X,
    Trash2, Edit2, FileText, AlertTriangle,
    ChevronDown, Save, Eye, Paperclip
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWriteGuard } from '../lib/writeGuard';
import SelectWithAddNew from '../components/SelectWithAddNew';

export default function Expenses() {
    const { currentUser, ceoMode } = useAuth();
    const authContext = useAuth();
    const { guardWrite, isReadOnly } = useWriteGuard(authContext);

    // -- STATE --
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
    const [selectedExpense, setSelectedExpense] = useState(null);

    // Filters
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterDateRange, setFilterDateRange] = useState('this_month');

    // Form State
    const [formData, setFormData] = useState({
        expenseDate: new Date().toISOString().split('T')[0],
        expenseTypeId: '',
        expenseTypeNameSnapshot: '', // For reporting stability
        amount: '',
        paymentMethod: 'Cash',
        vendorId: '',
        vendorNameSnapshot: '',
        notes: '',
        status: 'PENDING_APPROVAL' // Default for submit
    });

    // -- PERMISSIONS --
    const isUnitOp = currentUser?.role_v2 === 'UNIT_OP';
    const isManager = currentUser?.role_v2 === 'LOC_MANAGER';
    const isHQ = currentUser?.role_v2 === 'HQ_ADMIN' || currentUser?.role_v2 === 'GLOBAL_ADMIN';
    const canApprove = isManager || isHQ;

    // -- EFFECT: FETCH EXPENSES --
    useEffect(() => {
        if (!currentUser?.locationId) return;

        setLoading(true);
        const col = collection(db, 'expenses');
        const constraints = [
            where('locationId', '==', currentUser.locationId),
            orderBy('expenseDate', 'desc'),
            limit(100) // Cap for performance
        ];

        // Filter constraints could be adding here if index exists, 
        // but for now client-side filtering + basic location guard is safer without custom indexes

        const unsub = onSnapshot(query(col, ...constraints), (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setExpenses(list);
            setLoading(false);
        }, (err) => {
            console.error("Expenses Fetch Error", err);
            toast.error("Failed to load expenses");
            setLoading(false);
        });

        return () => unsub();
    }, [currentUser?.locationId, currentUser?.unitId]); // Re-fetch on context switch

    // -- FILTERING LOGIC --
    const filteredExpenses = expenses.filter(ex => {
        if (filterStatus !== 'all' && ex.status !== filterStatus) return false;

        // Date Range Logic (Clientside for now)
        const date = new Date(ex.expenseDate);
        const now = new Date();
        if (filterDateRange === 'today') {
            return date.toDateString() === now.toDateString();
        }
        if (filterDateRange === 'this_month') {
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }

        // Filter by Unit if UnitOp or specific unit selected
        if (currentUser.unitId && ex.unitId && ex.unitId !== currentUser.unitId) return false;

        return true;
    });

    // -- HANDLERS --

    const handleOpenCreate = () => {
        if (isReadOnly) return toast.error("View Only Mode");
        setFormData({
            expenseDate: new Date().toISOString().split('T')[0],
            expenseTypeId: '',
            expenseTypeNameSnapshot: '',
            amount: '',
            paymentMethod: 'Cash',
            vendorId: '',
            vendorNameSnapshot: '',
            notes: '',
            status: isUnitOp ? 'PENDING_APPROVAL' : 'APPROVED' // Managers auto-approve their own? Maybe safe to PENDING default always.
            // Let's stick to PENDING by default unless explicitly approved.
        });
        setView('create');
    };

    const handleOpenEdit = (ex) => {
        setSelectedExpense(ex);
        setFormData({
            expenseDate: ex.expenseDate,
            expenseTypeId: ex.expenseTypeId,
            expenseTypeNameSnapshot: ex.expenseTypeNameSnapshot || '',
            amount: ex.amount,
            paymentMethod: ex.paymentMethod,
            vendorId: ex.vendorId || '', // Handle missing
            vendorNameSnapshot: ex.vendorNameSnapshot || '',
            notes: ex.notes || '',
            status: ex.status
        });
        setView('edit');
    };

    const handleSubmit = async (e, actionType = 'SUBMIT') => {
        e.preventDefault();

        // Validation
        if (!formData.amount || parseFloat(formData.amount) <= 0) return toast.error("Invalid Amount");
        if (!formData.expenseTypeId) return toast.error("Expense Type is required");
        if (!formData.vendorId && !formData.vendorNameSnapshot) return toast.error("Vendor is required");

        const actionName = selectedExpense
            ? `Update Expense ${selectedExpense.id}`
            : `Create Expense ${formData.amount}`;

        const canProceed = await guardWrite(authContext, actionName);
        if (!canProceed) return;

        try {
            const payload = {
                ...formData,
                amount: parseFloat(formData.amount),
                locationId: currentUser.locationId,
                unitId: currentUser.unitId || null,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser.uid
            };

            // Status Logic
            if (actionType === 'DRAFT') payload.status = 'DRAFT';
            else if (actionType === 'APPROVE') {
                payload.status = 'APPROVED';
                payload.approvedBy = currentUser.uid;
                payload.approvedAt = new Date().toISOString();
            } else if (actionType === 'SUBMIT') {
                // Is Manager? They can auto-approve if they create it? 
                // Let's assume Managers creating expenses are auto-approved for simplicity unless they want Draft.
                if ((isManager || isHQ) && !selectedExpense) {
                    payload.status = 'APPROVED';
                    payload.approvedBy = currentUser.uid;
                    payload.approvedAt = new Date().toISOString();
                } else {
                    payload.status = 'PENDING_APPROVAL';
                }
            }

            if (selectedExpense) {
                await updateDoc(doc(db, 'expenses', selectedExpense.id), payload);
                toast.success("Expense Updated");
            } else {
                payload.createdAt = new Date().toISOString();
                payload.createdBy = currentUser.uid;
                payload.createdByName = currentUser.displayName || currentUser.email;
                await addDoc(collection(db, 'expenses'), payload);
                toast.success("Expense Created");
            }
            setView('list');
        } catch (e) {
            console.error(e);
            toast.error("Error saving expense");
        }
    };

    const handleApproveReject = async (ex, action) => {
        const canProceed = await guardWrite(authContext, `${action} Expense`);
        if (!canProceed) return;

        const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        try {
            await updateDoc(doc(db, 'expenses', ex.id), {
                status: newStatus,
                [action === 'APPROVE' ? 'approvedBy' : 'rejectedBy']: currentUser.uid,
                [action === 'APPROVE' ? 'approvedAt' : 'rejectedAt']: new Date().toISOString()
            });
            toast.success(`Expense ${newStatus}`);
        } catch (e) {
            toast.error("Action failed");
        }
    };

    const handleDelete = async (ex) => {
        if (!confirm("Delete this expense?")) return;
        const canProceed = await guardWrite(authContext, "Delete Expense");
        if (!canProceed) return;

        try {
            await deleteDoc(doc(db, 'expenses', ex.id));
            toast.success("Deleted");
            if (view === 'edit') setView('list');
        } catch (e) {
            toast.error("Delete failed");
        }
    };

    // -- RENDER HELPERS --
    const getStatusColor = (s) => {
        switch (s) {
            case 'APPROVED': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
            case 'DRAFT': return 'bg-slate-100 text-slate-600 border-slate-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    // If no context (Safety)
    if (!currentUser.locationId) return <div className="p-8 text-center">Select Location</div>;

    return (
        <div className="space-y-6 pb-20">
            {/* -- HEADER & FILTERS -- */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <span>🧾</span> Location Expenses
                        </h1>
                        <p className="text-xs text-slate-500 font-mono mt-1">
                            {currentUser.locationId.toUpperCase()}
                            {currentUser.unitId && ` / ${currentUser.unitId.toUpperCase()}`}
                        </p>
                    </div>
                    <div>
                        <button
                            onClick={handleOpenCreate}
                            disabled={isReadOnly}
                            className="bg-ocean-dial text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            <Plus size={18} /> New Expense
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Filter size={14} className="text-slate-400" />
                        <select
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="PENDING_APPROVAL">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="DRAFT">Draft</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <Calendar size={14} className="text-slate-400" />
                        <select
                            className="bg-transparent text-sm font-bold text-slate-700 outline-none"
                            value={filterDateRange}
                            onChange={e => setFilterDateRange(e.target.value)}
                        >
                            <option value="today">Today</option>
                            <option value="this_month">This Month</option>
                            <option value="all_time">All Time</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* -- LIST VIEW -- */}
            {view === 'list' && (
                <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Vendor / Payee</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3 text-right">Amount</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading...</td></tr>
                                ) : filteredExpenses.length === 0 ? (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400 italic">No expenses found for this filter.</td></tr>
                                ) : (
                                    filteredExpenses.map(item => (
                                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-slate-600">
                                                {new Date(item.expenseDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-slate-800">
                                                {item.vendorNameSnapshot || 'Unknown'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                                                    {item.expenseTypeNameSnapshot}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                                                {item.amount?.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(item.status)}`}>
                                                    {item.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center flex justify-center gap-2">
                                                <button onClick={() => handleOpenEdit(item)} className="text-blue-500 hover:text-blue-700 p-1">
                                                    {isReadOnly ? <Eye size={16} /> : <Edit2 size={16} />}
                                                </button>
                                                {canApprove && item.status === 'PENDING_APPROVAL' && (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleApproveReject(item, 'APPROVE')} className="text-emerald-500 hover:text-emerald-700 p-1"><Check size={16} /></button>
                                                        <button onClick={() => handleApproveReject(item, 'REJECT')} className="text-red-500 hover:text-red-700 p-1"><X size={16} /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* -- CREATE / EDIT MODAL -- */}
            {(view === 'create' || view === 'edit') && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                {view === 'create' ? <Plus size={20} /> : <Edit2 size={20} />}
                                {view === 'create' ? 'Record Expense' : 'Edit Expense'}
                            </h2>
                            <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content - Scrollable */}
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Date */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date</label>
                                    <input
                                        type="date"
                                        className="input-field w-full p-2 border rounded"
                                        value={formData.expenseDate}
                                        onChange={e => setFormData({ ...formData, expenseDate: e.target.value })}
                                        disabled={isReadOnly}
                                    />
                                </div>
                                {/* Amount */}
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Amount (IDR)</label>
                                    <input
                                        type="number"
                                        className="input-field w-full p-2 border rounded font-mono text-lg font-bold text-right"
                                        placeholder="0"
                                        value={formData.amount}
                                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                        disabled={isReadOnly}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Expense Type - INLINE ADD NEW */}
                                <div>
                                    <SelectWithAddNew
                                        label="Expense Type"
                                        collectionName="expense_types"
                                        displayField="name"
                                        value={formData.expenseTypeId}
                                        onChange={(id) => setFormData(prev => ({ ...prev, expenseTypeId: id }))}
                                        onObjectChange={(item) => setFormData(prev => ({ ...prev, expenseTypeNameSnapshot: item.name }))}
                                        scope={{ locationId: null }} // Types are global usually
                                        allowAdd={true} // Managers can add
                                    />
                                </div>

                                {/* Vendor - INLINE ADD NEW */}
                                <div>
                                    <SelectWithAddNew
                                        label="Vendor / Payee"
                                        collectionName="vendors"
                                        displayField="name"
                                        value={formData.vendorId}
                                        onChange={(id) => setFormData(prev => ({ ...prev, vendorId: id }))}
                                        onObjectChange={(item) => setFormData(prev => ({ ...prev, vendorNameSnapshot: item.name }))}
                                        scope={{ locationId: currentUser.locationId }}
                                        filterByLocation={true}
                                        allowAdd={true} // Unit Ops can add
                                    />
                                </div>
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Payment Method</label>
                                <div className="flex gap-2">
                                    {['Cash', 'Bank Transfer', 'Credit'].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, paymentMethod: m })}
                                            className={`px-3 py-1.5 rounded border text-sm font-bold ${formData.paymentMethod === m ? 'bg-ocean-dial text-white border-ocean-dial' : 'bg-white text-slate-600 border-slate-200'}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Notes / Description</label>
                                <textarea
                                    className="w-full p-2 border rounded text-sm"
                                    rows="3"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Details about the expense..."
                                />
                            </div>

                            {/* Attachment Placeholder */}
                            <div className="border border-dashed border-slate-300 rounded-lg p-4 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
                                <Paperclip size={24} />
                                <span>Attachment Upload (Coming Soon)</span>
                            </div>

                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                            {view === 'edit' && canApprove ? (
                                <button onClick={() => handleDelete(selectedExpense)} className="text-red-500 hover:underline text-sm font-bold flex items-center gap-1">
                                    <Trash2 size={16} /> Delete
                                </button>
                            ) : <div></div>}

                            <div className="flex gap-3">
                                <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded">
                                    Cancel
                                </button>

                                {!isReadOnly && (
                                    <>
                                        {(isUnitOp && !selectedExpense) || (view === 'edit' && selectedExpense?.status === 'DRAFT') ? (
                                            <button
                                                onClick={(e) => handleSubmit(e, 'DRAFT')}
                                                className="px-4 py-2 text-slate-600 border border-slate-300 rounded font-bold hover:bg-white"
                                            >
                                                Save Draft
                                            </button>
                                        ) : null}

                                        <button
                                            onClick={(e) => handleSubmit(e, 'SUBMIT')}
                                            className="px-6 py-2 bg-ocean-dial text-white rounded font-bold shadow hover:bg-cyan-700 flex items-center gap-2"
                                        >
                                            <Save size={18} />
                                            {selectedExpense ? 'Update' : 'Submit Check'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
