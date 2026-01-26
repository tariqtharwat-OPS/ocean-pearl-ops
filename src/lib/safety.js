/**
 * Safety utilities to prevent runtime crashes caused by undefined/null comparisons and access.
 */

/**
 * Safely converts any value to a string. Returns empty string if null/undefined.
 * @param {any} val 
 * @returns {string}
 */
export const safeString = (val) => {
    if (val === null || val === undefined) return '';
    return String(val);
};

/**
 * Safely converts any value to a number. Returns defaultVal (0) if nan/null/undefined.
 * @param {any} val 
 * @param {number} defaultVal 
 * @returns {number}
 */
export const safeNumber = (val, defaultVal = 0) => {
    const num = parseFloat(val);
    return isNaN(num) ? defaultVal : num;
};

/**
 * Safely compares two values (strings/etc) using localeCompare, handling nulls/undefineds.
 * @param {any} a 
 * @param {any} b 
 * @returns {number}
 */
export const safeCompare = (a, b) => {
    const strA = safeString(a).toLowerCase();
    const strB = safeString(b).toLowerCase();
    return strA.localeCompare(strB);
};

/**
 * Safely maps over an array, returning empty array if input is not an array.
 * @param {Array} arr 
 * @param {Function} callback 
 * @returns {Array}
 */
export const safeMap = (arr, callback) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(callback);
};

/**
 * Safely trims a string.
 * @param {string} str 
 * @returns {string}
 */
export const safeTrim = (str) => {
    return safeString(str).trim();
};
