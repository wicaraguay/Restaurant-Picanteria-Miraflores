/**
 * Código SRI del producto (codigoPrincipal) — ESPEJO EXACTO de
 * BillingService.buildItemCode del backend. Si cambia uno, cambiar el otro.
 *
 * Con ID interno de Mongo (24 hex): PLT-XXXXXX — estable, el mismo plato
 * lleva el mismo código en todas sus facturas. Sin ID: nombre saneado.
 * Siempre ≤ 25 caracteres (límite de la ficha técnica del SRI).
 */
export function sriItemCode(item: { id?: string; name?: string } | null | undefined): string {
    const raw = item?.id ? String(item.id) : '';

    if (/^[0-9a-f]{24}$/i.test(raw)) {
        return `PLT-${raw.slice(-6).toUpperCase()}`;
    }

    const source = raw || item?.name || 'ITEM';
    const sanitized = source
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return (sanitized || 'ITEM').substring(0, 25);
}
