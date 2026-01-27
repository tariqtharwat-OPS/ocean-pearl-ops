import React, { createContext, useContext, useState, useCallback } from 'react';

const DirtyFormContext = createContext({
    isDirty: false,
    setIsDirty: () => { },
    confirmLeave: () => true // Function to trigger check
});

export const useDirtyForm = () => useContext(DirtyFormContext);

export function DirtyFormProvider({ children }) {
    const [isDirty, setIsDirty] = useState(false);

    // Call this before navigation actions
    // Returns true if safe to proceed, false if blocked (and shows confirm dialog)
    // For simplicity, we use window.confirm here to ensure blocking behavior, 
    // or we can allow custom UI if we pass a callback.
    // For M3 compliance: "Clear modal ... Choosing Stay keeps form".

    // We'll stick to simple state logic. The UI trying to navigate checks this.

    return (
        <DirtyFormContext.Provider value={{ isDirty, setIsDirty }}>
            {children}
        </DirtyFormContext.Provider>
    );
}
