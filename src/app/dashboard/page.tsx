"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import {
    User,
    BookOpen,
    CreditCard,
    Calendar as CalendarIcon,
    Upload,
    CheckCircle,
    Clock,
    AlertCircle,
    ChevronRight,
    Eye,
    History,
    X,
    Download,
    ExternalLink,
    Loader2,
    LogOut,
    Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
    const [trancheFile, setTrancheFile] = useState<File | null>(null);
    const [trancheAmount, setTrancheAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [historyModalEnrollment, setHistoryModalEnrollment] = useState<any | null>(null);
    const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            setUser(session.user);

            // Fetch real enrollments from Supabase
            const { data, error } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    status,
                    total_price,
                    amount_paid,
                    receipt_url,
                    created_at,
                    sessions (
                        start_date,
                        end_date,
                        schedule,
                        courses (
                            title_fr,
                            title_en,
                            category
                        )
                    )
                `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching enrollments:', error);
            } else if (data) {
                const formatted = data.map((en: any) => {
                    let history = [];
                    try {
                        if (en.receipt_url && en.receipt_url.startsWith('[')) {
                            history = JSON.parse(en.receipt_url);
                        }
                    } catch (e) { }

                    // Calculate accurate paid amount from history (only approved ones)
                    const confirmedPaid = history.length > 0
                        ? history.filter((h: any) => h.status === 'approved').reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0)
                        : en.amount_paid;

                    return {
                        id: en.id,
                        course_name: en.sessions?.courses?.title_fr || 'Formation',
                        category: en.sessions?.courses?.category || '',
                        status: en.status === 'approved' ? 'Approuvé' : en.status === 'rejected' ? 'Rejeté' : 'En attente',
                        status_raw: en.status,
                        total_price: en.total_price,
                        paid: confirmedPaid,
                        remaining: en.total_price - confirmedPaid,
                        schedule_raw: en.sessions?.schedule ? JSON.parse(en.sessions.schedule) : null,
                        schedule_text: en.sessions
                            ? `${new Date(en.sessions.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${new Date(en.sessions.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
                            : 'À définir',
                        receipt_url: en.receipt_url,
                        receipt_status: en.receipt_url ? 'Reçu soumis' : 'En attente de paiement',
                        created_at: en.created_at
                    };
                });
                setEnrollments(formatted);
            }

            setLoading(false);
        };

        checkUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setTrancheFile(e.target.files[0]);
            setUploadError(null);
        }
    };

    const handleTrancheSubmit = async (enrollmentId: string) => {
        if (!trancheFile || !user) {
            setUploadError("Veuillez sélectionner un fichier.");
            return;
        }

        setIsSubmitting(true);
        setUploadError(null);
        setUploadSuccess(null);

        try {
            // 1. Upload receipt
            const fileExt = trancheFile.name.split('.').pop();
            const fileName = `${user.id}_tranche_${Date.now()}.${fileExt}`;
            const filePath = `receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, trancheFile);

            if (uploadError) throw new Error("Erreur upload: " + uploadError.message);

            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);

            const finalUrl = `${publicUrl}#amount=${trancheAmount}`;

            // 2. Update enrollment via secure API (to bypass RLS)
            const response = await fetch('/api/enrollments/tranche', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enrollmentId,
                    receiptUrl: finalUrl,
                    amount: parseInt(trancheAmount) || 0,
                    studentName: user.user_metadata?.full_name || user.email || 'Étudiant',
                    studentEmail: user.email || '',
                    courseName: enrollments.find((e: any) => e.id === enrollmentId)?.course_name || 'Formation'
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setUploadSuccess("Reçu téléchargé avec succès ! En attente de validation.");
            setActiveUploadId(null);
            setTrancheFile(null);
            setTrancheAmount('');

            // 3. Refresh enrollments
            // This is a simple way to refresh the list
            window.location.reload();
        } catch (err: any) {
            setUploadError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
            </div>
        );
    }

    return (
        <div className="pb-24 bg-slate-50 dark:bg-slate-950 min-h-screen">
            <div className="bg-white dark:bg-slate-900 border-b border-border pt-24 pb-12">
                <div className="container mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 rounded-2xl bg-brand-blue flex items-center justify-center text-3xl font-black text-white shadow-lg shadow-brand-blue/20">
                                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold mb-1 text-slate-900 dark:text-white">
                                    {user?.user_metadata?.full_name || "Student"}
                                </h1>
                                <p className="text-slate-500">{user?.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors font-bold text-sm text-slate-600 dark:text-slate-300 border border-border">
                                <LogOut size={18} /> {t.nav.logout}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 mt-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Dashboard Area */}
                    <div className="lg:col-span-2 space-y-8">
                        <section>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                <BookOpen className="text-brand-blue" /> Mes inscriptions

                            </h2>
                            <div className="space-y-6">
                                {enrollments.length === 0 ? (
                                    <div className="premium-card p-12 bg-white text-center">
                                        <BookOpen size={40} className="mx-auto text-slate-200 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-700 mb-2">Aucune formation inscrite</h3>
                                        <p className="text-slate-400 text-sm mb-6">Vous n'êtes pas encore inscrit à une formation.</p>
                                        <Link href="/formations" className="btn-primary px-6 py-2 text-sm inline-flex items-center gap-2">
                                            Voir les formations <ChevronRight size={16} />
                                        </Link>
                                    </div>
                                ) : (
                                    enrollments.map((en) => (
                                        <motion.div
                                            key={en.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="premium-card p-8 bg-white"
                                        >
                                            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4">
                                                <div>
                                                    <h3 className="text-xl font-bold mb-2">{en.course_name}</h3>
                                                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                                                        <CalendarIcon size={16} /> {en.schedule_text}
                                                    </div>
                                                </div>
                                                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold w-fit ${en.status_raw === 'approved' ? 'bg-green-100 text-green-700' :
                                                    en.status_raw === 'rejected' ? 'bg-red-100 text-red-600' :
                                                        'bg-brand-blue/10 text-brand-blue'
                                                    }`}>
                                                    {en.status_raw === 'approved' ? <CheckCircle size={16} /> : <Clock size={16} />}
                                                    {en.status}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8 p-6 bg-slate-50 rounded-2xl">
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Prix total</p>
                                                    <p className="font-bold text-lg">{en.total_price} DT</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Montant payé</p>
                                                    <p className="font-bold text-lg text-brand-green">{en.paid} DT</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Restant</p>
                                                    <p className="font-bold text-lg text-red-600">{en.remaining} DT</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Reçu</p>
                                                    <p className="font-bold text-sm">{en.receipt_status}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-border pt-8">
                                                <div className="flex-1 w-full">
                                                    {activeUploadId === en.id ? (
                                                        <div className="bg-slate-50 dark:bg-slate-900 border border-brand-blue/20 rounded-2xl p-6 space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h4 className="font-bold text-sm">Payer une autre tranche</h4>
                                                                <button
                                                                    onClick={() => setActiveUploadId(null)}
                                                                    className="text-xs text-slate-500 hover:text-red-500 font-bold"
                                                                >
                                                                    Annuler
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-col md:flex-row gap-4">
                                                                <div className="flex-1 space-y-4">
                                                                    <div className="relative">
                                                                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                                        <input
                                                                            type="number"
                                                                            placeholder="Montant payé (DT)"
                                                                            value={trancheAmount}
                                                                            onChange={(e) => setTrancheAmount(e.target.value)}
                                                                            className="w-full bg-white dark:bg-slate-800 border border-border rounded-xl py-3 pl-12 pr-4 text-sm focus:border-brand-blue transition-all outline-none font-bold"
                                                                        />
                                                                    </div>
                                                                    <div className="relative">
                                                                        <div className={`border-2 border-dashed rounded-xl p-3 transition-all ${trancheFile ? 'border-brand-green bg-brand-green/5' : 'border-border bg-white dark:bg-slate-800'}`}>
                                                                            <input
                                                                                type="file"
                                                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                                                onChange={handleFileChange}
                                                                                accept="image/*,.pdf"
                                                                            />
                                                                            <div className="flex items-center gap-3">
                                                                                <Upload size={18} className="text-slate-400" />
                                                                                <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                                                                                    {trancheFile ? trancheFile.name : "Cliquez pour uploader le reçu"}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleTrancheSubmit(en.id)}
                                                                    disabled={isSubmitting || !trancheFile || !trancheAmount}
                                                                    className="btn-primary py-3 px-8 text-sm flex items-center justify-center gap-2 whitespace-nowrap self-end"
                                                                >
                                                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                                    Soumettre le reçu
                                                                </button>
                                                            </div>
                                                            {uploadError && (
                                                                <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                                                                    <AlertCircle size={14} /> {uploadError}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap items-center gap-3 w-full">
                                                            {en.remaining > 0 && en.status_raw !== 'pending' && (
                                                                <button
                                                                    onClick={() => setActiveUploadId(en.id)}
                                                                    className="btn-primary py-2.5 px-6 text-sm flex items-center justify-center gap-2 min-w-[180px]"
                                                                >
                                                                    <CreditCard size={18} /> Payer une tranche
                                                                </button>
                                                            )}
                                                            {en.status_raw === 'pending' && (
                                                                <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-xs font-bold animate-pulse">
                                                                    <Clock size={16} /> Tranche en cours de vérification
                                                                </div>
                                                            )}
                                                            {en.schedule_raw && (
                                                                <button
                                                                    onClick={() => setSelectedSchedule({ name: en.course_name, ...en.schedule_raw })}
                                                                    className="px-6 py-2.5 rounded-xl border border-brand-green/30 text-brand-green font-bold text-sm bg-brand-green/5 hover:bg-brand-green/10 transition-all flex items-center justify-center gap-2 min-w-[180px]"
                                                                >
                                                                    <CalendarIcon size={18} /> Voir calendrier
                                                                </button>
                                                            )}
                                                            {en.receipt_url && (
                                                                <button
                                                                    onClick={() => setHistoryModalEnrollment(en)}
                                                                    className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 min-w-[180px]"
                                                                >
                                                                    <History size={18} /> Voir historique
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar Area */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="premium-card p-8 bg-brand-blue text-white">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <CreditCard /> Informations de paiement

                            </h3>
                            <p className="text-slate-100 text-sm mb-6 leading-relaxed">
                                Pour confirmer votre réservation, veuillez transférer l'acompte sur notre compte bancaire et télécharger le reçu.
                            </p>
                            <div className="space-y-4 p-4 bg-white/10 rounded-xl mb-6">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-200">Nom de la banque</p>
                                    <p className="font-bold">BANQUE DE TUNISIE</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-200">Numéro de compte (RIB)</p>
                                    <p className="font-bold tracking-wider">05 206 0000513003641 83</p>
                                </div>
                            </div>

                        </div>

                        <div className="premium-card p-8 bg-white">
                            <h3 className="text-xl font-bold mb-6">Liens rapides</h3>
                            <ul className="space-y-4">
                                <li>
                                    <Link href="/formations" className="flex items-center justify-between group">
                                        <span className="font-medium group-hover:text-brand-blue transition-colors">Parcourir plus de cours</span>
                                        <LinkIcon size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/#contact" className="flex items-center justify-between group">
                                        <span className="font-medium group-hover:text-brand-blue transition-colors">Centre d'assistance</span>
                                        <LinkIcon size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>

            {/* History Modal */}
            <AnimatePresence>
                {historyModalEnrollment && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Historique de Paiement</h3>
                                    <p className="text-xs text-slate-500 font-medium">Formation: {historyModalEnrollment.course_name}</p>
                                </div>
                                <button
                                    onClick={() => setHistoryModalEnrollment(null)}
                                    className="p-2 hover:bg-slate-200 rounded-xl transition-colors"
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            <div className="p-6 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Montant</th>
                                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Statut</th>
                                            <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Reçu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(() => {
                                            let history = [];
                                            const raw = historyModalEnrollment.receipt_url;
                                            if (raw && raw.startsWith('[')) {
                                                try { history = JSON.parse(raw); } catch (e) { history = []; }
                                            } else if (raw) {
                                                history = [{
                                                    url: raw,
                                                    amount: Number(historyModalEnrollment.paid) || 0,
                                                    date: historyModalEnrollment.created_at,
                                                    status: historyModalEnrollment.status_raw || 'approved'
                                                }];
                                            }

                                            return history.map((item: any, idx: number) => (
                                                <tr key={idx} className="group hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 text-sm font-medium text-slate-600">
                                                        {new Date(item.date).toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="py-4 text-sm font-bold text-slate-900">
                                                        {Number(item.amount || 0).toLocaleString()} DT
                                                    </td>
                                                    <td className="py-4">
                                                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${item.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                            item.status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                'bg-rose-50 text-rose-600 border border-rose-100'
                                                            }`}>
                                                            {item.status === 'approved' ? 'Validé' : item.status === 'pending' ? 'En attente' : 'Rejeté'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <a
                                                            href={item.url}
                                                            target="_blank"
                                                            className="inline-flex items-center gap-1 text-brand-blue hover:underline text-xs font-bold"
                                                        >
                                                            <ExternalLink size={14} /> Voir
                                                        </a>
                                                    </td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>

                                <div className="mt-8 p-4 bg-slate-900 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-brand-green/20 flex items-center justify-center text-brand-green">
                                            <CreditCard size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Payé</p>
                                            <p className="text-lg font-black text-white">{(historyModalEnrollment.paid || 0).toLocaleString()} DT</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Reste à payer</p>
                                        <p className="text-lg font-black text-amber-500">{((historyModalEnrollment.total_price || 0) - (historyModalEnrollment.paid || 0)).toLocaleString()} DT</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Session Calendar Modal */}
            <AnimatePresence>
                {selectedSchedule && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/5"
                        >
                            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Calendrier de Session</h3>
                                    <p className="text-xs text-slate-500 font-medium">{selectedSchedule.name}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedSchedule(null)}
                                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                    <X size={20} className="text-slate-500" />
                                </button>
                            </div>

                            <div className="p-6 max-h-[60vh] overflow-y-auto">
                                <div className="space-y-4">
                                    {selectedSchedule.seances && selectedSchedule.seances.length > 0 ? (
                                        selectedSchedule.seances.map((se: any, idx: number) => {
                                            const seDate = new Date(se.date);
                                            const isPast = seDate < new Date();
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${isPast
                                                        ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-white/5 opacity-60'
                                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 shadow-sm hover:shadow-md'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center font-bold ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-brand-blue/10 text-brand-blue'
                                                            }`}>
                                                            <span className="text-[10px] uppercase leading-none mb-1">
                                                                {seDate.toLocaleDateString('fr-FR', { month: 'short' })}
                                                            </span>
                                                            <span className="text-lg leading-none">
                                                                {seDate.getDate()}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900 dark:text-white">
                                                                {seDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
                                                            </p>
                                                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                                                <Clock size={12} /> {se.start_time} - {se.end_time || (parseInt(se.start_time.split(':')[0]) + 4) + ':' + se.start_time.split(':')[1]}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {!isPast && (
                                                        <div className="px-3 py-1 bg-brand-green/10 text-brand-green text-[10px] font-black uppercase tracking-widest rounded-full">
                                                            À Venir
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-12 text-center">
                                            <CalendarIcon size={40} className="mx-auto text-slate-200 mb-4" />
                                            <p className="text-slate-500 text-sm">Aucun calendrier détaillé disponible.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-white/5 flex items-center gap-3">
                                <AlertCircle size={18} className="text-brand-blue shrink-0" />
                                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                    Veuillez noter que le calendrier peut être sujet à des modifications mineures. Consultez régulièrement votre boîte mail.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
