import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTransactionQueue } from '../contexts/TransactionQueueContext';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { ArrowLeft, Plus, Trash2, Printer, Calendar, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EXPENSE_CATEGORIES, LOCATIONS } from '../lib/constants';

const DEFAULT_EXPENSE = { category: '', description: '', amount: '', id: 0 };

export default function Expenses() {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { addTransaction } = useTransactionQueue();

    // -- STATE --
    // Generate Serial for Session
    const [batchId] = useState(() => {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
        return `EXP-${date}-${rand}`;
    });
    const [header, setHeader] = useState({
        payee: '',
        date: new Date().toISOString().split('T')[0],
    });
    const [rows, setRows] = useState([{ ...DEFAULT_EXPENSE, id: 1 }]);
    const [submitting, setSubmitting] = useState(false);

    // -- HELPERS --
    const totalAmount = rows.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);

    const addRow = () => setRows([...rows, { ...DEFAULT_EXPENSE, id: Date.now() }]);
    const removeRow = (idx) => setRows(rows.filter((_, i) => i !== idx));
    const updateRow = (idx, field, val) => {
        const newRows = [...rows];
        newRows[idx] = { ...newRows[idx], [field]: val };
        setRows(newRows);
    };

    const handlePrint = () => window.print();

    const handleSubmit = async () => {
        if (!header.payee) return alert("Payee required");
        if (totalAmount <= 0) return alert("No valid amounts");

        setSubmitting(true);
        try {
            await addTransaction({
                type: 'EXPENSE',
                locationId: currentUser.locationId,
                batchId,
                payee: header.payee,
                date: header.date,
                items: rows.filter(r => r.amount && r.amount > 0),
                total: totalAmount,
                timestamp: new Date().toISOString()
            });
            alert("Expenses Saved!");
            navigate('/');
        } catch (e) {
            console.error(e);
            alert("Error saving: " + e.message);
        } finally {
            setSubmitting(false);
        }
    };

    // -- LOCATION LABELS --
    const locLabel = LOCATIONS[currentUser?.locationId]?.label || currentUser?.locationId;
    const unitLabel = LOCATIONS[currentUser?.locationId]?.units.find(u => u.id === currentUser?.unitId)?.label || currentUser?.unitId;

    if (!currentUser.locationId) return <div className="p-8 text-center text-red-500 font-bold">Select Location First</div>;

    return (
        <div className="space-y-6 pb-32 print:p-0">
            {/* HEADER */}
            <div className="bg-white border-b border-slate-200 sticky top-16 z-10 shadow-sm print:hidden">
                <div className="max-w-5xl mx-auto px-4 py-3">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <button onClick={() => navigate('/')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-1 text-sm">
                                <ArrowLeft size={16} /> Cancel
                            </button>
                            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <span>💸</span> Record Expenses
                            </h1>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-bold text-slate-700">{locLabel}</div>
                            <div className="text-xs text-slate-500 font-mono">{unitLabel}</div>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">REF: {batchId}</div>
                        </div>
                    </div>
                </div>
            </div>


            {/* PRINT HEADER */}
            <div className="hidden print:block mb-8 text-center border-b pb-4">
                <h1 className="text-2xl font-bold uppercase tracking-wider">Expense Voucher</h1>
                <div className="flex justify-between items-end mt-4">
                    <div className="text-left">
                        <div className="text-sm text-gray-500">Ocean Pearl Seafood</div>
                        <div className="font-bold">{currentUser.locationId?.toUpperCase()}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-mono font-bold">{batchId}</div>
                        <div className="text-xs text-gray-400">Voucher ID</div>
                    </div>
                </div>
            </div>

            {/* HEADER INPUTS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 print:border-none print:shadow-none print:p-0 print:mb-6">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payee / Recipient</label>
                    <input
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium outline-none focus:ring-2 focus:ring-ocean-dial print:hidden"
                        placeholder="Name of person paid..."
                        value={header.payee}
                        onChange={e => setHeader({ ...header, payee: e.target.value })}
                    />
                    {/* Print Text */}
                    <div className="hidden print:block text-lg font-bold border-b border-black w-full pb-1">
                        {header.payee || '________________'}
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Voucher Date</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-mono outline-none focus:ring-2 focus:ring-ocean-dial pl-10 print:hidden"
                            value={header.date}
                            onChange={(e) => setHeader({ ...header, date: e.target.value })}
                        />
                        <Calendar className="absolute left-3 top-3 text-slate-400 print:hidden" size={18} />
                        {/* Print Text */}
                        <div className="hidden print:block text-lg font-bold border-b border-black w-full pb-1">
                            {new Date(header.date).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-t-2 print:border-b-2 print:border-black print:rounded-none">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b print:bg-white print:text-black print:border-black print:uppercase">
                        <tr>
                            <th className="p-3 w-1/4 print:p-2">Category</th>
                            <th className="p-3 print:p-2">Description</th>
                            <th className="p-3 w-32 text-right print:p-2">Amount (IDR)</th>
                            <th className="p-3 w-10 print:hidden"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y print:divide-slate-300">
                        {rows.map((row, idx) => (
                            <tr key={row.id} className="print:hover:bg-white">
                                <td className="p-3 print:p-2 align-top">
                                    <select
                                        className="w-full p-2 border rounded print:hidden"
                                        value={row.category}
                                        onChange={e => updateRow(idx, 'category', e.target.value)}
                                    >
                                        <option value="">Select...</option>
                                        {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <div className="hidden print:block">{row.category}</div>
                                </td>
                                <td className="p-3 print:p-2 align-top">
                                    <input
                                        className="w-full p-2 border rounded print:hidden"
                                        placeholder="Item details..."
                                        value={row.description}
                                        onChange={e => updateRow(idx, 'description', e.target.value)}
                                    />
                                    <div className="hidden print:block">{row.description}</div>
                                </td>
                                <td className="p-3 print:p-2 align-top">
                                    <input
                                        type="number"
                                        className="w-full p-2 border rounded font-mono font-bold text-right print:hidden"
                                        placeholder="0"
                                        value={row.amount}
                                        onChange={e => updateRow(idx, 'amount', e.target.value)}
                                    />
                                    <div className="hidden print:block text-right font-mono">{parseFloat(row.amount || 0).toLocaleString()}</div>
                                </td>
                                <td className="p-3 print:hidden align-top">
                                    <button onClick={() => removeRow(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t print:bg-white print:border-t-2 print:border-black">
                        <tr>
                            <td colSpan="2" className="p-3 text-right font-bold text-slate-500 print:text-black">TOTAL</td>
                            <td className="p-3 text-right font-mono font-bold text-lg text-ocean-dial print:text-black">{totalAmount.toLocaleString()}</td>
                            <td className="print:hidden"></td>
                        </tr>
                    </tfoot>
                </table>
                <div className="p-3 border-t bg-slate-50 flex justify-between items-center print:hidden">
                    <button onClick={addRow} className="flex items-center gap-2 text-ocean-dial font-bold hover:underline">
                        <Plus size={18} /> Add Item
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 text-slate-500 hover:text-slate-800">
                        <Printer size={16} /> Print Voucher
                    </button>
                </div>
            </div>

            {/* PRINT SIGNATURE BLOCK */}
            <div className="hidden print:flex justify-between mt-12 pt-8">
                <div className="text-center">
                    <div className="h-16 border-b border-black w-48 mb-2"></div>
                    <div className="text-sm font-bold">Approved By</div>
                </div>
                <div className="text-center">
                    <div className="h-16 border-b border-black w-48 mb-2"></div>
                    <div className="text-sm font-bold">Received By</div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-2xl flex justify-between items-center z-[100] print:hidden">
                <div className="text-gray-500 text-sm">Valid Items: {rows.filter(r => r.amount > 0).length}</div>
                <div className="flex gap-4">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-8 py-3 bg-ocean-dial text-white font-bold rounded shadow-lg hover:bg-cyan-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        <Save size={18} />
                        {submitting ? 'Saving...' : 'CONFIRM EXPENSES'}
                    </button>
                </div>
            </div>
        </div >
    );
}
