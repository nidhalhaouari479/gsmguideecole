"use client";

import React, { useEffect, useState } from 'react';
import {
    Users,
    Search,
    Filter,
    MoreVertical,
    Mail,
    Phone,
    BookOpen,
    CreditCard,
    ChevronRight,
    Loader2,
    ArrowUpDown,
    Download,
    X,
    UserCheck,
    UserX,
    ShieldAlert,
    Calendar,
    GraduationCap,
    Clock,
    CheckCircle2,
    FileDown,
    Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentData {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    is_blocked: boolean;
    enrollment_count: number;
    total_paid: number;
    total_remaining: number;
    last_enrollment: string | null;
    age: number | null;
    source: string | null;
    gender: string | null;
    cin_number: string | null;
    created_at: string;
}

interface StudentEnrollment {
    id: string;
    session_id: string;
    status: string;
    amount_paid: number;
    total_price: number;
    remaining: number;
    enrolled_at: string;
    payment_date: string | null;
    session: {
        id: string;
        start_date: string;
        end_date: string;
        schedule: any;
    } | null;
    course: {
        id: string;
        title: string;
        category: string;
        level: string;
        base_price: number;
        duration: number;
        instructor_name: string;
        image_url: string | null;
    } | null;
}

interface StudentFullProfile extends StudentData {
    enrollments: StudentEnrollment[];
    total_price: number;
}

export default function StudentsAdminPage() {
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof StudentData; direction: 'asc' | 'desc' } | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filter State
    const [filterConfig, setFilterConfig] = useState<{
        status: 'all' | 'blocked' | 'active';
        payment: 'all' | 'debt' | 'paid';
        activity: 'all' | 'enrolled' | 'none';
        dateType: 'all' | 'year' | 'month' | 'exact';
        dateValue: string;
    }>({
        status: 'all',
        payment: 'all',
        activity: 'all',
        dateType: 'all',
        dateValue: ''
    });
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);

    // Profile Modal State
    const [selectedProfile, setSelectedProfile] = useState<StudentFullProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/students');
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setStudents(data);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudentProfile = async (id: string) => {
        setProfileLoading(true);
        setIsProfileModalOpen(true);
        try {
            const response = await fetch(`/api/admin/students/${id}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setSelectedProfile(data);
        } catch (error) {
            console.error('Error fetching student profile:', error);
            alert('Impossible de charger le profil complet.');
            setIsProfileModalOpen(false);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleDownloadPDF = async () => {
        if (!selectedProfile) {
            alert("Aucun profil sélectionné.");
            return;
        }

        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();

            // --- HEADER ---
            doc.setFillColor(15, 23, 42); // slate-900 code
            doc.rect(0, 0, pageWidth, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('GSM GUIDE ACADEMY', 14, 25);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('FACTURE / REÇU D\'INSCRIPTION', pageWidth - 14, 25, { align: 'right' });

            // --- STUDENT INFO ---
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Informations de l\'Étudiant', 14, 55);

            doc.setDrawColor(200, 200, 200);
            doc.line(14, 58, pageWidth - 14, 58);

            doc.setFontSize(10);
            const fullNameLine = `Nom Complet : ${selectedProfile.full_name?.replace(/^(M|Mme)\s+/i, '') || 'N/A'}`;
            const cinLine = `CIN : ${selectedProfile.cin_number || 'N/A'}`;
            const emailLine = `Email : ${selectedProfile.email}`;
            const phoneLine = `Téléphone : ${selectedProfile.phone || 'N/A'}`;

            doc.setFont('helvetica', 'normal');
            doc.text(fullNameLine, 14, 68);
            doc.text(cinLine, 14, 75);
            doc.text(emailLine, pageWidth / 2, 68);
            doc.text(phoneLine, pageWidth / 2, 75);

            doc.text(`Identifiant (ID) : ${selectedProfile.id}`, 14, 85);
            doc.text(`Date d'édition : ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 85, { align: 'right' });

            // --- FINANCIAL SUMMARY ---
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Bilan Financier', 14, 105);
            doc.line(14, 108, pageWidth - 14, 108);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text(`Total des Formations : ${selectedProfile.total_price} DT`, 14, 118);

            doc.setTextColor(16, 185, 129); // emerald-500
            doc.text(`Total Payé : ${selectedProfile.total_paid} DT`, 14, 125);

            doc.setTextColor(239, 68, 68); // rose-500
            doc.text(`Reste à Payer (Créances) : ${selectedProfile.total_remaining} DT`, 14, 132);
            doc.setTextColor(0, 0, 0);

            // --- ENROLLMENTS TABLE ---
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Détail des Inscriptions', 14, 150);

            if (selectedProfile.enrollments && selectedProfile.enrollments.length > 0) {
                const tableColumn = ["Formation", "Statut", "Prix Total", "Payé", "Reste", "Dates de Session"];
                const tableRows = selectedProfile.enrollments.map(e => [
                    e.course?.title || 'Formation inconnue',
                    e.status,
                    `${e.total_price} DT`,
                    `${e.amount_paid} DT`,
                    `${e.remaining} DT`,
                    `${e.session?.start_date ? new Date(e.session.start_date).toLocaleDateString('fr-FR') : '-'} au ${e.session?.end_date ? new Date(e.session.end_date).toLocaleDateString('fr-FR') : '-'}`
                ]);

                autoTable(doc, {
                    startY: 155,
                    head: [tableColumn],
                    body: tableRows,
                    theme: 'striped',
                    headStyles: { fillColor: [15, 23, 42] },
                    styles: { fontSize: 9 },
                });
            } else {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text("Aucune inscription pour cet étudiant.", 14, 160);
            }

            // --- FOOTER ---
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Ce document est généré automatiquement et sert de justificatif.', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }

            doc.save(`Facture_Etudiant_${selectedProfile.full_name?.replace(/\s+/g, '_') || 'inconnu'}.pdf`);
        } catch (error: any) {
            console.error('Error generating PDF:', error);
            alert(`Erreur lors de la génération du PDF: ${error.message || error}`);
        }
    };

    const handleAction = async (userId: string, action: 'block' | 'unblock' | 'delete') => {
        if (action === 'delete' && !deleteConfirmId) {
            setDeleteConfirmId(userId);
            return;
        }

        setActionLoading(userId);
        try {
            const response = await fetch('/api/admin/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action })
            });
            const data = await response.json();
            if (data.error) {
                alert(data.error);
            } else {
                await fetchStudents();
                setActiveDropdown(null);
            }
        } catch (error) {
            console.error('Action error:', error);
            alert('Une erreur est survenue lors de l\'action.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleExportList = () => {
        if (sortedStudents.length === 0) {
            alert("Aucune donnée à exporter.");
            return;
        }

        // CSV Header
        const headers = ["ID", "Nom Complet", "Email", "Téléphone", "Inscriptions", "Payé (DT)", "Reste (DT)", "Date inscription"];

        // CSV Rows
        const rows = sortedStudents.map(s => [
            s.id,
            s.full_name,
            s.email,
            s.phone,
            s.enrollment_count,
            s.total_paid,
            s.total_remaining,
            s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : 'N/A'
        ]);

        // Build CSV string
        const csvContent = [
            headers.join(','),
            ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Create and trigger download
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `liste_etudiants_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportPDFList = () => {
        if (sortedStudents.length === 0) {
            alert("Aucune donnée à exporter.");
            return;
        }

        try {
            const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for more horizontal space
            const pageWidth = doc.internal.pageSize.getWidth();

            // --- HEADER ---
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, pageWidth, 30, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('GSM GUIDE ACADEMY', 14, 18);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('LISTE OFFICIELLE DES ÉTUDIANTS', pageWidth - 14, 18, { align: 'right' });

            // --- DATE & INFO ---
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.text(`Généré le : ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 14, 38);
            doc.text(`Nombre d'enregistrements : ${sortedStudents.length}`, pageWidth - 14, 38, { align: 'right' });

            // --- TABLE ---
            const tableColumn = ["Nom Complet", "Email", "Téléphone", "Formations", "Total Payé", "Reste", "Date Inscr."];
            const tableRows = sortedStudents.map(s => [
                s.full_name,
                s.email,
                s.phone,
                s.enrollment_count,
                `${s.total_paid} DT`,
                `${s.total_remaining} DT`,
                s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : 'N/A'
            ]);

            autoTable(doc, {
                startY: 45,
                head: [tableColumn],
                body: tableRows,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { fontSize: 8, cellPadding: 3 },
                alternateRowStyles: { fillColor: [245, 245, 245] },
            });

            // --- FOOTER ---
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }

            doc.save(`Liste_Etudiants_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error: any) {
            console.error('Error generating PDF list:', error);
            alert(`Erreur lors de la génération du PDF: ${error.message || error}`);
        }
    };

    const handleSort = (key: keyof StudentData) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedStudents = [...students].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;
        if (a[key]! < b[key]!) return direction === 'asc' ? -1 : 1;
        if (a[key]! > b[key]!) return direction === 'asc' ? 1 : -1;
        return 0;
    }).filter(s => {
        const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.phone.includes(searchQuery);

        const matchesStatus = filterConfig.status === 'all' ||
            (filterConfig.status === 'blocked' ? s.is_blocked : !s.is_blocked);

        const matchesPayment = filterConfig.payment === 'all' ||
            (filterConfig.payment === 'debt' ? s.total_remaining > 0 : s.total_remaining === 0);

        const matchesActivity = filterConfig.activity === 'all' ||
            (filterConfig.activity === 'enrolled' ? s.enrollment_count > 0 : s.enrollment_count === 0);

        let matchesDate = true;
        if (filterConfig.dateType !== 'all' && filterConfig.dateValue && s.created_at) {
            const date = new Date(s.created_at);
            const year = date.getFullYear().toString();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const fullMonth = `${year}-${month}`;
            const day = date.toISOString().split('T')[0];

            if (filterConfig.dateType === 'year') matchesDate = year === filterConfig.dateValue;
            else if (filterConfig.dateType === 'month') matchesDate = fullMonth === filterConfig.dateValue;
            else if (filterConfig.dateType === 'exact') matchesDate = day === filterConfig.dateValue;
        }

        return matchesSearch && matchesStatus && matchesPayment && matchesActivity && matchesDate;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-brand-green" size={48} />
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Scanning Bio-Registry...</p>
            </div>
        );
    }

    const filteredPaid = sortedStudents.reduce((sum, s) => sum + s.total_paid, 0);
    const filteredRemaining = sortedStudents.reduce((sum, s) => sum + s.total_remaining, 0);

    const statsCards = [
        { label: 'Effectif Étudiants', value: sortedStudents.length, color: 'text-brand-blue', bg: 'bg-brand-blue/10', icon: Users },
        { label: 'Collecte Totale', value: `${filteredPaid.toLocaleString()} DT`, color: 'text-brand-green', bg: 'bg-brand-green/10', icon: CreditCard },
        { label: 'Créances Restantes', value: `${filteredRemaining.toLocaleString()} DT`, color: 'text-rose-400', bg: 'bg-rose-400/10', icon: ShieldAlert },
    ];

    return (
        <div className="space-y-10 pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                        <Users size={14} /> Student Management
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Registre <span className="text-slate-500">Étudiants</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search Identification..."
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
                            <Filter size={20} />
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
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Statut Compte</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['all', 'active', 'blocked'].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setFilterConfig(prev => ({ ...prev, status: s as any }))}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterConfig.status === s ? 'bg-brand-green text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                                    >
                                                        {s === 'all' ? 'Tous' : s === 'active' ? 'Actif' : 'Bloqué'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Situation Financière</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['all', 'debt', 'paid'].map((p) => (
                                                    <button
                                                        key={p}
                                                        onClick={() => setFilterConfig(prev => ({ ...prev, payment: p as any }))}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterConfig.payment === p ? 'bg-brand-blue text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                                    >
                                                        {p === 'all' ? 'Tous' : p === 'debt' ? 'Avec Créances' : 'Soldé'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Activité</p>
                                            <div className="flex flex-wrap gap-2">
                                                {['all', 'enrolled', 'none'].map((a) => (
                                                    <button
                                                        key={a}
                                                        onClick={() => setFilterConfig(prev => ({ ...prev, activity: a as any }))}
                                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${filterConfig.activity === a ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                                                    >
                                                        {a === 'all' ? 'Tous' : a === 'enrolled' ? 'Inscrit' : 'Sans Formation'}
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
                                                setFilterConfig({ status: 'all', payment: 'all', activity: 'all', dateType: 'all', dateValue: '' });
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
                        onClick={handleExportList}
                        className="btn-primary py-3 px-6 h-auto shadow-none bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2"
                        title="Exporter en CSV"
                    >
                        <Download size={18} /> CSV
                    </button>
                    <button
                        onClick={handleExportPDFList}
                        className="btn-primary py-3 px-6 h-auto shadow-none bg-brand-blue/20 text-brand-blue hover:bg-brand-blue hover:text-white flex items-center gap-2"
                        title="Exporter en PDF"
                    >
                        <FileDown size={18} /> PDF
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statsCards.map((stat, i) => (
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

            <div className="premium-card overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-white/5 border-b border-white/5">
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('full_name')}>
                                    <div className="flex items-center gap-2">Étudiant <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Contact Internal</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('created_at')}>
                                    <div className="flex items-center gap-2">Enregistré le <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('total_paid')}>
                                    <div className="flex items-center gap-2">Intelligence Financière <ArrowUpDown size={12} /></div>
                                </th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Admin Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedStudents.length > 0 ? (
                                sortedStudents.map((student, idx) => (
                                    <motion.tr
                                        key={student.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-sm font-black shadow-lg border border-white/5 group-hover:border-brand-green/40 transition-all">
                                                    {student.full_name?.replace(/^(M|Mme)\s+/i, '').charAt(0) || 'U'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-sm text-white">{student.full_name?.replace(/^(M|Mme)\s+/i, '') || student.full_name}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ID-{student.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                    <Mail size={14} className="text-slate-600" />
                                                    {student.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                    <Phone size={14} className="text-slate-600" />
                                                    {student.phone}
                                                </div>

                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white tracking-widest uppercase">
                                                    {new Date(student.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                                    {new Date(student.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4 tabular-nums">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-brand-green">+{student.total_paid} DT</span>
                                                <span className={`text-[10px] font-bold ${student.total_remaining > 0 ? 'text-rose-400' : 'text-slate-600'}`}>
                                                    {student.total_remaining > 0 ? `-${student.total_remaining} DT restant` : 'Totalité réglée'}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-8 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Profile Action */}
                                                <button
                                                    onClick={() => fetchStudentProfile(student.id)}
                                                    title="Profil Complet"
                                                    className="p-2.5 rounded-xl bg-white/5 text-slate-400 hover:text-brand-green hover:bg-brand-green/10 transition-all border border-white/5"
                                                >
                                                    <ChevronRight size={18} />
                                                </button>

                                                {/* Block/Unblock Action */}
                                                <button
                                                    onClick={() => handleAction(student.id, student.is_blocked ? 'unblock' : 'block')}
                                                    title={student.is_blocked ? "Autoriser" : "Restreindre"}
                                                    disabled={actionLoading === student.id}
                                                    className={`p-2.5 rounded-xl border border-white/5 transition-all ${student.is_blocked
                                                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                                        : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                                        }`}
                                                >
                                                    {actionLoading === student.id ? (
                                                        <Loader2 size={18} className="animate-spin" />
                                                    ) : student.is_blocked ? (
                                                        <UserCheck size={18} />
                                                    ) : (
                                                        <UserX size={18} />
                                                    )}
                                                </button>

                                                {/* Delete Action */}
                                                <button
                                                    onClick={() => handleAction(student.id, 'delete')}
                                                    title="Supprimer"
                                                    disabled={actionLoading === student.id}
                                                    className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all border border-rose-500/20"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Users size={48} className="text-slate-800" />
                                            <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Registry Zero-Match Record</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-6 bg-white/5 border-t border-white/5 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Intelligence Coverage : <span className="text-white">{(sortedStudents.length / (students.length || 1) * 100).toFixed(0)}%</span> of Primary Registry
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 mr-4">Records {sortedStudents.length} of {students.length}</span>
                        <button className="p-2 rounded-lg bg-slate-900 border border-white/5 text-slate-500 cursor-not-allowed"><ChevronRight size={16} className="rotate-180" /></button>
                        <button className="p-2 rounded-lg bg-slate-900 border border-white/5 text-slate-500 cursor-not-allowed"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Profile Modal */}
            <AnimatePresence>
                {isProfileModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsProfileModalOpen(false)}
                        />
                        <motion.div
                            id="pdf-content"
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue to-blue-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                                        {selectedProfile?.full_name?.replace(/^(M|Mme)\s+/i, '').charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white">{selectedProfile?.full_name?.replace(/^(M|Mme)\s+/i, '') || selectedProfile?.full_name}</h2>
                                        <p className="text-xs text-brand-blue font-bold uppercase tracking-widest">
                                            {selectedProfile?.is_blocked ? 'Compte Restreint' : 'Compte Actif'} • ID: {selectedProfile?.id.slice(0, 8)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleDownloadPDF}
                                        title="Télécharger en PDF"
                                        className="py-2 px-4 rounded-xl bg-brand-blue/10 text-brand-blue hover:text-white hover:bg-brand-blue transition-all flex items-center gap-2 text-xs font-bold"
                                    >
                                        <FileDown size={16} /> PDF
                                    </button>
                                    <button
                                        onClick={() => setIsProfileModalOpen(false)}
                                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 bg-slate-900">
                                {profileLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="animate-spin text-brand-blue" size={48} />
                                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Chargement du profil complet...</p>
                                    </div>
                                ) : selectedProfile ? (
                                    <>
                                        {/* Personal Info Section */}
                                        <section>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <UserCheck size={16} className="text-brand-green" /> Informations Personnelles
                                            </h3>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Email</p>
                                                    <p className="text-sm font-bold text-white truncate" title={selectedProfile.email}>{selectedProfile.email}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Téléphone</p>
                                                    <p className="text-sm font-bold text-white">{selectedProfile.phone || 'N/A'}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Numéro CIN</p>
                                                    <p className="text-sm font-bold text-brand-blue">{selectedProfile.cin_number || 'N/A'}</p>
                                                </div>
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Sexe / Âge</p>
                                                    <p className="text-sm font-bold text-white">
                                                        {selectedProfile.gender || 'N/A'} {selectedProfile.age ? `/ ${selectedProfile.age} ans` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Financial Summary */}
                                        <section>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <CreditCard size={16} className="text-amber-400" /> Bilan Financier
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mb-1">Total Payé</p>
                                                    <p className="text-2xl font-black text-emerald-400 tabular-nums">{selectedProfile.total_paid} DT</p>
                                                </div>
                                                <div className="p-5 rounded-2xl bg-white/5 border border-white/10">
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Montant Total des Formations</p>
                                                    <p className="text-2xl font-black text-white tabular-nums">{selectedProfile.total_price} DT</p>
                                                </div>
                                                <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                                    <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest mb-1">Reste à Payer (Créances)</p>
                                                    <p className="text-2xl font-black text-rose-400 tabular-nums">{selectedProfile.total_remaining} DT</p>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Enrollments & Formations */}
                                        <section>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <BookOpen size={16} className="text-brand-blue" /> Formations & Sessions ({selectedProfile.enrollments?.length || 0})
                                            </h3>

                                            {selectedProfile.enrollments?.length > 0 ? (
                                                <div className="space-y-4">
                                                    {selectedProfile.enrollments.map((enrollment) => (
                                                        <div key={enrollment.id} className="p-5 rounded-3xl bg-white/5 border border-white/10 flex flex-col md:flex-row gap-6 md:items-center justify-between">
                                                            {/* Course Info */}
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10 shrink-0">
                                                                    {enrollment.course?.image_url ? (
                                                                        <img src={enrollment.course.image_url} alt={enrollment.course.title} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <GraduationCap size={24} className="text-slate-500" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-brand-blue/20 text-brand-blue">
                                                                            {enrollment.course?.category || 'Formation'}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${enrollment.status === 'confirmed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                                            enrollment.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-500/20 text-slate-400'
                                                                            }`}>
                                                                            {enrollment.status}
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="font-black text-white">{enrollment.course?.title || 'Formation inconnue'}</h4>
                                                                    <p className="text-xs font-bold text-slate-400 flex items-center gap-2 mt-1">
                                                                        <Calendar size={12} />
                                                                        {enrollment.session?.start_date ? new Date(enrollment.session.start_date).toLocaleDateString('fr-FR') : 'Date à définir'}
                                                                        <ChevronRight size={10} className="text-slate-600" />
                                                                        {enrollment.session?.end_date ? new Date(enrollment.session.end_date).toLocaleDateString('fr-FR') : 'Date à définir'}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            {/* Payment for this specific enrollment */}
                                                            <div className="flex items-center gap-6 md:border-l border-white/10 md:pl-6">
                                                                <div className="flex flex-col items-end">
                                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Paiement Partiel</span>
                                                                    <span className="text-sm font-black text-emerald-400">+{enrollment.amount_paid} / {enrollment.total_price} DT</span>
                                                                </div>
                                                                {enrollment.remaining > 0 ? (
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Reste à Payer</span>
                                                                        <span className="text-sm font-black text-rose-400">{enrollment.remaining} DT</span>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex flex-col items-end">
                                                                        <span className="text-[10px] text-emerald-500/50 font-black uppercase tracking-widest mb-1">Statut</span>
                                                                        <span className="text-sm font-black text-emerald-400 flex items-center gap-1">
                                                                            <CheckCircle2 size={14} /> Soldé
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-10 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center">
                                                    <BookOpen size={48} className="text-slate-700 mb-4" />
                                                    <p className="text-sm font-black text-white mb-1">Aucune inscription</p>
                                                    <p className="text-xs text-slate-500 font-bold">Cet étudiant ne s'est encore inscrit à aucune formation.</p>
                                                </div>
                                            )}
                                        </section>
                                    </>
                                ) : (
                                    <div className="text-center py-10 text-rose-400">Erreur lors du chargement des données.</div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Premium Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setDeleteConfirmId(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-slate-900 border border-rose-500/20 rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 text-center">
                                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mx-auto mb-6">
                                    <Trash2 size={40} className="text-rose-500" />
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2">Suppression Critique</h2>
                                <p className="text-slate-400 font-medium text-sm leading-relaxed mb-8">
                                    Êtes-vous sûr de vouloir supprimer définitivement cet étudiant ? <br/>
                                    Toutes les données associées seront <span className="text-rose-500 font-bold uppercase tracking-wider">effacées à jamais</span>.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={() => {
                                            handleAction(deleteConfirmId, 'delete');
                                            setDeleteConfirmId(null);
                                        }}
                                        className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-900/20"
                                    >
                                        Confirmer la suppression
                                    </button>
                                    <button
                                        onClick={() => setDeleteConfirmId(null)}
                                        className="w-full py-4 rounded-2xl bg-white/5 text-slate-400 font-black uppercase tracking-widest hover:bg-white/10 transition-all border border-white/5"
                                    >
                                        Annuler
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
