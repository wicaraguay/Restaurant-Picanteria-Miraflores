/**
 * @file categoryName.ts
 * @description Normalización de nombres de categoría para agrupar y filtrar.
 * Los platos guardan la categoría como texto libre: dos variantes que solo
 * difieren en mayúsculas o espacios ("Especial De Casa" vs "ESPECIAL DE CASA ")
 * deben tratarse como la MISMA categoría en cualquier vista.
 */

/** Clave de comparación/agrupación insensible a mayúsculas y espacios. */
export const categoryKey = (name?: string): string => (name || '').trim().toUpperCase();

/**
 * Deduplica nombres que solo difieren en mayúsculas/espacios,
 * preservando como etiqueta la primera variante encontrada.
 */
export const uniqueCategoryNames = (names: (string | undefined)[]): string[] => {
    const seen = new Map<string, string>();
    for (const raw of names) {
        const label = (raw || '').trim();
        if (!label) continue;
        const key = label.toUpperCase();
        if (!seen.has(key)) seen.set(key, label);
    }
    return Array.from(seen.values());
};
