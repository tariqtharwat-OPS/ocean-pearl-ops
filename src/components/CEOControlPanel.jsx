import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LOCATIONS } from '../lib/constants';
import { Eye, PlayCircle, XCircle, Crown, AlertTriangle } from 'lucide-react';

export default function CEOControlPanel() {
    const { ceoMode, isCEO, setViewAsMode, setOperateAsMode, exitCEOMode, currentUser } = useAuth();
    const [showPanel, setShowPanel] = useState(false);
    const [selectedMode, setSelectedMode] = useState('VIEW_AS');
    const [selectedLocation, setSelectedLocation] = useState('kaimana');
    const [selectedUnit, setSelectedUnit] = useState('');
    const [selectedRole, setSelectedRole] = useState('UNIT_OP');

    // Only show for CEO
    if (!isCEO()) return null;

    // If in CEO mode, show banner instead of panel button
    if (ceoMode) {
        return <CEOModeBanner />;
    }

    const handleActivateMode = () => {
        const locData = LOCATIONS[selectedLocation];
        const unitId = selectedUnit || (locData?.units?.[0]?.id || '');

        if (selectedMode === 'VIEW_AS') {
            setViewAsMode(selectedLocation, unitId, selectedRole);
        } else {
            setOperateAsMode(selectedLocation, unitId, selectedRole);
        }
        setShowPanel(false);
    };

    return (
        <>
            {/* Floating CEO Button */}
            <button
                onClick={() => setShowPanel(true)}
                className="fixed bottom-20 right-4 z-50 bg-gradient-to-r from-yellow-500 to-amber-600 text-black p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center gap-2 font-bold"
                title="CEO Control Panel"
            >
                <Crown size={24} />
                <span className="hidden md:inline">CEO Control</span>
            </button>

            {/* Control Panel Modal */}
            {showPanel && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-yellow-500 to-amber-600 p-6 rounded-t-2xl border-b-4 border-amber-700">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <Crown size={32} className="text-black" />
                                    <div>
                                        <h2 className="text-2xl font-bold text-black">CEO Control Panel</h2>
                                        <p className="text-sm text-black/70">Multi-Role Simulation Mode</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPanel(false)}
                                    className="p-2 hover:bg-black/10 rounded-full transition-colors"
                                >
                                    <XCircle size={24} className="text-black" />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-6">
                            {/* Mode Selector */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                                    Select Mode
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setSelectedMode('VIEW_AS')}
                                        className={`p-4 rounded-xl border-2 transition-all ${selectedMode === 'VIEW_AS'
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                            : 'border-slate-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <Eye size={24} className={selectedMode === 'VIEW_AS' ? 'text-blue-600' : 'text-slate-400'} />
                                            <span className={`font-bold ${selectedMode === 'VIEW_AS' ? 'text-blue-700' : 'text-slate-600'}`}>
                                                View As
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">Read-only mode for auditing</p>
                                    </button>

                                    <button
                                        onClick={() => setSelectedMode('OPERATE_AS')}
                                        className={`p-4 rounded-xl border-2 transition-all ${selectedMode === 'OPERATE_AS'
                                            ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                                            : 'border-slate-200 hover:border-orange-300'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <PlayCircle size={24} className={selectedMode === 'OPERATE_AS' ? 'text-orange-600' : 'text-slate-400'} />
                                            <span className={`font-bold ${selectedMode === 'OPERATE_AS' ? 'text-orange-700' : 'text-slate-600'}`}>
                                                Operate As
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500">Full write permissions</p>
                                    </button>
                                </div>
                            </div>

                            {/* Warning Banner */}
                            {selectedMode === 'OPERATE_AS' && (
                                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-lg flex gap-3">
                                    <AlertTriangle size={20} className="text-orange-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-orange-800">
                                        <strong>Operate As Mode:</strong> You will have full write permissions as the selected role.
                                        All actions will be recorded in your name.
                                    </div>
                                </div>
                            )}

                            {/* Location Selector */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                    Select Location
                                </label>
                                <select
                                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                                    value={selectedLocation}
                                    onChange={(e) => {
                                        setSelectedLocation(e.target.value);
                                        setSelectedUnit(''); // Reset unit on location change
                                    }}
                                >
                                    {Object.values(LOCATIONS).map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Unit Selector */}
                            {selectedLocation && LOCATIONS[selectedLocation] && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                        Select Unit
                                    </label>
                                    <select
                                        className="w-full p-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                                        value={selectedUnit}
                                        onChange={(e) => setSelectedUnit(e.target.value)}
                                    >
                                        {LOCATIONS[selectedLocation].units.map(u => (
                                            <option key={u.id} value={u.id}>{u.label}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Role Selector */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                                    Select Role
                                </label>
                                <select
                                    className="w-full p-3 border-2 border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                >
                                    <option value="UNIT_OP">Unit Operator</option>
                                    <option value="LOC_MANAGER">Location Manager</option>
                                    <option value="HQ_ADMIN">HQ Admin</option>
                                    <option value="READ_ONLY">Read Only</option>
                                </select>
                            </div>

                            {/* Summary */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Selected Configuration</div>
                                <div className="space-y-1 text-sm">
                                    <div><span className="font-bold">Mode:</span> {selectedMode === 'VIEW_AS' ? 'View As (Read-Only)' : 'Operate As (Write-Enabled)'}</div>
                                    <div><span className="font-bold">Location:</span> {LOCATIONS[selectedLocation]?.label}</div>
                                    <div><span className="font-bold">Unit:</span> {LOCATIONS[selectedLocation]?.units.find(u => u.id === selectedUnit)?.label || LOCATIONS[selectedLocation]?.units[0]?.label}</div>
                                    <div><span className="font-bold">Role:</span> {selectedRole.replace('_', ' ')}</div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowPanel(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleActivateMode}
                                    className={`flex-1 py-3 font-bold rounded-lg transition-all ${selectedMode === 'VIEW_AS'
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                                        }`}
                                >
                                    Activate {selectedMode === 'VIEW_AS' ? 'View As' : 'Operate As'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Banner shown when in CEO mode
function CEOModeBanner() {
    const { ceoMode, currentUser, exitCEOMode } = useAuth();

    if (!ceoMode) return null;

    const isViewAs = ceoMode === 'VIEW_AS';
    const locLabel = currentUser?.locationId?.toUpperCase() || 'GLOBAL';
    const roleLabel = currentUser?.role_v2?.replace('_', ' ') || 'ADMIN';

    return (
        <div className={`fixed top-0 left-0 right-0 z-[60] shadow-lg border-b-4 ${isViewAs
            ? 'bg-gradient-to-r from-blue-600 to-blue-700 border-blue-800'
            : 'bg-gradient-to-r from-orange-600 to-orange-700 border-orange-800'
            }`}>
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {isViewAs ? <Eye size={20} className="text-white" /> : <PlayCircle size={20} className="text-white" />}
                        <span className="text-white font-bold text-sm uppercase tracking-wider">
                            {isViewAs ? 'View As Mode' : 'Operate As Mode'}
                        </span>
                    </div>
                    <div className="hidden md:block h-6 w-px bg-white/30"></div>
                    <div className="text-white text-sm">
                        <span className="font-bold">{locLabel}</span>
                        <span className="mx-2 text-white/60">|</span>
                        <span>{roleLabel}</span>
                    </div>
                </div>

                <button
                    onClick={exitCEOMode}
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white font-bold text-sm"
                >
                    <Crown size={16} />
                    <span>Exit to CEO</span>
                </button>
            </div>
        </div>
    );
}
