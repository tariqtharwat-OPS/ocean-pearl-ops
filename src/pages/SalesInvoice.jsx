import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { ArrowLeft } from 'lucide-react';
import { GRADES, LOCATIONS } from '../lib/constants';
import { useTransactionQueue } from '../contexts/TransactionQueueContext';
import { useWriteGuard } from '../lib/writeGuard';
import { toast } from 'react-hot-toast';

export default function SalesInvoice() {
    const navigate = useNavigate();
    const authContext = useAuth();
    const { currentUser } = authContext;
    const { addTransaction } = useTransactionQueue();
    const { guardWrite } = useWriteGuard(authContext);

    // Data State
    const [locations, setLocations] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        buyerId: '',
        buyerName: '',
        sourceLocationId: currentUser?.locationId || '',
        sourceUnitId: currentUser?.unitId || '',
        itemId: '',
        gradeId: '',
        quantityKg: '',
        pricePerKg: '',
        paymentType: 'SALE_INVOICE' // Default to Receivable
    });

    const [loading, setLoading] = useState(false);
    const [partners, setPartners] = useState([]);

    // Fetch Data
    useEffect(() => {
        const fetchResources = async () => {
            try {
                const [locSnap, fpSnap, rmSnap, partSnap] = await Promise.all([
                    getDocs(collection(db, 'locations')),
                    getDocs(collection(db, 'finished_products')),
                    getDocs(collection(db, 'raw_materials')),
                    getDocs(query(collection(db, 'partners'), where('type', 'in', ['buyer', 'sell_agent'])))
                ]);

                setLocations(locSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                console.log("SALES: Fetched", {
                    locs: locSnap.size,
                    fps: fpSnap.size,
                    rms: rmSnap.size,
                    partners: partSnap.size
                });

                console.log("SALES: RM count:", rmSnap.size);

                // Combine FP and RM for selection (since production might use RM ids for stock)
                const items = [
                    ...fpSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.data().nameEn || d.id, category: 'Finished Product' })),
                    ...rmSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id, category: 'Raw Material' }))
                ];
                console.log("SALES: Total items mapped", items.length);
                setProducts(items.filter(p => p.name));
                setPartners(partSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (error) {
                console.error("Error fetching resources:", error);
            } finally {
                setLoadingData(false);
            }
        };
        fetchResources();
    }, []);

    const calculateTotal = () => {
        const qty = parseFloat(formData.quantityKg) || 0;
        const price = parseFloat(formData.pricePerKg) || 0;
        return qty * price;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const canProceed = await guardWrite(authContext, `Sale Invoice: ${formData.itemId}`);
        if (!canProceed) return;

        if (!formData.sourceLocationId) return toast.error("Source Location is required");
        if (!formData.gradeId) return toast.error("Grade is REQUIRED for Sales.");

        setLoading(true);

        try {
            const payload = {
                type: formData.paymentType,
                locationId: formData.sourceLocationId,
                unitId: formData.sourceUnitId || 'generic',
                buyerId: formData.buyerId,
                buyerName: formData.buyerName,
                itemId: formData.itemId,
                gradeId: formData.gradeId,
                quantityKg: parseFloat(formData.quantityKg),
                pricePerKg: parseFloat(formData.pricePerKg),
                amount: calculateTotal(),
                description: `Sale to ${formData.buyerName}: ${formData.itemId} (${formData.gradeId})`
            };

            await addTransaction(payload);

            toast.success('Sale Transaction Queued Successfully!');
            navigate('/');
        } catch (error) {
            console.error("Sale Error:", error);
            toast.error("Failed to create sale: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Find active location object for Unit selection
    const selectedLocation = locations.find(l => l.id === formData.sourceLocationId);

    if (loadingData) return <div className="p-8 text-center">Loading Sales Module...</div>;

    return (
        <div className="space-y-4 max-w-2xl mx-auto p-4">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={() => navigate('/')} className="p-2 -ml-2 text-gray-500 hover:bg-slate-100 rounded-full">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold text-slate-800">New Sales Invoice</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Source & Buyer */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Invoice Details</h3>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Source Stock Location</label>
                        <select
                            name="sourceLocationId"
                            className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-ocean-dial outline-none transition-all"
                            value={formData.sourceLocationId}
                            onChange={handleChange}
                            required
                        >
                            <option value="">-- Select Source Location --</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.label}</option>
                            ))}
                        </select>
                    </div>

                    {selectedLocation?.units?.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Source Unit (Optional)</label>
                            <select
                                name="sourceUnitId"
                                className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-ocean-dial outline-none transition-all"
                                value={formData.sourceUnitId}
                                onChange={handleChange}
                            >
                                <option value="">-- Any / Generic Stock --</option>
                                {selectedLocation.units.filter(u => u.active).map(u => (
                                    <option key={u.id} value={u.id}>{u.label}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Buyer / Sell Agent</label>
                        <select
                            name="buyer"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-ocean-dial outline-none bg-white"
                            value={formData.buyerId}
                            onChange={(e) => {
                                const p = partners.find(x => x.id === e.target.value);
                                setFormData(prev => ({ ...prev, buyerId: e.target.value, buyerName: p ? p.name : '' }));
                            }}
                            required
                        >
                            <option value="">-- Select Buyer --</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Type</label>
                        <select
                            name="paymentType"
                            className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-ocean-dial outline-none bg-white"
                            value={formData.paymentType}
                            onChange={handleChange}
                            required
                        >
                            <option value="SALE_INVOICE">Standard Invoice (Credit)</option>
                            <option value="LOCAL_SALE">Cash Sale (Immediate Wallet Impact)</option>
                        </select>
                    </div>
                </div>

                {/* 2. Item Details */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Product Details</h3>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Product</label>
                        <select
                            name="itemId"
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-ocean-dial outline-none"
                            value={formData.itemId}
                            onChange={handleChange}
                            required
                        >
                            <option value="">-- Select Product --</option>
                            {products.map(item => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                            <select
                                name="gradeId"
                                className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-ocean-dial outline-none"
                                value={formData.gradeId}
                                onChange={handleChange}
                                required
                            >
                                <option value="">Select Grade</option>
                                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Price / Kg (IDR)</label>
                            <input
                                name="pricePerKg"
                                type="number"
                                step="0.01"
                                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-ocean-dial outline-none"
                                value={formData.pricePerKg}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Quantity (Kg)</label>
                        <input
                            name="quantityKg"
                            type="number"
                            step="0.01"
                            className="w-full p-3 border border-slate-300 rounded-lg bg-slate-50 font-bold text-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-ocean-dial outline-none"
                            value={formData.quantityKg}
                            onChange={handleChange}
                            required
                        />
                    </div>
                </div>

                {/* Total */}
                <div className="bg-ocean-dial text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
                    <span className="font-medium opacity-90">Total Invoice Amount</span>
                    <span className="text-2xl font-bold tracking-tight">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(calculateTotal())}
                    </span>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-slate-800 text-white font-bold text-lg rounded-xl shadow-xl hover:bg-slate-900 transition-transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? 'Processing Invoice...' : 'Confirm & Issue Invoice'}
                </button>

                <div className="h-10"></div>
            </form>
        </div>
    );
}
