"use client";

import React, { useEffect, useState } from 'react';
import { 
    Bell, 
    Zap, 
    Trash2, 
    CheckCircle2, 
    Clock, 
    Search,
    Filter,
    ChevronLeft,
    Loader2,
    CreditCard,
    CheckCircle,
    XCircle,
    UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    const getNotifIcon = (type: string) => {
        switch (type) {
            case 'payment_submitted': return <CreditCard size={20} />;
            case 'payment_approved': return <CheckCircle size={20} className="text-white" />;
            case 'payment_rejected': return <XCircle size={20} className="text-white" />;
            case 'new_student': return <UserPlus size={20} />;
            default: return <Zap size={20} />;
        }
    };

    const getNotifColor = (type: string, isRead: boolean) => {
        if (isRead) return 'bg-slate-800 text-slate-500';
        switch (type) {
            case 'payment_submitted': return 'bg-amber-500 text-white shadow-amber-500/20';
            case 'payment_approved': return 'bg-emerald-500 text-white shadow-emerald-500/20';
            case 'payment_rejected': return 'bg-rose-500 text-white shadow-rose-500/20';
            case 'new_student': return 'bg-brand-blue text-white shadow-brand-blue/20';
            default: return 'bg-brand-green text-white shadow-brand-green/20';
        }
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

    return (
        <div className="space-y-8 pb-10">
            {/* Header Area */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green mb-2">
                        <Link href="/admin" className="p-2 rounded-lg bg-brand-green/10 hover:bg-brand-green/20 transition-all flex items-center justify-center">
                            <ChevronLeft size={16} />
                        </Link>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centre de Commandement</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Archives des <span className="text-brand-green">Notifications</span></h1>
                    <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">Historique complet des alertes système et inscriptions</p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={markAllAsRead}
                        className="px-6 py-3 rounded-2xl bg-brand-green/10 text-brand-green border border-brand-green/20 text-xs font-black uppercase tracking-widest hover:bg-brand-green hover:text-white transition-all flex items-center gap-2"
                    >
                        <CheckCircle2 size={16} /> Tout marquer comme lu
                    </button>
                </div>
            </header>

            {/* Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-green transition-colors" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher dans les archives..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white focus:outline-none focus:border-brand-green/30 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'unread', 'read'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f ? 'bg-white/10 border-white/20 text-white shadow-xl' : 'bg-transparent border-white/5 text-slate-500 hover:text-white hover:border-white/10'}`}
                        >
                            {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : 'Déjà lues'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications List */}
            <div className="space-y-4">
                {error ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center gap-4">
                        <XCircle size={40} className="text-rose-500" />
                        <p className="text-sm font-bold text-slate-400 max-w-xs">{error}</p>
                        <button 
                            onClick={fetchNotifications}
                            className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/10 transition-all"
                        >
                            Réessayer
                        </button>
                    </div>
                ) : loading ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 size={40} className="animate-spin text-brand-green" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Synchronisation des archives...</p>
                    </div>
                ) : filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notif, i) => (
                        <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className={`group relative p-6 rounded-3xl border transition-all ${!notif.is_read ? 'bg-brand-green/5 border-brand-green/20' : 'bg-white/5 border-white/5 hover:border-white/10'}`}
                        >
                            <div className="flex gap-6 items-start">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${getNotifColor(notif.type, notif.is_read)}`}>
                                    {getNotifIcon(notif.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className={`text-lg font-black truncate ${!notif.is_read ? 'text-white' : 'text-slate-300'}`}>{notif.title}</h3>
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notif.is_read && (
                                                <button 
                                                    onClick={() => markAsRead(notif.id)}
                                                    className="p-2 rounded-xl bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-white transition-all"
                                                    title="Marquer comme lu"
                                                >
                                                    <CheckCircle2 size={16} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => deleteNotification(notif.id)}
                                                className="p-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                                title="Supprimer définitivement"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm font-medium text-slate-400 leading-relaxed mb-4">{notif.message}</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            <Clock size={12} className="text-brand-green" />
                                            {new Date(notif.created_at).toLocaleDateString('fr-FR', { 
                                                day: '2-digit', 
                                                month: 'long', 
                                                year: 'numeric',
                                                hour: '2-digit', 
                                                minute: '2-digit' 
                                            })}
                                        </div>
                                        {notif.is_read && (
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">• LUE</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="py-32 flex flex-col items-center justify-center text-center opacity-50">
                        <div className="w-20 h-20 rounded-full bg-slate-900 flex items-center justify-center mb-6">
                            <Bell size={40} className="text-slate-700" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-2">Aucune archive archivée</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Le registre des alertes est actuellement vide</p>
                    </div>
                )}
            </div>
        </div>
    );
}
