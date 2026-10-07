"use client";

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin, Linkedin, Music, Twitter, Globe, Clock } from 'lucide-react';

// NOTE: the public site renders with <html data-theme="light">, and globals.css forces
// `.text-white` / `.bg-slate-900` to light-theme colors under that attribute.
// This footer therefore uses explicit hex values for its dark surface and light text.
const socialLinks = [
    { href: 'https://www.facebook.com/GsmGuideAcademy', label: 'Facebook', icon: Facebook },
    { href: 'https://www.instagram.com/gsmguideacademy/', label: 'Instagram', icon: Instagram },
    { href: 'https://www.youtube.com/@GsmGuide', label: 'YouTube', icon: Youtube },
    { href: 'https://www.linkedin.com/company/gsm-guide/posts/?feedView=all', label: 'LinkedIn', icon: Linkedin },
    { href: 'https://www.tiktok.com/@gsmguidetn?_r=1&_t=ZS-94SYAIjihua', label: 'TikTok', icon: Music },
    { href: 'https://x.com/gsm_guide', label: 'X (Twitter)', icon: Twitter },
];

const linkClass = "inline-flex min-h-8 items-center text-[#cbd5e1] hover:text-[#fff] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green rounded";
const headingClass = "mb-4 text-sm font-bold uppercase tracking-wider text-[#fff]";

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="bg-[#0b1220] pt-14 pb-24 md:pb-8 text-sm text-[#cbd5e1]">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="sm:col-span-2 lg:col-span-1">
                        <Link href="/" className="mb-4 inline-flex text-xl font-extrabold tracking-tight text-[#fff]">
                            GSM Guide&nbsp;<span className="text-[#5ea8e6]">Academy</span>
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
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e293b] text-[#cbd5e1] transition-colors hover:bg-brand-blue hover:text-[#fff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                                >
                                    <Icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className={headingClass}>{t.nav.formations}</h4>
                        <ul className="space-y-2">
                            <li><Link href="/formations" className={linkClass}>Toutes nos formations</Link></li>
                            <li><Link href="/formations" className={linkClass}>Catalogue GSM Pack</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className={headingClass}>Liens rapides</h4>
                        <ul className="space-y-2">
                            <li><Link href="/#about" className={linkClass}>{t.nav.about}</Link></li>
                            <li><Link href="/#contact" className={linkClass}>{t.nav.contact}</Link></li>
                            <li><Link href="/login" className={linkClass}>{t.nav.login}</Link></li>
                            <li><Link href="/register" className={linkClass}>{t.nav.register}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className={headingClass}>{t.nav.contact}</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start gap-3">
                                <MapPin className="mt-0.5 shrink-0 text-brand-green" size={18} />
                                <span>{t.footer.address}</span>
                            </li>
                            <li>
                                <a href="tel:+21654151515" className="flex items-center gap-3 hover:text-[#fff] transition-colors">
                                    <Phone className="shrink-0 text-brand-green" size={18} />
                                    <span className="tabular-nums">+216 54 15 15 15</span>
                                </a>
                            </li>
                            <li>
                                <a href="mailto:Gsmguideacademy@gmail.com" className="flex items-center gap-3 hover:text-[#fff] transition-colors">
                                    <Mail className="shrink-0 text-brand-green" size={18} />
                                    <span className="break-all">Gsmguideacademy@gmail.com</span>
                                </a>
                            </li>
                            <li className="mt-4 space-y-2 border-t border-[#1e293b] pt-4">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">Nos autres plateformes</p>
                                <a href="https://shop.gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-semibold text-[#e2e8f0] hover:text-[#fff] transition-colors">
                                    <Globe className="shrink-0 text-brand-green" size={18} />
                                    <span className="underline underline-offset-4">GSM Guide Shop</span>
                                </a>
                                <a href="https://gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 font-semibold text-[#e2e8f0] hover:text-[#fff] transition-colors">
                                    <Globe className="shrink-0 text-brand-green" size={18} />
                                    <span className="underline underline-offset-4">GSM Guide Repair</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Horaires */}
                    <div>
                        <h4 className={`${headingClass} flex items-center gap-2`}>
                            <Clock size={16} className="text-brand-green" /> Horaires d&apos;école
                        </h4>
                        <ul className="space-y-2">
                            <li className="flex items-center justify-between gap-4">
                                <span className="text-[#94a3b8]">Lun – Jeu</span>
                                <span className="font-bold tabular-nums text-[#fff]">09:00 – 16:00</span>
                            </li>
                            <li className="flex items-center justify-between gap-4">
                                <span className="text-[#94a3b8]">Ven – Sam</span>
                                <span className="font-bold tabular-nums text-[#fff]">08:00 – 12:00</span>
                            </li>
                            <li className="mt-1 flex items-center justify-between gap-4 border-t border-[#1e293b] pt-2">
                                <span className="text-[#94a3b8]">Dimanche</span>
                                <span className="font-bold text-[#fda4af]">Fermé</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#1e293b] pt-6 text-center text-xs text-[#94a3b8] md:flex-row md:text-left">
                    <p>© {new Date().getFullYear()} GSM Guide Academy. {t.footer.rights}</p>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                        <a href="#" className="hover:text-[#fff] transition-colors">Politique de confidentialité</a>
                        <a href="#" className="hover:text-[#fff] transition-colors">Conditions d&apos;utilisation</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
