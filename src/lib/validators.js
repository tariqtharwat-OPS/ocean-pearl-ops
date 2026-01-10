export const validateReceivingInput = (quantity, price, supplierId) => {
    const q = parseFloat(quantity);
    const p = parseFloat(price);

    if (!supplierId) throw new Error("Validation Error: Supplier is required.");
    if (isNaN(q) || q <= 0) throw new Error("Validation Error: Quantity must be greater than 0.");
    if (isNaN(p) || p < 0) throw new Error("Validation Error: Price cannot be negative.");

    return true;
};

export const validateProductionOutput = (outputs, inputKg) => {
    const input = parseFloat(inputKg);
    if (isNaN(input) || input <= 0) throw new Error("Validation Error: Input Weight must be positive.");
    if (!outputs || outputs.length === 0) throw new Error("Validation Error: At least one output required.");

    const hasNegatives = outputs.some(r => {
        const q = parseFloat(r.quantityKg);
        const b = parseFloat(r.boxCount);
        return (r.quantityKg !== '' && q <= 0) || (r.boxCount !== '' && b < 0);
    });

    if (hasNegatives) throw new Error("Validation Error: Output Quantity must be > 0 and Box Count cannot be negative.");

    return true;
};
