"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquare, RefreshCw, Search, XCircle } from 'lucide-react';
import {
    PageHeader,
    Card,
    Button,
    Badge,
    SearchInput,
    FilterTabs,
    Toolbar,
    EmptyState,
    LoadingState,
    selectClass,
    table,
    cn,
} from '@/components/admin/ui';

type SmsLog = {
    id: string;
    phone: string;
    recipient_name: string | null;
    recipient_type: 'admin' | 'student';
    event_type: string;
    message: string;
    status: 'sent' | 'failed';
    error_message: string | null;
    provider_reference: string | null;
    created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
    manual: 'Envoi manuel',
    new_student: 'Nouvel étudiant',
    student_registered: 'Inscription',
    student_account_created: 'Compte créé',
    account_blocked: 'Compte bloqué',
    account_unblocked: 'Compte débloqué',
    account_deleted: 'Compte supprimé',
    enrollment_created: 'Inscription session',
    enrollment_removed: 'Retrait session',
    reservation_submitted: 'Réservation envoyée',
    reservation_approved: 'Réservation validée',
    reservation_rejected: 'Réservation refusée',
    payment_submitted: 'Paiement envoyé',
    payment_installment_submitted: 'Tranche envoyée',
    payment_approved: 'Paiement validé',
    payment_rejected: 'Paiement refusé',
    payment_added: 'Paiement ajouté',
    payment_completed: 'Paiement complet',
    session_updated: 'Session modifiée',
    session_updated_unenrolled: 'Session modifiée (sans formation)',
    session_cancelled: 'Session annulée',
    session_reminder_24h: 'Rappel 24 h',
    new_session_unenrolled: 'Nouvelle session',
    requested_session_available: 'Session demandée dispo.',
    session_request_processed: 'Demande traitée',
    session_request_rejected: 'Demande refusée',
    attendance_present: 'Présence',
    attendance_absent: 'Absence',
    attendance_late: 'Retard',
    attendance_excused: 'Absence excusée',
};

const eventLabel = (type: string) => EVENT_LABELS[type] || type.replace(/_/g, ' ');

const formatPhone = (phone: string) =>
    phone.startsWith('216') && phone.length === 11
        ? `+216 ${phone.slice(3, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`
        : `+${phone}`;

const formatDate = (value: string) =>
    new Date(value).toLocaleString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

function StatusPill({ sms }: { sms: SmsLog }) {
    return sms.status === 'sent'
        ? <Badge tone="success">Envoyé</Badge>
        : <span title={sms.error_message || undefined}><Badge tone="danger">Échec</Badge></span>;
}

function Recipient({ sms }: { sms: SmsLog }) {
    return (
        <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">
                {sms.recipient_name || <span className="font-normal italic text-slate-400">Inconnu</span>}
            </p>
            <p className="text-xs text-slate-500 tabular-nums">{formatPhone(sms.phone)}</p>
        </div>
    );
}

export default function SmsHistoryPage() {
    const [logs, setLogs] = useState<SmsLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState<'all' | 'sent' | 'failed'>('all');
    const [eventType, setEventType] = useState('all');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/sms', { cache: 'no-store' });
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || 'Erreur de chargement.');
            setLogs(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Impossible de charger l’historique SMS.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchLogs(); }, [fetchLogs]);

    const eventTypes = useMemo(
        () => [...new Set(logs.map(l => l.event_type))].sort((a, b) => eventLabel(a).localeCompare(eventLabel(b), 'fr')),
        [logs]
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const qDigits = q.replace(/\D/g, '');
        return logs.filter(l =>
            (status === 'all' || l.status === status) &&
            (eventType === 'all' || l.event_type === eventType) &&
            (!q
                || l.message.toLowerCase().includes(q)
                || (l.recipient_name || '').toLowerCase().includes(q)
                || (qDigits.length >= 3 && l.phone.includes(qDigits)))
        );
    }, [logs, search, status, eventType]);

    const sentCount = logs.filter(l => l.status === 'sent').length;
    const failedCount = logs.length - sentCount;
    const hasFilters = search !== '' || status !== 'all' || eventType !== 'all';

    return (
        <div className="space-y-6 pb-6 md:pb-12">
            <PageHeader
                title="Historique SMS"
                description={
                    <>
                        Tous les SMS envoyés par la plateforme
                        {logs.length > 0 && (
                            <> · <span className="font-medium text-slate-900 tabular-nums">{sentCount}</span> envoyé{sentCount > 1 ? 's' : ''}
                                {failedCount > 0 && <>, <span className="font-medium text-rose-600 tabular-nums">{failedCount}</span> en échec</>}
                            </>
                        )}
                    </>
                }
                actions={
                    <Button variant="secondary" icon={RefreshCw} onClick={fetchLogs} disabled={loading} className="max-md:w-full">
                        Actualiser
                    </Button>
                }
            />

            <Card padded={false} className="overflow-hidden">
                <Toolbar>
                    <SearchInput
                        value={search}
                        onChange={setSearch}
                        placeholder="Nom, numéro ou contenu…"
                        label="Rechercher un SMS"
                        className="sm:w-80"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <select
                            aria-label="Filtrer par type"
                            value={eventType}
                            onChange={e => setEventType(e.target.value)}
                            className={cn(selectClass, 'sm:w-52')}
                        >
                            <option value="all">Tous les types</option>
                            {eventTypes.map(t => <option key={t} value={t}>{eventLabel(t)}</option>)}
                        </select>
                        <FilterTabs
                            label="Filtrer par statut"
                            options={[
                                { value: 'all' as const, label: 'Tous', count: logs.length },
                                { value: 'sent' as const, label: 'Envoyés', count: sentCount },
                                { value: 'failed' as const, label: 'Échecs', count: failedCount },
                            ]}
                            value={status}
                            onChange={setStatus}
                        />
                    </div>
                </Toolbar>

                {error ? (
                    <EmptyState
                        icon={XCircle}
                        title="Erreur de chargement"
                        description={error}
                        action={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchLogs}>Réessayer</Button>}
                    />
                ) : loading ? (
                    <LoadingState label="Chargement de l’historique SMS…" />
                ) : filtered.length > 0 ? (
                    <>
                        {/* Desktop: table */}
                        <div className={cn(table.wrapper, 'hidden md:block')}>
                            <table className={table.table}>
                                <thead className={table.thead}>
                                    <tr>
                                        <th className={table.th}>Date</th>
                                        <th className={table.th}>Destinataire</th>
                                        <th className={table.th}>Type</th>
                                        <th className={table.th}>Contenu</th>
                                        <th className={table.th}>Statut</th>
                                    </tr>
                                </thead>
                                <tbody className={table.tbody}>
                                    {filtered.map(sms => (
                                        <tr key={sms.id} className={table.tr}>
                                            <td className={cn(table.td, 'whitespace-nowrap text-slate-500 tabular-nums')}>
                                                <time dateTime={sms.created_at}>{formatDate(sms.created_at)}</time>
                                            </td>
                                            <td className={cn(table.td, 'max-w-[220px]')}><Recipient sms={sms} /></td>
                                            <td className={cn(table.td, 'whitespace-nowrap')}>
                                                <Badge tone={sms.recipient_type === 'admin' ? 'brand' : 'neutral'} dot={false}>
                                                    {eventLabel(sms.event_type)}
                                                </Badge>
                                            </td>
                                            <td className={cn(table.td, 'min-w-[280px] max-w-[460px]')}>
                                                <p className="break-words text-slate-700">{sms.message}</p>
                                                {sms.status === 'failed' && sms.error_message && (
                                                    <p className="mt-1 text-xs text-rose-600">{sms.error_message}</p>
                                                )}
                                            </td>
                                            <td className={table.td}><StatusPill sms={sms} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile: list */}
                        <ul className="divide-y divide-slate-100 md:hidden">
                            {filtered.map(sms => (
                                <li key={sms.id} className="space-y-2 px-4 py-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                        <Recipient sms={sms} />
                                        <StatusPill sms={sms} />
                                    </div>
                                    <p className="break-words text-sm text-slate-700">{sms.message}</p>
                                    {sms.status === 'failed' && sms.error_message && (
                                        <p className="text-xs text-rose-600">{sms.error_message}</p>
                                    )}
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                        <span>{eventLabel(sms.event_type)}</span>
                                        <time dateTime={sms.created_at} className="tabular-nums">{formatDate(sms.created_at)}</time>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                ) : logs.length === 0 ? (
                    <EmptyState
                        icon={MessageSquare}
                        title="Aucun SMS"
                        description="Aucun SMS n’a encore été envoyé par la plateforme."
                    />
                ) : (
                    <EmptyState
                        icon={Search}
                        title="Aucun résultat"
                        description="Aucun SMS ne correspond à votre recherche ou aux filtres choisis."
                        action={hasFilters && (
                            <Button variant="secondary" size="sm" onClick={() => { setSearch(''); setStatus('all'); setEventType('all'); }}>
                                Réinitialiser les filtres
                            </Button>
                        )}
                    />
                )}
            </Card>
        </div>
    );
}
