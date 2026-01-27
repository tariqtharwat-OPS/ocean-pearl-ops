import { useEffect } from 'react';
import { useDirtyForm } from '../contexts/DirtyFormContext';

export function useUnsavedChanges(isDirtyLocal) {
    const { setIsDirty } = useDirtyForm();

    // Sync local dirty state to global context
    useEffect(() => {
        setIsDirty(isDirtyLocal);
    }, [isDirtyLocal, setIsDirty]);

    // Browser Close/Refresh Guard
    useEffect(() => {
        if (!isDirtyLocal) return;

        const handleBeforeUnload = (e) => {
            e.preventDefault();
            e.returnValue = ''; // Chrome requires returnValue to be set
            return ''; // Legacy
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            // Safety cleanup when component unmounts
            setIsDirty(false);
        };
    }, [isDirtyLocal, setIsDirty]);
}
