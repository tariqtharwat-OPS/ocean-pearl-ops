import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { MessageSquare, X, Send, Fish, Maximize2, Minimize2, Paperclip, FileText, Download, Loader2, Check } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const STATUS_MESSAGES = [
    "Thinking...",
    "Scanning database...",
    "Analyzing context...",
    "Generating insights...",
    "Finalizing response..."
];

// --- SUB-COMPONENT: DRAFT CARD ---
function TransactionDraft({ draft, onComplete }) {
    const { currentUser } = useAuth();
    const [payload, setPayload] = useState(draft.payload);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const formatLabel = (key) => key.replace(/([A-Z])/g, ' $1').toUpperCase();

    const handleExecute = async () => {
        setLoading(true);
        const functions = getFunctions(getApp(), 'asia-southeast2');
        console.log("DEBUG: Executing with functions instance:", functions);

        // --- CONTEXT INJECTION FIX ---
        // Ensure payload has minimal context if missing
        const enhancedPayload = {
            ...payload,
            locationId: payload.locationId || currentUser?.locationId || 'HQ',
            unitId: payload.unitId || currentUser?.unitId || 'main',
            // Ensure numbers are numbers
            amount: payload.amount ? parseFloat(payload.amount) : 0
        };
        console.log("DEBUG: Final Payload:", enhancedPayload);

        try {
            let funcName = '';
            // Map Draft Type to Cloud Function
            switch (draft.type) {
                case 'EXPENSE_REQUEST':
                case 'FUNDING_REQUEST':
                    funcName = 'createFinancialRequest';
                    // Adjust payload type
                    enhancedPayload.type = draft.type === 'EXPENSE_REQUEST' ? 'EXPENSE' : 'FUNDING';
                    break;
                case 'EXPENSE':
                case 'PURCHASE_RECEIVE':
                case 'CASH_TRANSFER':
                    funcName = 'postTransaction';
                    enhancedPayload.type = draft.type;
                    break;
                default:
                    throw new Error("Unknown Draft Type: " + draft.type);
            }

            const fn = httpsCallable(functions, funcName);
            const res = await fn(enhancedPayload);
            setResult({ success: true, id: res.data.requestId || res.data.id });
            if (onComplete) onComplete(res.data);

        } catch (err) {
            console.error("Execution Error", err);
            setResult({ success: false, error: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (result?.success) {
        return (
            <div className="mt-2 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-lg flex items-center gap-2">
                <div className="bg-emerald-100 p-1 rounded-full"><Check size={14} /></div>
                <div>
                    <div className="font-bold">TRANSACTION EXECUTED</div>
                    <div>Ref ID: {result.id}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-3 bg-white border-2 border-slate-100 rounded-lg overflow-hidden shadow-sm">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-100 to-white p-2 border-b border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <FileText size={12} /> DRAFT: {draft.type.replace('_', ' ')}
                </span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">DRAFT V6: FIXED</span>
            </div>

            {/* Form */}
            <div className="p-3 space-y-2">
                {/* Dynamically render fields */}
                {Object.entries(payload).map(([key, val]) => {
                    if (key === 'items' || key === 'locationId' || key === 'unitId' || key === 'type') return null; // Skip complex/hidden
                    return (
                        <div key={key} className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-slate-400">{formatLabel(key)}</label>
                            <input
                                className="text-xs border border-slate-200 rounded p-1.5 focus:border-teal-500 outline-none font-medium text-slate-700 w-full"
                                value={val}
                                onChange={(e) => setPayload({ ...payload, [key]: e.target.value })}
                            />
                        </div>
                    );
                })}

                {/* Amount Special Display */}
                {payload.amount && (
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 text-right">
                        <span className="text-[10px] text-slate-400 mr-2">TOTAL</span>
                        <span className="text-sm font-bold font-mono">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(payload.amount)}
                        </span>
                    </div>
                )}

                {/* Warnings */}
                {result?.error && (
                    <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded">
                        Error: {result.error}
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="p-2 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                    onClick={handleExecute}
                    disabled={loading}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold py-2 rounded shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    CONFIRM & EXECUTE
                </button>
            </div>
        </div>
    );
}

export default function SharkChat() {
    const { currentUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [attachment, setAttachment] = useState(null); // { name, type, data (base64) }
    const [status, setStatus] = useState('Idle'); // Idle, Thinking
    const [statusText, setStatusText] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // --- EFFECT: DATA SYNC ---
    useEffect(() => {
        if (!currentUser) return;

        let sentMessages = [];
        let receivedMessages = [];

        const updateState = () => {
            const all = [...sentMessages, ...receivedMessages];
            // Sort by timestamp
            all.sort((a, b) => {
                const tA = a.timestamp?.seconds || Date.now() / 1000;
                const tB = b.timestamp?.seconds || Date.now() / 1000;
                return tA - tB;
            });
            setMessages(all);

            // Calc unread
            const unread = all.filter(m => !m.read && m.recipientId === currentUser.uid).length;
            setUnreadCount(unread);

            // Infer Status
            if (all.length > 0) {
                const lastMsg = all[all.length - 1];
                if (lastMsg.senderId === currentUser.uid) {
                    setStatus('Thinking');
                } else {
                    setStatus('Idle');
                }
            }
        };

        const qReceived = query(collection(db, 'messages'), where('recipientId', '==', currentUser.uid));
        const unsubReceived = onSnapshot(qReceived, (snapshot) => {
            receivedMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateState();
        }, err => console.error("Shark Chat Rx Error:", err));

        const qSent = query(collection(db, 'messages'), where('senderId', '==', currentUser.uid));
        const unsubSent = onSnapshot(qSent, (snapshot) => {
            sentMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateState();
        }, err => console.error("Shark Chat Tx Error:", err));

        return () => {
            unsubReceived();
            unsubSent();
        };
    }, [currentUser]);

    // --- EFFECT: STATUS SIMULATION ---
    useEffect(() => {
        let interval;
        if (status === 'Thinking') {
            let i = 0;
            setStatusText(STATUS_MESSAGES[0]);
            interval = setInterval(() => {
                i = (i + 1) % STATUS_MESSAGES.length;
                setStatusText(STATUS_MESSAGES[i]);
            }, 2000); // Change text every 2s
        } else {
            setStatusText('');
        }
        return () => clearInterval(interval);
    }, [status]);

    // --- HANDLERS ---
    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Limit: 5MB
        if (file.size > 5 * 1024 * 1024) {
            alert("File too large. Max 5MB.");
            return;
        }

        const reader = new FileReader();
        reader.onload = (evt) => {
            const base64 = evt.target.result.split(',')[1];
            setAttachment({
                name: file.name,
                type: file.type,
                data: base64
            });
        };
        reader.readAsDataURL(file);
    };

    const handleSend = async () => {
        if ((!inputText.trim() && !attachment) || status === 'Thinking') return;

        setStatus('Thinking'); // Immediate feedback

        try {
            const payload = {
                senderId: currentUser.uid,
                sender: currentUser.displayName || 'Staff',
                recipientId: 'system_shark',
                text: inputText,
                timestamp: serverTimestamp(),
                read: false,
                type: 'USER_QUERY',
                // Context for Role-Aware AI
                context: {
                    role: currentUser.role_v2 || currentUser.role || 'unknown',
                    locationId: currentUser.locationId || null,
                    unitId: currentUser.unitId || null,
                    scope: currentUser.scope || 'UNKNOWN'
                }
            };

            if (attachment) {
                payload.attachment = attachment; // Pass base64 data to backend
            }

            await addDoc(collection(db, 'messages'), payload);

            setInputText('');
            setAttachment(null);
        } catch (e) {
            console.error("Send Error", e);
            setStatus('Idle');
            alert("Failed to send message.");
        }
    };

    const markAsRead = async () => {
        if (!isOpen) return;
        const unreadIds = messages.filter(m => !m.read && m.sender.includes('Shark')).map(m => m.id);
        unreadIds.forEach(id => {
            updateDoc(doc(db, 'messages', id), { read: true });
        });
    };

    useEffect(() => {
        if (isOpen) {
            markAsRead();
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
            }
        }
    }, [isOpen, messages.length]);

    // --- EXPORT ---
    const handleExport = () => {
        const header = `Ocean Pearl Ops - Shark Chat Transcript\nDate: ${new Date().toLocaleString()}\nUser: ${currentUser.displayName}\n\n`;
        const content = messages.map(m => {
            const role = m.senderId === currentUser.uid ? 'ME' : 'SHARK';
            return `[${role}] ${new Date(m.timestamp?.seconds * 1000).toLocaleTimeString()}:\n${m.text}\n`;
        }).join('\n----------------------------------------\n\n');

        const blob = new Blob([header + content], { type: 'application/msword' }); // Trick for Word
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Shark_Transcript_${new Date().toISOString().slice(0, 10)}.doc`;
        a.click();
    };


    // --- RENDER ---
    return (
        <>
            {/* FAB (Hidden when Fullscreen) */}
            {!isFullScreen && (
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`fixed bottom-20 right-4 p-4 rounded-full shadow-xl transition-all z-40 flex items-center justify-center ${unreadCount > 0 ? 'bg-rose-600 animate-pulse' : 'bg-teal-600 hover:scale-105'}`}
                >
                    <Fish className="text-white transform -rotate-45" size={28} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-white text-rose-600 text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-rose-600 shadow-sm">
                            {unreadCount}
                        </span>
                    )}
                </button>
            )}

            {/* CHAT WINDOW */}
            {isOpen && (
                <div className={`
                    fixed transition-all duration-300 bg-slate-50 shadow-2xl z-50 flex flex-col font-sans
                    ${isFullScreen ? 'inset-0 w-full h-full rounded-none' : 'bottom-36 right-4 w-96 h-[600px] rounded-2xl border border-slate-200'}
                `}>
                    {/* -- HEADER -- */}
                    <div className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-md bg-gradient-to-r from-slate-950 to-teal-900 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-400/50 flex items-center justify-center backdrop-blur-sm">
                                <Fish className="text-teal-300 transform -rotate-45" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-base tracking-wide flex items-center gap-2">
                                    SHARK SYSTEM
                                    {status === 'Thinking' && <Loader2 size={14} className="animate-spin text-teal-300" />}
                                </h3>
                                <p className="text-[10px] text-teal-200/70 font-mono uppercase tracking-wider">
                                    {status === 'Thinking' ? statusText : 'OPERATIONAL'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={handleExport} title="Export Transcript" className="p-2 hover:bg-white/10 rounded-lg text-teal-100/70 transition-colors">
                                <Download size={18} />
                            </button>
                            <button onClick={() => setIsFullScreen(!isFullScreen)} title="Toggle Fullscreen" className="p-2 hover:bg-white/10 rounded-lg text-teal-100/70 transition-colors hidden md:block">
                                {isFullScreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                            </button>
                            <button onClick={() => setIsOpen(false)} title="Close" className="p-2 hover:bg-red-500/20 hover:text-red-200 rounded-lg text-teal-100/70 transition-colors ml-1">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* -- MESSAGES -- */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50">
                        {messages.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <Fish size={64} className="mb-4 text-slate-300" />
                                <p className="text-sm font-medium">Shark AI Ready</p>
                                <p className="text-xs">Ask specifically about inventory or upload data.</p>
                            </div>
                        )}
                        {messages.map((msg, i) => {
                            const isMe = msg.senderId === currentUser.uid;
                            return (
                                <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                    <div className={`
                                        max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-sm shadow-sm border
                                        ${isMe ? 'bg-teal-600 text-white border-transparent rounded-tr-none' : 'bg-white text-slate-700 border-slate-200 rounded-tl-none'}
                                    `}>
                                        {/* Header */}
                                        {!isMe && (
                                            <div className="text-[10px] font-bold text-teal-600 mb-2 uppercase tracking-wider flex items-center gap-2">
                                                <Fish size={12} /> SHARK INTELLIGENCE
                                            </div>
                                        )}

                                        {/* Content */}
                                        <div className={`prose prose-sm max-w-none ${isMe ? 'prose-invert' : 'prose-slate'}`}>
                                            {/* Render Text with Markdown */}
                                            {msg.text && (
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.text}
                                                </ReactMarkdown>
                                            )}
                                            {/* Render Attachment Indicator */}
                                            {msg.attachment && (
                                                <div className="mt-2 p-2 bg-black/10 rounded flex items-center gap-2 text-xs">
                                                    <Paperclip size={12} /> Sent File: {msg.attachment.name}
                                                </div>
                                            )}

                                            {/* Render Transaction Draft */}
                                            {msg.draft && (
                                                <TransactionDraft draft={msg.draft} />
                                            )}
                                        </div>

                                        {/* Footer */}
                                        <div className={`text-[10px] mt-2 flex justify-end gap-1 ${isMe ? 'text-teal-200' : 'text-slate-400'}`}>
                                            {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {/* Live Status Indicator Bubble */}
                        {status === 'Thinking' && (
                            <div className="flex justify-start animate-pulse">
                                <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-2 shadow-sm">
                                    <Loader2 size={12} className="animate-spin" />
                                    <span>{statusText}</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* -- INPUT TYPE -- */}
                    <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                        {/* Attachment Preview */}
                        {attachment && (
                            <div className="mb-2 p-2 bg-teal-50 border border-teal-100 rounded-lg flex justify-between items-center text-xs text-teal-700 animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-2">
                                    <FileText size={14} />
                                    <span className="font-medium truncate max-w-[200px]">{attachment.name}</span>
                                </div>
                                <button onClick={() => setAttachment(null)} className="p-1 hover:bg-teal-200 rounded-full"><X size={12} /></button>
                            </div>
                        )}

                        <div className="flex gap-2 items-end">
                            {/* File Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded-xl transition-colors"
                                title="Attach Image or Document"
                            >
                                <Paperclip size={20} />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" // Broad accept
                            />

                            {/* Text Input */}
                            <textarea
                                value={inputText}
                                onChange={e => setInputText(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder={status === 'Thinking' ? "Please wait..." : "Ask Shark a question..."}
                                disabled={status === 'Thinking'}
                                className="flex-1 bg-slate-50 border-0 focus:ring-2 focus:ring-teal-500/20 rounded-xl p-3 text-sm resize-none max-h-32 min-h-[48px] outline-none transition-all placeholder:text-slate-400"
                                rows={1}
                                style={{ height: 'auto', minHeight: '44px' }} // Auto-grow logic omitted for brevity, keeping simple
                            />

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={(!inputText.trim() && !attachment) || status === 'Thinking'}
                                className="p-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl shadow-lg shadow-teal-600/20 transition-all hover:scale-105 active:scale-95"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
