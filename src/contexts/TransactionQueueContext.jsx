import React, { createContext, useContext, useState, useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

const TransactionQueueContext = createContext();

export function useTransactionQueue() {
    return useContext(TransactionQueueContext);
}

export function TransactionQueueProvider({ children }) {
    const [queue, setQueue] = useState([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [processing, setProcessing] = useState(false);

    // Load queue from local storage on mount
    useEffect(() => {
        const stored = localStorage.getItem('txnQueue');
        if (stored) {
            try {
                setQueue(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse queue", e);
            }
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Save queue to local storage specific change
    useEffect(() => {
        localStorage.setItem('txnQueue', JSON.stringify(queue));
    }, [queue]);

    // Process Queue when online and queue has items
    useEffect(() => {
        if (isOnline && queue.length > 0 && !processing) {
            processQueue();
        }
    }, [isOnline, queue, processing]);

    const processQueue = async () => {
        setProcessing(true);
        const postTransaction = httpsCallable(functions, 'postTransaction');

        // Process clone of queue to avoid mutation issues during iteration? 
        // Better: Process first item, then remove it.
        // We'll try to process sequential to ensure order.

        try {
            const currentQueue = [...queue];
            if (currentQueue.length === 0) {
                setProcessing(false);
                return;
            }

            const item = currentQueue[0];
            try {
                console.log("Processing pending transaction...", item);
                await postTransaction(item);
                // Success: Remove from queue
                setQueue(prev => prev.slice(1));
            } catch (error) {
                console.error("Failed to process transaction from queue", error);
                // If distinct error (e.g. valid inputs but rejected), maybe distinct handling?
                // For now, retry? Or move to 'failed' list?
                // If it's a network error, we keep it. If it's a logic error, we should probably remove it to unblock others?
                // Logic error (functions throws) usually means inputs were bad. Retrying won't fix it.
                // We should probably alert user? 
                // Simple V1: Remove it and log error? Or Keep it?
                // If we keep it, we block the queue.
                // Compromise: Remove and create a "FailedNotification". 
                // For Upgrade V2: We remove it to prevent deadlock, but log it.
                setQueue(prev => prev.slice(1));
            }
        } catch (e) {
            console.error("Queue Processing Error", e);
        } finally {
            setProcessing(false);
        }
    };

    const addTransaction = async (data) => {
        if (isOnline) {
            try {
                const postTransaction = httpsCallable(functions, 'postTransaction');
                const result = await postTransaction(data);
                return result;
            } catch (error) {
                // If network error, add to queue?
                // httpsCallable usually throws specific codes.
                if (error.code === 'unavailable' || error.message.includes('network')) {
                    console.log("Network unavailable, queuing...");
                    setQueue(prev => [...prev, { ...data, queuedAt: Date.now() }]);
                    return { success: true, queued: true, message: 'Offline: Transaction Queued' };
                }
                throw error; // Re-throw logic errors
            }
        } else {
            setQueue(prev => [...prev, { ...data, queuedAt: Date.now() }]);
            return { success: true, queued: true, message: 'Offline: Transaction Queued' };
        }
    };

    return (
        <TransactionQueueContext.Provider value={{ addTransaction, queue, isOnline }}>
            {children}
        </TransactionQueueContext.Provider>
    );
}
