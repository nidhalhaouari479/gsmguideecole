"use client";

import React, { useEffect, useState } from 'react';
import {
    Bell,
    Zap,
    Trash2,
    CheckCircle2,
    Clock,
    Search,
    CreditCard,
    CheckCircle,
    XCircle,
    UserPlus,
    RefreshCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
    PageHeader,
    Card,
    Button,
    IconButton,
    SearchInput,
    FilterTabs,
    Toolbar,
    EmptyState,
    LoadingState,
    cn,
} from '@/components/admin/ui';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    const getNotifIcon = (type: string) => {
        switch (type) {
            case 'reservation_submitted': return <Clock size={16} />;
            case 'reservation_approved': return <CheckCircle size={16} />;
            case 'reservation_rejected': return <XCircle size={16} />;
            case 'payment_submitted': return <CreditCard size={16} />;
            case 'payment_approved': return <CheckCircle size={16} />;
            case 'payment_rejected': return <XCircle size={16} />;
            case 'new_student': return <UserPlus size={16} />;
            default: return <Zap size={16} />;
        }
    };

    const getNotificationHref = (type: string) => {
        if (type === 'new_student') return '/admin/students';
        if (type.includes('payment') || type.includes('reservation')) return '/admin/payments';
        return '/admin/notifications';
    };

    const openNotification = (notif: { id: string; type: string; is_read: boolean }) => {
        if (!notif.is_read) void markAsRead(notif.id);
        router.push(getNotificationHref(notif.type));
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error:', error);
            setError("Impossible de charger les notifications. Veuillez vérifier votre connexion.");
        } else {
            setNotifications(data || []);
        }
        setLoading(false);
    };

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
        fetchNotifications();
    };

    const deleteNotification = async (id: string) => {
        await supabase
            .from('notifications')
            .delete()
            .eq('id', id);
        fetchNotifications();
    };

    const markAllAsRead = async () => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('is_read', false);
        fetchNotifications();
    };

    const filteredNotifications = notifications.filter(n => {
        const matchesFilter = filter === 'all' || (filter === 'unread' ? !n.is_read : n.is_read);
        const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             n.message.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;
    const filterOptions = [
        { value: 'all' as const, label: 'Toutes', count: notifications.length },
        { value: 'unread' as const, label: 'Non lues', count: unreadCount },
        { value: 'read' as const, label: 'Déjà lues', count: notifications.length - unreadCount },
    ];

    return (
        <div className="space-y-6 pb-6 md:pb-12">
            <PageHeader
                title="Notifications"
                description={
                    <>
                        Historique des alertes système et inscriptions
                        {unreadCount > 0 && <> · <span className="font-medium text-slate-900 tabular-nums">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</span></>}
                    </>
                }
                actions={
                    <Button
                        variant="secondary"
                        icon={CheckCircle2}
                        onClick={markAllAsRead}
                        disabled={unreadCount === 0}
                        title={unreadCount === 0 ? 'Toutes les notifications sont déjà lues' : 'Marquer toutes les notifications comme lues'}
                        className="max-md:w-full"
                    >
                        Tout marquer comme lu
                    </Button>
                }
            />

            <Card padded={false} className="overflow-hidden">
                <Toolbar>
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Rechercher par titre ou message…"
                        label="Rechercher une notification"
                        className="sm:w-80"
                    />
                    <FilterTabs
                        label="Filtrer les notifications"
                        options={filterOptions}
                        value={filter}
                        onChange={setFilter}
                    />
                </Toolbar>

                {error ? (
                    <EmptyState
                        icon={XCircle}
                        title="Erreur de chargement"
                        description={error}
                        action={<Button variant="secondary" size="sm" icon={RefreshCw} onClick={fetchNotifications}>Réessayer</Button>}
                    />
                ) : loading ? (
                    <LoadingState label="Chargement des notifications…" />
                ) : filteredNotifications.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                        {filteredNotifications.map((notif) => (
                            <li
                                key={notif.id}
                                className="group transition-colors focus-within:bg-slate-50/70 hover:bg-slate-50/70"
                            >
                                <div className="flex items-start gap-3 px-4 py-3.5 md:px-5">
                                    <div
                                        role="link"
                                        tabIndex={0}
                                        onClick={() => openNotification(notif)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                openNotification(notif);
                                            }
                                        }}
                                        aria-label={`${notif.is_read ? '' : 'Non lue : '}${notif.title}`}
                                        className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                                    >
                                        <span className="flex w-2 shrink-0 justify-center pt-3.5" aria-hidden="true">
                                            {!notif.is_read && <span className="h-2 w-2 rounded-full bg-sky-500" />}
                                        </span>
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                            {getNotifIcon(notif.type)}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                                                <h3 className={cn('min-w-0 truncate text-sm', notif.is_read ? 'font-normal text-slate-500' : 'font-medium text-slate-900')}>
                                                    {notif.title}
                                                </h3>
                                                <time dateTime={notif.created_at} className="shrink-0 text-xs text-slate-400 tabular-nums">
                                                    {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: 'long',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </time>
                                            </div>
                                            <p className={cn('mt-0.5 break-words text-sm', notif.is_read ? 'text-slate-500' : 'text-slate-600')}>{notif.message}</p>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-0.5 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                                        {!notif.is_read && (
                                            <IconButton
                                                label="Marquer comme lu"
                                                icon={CheckCircle2}
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    markAsRead(notif.id);
                                                }}
                                            />
                                        )}
                                        <IconButton
                                            label="Supprimer définitivement"
                                            icon={Trash2}
                                            className="hover:bg-rose-50 hover:text-rose-600"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                deleteNotification(notif.id);
                                            }}
                                        />
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : notifications.length === 0 ? (
                    <EmptyState
                        icon={Bell}
                        title="Aucune notification"
                        description="Le registre des alertes est actuellement vide."
                    />
                ) : (
                    <EmptyState
                        icon={Search}
                        title="Aucun résultat"
                        description="Aucune notification ne correspond à votre recherche ou au filtre choisi."
                        action={
                            <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(''); setFilter('all'); }}>
                                Réinitialiser les filtres
                            </Button>
                        }
                    />
                )}
            </Card>
        </div>
    );
}
