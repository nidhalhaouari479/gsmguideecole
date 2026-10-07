"use client";

import React, { useEffect, useState } from 'react';
import {
    Search,
    CheckCircle,
    XCircle,
    Clock,
    Download,
    Loader2,
    TrendingUp,
    Eye,
    Receipt,
    PieChart,
    MessageSquare,
    Save,
    Plus,
    X,
    FileText,
    Filter,
    RotateCcw,
    Wallet,
    Info,
    Hourglass,
    ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PageHeader,
    Card,
    StatCard,
    Badge,
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
        id: string;
        course_id: string;
        start_date: string;
        schedule?: string;
        courses: {
            id: string;
            title_fr: string;
            category: string;
        };
    };
    declared_amount?: number;
    finance_note?: string | null;
    finance_note_updated_at?: string | null;
}

interface PaymentSessionOption {
    id: string;
    course_id: string;
    course_title: string;
    start_date: string;
    price: number;
    seats_left: number;
}

const getPaymentStatusLabel =(status: string) => {
    if (status?.toLowerCase() === 'approved') return 'Validé';
    if (status?.toLowerCase() === 'rejected') return 'Refusé';
    return 'En attente';
};

const getLatestReceiptUrl = (en: Enrollment) => {
    let latestUrl = en.receipt_url;
    if (latestUrl && latestUrl.startsWith('[')) {
        try {
            const history = JSON.parse(latestUrl);
            if (Array.isArray(history)) {
                const pending = [...history].reverse().find((item: any) => item.status === 'pending');
                const latestWithReceipt = [...history].reverse().find((item: any) => item.url);
                latestUrl = pending?.url || latestWithReceipt?.url || null;
            }
        } catch (e) {
            // Ignore parse error
        }
    }
    return latestUrl;
};

const renderPaymentStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    const tone = s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'warning';
    return <Badge tone={tone}>{getPaymentStatusLabel(status)}</Badge>;
};

const formatDay = (value?: string | null) =>
    value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

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
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [openNoteId, setOpenNoteId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [confirmAmount, setConfirmAmount] = useState<Record<string, string>>({});
    const [financeNotes, setFinanceNotes] = useState<Record<string, string>>({});
    const [noteLoading, setNoteLoading] = useState<string | null>(null);
    const [noteSaved, setNoteSaved] = useState<string | null>(null);
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);
    const [paymentStudentSearch, setPaymentStudentSearch] = useState('');
    const [paymentForm, setPaymentForm] = useState({
        userId: '',
        courseId: '',
        sessionId: '',
        amount: '',
        note: '',
    });
    const [paymentSessionOptions, setPaymentSessionOptions] = useState<PaymentSessionOption[]>([]);

    useEffect(() => {
        fetchEnrollments();
    }, []);

    useEffect(() => {
        if (!isAddPaymentOpen) return;
        fetch('/api/admin/payments/sessions')
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setPaymentSessionOptions(data);
            })
            .catch(error => console.error('Error fetching payment sessions:', error));
    }, [isAddPaymentOpen]);

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
            setFinanceNotes(
                enriched.reduce((notes: Record<string, string>, enrollment: Enrollment) => {
                    notes[enrollment.id] = enrollment.finance_note || '';
                    return notes;
                }, {})
            );
        } catch (error) {
            console.error('Error fetching enrollments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveFinanceNote = async (enrollmentId: string) => {
        setNoteLoading(enrollmentId);
        setNoteSaved(null);

        try {
            const response = await fetch('/api/admin/payments/note', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enrollmentId,
                    note: financeNotes[enrollmentId] || '',
                }),
            });
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Impossible d’enregistrer la remarque.');
            }

            setEnrollments((current) => current.map((enrollment) =>
                enrollment.id === enrollmentId
                    ? {
                        ...enrollment,
                        finance_note: result.data.finance_note,
                        finance_note_updated_at: result.data.finance_note_updated_at,
                    }
                    : enrollment
            ));
            setNoteSaved(enrollmentId);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Erreur lors de l’enregistrement.');
        } finally {
            setNoteLoading(null);
        }
    };

    const resetPaymentForm = () => {
        setPaymentForm({ userId: '', courseId: '', sessionId: '', amount: '', note: '' });
        setPaymentStudentSearch('');
    };

    const handleAddPayment = async (event: React.FormEvent) => {
        event.preventDefault();
        setPaymentSubmitting(true);

        try {
            const response = await fetch('/api/admin/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(paymentForm),
            });
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Impossible d’ajouter le paiement.');
            }

            setIsAddPaymentOpen(false);
            resetPaymentForm();
            await fetchEnrollments();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Impossible d’ajouter le paiement.');
        } finally {
            setPaymentSubmitting(false);
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

    const paymentStudents = enrollments.reduce<Array<{ id: string; name: string; phone: string; email: string }>>((items, enrollment) => {
        if (!items.some(student => student.id === enrollment.user_id)) {
            items.push({
                id: enrollment.user_id,
                name: enrollment.profiles?.full_name || 'Sans nom',
                phone: enrollment.profiles?.phone || '',
                email: enrollment.profiles?.email || '',
            });
        }
        return items;
    }, []).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

    const normalizedPaymentStudentSearch = paymentStudentSearch.trim().toLowerCase();
    const normalizedPaymentPhoneSearch = paymentStudentSearch.replace(/\D/g, '');
    const filteredPaymentStudents = paymentStudents.filter(student => {
        if (!normalizedPaymentStudentSearch) return true;
        const matchesIdentity = student.name.toLowerCase().includes(normalizedPaymentStudentSearch)
            || student.email.toLowerCase().includes(normalizedPaymentStudentSearch);
        const matchesPhone = normalizedPaymentPhoneSearch.length > 0
            && student.phone.replace(/\D/g, '').includes(normalizedPaymentPhoneSearch);
        return matchesIdentity || matchesPhone;
    });

    const selectedStudentEnrollments = enrollments.filter(enrollment => enrollment.user_id === paymentForm.userId);
    // Every session of every formation is offered: picking one the student is not
    // enrolled in creates a new enrollment, with this payment as its first installment.
    const paymentCourses = [
        ...selectedStudentEnrollments.map(enrollment => ({
            id: enrollment.sessions?.courses?.id,
            title: enrollment.sessions?.courses?.title_fr || 'Formation sans nom',
        })),
        ...paymentSessionOptions.map(option => ({ id: option.course_id, title: option.course_title })),
    ].reduce<Array<{ id: string; title: string; enrolled: boolean }>>((items, course) => {
        if (course.id && !items.some(item => item.id === course.id)) {
            items.push({
                id: course.id,
                title: course.title,
                enrolled: selectedStudentEnrollments.some(enrollment => enrollment.sessions?.courses?.id === course.id),
            });
        }
        return items;
    }, []).sort((a, b) => Number(b.enrolled) - Number(a.enrolled) || a.title.localeCompare(b.title, 'fr'));

    const paymentSessions = [
        ...selectedStudentEnrollments
            .filter(enrollment => enrollment.sessions?.courses?.id === paymentForm.courseId)
            .map(enrollment => ({ id: enrollment.sessions.id, start_date: enrollment.sessions.start_date })),
        ...paymentSessionOptions
            .filter(option => option.course_id === paymentForm.courseId)
            .map(option => ({ id: option.id, start_date: option.start_date })),
    ].filter((session, index, all) => all.findIndex(other => other.id === session.id) === index)
        .map(session => {
            const enrollment = selectedStudentEnrollments.find(en => en.sessions?.id === session.id);
            const option = paymentSessionOptions.find(opt => opt.id === session.id);
            const totalPrice = enrollment ? Number(enrollment.total_price) || 0 : option?.price || 0;
            const paid = enrollment ? Number(enrollment.amount_paid) || 0 : 0;
            const remaining = Math.max(totalPrice - paid, 0);
            const isSettled = Boolean(enrollment) && totalPrice > 0 && remaining === 0;
            const isFull = !enrollment && (option?.seats_left ?? 0) <= 0;
            const date = new Date(session.start_date).toLocaleDateString('fr-FR');
            const label = !enrollment
                ? `Session du ${date} — nouvelle inscription (${totalPrice.toLocaleString('fr-FR')} DT)${isFull ? ' · complète' : ''}`
                : isSettled
                    ? `Session du ${date} — soldée`
                    : `Session du ${date} — reste ${remaining.toLocaleString('fr-FR')} DT`;
            return { ...session, enrollment, totalPrice, paid, remaining, isSettled, isFull, label };
        })
        .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    const selectedPaymentSession = paymentSessions.find(session => session.id === paymentForm.sessionId);

    const stats = {
        pendingCount: enrollments.filter(e => e.status?.toLowerCase() === 'pending').length,
        pendingAmount: enrollments.filter(e => e.status?.toLowerCase() === 'pending').reduce((sum, e) => sum + (e.declared_amount || 0), 0),
        actualRevenue: filteredEnrollments.filter(e => e.status?.toLowerCase() === 'approved').reduce((sum, e) => sum + (e.amount_paid || 0), 0),
        foreseenRevenue: filteredEnrollments.filter(e => e.status?.toLowerCase() === 'approved').reduce((sum, e) => sum + (e.total_price || 0), 0),
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <PageHeader title="Paiements" description="Encaissements, tranches déclarées à vérifier et reçus." />
                <Card padded={false}>
                    <LoadingState label="Chargement des paiements…" />
                </Card>
            </div>
        );
    }

    const remainingToCollect = Math.max(stats.foreseenRevenue - stats.actualRevenue, 0);

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
            getPaymentStatusLabel(en.status),
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
        doc.text(`Nombre de transactions : ${filteredEnrollments.length}`, 30, 60);
        doc.text(`Revenu Encaissé: ${stats.actualRevenue.toLocaleString()} DT`, 100, 60);
        doc.text(`Revenu Prévisionnel: ${stats.foreseenRevenue.toLocaleString()} DT`, 180, 60);

        // Table
        const tableData = filteredEnrollments.map(en => [
            en.profiles?.full_name || 'N/A',
            en.sessions?.courses?.title_fr || 'N/A',
            getPaymentStatusLabel(en.status).toUpperCase(),
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

    const statusCounts = {
        all: enrollments.length,
        pending: stats.pendingCount,
        approved: enrollments.filter(e => e.status?.toLowerCase() === 'approved').length,
        rejected: enrollments.filter(e => e.status?.toLowerCase() === 'rejected').length,
    };
    const hasActiveFilters = filterConfig.status !== 'all' || filterConfig.dateType !== 'all';
    const hasDateFilter = filterConfig.dateType !== 'all';
    const resetAllFilters = () => {
        setSearchQuery('');
        setFilterConfig({ status: 'all', dateType: 'all', dateValue: '' });
    };
    const closeAddPayment = () => {
        setIsAddPaymentOpen(false);
        resetPaymentForm();
    };
    const validatePendingPayment = (en: Enrollment) => {
        const validatedTranche = confirmAmount[en.id] ? parseFloat(confirmAmount[en.id]) : (Number(en.declared_amount) || 0);
        const currentPaid = Number(en.amount_paid) || 0;
        const newTotal = currentPaid + validatedTranche;
        handleUpdateStatus(en.id, 'approved', newTotal);
    };
    const updateFinanceNote = (id: string, value: string) => {
        setFinanceNotes((current) => ({
            ...current,
            [id]: value,
        }));
        setNoteSaved(null);
    };

    const statusOptions: Array<{ value: 'all' | 'pending' | 'approved' | 'rejected'; label: string; count: number }> = [
        { value: 'all', label: 'Tous', count: statusCounts.all },
        { value: 'pending', label: 'En attente', count: statusCounts.pending },
        { value: 'approved', label: 'Validés', count: statusCounts.approved },
        { value: 'rejected', label: 'Refusés', count: statusCounts.rejected },
    ];

    const renderProgress = (en: Enrollment) => {
        const paid = Number(en.amount_paid) || 0;
        const total = Number(en.total_price) || 0;
        const remaining = Math.max(total - paid, 0);
        const isComplete = total > 0 && remaining === 0;
        return (
            <div className="min-w-[9rem] max-w-[12rem]">
                <p className="whitespace-nowrap text-sm tabular-nums">
                    <span className="font-medium text-slate-900">{formatDT(paid)}</span>
                    <span className="text-slate-500"> / {formatDT(total)}</span>
                </p>
                <ProgressBar value={paid} max={total} className="mt-1.5" label="Progression du paiement" />
                <p className={cn('mt-1 whitespace-nowrap text-xs tabular-nums', total === 0 ? 'text-slate-500' : isComplete ? 'text-emerald-700' : 'text-rose-600')}>
                    {total === 0 ? 'Aucun montant dû' : isComplete ? 'Soldé' : `Reste : ${formatDT(remaining)}`}
                </p>
            </div>
        );
    };

    const renderReceiptLink = (en: Enrollment) => {
        const latestUrl = getLatestReceiptUrl(en);
        return latestUrl ? (
            <a
                href={latestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded text-sm font-medium text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/40"
            >
                <Eye size={14} /> Voir le reçu
            </a>
        ) : (
            <span className="whitespace-nowrap text-sm text-slate-400">Aucun reçu</span>
        );
    };

    const renderDeclaredAmount = (en: Enrollment) => (
        en.declared_amount && en.status?.toLowerCase() === 'pending' ? (
            <Badge tone="warning" dot={false} className="tabular-nums">
                Déclaré : {formatDT(en.declared_amount)}
            </Badge>
        ) : null
    );

    const renderNoteEditor = (en: Enrollment, mobile = false) => {
        const id = `${mobile ? 'm-' : ''}note-${en.id}`;
        return (
            <Field
                label="Remarque interne"
                htmlFor={id}
                hint={noteSaved === en.id ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700" role="status">
                        <CheckCircle size={12} /> Remarque enregistrée
                    </span>
                ) : en.finance_note_updated_at ? (
                    <span className="tabular-nums">Modifiée le {new Date(en.finance_note_updated_at).toLocaleDateString('fr-FR')}</span>
                ) : undefined}
            >
                <div className="flex items-start gap-2">
                    <textarea
                        id={id}
                        rows={2}
                        maxLength={2000}
                        value={financeNotes[en.id] || ''}
                        onChange={(event) => updateFinanceNote(en.id, event.target.value)}
                        placeholder="Visible uniquement par l’équipe…"
                        className={cn(textareaClass, 'min-h-0 flex-1 resize-none')}
                    />
                    <IconButton
                        label="Enregistrer la remarque"
                        icon={noteLoading === en.id ? Loader2 : Save}
                        variant="secondary"
                        onClick={() => handleSaveFinanceNote(en.id)}
                        disabled={noteLoading === en.id}
                        className={cn('shrink-0', noteLoading === en.id && '[&>svg]:animate-spin')}
                    />
                </div>
            </Field>
        );
    };

    const renderTrancheInput = (en: Enrollment, mobile = false) => (
        mobile ? (
            <Field
                label="Montant de la tranche à valider (DT)"
                htmlFor={`m-tranche-${en.id}`}
                hint="Pré-rempli avec le montant déclaré ; il sera ajouté au montant déjà encaissé."
            >
                <input
                    id={`m-tranche-${en.id}`}
                    type="number"
                    placeholder="Ex. : 300"
                    defaultValue={en.declared_amount || ''}
                    onChange={(e) => setConfirmAmount(prev => ({ ...prev, [en.id]: e.target.value }))}
                    className={cn(inputClass, 'tabular-nums')}
                />
            </Field>
        ) : (
            <div>
                <label htmlFor={`tranche-${en.id}`} className="sr-only">Montant de la tranche à valider (DT)</label>
                <input
                    id={`tranche-${en.id}`}
                    type="number"
                    placeholder="Tranche"
                    defaultValue={en.declared_amount || ''}
                    onChange={(e) => setConfirmAmount(prev => ({ ...prev, [en.id]: e.target.value }))}
                    className={cn(inputClass, 'w-24 tabular-nums')}
                    title="Montant de cette tranche (DT)"
                />
            </div>
        )
    );

    const validateLabel = (en: Enrollment) => (en.receipt_url ? 'Valider le paiement' : 'Valider la réservation à 0 DT');

    const renderStudent = (en: Enrollment) => (
        <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{en.profiles?.full_name || 'Sans nom'}</p>
            {en.profiles?.phone ? (
                <a href={`tel:${en.profiles.phone}`} className="block truncate text-xs text-slate-500 tabular-nums hover:text-slate-900">
                    {en.profiles.phone}
                </a>
            ) : (
                <p className="text-xs text-slate-400">Téléphone non renseigné</p>
            )}
            {en.profiles?.email && (
                <a href={`mailto:${en.profiles.email}`} className="block truncate text-xs text-slate-500 hover:text-slate-900">
                    {en.profiles.email}
                </a>
            )}
        </div>
    );

    const renderCourse = (en: Enrollment) => (
        <div className="min-w-0">
            <p className="font-medium leading-snug text-slate-900">{en.sessions?.courses?.title_fr || 'Formation inconnue'}</p>
            <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                {en.sessions?.start_date ? `Session du ${formatDay(en.sessions.start_date)}` : 'Date non définie'}
                {en.sessions?.courses?.category ? ` · ${en.sessions.courses.category}` : ''}
            </p>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <PageHeader
                title="Paiements"
                description="Encaissements, tranches déclarées à vérifier et reçus."
                actions={
                    <>
                        <div className="relative">
                            <Button
                                icon={Download}
                                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                                aria-expanded={isExportMenuOpen}
                                aria-haspopup="menu"
                            >
                                Exporter
                                <ChevronDown size={14} className="text-slate-400" />
                            </Button>
                            <AnimatePresence>
                                {isExportMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            transition={{ duration: 0.12 }}
                                            role="menu"
                                            className="absolute right-0 z-50 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg md:left-auto"
                                        >
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => { setIsExportMenuOpen(false); handleExportCSVList(); }}
                                                title="Exporter la liste filtrée en CSV"
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                            >
                                                <Download size={16} className="text-slate-400" /> Liste filtrée (CSV)
                                            </button>
                                            <button
                                                type="button"
                                                role="menuitem"
                                                onClick={() => { setIsExportMenuOpen(false); handleExportPDFList(); }}
                                                title="Générer un rapport PDF de la liste filtrée"
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                                            >
                                                <FileText size={16} className="text-slate-400" /> Rapport PDF
                                            </button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                        <Button variant="primary" icon={Plus} onClick={() => setIsAddPaymentOpen(true)}>
                            Ajouter un paiement
                        </Button>
                    </>
                }
            />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Encaissé" value={formatDT(stats.actualRevenue)} hint="Paiements validés (vue filtrée)" icon={TrendingUp} tone="success" />
                <StatCard label="Reste à percevoir" value={formatDT(remainingToCollect)} hint="Sur les inscriptions validées" icon={Hourglass} tone="danger" />
                <StatCard
                    label="En attente"
                    value={stats.pendingCount}
                    hint={`${formatDT(stats.pendingAmount)} déclarés à vérifier`}
                    icon={Clock}
                    tone={stats.pendingCount > 0 ? 'warning' : 'neutral'}
                    onClick={() => setFilterConfig(prev => ({ ...prev, status: prev.status === 'pending' ? 'all' : 'pending' }))}
                    active={filterConfig.status === 'pending'}
                />
                <StatCard label="Prévisionnel" value={formatDT(stats.foreseenRevenue)} hint="Total des formations validées" icon={PieChart} />
            </div>

            <Card padded={false}>
                <Toolbar>
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Étudiant, e-mail ou formation…"
                        label="Rechercher un paiement"
                    />
                    <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1">
                            <FilterTabs
                                options={statusOptions}
                                value={filterConfig.status}
                                onChange={(status) => setFilterConfig(prev => ({ ...prev, status }))}
                                label="Filtrer par statut"
                            />
                        </div>

                        <div className="relative shrink-0">
                            <Button
                                icon={Filter}
                                onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                aria-expanded={isFilterMenuOpen}
                                aria-haspopup="dialog"
                                title="Filtrer par période"
                                className={cn(hasDateFilter && 'border-slate-400 text-slate-900')}
                            >
                                <span className="hidden sm:inline">Période</span>
                                {hasDateFilter && <span className="h-1.5 w-1.5 rounded-full bg-slate-900" aria-label="Filtre de période actif" />}
                            </Button>

                            <AnimatePresence>
                                {isFilterMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)} />
                                        <motion.div
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 4 }}
                                            transition={{ duration: 0.12 }}
                                            role="dialog"
                                            aria-label="Filtrer par période"
                                            className="absolute right-0 z-50 mt-1 w-[min(18rem,calc(100vw-2rem))] space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
                                        >
                                            <Field label="Période de création" htmlFor="payments-date-type" hint="Filtre sur la date d’inscription de l’opération.">
                                                <select
                                                    id="payments-date-type"
                                                    value={filterConfig.dateType}
                                                    onChange={(e) => setFilterConfig(prev => ({ ...prev, dateType: e.target.value as any, dateValue: '' }))}
                                                    className={selectClass}
                                                >
                                                    <option value="all">Toutes les dates</option>
                                                    <option value="year">Par année</option>
                                                    <option value="month">Par mois</option>
                                                    <option value="exact">Date exacte</option>
                                                </select>
                                            </Field>

                                            {filterConfig.dateType === 'year' && (
                                                <Field label="Année" htmlFor="payments-date-value">
                                                    <input
                                                        id="payments-date-value"
                                                        type="number"
                                                        placeholder="Ex. : 2024"
                                                        value={filterConfig.dateValue}
                                                        onChange={(e) => setFilterConfig(prev => ({ ...prev, dateValue: e.target.value }))}
                                                        className={cn(inputClass, 'tabular-nums')}
                                                    />
                                                </Field>
                                            )}

                                            {filterConfig.dateType === 'month' && (
                                                <Field label="Mois" htmlFor="payments-date-value">
                                                    <input
                                                        id="payments-date-value"
                                                        type="month"
                                                        value={filterConfig.dateValue}
                                                        onChange={(e) => setFilterConfig(prev => ({ ...prev, dateValue: e.target.value }))}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                            )}

                                            {filterConfig.dateType === 'exact' && (
                                                <Field label="Jour" htmlFor="payments-date-value">
                                                    <input
                                                        id="payments-date-value"
                                                        type="date"
                                                        value={filterConfig.dateValue}
                                                        onChange={(e) => setFilterConfig(prev => ({ ...prev, dateValue: e.target.value }))}
                                                        className={inputClass}
                                                    />
                                                </Field>
                                            )}

                                            <Button
                                                icon={RotateCcw}
                                                size="sm"
                                                className="w-full"
                                                onClick={() => {
                                                    setFilterConfig({ status: 'all', dateType: 'all', dateValue: '' });
                                                    setIsFilterMenuOpen(false);
                                                }}
                                            >
                                                Réinitialiser les filtres
                                            </Button>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </Toolbar>

                {/* Desktop table */}
                {filteredEnrollments.length > 0 && (
                    <div className={cn(table.wrapper, 'hidden lg:block custom-scrollbar')}>
                        <table className={cn(table.table, 'min-w-[980px]')}>
                            <thead className={table.thead}>
                                <tr>
                                    <th scope="col" className={table.th}>Étudiant</th>
                                    <th scope="col" className={table.th}>Formation · session</th>
                                    <th scope="col" className={table.th}>Paiement</th>
                                    <th scope="col" className={table.th}>Justificatif</th>
                                    <th scope="col" className={table.th}>Statut</th>
                                    <th scope="col" className={table.th}>Date</th>
                                    <th scope="col" className={cn(table.th, 'text-right')}><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className={table.tbody}>
                                {filteredEnrollments.map((en) => {
                                    const isPending = en.status?.toLowerCase() === 'pending';
                                    const noteOpen = openNoteId === en.id;
                                    const hasNote = Boolean((financeNotes[en.id] || '').trim());
                                    const busy = actionLoading === en.id;
                                    return (
                                        <React.Fragment key={en.id}>
                                            <tr className={cn(table.tr, noteOpen && 'bg-slate-50/70')}>
                                                <td className={cn(table.td, 'max-w-[14rem]')}>{renderStudent(en)}</td>
                                                <td className={cn(table.td, 'max-w-[16rem]')}>{renderCourse(en)}</td>
                                                <td className={table.td}>{renderProgress(en)}</td>
                                                <td className={table.td}>
                                                    <div className="flex flex-col items-start gap-1.5">
                                                        {renderReceiptLink(en)}
                                                        {renderDeclaredAmount(en)}
                                                    </div>
                                                </td>
                                                <td className={table.td}>{renderPaymentStatusBadge(en.status)}</td>
                                                <td className={cn(table.td, 'whitespace-nowrap text-slate-500 tabular-nums')}>{formatDay(en.created_at)}</td>
                                                <td className={table.td}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        {isPending && (
                                                            <>
                                                                {en.receipt_url && renderTrancheInput(en)}
                                                                <IconButton
                                                                    label={validateLabel(en)}
                                                                    icon={busy ? Loader2 : CheckCircle}
                                                                    onClick={() => validatePendingPayment(en)}
                                                                    disabled={busy}
                                                                    className={cn('text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700', busy && '[&>svg]:animate-spin')}
                                                                />
                                                                <IconButton
                                                                    label="Refuser la demande"
                                                                    icon={busy ? Loader2 : XCircle}
                                                                    onClick={() => handleUpdateStatus(en.id, 'rejected')}
                                                                    disabled={busy}
                                                                    className={cn('text-rose-600 hover:bg-rose-50 hover:text-rose-700', busy && '[&>svg]:animate-spin')}
                                                                />
                                                            </>
                                                        )}
                                                        <span className="relative inline-flex">
                                                            <IconButton
                                                                label={noteOpen ? 'Masquer la remarque interne' : 'Remarque interne'}
                                                                icon={MessageSquare}
                                                                onClick={() => setOpenNoteId(noteOpen ? null : en.id)}
                                                                aria-expanded={noteOpen}
                                                                className={cn(noteOpen && 'bg-slate-100 text-slate-900')}
                                                            />
                                                            {hasNote && (
                                                                <span className="pointer-events-none absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-slate-500" aria-hidden="true" />
                                                            )}
                                                        </span>
                                                        <IconButton
                                                            label="Générer le reçu PDF"
                                                            icon={Receipt}
                                                            onClick={() => handleDownloadReceipt(en)}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                            {noteOpen && (
                                                <tr className="bg-slate-50/70">
                                                    <td colSpan={7} className="px-4 pb-4 pt-1">
                                                        <div className="ml-auto max-w-xl">{renderNoteEditor(en)}</div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Mobile / tablet cards */}
                {filteredEnrollments.length > 0 && (
                    <ul className="divide-y divide-slate-100 lg:hidden">
                        {filteredEnrollments.map((en) => {
                            const isPending = en.status?.toLowerCase() === 'pending';
                            const busy = actionLoading === en.id;
                            return (
                                <li key={en.id} className="space-y-4 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        {renderStudent(en)}
                                        <div className="shrink-0">{renderPaymentStatusBadge(en.status)}</div>
                                    </div>

                                    {renderCourse(en)}

                                    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                                        {renderProgress(en)}
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                                            {renderReceiptLink(en)}
                                            {renderDeclaredAmount(en)}
                                            <span className="ml-auto text-xs text-slate-500 tabular-nums">{formatDay(en.created_at)}</span>
                                        </div>
                                    </div>

                                    {renderNoteEditor(en, true)}

                                    {isPending && en.receipt_url && renderTrancheInput(en, true)}

                                    <div className="flex flex-wrap items-center gap-2">
                                        {isPending && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    icon={CheckCircle}
                                                    loading={busy}
                                                    onClick={() => validatePendingPayment(en)}
                                                    title={validateLabel(en)}
                                                    className="flex-1 text-emerald-700"
                                                >
                                                    Valider
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    icon={XCircle}
                                                    loading={busy}
                                                    onClick={() => handleUpdateStatus(en.id, 'rejected')}
                                                    title="Refuser la demande"
                                                    className="flex-1 text-rose-700"
                                                >
                                                    Refuser
                                                </Button>
                                            </>
                                        )}
                                        <Button size="sm" icon={Receipt} onClick={() => handleDownloadReceipt(en)} title="Générer le reçu PDF" className="flex-1">
                                            Reçu PDF
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Empty / no results */}
                {filteredEnrollments.length === 0 && (
                    enrollments.length === 0 ? (
                        <EmptyState
                            icon={Wallet}
                            title="Aucun paiement enregistré"
                            description="Les paiements déclarés par les étudiants ou saisis manuellement apparaîtront ici."
                            action={<Button variant="primary" icon={Plus} onClick={() => setIsAddPaymentOpen(true)}>Ajouter un paiement</Button>}
                        />
                    ) : (
                        <EmptyState
                            icon={Search}
                            title="Aucun résultat"
                            description={searchQuery
                                ? <>Aucune opération ne correspond à « {searchQuery} » avec les filtres actuels.</>
                                : 'Aucune opération ne correspond aux filtres actuels.'}
                            action={<Button icon={RotateCcw} onClick={resetAllFilters}>Réinitialiser la recherche et les filtres</Button>}
                        />
                    )
                )}

                {/* Footer */}
                {enrollments.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
                        <p className="text-xs text-slate-500 tabular-nums" aria-live="polite">
                            <span className="font-medium text-slate-900">{filteredEnrollments.length}</span> opération{filteredEnrollments.length > 1 ? 's' : ''} affichée{filteredEnrollments.length > 1 ? 's' : ''}
                            {filteredEnrollments.length !== enrollments.length && <> sur {enrollments.length}</>}
                        </p>
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                icon={X}
                                onClick={() => setFilterConfig({ status: 'all', dateType: 'all', dateValue: '' })}
                            >
                                Effacer les filtres
                            </Button>
                        )}
                    </div>
                )}
            </Card>

            {/* Add payment dialog */}
            <Modal
                open={isAddPaymentOpen}
                onClose={closeAddPayment}
                size="lg"
                title="Ajouter un paiement"
                description="Le montant sera ajouté à ce qui a déjà été encaissé."
                footer={
                    <>
                        <Button onClick={closeAddPayment} className="w-full sm:w-auto">Annuler</Button>
                        <Button
                            type="submit"
                            form="add-payment-form"
                            variant="primary"
                            icon={Save}
                            loading={paymentSubmitting}
                            disabled={paymentSubmitting || !paymentForm.userId || !paymentForm.courseId || !paymentForm.sessionId || !paymentForm.amount}
                            title={!paymentForm.userId || !paymentForm.courseId || !paymentForm.sessionId || !paymentForm.amount ? 'Renseignez l’étudiant, la formation, la session et le montant' : undefined}
                            className="w-full sm:w-auto"
                        >
                            Enregistrer le paiement
                        </Button>
                    </>
                }
            >
                <form id="add-payment-form" onSubmit={handleAddPayment} className="space-y-6">
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900">Étudiant</h3>
                        <Field label="Étudiant" htmlFor="payment-student" required hint="Filtrez la liste puis sélectionnez l’étudiant concerné.">
                            <div className="space-y-2">
                                <label className="relative block">
                                    <span className="sr-only">Rechercher un étudiant</span>
                                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="search"
                                        value={paymentStudentSearch}
                                        onChange={(event) => {
                                            setPaymentStudentSearch(event.target.value);
                                            setPaymentForm(current => ({
                                                ...current,
                                                userId: '',
                                                courseId: '',
                                                sessionId: '',
                                            }));
                                        }}
                                        placeholder="Nom, téléphone ou e-mail…"
                                        className={cn(inputClass, 'pl-9')}
                                    />
                                </label>
                                <select
                                    id="payment-student"
                                    required
                                    value={paymentForm.userId}
                                    onChange={(event) => setPaymentForm(current => ({
                                        ...current,
                                        userId: event.target.value,
                                        courseId: '',
                                        sessionId: '',
                                    }))}
                                    className={selectClass}
                                >
                                    <option value="">
                                        {filteredPaymentStudents.length > 0
                                            ? `Choisir un étudiant (${filteredPaymentStudents.length})`
                                            : 'Aucun étudiant trouvé'}
                                    </option>
                                    {filteredPaymentStudents.map(student => (
                                        <option key={student.id} value={student.id}>
                                            {student.name}{student.phone ? ` — ${student.phone}` : ''}{student.email ? ` — ${student.email}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </Field>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900">Inscription</h3>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Formation"
                                htmlFor="payment-course"
                                required
                                hint={!paymentForm.userId ? 'Choisissez d’abord un étudiant.' : undefined}
                                className="min-w-0"
                            >
                                <select
                                    id="payment-course"
                                    required
                                    disabled={!paymentForm.userId}
                                    value={paymentForm.courseId}
                                    onChange={(event) => setPaymentForm(current => ({
                                        ...current,
                                        courseId: event.target.value,
                                        sessionId: '',
                                    }))}
                                    className={selectClass}
                                    title={!paymentForm.userId ? 'Choisissez d’abord un étudiant' : undefined}
                                >
                                    <option value="">Choisir une formation</option>
                                    {paymentCourses.map(course => (
                                        <option key={course.id} value={course.id}>
                                            {course.title}{course.enrolled ? ' (inscrit)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </Field>

                            <Field
                                label="Session"
                                htmlFor="payment-session"
                                required
                                hint={paymentForm.userId && !paymentForm.courseId ? 'Choisissez d’abord une formation.' : undefined}
                                className="min-w-0"
                            >
                                <select
                                    id="payment-session"
                                    required
                                    disabled={!paymentForm.courseId}
                                    value={paymentForm.sessionId}
                                    onChange={(event) => setPaymentForm(current => ({ ...current, sessionId: event.target.value }))}
                                    className={selectClass}
                                    title={!paymentForm.courseId ? 'Choisissez d’abord une formation' : undefined}
                                >
                                    <option value="">Choisir une session</option>
                                    {paymentSessions.map(session => (
                                        <option key={session.id} value={session.id} disabled={session.isSettled || session.isFull}>
                                            {session.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900">Paiement</h3>

                        {selectedPaymentSession && (() => {
                            const amount = Number(paymentForm.amount) || 0;
                            const projectedPaid = selectedPaymentSession.paid + Math.min(amount, selectedPaymentSession.remaining);
                            return (
                                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                                    {!selectedPaymentSession.enrollment && (
                                        <p className="mb-3 flex items-start gap-2 text-sm text-slate-700">
                                            <Info size={16} className="mt-0.5 shrink-0 text-sky-600" />
                                            <span>Nouvelle inscription : l’étudiant sera inscrit à cette session ({formatDT(selectedPaymentSession.totalPrice)}).</span>
                                        </p>
                                    )}
                                    <dl className="grid grid-cols-3 gap-3">
                                        <div className="min-w-0">
                                            <dt className="text-xs text-slate-500">Prix</dt>
                                            <dd className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">{formatDT(selectedPaymentSession.totalPrice)}</dd>
                                        </div>
                                        <div className="min-w-0">
                                            <dt className="text-xs text-slate-500">Déjà payé</dt>
                                            <dd className="mt-0.5 text-sm font-semibold text-emerald-700 tabular-nums">{formatDT(selectedPaymentSession.paid)}</dd>
                                        </div>
                                        <div className="min-w-0">
                                            <dt className="text-xs text-slate-500">Reste</dt>
                                            <dd className="mt-0.5 text-sm font-semibold text-rose-600 tabular-nums">{formatDT(selectedPaymentSession.remaining)}</dd>
                                        </div>
                                    </dl>
                                    <ProgressBar
                                        value={projectedPaid}
                                        max={selectedPaymentSession.totalPrice}
                                        className="mt-3 bg-slate-200/70"
                                        label="Progression après ce paiement"
                                    />
                                </div>
                            );
                        })()}

                        {(() => {
                            const amount = Number(paymentForm.amount) || 0;
                            const exceeds = Boolean(selectedPaymentSession) && amount > (selectedPaymentSession?.remaining ?? 0) && (selectedPaymentSession?.totalPrice ?? 0) > 0;
                            const help = !selectedPaymentSession
                                ? 'Choisissez une session pour voir le reste à payer.'
                                : amount > 0 && amount <= selectedPaymentSession.remaining
                                    ? <span className="font-medium text-emerald-700">Après ce paiement : reste {formatDT(Math.max(selectedPaymentSession.remaining - amount, 0))}</span>
                                    : `Reste à payer : ${formatDT(selectedPaymentSession.remaining)}.`;
                            return (
                                <Field
                                    label="Montant payé (DT)"
                                    htmlFor="payment-amount"
                                    required
                                    hint={<span id="payment-amount-help" className="tabular-nums">{help}</span>}
                                    error={exceeds ? <span id="payment-amount-help" className="tabular-nums">Le montant dépasse le reste à payer ({formatDT(selectedPaymentSession?.remaining)}).</span> : undefined}
                                >
                                    <input
                                        id="payment-amount"
                                        required
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        max={selectedPaymentSession && selectedPaymentSession.totalPrice > 0
                                            ? selectedPaymentSession.remaining
                                            : undefined}
                                        value={paymentForm.amount}
                                        onChange={(event) => setPaymentForm(current => ({ ...current, amount: event.target.value }))}
                                        placeholder="Ex. : 300"
                                        aria-describedby="payment-amount-help"
                                        aria-invalid={exceeds || undefined}
                                        className={cn(inputClass, 'tabular-nums')}
                                    />
                                </Field>
                            );
                        })()}

                        <Field
                            label={<>Remarque <span className="font-normal text-slate-500">(facultatif)</span></>}
                            htmlFor="payment-note"
                            hint="Visible uniquement par l’équipe d’administration."
                        >
                            <textarea
                                id="payment-note"
                                rows={3}
                                maxLength={2000}
                                value={paymentForm.note}
                                onChange={(event) => setPaymentForm(current => ({ ...current, note: event.target.value }))}
                                placeholder="Ajouter une remarque interne sur ce paiement…"
                                className={cn(textareaClass, 'resize-none')}
                            />
                        </Field>
                    </section>
                </form>
            </Modal>
        </div>
    );
}
