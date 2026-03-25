"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    CreditCard,
    Search,
    CheckCircle,
    XCircle,
    Clock,
    MoreVertical,
    Download,
    Loader2,
    Calendar,
    TrendingUp,
    Eye,
    Receipt,
    ShieldCheck,
    AlertCircle,
    Target,
    Activity,
    DollarSign,
    PieChart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Enrollment {
    id: string;
    user_id: string;
    status: string;
    total_price: number;
    amount_paid: number;
    receipt_url: string | null;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
        phone: string;
    };
    sessions: {
        start_date: string;
        courses: {
            title_fr: string;
            category: string;
        };
    };
    declared_amount?: number;
}

export default function PaymentsAdminPage() {
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterConfig, setFilterConfig] = useState<{
        status: 'all' | 'pending' | 'approved' | 'rejected';
        dateType: 'all' | 'year' | 'month' | 'exact';
        dateValue: string;
    }>({
        status: 'all',
        dateType: 'all',
        dateValue: ''
    });
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [confirmAmount, setConfirmAmount] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchEnrollments();
    }, []);

    const fetchEnrollments = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/payments');
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            // Parse declared amounts from URLs
            const enriched = (data || []).map((en: any) => {
                let declared: number | undefined = undefined;

                if (en.receipt_url && en.receipt_url.startsWith('[')) {
                    try {
                        const history = JSON.parse(en.receipt_url);
                        // Get amount from the latest pending entry
                        const pending = [...history].reverse().find((item: any) => item.status === 'pending');
                        if (pending) declared = Number(pending.amount);
                    } catch (e) {
                        // Ignore parse error, it might not be a JSON array
                    }
                } else if (en.receipt_url && en.receipt_url.includes('#amount=')) {
                    const amountStr = en.receipt_url.split('#amount=')[1];
                    declared = parseFloat(amountStr);
                }

                return { ...en, declared_amount: declared };
            });

            setEnrollments(enriched);
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string, amount?: number) => {
        setActionLoading(id);
        const enrollment = enrollments.find(e => e.id === id);
        
        try {
            const res = await fetch('/api/admin/payments/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    enrollmentId: id, 
                    status: newStatus, 
                    amount,
                    studentName: enrollment?.profiles?.full_name,
                    studentEmail: enrollment?.profiles?.email,
                    courseName: enrollment?.sessions?.courses?.title_fr
                })
            });
            const result = await res.json();

            if (result.error) throw new Error(result.error);

            setEnrollments(enrollments.map(en =>
                en.id === id ? { ...en, status: newStatus, amount_paid: amount !== undefined ? Number(amount) : en.amount_paid } : en
            ));
        } catch (error) {
            console.error('Update error:', error);
            alert('Erreur lors de la mise à jour.');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredEnrollments = enrollments.filter(en => {
        const matchesSearch =
            (en.profiles?.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (en.profiles?.email?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (en.sessions?.courses?.title_fr?.toLowerCase() || "").includes(searchQuery.toLowerCase());

        const matchesStatus = filterConfig.status === 'all' || en.status?.toLowerCase() === filterConfig.status?.toLowerCase();

        let matchesDate = true;
        if (filterConfig.dateType !== 'all' && filterConfig.dateValue && en.created_at) {
            const date = new Date(en.created_at);
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const fullMonth = `${year}-${month}`;
            const day = date.toISOString().split('T')[0];

            if (filterConfig.dateType === 'year') matchesDate = year === filterConfig.dateValue;
            else if (filterConfig.dateType === 'month') matchesDate = fullMonth === filterConfig.dateValue;
            else if (filterConfig.dateType === 'exact') matchesDate = day === filterConfig.dateValue;
        }

        return matchesSearch && matchesStatus && matchesDate;
    }).sort((a, b) => {
        // Sort by status: pending first
        const statusA = a.status?.toLowerCase();
        const statusB = b.status?.toLowerCase();

        if (statusA === 'pending' && statusB !== 'pending') return -1;
        if (statusA !== 'pending' && statusB === 'pending') return 1;

        // Then by date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    const stats = {
        pendingCount: enrollments.filter(e => e.status?.toLowerCase() === 'pending').length,
        pendingAmount: enrollments.filter(e => e.status?.toLowerCase() === 'pending').reduce((sum, e) => sum + (e.declared_amount || 0), 0),
        actualRevenue: filteredEnrollments.filter(e => e.status?.toLowerCase() === 'approved').reduce((sum, e) => sum + (e.amount_paid || 0), 0),
        foreseenRevenue: filteredEnrollments.filter(e => e.status?.toLowerCase() === 'approved').reduce((sum, e) => sum + (e.total_price || 0), 0),
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-brand-green" size={48} />
                <p className="text-slate-500 font-extrabold uppercase tracking-[0.4em] text-[10px] animate-pulse">Processing Ledger...</p>
            </div>
        );
    }

    const statCards = [
        { label: 'Revenu Encaissé', value: `${stats.actualRevenue.toLocaleString()} DT`, icon: TrendingUp, color: 'text-brand-green', bg: 'bg-brand-green/10' },
        { label: 'En attente Validation', value: stats.pendingCount, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { label: 'Revenu Prévisionnel', value: `${stats.foreseenRevenue.toLocaleString()} DT`, icon: PieChart, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
    ];

    const handleExportCSVList = () => {
        if (filteredEnrollments.length === 0) {
            alert("Aucune donnée à exporter.");
            return;
        }
        const headers = ["ID", "Candidat", "Email", "Session", "Statut", "Montant Payé", "Montant Total", "Date"];
        const rows = filteredEnrollments.map(en => [
            en.id,
            en.profiles?.full_name || 'N/A',
            en.profiles?.email || 'N/A',
            en.sessions?.courses?.title_fr || 'N/A',
            en.status,
            en.amount_paid,
            en.total_price,
            new Date(en.created_at).toLocaleDateString()
        ]);
        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Flux_Financiers_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    const handleExportPDFList = async () => {
        if (filteredEnrollments.length === 0) {
            alert("Aucune donnée à exporter.");
            return;
        }

        const { default: jsPDF } = await import('jspdf');
        const { default: autoTable } = await import('jspdf-autotable');

        const doc = new jsPDF({ orientation: 'landscape' });

        // Add header
        doc.setFillColor(30, 41, 59); // Slate 800
        doc.rect(0, 0, doc.internal.pageSize.getWidth(), 40, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text('RAPPORT FINANCIER GLOBAL', 20, 25);

        doc.setFontSize(10);
        doc.text(`Généré le: ${new Date().toLocaleString()}`, 20, 32);

        // Stats summary
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(20, 45, 255, 30, 'F');
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(10);
        doc.text(`Total Transactions: ${filteredEnrollments.length}`, 30, 60);
        doc.text(`Revenu Encaissé: ${stats.actualRevenue.toLocaleString()} DT`, 100, 60);
        doc.text(`Revenu Prévisionnel: ${stats.foreseenRevenue.toLocaleString()} DT`, 180, 60);

        // Table
        const tableData = filteredEnrollments.map(en => [
            en.profiles?.full_name || 'N/A',
            en.sessions?.courses?.title_fr || 'N/A',
            en.status.toUpperCase(),
            `${en.amount_paid.toLocaleString()} DT`,
            `${en.total_price.toLocaleString()} DT`,
            new Date(en.created_at).toLocaleDateString('fr-FR')
        ]);

        autoTable(doc, {
            head: [['Candidat', 'Formation', 'Statut', 'Payé', 'Total', 'Date']],
            body: tableData,
            startY: 85,
            theme: 'striped',
            headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
            styles: { fontSize: 9 }
        });

        doc.save(`Flux_Financiers_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleDownloadReceipt = async (en: Enrollment) => {
        const { default: jsPDF } = await import('jspdf');

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        // Header
        doc.setFillColor(15, 23, 42); // slate 900
        doc.rect(0, 0, pageWidth, 50, 'F');

        doc.setTextColor(161, 184, 62); // brand green
        doc.setFontSize(30);
        doc.text('RECETTE', 20, 35);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.text('GSM GUIDE ACADEMY', pageWidth - 70, 25);
        doc.text('Numéro de reçu: ' + en.id.slice(0, 8), pageWidth - 70, 32);
        doc.text('Date: ' + new Date().toLocaleDateString(), pageWidth - 70, 39);

        // Body
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(14);
        doc.text('Détails du Paiement:', 20, 70);

        doc.setFontSize(10);
        doc.text(`Étudiant: ${en.profiles?.full_name}`, 20, 85);
        doc.text(`Email: ${en.profiles?.email}`, 20, 92);
        doc.text(`Formation: ${en.sessions?.courses?.title_fr}`, 20, 99);

        // Price section
        doc.setFillColor(248, 250, 252);
        doc.rect(20, 110, pageWidth - 40, 40, 'F');

        doc.text('MONTANT RÉGLÉ', 30, 125);
        doc.setFontSize(24);
        doc.text(`${en.amount_paid.toLocaleString()} DT`, 30, 140);

        doc.setFontSize(10);
        doc.text('TOTAL DE LA FORMATION', pageWidth - 100, 125);
        doc.setFontSize(18);
        doc.text(`${en.total_price.toLocaleString()} DT`, pageWidth - 100, 140);

        doc.save(`Recu_${en.profiles?.full_name?.replace(/\s+/g, '_')}_${en.id.slice(0, 8)}.pdf`);
    };

    return (
        <div className="space-y-10 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                        <CreditCard size={14} /> Financial Intelligence
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Flux <span className="text-slate-500">Financiers</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search Ledger Entry..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all w-full md:w-80"
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className={`p-3 rounded-2xl border transition-all ${isFilterMenuOpen ? 'bg-brand-green/20 border-brand-green text-brand-green' : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'}`}
                        >
                            <CreditCard size={20} />
                        </button>

                        <AnimatePresence>
                            {isFilterMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute right-0 mt-4 w-64 bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 z-50 space-y-6"
                                    >
                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Statut Paiement</p>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { id: 'all', label: 'Global' },
                                                    { id: 'pending', label: 'Attente' },
                                                    { id: 'approved', label: 'Validé' },
                                                    { id: 'rejected', label: 'Rejeté' }
                                                ].map((s) => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => setFilterConfig(prev => ({ ...prev, status: s.id as any }))}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterConfig.status === s.id ? 'bg-brand-green text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                                    >
                                                        {s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Filtrage Temporel</p>
                                            <div className="space-y-3">
                                                <select
                                                    value={filterConfig.dateType}
                                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, dateType: e.target.value as any, dateValue: '' }))}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white focus:outline-none focus:border-brand-green/50"
                                                >
                                                    <option value="all">Toutes les dates</option>
                                                    <option value="year">Par Année</option>
                                                    <option value="month">Par Mois</option>
                                                    <option value="exact">Date Exacte</option>
                                                </select>

                                                {filterConfig.dateType === 'year' && (
                                                    <input
                                                        type="number"
                                                        placeholder="Ex: 2024"
                                                        value={filterConfig.dateValue}
                                                        onChange={(e) => setFilterConfig(prev => ({ ...prev, dateValue: e.target.value }))}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white focus:outline-none"
                                                    />
                                                )}

                                                {filterConfig.dateType === 'month' && (
                                                    <input
                                                        type="month"
                                                        value={filterConfig.dateValue}
                                                        onChange={(e) => setFilterConfig(prev => ({ ...prev, dateValue: e.target.value }))}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white focus:outline-none"
                                                    />
                                                )}

                                                {filterConfig.dateType === 'exact' && (
                                                    <input
                                                        type="date"
                                                        value={filterConfig.dateValue}
                                                        onChange={(e) => setFilterConfig(prev => ({ ...prev, dateValue: e.target.value }))}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white focus:outline-none"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                setFilterConfig({ status: 'all', dateType: 'all', dateValue: '' });
                                                setIsFilterMenuOpen(false);
                                            }}
                                            className="w-full py-2 rounded-xl bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                                        >
                                            Réinitialiser les filtres
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={handleExportCSVList}
                        className="p-3 bg-slate-900 border border-white/5 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg"
                        title="Export CSV"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={handleExportPDFList}
                        className="btn-primary py-3 px-6 h-auto shadow-none"
                    >
                        PDF REPORT
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="premium-card p-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums">{stat.value}</h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {stats.pendingCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-6"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500">
                            <Clock size={24} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white capitalize">Vérification de Flux Requise</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                {stats.pendingCount} transaction{stats.pendingCount > 1 ? 's' : ''} en attente • Total déclaré : <span className="text-amber-500 font-black">{stats.pendingAmount.toLocaleString()} DT</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setFilterConfig(prev => ({ ...prev, status: 'pending', date: '' }))}
                        className="px-6 py-2 bg-amber-500 text-black font-black text-[10px] uppercase tracking-[0.2em] rounded-xl hover:bg-amber-400 transition-all shadow-lg"
                    >
                        Filtrer les attentes
                    </button>
                </motion.div>
            )}

            <div className="premium-card overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 bg-white/[0.02]">
                    <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                        Finance Ledger Records matching: <span className="text-brand-green ml-2">{filteredEnrollments.length}</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {filterConfig.status !== 'all' || filterConfig.dateType !== 'all' ? (
                            <button
                                onClick={() => setFilterConfig({ status: 'all', dateType: 'all', dateValue: '' })}
                                className="px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                            >
                                Clear Active Filters
                            </button>
                        ) : null}
                    </div>
                </div>

                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-white/[0.01] border-b border-white/5">
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Asset / Candidat</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Acquisition Object</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Bio-Receipt</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Liquidity Value</th>
                                <th className="px-6 py-5 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Validation State</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ops</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredEnrollments.map((en, idx) => (
                                <motion.tr
                                    key={en.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="hover:bg-white/[0.02] transition-colors group"
                                >
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/5 flex items-center justify-center text-white text-sm font-black shadow-lg group-hover:border-brand-green/40 transition-all">
                                                {en.profiles?.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-black text-sm text-white">{en.profiles?.full_name}</p>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{en.profiles?.phone || 'NO_PH_REC'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-slate-200 group-hover:text-brand-green transition-colors tracking-tight">{en.sessions?.courses?.title_fr || 'UNKNOWN_MODULE'}</p>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                                <Calendar size={12} className="text-brand-green/50" />
                                                {en.sessions?.start_date ? new Date(en.sessions.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'N/D'}
                                                <span className="w-1 h-1 rounded-full bg-white/10" />
                                                {en.sessions?.courses?.category}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            {(() => {
                                                let latestUrl = en.receipt_url;
                                                if (latestUrl && latestUrl.startsWith('[')) {
                                                    try {
                                                        const history = JSON.parse(latestUrl);
                                                        if (Array.isArray(history)) {
                                                            const pending = [...history].reverse().find((item: any) => item.status === 'pending');
                                                            latestUrl = pending ? pending.url : (history.length > 0 ? history[history.length - 1].url : null);
                                                        }
                                                    } catch (e) {
                                                        // Ignore parse error
                                                    }
                                                }

                                                return latestUrl ? (
                                                    <a
                                                        href={latestUrl}
                                                        target="_blank"
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-brand-green/10 text-brand-green border border-brand-green/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-green hover:text-black transition-all"
                                                    >
                                                        <Eye size={12} /> SCAN_REC
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest flex items-center justify-center gap-1 opacity-50">
                                                        <AlertCircle size={12} /> NULL_REC
                                                    </span>
                                                );
                                            })()}
                                            {en.declared_amount && en.status?.toLowerCase() === 'pending' && (
                                                <div className="text-[10px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                                                    DÉCLARE: {en.declared_amount} DT
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right tabular-nums">
                                        <div className="flex flex-col items-end">
                                            {en.status === 'pending' && en.declared_amount ? (
                                                <>
                                                    <p className="text-sm font-black text-amber-500">+{en.declared_amount.toLocaleString()} DT</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">TRANCHE DÉCLARÉE</p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm font-black text-white">{en.amount_paid.toLocaleString()} DT</p>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TOTAL: {en.total_price.toLocaleString()} DT</p>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`status-badge ${en.status?.toLowerCase() === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                            en.status?.toLowerCase() === 'rejected' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                            }`}>
                                            {en.status?.toLowerCase() === 'approved' ? 'CLEARED' : en.status?.toLowerCase() === 'rejected' ? 'DENIED' : 'PENDING'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {en.status?.toLowerCase() === 'pending' && (
                                                <>
                                                    <div className="flex items-center gap-2 mr-2">
                                                        <input
                                                            type="number"
                                                            placeholder="Montant Tranche"
                                                            defaultValue={en.declared_amount || ''}
                                                            onChange={(e) => setConfirmAmount(prev => ({ ...prev, [en.id]: e.target.value }))}
                                                            className="w-24 bg-slate-800 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-green/50"
                                                            title="ENTRER LE MONTANT DE CETTE TRANCHE"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const validatedTranche = confirmAmount[en.id] ? parseFloat(confirmAmount[en.id]) : (Number(en.declared_amount) || 0);
                                                                const currentPaid = Number(en.amount_paid) || 0;
                                                                const newTotal = currentPaid + validatedTranche;
                                                                handleUpdateStatus(en.id, 'approved', newTotal);
                                                            }}
                                                            disabled={actionLoading === en.id}
                                                            className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 transition-all flex items-center justify-center"
                                                            title="AUTHORIZE_PAYMENT"
                                                        >
                                                            {actionLoading === en.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleUpdateStatus(en.id, 'rejected')}
                                                        disabled={actionLoading === en.id}
                                                        className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center justify-center"
                                                        title="DENY_ADMISSION"
                                                    >
                                                        {actionLoading === en.id ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => handleDownloadReceipt(en)}
                                                className="p-2.5 rounded-xl bg-brand-green/10 text-brand-green hover:bg-brand-green hover:text-black border border-brand-green/20 transition-all flex items-center justify-center"
                                                title="GENERATE_RECEIPT"
                                            >
                                                <Receipt size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredEnrollments.length === 0 && (
                    <div className="py-32 text-center">
                        <div className="flex flex-col items-center gap-4">
                            <Target size={48} className="text-slate-800" />
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">Aucun flux détecté</h3>
                            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto uppercase tracking-widest mb-4">Les paramètres actuels ne renvoient aucune transaction enregistrée.</p>
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setFilterConfig({ status: 'all', dateType: 'all', dateValue: '' });
                                }}
                                className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase text-white hover:bg-white/10"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
