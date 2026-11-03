export interface PaymentHistoryEntry {
    url: string | null;
    amount: number;
    status: string;
    source?: string;
    date: string;
    [key: string]: unknown;
}

/**
 * Payment history is stored as a JSON array in enrollments.receipt_url.
 * Older rows hold a single receipt URL, or only an amount_paid: turn those into entries too
 * so every caller (listing, adding, correcting) sees the same indexes.
 */
export function readPaymentHistory(enrollment: { receipt_url?: string | null; amount_paid?: number | string | null }) {
    const currentPaid = Number(enrollment.amount_paid) || 0;
    const receipt = enrollment.receipt_url;

    if (typeof receipt === 'string' && receipt.startsWith('[')) {
        try {
            const parsed = JSON.parse(receipt);
            if (Array.isArray(parsed)) return parsed as PaymentHistoryEntry[];
        } catch {
            // Corrupted history: fall through to the balance-only entry below.
        }
    } else if (receipt) {
        return [{ url: receipt, amount: currentPaid, status: 'approved', source: 'legacy', date: new Date().toISOString() }];
    }

    return currentPaid > 0
        ? [{ url: null, amount: currentPaid, status: 'approved', source: 'existing_balance', date: new Date().toISOString() }]
        : [];
}
