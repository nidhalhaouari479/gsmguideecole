"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    LayoutDashboard, Users, BookOpen, CreditCard, Settings, LogOut, Menu, X,
    Loader2, GraduationCap, Calendar, BarChart3, Search, Bell, ChevronLeft,
    ChevronRight, Command, Zap, ArrowRight, ShieldCheck, Sun, Moon,
    CheckCircle, XCircle, Clock, UserPlus, FileText, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [fetchingNotifs, setFetchingNotifs] = useState(false);

    useEffect(() => {
        // Apply stored or default admin theme
        const stored = localStorage.getItem('adminTheme');
        const dark = stored !== 'light';
        setIsDarkMode(dark);
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');

        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                router.push('/admin/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin') {
                router.push('/dashboard');
                return;
            }

            setUser(user);
            setLoading(false);
        };

        if (pathname !== '/admin/login') {
            checkAdmin();

            // Fetch initial notifications count
            const fetchNotifs = async () => {
                const { count } = await supabase
                    .from('notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_read', false);
                setUnreadNotifications(count || 0);
            };
            fetchNotifs();

            // Real-time subscription
            const channel = supabase
                .channel('admin-notifications')
                .on('postgres_changes', { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'notifications' 
                }, (payload) => {
                    setUnreadNotifications(prev => prev + 1);
                    // Optional: logic to show a toast could go here
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } else {
            setLoading(false);
        }
    }, [router, pathname]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            setIsSearchOpen(prev => !prev);
        }
        if (e.key === 'Escape') {
            setIsSearchOpen(false);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0f19]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-brand-green" size={48} />
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-xs animate-pulse">GSM Guide Academy Ops...</p>
                </div>
            </div>
        );
    }

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    const navigation = [
        { name: 'Console', href: '/admin', icon: LayoutDashboard, keywords: 'overview dashboard accueil' },
        { name: 'Étudiants', href: '/admin/students', icon: Users, keywords: 'élèves students clients inscriptions' },
        { name: 'Professeurs', href: '/admin/teachers', icon: GraduationCap, keywords: 'enseignants formateurs staff' },
        { name: 'Catalogue', href: '/admin/courses', icon: BookOpen, keywords: 'formations cours modules academic' },
        { name: 'Sessions', href: '/admin/sessions', icon: Calendar, keywords: 'planning dates calendrier' },
        { name: 'Finances', href: '/admin/payments', icon: CreditCard, keywords: 'argent revenus transactions pognon' },
        { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, keywords: 'stats data intelligence graphiques' },
        { name: 'Réglages', href: '/admin/settings', icon: Settings, keywords: 'config paramètres préférences' },
    ];

    const searchResults = navigation.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.keywords.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin/login');
    };

    const getNotifIcon = (type: string) => {
        switch (type) {
            case 'payment_submitted': return <CreditCard size={18} />;
            case 'payment_approved': return <CheckCircle size={18} className="text-emerald-500" />;
            case 'payment_rejected': return <XCircle size={18} className="text-rose-500" />;
            case 'new_student': return <UserPlus size={18} />;
            default: return <Zap size={18} />;
        }
    };

    const getNotifColor = (type: string, isRead: boolean) => {
        if (isRead) return 'bg-slate-800 text-slate-500';
        switch (type) {
            case 'payment_submitted': return 'bg-amber-500/20 text-amber-500';
            case 'payment_approved': return 'bg-emerald-500/20 text-emerald-500';
            case 'payment_rejected': return 'bg-rose-500/20 text-rose-500';
            case 'new_student': return 'bg-brand-blue/20 text-brand-blue';
            default: return 'bg-brand-green/20 text-brand-green';
        }
    };

    const fetchNotificationsList = async () => {
        setFetchingNotifs(true);
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        setNotifications(data || []);
        
        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);
        setUnreadNotifications(count || 0);
        setFetchingNotifs(false);
    };

    const markAllAsRead = async () => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('is_read', false);
        setUnreadNotifications(0);
        fetchNotificationsList();
    };

    const markAsRead = async (id: string) => {
        await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);
        fetchNotificationsList();
    };

    return (
        <div className={`min-h-screen text-slate-100 flex font-sans overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0f19]' : 'bg-[#f0f4f8]'}`}>
            {/* Command Palette Overlay */}
            <AnimatePresence>
                {isSearchOpen && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSearchOpen(false)}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -20 }}
                            className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden shadow-brand-green/10"
                        >
                            <div className="p-4 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
                                <Search className="text-brand-green" size={20} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Rechercher dans le registre..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="flex-1 bg-transparent border-none text-lg focus:outline-none placeholder:text-slate-600 text-white"
                                />
                                <div className="px-2 py-1 rounded bg-slate-800 text-[10px] font-black uppercase text-slate-500 border border-white/5">
                                    ESC
                                </div>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                                {searchQuery.length === 0 && (
                                    <div className="p-4">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Actions Recommandées</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {navigation.slice(0, 4).map(item => (
                                                <button
                                                    key={item.href}
                                                    onClick={() => { router.push(item.href); setIsSearchOpen(false); }}
                                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all text-left group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 group-hover:text-brand-green transition-colors">
                                                        <item.icon size={18} />
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-300">Open {item.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {searchResults.length > 0 ? (
                                    <div className="p-2 space-y-1">
                                        {searchQuery.length > 0 && <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2">Résultats de recherche</p>}
                                        {searchResults.map((item) => (
                                            <button
                                                key={item.href}
                                                onClick={() => { router.push(item.href); setIsSearchOpen(false); }}
                                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-brand-green/10 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 rounded-lg bg-slate-900 border border-white/5 text-slate-400 group-hover:text-brand-green transition-colors">
                                                        <item.icon size={20} />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-sm font-black text-white">{item.name}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{item.href}</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={16} className="text-slate-600 group-hover:text-brand-green transition-colors" />
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    searchQuery.length > 0 && (
                                        <div className="p-12 text-center text-slate-500">
                                            <Zap size={32} className="mx-auto mb-4 opacity-10" />
                                            <p className="text-sm font-bold uppercase tracking-wider">Aucun protocole correspondant trouvé</p>
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="p-3 border-t border-white/5 bg-slate-950 flex items-center justify-between">
                                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                                    <div className="flex items-center gap-1"><ArrowRight size={12} /> Naviguer</div>
                                    <div className="flex items-center gap-1"><Command size={12} /> Sélectionner</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    <span className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Session Terminale Sécurisée</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mobile Overlay */}
            <AnimatePresence>
                {!isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSidebarOpen(true)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-50 backdrop-blur-xl border-r transition-all duration-300 transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-72'} ${isDarkMode ? 'bg-[#0f172a]/80 border-white/5' : 'bg-white/95 border-slate-200 shadow-lg'}`}>
                <div className="flex flex-col h-full relative">
                    {/* Collapse Button (Desktop Only) */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-brand-green border border-white/10 items-center justify-center text-black z-[60] hover:scale-110 transition-transform"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>

                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            <Link href="/admin" className="flex items-center gap-3">
                                <div className="min-w-[40px] w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center p-1 shadow-lg overflow-hidden group">
                                    <img
                                        src="/gsmlogo.png"
                                        alt="GSM Guide Academy"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                {!isCollapsed && (
                                    <span className="text-xl font-black tracking-tighter whitespace-nowrap leading-tight">GSM GUIDE<br /><span className="text-brand-green text-sm">ACADEMY</span></span>
                                )}
                            </Link>
                            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`admin-sidebar-link ${isActive ? 'active' : ''} ${isCollapsed ? 'justify-center px-0' : ''}`}
                                    title={isCollapsed ? item.name : ''}
                                >
                                    <Icon size={isCollapsed ? 22 : 18} />
                                    {!isCollapsed && <span>{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-white/5">
                        <button
                            onClick={handleLogout}
                            className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all font-bold ${isCollapsed ? 'justify-center px-0' : ''}`}
                            title={isCollapsed ? 'Déconnexion' : ''}
                        >
                            <LogOut size={isCollapsed ? 22 : 18} />
                            {!isCollapsed && <span>Déconnexion</span>}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
                {/* Global Header */}
                <header className={`h-20 flex items-center justify-between px-6 md:px-10 backdrop-blur-md sticky top-0 z-40 border-b transition-colors duration-300 ${isDarkMode ? 'bg-[#0a0f19]/80 border-white/5' : 'bg-white/90 border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center gap-4 flex-1">
                        <button onClick={() => setSidebarOpen(true)} className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-100">
                            <Menu size={20} />
                        </button>

                        {/* Global Search Input Trigger */}
                        <div
                            onClick={() => setIsSearchOpen(true)}
                            className="hidden md:flex relative max-w-md w-full group cursor-text"
                        >
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-hover:text-brand-green transition-colors" size={18} />
                            <div className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-2.5 pl-12 pr-4 text-xs font-bold text-slate-500 flex items-center justify-between hover:border-brand-green/30 transition-all">
                                <span>Rechercher dans le registre...</span>
                                <div className="flex items-center gap-1.5 opacity-50">
                                    <div className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5 text-[8px] tracking-tighter">CTRL</div>
                                    <div className="px-1.5 py-0.5 rounded bg-slate-800 border border-white/5 text-[8px] tracking-tighter">K</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Dark/Light Toggle */}
                        <button
                            onClick={() => {
                                const next = !isDarkMode;
                                setIsDarkMode(next);
                                localStorage.setItem('adminTheme', next ? 'dark' : 'light');
                                document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
                            }}
                            className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-white/5 text-slate-400 hover:text-yellow-400 transition-all hover:border-yellow-400/40"
                            title={isDarkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        <div className="relative">
                            <button 
                                onClick={() => {
                                    setIsNotifOpen(!isNotifOpen);
                                    if (!isNotifOpen) fetchNotificationsList();
                                }}
                                className={`relative w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${isNotifOpen ? 'bg-brand-green/20 border-brand-green text-brand-green' : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'}`}
                            >
                                <Bell size={20} />
                                {unreadNotifications > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 rounded-full border-2 border-[#0a0f19] text-[10px] font-black text-white flex items-center justify-center animate-bounce">
                                        {unreadNotifications > 9 ? '+9' : unreadNotifications}
                                    </span>
                                )}
                            </button>

                            {/* Facebook Style Dropdown */}
                            <AnimatePresence>
                                {isNotifOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className={`absolute right-0 mt-3 w-80 md:w-96 rounded-2xl shadow-2xl border z-50 overflow-hidden ${isDarkMode ? 'bg-[#0f172a] border-white/10' : 'bg-white border-slate-200'}`}
                                        >
                                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                                <h3 className={`font-black uppercase tracking-widest text-xs ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Notifications</h3>
                                                <button 
                                                    onClick={markAllAsRead}
                                                    className="text-[10px] font-black text-brand-green uppercase tracking-wider hover:underline"
                                                >
                                                    Tout marquer comme lu
                                                </button>
                                            </div>

                                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                                {fetchingNotifs && notifications.length === 0 ? (
                                                    <div className="p-10 text-center">
                                                        <Loader2 className="animate-spin text-brand-green mx-auto mb-2" size={24} />
                                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Séquençage des données...</p>
                                                    </div>
                                                ) : notifications.length > 0 ? (
                                                    notifications.map((notif) => (
                                                        <div 
                                                            key={notif.id}
                                                            onClick={() => markAsRead(notif.id)}
                                                            className={`p-4 border-b border-white/5 cursor-pointer transition-all hover:bg-white/[0.02] flex gap-4 ${!notif.is_read ? 'bg-brand-green/5' : ''}`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${getNotifColor(notif.type, notif.is_read)}`}>
                                                                {getNotifIcon(notif.type)}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{notif.title}</p>
                                                                <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{notif.message}</p>
                                                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-2">
                                                                    {new Date(notif.created_at).toLocaleDateString('fr-FR', { 
                                                                        hour: '2-digit', 
                                                                        minute: '2-digit' 
                                                                    })}
                                                                </p>
                                                            </div>
                                                            {!notif.is_read && (
                                                                <div className="w-2.5 h-2.5 bg-brand-green rounded-full mt-2" />
                                                            )}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-10 text-center opacity-50">
                                                        <Bell size={32} className="mx-auto mb-4 text-slate-600" />
                                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-600">Aucune alerte pour le moment</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 bg-white/[0.01] text-center border-t border-white/5">
                                                <Link 
                                                    href="/admin/notifications" 
                                                    className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors"
                                                    onClick={() => setIsNotifOpen(false)}
                                                >
                                                    Voir toutes les archives
                                                </Link>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        <div className="h-8 w-px bg-white/5 mx-2 hidden md:block"></div>
                        <div className="flex items-center gap-3">
                            <div className={`hidden md:block text-right`}>
                                <p className={`text-sm font-bold uppercase tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>ADMINISTRATEUR</p>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Profil Administrateur</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-950 border border-white/10 flex items-center justify-center text-white font-black shadow-lg">
                                AD
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content Scrollable */}
                <main className={`flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar transition-colors duration-300 ${isDarkMode ? '' : 'bg-[#f0f4f8]'}`}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}
