"use client";

import React, { useEffect, useState } from 'react';
import {
    Calendar as CalendarIcon,
    Search,
    Plus,
    Users,
    Clock,
    Loader2,
    ArrowRight,
    Edit2,
    Trash2,
    Check,
    LayoutGrid,
    List,
    Briefcase,
    Mail,
    Phone,
    X,
    CreditCard,
    Upload,
    Lock,
    Minus,
    ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Field,
    FilterTabs,
    IconButton,
    LoadingState,
    Modal,
    PageHeader,
    ProgressBar,
    SearchInput,
    StatCard,
    Toolbar,
    buttonClass,
    cn,
    formatDT,
    inputClass,
    selectClass,
    table,
    textareaClass,
} from '@/components/admin/ui';
import { supabase } from '@/lib/supabase';

interface Session {
    id: string;
    start_date: string;
    end_date: string;
    seats_available: number;
    schedule: string;
    course_id: string;
    instructor_id: string;
    courses: {
        id: string;
        title_fr: string;
        category: string;
        base_price: number;
        image_url: string;
    };
    instructor?: {
        id: string;
        full_name: string;
        email: string;
    };
    stats: {
        total_enrollments: number;
        confirmed: number;
        pending: number;
    };
}

const translateScheduleLabel = (label?: string) => {
    if (!label) return 'Personnalisé';
    const normalized = label.trim().toLowerCase();
    if (normalized === 'full time') return 'Temps plein';
    if (normalized === 'part time') return 'Temps partiel';
    if (normalized === 'weekend' || normalized === 'week-end') return 'Fin de semaine';
    if (normalized === 'personalized' || normalized === 'personalised') return 'Personnalisé';
    return label;
};

const translateCategory = (category?: string) => {
    if (!category) return 'Formation';
    return category
        .split(',')
        .map(item => {
            const normalized = item.trim().toLowerCase();
            if (normalized === 'hardware') return 'Matériel';
            if (normalized === 'software') return 'Logiciel';
            return item.trim();
        })
        .join(', ');
};

const parseSessionPlanning = (schedule: string) => {
    let planning = schedule;
    let seanceCount = 0;
    try {
        const parsed = JSON.parse(schedule);
        planning = translateScheduleLabel(parsed.label);
        seanceCount = parsed.seances?.length || 0;
    } catch {
        planning = translateScheduleLabel(schedule);
    }
    return { planning, seanceCount };
};

export default function SessionsAdminPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [instructors, setInstructors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Session mutation controls stay hidden until the role is verified.
    const [isProfessor, setIsProfessor] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sessionFilter, setSessionFilter] = useState<'all' | 'open' | 'ongoing' | 'closed'>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        course_id: '',
        instructor_id: '',
        seats_available: '12',
        schedule: 'Temps plein',
        seanceCount: 1,
        seances: [{ date: '', start_time: '09:00', end_time: '17:00' }]
    });

    // Manifest State
    const [isManifestOpen, setIsManifestOpen] = useState(false);
    const [manifestStudents, setManifestStudents] = useState<any[]>([]);
    const [loadingManifest, setLoadingManifest] = useState(false);
    const [manifestSearch, setManifestSearch] = useState('');
    const [selectedSessionLabel, setSelectedSessionLabel] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [paymentStudent, setPaymentStudent] = useState<any | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNote, setPaymentNote] = useState('');
    const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
    const [savingPayment, setSavingPayment] = useState(false);

    // Manual Enrollment State
    const [isAddingStudent, setIsAddingStudent] = useState(false);
    const [allStudents, setAllStudents] = useState<any[]>([]);
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [enrollingStudentId, setEnrollingStudentId] = useState<string | null>(null);
    const [removingStudentId, setRemovingStudentId] = useState<string | null>(null);
    const [studentAddMode, setStudentAddMode] = useState<'existing' | 'new'>('existing');
    const [creatingStudent, setCreatingStudent] = useState(false);
    const [newStudentForm, setNewStudentForm] = useState({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        cin_number: '',
        amountPaid: '0'
    });

    useEffect(() => {
        fetchSessions();
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return;
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            const professor = profile?.role === 'professor';
            setIsProfessor(professor);
            if (!professor) fetchInitialData();
        });
    }, []);

    const fetchInitialData = async () => {
        try {
            const [coursesRes, instructorsRes] = await Promise.all([
                fetch('/api/admin/courses'),
                fetch('/api/admin/teachers')
            ]);
            const coursesData = await coursesRes.json();
            const instructorsData = await instructorsRes.json();
            setCourses(coursesData);
            setInstructors(instructorsData);
        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    };

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/sessions');
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setSessions(data);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSeanceCountChange = (count: number) => {
        const newSeances = [...formData.seances];
        if (count > newSeances.length) {
            for (let i = newSeances.length; i < count; i++) {
                newSeances.push({ date: '', start_time: '09:00', end_time: '17:00' });
            }
        } else {
            newSeances.splice(count);
        }
        setFormData({ ...formData, seanceCount: count, seances: newSeances });
    };

    const handleSeanceChange = (index: number, field: string, value: string) => {
        const newSeances = [...formData.seances];
        newSeances[index] = { ...newSeances[index], [field]: value };
        setFormData({ ...formData, seances: newSeances });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const url = '/api/admin/sessions';
            const method = editingSessionId ? 'PUT' : 'POST';
            const payload = { ...formData, seats_available: parseInt(formData.seats_available, 10), ...(editingSessionId ? { id: editingSessionId } : {}) };

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            await fetchSessions();
            setIsModalOpen(false);
            setCurrentStep(1);
            setEditingSessionId(null);
            setFormData({
                course_id: '',
                instructor_id: '',
                seats_available: '12',
                schedule: 'Temps plein',
                seanceCount: 1,
                seances: [{ date: '', start_time: '09:00', end_time: '17:00' }]
            });
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSession = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette session ? Cette action est irréversible.')) return;
        
        try {
            const response = await fetch(`/api/admin/sessions?id=${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            await fetchSessions();
        } catch (error: any) {
            alert(error.message);
        }
    };

    const handleEditClick = (session: Session) => {
        let parsedSchedule = { label: session.schedule, seances: [], instructor_id: '' };
        try {
            const p = JSON.parse(session.schedule);
            parsedSchedule = {
                label: translateScheduleLabel(p.label),
                seances: p.seances || [],
                instructor_id: p.instructor_id || ''
            };
        } catch (e) {
            // Legacy session or plain string
        }

        setEditingSessionId(session.id);
        setFormData({
            course_id: session.course_id,
            instructor_id: parsedSchedule.instructor_id || session.instructor_id || '',
            seats_available: String(session.seats_available ?? ''),
            schedule: parsedSchedule.label,
            seanceCount: parsedSchedule.seances.length || 1,
            seances: parsedSchedule.seances.length > 0 
                ? parsedSchedule.seances 
                : [{ date: session.start_date, start_time: '09:00', end_time: '17:00' }]
        });
        setCurrentStep(1);
        setIsModalOpen(true);
    };

    const handleViewManifest = async (session: Session) => {
        setSelectedSessionLabel(session.courses?.title_fr || 'Session');
        setSelectedSessionId(session.id);
        setIsManifestOpen(true);
        setManifestSearch('');
        setLoadingManifest(true);
        setIsAddingStudent(false); // Reset add mode
        try {
            const response = await fetch(`/api/admin/sessions/students?sessionId=${session.id}`);
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setManifestStudents(data);
        } catch (error) {
            console.error('Error fetching manifest:', error);
            alert('Impossible de charger la liste des étudiants.');
        } finally {
            setLoadingManifest(false);
        }
    };

    const fetchAllStudents = async () => {
        setLoadingStudents(true);
        try {
            const response = await fetch('/api/admin/students');
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setAllStudents(data);
        } catch (error) {
            console.error('Error fetching students:', error);
            alert('Impossible de charger la liste des étudiants.');
        } finally {
            setLoadingStudents(false);
        }
    };

    const refreshManifest = async () => {
        if (!selectedSessionId) return;

        const response = await fetch(`/api/admin/sessions/students?sessionId=${selectedSessionId}`);
        const data = await response.json();
        if (data.error) throw new Error(data.error);
        setManifestStudents(data);
    };

    const resetNewStudentForm = () => {
        setNewStudentForm({
            email: '',
            password: '',
            full_name: '',
            phone: '',
            cin_number: '',
            amountPaid: '0'
        });
    };

    const closeStudentPicker = () => {
        setStudentSearchQuery('');
        setStudentAddMode('existing');
        resetNewStudentForm();
        setIsAddingStudent(false);
    };

    const handleAddStudent = async (studentId: string) => {
        if (!selectedSessionId) return;
        setEnrollingStudentId(studentId);
        try {
            const response = await fetch('/api/admin/enrollments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: studentId, sessionId: selectedSessionId })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            await Promise.all([refreshManifest(), fetchSessions()]);
            setStudentSearchQuery('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setEnrollingStudentId(null);
        }
    };

    const handleCreateAndEnrollStudent = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedSessionId) return;

        const amountPaid = Number(newStudentForm.amountPaid);
        if (!Number.isFinite(amountPaid) || amountPaid < 0) {
            alert('Le montant payé doit être zéro ou plus.');
            return;
        }

        setCreatingStudent(true);
        try {
            const response = await fetch('/api/admin/enrollments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: selectedSessionId,
                    amountPaid,
                    newStudent: {
                        email: newStudentForm.email,
                        password: newStudentForm.password,
                        full_name: newStudentForm.full_name,
                        phone: newStudentForm.phone,
                        cin_number: newStudentForm.cin_number
                    }
                })
            });
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || 'Impossible de créer cet étudiant.');

            await Promise.all([refreshManifest(), fetchSessions(), fetchAllStudents()]);
            closeStudentPicker();
        } catch (error: unknown) {
            alert(error instanceof Error ? error.message : 'Impossible de créer cet étudiant.');
        } finally {
            setCreatingStudent(false);
        }
    };

    const handleRemoveStudent = async (student: any) => {
        if (!selectedSessionId) return;
        if (!confirm(`Retirer ${student.full_name} de cette session ? Son compte étudiant ne sera pas supprimé.`)) return;

        setRemovingStudentId(student.id);
        try {
            const response = await fetch('/api/admin/enrollments', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: student.id,
                    sessionId: selectedSessionId
                })
            });
            const data = await response.json();
            if (!response.ok || data.error) throw new Error(data.error || 'Impossible de retirer cet étudiant.');

            await Promise.all([refreshManifest(), fetchSessions()]);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setRemovingStudentId(null);
        }
    };

    const closePaymentModal = () => {
        setPaymentStudent(null);
        setPaymentAmount('');
        setPaymentNote('');
        setPaymentReceipt(null);
    };

    const handleSessionPayment = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!paymentStudent || !selectedSessionId) return;

        const amount = Number(paymentAmount);
        const alreadyPaid = Number(paymentStudent.amount_paid) || 0;
        const totalPrice = Number(paymentStudent.total_price) || 0;
        const remaining = Math.max(totalPrice - alreadyPaid, 0);

        if (!Number.isFinite(amount) || amount <= 0) {
            alert('Saisissez un montant supérieur à 0 DT.');
            return;
        }
        if (totalPrice > 0 && amount > remaining) {
            alert(`Le montant dépasse le reste à payer (${remaining.toLocaleString('fr-FR')} DT).`);
            return;
        }
        if (paymentReceipt && paymentReceipt.size > 10 * 1024 * 1024) {
            alert('Le reçu ne doit pas dépasser 10 Mo.');
            return;
        }

        setSavingPayment(true);
        try {
            let receiptUrl: string | null = null;

            if (paymentReceipt) {
                const extension = paymentReceipt.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'file';
                const uploadData = new FormData();
                uploadData.append('file', paymentReceipt);
                uploadData.append('bucket', 'receipts');
                uploadData.append('path', `receipts/admin_${paymentStudent.id}_${Date.now()}.${extension}`);

                const uploadResponse = await fetch('/api/admin/upload', {
                    method: 'POST',
                    body: uploadData,
                });
                const uploadResult = await uploadResponse.json();
                if (!uploadResponse.ok || uploadResult.error) {
                    throw new Error(uploadResult.error || 'Impossible de téléverser le reçu.');
                }
                receiptUrl = uploadResult.url;
            }

            const response = await fetch('/api/admin/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: paymentStudent.id,
                    sessionId: selectedSessionId,
                    amount,
                    note: paymentNote,
                    receiptUrl,
                }),
            });
            const result = await response.json();
            if (!response.ok || result.error) {
                throw new Error(result.error || 'Impossible d’enregistrer le paiement.');
            }

            closePaymentModal();
            try {
                await Promise.all([refreshManifest(), fetchSessions()]);
            } catch (refreshError) {
                console.error('Payment saved but refresh failed:', refreshError);
                alert('Le paiement est enregistré. Rechargez la page pour actualiser les montants.');
            }
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Impossible d’enregistrer le paiement.');
        } finally {
            setSavingPayment(false);
        }
    };

    const isSessionClosed = (session: Session) => {
        const endOfSession = new Date(session.end_date);
        endOfSession.setHours(23, 59, 59, 999);
        return new Date() > endOfSession;
    };

    const isSessionOngoing = (session: Session) => {
        const startOfSession = new Date(session.start_date);
        startOfSession.setHours(0, 0, 0, 0);
        const endOfSession = new Date(session.end_date);
        endOfSession.setHours(23, 59, 59, 999);
        const now = new Date();
        return now >= startOfSession && now <= endOfSession;
    };

    const searchedSessions = sessions.filter(s =>
        s.courses?.title_fr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.instructor?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredSessions = searchedSessions.filter(session =>
        sessionFilter === 'all'
        || (sessionFilter === 'open' && !isSessionClosed(session))
        || (sessionFilter === 'ongoing' && isSessionOngoing(session))
        || (sessionFilter === 'closed' && isSessionClosed(session))
    );

    const openSessionCount = sessions.filter(session => !isSessionClosed(session)).length;
    const ongoingSessionCount = sessions.filter(isSessionOngoing).length;
    const closedSessionCount = sessions.length - openSessionCount;

    const normalizedStudentSearch = studentSearchQuery.trim().toLowerCase();
    const normalizedPhoneSearch = studentSearchQuery.replace(/\D/g, '');
    const availableStudents = allStudents.filter(student => {
        const isAlreadyEnrolled = manifestStudents.some(enrolledStudent => enrolledStudent.id === student.id);
        const normalizedStudentPhone = String(student.phone || '').replace(/\D/g, '');
        const matchesPhone = normalizedPhoneSearch.length > 0 && normalizedStudentPhone.includes(normalizedPhoneSearch);
        const matchesIdentity = String(student.full_name || '').toLowerCase().includes(normalizedStudentSearch)
            || String(student.email || '').toLowerCase().includes(normalizedStudentSearch);

        return !isAlreadyEnrolled && (matchesIdentity || matchesPhone);
    });
    const newStudentPaidAmount = Number(newStudentForm.amountPaid);
    const newStudentIsUnpaid = newStudentForm.amountPaid === '' || (Number.isFinite(newStudentPaidAmount) && newStudentPaidAmount === 0);

    if (loading) {
        return <LoadingState label="Chargement des sessions…" />;
    }

    const openSessions = sessions.filter(s => new Date(s.start_date) > new Date()).length;
    const totalStudents = sessions.reduce((sum, s) => sum + s.stats.confirmed, 0);

    const normalizedManifestSearch = manifestSearch.trim().toLowerCase();
    const filteredManifestStudents = normalizedManifestSearch
        ? manifestStudents.filter(student =>
            [student.full_name, student.email, student.phone]
                .some(value => String(value || '').toLowerCase().includes(normalizedManifestSearch)))
        : manifestStudents;
    const manifestTotals = manifestStudents.reduce(
        (acc, student) => {
            const paid = Number(student.amount_paid || 0);
            const total = Number(student.total_price || 0);
            acc.paid += paid;
            acc.remaining += Math.max(total - paid, 0);
            if (total > 0 && paid >= total) acc.settled += 1;
            return acc;
        },
        { paid: 0, remaining: 0, settled: 0 }
    );

    const renderStudentStatusBadge = (student: any) => (
        student.status === 'approved'
            ? <Badge tone="success">Validé</Badge>
            : student.status === 'rejected'
                ? <Badge tone="danger">Refusé</Badge>
                : <Badge tone="warning">En attente</Badge>
    );

    const renderStudentPaymentButton = (student: any, extraClassName = '') => {
        const total = Number(student.total_price || 0);
        const paid = Number(student.amount_paid || 0);
        const hasRemaining = total > paid;
        return (
            <button
                type="button"
                onClick={() => {
                    setPaymentAmount('');
                    setPaymentNote('');
                    setPaymentReceipt(null);
                    setPaymentStudent(student);
                }}
                disabled={total > 0 && paid >= total}
                className={cn(
                    'group/pay block min-w-44 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-white',
                    extraClassName
                )}
                title={hasRemaining ? 'Ajouter un paiement' : 'Formation soldée'}
            >
                <span className="flex items-center justify-between gap-2">
                    <span className="whitespace-nowrap text-sm font-medium text-slate-900 tabular-nums">
                        {paid.toLocaleString('fr-FR')} <span className="text-slate-400">/</span> {formatDT(total)}
                    </span>
                    {hasRemaining && (
                        <Plus size={14} className="shrink-0 text-slate-400 transition-colors group-hover/pay:text-slate-700" />
                    )}
                </span>
                <ProgressBar value={paid} max={total} label="Progression du paiement" className="mt-1.5" />
                <span className={cn('mt-1 block whitespace-nowrap text-xs tabular-nums', hasRemaining ? 'text-rose-600' : 'text-emerald-700')}>
                    {hasRemaining ? `Reste : ${formatDT(Math.max(total - paid, 0))}` : 'Soldé'}
                </span>
            </button>
        );
    };

    const renderStudentRemoveButton = (student: any, extraClassName = '', compact = false) => {
        const label = student.has_financial_history
            ? 'Suppression impossible : cette inscription contient un paiement ou un justificatif.'
            : 'Retirer de la session';
        return (
            <button
                type="button"
                onClick={() => handleRemoveStudent(student)}
                disabled={removingStudentId === student.id || student.has_financial_history}
                aria-label={label}
                title={label}
                className={cn(
                    buttonClass(compact ? 'ghost' : 'secondary', compact ? 'md' : 'sm'),
                    compact && 'w-10 px-0',
                    student.has_financial_history
                        ? 'text-slate-400'
                        : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700',
                    extraClassName
                )}
            >
                {removingStudentId === student.id
                    ? <Loader2 size={16} className="animate-spin" />
                    : student.has_financial_history
                        ? <Lock size={16} />
                        : <Trash2 size={16} />}
                {!compact && (student.has_financial_history ? 'Paiement lié' : 'Retirer')}
            </button>
        );
    };

    const renderAvatar = (name?: string) => (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600" aria-hidden="true">
            {(name?.charAt(0) || 'E').toUpperCase()}
        </span>
    );

    const DEFAULT_SESSION_IMAGE = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=800&auto=format&fit=crop';

    const totalSeats = sessions.reduce((sum, s) => sum + (Number(s.seats_available) || 0), 0);
    const occupancyRate = totalSeats > 0 ? Math.round((totalStudents / totalSeats) * 100) : 0;

    const openCreateModal = () => {
        setEditingSessionId(null);
        setFormData({
            course_id: '',
            instructor_id: '',
            seats_available: '12',
            schedule: 'Temps plein',
            seanceCount: 1,
            seances: [{ date: '', start_time: '09:00', end_time: '17:00' }]
        });
        setCurrentStep(1);
        setIsModalOpen(true);
    };

    const formatSessionDate = (value: string, month: 'short' | 'long' = 'short') =>
        new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month, year: 'numeric' });

    const renderSessionStatusBadge = (session: Session) => {
        const closed = isSessionClosed(session);
        const ongoing = !closed && isSessionOngoing(session);
        if (closed) return <Badge>Terminée</Badge>;
        if (ongoing) return <Badge tone="success">En cours</Badge>;
        return <Badge tone="info">À venir</Badge>;
    };

    const renderOccupancy = (session: Session) => {
        const occupancy = Math.round((session.stats.confirmed / session.seats_available) * 100) || 0;
        const isFull = occupancy >= 100;
        return (
            <div className="min-w-0">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="whitespace-nowrap text-slate-500 tabular-nums">
                        <span className="font-medium text-slate-900">{session.stats.confirmed}</span> / {session.seats_available} places
                    </span>
                    <span className={cn('font-medium tabular-nums', isFull ? 'text-emerald-700' : 'text-slate-500')}>{isFull ? 'Complet' : `${occupancy}%`}</span>
                </div>
                <ProgressBar value={session.stats.confirmed} max={Number(session.seats_available) || 0} label="Taux de remplissage" />
                {session.stats.pending > 0 && (
                    <p className="mt-1 text-xs text-amber-700 tabular-nums">{session.stats.pending} en attente de validation</p>
                )}
            </div>
        );
    };

    const renderSessionActions = (session: Session) => (
        <>
            <IconButton icon={Edit2} label="Modifier la session" onClick={() => handleEditClick(session)} />
            <IconButton icon={Trash2} label="Supprimer la session" onClick={() => handleDeleteSession(session.id)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" />
        </>
    );

    const steps = [
        { id: 1, label: editingSessionId ? 'Modifier' : 'Informations' },
        { id: 2, label: 'Nombre de séances' },
        { id: 3, label: 'Calendrier' },
    ];

    const dtSuffix = <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">DT</span>;

    const closeManifest = () => {
        closeStudentPicker();
        setIsManifestOpen(false);
    };

    return (
        <div className="space-y-6 pb-6 md:pb-12">
            <PageHeader
                title="Sessions et calendrier"
                description="Planifiez les sessions, suivez le remplissage et gérez les étudiants inscrits."
                actions={!isProfessor ? (
                    <Button variant="primary" icon={Plus} onClick={openCreateModal} className="max-md:w-full">
                        Nouvelle session
                    </Button>
                ) : undefined}
            />

            {!isProfessor && (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <StatCard label="Sessions à venir" value={openSessions} icon={Clock} />
                    <StatCard label="Étudiants inscrits" value={totalStudents} icon={Users} />
                    <div className="col-span-2 md:col-span-1">
                        <StatCard label="Taux d’occupation" value={`${occupancyRate}%`} icon={Briefcase} />
                    </div>
                </div>
            )}

            <Card padded={false}>
                <Toolbar>
                    <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Formation ou instructeur…"
                            label="Rechercher une session"
                        />
                        <FilterTabs
                            label="Filtrer les sessions"
                            value={sessionFilter}
                            onChange={setSessionFilter}
                            options={[
                                { value: 'all', label: 'Toutes', count: sessions.length },
                                { value: 'open', label: 'Ouvertes', count: openSessionCount },
                                { value: 'ongoing', label: 'En cours', count: ongoingSessionCount },
                                { value: 'closed', label: 'Fermées', count: closedSessionCount },
                            ]}
                        />
                    </div>
                    <div className="shrink-0">
                        <FilterTabs
                            label="Mode d’affichage"
                            value={viewMode}
                            onChange={setViewMode}
                            options={[
                                { value: 'grid', label: <><LayoutGrid size={16} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Cartes</span></> },
                                { value: 'list', label: <><List size={16} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Tableau</span></> },
                            ]}
                        />
                    </div>
                </Toolbar>

                {/* List view */}
                {viewMode === 'list' && filteredSessions.length > 0 && (
                    <>
                        <div className="divide-y divide-slate-100 md:hidden">
                            {filteredSessions.map((session) => {
                                const { planning, seanceCount } = parseSessionPlanning(session.schedule);
                                return (
                                    <div key={session.id} className="p-4">
                                        <div className="flex items-start gap-3">
                                            <img src={session.courses?.image_url || DEFAULT_SESSION_IMAGE} alt="" className="h-10 w-12 shrink-0 rounded-md bg-slate-100 object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-2 font-medium leading-snug text-slate-900">{session.courses?.title_fr}</p>
                                                <p className="mt-0.5 text-xs text-slate-500">{translateCategory(session.courses?.category)}</p>
                                            </div>
                                            <div className="shrink-0">{renderSessionStatusBadge(session)}</div>
                                        </div>
                                        <dl className="mt-3 space-y-1.5 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <dt className="shrink-0 text-slate-500">Instructeur</dt>
                                                <dd className="min-w-0 truncate text-right text-slate-900">{session.instructor?.full_name || 'Non assigné'}</dd>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <dt className="shrink-0 text-slate-500">Date de début</dt>
                                                <dd className="text-slate-900 tabular-nums">{formatSessionDate(session.start_date)}</dd>
                                            </div>
                                            <div className="flex items-center justify-between gap-3">
                                                <dt className="shrink-0 text-slate-500">Calendrier</dt>
                                                <dd className="min-w-0 text-right text-slate-900">{planning}{seanceCount > 0 && <span className="ml-1.5 text-xs text-slate-500">· {seanceCount} séance{seanceCount > 1 ? 's' : ''}</span>}</dd>
                                            </div>
                                        </dl>
                                        <div className="mt-3">{renderOccupancy(session)}</div>
                                        <div className="mt-3 flex gap-2">
                                            <Button size="sm" icon={Users} onClick={() => handleViewManifest(session)} className="flex-1">Inscrits</Button>
                                            {!isProfessor && renderSessionActions(session)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className={cn(table.wrapper, 'hidden md:block')}>
                            <table className={cn(table.table, 'min-w-[960px]')}>
                                <thead className={table.thead}>
                                    <tr>
                                        <th className={table.th}>Formation</th>
                                        <th className={table.th}>Instructeur</th>
                                        <th className={table.th}>Début</th>
                                        <th className={table.th}>Statut</th>
                                        <th className={table.th}>Calendrier</th>
                                        <th className={table.th}>Inscriptions</th>
                                        <th className={cn(table.th, 'text-right')}><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className={table.tbody}>
                                    {filteredSessions.map((session) => {
                                        const { planning, seanceCount } = parseSessionPlanning(session.schedule);
                                        return (
                                            <tr key={session.id} className={table.tr}>
                                                <td className={table.td}>
                                                    <div className="flex min-w-[260px] items-center gap-3">
                                                        <img src={session.courses?.image_url || DEFAULT_SESSION_IMAGE} alt="" className="h-9 w-12 shrink-0 rounded-md bg-slate-100 object-cover" />
                                                        <div className="min-w-0">
                                                            <p className="max-w-xs font-medium leading-snug text-slate-900">{session.courses?.title_fr}</p>
                                                            <p className="mt-0.5 text-xs text-slate-500">{translateCategory(session.courses?.category)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={table.td}>{session.instructor?.full_name || <span className="text-slate-400">Non assigné</span>}</td>
                                                <td className={cn(table.td, 'whitespace-nowrap tabular-nums')}>{formatSessionDate(session.start_date)}</td>
                                                <td className={table.td}>{renderSessionStatusBadge(session)}</td>
                                                <td className={table.td}>
                                                    <p className="text-slate-900">{planning}</p>
                                                    {seanceCount > 0 && <p className="mt-0.5 text-xs text-slate-500 tabular-nums">{seanceCount} séance{seanceCount > 1 ? 's' : ''}</p>}
                                                </td>
                                                <td className={table.td}><div className="w-44">{renderOccupancy(session)}</div></td>
                                                <td className={table.td}>
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="sm" variant="ghost" icon={Users} onClick={() => handleViewManifest(session)}>Inscrits</Button>
                                                        {!isProfessor && renderSessionActions(session)}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Grid view */}
                {viewMode === 'grid' && filteredSessions.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
                        {filteredSessions.map((session) => {
                            const { planning, seanceCount } = parseSessionPlanning(session.schedule);
                            return (
                                <article
                                    key={session.id}
                                    className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300"
                                >
                                    <div className="flex items-start gap-3">
                                        <img
                                            src={session.courses?.image_url || DEFAULT_SESSION_IMAGE}
                                            alt=""
                                            className="h-11 w-11 shrink-0 rounded-md bg-slate-100 object-cover"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <h2 className="text-sm font-semibold leading-snug text-slate-900">
                                                {session.courses?.title_fr}
                                            </h2>
                                            <p className="mt-0.5 text-xs text-slate-500">{translateCategory(session.courses?.category)}</p>
                                        </div>
                                        <div className="shrink-0">{renderSessionStatusBadge(session)}</div>
                                    </div>

                                    <dl className="mt-4 space-y-1.5 text-sm">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon size={14} className="shrink-0 text-slate-400" />
                                            <dt className="sr-only">Dates</dt>
                                            <dd className="text-slate-700 tabular-nums">
                                                {formatSessionDate(session.start_date)} → {formatSessionDate(session.end_date)}
                                            </dd>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={14} className="shrink-0 text-slate-400" />
                                            <dt className="sr-only">Calendrier</dt>
                                            <dd className="text-slate-700">
                                                {planning}
                                                {seanceCount > 0 && <span className="text-slate-500 tabular-nums"> · {seanceCount} séance{seanceCount > 1 ? 's' : ''}</span>}
                                            </dd>
                                        </div>
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Briefcase size={14} className="shrink-0 text-slate-400" />
                                            <dt className="sr-only">Instructeur</dt>
                                            <dd className="truncate text-slate-700">{session.instructor?.full_name || 'Instructeur non assigné'}</dd>
                                        </div>
                                    </dl>

                                    <div className="mt-4">{renderOccupancy(session)}</div>

                                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                                        <Button size="sm" variant="secondary" icon={Users} onClick={() => handleViewManifest(session)}>
                                            Voir les inscrits
                                        </Button>
                                        {!isProfessor && (
                                            <div className="flex shrink-0 gap-1">{renderSessionActions(session)}</div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {filteredSessions.length === 0 && (
                    <EmptyState
                        icon={CalendarIcon}
                        title={sessions.length === 0 ? 'Aucune session planifiée' : 'Aucune session correspondante'}
                        description={sessions.length === 0
                            ? 'Les sessions planifiées apparaîtront ici.'
                            : 'Modifiez la recherche ou le filtre pour afficher d’autres sessions.'}
                        action={sessions.length === 0 && !isProfessor ? (
                            <Button variant="primary" icon={Plus} onClick={openCreateModal}>Nouvelle session</Button>
                        ) : sessions.length > 0 ? (
                            <Button icon={X} onClick={() => { setSearchQuery(''); setSessionFilter('all'); }}>Réinitialiser les filtres</Button>
                        ) : undefined}
                    />
                )}
            </Card>

            {/* NEW / EDIT SESSION MODAL */}
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSessionId ? 'Modifier la session' : 'Nouvelle session'}
                size="lg"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            icon={currentStep > 1 ? ChevronLeft : undefined}
                            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : setIsModalOpen(false)}
                        >
                            {currentStep === 1 ? 'Annuler' : 'Précédent'}
                        </Button>
                        {currentStep < 3 ? (
                            <Button
                                variant="primary"
                                onClick={() => setCurrentStep(currentStep + 1)}
                                disabled={currentStep === 1 && !formData.course_id}
                                title={currentStep === 1 && !formData.course_id ? 'Sélectionnez une formation pour continuer' : undefined}
                            >
                                Étape suivante <ArrowRight size={16} />
                            </Button>
                        ) : (
                            <Button
                                variant="primary"
                                icon={editingSessionId ? Check : Plus}
                                loading={isSubmitting}
                                onClick={handleSubmit}
                            >
                                {isSubmitting ? 'Enregistrement…' : (editingSessionId ? 'Enregistrer les modifications' : 'Créer la session')}
                            </Button>
                        )}
                    </>
                }
            >
                <ol className="mb-5 grid grid-cols-3 gap-2" aria-label="Étapes">
                    {steps.map((step) => {
                        const isCurrent = currentStep === step.id;
                        const isDone = currentStep > step.id;
                        return (
                            <li key={step.id} aria-current={isCurrent ? 'step' : undefined} className="min-w-0">
                                <div className={cn('h-1 rounded-full', isDone || isCurrent ? 'bg-slate-900' : 'bg-slate-200')} />
                                <div className="mt-2 flex items-center gap-1.5">
                                    <span className={cn(
                                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                                        isDone ? 'bg-emerald-600 text-[#fff]' : isCurrent ? 'bg-slate-900 text-[#fff]' : 'bg-slate-100 text-slate-500'
                                    )}>
                                        {isDone ? <Check size={12} /> : step.id}
                                    </span>
                                    <span className={cn('truncate text-xs font-medium', isCurrent ? 'text-slate-900' : 'text-slate-500')}>{step.label}</span>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {currentStep === 1 && (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field
                                label="Formation"
                                htmlFor="session-course"
                                required
                                hint={!formData.course_id ? 'Requise pour passer à l’étape suivante.' : undefined}
                                className="sm:col-span-2"
                            >
                                <select
                                    id="session-course"
                                    required
                                    value={formData.course_id}
                                    onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                                    className={selectClass}
                                >
                                    <option value="">Sélectionner une formation</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>{c.title_fr}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Instructeur" htmlFor="session-instructor" hint="Optionnel, peut être assigné plus tard.">
                                <select
                                    id="session-instructor"
                                    value={formData.instructor_id}
                                    onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                                    className={selectClass}
                                >
                                    <option value="">Non assigné</option>
                                    {instructors.map(i => (
                                        <option key={i.id} value={i.id}>{i.nom} {i.prenom}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Places disponibles" htmlFor="session-seats" required hint="Nombre maximum d’étudiants.">
                                <input
                                    id="session-seats"
                                    type="number"
                                    required
                                    value={formData.seats_available}
                                    onChange={(e) => setFormData({ ...formData, seats_available: e.target.value })}
                                    className={`${inputClass} tabular-nums`}
                                    placeholder="Ex. : 12"
                                />
                            </Field>
                            <Field label="Rythme global" htmlFor="session-rhythm" hint="Libellé affiché pour décrire le rythme de la session." className="sm:col-span-2">
                                <input
                                    id="session-rhythm"
                                    type="text"
                                    value={formData.schedule}
                                    onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                                    className={inputClass}
                                    placeholder="Ex. : Temps plein / Week-end"
                                />
                            </Field>
                        </div>
                    )}

                    {currentStep === 2 && (
                        <div className="py-4 text-center md:py-6">
                            <p id="seance-count-label" className="text-sm font-medium text-slate-700">Nombre de séances à planifier</p>
                            <div className="mt-4 flex items-center justify-center gap-6" role="group" aria-labelledby="seance-count-label">
                                <IconButton
                                    variant="secondary"
                                    icon={Minus}
                                    label="Retirer une séance"
                                    title={formData.seanceCount <= 1 ? 'Au moins une séance est nécessaire' : 'Retirer une séance'}
                                    onClick={() => handleSeanceCountChange(Math.max(1, formData.seanceCount - 1))}
                                    disabled={formData.seanceCount <= 1}
                                    className="h-11 w-11"
                                />
                                <span className="min-w-16 text-4xl font-bold tracking-tight text-slate-900 tabular-nums" aria-live="polite">{formData.seanceCount}</span>
                                <IconButton
                                    variant="secondary"
                                    icon={Plus}
                                    label="Ajouter une séance"
                                    onClick={() => handleSeanceCountChange(formData.seanceCount + 1)}
                                    className="h-11 w-11"
                                />
                            </div>
                            <p className="mx-auto mt-4 max-w-xs text-sm text-slate-500">Définit le nombre total de rencontres en présentiel. Vous préciserez les dates à l’étape suivante.</p>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="space-y-3">
                            {formData.seances.map((seance, index) => (
                                <fieldset key={index} className="rounded-lg border border-slate-200 p-4">
                                    <legend className="sr-only">Séance {index + 1}</legend>
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <span className="text-sm font-semibold text-slate-900">Séance {index + 1}</span>
                                        {seance.date && (
                                            <span className="text-xs text-slate-500 tabular-nums">{new Date(seance.date).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        <Field label="Date" htmlFor={`seance-${index}-date`} required className="col-span-2 min-w-0 sm:col-span-1">
                                            <input
                                                id={`seance-${index}-date`}
                                                type="date"
                                                required
                                                value={seance.date}
                                                onChange={(e) => handleSeanceChange(index, 'date', e.target.value)}
                                                className={`${inputClass} min-w-0 tabular-nums`}
                                            />
                                        </Field>
                                        <Field label="Heure de début" htmlFor={`seance-${index}-start`} required className="min-w-0">
                                            <input
                                                id={`seance-${index}-start`}
                                                type="time"
                                                required
                                                value={seance.start_time}
                                                onChange={(e) => handleSeanceChange(index, 'start_time', e.target.value)}
                                                className={`${inputClass} min-w-0 tabular-nums`}
                                            />
                                        </Field>
                                        <Field label="Heure de fin" htmlFor={`seance-${index}-end`} required className="min-w-0">
                                            <input
                                                id={`seance-${index}-end`}
                                                type="time"
                                                required
                                                value={seance.end_time}
                                                onChange={(e) => handleSeanceChange(index, 'end_time', e.target.value)}
                                                className={`${inputClass} min-w-0 tabular-nums`}
                                            />
                                        </Field>
                                    </div>
                                </fieldset>
                            ))}
                        </div>
                    )}
                </form>
            </Modal>

            {/* SESSION MANIFEST DIALOG — custom structure (hosts stacked dialogs), styled like Modal */}
            <AnimatePresence>
                {isManifestOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="manifest-title">
                        <motion.div
                            className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 8 }}
                            transition={{ duration: 0.15 }}
                            className="relative flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                                <div className="min-w-0">
                                    <h2 id="manifest-title" className="line-clamp-2 text-base font-semibold text-slate-900" title={selectedSessionLabel}>
                                        {selectedSessionLabel}
                                    </h2>
                                    <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                                        {manifestStudents.length} étudiant{manifestStudents.length > 1 ? 's' : ''} inscrit{manifestStudents.length > 1 ? 's' : ''}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        icon={Plus}
                                        aria-label="Ajouter un étudiant"
                                        onClick={() => {
                                            fetchAllStudents();
                                            setStudentSearchQuery('');
                                            setStudentAddMode('existing');
                                            resetNewStudentForm();
                                            setIsAddingStudent(true);
                                        }}
                                    >
                                        <span className="hidden md:inline">Ajouter un étudiant</span>
                                        <span className="md:hidden">Ajouter</span>
                                    </Button>
                                    <IconButton label="Fermer" icon={X} onClick={closeManifest} className="-mr-2" />
                                </div>
                            </div>

                            {/* Summary + search */}
                            {!loadingManifest && manifestStudents.length > 0 && (
                                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 px-5 py-3 md:flex-row md:items-center md:justify-between">
                                    {!isProfessor ? (
                                        <dl className="grid grid-cols-3 gap-4 md:flex md:gap-8">
                                            <div>
                                                <dt className="text-xs text-slate-500">Encaissé</dt>
                                                <dd className="text-sm font-semibold text-emerald-700 tabular-nums">{formatDT(manifestTotals.paid)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-slate-500">Reste à percevoir</dt>
                                                <dd className="text-sm font-semibold text-rose-600 tabular-nums">{formatDT(manifestTotals.remaining)}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-slate-500">Soldés</dt>
                                                <dd className="text-sm font-semibold text-slate-900 tabular-nums">{manifestTotals.settled} / {manifestStudents.length}</dd>
                                            </div>
                                        </dl>
                                    ) : <div />}
                                    <SearchInput
                                        value={manifestSearch}
                                        onChange={setManifestSearch}
                                        placeholder="Nom, email ou téléphone…"
                                        label="Rechercher un étudiant"
                                    />
                                </div>
                            )}

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {loadingManifest ? (
                                    <LoadingState label="Chargement des inscrits…" />
                                ) : manifestStudents.length > 0 && filteredManifestStudents.length === 0 ? (
                                    <EmptyState
                                        icon={Search}
                                        title="Aucun résultat"
                                        description={`Aucun étudiant ne correspond à « ${manifestSearch} ».`}
                                    />
                                ) : manifestStudents.length > 0 ? (
                                    <>
                                        <div className="divide-y divide-slate-100 md:hidden">
                                            {filteredManifestStudents.map((student) => (
                                                <div key={student.id} className="p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex min-w-0 items-center gap-3">
                                                            {renderAvatar(student.full_name)}
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-medium text-slate-900">{student.full_name}</p>
                                                                <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                                                                    Inscrit le {new Date(student.enrolled_at).toLocaleDateString('fr-FR')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="shrink-0">{renderStudentStatusBadge(student)}</div>
                                                    </div>
                                                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                                                        <p className="flex min-w-0 items-center gap-2">
                                                            <Mail size={12} className="shrink-0 text-slate-400" /> <span className="break-all">{student.email}</span>
                                                        </p>
                                                        <p className="flex items-center gap-2 tabular-nums">
                                                            <Phone size={12} className="shrink-0 text-slate-400" /> {student.phone}
                                                        </p>
                                                    </div>
                                                    <div className="mt-3 flex flex-col gap-2">
                                                        {!isProfessor && renderStudentPaymentButton(student, 'w-full')}
                                                        {renderStudentRemoveButton(student, 'w-full')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <table className={cn(table.table, 'hidden md:table')}>
                                            <thead className={table.thead}>
                                                <tr>
                                                    <th className={table.th}>Étudiant</th>
                                                    <th className={table.th}>Coordonnées</th>
                                                    <th className={table.th}>Statut</th>
                                                    {!isProfessor && <th className={table.th}>Paiement</th>}
                                                    <th className={cn(table.th, 'text-right')}><span className="sr-only">Actions</span></th>
                                                </tr>
                                            </thead>
                                            <tbody className={table.tbody}>
                                                {filteredManifestStudents.map((student) => (
                                                    <tr key={student.id} className={table.tr}>
                                                        <td className={table.td}>
                                                            <div className="flex min-w-[12rem] items-center gap-3">
                                                                {renderAvatar(student.full_name)}
                                                                <div className="min-w-0">
                                                                    <p className="font-medium leading-snug text-slate-900">{student.full_name}</p>
                                                                    <p className="mt-0.5 whitespace-nowrap text-xs text-slate-500 tabular-nums">
                                                                        Inscrit le {new Date(student.enrolled_at).toLocaleDateString('fr-FR')}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={table.td}>
                                                            <div className="flex min-w-0 flex-col gap-1 text-xs">
                                                                <a href={`mailto:${student.email}`} className="flex items-center gap-2 break-all text-slate-600 hover:text-slate-900">
                                                                    <Mail size={12} className="shrink-0 text-slate-400" /> {student.email}
                                                                </a>
                                                                {student.phone && student.phone !== 'N/A' ? (
                                                                    <a href={`tel:${student.phone}`} className="flex items-center gap-2 whitespace-nowrap text-slate-600 tabular-nums hover:text-slate-900">
                                                                        <Phone size={12} className="shrink-0 text-slate-400" /> {student.phone}
                                                                    </a>
                                                                ) : (
                                                                    <span className="flex items-center gap-2 text-slate-400">
                                                                        <Phone size={12} className="shrink-0" /> Non renseigné
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className={table.td}>{renderStudentStatusBadge(student)}</td>
                                                        {!isProfessor && (
                                                            <td className={table.td}>{renderStudentPaymentButton(student)}</td>
                                                        )}
                                                        <td className={cn(table.td, 'text-right')}>
                                                            {renderStudentRemoveButton(student, '', true)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </>
                                ) : (
                                    <EmptyState icon={Users} title="Aucun étudiant inscrit à cette session" />
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-5 py-3">
                                <p className="text-sm text-slate-500 tabular-nums">
                                    {normalizedManifestSearch
                                        ? <>Affichés : <span className="font-medium text-slate-900">{filteredManifestStudents.length}</span> / {manifestStudents.length}</>
                                        : <>Total inscrits : <span className="font-medium text-slate-900">{manifestStudents.length}</span></>}
                                </p>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setIsAddingStudent(false);
                                        setIsManifestOpen(false);
                                    }}
                                >
                                    Fermer
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SESSION PAYMENT MODAL - ADMIN ONLY */}
            {(() => {
                const open = Boolean(paymentStudent) && !isProfessor;
                const paymentTotal = Number(paymentStudent?.total_price || 0);
                const paymentPaid = Number(paymentStudent?.amount_paid || 0);
                const paymentRemaining = Math.max(paymentTotal - paymentPaid, 0);
                return (
                    <Modal
                        open={open}
                        onClose={closePaymentModal}
                        title="Ajouter un paiement"
                        description={paymentStudent ? <>{paymentStudent.full_name} · {selectedSessionLabel}</> : undefined}
                        size="md"
                        footer={
                            <>
                                <Button variant="secondary" onClick={closePaymentModal}>Annuler</Button>
                                <Button
                                    type="submit"
                                    form="session-payment-form"
                                    variant="primary"
                                    icon={Check}
                                    loading={savingPayment}
                                    disabled={!paymentAmount}
                                    title={!paymentAmount ? 'Saisissez un montant pour enregistrer' : undefined}
                                >
                                    Enregistrer le paiement
                                </Button>
                            </>
                        }
                    >
                        <form id="session-payment-form" onSubmit={handleSessionPayment} className="space-y-5">
                            <div className="rounded-lg border border-slate-200 p-4">
                                <dl className="grid grid-cols-3 gap-2">
                                    <div>
                                        <dt className="text-xs text-slate-500">Prix total</dt>
                                        <dd className="mt-0.5 text-sm font-semibold text-slate-900 tabular-nums">{formatDT(paymentTotal)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">Déjà payé</dt>
                                        <dd className="mt-0.5 text-sm font-semibold text-emerald-700 tabular-nums">{formatDT(paymentPaid)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-slate-500">Reste</dt>
                                        <dd className="mt-0.5 text-sm font-semibold text-rose-600 tabular-nums">{formatDT(paymentRemaining)}</dd>
                                    </div>
                                </dl>
                                <ProgressBar value={paymentPaid} max={paymentTotal} label="Progression du paiement" className="mt-3" />
                            </div>

                            <Field label="Montant reçu" htmlFor="session-payment-amount" required>
                                <div className="relative">
                                    <input
                                        id="session-payment-amount"
                                        required
                                        autoFocus
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        max={paymentRemaining || undefined}
                                        value={paymentAmount}
                                        onChange={(event) => setPaymentAmount(event.target.value)}
                                        placeholder="Exemple : 100"
                                        aria-describedby="session-payment-amount-help"
                                        className={`${inputClass} pr-12 tabular-nums`}
                                    />
                                    {dtSuffix}
                                </div>
                                <div id="session-payment-amount-help" className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                                    <span>Maximum : <span className="font-medium text-slate-700 tabular-nums">{formatDT(paymentRemaining)}</span></span>
                                    {paymentRemaining > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setPaymentAmount(String(paymentRemaining))}
                                            className="text-xs font-medium text-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                        >
                                            Solder le reste
                                        </button>
                                    )}
                                </div>
                            </Field>

                            <Field label={<>Reçu de paiement <span className="font-normal text-slate-500">(facultatif)</span></>}>
                                <label className={cn(
                                    'flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3.5 transition-colors focus-within:ring-2 focus-within:ring-brand-green/30',
                                    paymentReceipt ? 'border-slate-300 bg-white' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                                )}>
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        className="sr-only"
                                        onChange={(event) => setPaymentReceipt(event.target.files?.[0] || null)}
                                    />
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                        <Upload size={16} />
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm font-medium text-slate-900">
                                            {paymentReceipt ? paymentReceipt.name : 'Cliquer pour ajouter le reçu'}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-slate-500">JPG, PNG, WEBP ou PDF · maximum 10 Mo</span>
                                    </span>
                                </label>
                            </Field>

                            <Field label="Remarque" htmlFor="session-payment-note">
                                <textarea
                                    id="session-payment-note"
                                    rows={3}
                                    maxLength={2000}
                                    value={paymentNote}
                                    onChange={(event) => setPaymentNote(event.target.value)}
                                    placeholder="Exemple : paiement en espèces…"
                                    className={cn(textareaClass, 'resize-none')}
                                />
                            </Field>
                        </form>
                    </Modal>
                );
            })()}

            {/* STUDENT PICKER MODAL */}
            <Modal
                open={isManifestOpen && isAddingStudent}
                onClose={() => { if (!creatingStudent) closeStudentPicker(); }}
                title={studentAddMode === 'existing' ? 'Ajouter un étudiant' : 'Recruter un nouvel étudiant'}
                description={selectedSessionLabel}
                size="lg"
                footer={studentAddMode === 'existing' ? (
                    <>
                        <p className="text-sm text-slate-500 tabular-nums sm:mr-auto">
                            <span className="font-medium text-slate-900">{availableStudents.length}</span> étudiant(s) disponible(s)
                        </p>
                        <Button variant="secondary" onClick={closeStudentPicker}>Fermer</Button>
                    </>
                ) : (
                    <>
                        <Button variant="secondary" onClick={closeStudentPicker} disabled={creatingStudent}>Annuler</Button>
                        <Button type="submit" form="new-student-form" variant="primary" icon={Plus} loading={creatingStudent}>
                            Créer et inscrire
                        </Button>
                    </>
                )}
            >
                <div className="-mx-5 -mt-4 space-y-3 border-b border-slate-200 bg-slate-50/60 px-5 py-3">
                    <FilterTabs
                        label="Type d’ajout"
                        value={studentAddMode}
                        onChange={(mode) => { if (!creatingStudent) setStudentAddMode(mode); }}
                        options={[
                            { value: 'existing', label: 'Étudiant existant' },
                            { value: 'new', label: 'Nouvel étudiant' },
                        ]}
                    />
                    {studentAddMode === 'existing' && (
                        <SearchInput
                            value={studentSearchQuery}
                            onChange={setStudentSearchQuery}
                            placeholder="Rechercher par nom, e-mail ou téléphone…"
                            label="Rechercher un étudiant"
                            className="sm:w-full"
                        />
                    )}
                </div>

                {studentAddMode === 'existing' ? (
                    <div className="-mx-5 -mb-4">
                        {loadingStudents ? (
                            <LoadingState label="Chargement des étudiants…" />
                        ) : availableStudents.length > 0 ? (
                            <ul className="divide-y divide-slate-100">
                                {availableStudents.map(student => (
                                    <li key={student.id} className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50/70">
                                        <div className="flex min-w-0 items-center gap-3">
                                            {renderAvatar(student.full_name)}
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-slate-900">{student.full_name || 'Sans nom'}</p>
                                                <p className="truncate text-xs text-slate-500">
                                                    {student.email || 'E-mail indisponible'}
                                                    <span className="text-slate-300"> · </span>
                                                    <span className="tabular-nums">{student.phone || 'Téléphone indisponible'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            icon={Plus}
                                            loading={enrollingStudentId === student.id}
                                            onClick={() => handleAddStudent(student.id)}
                                            disabled={enrollingStudentId !== null}
                                            aria-label={`Ajouter ${student.full_name || 'cet étudiant'} à la session`}
                                            className="shrink-0"
                                        >
                                            Ajouter
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={Users}
                                title="Aucun étudiant disponible"
                                description={studentSearchQuery.trim()
                                    ? `Aucun étudiant non inscrit ne correspond à « ${studentSearchQuery} ».`
                                    : 'Tous les étudiants correspondants sont déjà inscrits à cette session.'}
                                action={<Button icon={Plus} onClick={() => setStudentAddMode('new')}>Créer un nouvel étudiant</Button>}
                            />
                        )}
                    </div>
                ) : (
                    <form id="new-student-form" onSubmit={handleCreateAndEnrollStudent} className="space-y-6 pt-4">
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-slate-900">Compte</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="E-mail (identifiant)" htmlFor="new-student-email" required hint="Servira d’identifiant de connexion.">
                                    <div className="relative">
                                        <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            id="new-student-email"
                                            type="email"
                                            required
                                            autoFocus
                                            value={newStudentForm.email}
                                            onChange={(e) => setNewStudentForm(prev => ({ ...prev, email: e.target.value }))}
                                            placeholder="exemple@email.com"
                                            className={`${inputClass} pl-9`}
                                        />
                                    </div>
                                </Field>
                                <Field label="Mot de passe" htmlFor="new-student-password" required hint="6 caractères minimum.">
                                    <input
                                        id="new-student-password"
                                        type="text"
                                        required
                                        minLength={6}
                                        value={newStudentForm.password}
                                        onChange={(e) => setNewStudentForm(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="••••••••"
                                        className={inputClass}
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-slate-100 pt-5">
                            <h3 className="text-sm font-semibold text-slate-900">Identité</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <Field label="Nom complet" htmlFor="new-student-name" required className="sm:col-span-2">
                                    <input
                                        id="new-student-name"
                                        type="text"
                                        required
                                        value={newStudentForm.full_name}
                                        onChange={(e) => setNewStudentForm(prev => ({ ...prev, full_name: e.target.value }))}
                                        placeholder="Nom & Prénom"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Téléphone" htmlFor="new-student-phone">
                                    <div className="relative">
                                        <Phone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            id="new-student-phone"
                                            type="tel"
                                            value={newStudentForm.phone}
                                            onChange={(e) => setNewStudentForm(prev => ({ ...prev, phone: e.target.value }))}
                                            placeholder="55 123 456"
                                            className={`${inputClass} pl-9 tabular-nums`}
                                        />
                                    </div>
                                </Field>
                                <Field label="Numéro CIN" htmlFor="new-student-cin">
                                    <input
                                        id="new-student-cin"
                                        type="text"
                                        value={newStudentForm.cin_number}
                                        onChange={(e) => setNewStudentForm(prev => ({ ...prev, cin_number: e.target.value }))}
                                        placeholder="00123456"
                                        className={`${inputClass} tabular-nums`}
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-slate-100 pt-5">
                            <h3 className="text-sm font-semibold text-slate-900">Paiement</h3>
                            <Field label="Montant payé dans cette session" htmlFor="new-student-amount" required hint="Saisissez 0 si l’étudiant n’a encore rien versé.">
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                                    <div className="relative">
                                        <CreditCard className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            id="new-student-amount"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            required
                                            value={newStudentForm.amountPaid}
                                            onChange={(e) => setNewStudentForm(prev => ({ ...prev, amountPaid: e.target.value }))}
                                            className={`${inputClass} pl-9 pr-12 tabular-nums`}
                                        />
                                        {dtSuffix}
                                    </div>
                                    <label className={cn(
                                        'inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-brand-green/30',
                                        newStudentIsUnpaid ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-white text-slate-700'
                                    )}>
                                        <input
                                            type="checkbox"
                                            checked={newStudentIsUnpaid}
                                            onChange={() => setNewStudentForm(prev => ({ ...prev, amountPaid: '0' }))}
                                            className="h-4 w-4 accent-slate-900"
                                        />
                                        Non payé
                                    </label>
                                </div>
                            </Field>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
}
