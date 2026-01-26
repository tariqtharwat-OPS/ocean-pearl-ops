import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function OperateAsConfirmation({ currentUser, actionName, onConfirm, onCancel }) {
    const locLabel = currentUser?.locationId?.toUpperCase() || 'GLOBAL';
    const roleLabel = currentUser?.role_v2?.replace('_', ' ') || 'ADMIN';

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-4 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border-4 border-orange-500 animate-scaleIn">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 rounded-t-xl">
                    <div className="flex items-center gap-3 text-white">
                        <AlertTriangle size={36} className="flex-shrink-0" />
                        <div>
                            <h2 className="text-xl font-bold">Operate As Mode</h2>
                            <p className="text-sm text-orange-100">First Action Confirmation</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                        <p className="text-sm text-orange-900 font-semibold mb-2">
                            You are about to perform real actions as:
                        </p>
                        <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-orange-800">Location:</span>
                                <span className="text-orange-700">{locLabel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-orange-800">Role:</span>
                                <span className="text-orange-700">{roleLabel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-orange-800">Action:</span>
                                <span className="text-orange-700">{actionName}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <p className="text-sm text-slate-700">
                            <strong className="text-slate-900">Important:</strong> This will create real data
                            and affect business operations. All actions will be recorded in your name as CEO.
                        </p>
                    </div>

                    <div className="text-xs text-slate-500 italic">
                        This confirmation will only appear once per session. Subsequent actions will proceed automatically.
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 pt-0 flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <XCircle size={20} />
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
                    >
                        <CheckCircle size={20} />
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
}
