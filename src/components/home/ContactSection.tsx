"use client";

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Loader2, User, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

const inputBase = "w-full h-11 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2";
const inputOk = "border-slate-200 focus:border-brand-green focus:ring-brand-green/20";
const inputErr = "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20";
const labelClass = "mb-1.5 block text-sm font-semibold text-slate-900";
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
            <section id="contact" className="scroll-mt-24 bg-slate-50 py-16 md:py-24">
                <div className="container mx-auto px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-10"
                        role="status"
                    >
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                            <CheckCircle2 size={36} className="text-emerald-600" />
                        </div>
                        <h2 className="mb-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Message envoyé !</h2>
                        <p className="mb-2 font-semibold text-slate-900">
                            Merci pour votre message{name ? `, ${name.split(' ')[0]}` : ''} !
                        </p>
                        <p className="text-sm leading-relaxed text-slate-600">
                            Nous avons bien reçu votre demande. Un e-mail de confirmation vient de vous être envoyé.
                        </p>
                        <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                            <Clock size={14} /> Nous vous rappellerons sous un délai maximum de 2 jours.
                        </p>
                        <div className="mt-8">
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                            >
                                <Send size={16} /> Envoyer un autre message
                            </button>
                        </div>
                    </motion.div>
                </div>
            </section>
        );
    }

    return (
        <section id="contact" className="scroll-mt-24 bg-slate-50 py-16 md:py-24">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-blue">Contact</p>
                    <h2 className="mb-3 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Contactez-nous</h2>
                    <p className="text-base text-slate-600">Des questions ? Nous sommes là pour vous aider à lancer votre carrière.</p>
                </div>

                <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
                    {/* Form Card */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8">
                        {error && (
                            <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                                <AlertCircle className="mt-0.5 shrink-0 text-rose-600" size={18} />
                                <p className="text-sm font-medium text-rose-800">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="contact-name" className={labelClass}>Nom complet <span className="text-rose-600">*</span></label>
                                    <div className="relative">
                                        <User className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${nameErr ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                        <input
                                            id="contact-name"
                                            type="text"
                                            autoComplete="name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className={`${inputBase} pl-11 pr-3 ${nameErr ? inputErr : inputOk}`}
                                            placeholder="Ahmed Ben Ali"
                                            aria-invalid={nameErr || undefined}
                                            aria-describedby={nameErr ? 'contact-name-err' : undefined}
                                            required
                                        />
                                    </div>
                                    {nameErr && <p id="contact-name-err" className={errorClass}><AlertCircle size={13} /> Ce champ est requis</p>}
                                </div>
                                <div>
                                    <label htmlFor="contact-email" className={labelClass}>E-mail <span className="text-rose-600">*</span></label>
                                    <div className="relative">
                                        <Mail className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${emailErr ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                        <input
                                            id="contact-email"
                                            type="email"
                                            autoComplete="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`${inputBase} pl-11 pr-3 ${emailErr ? inputErr : inputOk}`}
                                            placeholder="ahmed@example.com"
                                            aria-invalid={emailErr || undefined}
                                            aria-describedby={emailErr ? 'contact-email-err' : undefined}
                                            required
                                        />
                                    </div>
                                    {showErrors && !email && <p id="contact-email-err" className={errorClass}><AlertCircle size={13} /> Ce champ est requis</p>}
                                    {showErrors && email && !isValidEmail(email) && <p id="contact-email-err" className={errorClass}><AlertCircle size={13} /> Adresse e-mail invalide</p>}
                                </div>
                            </div>

                            <div>
                                <label htmlFor="contact-subject" className={labelClass}>Sujet <span className="text-rose-600">*</span></label>
                                <input
                                    id="contact-subject"
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className={`${inputBase} px-3.5 ${subjectErr ? inputErr : inputOk}`}
                                    placeholder="Demande d'information / Inscription..."
                                    aria-invalid={subjectErr || undefined}
                                    aria-describedby={subjectErr ? 'contact-subject-err' : undefined}
                                    required
                                />
                                {subjectErr && <p id="contact-subject-err" className={errorClass}><AlertCircle size={13} /> Ce champ est requis</p>}
                            </div>

                            <div>
                                <label htmlFor="contact-message" className={labelClass}>Message <span className="text-rose-600">*</span></label>
                                <textarea
                                    id="contact-message"
                                    rows={5}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className={`${inputBase} h-auto resize-y px-3.5 py-3 ${messageErr ? inputErr : inputOk}`}
                                    placeholder="Dites-nous comment nous pouvons vous aider..."
                                    aria-invalid={messageErr || undefined}
                                    aria-describedby={messageErr ? 'contact-message-err' : undefined}
                                    required
                                ></textarea>
                                {messageErr && <p id="contact-message-err" className={errorClass}><AlertCircle size={13} /> Ce champ est requis</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green text-base font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    <>
                                        <Send size={18} />
                                        Envoyer le message
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Info Side */}
                    <div className="flex flex-col gap-6">
                        <div className="grid gap-3">
                            {contactItems.map((item) => (
                                <a
                                    key={item.title}
                                    href={item.href}
                                    target={item.href.startsWith('http') ? '_blank' : undefined}
                                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                    className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-blue/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue md:p-5"
                                >
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                                        <item.icon size={20} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{item.title}</div>
                                        <div className="break-words font-bold text-slate-900 transition-colors group-hover:text-brand-blue">{item.value}</div>
                                        <div className="text-sm text-slate-600">{item.desc}</div>
                                    </div>
                                    {item.href.startsWith('http') && <ExternalLink size={16} className="ml-auto mt-1 shrink-0 text-slate-400" />}
                                </a>
                            ))}
                        </div>

                        {/* Google Maps Integration */}
                        <div className="h-64 w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm lg:h-auto lg:flex-1 lg:min-h-[260px]">
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
