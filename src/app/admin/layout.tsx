"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    LayoutDashboard, Users, BookOpen, CreditCard, LogOut, X,
    Loader2, GraduationCap, Calendar, Search, Bell,
    ChevronRight, Zap, CornerDownLeft, PanelLeftClose, PanelLeftOpen,
    CheckCircle, XCircle, Clock, UserPlus, ClipboardCheck, ChevronDown, Menu
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton, buttonClass, cn } from '@/components/admin/ui';

/* Neutral focus ring: never brand-coloured, so focus is never mistaken for a state. */
const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50';
const SIDEBAR_STORAGE_KEY = 'gsm:sidebar-collapsed';

/* Sidebar groups (presentation only — order of `allNavigation` is unchanged). */
const NAV_GROUPS = ['Général', 'Personnes', 'Formations', 'Gestion'] as const;


const Kbd = ({ children }: { children: React.ReactNode }) => (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-white px-1 font-sans text-[11px] font-medium text-slate-500">
        {children}
    </kbd>
);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<'admin' | 'professor'>('admin');
    const [displayName, setDisplayName] = useState('');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    // The first render is always the loading screen, so reading storage here cannot cause a hydration mismatch.
    const [isCollapsed, setIsCollapsed] = useState(() => {
        try { return typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1'; } catch { return false; }
    });
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [, setIsDarkMode] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [fetchingNotifs, setFetchingNotifs] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    useEffect(() => {
        // Enforce light theme for admin
        setIsDarkMode(false);
        document.documentElement.setAttribute('data-theme', 'light');

        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/admin/login');
                return;
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', user.id)
                .single();

            if (profile?.role !== 'admin' && profile?.role !== 'professor') {
                router.push('/dashboard');
                return;
            }

            setUser(user);
            setRole(profile.role);
            setDisplayName(profile.full_name || user.email || 'Professeur');
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

    useEffect(() => {
        setSidebarOpen(false);
        setIsNotifOpen(false);
        setIsUserMenuOpen(false);
    }, [pathname]);

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
            <div className="min-h-screen flex items-center justify-center bg-shell" role="status" aria-live="polite">
                <div className="flex flex-col items-center gap-3">
                    <img src="/gsmlogo.png" alt="" className="h-9 w-9 object-contain" />
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="animate-spin text-slate-400" size={16} />
                        Chargement de l’administration…
                    </div>
                </div>
            </div>
        );
    }

    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    const allNavigation = [
        { name: 'Tableau de bord', href: '/admin', icon: LayoutDashboard, keywords: 'overview dashboard accueil', group: 'Général' },
        { name: 'Étudiants', href: '/admin/students', icon: Users, keywords: 'élèves students clients inscriptions', group: 'Personnes' },
        { name: 'Professeurs', href: '/admin/teachers', icon: GraduationCap, keywords: 'enseignants formateurs staff', group: 'Personnes' },
        { name: 'Catalogue', href: '/admin/courses', icon: BookOpen, keywords: 'formations cours modules academic', group: 'Formations' },
        { name: 'Sessions', href: '/admin/sessions', icon: Calendar, keywords: 'planning dates calendrier', group: 'Formations' },
        { name: 'Présences', href: '/admin/presence', icon: ClipboardCheck, keywords: 'présence absent retard excusé feuille appel', group: 'Formations' },
        { name: 'Finances', href: '/admin/payments', icon: CreditCard, keywords: 'argent revenus transactions pognon', group: 'Gestion' },
    ];
    const navigation = role === 'professor'
        ? allNavigation.filter(item => ['/admin/students', '/admin/sessions', '/admin/presence'].includes(item.href))
        : allNavigation;

    const isNavActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
    const currentSection = allNavigation.find(item => isNavActive(item.href))?.name
        || (pathname.startsWith('/admin/notifications') ? 'Notifications'
            : pathname.startsWith('/admin/settings') ? 'Paramètres'
            : pathname.startsWith('/admin/analytics') ? 'Analytique'
            : 'Administration');

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
            case 'reservation_submitted': return <Clock size={18} />;
            case 'reservation_approved': return <CheckCircle size={18} />;
            case 'reservation_rejected': return <XCircle size={18} />;
            case 'payment_submitted': return <CreditCard size={18} />;
            case 'payment_approved': return <CheckCircle size={18} />;
            case 'payment_rejected': return <XCircle size={18} />;
            case 'new_student': return <UserPlus size={18} />;
            default: return <Zap size={18} />;
        }
    };

    // Neutral tile; only unread items get a (semantic) icon colour.
    const getNotifColor = (type: string, isRead: boolean) => {
        if (isRead) return 'text-slate-400';
        switch (type) {
            case 'reservation_approved':
            case 'payment_approved': return 'text-emerald-600';
            case 'reservation_rejected':
            case 'payment_rejected': return 'text-rose-600';
            case 'payment_submitted':
            case 'reservation_submitted': return 'text-amber-600';
            default: return 'text-slate-600';
        }
    };

    const getNotificationHref = (type: string) => {
        if (type === 'new_student') return '/admin/students';
        if (type.includes('payment') || type.includes('reservation')) return '/admin/payments';
        return '/admin/notifications';
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

    const openNotification = (notif: { id: string; type: string }) => {
        void markAsRead(notif.id);
        setIsNotifOpen(false);
        router.push(getNotificationHref(notif.type));
    };

    const initials = role === 'professor' ? 'PR' : 'AD';
    const profileName = role === 'professor' ? displayName : 'Administrateur';
    const profileRole = role === 'professor' ? 'Professeur' : 'Accès complet';

    const groupedNavigation = NAV_GROUPS
        .map(group => ({ group, items: navigation.filter(item => item.group === group) }))
        .filter(section => section.items.length > 0);

    const renderNavLink = (
        item: (typeof allNavigation)[number],
        { collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void } = {}
    ) => {
        const isActive = isNavActive(item.href);
        const Icon = item.icon;
        return (
            <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                aria-label={collapsed ? item.name : undefined}
                title={collapsed ? item.name : undefined}
                className={cn(
                    'group relative flex h-9 items-center gap-3 rounded-lg text-[13.5px] transition-colors duration-150',
                    collapsed ? 'justify-center px-0' : 'px-3',
                    isActive
                        ? 'bg-white font-semibold text-slate-900 shadow-[var(--shadow-card)] ring-1 ring-slate-200/70'
                        : 'font-medium text-slate-600 hover:bg-white/70 hover:text-slate-900',
                    FOCUS_RING
                )}
            >
                {isActive && (
                    <span aria-hidden="true" className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-green" />
                )}
                <Icon
                    size={18}
                    strokeWidth={isActive ? 2.2 : 1.9}
                    aria-hidden="true"
                    className={cn('shrink-0 transition-colors duration-150', isActive ? 'text-brand-blue' : 'text-slate-400 group-hover:text-slate-600')}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
        );
    };

    const sectionLabel = role === 'professor' ? 'Espace professeur' : 'Administration';

    const now = new Date();
    const greeting = now.getHours() >= 18 ? 'Bonsoir' : 'Bonjour';
    const firstName = role === 'professor' ? (displayName.split(/[\s@]/)[0] || 'Professeur') : 'Administrateur';
    const todayLabel = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const toggleCollapsed = () => {
        setIsCollapsed(prev => {
            const next = !prev;
            try { window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0'); } catch { /* storage unavailable */ }
            return next;
        });
    };

    const renderSidebar = (collapsed: boolean, onNavigate?: () => void) => (
        <>
            {/* Brand */}
            <div className={cn('flex h-16 shrink-0 items-center', collapsed ? 'justify-center px-2' : 'px-5')}>
                <Link
                    href="/admin"
                    onClick={onNavigate}
                    className={cn('flex min-w-0 items-center gap-3 rounded-xl', FOCUS_RING)}
                    aria-label="GSM Guide Academy — tableau de bord"
                >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-[var(--shadow-card)] ring-1 ring-slate-200/70">
                        <img src="/gsmlogo.png" alt="" className="h-7 w-7 object-contain" />
                    </span>
                    {!collapsed && (
                        <span className="min-w-0 leading-tight">
                            <span className="block truncate text-[14px] font-semibold tracking-tight text-slate-900">
                                GSM <span className="text-brand-blue">Guide</span> Academy
                            </span>
                            <span className="block truncate text-xs text-slate-500">{sectionLabel}</span>
                        </span>
                    )}
                </Link>
            </div>

            {/* Search */}
            <div className={cn('pb-3', collapsed ? 'px-3' : 'px-4')}>
                <button
                    type="button"
                    onClick={() => { onNavigate?.(); setIsSearchOpen(true); }}
                    aria-label="Ouvrir la recherche (Ctrl + K)"
                    title={collapsed ? 'Rechercher (Ctrl + K)' : undefined}
                    className={cn(
                        'flex h-9 w-full cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white text-left text-[13px] text-slate-500 shadow-[var(--shadow-card)] transition-colors duration-150 hover:border-slate-300 hover:text-slate-700',
                        collapsed ? 'justify-center px-0' : 'pl-3 pr-1.5',
                        FOCUS_RING
                    )}
                >
                    <Search size={15} className="shrink-0" aria-hidden="true" />
                    {!collapsed && (
                        <>
                            <span className="flex-1 truncate">Rechercher…</span>
                            <span className="hidden shrink-0 items-center gap-0.5 md:flex">
                                <Kbd>Ctrl</Kbd>
                                <Kbd>K</Kbd>
                            </span>
                        </>
                    )}
                </button>
            </div>

            {/* Navigation */}
            <nav aria-label="Navigation principale" className={cn('admin-sidebar-scroll flex-1 overflow-y-auto pb-4', collapsed ? 'px-3' : 'px-4')}>
                {groupedNavigation.map(({ group, items }, index) => (
                    <div key={group} className={index > 0 ? 'mt-5' : 'mt-1'}>
                        {collapsed
                            ? index > 0 && <div className="mx-2 mb-3 border-t border-slate-200" aria-hidden="true" />
                            : <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{group}</p>}
                        <div className="space-y-0.5">
                            {items.map(item => renderNavLink(item, { collapsed, onNavigate }))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Account + collapse */}
            <div className={cn('shrink-0 space-y-1 pb-3 pt-2', collapsed ? 'px-3' : 'px-4')}>
                <div className={cn(
                    'flex items-center gap-3 rounded-xl',
                    collapsed ? 'justify-center py-1' : 'border border-slate-200/80 bg-white p-2 shadow-[var(--shadow-card)]'
                )}>
                    <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-green text-xs font-bold text-[#fff]"
                        title={collapsed ? profileName : undefined}
                        aria-hidden={collapsed ? undefined : true}
                    >
                        {initials}
                    </span>
                    {!collapsed && (
                        <>
                            <span className="min-w-0 flex-1 leading-tight">
                                <span className="block truncate text-[13px] font-semibold text-slate-900">{profileName}</span>
                                <span className="block truncate text-xs text-slate-500">{profileRole}</span>
                            </span>
                            <button
                                type="button"
                                onClick={handleLogout}
                                aria-label="Déconnexion"
                                title="Déconnexion"
                                className={cn('flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600', FOCUS_RING)}
                            >
                                <LogOut size={16} aria-hidden="true" />
                            </button>
                        </>
                    )}
                </div>
                {!onNavigate && (
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        aria-label={collapsed ? 'Déplier la barre latérale' : 'Réduire la barre latérale'}
                        title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
                        className={cn(
                            'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg text-[13px] text-slate-500 transition-colors duration-150 hover:bg-white/70 hover:text-slate-900',
                            collapsed ? 'justify-center px-0' : 'px-3',
                            FOCUS_RING
                        )}
                    >
                        {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
                        {!collapsed && <span>Réduire le menu</span>}
                    </button>
                )}
            </div>
        </>
    );

    return (
        <div className="admin-dashboard flex h-dvh overflow-hidden bg-shell text-slate-900">
            <a
                href="#admin-main"
                className="sr-only rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-[var(--shadow-pop)] focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[200] focus:outline-none focus:ring-2 focus:ring-focus/50"
            >
                Aller au contenu
            </a>

            {/* Command palette */}
            <AnimatePresence>
                {isSearchOpen && (
                    <div className="admin-palette fixed inset-0 z-[100] flex items-start justify-center px-3 pt-[calc(env(safe-area-inset-top)+1rem)] md:px-4 md:pt-[12vh]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSearchOpen(false)}
                            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[3px]"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Recherche rapide"
                            initial={{ opacity: 0, y: -8, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.98 }}
                            transition={{ duration: 0.18 }}
                            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-pop)]"
                        >
                            <div className="flex h-13 items-center gap-3 border-b border-slate-100 px-4">
                                <Search className="shrink-0 text-slate-400" size={16} aria-hidden="true" />
                                <label htmlFor="admin-palette-search" className="sr-only">Rechercher une section</label>
                                <input
                                    id="admin-palette-search"
                                    autoFocus
                                    type="text"
                                    placeholder="Rechercher une section (étudiants, sessions…)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-12 min-w-0 flex-1 border-none bg-transparent text-sm text-slate-900 shadow-none placeholder:text-slate-400 focus:outline-none focus:ring-0"
                                />
                                <IconButton
                                    label="Fermer la recherche"
                                    title="Fermer"
                                    icon={X}
                                    onClick={() => setIsSearchOpen(false)}
                                    className="-mr-2 md:hidden"
                                />
                                <span className="hidden md:inline-flex"><Kbd>Échap</Kbd></span>
                            </div>

                            <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                                {searchResults.length > 0 ? (
                                    <div>
                                        <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                                            {searchQuery.length > 0 ? `Résultats (${searchResults.length})` : 'Toutes les sections'}
                                        </p>
                                        <div className="space-y-0.5">
                                            {searchResults.map((item) => {
                                                const active = isNavActive(item.href);
                                                return (
                                                    <button
                                                        key={item.href}
                                                        onClick={() => { router.push(item.href); setIsSearchOpen(false); }}
                                                        className={cn('group flex h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm! transition-colors duration-150 hover:bg-slate-50', FOCUS_RING)}
                                                    >
                                                        <span className="flex min-w-0 items-center gap-3">
                                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-brand-blue/10 group-hover:text-brand-blue">
                                                                <item.icon size={15} aria-hidden="true" />
                                                            </span>
                                                            <span className="truncate font-medium text-slate-900">{item.name}</span>
                                                            <span className="hidden truncate text-xs font-normal text-slate-400 sm:inline">{item.group}</span>
                                                        </span>
                                                        <span className="flex shrink-0 items-center gap-2">
                                                            {active && <span className="text-xs font-normal text-slate-500">Page actuelle</span>}
                                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" aria-hidden="true" />
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    searchQuery.length > 0 && (
                                        <div className="px-6 py-10 text-center">
                                            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                <Search size={18} aria-hidden="true" />
                                            </span>
                                            <p className="text-sm font-semibold text-slate-900">Aucune section ne correspond à « {searchQuery} »</p>
                                            <p className="mt-1 text-sm text-slate-500">Essayez « étudiants », « sessions » ou « paiements ».</p>
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="hidden items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 text-xs text-slate-500 md:flex">
                                <div className="flex items-center gap-4">
                                    <span>Cliquer pour ouvrir</span>
                                    <span className="flex items-center gap-1.5"><CornerDownLeft size={12} aria-hidden="true" /> Entrée pour valider</span>
                                </div>
                                <span className="flex items-center gap-1">
                                    <Kbd>Ctrl</Kbd>
                                    <Kbd>K</Kbd>
                                    <span className="ml-1">pour basculer</span>
                                </span>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mobile drawer */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-[80] md:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px]"
                        />
                        <motion.aside
                            role="dialog"
                            aria-modal="true"
                            aria-label="Menu"
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            transition={{ type: 'spring', damping: 34, stiffness: 360 }}
                            className="absolute inset-y-0 left-0 flex w-[min(85vw,288px)] flex-col bg-shell pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-[var(--shadow-pop)]"
                        >
                            <IconButton
                                label="Fermer le menu"
                                title="Fermer"
                                icon={X}
                                onClick={() => setSidebarOpen(false)}
                                className="absolute right-2 top-[calc(env(safe-area-inset-top)+0.75rem)]"
                            />
                            {renderSidebar(false, () => setSidebarOpen(false))}
                        </motion.aside>
                    </div>
                )}
            </AnimatePresence>

            {/* Desktop sidebar */}
            <aside className={cn(
                'hidden shrink-0 flex-col bg-shell transition-[width] duration-200 md:flex',
                isCollapsed ? 'w-[72px]' : 'w-[264px]'
            )}>
                {renderSidebar(isCollapsed)}
            </aside>

            {/* Floating content panel */}
            <div className="flex min-w-0 flex-1 flex-col md:py-2 md:pr-2">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-canvas md:rounded-2xl md:border md:border-slate-200/70 md:shadow-[var(--shadow-card)]">
                    {/* Top bar */}
                    <header className="z-40 shrink-0 border-b border-slate-200/70 bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl md:pt-0">
                        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-5 lg:px-8">
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                <IconButton
                                    label="Ouvrir le menu"
                                    icon={Menu}
                                    onClick={() => setSidebarOpen(true)}
                                    aria-expanded={isSidebarOpen}
                                    className="-ml-1 md:hidden"
                                />
                                <div className="min-w-0">
                                    <p className="truncate text-[15px] font-semibold tracking-tight text-slate-900">
                                        <span className="md:hidden">{currentSection}</span>
                                        <span className="hidden md:inline">{greeting}, {firstName}</span>
                                    </p>
                                    <p className="truncate text-xs capitalize text-slate-500">
                                        <span className="md:hidden">{sectionLabel}</span>
                                        <span className="hidden md:inline">{todayLabel}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-1 md:gap-1.5">
                                <IconButton label="Rechercher" icon={Search} onClick={() => setIsSearchOpen(true)} className="md:hidden" />

                                {/* Notifications */}
                                <div className="relative">
                                    <button
                                        onClick={() => {
                                            setIsNotifOpen(!isNotifOpen);
                                            if (!isNotifOpen) fetchNotificationsList();
                                        }}
                                        aria-label={unreadNotifications > 0 ? `Notifications (${unreadNotifications} non lues)` : 'Notifications'}
                                        aria-expanded={isNotifOpen}
                                        title="Notifications"
                                        className={buttonClass('ghost', 'md', cn('relative w-9 px-0', isNotifOpen && 'bg-slate-100 text-slate-900'))}
                                    >
                                        <Bell size={18} aria-hidden="true" />
                                        {unreadNotifications > 0 && (
                                            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-[#fff] tabular-nums ring-2 ring-canvas">
                                                {unreadNotifications > 9 ? '9+' : unreadNotifications}
                                            </span>
                                        )}
                                    </button>

                                    <AnimatePresence>
                                        {isNotifOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                                                <motion.div
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 4 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="fixed left-3 right-3 top-[calc(4rem+env(safe-area-inset-top)+0.5rem)] z-50 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-pop)] md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-96"
                                                >
                                                    <div className="flex h-12 items-center justify-between gap-3 border-b border-slate-100 px-4">
                                                        <h3 className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-slate-900">
                                                            Notifications
                                                            {unreadNotifications > 0 && (
                                                                <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-semibold text-brand-blue tabular-nums">{unreadNotifications}</span>
                                                            )}
                                                        </h3>
                                                        <button
                                                            onClick={markAllAsRead}
                                                            disabled={unreadNotifications === 0}
                                                            title={unreadNotifications === 0 ? 'Aucune notification non lue' : 'Tout marquer comme lu'}
                                                            className={cn('h-8 cursor-pointer rounded-lg px-2 text-xs! font-medium text-brand-blue transition-colors hover:bg-brand-blue/5 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent', FOCUS_RING)}
                                                        >
                                                            Tout marquer comme lu
                                                        </button>
                                                    </div>

                                                    <div className="max-h-[60dvh] divide-y divide-slate-100 overflow-y-auto custom-scrollbar md:max-h-[400px]">
                                                        {fetchingNotifs && notifications.length === 0 ? (
                                                            <div className="space-y-3 p-4" role="status" aria-label="Chargement des notifications">
                                                                {[0, 1, 2].map(i => (
                                                                    <div key={i} className="flex gap-3">
                                                                        <div className="h-8 w-8 shrink-0 animate-pulse rounded-lg bg-slate-100" />
                                                                        <div className="flex-1 space-y-2">
                                                                            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                                                                            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : notifications.length > 0 ? (
                                                            notifications.map((notif) => (
                                                                <button
                                                                    type="button"
                                                                    key={notif.id}
                                                                    onClick={() => openNotification(notif)}
                                                                    className={cn('flex w-full cursor-pointer gap-3 px-4 py-3 text-left text-sm! transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none', !notif.is_read && 'bg-brand-blue/[0.03]')}
                                                                >
                                                                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 [&_svg]:h-4 [&_svg]:w-4', getNotifColor(notif.type, notif.is_read))}>
                                                                        {getNotifIcon(notif.type)}
                                                                    </span>
                                                                    <span className="min-w-0 flex-1">
                                                                        <span className={cn('block truncate text-sm', notif.is_read ? 'font-normal text-slate-600' : 'font-semibold text-slate-900')}>{notif.title}</span>
                                                                        <span className="mt-0.5 block line-clamp-2 text-xs font-normal text-slate-500">{notif.message}</span>
                                                                        <span className="mt-1 block text-xs font-normal text-slate-400 tabular-nums">
                                                                            {new Date(notif.created_at).toLocaleDateString('fr-FR', {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                    </span>
                                                                    {!notif.is_read && (
                                                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-blue" aria-label="Non lue" />
                                                                    )}
                                                                </button>
                                                            ))
                                                        ) : (
                                                            <div className="px-6 py-10 text-center">
                                                                <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                                    <Bell size={18} aria-hidden="true" />
                                                                </span>
                                                                <p className="text-sm font-semibold text-slate-900">Aucune notification pour le moment</p>
                                                                <p className="mt-1 text-xs text-slate-500">Les nouvelles inscriptions et paiements apparaîtront ici.</p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="border-t border-slate-100 bg-slate-50/70 p-1.5">
                                                        <Link
                                                            href="/admin/notifications"
                                                            className={cn('flex h-9 items-center justify-center gap-1 rounded-lg text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900', FOCUS_RING)}
                                                            onClick={() => setIsNotifOpen(false)}
                                                        >
                                                            Voir toutes les notifications <ChevronRight size={14} aria-hidden="true" />
                                                        </Link>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <span className="mx-1.5 hidden h-6 w-px bg-slate-200 md:block" aria-hidden="true" />

                                {/* User menu */}
                                <div className="relative hidden md:block">
                                    <button
                                        type="button"
                                        onClick={() => setIsUserMenuOpen(open => !open)}
                                        aria-expanded={isUserMenuOpen}
                                        aria-haspopup="menu"
                                        aria-label={`Compte : ${profileName}`}
                                        className={cn('flex h-10 cursor-pointer items-center gap-2.5 rounded-xl pl-1 pr-2 text-sm! text-slate-700 transition-colors hover:bg-slate-100', isUserMenuOpen && 'bg-slate-100', FOCUS_RING)}
                                    >
                                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-blue to-brand-green text-xs font-bold text-[#fff]">
                                            {initials}
                                        </span>
                                        <span className="hidden min-w-0 text-left leading-tight lg:block">
                                            <span className="block max-w-[160px] truncate text-[13px] font-semibold text-slate-900">{profileName}</span>
                                            <span className="block max-w-[160px] truncate text-xs text-slate-500">{profileRole}</span>
                                        </span>
                                        <ChevronDown size={14} className="text-slate-400" aria-hidden="true" />
                                    </button>

                                    <AnimatePresence>
                                        {isUserMenuOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                                                <motion.div
                                                    role="menu"
                                                    initial={{ opacity: 0, y: 4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 4 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[var(--shadow-pop)]"
                                                >
                                                    <div className="border-b border-slate-100 px-4 py-3">
                                                        <p className="truncate text-sm font-semibold text-slate-900">{profileName}</p>
                                                        <p className="truncate text-xs text-slate-500">{user?.email || profileRole}</p>
                                                    </div>
                                                    <div className="p-1.5">
                                                        <button
                                                            role="menuitem"
                                                            onClick={handleLogout}
                                                            className={cn('flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-sm! text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700', FOCUS_RING)}
                                                        >
                                                            <LogOut size={16} aria-hidden="true" />
                                                            Déconnexion
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Scrollable content */}
                    <main id="admin-main" tabIndex={-1} className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-5 custom-scrollbar focus:outline-none sm:px-5 lg:px-8 lg:pt-6">
                        <div className="mx-auto max-w-[1600px]">
                            <nav aria-label="Fil d’Ariane" className="mb-3 hidden items-center gap-1.5 text-xs md:flex">
                                <Link href="/admin" className={cn('rounded text-slate-500 transition-colors hover:text-slate-900', FOCUS_RING)}>
                                    {sectionLabel}
                                </Link>
                                <ChevronRight size={12} className="text-slate-300" aria-hidden="true" />
                                <span aria-current="page" className="font-medium text-slate-700">{currentSection}</span>
                            </nav>
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, ease: 'easeOut' }}
                            >
                                {children}
                            </motion.div>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
