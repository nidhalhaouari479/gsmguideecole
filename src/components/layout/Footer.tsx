"use client";

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin, Linkedin, Music, Twitter, Globe } from 'lucide-react';

const Footer = () => {
    const { t } = useLanguage();

    return (
        <footer className="bg-slate-900 text-slate-300 pt-10 pb-6">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-10">
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-6 text-white text-2xl font-bold">
                            GSM Guide <span className="text-brand-blue">Academy</span>
                        </Link>
                        <p className="text-slate-400 mb-6">
                            {t.hero.description}
                        </p>
                        <div className="flex gap-4">
                            <a href="https://www.facebook.com/GsmGuideAcademy" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-full hover:bg-brand-blue hover:text-white transition-all">
                                <Facebook size={20} />
                            </a>
                            <a href="https://www.instagram.com/gsmguideacademy/" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-full hover:bg-brand-blue hover:text-white transition-all">
                                <Instagram size={20} />
                            </a>
                            <a href="https://www.youtube.com/@GsmGuide" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-full hover:bg-brand-blue hover:text-white transition-all">
                                <Youtube size={20} />
                            </a>
                            <a href="https://www.linkedin.com/company/gsm-guide/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-full hover:bg-brand-blue hover:text-white transition-all">
                                <Linkedin size={20} />
                            </a>
                            <a href="https://www.tiktok.com/@gsmguidetn?_r=1&_t=ZS-94SYAIjihua" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-full hover:bg-brand-blue hover:text-white transition-all">
                                <Music size={20} />
                            </a>
                            <a href="https://x.com/gsm_guide" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-800 rounded-full hover:bg-brand-blue hover:text-white transition-all">
                                <Twitter size={20} />
                            </a>
                        </div>
                    </div>

                    <div className="md:pl-8">
                        <h4 className="text-white font-bold text-lg mb-6">{t.nav.formations}</h4>
                        <ul className="space-y-4">
                            <li><Link href="/formations" className="hover:text-brand-green transition-colors">Toutes nos formations</Link></li>
                            <li><Link href="/formations" className="hover:text-brand-green transition-colors">Catalogue GSM Pack</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-lg mb-6">Liens Rapides</h4>
                        <ul className="space-y-4">
                            <li><Link href="/#about" className="hover:text-brand-green transition-colors">{t.nav.about}</Link></li>
                            <li><Link href="/#contact" className="hover:text-brand-green transition-colors">{t.nav.contact}</Link></li>
                            <li><Link href="/login" className="hover:text-brand-green transition-colors">{t.nav.login}</Link></li>
                            <li><Link href="/register" className="hover:text-brand-green transition-colors">{t.nav.register}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold text-lg mb-6">{t.nav.contact}</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <MapPin className="text-brand-green shrink-0" size={20} />
                                <span>{t.footer.address}</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="text-brand-green shrink-0" size={20} />
                                <span>+216 54 15 15 15</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="text-brand-green shrink-0" size={20} />
                                <span>Gsmguideacademy@gmail.com</span>
                            </li>
                            <li className="pt-6 space-y-3 border-t border-slate-800 mt-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Nos autres plateformes</p>
                                <a href="https://shop.gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-brand-green transition-colors">
                                    <Globe className="text-brand-green shrink-0" size={20} />
                                    <span className="font-bold underline">GSM Guide Shop</span>
                                </a>
                                <a href="https://gsm-guide.tn/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-brand-green transition-colors">
                                    <Globe className="text-brand-green shrink-0" size={20} />
                                    <span className="font-bold underline">GSM Guide Repair</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Horaires */}
                    <div className="md:pl-8">
                        <h4 className="text-white font-bold text-lg mb-6">Horaires d'école</h4>
                        <ul className="space-y-3 text-sm">
                            <li className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Lun – Jeu</span>
                                <span className="font-bold text-brand-green">09:00 – 16:00</span>
                            </li>
                            <li className="flex items-center justify-between gap-4">
                                <span className="text-slate-400">Ven – Sam</span>
                                <span className="font-bold text-brand-green">08:00 – 12:00</span>
                            </li>
                            <li className="flex items-center justify-between gap-4 border-t border-slate-800 pt-3 mt-1">
                                <span className="text-slate-400">Dimanche</span>
                                <span className="font-bold text-rose-400">Fermé</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <hr className="border-slate-800 mb-8" />

                <div className="flex flex-col md:row items-center justify-between gap-4 text-sm">
                    <p>© {new Date().getFullYear()} GSM Guide Academy. {t.footer.rights}</p>
                    <div className="flex gap-8">
                        <a href="#" className="hover:text-white transition-colors">Politique de Confidentialité</a>
                        <a href="#" className="hover:text-white transition-colors">Conditions d'Utilisation</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
