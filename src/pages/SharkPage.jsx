import React, { useEffect } from 'react';
import SharkChat from '../components/SharkChat';
import { useAuth } from '../contexts/AuthContext';
import { Fish } from 'lucide-react';

export default function SharkPage() {
    const { currentUser } = useAuth();

    // We want the chat to be open by default when visiting this page
    // SharkChat controls its own state, but we can instruct it or just show a full-page wrapper
    // Actually, SharkChat has an 'isFullScreen' prop state internally, but maybe it's better to 
    // just render the SharkChat component and let the user interact.
    // However, SharkChat is designed as a FAB/Modal. 
    // If we want a dedicated page, we might need to adjust SharkChat to accept a 'defaultOpen' prop
    // or just render it. Since we can't easily change SharkChat's internal state from here without refactoring,
    // we will provide a clear "Open Assistant" interface or just rely on the layout's widget.

    // BETTER APPROACH: Render a placeholder that says "Shark AI is active" and maybe 
    // some quick action buttons that trigger the chat if possible, OR just explain how to use it.
    // BUT the requirement is to fix the 404.

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="bg-gradient-to-r from-slate-900 to-teal-900 text-white p-8 rounded-2xl shadow-xl flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Fish size={32} className="text-teal-400" />
                        Shark AI Intelligence
                    </h1>
                    <p className="text-teal-100 mt-2 max-w-xl">
                        Your operational assistant is ready. Shark monitors inventory, analyzes transactions,
                        and detects anomalies across Kaimana, Saumlaki, and Jakarta.
                    </p>
                </div>
                <div className="hidden md:block opacity-50">
                    <Fish size={128} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-lg mb-4 text-slate-800">Available Commands</h2>
                    <ul className="space-y-3 text-slate-600 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono text-xs font-bold">INVENTORY</span>
                            "What is the current stock of Anchovy in Kaimana?"
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono text-xs font-bold">FINANCE</span>
                            "Show me expenses for this week."
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-mono text-xs font-bold">DRAFT</span>
                            "Draft a receipt for 50kg Tuna from Pak Budi."
                        </li>
                    </ul>
                    <div className="mt-6 p-4 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200">
                        <strong>Note:</strong> Access Shark anytime by clicking the <span className="font-bold">Fish Icon</span> in the bottom right corner of your screen.
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mb-4">
                        <Fish size={32} />
                    </div>
                    <h3 className="font-bold text-lg">System Status</h3>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                        <span className="text-sm text-slate-600 font-medium">Shark Model V6: Online</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Region: us-central1 (Gemini 1.5 Pro)</p>
                </div>
            </div>

            {/* We render the widget here too just in case it wasn't in layout (it is, but safe to have purely for this page context if needed? No, duplicate widgets would be bad.) */}
            {/* The Layout.jsx handles the global widget. This page just serves as a landing for the /shark route. */}
        </div>
    );
}
