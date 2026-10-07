"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    LayoutDashboard, Users, BookOpen, CreditCard, LogOut, X,
    Loader2, GraduationCap, Calendar, Search, Bell,
    ChevronRight, Zap, CornerDownLeft, PanelLeftClose, PanelLeftOpen,
    CheckCircle, XCircle, Clock, UserPlus, ClipboardCheck, MoreHorizontal, ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { IconButton, buttonClass, cn } from '@/components/admin/ui';

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40';

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
    const [isCollapsed, setIsCollapsed] = useState(false);
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
            <div className="min-h-screen flex items-center justify-center bg-slate-50" role="status" aria-live="polite">
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

    // Mobile bottom tab bar: first 4 sections, the rest live in the "Plus" sheet
    const mobileTabs = navigation.slice(0, 4);
    const isNavActive = (href: string) => href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
    const isMoreActive = !mobileTabs.some(item => isNavActive(item.href));
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
        { collapsed = false, onNavigate, tall = false }: { collapsed?: boolean; onNavigate?: () => void; tall?: boolean } = {}
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
                    'admin-sidebar-link group relative gap-2.5! rounded-lg! py-0! text-sm! shadow-none! transition-colors',
                    tall ? 'h-11' : 'h-9',
                    collapsed ? 'justify-center px-0!' : 'px-2.5!',
                    isActive
                        ? 'bg-slate-100! text-slate-900!'
                        : 'bg-transparent text-slate-600! hover:bg-slate-50! hover:text-slate-900!',
                    FOCUS_RING
                )}
            >
                {isActive && (
                    <span aria-hidden="true" className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-green" />
                )}
                <Icon
                    size={18}
                    strokeWidth={2}
                    className={cn('shrink-0 transition-colors', isActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600')}
                />
                {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
        );
    };

    const sectionLabel = role === 'professor' ? 'Espace professeur' : 'Administration';

    return (
        <div className="admin-dashboard min-h-screen text-slate-900 flex overflow-hidden bg-slate-50">
            {/* Command palette */}
            <AnimatePresence>
                {isSearchOpen && (
                    <div className="admin-palette fixed inset-0 z-[100] flex items-start justify-center px-3 pt-[calc(env(safe-area-inset-top)+1rem)] md:px-4 md:pt-[12vh]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSearchOpen(false)}
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Recherche rapide"
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15 }}
                            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                        >
                            <div className="flex h-12 items-center gap-3 border-b border-slate-200 px-4">
                                <Search className="shrink-0 text-slate-400" size={16} aria-hidden="true" />
                                <label htmlFor="admin-palette-search" className="sr-only">Rechercher une section</label>
                                <input
                                    id="admin-palette-search"
                                    autoFocus
                                    type="text"
                                    placeholder="Rechercher une section (étudiants, sessions…)"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="min-w-0 flex-1 border-none bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
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
                                        <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-slate-400">
                                            {searchQuery.length > 0 ? `Résultats (${searchResults.length})` : 'Toutes les sections'}
                                        </p>
                                        <div className="space-y-0.5">
                                            {searchResults.map((item) => {
                                                const active = isNavActive(item.href);
                                                return (
                                                    <button
                                                        key={item.href}
                                                        onClick={() => { router.push(item.href); setIsSearchOpen(false); }}
                                                        className={cn('group flex h-10 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm! transition-colors hover:bg-slate-100', FOCUS_RING)}
                                                    >
                                                        <span className="flex min-w-0 items-center gap-3">
                                                            <item.icon size={16} className="shrink-0 text-slate-400 group-hover:text-slate-600" />
                                                            <span className="truncate font-medium text-slate-900">{item.name}</span>
                                                            <span className="hidden truncate text-xs font-normal text-slate-400 sm:inline">{item.group}</span>
                                                        </span>
                                                        <span className="flex shrink-0 items-center gap-2">
                                                            {active && <span className="text-xs font-normal text-slate-500">Page actuelle</span>}
                                                            <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
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
                                                <Search size={18} />
                                            </span>
                                            <p className="text-sm font-semibold text-slate-900">Aucune section ne correspond à « {searchQuery} »</p>
                                            <p className="mt-1 text-sm text-slate-500">Essayez « étudiants », « sessions » ou « paiements ».</p>
                                        </div>
                                    )
                                )}
                            </div>

                            <div className="hidden items-center justify-between border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500 md:flex">
                                <div className="flex items-center gap-4">
                                    <span>Cliquer pour ouvrir</span>
                                    <span className="flex items-center gap-1.5"><CornerDownLeft size={12} /> Entrée pour valider</span>
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

            {/* Mobile "Plus" sheet */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <div className="fixed inset-0 z-[80] md:hidden">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSidebarOpen(false)}
                            className="absolute inset-0 bg-slate-950/40"
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-label="Menu"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 32, stiffness: 340 }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.6 }}
                            onDragEnd={(_, info) => { if (info.offset.y > 100 || info.velocity.y > 500) setSidebarOpen(false); }}
                            className="absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-2xl border-t border-slate-200 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-xl"
                        >
                            <div className="flex justify-center pb-1 pt-2.5">
                                <div className="h-1 w-9 rounded-full bg-slate-200" />
                            </div>
                            <div className="flex items-center gap-3 border-b border-slate-200 px-4 pb-3 pt-1">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                                    {initials}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold text-slate-900">{profileName}</p>
                                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                                </div>
                                <IconButton label="Fermer le menu" title="Fermer" icon={X} onClick={() => setSidebarOpen(false)} className="-mr-2" />
                            </div>

                            <nav aria-label="Toutes les sections" className="px-3 py-3">
                                {groupedNavigation.map(({ group, items }, index) => (
                                    <div key={group} className={index > 0 ? 'mt-3' : ''}>
                                        <p className="mb-1 px-2.5 text-xs font-medium text-slate-400">{group}</p>
                                        <div className="space-y-0.5">
                                            {items.map(item => renderNavLink(item, { tall: true, onNavigate: () => setSidebarOpen(false) }))}
                                        </div>
                                    </div>
                                ))}
                            </nav>

                            <div className="space-y-0.5 border-t border-slate-200 px-3 pt-3">
                                <button
                                    onClick={() => { setSidebarOpen(false); setIsSearchOpen(true); }}
                                    className={cn('flex h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm! text-slate-700 transition-colors hover:bg-slate-50', FOCUS_RING)}
                                >
                                    <Search size={18} className="text-slate-400" />
                                    <span>Rechercher</span>
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className={cn('flex h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm! text-rose-600 transition-colors hover:bg-rose-50', FOCUS_RING)}
                                >
                                    <LogOut size={18} />
                                    <span>Déconnexion</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Mobile bottom tab bar */}
            <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
                <div className="flex h-14 items-stretch justify-around">
                    {mobileTabs.map((item) => {
                        const Icon = item.icon;
                        const isActive = isNavActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={isActive ? 'page' : undefined}
                                className={`admin-tab relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors focus-visible:bg-slate-50 focus-visible:outline-none ${isActive ? 'text-slate-900' : 'text-slate-500'}`}
                            >
                                {isActive && (
                                    <motion.span layoutId="admin-tab-indicator" className="absolute top-0 h-0.5 w-8 rounded-b-full bg-brand-green" />
                                )}
                                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                                <span className="admin-tab-label">{item.name === 'Tableau de bord' ? 'Accueil' : item.name}</span>
                            </Link>
                        );
                    })}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Plus de sections"
                        aria-expanded={isSidebarOpen}
                        className={`admin-tab relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 transition-colors focus-visible:bg-slate-50 focus-visible:outline-none ${isMoreActive ? 'text-slate-900' : 'text-slate-500'}`}
                    >
                        {isMoreActive && (
                            <motion.span layoutId="admin-tab-indicator" className="absolute top-0 h-0.5 w-8 rounded-b-full bg-brand-green" />
                        )}
                        <MoreHorizontal size={20} strokeWidth={isMoreActive ? 2.2 : 1.8} />
                        <span className="admin-tab-label">Plus</span>
                    </button>
                </div>
            </nav>

            {/* Sidebar */}
            <aside className={cn(
                'fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-slate-200 bg-white transition-[width] duration-200 md:flex',
                isCollapsed ? 'w-16' : 'w-60'
            )}>
                <div className={cn('flex h-14 shrink-0 items-center border-b border-slate-200', isCollapsed ? 'justify-center' : 'px-4')}>
                    <Link href="/admin" className={cn('flex min-w-0 items-center gap-2.5 rounded-lg', FOCUS_RING)} aria-label="GSM Guide Academy — tableau de bord">
                        <img src="/gsmlogo.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
                        {!isCollapsed && (
                            <span className="min-w-0 leading-tight">
                                <span className="block truncate text-sm font-semibold text-slate-900">GSM Guide Academy</span>
                                <span className="block truncate text-xs text-slate-500">{sectionLabel}</span>
                            </span>
                        )}
                    </Link>
                </div>

                <nav aria-label="Navigation principale" className={cn('flex-1 overflow-y-auto py-3 custom-scrollbar', isCollapsed ? 'px-2' : 'px-3')}>
                    {groupedNavigation.map(({ group, items }, index) => (
                        <div key={group} className={index > 0 ? 'mt-4' : ''}>
                            {isCollapsed
                                ? index > 0 && <div className="mx-2 mb-3 border-t border-slate-100" aria-hidden="true" />
                                : <p className="mb-1 px-2.5 text-xs font-medium text-slate-400">{group}</p>}
                            <div className="space-y-0.5">
                                {items.map(item => renderNavLink(item, { collapsed: isCollapsed }))}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="shrink-0 border-t border-slate-200 p-2">
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        aria-label={isCollapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
                        title={isCollapsed ? 'Déplier' : 'Replier'}
                        className={cn(
                            'flex h-9 w-full items-center gap-2.5 rounded-lg text-sm! text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900',
                            isCollapsed ? 'justify-center px-0' : 'px-2.5',
                            FOCUS_RING
                        )}
                    >
                        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                        {!isCollapsed && <span>Replier le menu</span>}
                    </button>
                </div>
            </aside>

            {/* Main content area */}
            <div className={cn('flex min-w-0 flex-1 flex-col transition-[margin] duration-200', isCollapsed ? 'md:ml-16' : 'md:ml-60')}>
                {/* Top bar */}
                <header className="sticky top-0 z-40 border-b border-slate-200 bg-white pt-[env(safe-area-inset-top)] md:pt-0">
                    <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-6">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                            {/* Mobile app bar title */}
                            <Link href="/admin" aria-label="Tableau de bord" className={cn('shrink-0 rounded-lg md:hidden', FOCUS_RING)}>
                                <img src="/gsmlogo.png" alt="" className="h-7 w-7 object-contain" />
                            </Link>
                            <div className="min-w-0 md:hidden">
                                <p className="admin-appbar-title truncate">{currentSection}</p>
                                <p className="admin-appbar-subtitle truncate">{role === 'professor' ? 'Espace professeur' : 'GSM Guide Academy'}</p>
                            </div>

                            {/* Desktop breadcrumb */}
                            <nav aria-label="Fil d’Ariane" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
                                <Link href="/admin" className={cn('shrink-0 rounded text-slate-500 transition-colors hover:text-slate-900', FOCUS_RING)}>
                                    {sectionLabel}
                                </Link>
                                <ChevronRight size={14} className="shrink-0 text-slate-300" aria-hidden="true" />
                                <span aria-current="page" className="truncate font-medium text-slate-900">{currentSection}</span>
                            </nav>
                        </div>

                        <div className="flex shrink-0 items-center gap-1 md:gap-2">
                            {/* Search trigger */}
                            <button
                                type="button"
                                onClick={() => setIsSearchOpen(true)}
                                aria-label="Ouvrir la recherche (Ctrl + K)"
                                className={cn('hidden h-9 w-56 items-center gap-2 rounded-lg border border-slate-200 bg-white pl-3 pr-1.5 text-left text-sm! text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600 md:flex lg:w-64', FOCUS_RING)}
                            >
                                <Search size={15} className="shrink-0" />
                                <span className="flex-1 truncate font-normal">Rechercher…</span>
                                <span className="flex shrink-0 items-center gap-0.5">
                                    <Kbd>Ctrl</Kbd>
                                    <Kbd>K</Kbd>
                                </span>
                            </button>
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
                                    className={buttonClass('ghost', 'md', cn('relative w-10 px-0', isNotifOpen && 'bg-slate-100 text-slate-900'))}
                                >
                                    <Bell size={18} />
                                    {unreadNotifications > 0 && (
                                        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-[#fff] tabular-nums ring-2 ring-white">
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
                                                transition={{ duration: 0.12 }}
                                                className="fixed left-3 right-3 top-[calc(3.5rem+env(safe-area-inset-top)+0.5rem)] z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-96"
                                            >
                                                <div className="flex h-12 items-center justify-between gap-3 border-b border-slate-200 px-4">
                                                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                                                        Notifications
                                                        {unreadNotifications > 0 && (
                                                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 tabular-nums">{unreadNotifications}</span>
                                                        )}
                                                    </h3>
                                                    <button
                                                        onClick={markAllAsRead}
                                                        disabled={unreadNotifications === 0}
                                                        title={unreadNotifications === 0 ? 'Aucune notification non lue' : 'Tout marquer comme lu'}
                                                        className={cn('h-8 rounded-md px-2 text-xs! text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent', FOCUS_RING)}
                                                    >
                                                        Tout marquer comme lu
                                                    </button>
                                                </div>

                                                <div className="max-h-[60dvh] divide-y divide-slate-100 overflow-y-auto custom-scrollbar md:max-h-[400px]">
                                                    {fetchingNotifs && notifications.length === 0 ? (
                                                        <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500" role="status">
                                                            <Loader2 className="animate-spin" size={16} />
                                                            Chargement des notifications…
                                                        </div>
                                                    ) : notifications.length > 0 ? (
                                                        notifications.map((notif) => (
                                                            <button
                                                                type="button"
                                                                key={notif.id}
                                                                onClick={() => openNotification(notif)}
                                                                className={cn('flex w-full gap-3 px-4 py-3 text-left text-sm! transition-colors hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none', !notif.is_read && 'bg-slate-50/60')}
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
                                                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sky-500" aria-label="Non lue" />
                                                                )}
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-6 py-10 text-center">
                                                            <span className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                                <Bell size={18} />
                                                            </span>
                                                            <p className="text-sm font-semibold text-slate-900">Aucune notification pour le moment</p>
                                                            <p className="mt-1 text-xs text-slate-500">Les nouvelles inscriptions et paiements apparaîtront ici.</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="border-t border-slate-200 bg-slate-50/60 p-1.5">
                                                    <Link
                                                        href="/admin/notifications"
                                                        className={cn('flex h-9 items-center justify-center gap-1 rounded-lg text-sm font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900', FOCUS_RING)}
                                                        onClick={() => setIsNotifOpen(false)}
                                                    >
                                                        Voir toutes les notifications <ChevronRight size={14} />
                                                    </Link>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* User menu */}
                            <div className="relative hidden md:block">
                                <button
                                    type="button"
                                    onClick={() => setIsUserMenuOpen(open => !open)}
                                    aria-expanded={isUserMenuOpen}
                                    aria-haspopup="menu"
                                    aria-label={`Compte : ${profileName}`}
                                    className={cn('flex h-9 items-center gap-2 rounded-lg pl-1 pr-2 text-sm! text-slate-700 transition-colors hover:bg-slate-100', isUserMenuOpen && 'bg-slate-100', FOCUS_RING)}
                                >
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                        {initials}
                                    </span>
                                    <span className="hidden max-w-[160px] truncate font-medium lg:block">{profileName}</span>
                                    <ChevronDown size={14} className="text-slate-400" />
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
                                                transition={{ duration: 0.12 }}
                                                className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg"
                                            >
                                                <div className="border-b border-slate-200 px-4 py-3">
                                                    <p className="truncate text-sm font-semibold text-slate-900">{profileName}</p>
                                                    <p className="truncate text-xs text-slate-500">{user?.email || profileRole}</p>                                                </div>
                                                <div className="p-1.5">
                                                    <button
                                                        role="menuitem"
                                                        onClick={handleLogout}
                                                        className={cn('flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm! text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700', FOCUS_RING)}
                                                    >
                                                        <LogOut size={16} />
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
                <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-50 p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] custom-scrollbar md:p-6 md:pb-10 lg:p-8">
                    <motion.div
                        key={pathname}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                        {children}
                    </motion.div>
                </main>
            </div>
        </div>
    );
}
