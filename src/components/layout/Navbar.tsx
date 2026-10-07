"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { Menu, X, Globe, LogOut, Phone, Mail, MapPin, Facebook, Instagram, Youtube, Linkedin, Music, Twitter, LayoutDashboard, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const socialLinks = [
    { href: 'https://www.facebook.com/GsmGuideAcademy', label: 'Facebook', icon: Facebook },
    { href: 'https://www.instagram.com/gsmguideacademy/', label: 'Instagram', icon: Instagram },
    { href: 'https://www.youtube.com/@GsmGuide', label: 'YouTube', icon: Youtube },
    { href: 'https://www.linkedin.com/company/gsm-guide/posts/?feedView=all', label: 'LinkedIn', icon: Linkedin },
    { href: 'https://www.tiktok.com/@gsmguidetn?_r=1&_t=ZS-94SYAIjihua', label: 'TikTok', icon: Music },
    { href: 'https://x.com/gsm_guide', label: 'X (Twitter)', icon: Twitter },
];

const Navbar = () => {
    const { t, language, setLanguage } = useLanguage();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);

        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            subscription.unsubscribe();
        };
    }, []);

    // UI only: close the mobile menu with the Escape key
    useEffect(() => {
        if (!isMenuOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsMenuOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isMenuOpen]);

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'fr' : 'en');
    };

    const navLinks = [
        { name: t.nav.home, href: '/' },
        { name: t.nav.formations, href: '/formations' },
        { name: t.nav.about, href: '/#about' },
        { name: t.nav.contact, href: '/#contact' },
    ];

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        if (href.startsWith('/#')) return false;
        return pathname?.startsWith(href);
    };

    const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2';

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur-lg transition-shadow duration-300 ${isScrolled ? 'border-slate-200 shadow-sm' : 'border-transparent'}`}
            aria-label="Navigation principale"
        >
            {/* Top Bar (desktop only) */}
            <div className="hidden lg:block border-b border-slate-200 bg-slate-50">
                <div className="container mx-auto flex h-9 items-center justify-between px-6 text-xs font-medium text-slate-600">
                    <div className="flex items-center gap-6">
                        <a href="tel:+21654151515" className="flex items-center gap-2 hover:text-slate-900 transition-colors">
                            <Phone size={14} className="text-brand-blue" />
                            <span className="tabular-nums">+216 54 15 15 15</span>
                        </a>
                        <a href="mailto:Gsmguideacademy@gmail.com" className="flex items-center gap-2 hover:text-slate-900 transition-colors">
                            <Mail size={14} className="text-brand-blue" />
                            <span>Gsmguideacademy@gmail.com</span>
                        </a>
                        <span className="flex items-center gap-2">
                            <MapPin size={14} className="text-brand-blue" />
                            <span>{t.footer.address}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {socialLinks.map(({ href, label, icon: Icon }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                title={label}
                                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-brand-blue transition-colors"
                            >
                                <Icon size={14} />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <div className="container mx-auto flex h-16 md:h-[72px] items-center justify-between gap-4 px-4 sm:px-6">
                <Link href="/" className={`flex min-w-0 items-center gap-2.5 rounded-xl ${focusRing}`} aria-label="GSM Guide Academy - Accueil">
                    <div className="relative h-10 w-10 shrink-0 md:h-11 md:w-11">
                        <Image
                            src="/gsmlogo.png"
                            alt="GSM Guide Academy Logo"
                            fill
                            sizes="44px"
                            className="object-contain"
                            priority
                        />
                    </div>
                    <span className="truncate text-lg font-extrabold tracking-tight text-slate-900 md:hidden lg:inline xl:text-xl">
                        GSM Guide <span className="text-brand-blue">Academy</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const active = isActive(link.href);
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                aria-current={active ? 'page' : undefined}
                                className={`relative rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${focusRing} ${active ? 'text-slate-900' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                            >
                                {link.name}
                                {active && <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-brand-green" />}
                            </Link>
                        );
                    })}
                </div>

                <div className="hidden md:flex items-center gap-2">
                    <button
                        onClick={toggleLanguage}
                        className={`flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors ${focusRing}`}
                        aria-label={language === 'en' ? 'Passer en français' : 'Switch to English'}
                        title={language === 'en' ? 'Passer en français' : 'Switch to English'}
                    >
                        <Globe size={16} />
                        <span className="uppercase">{language}</span>
                    </button>

                    {user ? (
                        <>
                            <Link
                                href="/dashboard"
                                className={`flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-50 transition-colors ${focusRing}`}
                            >
                                <LayoutDashboard size={16} className="text-brand-blue" />
                                {t.nav.dashboard}
                            </Link>
                            <button
                                onClick={() => supabase.auth.signOut()}
                                className={`flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors ${focusRing}`}
                                aria-label={t.nav.logout}
                                title={t.nav.logout}
                            >
                                <LogOut size={18} />
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className={`flex h-10 items-center rounded-xl px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors ${focusRing}`}
                            >
                                {t.nav.login}
                            </Link>
                            <Link
                                href="/formations"
                                className={`hidden xl:flex h-10 items-center rounded-xl bg-brand-green px-5 text-sm font-bold text-black hover:brightness-95 transition ${focusRing}`}
                            >
                                {t.hero.cta}
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile menu button */}
                <button
                    className={`md:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-900 hover:bg-slate-100 ${focusRing}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label={isMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                    aria-expanded={isMenuOpen}
                    aria-controls="mobile-menu"
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Navigation */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        id="mobile-menu"
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 bg-white shadow-xl md:hidden"
                    >
                        <div className="flex flex-col gap-1 p-4">
                            {navLinks.map((link) => {
                                const active = isActive(link.href);
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        aria-current={active ? 'page' : undefined}
                                        className={`flex h-12 items-center rounded-xl px-4 text-base font-semibold ${active ? 'bg-slate-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        {active && <span className="mr-3 h-5 w-1 rounded-full bg-brand-green" />}
                                        {link.name}
                                    </Link>
                                );
                            })}

                            <div className="mt-3 grid gap-2 border-t border-slate-200 pt-4">
                                <Link
                                    href={user ? "/dashboard" : "/register"}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="flex h-12 items-center justify-center rounded-xl bg-brand-green text-base font-bold text-black"
                                >
                                    {user ? t.nav.dashboard : t.nav.register}
                                </Link>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={toggleLanguage}
                                        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-700"
                                    >
                                        <Globe size={18} />
                                        {language === 'en' ? 'English' : 'Français'}
                                    </button>
                                    {user ? (
                                        <button
                                            onClick={() => supabase.auth.signOut()}
                                            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold text-rose-600"
                                        >
                                            <LogOut size={18} /> {t.nav.logout}
                                        </button>
                                    ) : (
                                        <Link
                                            href="/login"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="flex h-11 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
                                        >
                                            {t.nav.login}
                                        </Link>
                                    )}
                                </div>
                            </div>

                            <div className="mt-3 flex flex-col gap-1 border-t border-slate-200 pt-4 text-sm text-slate-600">
                                <a href="tel:+21654151515" className="flex h-10 items-center gap-3 rounded-lg px-2 hover:bg-slate-50">
                                    <Phone size={18} className="text-brand-blue" />
                                    <span className="tabular-nums">+216 54 15 15 15</span>
                                </a>
                                <a href="mailto:Gsmguideacademy@gmail.com" className="flex h-10 items-center gap-3 rounded-lg px-2 hover:bg-slate-50">
                                    <Mail size={18} className="text-brand-blue" />
                                    <span className="break-all">Gsmguideacademy@gmail.com</span>
                                </a>
                                <div className="flex min-h-10 items-center gap-3 px-2">
                                    <MapPin size={18} className="shrink-0 text-brand-blue" />
                                    <span>{t.footer.address}</span>
                                </div>
                            </div>

                            <div className="mt-3 border-t border-slate-200 pt-4">
                                <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Nos autres plateformes</p>
                                <a href="https://shop.gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-blue hover:bg-slate-50">
                                    <ExternalLink size={16} /> Reparation Shop
                                </a>
                                <a href="https://gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className="flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-bold text-brand-blue hover:bg-slate-50">
                                    <ExternalLink size={16} /> GSM Guide Repair
                                </a>
                                <div className="mt-3 flex flex-wrap gap-1 px-1">
                                    {socialLinks.map(({ href, label, icon: Icon }) => (
                                        <a
                                            key={label}
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={label}
                                            title={label}
                                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:text-brand-blue"
                                        >
                                            <Icon size={16} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
