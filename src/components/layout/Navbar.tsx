"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/context/LanguageContext';
import { Menu, X, Globe, User, LogOut, Phone, Mail, MapPin, Facebook, Instagram, Youtube, Linkedin, Music, Twitter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';

const Navbar = () => {
    const { t, language, setLanguage } = useLanguage();
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

    const toggleLanguage = () => {
        setLanguage(language === 'en' ? 'fr' : 'en');
    };

    const navLinks = [
        { name: t.nav.home, href: '/' },
        { name: t.nav.formations, href: '/formations' },
        { name: t.nav.about, href: '/#about' },
        { name: t.nav.contact, href: '/#contact' },
    ];

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg shadow-md' : 'bg-transparent'
                }`}
        >
            {/* Top Bar */}
            <div className="hidden lg:block bg-slate-950 text-white py-2">
                <div className="container mx-auto px-6 flex justify-between items-center text-xs font-medium">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Phone size={14} className="text-brand-green" />
                            <span>+216 54 15 15 15</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Mail size={14} className="text-brand-green" />
                            <span>Gsmguideacademy@gmail.com</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                        <a href="https://www.facebook.com/GsmGuideAcademy" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors">
                            <Facebook size={14} />
                        </a>
                        <a href="https://www.instagram.com/gsmguideacademy/" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors">
                            <Instagram size={14} />
                        </a>
                        <a href="https://www.youtube.com/@GsmGuide" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors">
                            <Youtube size={14} />
                        </a>
                        <a href="https://www.linkedin.com/company/gsm-guide/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors">
                            <Linkedin size={14} />
                        </a>
                        <a href="https://www.tiktok.com/@gsmguidetn?_r=1&_t=ZS-94SYAIjihua" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors">
                            <Music size={14} />
                        </a>
                        <a href="https://x.com/gsm_guide" target="_blank" rel="noopener noreferrer" className="hover:text-brand-green transition-colors">
                            <Twitter size={14} />
                        </a>
                    </div>
                </div>
            </div>

            <div className={`transition-all duration-300 ${isScrolled ? 'py-3' : 'py-5'}`}>
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="relative w-12 h-12">
                            <Image
                                src="/gsmlogo.png"
                                alt="GSM Guide Academy Logo"
                                fill
                                sizes="(max-width: 768px) 48px, 48px"
                                className="object-contain"
                            />
                        </div>
                        <span className="font-bold text-xl tracking-tight hidden sm:block">
                            GSM Guide <span className="text-brand-blue">Academy</span>
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="font-medium hover:text-brand-blue transition-colors"
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    <div className="hidden md:flex items-center gap-4">
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-1 px-3 py-1 rounded-full border border-border hover:bg-muted transition-colors"
                        >
                            <Globe size={16} />
                            <span className="uppercase text-sm font-bold">{language}</span>
                        </button>

                        {user ? (
                            <div className="flex items-center gap-3">
                                <Link href="/dashboard" className="btn-secondary py-2 px-6 text-sm">
                                    {t.nav.dashboard}
                                </Link>
                                <button onClick={() => supabase.auth.signOut()} className="p-2 hover:bg-muted rounded-full transition-colors">
                                    <LogOut size={20} />
                                </button>
                            </div>
                        ) : (
                            <Link href="/login" className="btn-primary py-2 px-6 text-sm">
                                {t.nav.login}
                            </Link>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden p-2"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>

                {/* Mobile Navigation */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-full left-0 right-0 bg-white dark:bg-slate-900 shadow-xl border-t border-border md:hidden"
                        >
                            <div className="flex flex-col p-6 gap-4">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        onClick={() => setIsMenuOpen(false)}
                                        className="text-lg font-medium"
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                                <div className="flex flex-col gap-3 py-2 text-sm text-slate-500">
                                    <div className="flex items-center gap-3">
                                        <Phone size={18} className="text-brand-blue" />
                                        <span>+216 54 15 15 15</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Mail size={18} className="text-brand-blue" />
                                        <span>Gsmguideacademy@gmail.com</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <MapPin size={18} className="text-brand-blue" />
                                        <span>Centre Makni, Menzah 9, Tunis, Tunisie</span>
                                    </div>
                                    <div className="flex flex-col gap-4 pt-4 border-t border-border mt-2">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Nos autres plateformes</p>
                                        <a href="https://shop.gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className="text-brand-blue font-bold hover:underline flex items-center gap-2 text-sm">
                                            <Globe size={14} /> Reparation Shop
                                        </a>
                                        <a href="https://gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className="text-brand-blue font-bold hover:underline flex items-center gap-2 text-sm">
                                            <Globe size={14} /> GSM Guide Repair
                                        </a>
                                    </div>
                                </div>
                                <hr className="border-border" />
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={toggleLanguage}
                                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-border"
                                    >
                                        <Globe size={20} />
                                        <span className="uppercase font-bold">{language === 'en' ? 'English' : 'Français'}</span>
                                    </button>
                                    {user ? (
                                        <button onClick={() => supabase.auth.signOut()} className="p-2">
                                            <LogOut size={24} />
                                        </button>
                                    ) : (
                                        <Link
                                            href="/login"
                                            onClick={() => setIsMenuOpen(false)}
                                            className="font-medium"
                                        >
                                            {t.nav.login}
                                        </Link>
                                    )}
                                </div>
                                <Link
                                    href={user ? "/dashboard" : "/register"}
                                    onClick={() => setIsMenuOpen(false)}
                                    className="btn-primary text-center"
                                >
                                    {user ? t.nav.dashboard : t.nav.register}
                                </Link>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </nav>
    );
};

export default Navbar;
