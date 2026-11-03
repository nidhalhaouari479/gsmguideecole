"use client";

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin, Linkedin, Music, Twitter, Globe, Clock, ArrowRight } from 'lucide-react';

// NOTE: the public site renders with <html data-theme="light">, and globals.css darkens some
// slate text colours under that attribute. This footer therefore uses explicit hex values
// for its dark surface and light text.
const socialLinks = [
    { href: 'https://www.facebook.com/GsmGuideAcademy', label: 'Facebook', icon: Facebook },
    { href: 'https://www.instagram.com/gsmguideacademy/', label: 'Instagram', icon: Instagram },
    { href: 'https://www.youtube.com/@GsmGuide', label: 'YouTube', icon: Youtube },
    { href: 'https://www.linkedin.com/company/gsm-guide/posts/?feedView=all', label: 'LinkedIn', icon: Linkedin },
    { href: 'https://www.tiktok.com/@gsmguidetn?_r=1&_t=ZS-94SYAIjihua', label: 'TikTok', icon: Music },
    { href: 'https://x.com/gsm_guide', label: 'X (Twitter)', icon: Twitter },
];

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950';
const linkClass = `inline-flex min-h-8 items-center gap-1.5 rounded text-[#B4C0D3] transition-colors hover:text-[#fff] ${focusRing}`;
const headingClass = "mb-4 text-[12px] font-bold uppercase tracking-[0.08em] text-[#fff]";
const iconTile = "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-brand-green ring-1 ring-inset ring-white/10";

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="relative overflow-hidden bg-navy-950 pb-24 text-sm text-[#B4C0D3] md:pb-8">
            <span aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-blue/25 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-brand-green/15 blur-3xl" />

            <div className="site-container relative">
                {/* Call to action */}
                <div className="flex flex-col items-start justify-between gap-6 border-b border-white/10 py-12 md:flex-row md:items-center">
                    <div className="max-w-xl">
                        <p className="text-2xl font-extrabold tracking-tight text-[#fff] md:text-3xl">Prêt à lancer votre carrière ?</p>
                        <p className="mt-2 text-[15px] text-[#B4C0D3]">{t.hero.description}</p>
                    </div>
                    <Link href="/formations" className={`site-btn-primary group shrink-0 ${focusRing}`}>
                        {t.hero.cta}
                        <ArrowRight size={18} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-12">
                    {/* Brand */}
                    <div className="sm:col-span-2 lg:col-span-4">
                        <Link href="/" className={`mb-5 inline-flex items-center gap-3 rounded-xl ${focusRing}`} aria-label="GSM Guide Academy - Accueil">
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-[var(--shadow-lift)]">
                                <img src="/gsmlogo.png" alt="" className="h-9 w-9 object-contain" />
                            </span>
                            <span className="leading-none">
                                <span className="block text-[18px] font-extrabold tracking-tight text-[#fff]">GSM GUIDE</span>
                                <span className="mt-1 block text-[11px] font-bold tracking-[0.14em] text-brand-green">ACADEMY</span>
                            </span>
                        </Link>
                        <p className="mb-6 max-w-sm leading-relaxed text-[#94a3b8]">
                            {t.hero.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {socialLinks.map(({ href, label, icon: Icon }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={label}
                                    title={label}
                                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-[#cbd5e1] ring-1 ring-inset ring-white/10 transition-colors hover:bg-brand-green-600 hover:text-[#fff] hover:ring-transparent ${focusRing}`}
                                >
                                    <Icon size={18} aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <h4 className={headingClass}>{t.nav.formations}</h4>
                        <ul className="space-y-2">
                            <li><Link href="/formations" className={linkClass}>Toutes nos formations</Link></li>
                            <li><Link href="/formations" className={linkClass}>Catalogue GSM Pack</Link></li>
                        </ul>

                        <h4 className={`${headingClass} mt-8`}>Liens rapides</h4>
                        <ul className="space-y-2">
                            <li><Link href="/#about" className={linkClass}>{t.nav.about}</Link></li>
                            <li><Link href="/#contact" className={linkClass}>{t.nav.contact}</Link></li>
                            <li><Link href="/login" className={linkClass}>{t.nav.login}</Link></li>
                            <li><Link href="/register" className={linkClass}>{t.nav.register}</Link></li>
                        </ul>
                    </div>

                    <div className="lg:col-span-3">
                        <h4 className={headingClass}>{t.nav.contact}</h4>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3">
                                <span className={iconTile}><MapPin size={16} aria-hidden="true" /></span>
                                <span>{t.footer.address}</span>
                            </li>
                            <li>
                                <a href="tel:+21654151515" className={`flex items-center gap-3 rounded-lg transition-colors hover:text-[#fff] ${focusRing}`}>
                                    <span className={iconTile}><Phone size={16} aria-hidden="true" /></span>
                                    <span className="tabular-nums">+216 54 15 15 15</span>
                                </a>
                            </li>
                            <li>
                                <a href="mailto:Gsmguideacademy@gmail.com" className={`flex items-center gap-3 rounded-lg transition-colors hover:text-[#fff] ${focusRing}`}>
                                    <span className={iconTile}><Mail size={16} aria-hidden="true" /></span>
                                    <span className="break-all">Gsmguideacademy@gmail.com</span>
                                </a>
                            </li>
                        </ul>
                        <div className="mt-6 space-y-2 border-t border-white/10 pt-5">
                            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#94a3b8]">Nos autres plateformes</p>
                            <a href="https://shop.gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className={`flex min-h-9 items-center gap-2.5 rounded font-semibold text-[#e2e8f0] transition-colors hover:text-[#fff] ${focusRing}`}>
                                <Globe className="shrink-0 text-brand-green" size={16} aria-hidden="true" />
                                <span className="underline decoration-white/30 underline-offset-4">GSM Guide Shop</span>
                            </a>
                            <a href="https://gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className={`flex min-h-9 items-center gap-2.5 rounded font-semibold text-[#e2e8f0] transition-colors hover:text-[#fff] ${focusRing}`}>
                                <Globe className="shrink-0 text-brand-green" size={16} aria-hidden="true" />
                                <span className="underline decoration-white/30 underline-offset-4">GSM Guide Repair</span>
                            </a>
                        </div>
                    </div>

                    {/* Horaires */}
                    <div className="lg:col-span-3">
                        <h4 className={`${headingClass} flex items-center gap-2`}>
                            <Clock size={15} className="text-brand-green" aria-hidden="true" /> Horaires d&apos;école
                        </h4>
                        <ul className="divide-y divide-white/10 rounded-2xl bg-white/[0.04] px-4 ring-1 ring-inset ring-white/10">
                            <li className="flex items-center justify-between gap-4 py-3">
                                <span className="text-[#94a3b8]">Lun – Jeu</span>
                                <span className="font-bold tabular-nums text-[#fff]">09:00 – 16:00</span>
                            </li>
                            <li className="flex items-center justify-between gap-4 py-3">
                                <span className="text-[#94a3b8]">Ven – Sam</span>
                                <span className="font-bold tabular-nums text-[#fff]">08:00 – 12:00</span>
                            </li>
                            <li className="flex items-center justify-between gap-4 py-3">
                                <span className="text-[#94a3b8]">Dimanche</span>
                                <span className="rounded-full bg-rose-500/15 px-2.5 py-0.5 text-xs font-bold text-[#fda4af]">Fermé</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-6 text-center text-xs text-[#94a3b8] md:flex-row md:text-left">
                    <p>© {new Date().getFullYear()} GSM Guide Academy. {t.footer.rights}</p>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                        <a href="#" className={`rounded transition-colors hover:text-[#fff] ${focusRing}`}>Politique de confidentialité</a>
                        <a href="#" className={`rounded transition-colors hover:text-[#fff] ${focusRing}`}>Conditions d&apos;utilisation</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
