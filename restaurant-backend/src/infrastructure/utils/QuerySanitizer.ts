/**
 * QuerySanitizer.ts
 * FIX S-01: Sanitize query parameters to prevent NoSQL injection
 *
 * MongoDB sort injection can occur when user-controlled input is passed
 * directly to .sort() without validation. Attackers could inject:
 * - Arbitrary field names (information disclosure)
 * - MongoDB operators like $where (code execution)
 * - Deeply nested objects (DoS via resource exhaustion)
 */

// Whitelist of allowed sort fields per collection type
const ALLOWED_SORT_FIELDS: Record<string, string[]> = {
    bills: ['createdAt', 'updatedAt', 'documentNumber', 'total', 'customerName', 'sriStatus'],
    creditNotes: ['createdAt', 'updatedAt', 'documentNumber', 'total', 'customerName', 'sriStatus'],
    orders: ['createdAt', 'updatedAt', 'orderNumber', 'total', 'status', 'tableNumber'],
    customers: ['createdAt', 'updatedAt', 'name', 'identification', 'lastVisit', 'totalSpent'],
    default: ['createdAt', 'updatedAt']
};

// Valid sort directions
const VALID_SORT_DIRECTIONS = [1, -1, 'asc', 'desc', 'ascending', 'descending'];

export interface SanitizedSort {
    [key: string]: 1 | -1;
}

/**
 * Sanitizes a sort parameter from user input
 * @param sortInput - Raw sort input (string JSON or object)
 * @param collection - Collection type for field whitelist ('bills', 'orders', etc.)
 * @param defaultSort - Default sort if input is invalid
 * @returns Sanitized sort object safe for MongoDB
 */
export function sanitizeSort(
    sortInput: string | object | undefined | null,
    collection: string = 'default',
    defaultSort: SanitizedSort = { createdAt: -1 }
): SanitizedSort {
    // If no input, return default
    if (!sortInput) {
        return defaultSort;
    }

    let parsed: any;

    // Parse if string
    if (typeof sortInput === 'string') {
        try {
            parsed = JSON.parse(sortInput);
        } catch {
            // Invalid JSON, return default
            return defaultSort;
        }
    } else {
        parsed = sortInput;
    }

    // Must be a plain object (not array, not null)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return defaultSort;
    }

    // Get allowed fields for this collection
    const allowedFields = ALLOWED_SORT_FIELDS[collection] || ALLOWED_SORT_FIELDS.default;
    const sanitized: SanitizedSort = {};

    // Validate each field
    for (const [field, direction] of Object.entries(parsed)) {
        // SECURITY: Reject any field starting with $ (MongoDB operator)
        if (field.startsWith('$')) {
            continue;
        }

        // SECURITY: Reject nested paths deeper than 1 level (e.g., "a.b.c")
        if ((field.match(/\./g) || []).length > 1) {
            continue;
        }

        // Check if field is in whitelist
        // Allow dotted fields if base field is allowed (e.g., "customer.name" if "customer" is allowed)
        const baseField = field.split('.')[0];
        if (!allowedFields.includes(field) && !allowedFields.includes(baseField)) {
            continue;
        }

        // Validate direction
        if (!VALID_SORT_DIRECTIONS.includes(direction as any)) {
            continue;
        }

        // Normalize direction to 1 or -1
        const normalizedDirection: 1 | -1 =
            direction === 1 || direction === 'asc' || direction === 'ascending' ? 1 : -1;

        sanitized[field] = normalizedDirection;
    }

    // If no valid fields, return default
    if (Object.keys(sanitized).length === 0) {
        return defaultSort;
    }

    return sanitized;
}

/**
 * Sanitizes a filter/query parameter to prevent NoSQL injection
 * Removes any keys starting with $ at any level
 */
export function sanitizeFilter(filter: any): any {
    if (!filter || typeof filter !== 'object') {
        return {};
    }

    if (Array.isArray(filter)) {
        return filter.map(sanitizeFilter);
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(filter)) {
        // SECURITY: Reject keys starting with $ (except known safe ones)
        if (key.startsWith('$')) {
            // Only allow specific safe operators
            const safeOperators = ['$eq', '$ne', '$gt', '$gte', '$lt', '$lte', '$in', '$nin', '$regex'];
            if (!safeOperators.includes(key)) {
                continue;
            }
        }

        // Recursively sanitize nested objects
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            sanitized[key] = sanitizeFilter(value);
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map(v =>
                v && typeof v === 'object' ? sanitizeFilter(v) : v
            );
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized;
}
