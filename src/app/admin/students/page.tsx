"use client";

import React, { useEffect, useState } from 'react';
import {
    Users,
    Search,
    Filter,
    BookOpen,
    ChevronRight,
    Loader2,
    ArrowUpDown,
    Download,
    X,
    UserCheck,
    UserX,
    ShieldAlert,
    CheckCircle2,
    FileDown,
    Trash2,
    UserPlus,
    Save,
    Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import {
    PageHeader,
    Card,
    StatCard,
    Badge,
    StatusBadge,
    ProgressBar,
    formatDT,
    Button,
    IconButton,
    SearchInput,
    FilterTabs,
    Toolbar,
    table,
    EmptyState,
    LoadingState,
    Field,
    inputClass,
    selectClass,
    textareaClass,
    Modal,
    cn,
} from '@/components/admin/ui';

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
    admin_note?: string;
    admin_note_updated_at?: string | null;
}

const getStatusLabel = (status: string) => {
    if (status === 'approved' || status === 'confirmed') return 'Validé';
    if (status === 'rejected') return 'Refusé';
    if (status === 'pending') return 'En attente';
    return status;
};

export default function StudentsAdminPage() {
    const [students, setStudents] = useState<StudentData[]>([]);
    const [loading, setLoading] = useState(true);
    // Sensitive financial/admin controls stay hidden until the role is verified.
    const [isProfessor, setIsProfessor] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: keyof StudentData; direction: 'asc' | 'desc' } | null>(null);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Filter State
    const [filterConfig, setFilterConfig] = useState<{
        status: 'all' | 'blocked' | 'active';
        payment: 'all' | 'unpaid' | 'paid';
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
    const [studentNote, setStudentNote] = useState('');
    const [studentNoteSaving, setStudentNoteSaving] = useState(false);
    const [studentNoteSaved, setStudentNoteSaved] = useState(false);
    const [smsMessage, setSmsMessage] = useState('');
    const [isCustomSms, setIsCustomSms] = useState(false);
    const [smsSending, setSmsSending] = useState(false);
    const [smsFeedback, setSmsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    
    // Add Student State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [addFormData, setAddFormData] = useState({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        cin_number: ''
    });

    useEffect(() => {
        fetchStudents();
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return;
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            setIsProfessor(profile?.role === 'professor');
        });
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
            setStudentNote(data.admin_note || '');
            setStudentNoteSaved(false);
            setSmsMessage('');
            setIsCustomSms(false);
            setSmsFeedback(null);
        } catch (error) {
            console.error('Error fetching student profile:', error);
            alert('Impossible de charger le profil complet.');
            setIsProfileModalOpen(false);
        } finally {
            setProfileLoading(false);
        }
    };

    const sendSms = async (message: string) => {
        if (!selectedProfile || !message.trim()) return;

        setSmsSending(true);
        setSmsFeedback(null);
        try {
            const response = await fetch('/api/admin/sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: selectedProfile.phone,
                    message,
                }),
            });
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || 'Impossible d’envoyer le SMS.');
            }

            setSmsMessage('');
            setSmsFeedback({
                type: 'success',
                message: data.reference
                    ? `SMS envoyé. Référence : ${data.reference}`
                    : 'SMS envoyé avec succès.',
            });
        } catch (error) {
            setSmsFeedback({
                type: 'error',
                message: error instanceof Error ? error.message : 'Impossible d’envoyer le SMS.',
            });
        } finally {
            setSmsSending(false);
        }
    };

    const handleSendSms = async () => sendSms(smsMessage);

    const sendPaymentReminder = (isLate: boolean) => {
        if (!selectedProfile) return;
        const remaining = Number(selectedProfile.total_remaining) || 0;
        const firstName = (selectedProfile.full_name?.replace(/^(M|Mme)\s+/i, '').trim().split(/\s+/)[0] || 'cher étudiant').slice(0, 18);
        const message = isLate
            ? `GSM Guide Academy : Bonjour ${firstName}, sauf erreur, un solde de ${remaining} DT reste dû. Merci de le régulariser rapidement.`
            : `GSM Guide Academy : Bonjour ${firstName}, rappel : il vous reste ${remaining} DT à régler. Merci de régulariser votre paiement.`;
        if (!window.confirm(`Confirmer l’envoi du SMS ${isLate ? 'de retard' : 'de rappel'} de paiement à ${selectedProfile.phone} ?`)) return;
        void sendSms(message);
    };

    const handleSaveStudentNote = async () => {
        if (!selectedProfile) return;

        setStudentNoteSaving(true);
        setStudentNoteSaved(false);
        try {
            const response = await fetch(`/api/admin/students/${selectedProfile.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ note: studentNote }),
            });
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Impossible d’enregistrer la remarque.');
            }

            setSelectedProfile((current) => current ? {
                ...current,
                admin_note: data.data.admin_note || '',
                admin_note_updated_at: data.data.admin_note_updated_at,
            } : current);
            setStudentNoteSaved(true);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.');
        } finally {
            setStudentNoteSaving(false);
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
                    getStatusLabel(e.status),
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

    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const response = await fetch('/api/admin/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addFormData)
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            
            await fetchStudents();
            setIsAddModalOpen(false);
            setAddFormData({
                email: '',
                password: '',
                full_name: '',
                phone: '',
                cin_number: ''
            });
        } catch (error: any) {
            console.error('Create student error:', error);
            alert(error.message || 'Erreur lors de la création de l\'étudiant.');
        } finally {
            setIsCreating(false);
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
            (filterConfig.payment === 'unpaid'
                ? s.enrollment_count > 0 && s.total_remaining > 0
                : s.enrollment_count > 0 && s.total_remaining <= 0);

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
        return <LoadingState label="Chargement des étudiants…" />;
    }

    const filteredPaid = sortedStudents.reduce((sum, s) => sum + s.total_paid, 0);
    const filteredRemaining = sortedStudents.reduce((sum, s) => sum + s.total_remaining, 0);

    // ---- Presentation helpers (UI only) ----
    const cleanName = (name?: string | null) => name?.replace(/^(M|Mme)\s+/i, '') || name || '';
    const getInitials = (name?: string | null) => {
        const parts = cleanName(name).trim().split(/\s+/).filter(Boolean);
        return ((parts[0]?.charAt(0) || '') + (parts[1]?.charAt(0) || '')).toUpperCase() || '?';
    };
    const formatMoney = formatDT;
    const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const formatTime = (value?: string | null) => value ? new Date(value).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
    const hasPhone = (phone?: string | null) => !!phone && phone !== 'N/A';
    const paidPercent = (paid: number, total: number) => total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

    const hasSearch = searchQuery.trim().length > 0;
    const activeFilters: { key: string; label: string; clear: () => void }[] = [];
    if (!isProfessor && filterConfig.status !== 'all') activeFilters.push({ key: 'status', label: filterConfig.status === 'active' ? 'Compte actif' : 'Compte bloqué', clear: () => setFilterConfig(prev => ({ ...prev, status: 'all' })) });
    if (!isProfessor && filterConfig.payment !== 'all') activeFilters.push({ key: 'payment', label: filterConfig.payment === 'unpaid' ? 'Non payé' : 'Payé', clear: () => setFilterConfig(prev => ({ ...prev, payment: 'all' })) });
    if (filterConfig.activity !== 'all') activeFilters.push({ key: 'activity', label: filterConfig.activity === 'enrolled' ? 'Inscrit à une formation' : 'Sans formation', clear: () => setFilterConfig(prev => ({ ...prev, activity: 'all' })) });
    if (filterConfig.dateType !== 'all' && filterConfig.dateValue) activeFilters.push({ key: 'date', label: `Date : ${filterConfig.dateValue}`, clear: () => setFilterConfig(prev => ({ ...prev, dateType: 'all', dateValue: '' })) });
    const isFiltered = hasSearch || activeFilters.length > 0;
    // The activity filter lives in the toolbar tabs; the popover only holds the other criteria.
    const popoverFilters = activeFilters.filter(f => f.key !== 'activity');
    const resetAll = () => {
        setSearchQuery('');
        setFilterConfig({ status: 'all', payment: 'all', activity: 'all', dateType: 'all', dateValue: '' });
    };

    const activityTabs = [
        { value: 'all' as const, label: 'Tous', count: students.length },
        { value: 'enrolled' as const, label: 'Inscrits', count: students.filter(s => s.enrollment_count > 0).length },
        { value: 'none' as const, label: 'Sans formation', count: students.filter(s => s.enrollment_count === 0).length },
    ];

    const subheadingClass = 'text-sm font-semibold text-slate-900';
    const dtClass = 'text-xs text-slate-500';
    const ddClass = 'mt-0.5 text-sm text-slate-900';

    const renderAvatar = (name?: string | null, size: 'sm' | 'md' = 'sm') => (
        <span
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600',
                size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm'
            )}
            aria-hidden="true"
        >
            {getInitials(name)}
        </span>
    );

    const renderAccountBadge = (blocked: boolean) => (
        blocked ? <Badge tone="danger">Restreint</Badge> : <Badge tone="success">Actif</Badge>
    );

    const renderEnrollmentBadge = (status: string) => (
        <StatusBadge status={status === 'confirmed' ? 'approved' : status} />
    );

    const renderPaymentSummary = (paid: number, remaining: number, enrollmentCount: number, compact = false) => {
        const total = Number(paid || 0) + Number(remaining || 0);
        if (enrollmentCount === 0 && total === 0) {
            return <span className="text-xs text-slate-400">Aucune formation</span>;
        }
        const settled = Number(remaining || 0) <= 0;
        return (
            <div className={compact ? 'w-full' : 'min-w-[10rem] max-w-[13rem]'}>
                <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
                    <span className="whitespace-nowrap font-medium text-slate-900">
                        {Number(paid || 0).toLocaleString('fr-FR')} / {formatMoney(total)}
                    </span>
                    <span className="text-slate-500">{paidPercent(paid, total)} %</span>
                </div>
                <ProgressBar value={Number(paid || 0)} max={total} label="Progression du paiement" className="mt-1.5" />
                <p className={cn('mt-1 whitespace-nowrap text-xs tabular-nums', settled ? 'text-emerald-700' : 'text-rose-600')}>
                    {settled ? 'Totalité réglée' : `Reste : ${formatMoney(remaining)}`}
                </p>
            </div>
        );
    };

    const smsDisabledReason = (profile: StudentFullProfile) => {
        if (!hasPhone(profile.phone)) return 'Aucun numéro de téléphone renseigné';
        if (Number(profile.total_remaining) <= 0) return 'Aucun solde dû pour cet étudiant';
        if (smsSending) return 'Envoi en cours…';
        return undefined;
    };

    const buildHistory = (profile: StudentFullProfile) => {
        const events: { date: string; title: string; detail?: string; tone: 'slate' | 'blue' | 'emerald' | 'amber' }[] = [];
        if (profile.created_at) events.push({ date: profile.created_at, title: 'Création du compte', tone: 'slate' });
        (profile.enrollments || []).forEach((e) => {
            if (e.enrolled_at) events.push({ date: e.enrolled_at, title: `Inscription : ${e.course?.title || 'Formation inconnue'}`, detail: getStatusLabel(e.status), tone: 'blue' });
            if (e.payment_date) events.push({ date: e.payment_date, title: `Paiement : ${e.course?.title || 'Formation inconnue'}`, detail: `${formatMoney(e.amount_paid)} réglés sur ${formatMoney(e.total_price)}`, tone: 'emerald' });
        });
        if (profile.admin_note_updated_at) events.push({ date: profile.admin_note_updated_at, title: 'Remarque interne mise à jour', tone: 'amber' });
        return events
            .filter(ev => !isProfessor || ev.tone !== 'emerald')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const emptyState = isFiltered ? (
        <EmptyState
            icon={Search}
            title="Aucun étudiant ne correspond à ces critères"
            description={hasSearch ? <>Aucun résultat pour « {searchQuery} ». Modifiez la recherche ou les filtres.</> : 'Essayez d’assouplir ou de réinitialiser les filtres.'}
            action={<Button variant="secondary" size="sm" icon={X} onClick={resetAll}>Réinitialiser la recherche</Button>}
        />
    ) : (
        <EmptyState
            icon={Users}
            title="Aucun étudiant enregistré"
            description="Ajoutez un étudiant manuellement ou attendez les premières inscriptions."
            action={<Button variant="primary" size="sm" icon={UserPlus} onClick={() => setIsAddModalOpen(true)}>Ajouter un étudiant</Button>}
        />
    );

    const renderSortHeader = (label: string, key: keyof StudentData, className = '') => {
        const isActive = sortConfig?.key === key;
        return (
            <th
                scope="col"
                className={cn(table.th, className)}
                aria-sort={isActive ? (sortConfig?.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
                <button
                    type="button"
                    onClick={() => handleSort(key)}
                    className={cn('inline-flex items-center gap-1 rounded transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40', isActive && 'text-slate-900')}
                    title={`Trier par ${label.toLowerCase()}`}
                >
                    {label} <ArrowUpDown size={12} className={isActive ? 'text-slate-700' : 'text-slate-400'} />
                </button>
            </th>
        );
    };

    const rowActions = (student: StudentData) => isProfessor ? null : (
        <>
            <IconButton
                label={student.is_blocked ? `Autoriser ${cleanName(student.full_name)}` : `Restreindre ${cleanName(student.full_name)}`}
                title={student.is_blocked ? 'Autoriser' : 'Restreindre'}
                icon={actionLoading === student.id ? Loader2 : student.is_blocked ? UserCheck : UserX}
                onClick={() => handleAction(student.id, student.is_blocked ? 'unblock' : 'block')}
                disabled={actionLoading === student.id}
                className={cn(actionLoading === student.id && '[&>svg]:animate-spin')}
            />
            <IconButton
                label={`Supprimer ${cleanName(student.full_name)}`}
                title="Supprimer"
                icon={Trash2}
                onClick={() => handleAction(student.id, 'delete')}
                disabled={actionLoading === student.id}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            />
        </>
    );

    const profile = selectedProfile && !profileLoading ? selectedProfile : null;

    return (
        <div className="space-y-6 pb-10">
            <PageHeader
                title={
                    <span className="inline-flex items-center gap-2">
                        Étudiants
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-600 tabular-nums">{students.length}</span>
                    </span>
                }
                description="Profils, inscriptions et situations de paiement."
                actions={
                    <>
                        {!isProfessor && (
                            <>
                                <Button variant="secondary" icon={Download} onClick={handleExportList} title="Exporter la liste filtrée en CSV" className="flex-1 sm:flex-initial">
                                    CSV
                                </Button>
                                <Button variant="secondary" icon={FileDown} onClick={handleExportPDFList} title="Exporter la liste filtrée en PDF" className="flex-1 sm:flex-initial">
                                    PDF
                                </Button>
                            </>
                        )}
                        <Button variant="primary" icon={UserPlus} onClick={() => setIsAddModalOpen(true)} className="w-full sm:w-auto">
                            Ajouter un étudiant
                        </Button>
                    </>
                }
            />

            {!isProfessor && (
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                    <StatCard label="Étudiants" value={sortedStudents.length.toLocaleString('fr-FR')} hint={isFiltered ? `sur ${students.length} au total` : undefined} />
                    <StatCard label="Total encaissé" value={formatMoney(filteredPaid)} tone="success" />
                    <div className="col-span-2 lg:col-span-1">
                        <StatCard label="Reste à percevoir" value={formatMoney(filteredRemaining)} tone={filteredRemaining > 0 ? 'danger' : 'neutral'} />
                    </div>
                </div>
            )}

            <Card padded={false}>
                <section aria-label="Liste des étudiants">
                    <Toolbar className="flex-wrap">
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Nom, email ou téléphone…"
                                label="Rechercher un étudiant"
                                className="min-w-0 flex-1 sm:max-w-xs sm:flex-initial"
                            />
                            <div className="relative">
                                <Button
                                    variant="secondary"
                                    icon={Filter}
                                    onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                    aria-expanded={isFilterMenuOpen}
                                    aria-haspopup="dialog"
                                    className={cn((isFilterMenuOpen || popoverFilters.length > 0) && 'border-slate-400 text-slate-900')}
                                >
                                    <span className="hidden sm:inline">Filtres</span>
                                    {popoverFilters.length > 0 && (
                                        <span className="rounded bg-slate-100 px-1.5 text-xs font-medium text-slate-700 tabular-nums">{popoverFilters.length}</span>
                                    )}
                                </Button>

                                <AnimatePresence>
                                    {isFilterMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                                            <motion.div
                                                role="dialog"
                                                aria-label="Filtres"
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 4 }}
                                                transition={{ duration: 0.12 }}
                                                className="absolute left-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] max-h-[70dvh] overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 bg-white shadow-lg sm:left-auto sm:right-0"
                                            >
                                                <div className="space-y-4 p-4">
                                                    {!isProfessor && (
                                                        <div className="space-y-1.5">
                                                            <p className="text-sm font-medium text-slate-700">Statut du compte</p>
                                                            <FilterTabs
                                                                label="Statut du compte"
                                                                value={filterConfig.status}
                                                                onChange={(value) => setFilterConfig(prev => ({ ...prev, status: value }))}
                                                                options={[
                                                                    { value: 'all', label: 'Tous' },
                                                                    { value: 'active', label: 'Actif' },
                                                                    { value: 'blocked', label: 'Bloqué' },
                                                                ]}
                                                            />
                                                        </div>
                                                    )}

                                                    {!isProfessor && (
                                                        <div className="space-y-1.5">
                                                            <p className="text-sm font-medium text-slate-700">Situation financière</p>
                                                            <FilterTabs
                                                                label="Situation financière"
                                                                value={filterConfig.payment}
                                                                onChange={(value) => setFilterConfig(prev => ({ ...prev, payment: value }))}
                                                                options={[
                                                                    { value: 'all', label: 'Tous' },
                                                                    { value: 'unpaid', label: 'Non payé' },
                                                                    { value: 'paid', label: 'Payé' },
                                                                ]}
                                                            />
                                                        </div>
                                                    )}

                                                    <Field label="Date d'inscription" htmlFor="students-date-filter">
                                                        <div className="space-y-2">
                                                            <select
                                                                id="students-date-filter"
                                                                value={filterConfig.dateType}
                                                                onChange={(e) => setFilterConfig(prev => ({ ...prev, dateType: e.target.value as any, dateValue: '' }))}
                                                                className={selectClass}
                                                            >
                                                                <option value="all">Toutes les dates</option>
                                                                <option value="year">Par année</option>
                                                                <option value="month">Par mois</option>
                                                                <option value="exact">Date exacte</option>
                                                            </select>

                                                            {filterConfig.dateType === 'year' && (
                                                                <input
                                                                    type="number"
                                                                    placeholder="Ex : 2024"
                                                                    aria-label="Année"
                                                                    value={filterConfig.dateValue}
                                                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, dateValue: e.target.value }))}
                                                                    className={inputClass}
                                                                />
                                                            )}

                                                            {filterConfig.dateType === 'month' && (
                                                                <input
                                                                    type="month"
                                                                    aria-label="Mois"
                                                                    value={filterConfig.dateValue}
                                                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, dateValue: e.target.value }))}
                                                                    className={inputClass}
                                                                />
                                                            )}

                                                            {filterConfig.dateType === 'exact' && (
                                                                <input
                                                                    type="date"
                                                                    aria-label="Date exacte"
                                                                    value={filterConfig.dateValue}
                                                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, dateValue: e.target.value }))}
                                                                    className={inputClass}
                                                                />
                                                            )}
                                                        </div>
                                                    </Field>
                                                </div>

                                                <div className="flex gap-2 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        className="flex-1"
                                                        onClick={() => {
                                                            setFilterConfig({ status: 'all', payment: 'all', activity: 'all', dateType: 'all', dateValue: '' });
                                                            setIsFilterMenuOpen(false);
                                                        }}
                                                    >
                                                        Réinitialiser
                                                    </Button>
                                                    <Button variant="primary" size="sm" className="flex-1" onClick={() => setIsFilterMenuOpen(false)}>
                                                        Appliquer
                                                    </Button>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                        <FilterTabs
                            label="Inscription à une formation"
                            options={activityTabs}
                            value={filterConfig.activity}
                            onChange={(value) => setFilterConfig(prev => ({ ...prev, activity: value }))}
                        />
                    </Toolbar>

                    {popoverFilters.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5">
                            {popoverFilters.map((f) => (
                                <span key={f.key} className="inline-flex items-center gap-1 rounded-md bg-slate-100 py-0.5 pl-2 pr-0.5 text-xs font-medium text-slate-700">
                                    {f.label}
                                    <button
                                        type="button"
                                        onClick={f.clear}
                                        aria-label={`Retirer le filtre ${f.label}`}
                                        title="Retirer ce filtre"
                                        className="flex h-5 w-5 items-center justify-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                    >
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            <button
                                type="button"
                                onClick={() => setFilterConfig({ status: 'all', payment: 'all', activity: 'all', dateType: 'all', dateValue: '' })}
                                className="text-xs font-medium text-brand-blue hover:underline"
                            >
                                Tout effacer
                            </button>
                        </div>
                    )}

                    {sortedStudents.length === 0 ? emptyState : (
                        <>
                            {/* Mobile card list */}
                            <ul className="divide-y divide-slate-100 md:hidden">
                                {sortedStudents.map((student) => (
                                    <li key={student.id} className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <button
                                                type="button"
                                                onClick={() => fetchStudentProfile(student.id)}
                                                className="flex min-w-0 items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                            >
                                                {renderAvatar(student.full_name)}
                                                <span className="flex min-w-0 flex-col">
                                                    <span className="truncate text-sm font-medium text-slate-900">{cleanName(student.full_name)}</span>
                                                    <span className="truncate text-xs text-slate-500">{student.email}</span>
                                                </span>
                                            </button>
                                            {!isProfessor && <div className="shrink-0">{renderAccountBadge(student.is_blocked)}</div>}
                                        </div>

                                        <dl className="mt-3 grid grid-cols-2 gap-3 pl-12">
                                            <div className="min-w-0">
                                                <dt className={dtClass}>Téléphone</dt>
                                                <dd className={cn(ddClass, 'tabular-nums')}>
                                                    {hasPhone(student.phone)
                                                        ? <a href={`tel:${student.phone}`} className="hover:text-brand-blue">{student.phone}</a>
                                                        : <span className="text-slate-400">Non renseigné</span>}
                                                </dd>
                                            </div>
                                            <div className="min-w-0">
                                                <dt className={dtClass}>Formations</dt>
                                                <dd className={cn(ddClass, 'tabular-nums')}>{student.enrollment_count}</dd>
                                            </div>
                                            <div className="col-span-2 min-w-0">
                                                <dt className={dtClass}>Enregistré le</dt>
                                                <dd className={cn(ddClass, 'tabular-nums')}>{formatDate(student.created_at)} · {formatTime(student.created_at)}</dd>
                                            </div>
                                            {!isProfessor && (
                                                <div className="col-span-2">
                                                    <dt className="sr-only">Paiement</dt>
                                                    <dd>{renderPaymentSummary(student.total_paid, student.total_remaining, student.enrollment_count, true)}</dd>
                                                </div>
                                            )}
                                        </dl>

                                        <div className="mt-3 flex items-center gap-1 pl-12">
                                            <Button variant="secondary" size="sm" onClick={() => fetchStudentProfile(student.id)} className="flex-1">
                                                Voir le profil <ChevronRight size={16} />
                                            </Button>
                                            {rowActions(student)}
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            {/* Desktop table */}
                            <div className={cn(table.wrapper, 'hidden md:block custom-scrollbar')}>
                                <table className={table.table}>
                                    <thead className={table.thead}>
                                        <tr>
                                            {renderSortHeader('Étudiant', 'full_name', 'pl-5')}
                                            <th scope="col" className={table.th}>Téléphone</th>
                                            <th scope="col" className={cn(table.th, 'text-right')}>Formations</th>
                                            {renderSortHeader('Enregistré le', 'created_at')}
                                            {!isProfessor && renderSortHeader('Paiement', 'total_paid')}
                                            {!isProfessor && <th scope="col" className={table.th}>Compte</th>}
                                            <th scope="col" className={cn(table.th, 'pr-5 text-right')}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={table.tbody}>
                                        {sortedStudents.map((student) => (
                                            <tr key={student.id} className={table.tr}>
                                                <td className={cn(table.td, 'pl-5')}>
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchStudentProfile(student.id)}
                                                        className="group flex min-w-[14rem] items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                                        title="Ouvrir le profil complet"
                                                    >
                                                        {renderAvatar(student.full_name)}
                                                        <span className="flex min-w-0 flex-col">
                                                            <span className="font-medium text-slate-900 group-hover:underline group-hover:decoration-slate-300 group-hover:underline-offset-2">{cleanName(student.full_name)}</span>
                                                            <span className="break-all text-xs text-slate-500">{student.email}</span>
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className={cn(table.td, 'whitespace-nowrap tabular-nums')}>
                                                    {hasPhone(student.phone)
                                                        ? <a href={`tel:${student.phone}`} className="hover:text-brand-blue">{student.phone}</a>
                                                        : <span className="text-slate-400">—</span>}
                                                </td>
                                                <td className={cn(table.td, 'text-right tabular-nums')}>{student.enrollment_count}</td>
                                                <td className={cn(table.td, 'whitespace-nowrap tabular-nums')}>
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-900">{formatDate(student.created_at)}</span>
                                                        <span className="text-xs text-slate-500">{formatTime(student.created_at)}</span>
                                                    </div>
                                                </td>
                                                {!isProfessor && (
                                                    <td className={table.td}>
                                                        {renderPaymentSummary(student.total_paid, student.total_remaining, student.enrollment_count)}
                                                    </td>
                                                )}
                                                {!isProfessor && (
                                                    <td className={table.td}>{renderAccountBadge(student.is_blocked)}</td>
                                                )}
                                                <td className={cn(table.td, 'pr-5 text-right')}>
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <IconButton
                                                            label={`Voir le profil de ${cleanName(student.full_name)}`}
                                                            title="Profil complet"
                                                            icon={ChevronRight}
                                                            onClick={() => fetchStudentProfile(student.id)}
                                                        />
                                                        {rowActions(student)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 md:px-5">
                        <p className="tabular-nums" aria-live="polite">
                            {isFiltered
                                ? <><span className="font-medium text-slate-900">{sortedStudents.length}</span> sur {students.length} étudiant{students.length > 1 ? 's' : ''}</>
                                : <><span className="font-medium text-slate-900">{students.length}</span> étudiant{students.length > 1 ? 's' : ''}</>}
                        </p>
                        {isFiltered && (
                            <button type="button" onClick={resetAll} className="font-medium text-brand-blue hover:underline">
                                Réinitialiser
                            </button>
                        )}
                    </div>
                </section>
            </Card>

            {/* Profile dialog */}
            <Modal
                open={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                size="xl"
                title={
                    <span className="flex min-w-0 items-center gap-3">
                        {profile ? renderAvatar(profile.full_name, 'md') : null}
                        <span className="truncate">{profileLoading ? 'Chargement du profil…' : cleanName(selectedProfile?.full_name) || 'Profil étudiant'}</span>
                    </span>
                }
                description={profile ? (
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                        {renderAccountBadge(profile.is_blocked)}
                        <span className="text-xs text-slate-500 tabular-nums">ID {profile.id.slice(0, 8)}</span>
                    </span>
                ) : undefined}
                headerActions={
                    <Button
                        variant="secondary"
                        size="sm"
                        icon={FileDown}
                        onClick={handleDownloadPDF}
                        disabled={!selectedProfile || profileLoading}
                        title="Télécharger la fiche en PDF"
                    >
                        <span className="hidden sm:inline">Télécharger</span> PDF
                    </Button>
                }
            >
                {profileLoading ? (
                    <LoadingState label="Chargement du profil complet…" />
                ) : selectedProfile ? (
                    <div className="divide-y divide-slate-200 [&>section]:py-5 [&>section:first-child]:pt-1 [&>section:last-child]:pb-1">
                        {/* Personal info */}
                        <section aria-labelledby="profile-infos">
                            <h3 id="profile-infos" className={cn(subheadingClass, 'mb-3')}>Informations personnelles</h3>
                            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="min-w-0">
                                    <dt className={dtClass}>Email</dt>
                                    <dd className={cn(ddClass, 'break-all')}>
                                        <a href={`mailto:${selectedProfile.email}`} className="hover:text-brand-blue hover:underline">{selectedProfile.email}</a>
                                    </dd>
                                </div>
                                <div>
                                    <dt className={dtClass}>Téléphone</dt>
                                    <dd className={cn(ddClass, 'tabular-nums')}>
                                        {hasPhone(selectedProfile.phone)
                                            ? <a href={`tel:${selectedProfile.phone}`} className="hover:text-brand-blue hover:underline">{selectedProfile.phone}</a>
                                            : <span className="text-slate-400">Non renseigné</span>}
                                    </dd>
                                </div>
                                <div>
                                    <dt className={dtClass}>Numéro CIN</dt>
                                    <dd className={cn(ddClass, 'tabular-nums')}>
                                        {selectedProfile.cin_number || <span className="text-slate-400">Non renseigné</span>}
                                    </dd>
                                </div>
                                <div>
                                    <dt className={dtClass}>Sexe / Âge</dt>
                                    <dd className={ddClass}>
                                        {selectedProfile.gender || 'N/A'} {selectedProfile.age ? `/ ${selectedProfile.age} ans` : ''}
                                    </dd>
                                </div>
                                <div>
                                    <dt className={dtClass}>Enregistré le</dt>
                                    <dd className={cn(ddClass, 'tabular-nums')}>
                                        {formatDate(selectedProfile.created_at)}{selectedProfile.created_at ? ` · ${formatTime(selectedProfile.created_at)}` : ''}
                                    </dd>
                                </div>
                                {selectedProfile.source && (
                                    <div>
                                        <dt className={dtClass}>Source</dt>
                                        <dd className={ddClass}>{selectedProfile.source}</dd>
                                    </div>
                                )}
                            </dl>
                        </section>

                        {/* Financial summary */}
                        {!isProfessor && (
                            <section aria-labelledby="profile-payments">
                                <h3 id="profile-payments" className={cn(subheadingClass, 'mb-3')}>Paiements</h3>
                                <dl className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 p-4">
                                    <div className="min-w-0">
                                        <dt className={dtClass}>Total des formations</dt>
                                        <dd className="mt-0.5 text-base font-semibold text-slate-900 tabular-nums">{formatMoney(selectedProfile.total_price)}</dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className={dtClass}>Total payé</dt>
                                        <dd className="mt-0.5 text-base font-semibold text-emerald-700 tabular-nums">{formatMoney(selectedProfile.total_paid)}</dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className={dtClass}>Reste à payer</dt>
                                        <dd className={cn('mt-0.5 text-base font-semibold tabular-nums', Number(selectedProfile.total_remaining) > 0 ? 'text-rose-600' : 'text-slate-900')}>{formatMoney(selectedProfile.total_remaining)}</dd>
                                    </div>
                                    {Number(selectedProfile.total_price) > 0 && (
                                        <div className="col-span-3">
                                            <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                                                <span>Progression du règlement</span>
                                                <span className="font-medium text-slate-900 tabular-nums">{paidPercent(Number(selectedProfile.total_paid), Number(selectedProfile.total_price))} %</span>
                                            </div>
                                            <ProgressBar
                                                value={Number(selectedProfile.total_paid)}
                                                max={Number(selectedProfile.total_price)}
                                                label="Progression du règlement global"
                                            />
                                        </div>
                                    )}
                                </dl>
                            </section>
                        )}

                        {/* Enrollments */}
                        <section aria-labelledby="profile-enrollments">
                            <h3 id="profile-enrollments" className={cn(subheadingClass, 'mb-3 flex items-center gap-2')}>
                                Inscriptions
                                <span className="rounded-md bg-slate-100 px-1.5 text-xs font-medium text-slate-600 tabular-nums">{selectedProfile.enrollments?.length || 0}</span>
                            </h3>

                            {selectedProfile.enrollments?.length > 0 ? (
                                <div className="overflow-hidden rounded-lg border border-slate-200">
                                    {/* Mobile list */}
                                    <ul className="divide-y divide-slate-100 sm:hidden">
                                        {selectedProfile.enrollments.map((enrollment) => (
                                            <li key={enrollment.id} className="space-y-2 p-3">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-900">{enrollment.course?.title || 'Formation inconnue'}</p>
                                                        <p className="text-xs text-slate-500">
                                                            {enrollment.course?.category || 'Formation'}
                                                            {enrollment.course?.instructor_name ? ` · ${enrollment.course.instructor_name}` : ''}
                                                        </p>
                                                    </div>
                                                    {renderEnrollmentBadge(enrollment.status)}
                                                </div>
                                                <p className="text-xs text-slate-500 tabular-nums">
                                                    {enrollment.session?.start_date ? new Date(enrollment.session.start_date).toLocaleDateString('fr-FR') : 'Date à définir'}
                                                    {' → '}
                                                    {enrollment.session?.end_date ? new Date(enrollment.session.end_date).toLocaleDateString('fr-FR') : 'Date à définir'}
                                                </p>
                                                {!isProfessor && (
                                                    <div className="flex items-baseline justify-between text-xs tabular-nums">
                                                        <span className="text-slate-700">{Number(enrollment.amount_paid || 0).toLocaleString('fr-FR')} / {formatMoney(enrollment.total_price)}</span>
                                                        {enrollment.remaining > 0
                                                            ? <span className="text-rose-600">Reste {formatMoney(enrollment.remaining)}</span>
                                                            : <span className="text-emerald-700">Soldé</span>}
                                                    </div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Table */}
                                    <div className={cn(table.wrapper, 'hidden sm:block')}>
                                        <table className={table.table}>
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th scope="col" className={table.th}>Formation</th>
                                                    <th scope="col" className={table.th}>Session</th>
                                                    <th scope="col" className={table.th}>Statut</th>
                                                    {!isProfessor && <th scope="col" className={cn(table.th, 'text-right')}>Payé</th>}
                                                    {!isProfessor && <th scope="col" className={cn(table.th, 'text-right')}>Reste</th>}
                                                </tr>
                                            </thead>
                                            <tbody className={table.tbody}>
                                                {selectedProfile.enrollments.map((enrollment) => (
                                                    <tr key={enrollment.id}>
                                                        <td className={table.td}>
                                                            <p className="font-medium text-slate-900">{enrollment.course?.title || 'Formation inconnue'}</p>
                                                            <p className="text-xs text-slate-500">
                                                                {enrollment.course?.category || 'Formation'}
                                                                {enrollment.course?.instructor_name ? ` · Formateur : ${enrollment.course.instructor_name}` : ''}
                                                            </p>
                                                        </td>
                                                        <td className={cn(table.td, 'whitespace-nowrap text-xs tabular-nums')}>
                                                            {enrollment.session?.start_date ? new Date(enrollment.session.start_date).toLocaleDateString('fr-FR') : 'Date à définir'}
                                                            <span className="text-slate-400"> → </span>
                                                            {enrollment.session?.end_date ? new Date(enrollment.session.end_date).toLocaleDateString('fr-FR') : 'Date à définir'}
                                                        </td>
                                                        <td className={table.td}>{renderEnrollmentBadge(enrollment.status)}</td>
                                                        {!isProfessor && (
                                                            <td className={cn(table.td, 'whitespace-nowrap text-right tabular-nums')}>
                                                                <span className="text-slate-900">{Number(enrollment.amount_paid || 0).toLocaleString('fr-FR')}</span>
                                                                <span className="text-slate-500"> / {formatMoney(enrollment.total_price)}</span>
                                                                <ProgressBar
                                                                    value={Number(enrollment.amount_paid)}
                                                                    max={Number(enrollment.total_price)}
                                                                    label="Progression du paiement"
                                                                    className="ml-auto mt-1.5 w-24"
                                                                />
                                                            </td>
                                                        )}
                                                        {!isProfessor && (
                                                            <td className={cn(table.td, 'whitespace-nowrap text-right tabular-nums')}>
                                                                {enrollment.remaining > 0
                                                                    ? <span className="text-rose-600">{formatMoney(enrollment.remaining)}</span>
                                                                    : <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 size={14} /> Soldé</span>}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={BookOpen}
                                    title="Aucune inscription"
                                    description="Cet étudiant ne s'est encore inscrit à aucune formation."
                                    className="rounded-lg border border-dashed border-slate-200 py-8"
                                />
                            )}
                        </section>

                        {/* SMS */}
                        {!isProfessor && (
                            <section aria-labelledby="profile-sms">
                                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                                    <div>
                                        <h3 id="profile-sms" className={subheadingClass}>Communication SMS</h3>
                                        <p className="mt-0.5 text-sm text-slate-500">Choisissez un modèle ou rédigez un message.</p>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Destinataire : <span className="font-medium text-slate-900 tabular-nums">{selectedProfile.phone || 'Aucun numéro'}</span>
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => sendPaymentReminder(true)}
                                        disabled={smsSending || !selectedProfile.phone || selectedProfile.phone === 'N/A' || Number(selectedProfile.total_remaining) <= 0}
                                        title={smsDisabledReason(selectedProfile) || 'Envoyer un avis de retard de paiement'}
                                    >
                                        Avis de retard ({formatMoney(selectedProfile.total_remaining)})
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => sendPaymentReminder(false)}
                                        disabled={smsSending || !selectedProfile.phone || selectedProfile.phone === 'N/A' || Number(selectedProfile.total_remaining) <= 0}
                                        title={smsDisabledReason(selectedProfile) || 'Envoyer un rappel de paiement'}
                                    >
                                        Rappel de paiement
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setIsCustomSms(true);
                                            setSmsFeedback(null);
                                        }}
                                        aria-pressed={isCustomSms}
                                        className={cn(isCustomSms && 'border-slate-400 bg-slate-50 text-slate-900')}
                                    >
                                        Message personnalisé
                                    </Button>
                                </div>
                                {smsDisabledReason(selectedProfile) && !smsSending && (
                                    <p className="mt-2 text-xs text-slate-500">Rappels indisponibles : {smsDisabledReason(selectedProfile)?.toLowerCase()}.</p>
                                )}
                                {isCustomSms && (
                                    <Field
                                        label="Message"
                                        htmlFor="student-sms-message"
                                        className="mt-4"
                                        hint={<span className={cn('tabular-nums', smsMessage.length >= 150 && 'text-amber-700')}>{smsMessage.length}/157 caractères</span>}
                                    >
                                        <textarea
                                            id="student-sms-message"
                                            rows={4}
                                            maxLength={157}
                                            value={smsMessage}
                                            onChange={(event) => {
                                                setSmsMessage(event.target.value);
                                                setSmsFeedback(null);
                                            }}
                                            placeholder="Saisissez le SMS à envoyer à cet étudiant…"
                                            className={cn(textareaClass, 'resize-none')}
                                        />
                                    </Field>
                                )}
                                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div aria-live="polite" className="space-y-1">
                                        {smsFeedback && (
                                            <p className={cn('text-xs font-medium', smsFeedback.type === 'success' ? 'text-emerald-700' : 'text-rose-600')}>
                                                {smsFeedback.message}
                                            </p>
                                        )}
                                        <p className="text-xs text-slate-500">
                                            Envoi sécurisé via votre Sender ID WinSMS approuvé.
                                        </p>
                                    </div>
                                    {isCustomSms && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            icon={Send}
                                            loading={smsSending}
                                            onClick={handleSendSms}
                                            disabled={smsSending || !smsMessage.trim() || !selectedProfile.phone || selectedProfile.phone === 'N/A'}
                                            title={!hasPhone(selectedProfile.phone) ? 'Aucun numéro de téléphone renseigné' : !smsMessage.trim() ? 'Saisissez un message' : undefined}
                                        >
                                            {smsSending ? 'Envoi…' : 'Envoyer le SMS'}
                                        </Button>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* Internal note */}
                        <section aria-labelledby="profile-note">
                            <h3 id="profile-note" className={subheadingClass}>Remarque interne</h3>
                            <p className="mb-3 mt-0.5 text-sm text-slate-500">Visible uniquement par l’administration.</p>
                            <label htmlFor="student-admin-note" className="sr-only">Remarque interne</label>
                            <textarea
                                id="student-admin-note"
                                rows={4}
                                maxLength={3000}
                                value={studentNote}
                                onChange={(event) => {
                                    setStudentNote(event.target.value);
                                    setStudentNoteSaved(false);
                                }}
                                placeholder="Ajouter une remarque générale sur cet étudiant…"
                                className={cn(textareaClass, 'resize-y')}
                            />
                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-0.5 text-xs text-slate-500" aria-live="polite">
                                    {studentNoteSaved && (
                                        <p className="flex items-center gap-1 font-medium text-emerald-700">
                                            <CheckCircle2 size={14} /> Remarque enregistrée.
                                        </p>
                                    )}
                                    {selectedProfile.admin_note_updated_at && (
                                        <p className="tabular-nums">
                                            Dernière modification : {new Date(selectedProfile.admin_note_updated_at).toLocaleString('fr-FR')}
                                        </p>
                                    )}
                                    <p className="tabular-nums">{studentNote.length}/3000</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={Save}
                                    loading={studentNoteSaving}
                                    onClick={handleSaveStudentNote}
                                    disabled={studentNoteSaving}
                                >
                                    {studentNoteSaving ? 'Enregistrement…' : 'Enregistrer'}
                                </Button>
                            </div>
                        </section>

                        {/* History */}
                        <section aria-labelledby="profile-history">
                            <h3 id="profile-history" className={cn(subheadingClass, 'mb-3')}>Historique</h3>
                            {buildHistory(selectedProfile).length > 0 ? (
                                <ol className="relative space-y-4 border-l border-slate-200 pl-5">
                                    {buildHistory(selectedProfile).map((ev, i) => (
                                        <li key={`${ev.date}-${i}`} className="relative">
                                            <span className="absolute -left-[1.5rem] top-1.5 h-2 w-2 rounded-full bg-slate-300 ring-4 ring-white" aria-hidden="true" />
                                            <p className="text-sm text-slate-900">{ev.title}</p>
                                            <p className="text-xs text-slate-500 tabular-nums">
                                                {formatDate(ev.date)} · {formatTime(ev.date)}{ev.detail ? ` — ${ev.detail}` : ''}
                                            </p>
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-sm text-slate-500">Aucun événement enregistré.</p>
                            )}
                        </section>
                    </div>
                ) : (
                    <EmptyState icon={ShieldAlert} title="Erreur lors du chargement des données." />
                )}
            </Modal>

            {/* Delete confirmation */}
            <Modal
                open={!!deleteConfirmId}
                onClose={() => setDeleteConfirmId(null)}
                size="sm"
                title="Supprimer cet étudiant ?"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setDeleteConfirmId(null)} className="w-full sm:w-auto">
                            Annuler
                        </Button>
                        <Button
                            variant="danger"
                            icon={Trash2}
                            onClick={() => {
                                if (!deleteConfirmId) return;
                                handleAction(deleteConfirmId, 'delete');
                                setDeleteConfirmId(null);
                            }}
                            className="w-full sm:w-auto"
                        >
                            Confirmer la suppression
                        </Button>
                    </>
                }
            >
                <p className="text-sm text-slate-600">
                    Êtes-vous sûr de vouloir supprimer définitivement cet étudiant&nbsp;?
                    Toutes les données associées seront <span className="font-medium text-rose-700">effacées à jamais</span>. Cette action est irréversible.
                </p>
            </Modal>

            {/* Add student */}
            <Modal
                open={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Ajouter un étudiant"
                description="Enregistrement manuel, sans vérification de l'e-mail."
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsAddModalOpen(false)} className="w-full sm:w-auto">
                            Annuler
                        </Button>
                        <Button type="submit" form="add-student-form" variant="primary" icon={UserPlus} loading={isCreating} className="w-full sm:w-auto">
                            {isCreating ? 'Création…' : 'Créer le compte'}
                        </Button>
                    </>
                }
            >
                <form id="add-student-form" onSubmit={handleCreateStudent} className="space-y-6">
                    <fieldset className="space-y-4">
                        <legend className="mb-3 text-sm font-semibold text-slate-900">Identifiants de connexion</legend>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="E-mail (identifiant)" htmlFor="add-student-email" required>
                                <input
                                    id="add-student-email"
                                    type="email"
                                    value={addFormData.email}
                                    onChange={(e) => setAddFormData({ ...addFormData, email: e.target.value })}
                                    className={inputClass}
                                    placeholder="exemple@email.com"
                                    required
                                />
                            </Field>
                            <Field label="Mot de passe" htmlFor="add-student-password" required>
                                <input
                                    id="add-student-password"
                                    type="text"
                                    value={addFormData.password}
                                    onChange={(e) => setAddFormData({ ...addFormData, password: e.target.value })}
                                    className={inputClass}
                                    placeholder="••••••••"
                                    aria-describedby="add-student-password-help"
                                    required
                                />
                            </Field>
                        </div>
                        <p id="add-student-password-help" className="text-xs text-slate-500">Le mot de passe est affiché en clair pour pouvoir être communiqué à l&apos;étudiant.</p>
                    </fieldset>

                    <fieldset className="space-y-4 border-t border-slate-200 pt-5">
                        <legend className="sr-only">Informations personnelles</legend>
                        <p className="text-sm font-semibold text-slate-900">Informations personnelles</p>
                        <Field label="Nom complet" htmlFor="add-student-name">
                            <input
                                id="add-student-name"
                                type="text"
                                value={addFormData.full_name}
                                onChange={(e) => setAddFormData({ ...addFormData, full_name: e.target.value })}
                                className={inputClass}
                                placeholder="Nom & prénom"
                            />
                        </Field>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Téléphone" htmlFor="add-student-phone">
                                <input
                                    id="add-student-phone"
                                    type="text"
                                    inputMode="tel"
                                    value={addFormData.phone}
                                    onChange={(e) => setAddFormData({ ...addFormData, phone: e.target.value })}
                                    className={inputClass}
                                    placeholder="55 123 456"
                                />
                            </Field>
                            <Field label="Numéro CIN" htmlFor="add-student-cin">
                                <input
                                    id="add-student-cin"
                                    type="text"
                                    inputMode="numeric"
                                    value={addFormData.cin_number}
                                    onChange={(e) => setAddFormData({ ...addFormData, cin_number: e.target.value })}
                                    className={inputClass}
                                    placeholder="00123456"
                                />
                            </Field>
                        </div>
                    </fieldset>
                    <p className="text-xs text-slate-500"><span className="text-rose-600">*</span> Champs obligatoires</p>
                </form>
            </Modal>
        </div>
    );
}
