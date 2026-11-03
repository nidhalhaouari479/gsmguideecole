"use client";

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Loader2, User, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const inputBase = "site-input";
const inputOk = "";
const inputErr = "border-rose-400 hover:border-rose-500 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]";
const labelClass = "site-label";
const errorClass = "mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700";

export default function ContactSection() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(false);
        setError(null);

        if (!name || !email || !isValidEmail(email) || !subject || !message) {
            setShowErrors(true);
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, subject, message })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setShowSuccess(true);
            // Reset form
            setName('');
            setEmail('');
            setSubject('');
            setMessage('');
        } catch (err: any) {
            setError(err.message || "Une erreur s'est produite lors de l'envoi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const nameErr = showErrors && !name;
    const emailErr = showErrors && (!email || !isValidEmail(email));
    const subjectErr = showErrors && !subject;
    const messageErr = showErrors && !message;

    const contactItems = [
        { icon: Phone, title: "Téléphone", value: "+216 54 15 15 15", desc: "Disponible de 9h à 18h", href: "tel:+21654151515" },
        { icon: Mail, title: "E-mail", value: "Gsmguideacademy@gmail.com", desc: "Réponse sous 24h", href: "mailto:Gsmguideacademy@gmail.com" },
        { icon: MapPin, title: "Adresse", value: "Centre Makni, Menzah 9", desc: "Tunis, Tunisie", href: "https://maps.google.com/?q=Gsm+Guide+Academy+Menzah+9+Tunis" },
    ];

    if (showSuccess) {
        return (
            <section id="contact" className="site-section scroll-mt-24 bg-site-muted">
                <div className="site-container">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="site-card mx-auto max-w-xl p-6 text-center shadow-[var(--shadow-lift)] md:p-10"
                        role="status"
                    >
                        <div className="site-icon-tile mx-auto mb-6 h-16 w-16 rounded-2xl bg-emerald-500">
                            <CheckCircle2 size={32} aria-hidden="true" />
                        </div>
                        <h2 className="site-title mb-3 text-2xl md:text-3xl">Message envoyé !</h2>
                        <p className="mb-2 font-semibold text-slate-900">
                            Merci pour votre message{name ? `, ${name.split(' ')[0]}` : ''} !
                        </p>
                        <p className="text-sm leading-relaxed text-slate-600">
                            Nous avons bien reçu votre demande. Un e-mail de confirmation vient de vous être envoyé.
                        </p>
                        <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                            <Clock size={14} aria-hidden="true" /> Nous vous rappellerons sous un délai maximum de 2 jours.
                        </p>
                        <div className="mt-8">
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="site-btn-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                            >
                                <Send size={16} aria-hidden="true" /> Envoyer un autre message
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>
        );
    }

    return (
        <section id="contact" className="site-section scroll-mt-24 bg-site-muted">
            <div className="site-container">
                <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
                    <p className="site-eyebrow mb-4">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
                        Contact
                    </p>
                    <h2 className="site-title mb-4"><span className="text-brand-blue">Contactez</span>-nous</h2>
                    <p className="site-lead">Des questions ? Nous sommes là pour vous aider à lancer votre carrière.</p>
                </div>

                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
                    {/* Form Card */}
                    <div className="site-card p-5 sm:p-6 md:p-8 lg:col-span-3">
                        {error && (
                            <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl bg-rose-50 p-4 ring-1 ring-inset ring-rose-200">
                                <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={18} aria-hidden="true" />
                                <p className="text-sm font-medium text-rose-800">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="contact-name" className={labelClass}>Nom complet <span className="text-rose-600">*</span></label>
                                    <div className="relative">
                                        <User className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${nameErr ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
                                        <input
                                            id="contact-name"
                                            type="text"
                                            autoComplete="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className={`${inputBase} pl-11 ${nameErr ? inputErr : inputOk}`}
                                            placeholder="Ahmed Ben Ali"
                                            aria-invalid={nameErr || undefined}
                                            aria-describedby={nameErr ? 'contact-name-err' : undefined}
                                            required
                                        />
                                    </div>
                                    {nameErr && <p id="contact-name-err" className={errorClass}><AlertCircle size={13} aria-hidden="true" /> Ce champ est requis</p>}
                                </div>
                                <div>
                                    <label htmlFor="contact-email" className={labelClass}>E-mail <span className="text-rose-600">*</span></label>
                                    <div className="relative">
                                        <Mail className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${emailErr ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
                                        <input
                                            id="contact-email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`${inputBase} pl-11 ${emailErr ? inputErr : inputOk}`}
                                            placeholder="ahmed@example.com"
                                            aria-invalid={emailErr || undefined}
                                            aria-describedby={emailErr ? 'contact-email-err' : undefined}
                                            required
                                        />
                                    </div>
                                    {showErrors && !email && <p id="contact-email-err" className={errorClass}><AlertCircle size={13} aria-hidden="true" /> Ce champ est requis</p>}
                                    {showErrors && email && !isValidEmail(email) && <p id="contact-email-err" className={errorClass}><AlertCircle size={13} aria-hidden="true" /> Adresse e-mail invalide</p>}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="contact-subject" className={labelClass}>Sujet <span className="text-rose-600">*</span></label>
                                <input
                                    id="contact-subject"
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className={`${inputBase} ${subjectErr ? inputErr : inputOk}`}
                                    placeholder="Demande d'information / Inscription..."
                                    aria-invalid={subjectErr || undefined}
                                    aria-describedby={subjectErr ? 'contact-subject-err' : undefined}
                                    required
                                />
                                {subjectErr && <p id="contact-subject-err" className={errorClass}><AlertCircle size={13} aria-hidden="true" /> Ce champ est requis</p>}
                            </div>

                            <div>
                                <label htmlFor="contact-message" className={labelClass}>Message <span className="text-rose-600">*</span></label>
                                <textarea
                                    id="contact-message"
                                    rows={5}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className={`${inputBase} resize-y py-3 ${messageErr ? inputErr : inputOk}`}
                                    placeholder="Dites-nous comment nous pouvons vous aider..."
                                    aria-invalid={messageErr || undefined}
                                    aria-describedby={messageErr ? 'contact-message-err' : undefined}
                                    required
                                ></textarea>
                                {messageErr && <p id="contact-message-err" className={errorClass}><AlertCircle size={13} aria-hidden="true" /> Ce champ est requis</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="site-btn-primary w-full text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} aria-hidden="true" />
                                        Envoyer le message
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Info Side */}
                    <div className="flex flex-col gap-6 lg:col-span-2">
                        <div className="relative isolate overflow-hidden rounded-2xl bg-navy-950 p-3 shadow-[var(--shadow-lift)] sm:p-4">
                            <div className="pointer-events-none absolute -top-20 -right-16 -z-10 h-56 w-56 rounded-full bg-brand-blue/40 blur-3xl" aria-hidden="true" />
                            <div className="pointer-events-none absolute -bottom-24 -left-16 -z-10 h-56 w-56 rounded-full bg-brand-green/25 blur-3xl" aria-hidden="true" />
                            <div className="grid gap-1">
                                {contactItems.map((item, i) => (
                                    <a
                                        key={item.title}
                                        href={item.href}
                                        target={item.href.startsWith('http') ? '_blank' : undefined}
                                        rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                        className="group flex min-h-[44px] items-start gap-4 rounded-xl p-3 transition-colors duration-200 hover:bg-[#ffffff0f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff]/60 sm:p-4"
                                    >
                                        <div className={`site-icon-tile ${['bg-brand-green-600', 'bg-brand-blue', 'bg-teal-500'][i % 3]}`}>
                                            <item.icon size={20} aria-hidden="true" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold uppercase tracking-wider text-[#B4C0D3]">{item.title}</div>
                                            <div className="break-words font-bold text-[#fff] transition-colors duration-200 group-hover:text-brand-green">{item.value}</div>
                                            <div className="text-sm text-[#B4C0D3]">{item.desc}</div>
                                        </div>
                                        {item.href.startsWith('http') && <ExternalLink size={16} className="ml-auto mt-1 shrink-0 text-[#B4C0D3]" aria-hidden="true" />}
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Google Maps Integration */}
                        <div className="site-card h-64 w-full overflow-hidden lg:h-auto lg:min-h-[260px] lg:flex-1">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3192.837574959774!2d10.1512780753052!3d36.84636586509678!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12fd33bd1e95da93%3A0x4bf9be9ecc20cedd!2sGsm%20Guide%20Academy!5e0!3m2!1sfr!2stn!4v1772617470401!5m2!1sfr!2stn"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen={true}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Plan d'accès GSM Guide Academy"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
