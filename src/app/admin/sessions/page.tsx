"use client";

import React, { useEffect, useState } from 'react';
import {
    Calendar as CalendarIcon,
    Search,
    Plus,
    Users,
    Clock,
    MoreVertical,
    Loader2,
    Calendar,
    ChevronRight,
    MapPin,
    ArrowRight,
    Edit2,
    Trash2,
    Check,
    Filter,
    LayoutGrid,
    List,
    AlertCircle,
    CheckCircle2,
    Briefcase,
    Mail,
    Phone,
    X,
    CreditCard,
    Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function SessionsAdminPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [instructors, setInstructors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Session mutation controls stay hidden until the role is verified.
    const [isProfessor, setIsProfessor] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [sessionFilter, setSessionFilter] = useState<'all' | 'open' | 'closed'>('all');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        course_id: '',
        instructor_id: '',
        seats_available: 12,
        schedule: 'Temps plein',
        seanceCount: 1,
        seances: [{ date: '', start_time: '09:00', end_time: '17:00' }]
    });

    // Manifest State
    const [isManifestOpen, setIsManifestOpen] = useState(false);
    const [manifestStudents, setManifestStudents] = useState<any[]>([]);
    const [loadingManifest, setLoadingManifest] = useState(false);
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
            const payload = editingSessionId ? { ...formData, id: editingSessionId } : formData;

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
                seats_available: 12,
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
            seats_available: session.seats_available,
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

    const searchedSessions = sessions.filter(s =>
        s.courses?.title_fr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.instructor?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredSessions = searchedSessions.filter(session =>
        sessionFilter === 'all'
        || (sessionFilter === 'open' && !isSessionClosed(session))
        || (sessionFilter === 'closed' && isSessionClosed(session))
    );

    const openSessionCount = sessions.filter(session => !isSessionClosed(session)).length;
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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-brand-green" size={48} />
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Synchronisation des sessions...</p>
            </div>
        );
    }

    const openSessions = sessions.filter(s => new Date(s.start_date) > new Date()).length;
    const totalStudents = sessions.reduce((sum, s) => sum + s.stats.confirmed, 0);

    return (
        <div className="space-y-10 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                        <CalendarIcon size={14} /> Planification des formations
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Sessions <span className="text-slate-600">et calendrier</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Rechercher une session..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all w-full md:w-80 text-slate-900"
                        />
                    </div>
                    <div className="flex bg-white border border-slate-200 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-green text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                            title="Afficher en cartes"
                            aria-label="Afficher les sessions en cartes"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-green text-black shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                            title="Afficher en tableau"
                            aria-label="Afficher les sessions en tableau"
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <button
                        onClick={() => {
                            setEditingSessionId(null);
                            setFormData({
                                course_id: '',
                                instructor_id: '',
                                seats_available: 12,
                                schedule: 'Temps plein',
                                seanceCount: 1,
                                seances: [{ date: '', start_time: '09:00', end_time: '17:00' }]
                            });
                            setCurrentStep(1);
                            setIsModalOpen(true);
                        }}
                        className={`${isProfessor ? 'hidden' : 'flex'} btn-primary py-3 px-6 h-auto shadow-none items-center gap-2`}
                    >
                        <Plus size={18} /> NOUVELLE SESSION
                    </button>
                </div>
            </header>

            <div className={`${isProfessor ? 'hidden' : 'grid'} grid-cols-1 md:grid-cols-3 gap-6`}>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-brand-blue/10 text-brand-blue">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{openSessions}</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Sessions actives</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="premium-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-brand-green/10 text-brand-green">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{totalStudents}</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Étudiants inscrits</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="premium-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-amber-400/10 text-amber-400">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">92%</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Taux d'Occupation</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                {[
                    { key: 'all' as const, label: 'Toutes les sessions', count: sessions.length },
                    { key: 'open' as const, label: 'Sessions ouvertes', count: openSessionCount },
                    { key: 'closed' as const, label: 'Sessions fermées', count: closedSessionCount }
                ].map(filter => (
                    <button
                        key={filter.key}
                        type="button"
                        onClick={() => setSessionFilter(filter.key)}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${sessionFilter === filter.key ? 'bg-brand-green text-black shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                        {filter.label}
                        <span className={`rounded-md px-2 py-0.5 text-[10px] ${sessionFilter === filter.key ? 'bg-black/10' : 'bg-slate-100 text-slate-500'}`}>{filter.count}</span>
                    </button>
                ))}
            </div>

            <div className={`${viewMode === 'list' ? 'block' : 'hidden'} premium-card overflow-hidden`}>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] border-collapse text-left">
                        <thead className="border-b border-slate-200 bg-slate-50/80">
                            <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                <th className="px-6 py-4">Formation</th>
                                <th className="px-5 py-4">Instructeur</th>
                                <th className="px-5 py-4">Date de début</th>
                                <th className="px-5 py-4">Calendrier</th>
                                <th className="px-5 py-4">Inscriptions</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredSessions.map((session, idx) => {
                                let planning = session.schedule;
                                let seanceCount = 0;
                                try {
                                    const parsed = JSON.parse(session.schedule);
                                    planning = translateScheduleLabel(parsed.label);
                                    seanceCount = parsed.seances?.length || 0;
                                } catch {
                                    planning = translateScheduleLabel(session.schedule);
                                }
                                const occupancy = Math.round((session.stats.confirmed / session.seats_available) * 100) || 0;
                                return (
                                    <motion.tr key={session.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }} className="group hover:bg-brand-green/[0.04] transition-colors">
                                        <td className="px-6 py-4"><div className="flex min-w-[320px] items-center gap-4"><img src={session.courses?.image_url || 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400&auto=format&fit=crop'} alt={session.courses?.title_fr} className="h-14 w-20 rounded-xl bg-slate-100 object-cover" /><div><p className="max-w-sm font-black leading-snug text-slate-900">{session.courses?.title_fr}</p><span className="mt-1 inline-flex rounded-md bg-brand-blue/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-brand-blue">{translateCategory(session.courses?.category)}</span></div></div></td>
                                        <td className="px-5 py-4 text-sm font-bold text-slate-900">{session.instructor?.full_name || 'Non assigné'}</td>
                                        <td className="px-5 py-4 text-sm font-black text-slate-900">{new Date(session.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                        <td className="px-5 py-4"><p className="text-sm font-bold text-slate-900">{planning}</p>{seanceCount > 0 && <p className="mt-1 text-[10px] font-bold uppercase text-slate-600">{seanceCount} séances</p>}</td>
                                        <td className="px-5 py-4"><div className="w-36"><div className="mb-2 flex justify-between text-[10px] font-black"><span className="text-slate-600">{session.stats.confirmed}/{session.seats_available}</span><span className="text-brand-blue">{occupancy}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.min(occupancy, 100)}%` }} /></div></div></td>
                                        <td className="px-6 py-4"><div className="flex justify-end gap-2"><button onClick={() => handleViewManifest(session)} className="rounded-lg border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-brand-green hover:border-brand-green">Inscrits</button><button onClick={() => handleEditClick(session)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-brand-green hover:text-brand-green" title="Modifier"><Edit2 size={16} /></button><button onClick={() => handleDeleteSession(session.id)} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-500" title="Supprimer"><Trash2 size={16} /></button></div></td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={`${viewMode === 'grid' ? 'grid' : 'hidden'} grid-cols-1 lg:grid-cols-2 gap-8`}>
                {filteredSessions.map((session, idx) => (
                    <motion.div
                        key={session.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="premium-card group hover:border-brand-green/40 transition-all flex flex-col md:flex-row overflow-hidden"
                    >
                        <div className="w-full md:w-48 h-48 md:h-auto relative overflow-hidden shrink-0">
                            <img
                                src={session.courses?.image_url || 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=2070&auto=format&fit=crop'}
                                alt={session.courses?.title_fr}
                                className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/20 to-transparent" />
                            <div className="absolute top-4 left-4">
                                <span className="bg-brand-blue/90 text-white text-[8px] font-black px-2 py-1 rounded uppercase tracking-widest">
                                    {translateCategory(session.courses?.category)}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 flex-grow flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 tracking-tight leading-tight">
                                            {session.courses?.title_fr}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center">
                                                <Briefcase size={12} className="text-slate-500" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-900 tracking-widest uppercase">
                                                Instructeur : <span className="text-slate-900">{session.instructor?.full_name || 'NON ASSIGNÉ'}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleEditClick(session)}
                                            className={`${isProfessor ? 'hidden' : ''} p-2 text-slate-500 hover:text-brand-green transition-colors bg-white/5 rounded-lg`}
                                            title="Modifier"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteSession(session.id)}
                                            className={`${isProfessor ? 'hidden' : ''} p-2 text-slate-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg`}
                                            title="Supprimer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-slate-900">
                                            <CalendarIcon size={14} className="text-brand-green" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Date de début</span>
                                        </div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                                            {new Date(session.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-slate-900">
                                            <Clock size={14} className="text-brand-green" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Calendrier</span>
                                        </div>
                                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse(session.schedule);
                                                    return (
                                                        <span className="flex items-center gap-2">
                                                            {translateScheduleLabel(parsed.label)}
                                                            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-900">
                                                                {parsed.seances?.length || 0} séances
                                                            </span>
                                                        </span>
                                                    );
                                                } catch (e) {
                                                    return translateScheduleLabel(session.schedule);
                                                }
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex items-end justify-between">
                                <div className="space-y-2 flex-grow max-w-[180px]">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                                        <span className="text-slate-900 text-[8px]">Inscriptions : <span className="text-slate-900">{session.stats.confirmed}/{session.seats_available}</span></span>
                                        <span className="text-brand-blue">{Math.round((session.stats.confirmed / session.seats_available) * 100)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${(session.stats.confirmed / session.seats_available) * 100}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className="h-full bg-brand-green shadow-[0_0_10px_rgba(161,184,62,0.3)]"
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleViewManifest(session)}
                                    className="flex items-center gap-2 text-brand-green font-black uppercase tracking-widest text-[10px] hover:gap-3 transition-all"
                                >
                                    VOIR LES INSCRITS <ChevronRight size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {filteredSessions.length === 0 && (
                <div className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <CalendarIcon size={48} className="text-slate-800" />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Aucune session correspondante</p>
                    </div>
                </div>
            )}

            {/* NEW SESSION MODAL */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                        {editingSessionId ? 'Modifier la' : 'Nouvelle'} <span className="text-brand-green">session de formation</span>
                                    </h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${currentStep === 1 ? 'text-brand-green' : 'text-slate-500'}`}>
                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${currentStep === 1 ? 'border-brand-green bg-brand-green text-black' : 'border-slate-800'}`}>1</span> {editingSessionId ? 'MODIFIER' : 'INFORMATIONS'}
                                        </div>
                                        <div className="w-8 h-[1px] bg-slate-800" />
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${currentStep === 2 ? 'text-brand-green' : 'text-slate-500'}`}>
                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${currentStep === 2 ? 'border-brand-green bg-brand-green text-black' : 'border-slate-800'}`}>2</span> NOMBRE
                                        </div>
                                        <div className="w-8 h-[1px] bg-slate-800" />
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${currentStep === 3 ? 'text-brand-green' : 'text-slate-500'}`}>
                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${currentStep === 3 ? 'border-brand-green bg-brand-green text-black' : 'border-slate-800'}`}>3</span> CALENDRIER
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-500 hover:text-white bg-white/5 rounded-xl transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-8 overflow-y-auto custom-scrollbar flex-grow">
                                <form onSubmit={handleSubmit} className="space-y-8">
                                    {currentStep === 1 && (
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Formation *</label>
                                                    <select
                                                        required
                                                        value={formData.course_id}
                                                        onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                                                        className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-brand-green/50 appearance-none font-bold text-sm"
                                                    >
                                                        <option value="">Sélectionner une formation</option>
                                                        {courses.map(c => (
                                                            <option key={c.id} value={c.id}>{c.title_fr}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Instructeur</label>
                                                    <select
                                                        value={formData.instructor_id}
                                                        onChange={(e) => setFormData({ ...formData, instructor_id: e.target.value })}
                                                        className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-brand-green/50 appearance-none font-bold text-sm"
                                                    >
                                                        <option value="">Non assigné</option>
                                                        {instructors.map(i => (
                                                            <option key={i.id} value={i.id}>{i.nom} {i.prenom}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Places Disponibles</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        value={formData.seats_available}
                                                        onChange={(e) => setFormData({ ...formData, seats_available: parseInt(e.target.value) })}
                                                        className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-brand-green/50 font-bold text-sm"
                                                        placeholder="Ex: 12"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rythme Global</label>
                                                    <input
                                                        type="text"
                                                        value={formData.schedule}
                                                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                                                        className="w-full bg-white border border-slate-200 rounded-xl p-4 text-slate-900 focus:outline-none focus:border-brand-green/50 font-bold text-sm"
                                                        placeholder="Ex. : Temps plein / Week-end"
                                                    />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {currentStep === 2 && (
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 text-center py-10">
                                            <div className="max-w-xs mx-auto space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Nombre de séances à planifier</label>
                                                <div className="flex items-center justify-center gap-6">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSeanceCountChange(Math.max(1, formData.seanceCount - 1))}
                                                        className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-900 flex items-center justify-center hover:bg-brand-green hover:text-black transition-all font-black text-xl shadow-lg"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">{formData.seanceCount}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSeanceCountChange(formData.seanceCount + 1)}
                                                        className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-900 flex items-center justify-center hover:bg-brand-green hover:text-black transition-all font-black text-xl shadow-lg"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-white/5 py-2 px-4 rounded-full">Définit le nombre total de rencontres physiques</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {currentStep === 3 && (
                                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 pb-10">
                                            <div className="grid grid-cols-1 gap-4">
                                                {formData.seances.map((seance, index) => (
                                                    <div key={index} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 group hover:border-brand-green/30 transition-all">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-black text-brand-green uppercase tracking-[0.2em]">Séance #{index + 1}</span>
                                                            <CalendarIcon size={14} className="text-slate-700 group-hover:text-brand-green transition-colors" />
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Date Precise</label>
                                                                <input
                                                                    type="date"
                                                                    required
                                                                    value={seance.date}
                                                                    onChange={(e) => handleSeanceChange(index, 'date', e.target.value)}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-brand-green/50 text-xs font-bold"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Heure Début</label>
                                                                <input
                                                                    type="time"
                                                                    required
                                                                    value={seance.start_time}
                                                                    onChange={(e) => handleSeanceChange(index, 'start_time', e.target.value)}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-brand-green/50 text-xs font-bold"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Heure Fin</label>
                                                                <input
                                                                    type="time"
                                                                    required
                                                                    value={seance.end_time}
                                                                    onChange={(e) => handleSeanceChange(index, 'end_time', e.target.value)}
                                                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 focus:outline-none focus:border-brand-green/50 text-xs font-bold"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </form>
                            </div>

                            {/* Footer */}
                            <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : setIsModalOpen(false)}
                                    className="px-8 py-4 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    {currentStep === 1 ? 'Annuler' : 'Précédent'}
                                </button>

                                {currentStep < 3 ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(currentStep + 1)}
                                        disabled={currentStep === 1 && !formData.course_id}
                                        className="btn-primary py-4 px-10 h-auto shadow-xl shadow-brand-green/10 flex items-center gap-2 group"
                                    >
                                        ÉTAPE SUIVANTE <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="btn-primary py-4 px-10 h-auto shadow-xl shadow-brand-green/10 flex items-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (editingSessionId ? <Check size={18} /> : <Plus size={18} />)}
                                        {isSubmitting ? 'ENREGISTREMENT...' : (editingSessionId ? 'ENREGISTRER LES MODIFICATIONS' : 'CRÉER LA SESSION')}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* SESSION MANIFEST MODAL */}
            <AnimatePresence>
                {isManifestOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                                <div>
                                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.2em] text-[10px] mb-1">
                                        <Users size={12} /> Liste des Étudiants
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                                        Étudiants Inscrits <span className="text-slate-500">dans</span> {selectedSessionLabel}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => {
                                            fetchAllStudents();
                                            setStudentSearchQuery('');
                                            setIsAddingStudent(true);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-green/20 text-brand-green border border-brand-green/20 font-black text-[10px] uppercase tracking-widest transition-all hover:bg-brand-green hover:text-black"
                                    >
                                        <Plus size={14} />
                                        Ajouter un étudiant
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsAddingStudent(false);
                                            setIsManifestOpen(false);
                                        }}
                                        className="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-xl transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-grow overflow-y-auto custom-scrollbar p-0">
                                {loadingManifest ? (
                                    <div className="flex flex-col items-center justify-center py-32 gap-4">
                                        <Loader2 className="animate-spin text-brand-green" size={32} />
                                        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Chargement des inscrits...</p>
                                    </div>
                                ) : manifestStudents.length > 0 ? (
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white/5 border-b border-white/5">
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Étudiant</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Coordonnées</th>
                                                <th className="px-6 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut</th>
                                                {!isProfessor && (
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Paiement</th>
                                                )}
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {manifestStudents.map((student, idx) => (
                                                <motion.tr 
                                                    key={student.id}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className="hover:bg-white/[0.02] transition-colors group"
                                                >
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 text-xs font-black border border-slate-200">
                                                                {student.full_name?.charAt(0)}
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-slate-900 text-sm">{student.full_name}</span>
                                                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                                                    Inscrit le : {new Date(student.enrolled_at).toLocaleDateString('fr-FR')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                                                                <Mail size={12} className="text-brand-blue" /> {student.email}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                                                                <Phone size={12} className="text-brand-green" /> {student.phone}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                                                            student.status === 'approved' 
                                                            ? 'bg-brand-green/10 text-brand-green border-brand-green/20' 
                                                            : 'bg-amber-400/10 text-amber-400 border-amber-400/20'
                                                        }`}>
                                                            {student.status === 'approved' ? 'VALIDÉ' : student.status === 'rejected' ? 'REFUSÉ' : 'EN ATTENTE'}
                                                        </span>
                                                    </td>
                                                    {!isProfessor && (
                                                        <td className="px-6 py-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPaymentAmount('');
                                                                    setPaymentNote('');
                                                                    setPaymentReceipt(null);
                                                                    setPaymentStudent(student);
                                                                }}
                                                                disabled={Number(student.total_price || 0) > 0 && Number(student.amount_paid || 0) >= Number(student.total_price || 0)}
                                                                className="min-w-36 rounded-xl border border-brand-green/30 bg-brand-green/10 px-3 py-2 text-left transition-all hover:border-brand-green hover:bg-brand-green/20 disabled:cursor-default disabled:border-emerald-200 disabled:bg-emerald-50"
                                                                title="Cliquer pour ajouter un paiement"
                                                            >
                                                                <span className="block text-xs font-black text-slate-900 tabular-nums">
                                                                    {Number(student.amount_paid || 0).toLocaleString('fr-FR')} / {Number(student.total_price || 0).toLocaleString('fr-FR')} DT
                                                                </span>
                                                                <span className={`mt-0.5 block text-[9px] font-bold uppercase tracking-wider ${Number(student.total_price || 0) > Number(student.amount_paid || 0) ? 'text-rose-500' : 'text-emerald-600'}`}>
                                                                    {Number(student.total_price || 0) > Number(student.amount_paid || 0)
                                                                        ? `Reste : ${Math.max(Number(student.total_price || 0) - Number(student.amount_paid || 0), 0).toLocaleString('fr-FR')} DT`
                                                                        : 'Soldé'}
                                                                </span>
                                                            </button>
                                                        </td>
                                                    )}
                                                    <td className="px-8 py-4 text-right">
                                                        <button
                                                            onClick={() => handleRemoveStudent(student)}
                                                            disabled={removingStudentId === student.id || student.has_financial_history}
                                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white font-black text-[9px] uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-rose-50 disabled:hover:text-rose-600"
                                                            title={student.has_financial_history
                                                                ? 'Cette inscription contient un paiement ou un justificatif.'
                                                                : 'Retirer de la session'}
                                                        >
                                                            {removingStudentId === student.id
                                                                ? <Loader2 size={13} className="animate-spin" />
                                                                : student.has_financial_history
                                                                    ? <AlertCircle size={13} />
                                                                    : <Trash2 size={13} />}
                                                            {student.has_financial_history ? 'Paiement lié' : 'Retirer'}
                                                        </button>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="py-32 text-center">
                                        <Users size={48} className="text-slate-800 mx-auto mb-4" />
                                        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Aucun étudiant inscrit à cette session</p>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-8 border-t border-slate-100 bg-white flex justify-between items-center">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    Total Inscrits : <span className="text-slate-900">{manifestStudents.length}</span>
                                </p>
                                <button
                                    onClick={() => {
                                        setIsAddingStudent(false);
                                        setIsManifestOpen(false);
                                    }}
                                    className="px-8 py-3 rounded-xl bg-white text-slate-600 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest transition-all border border-slate-200"
                                >
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SESSION PAYMENT MODAL - ADMIN ONLY */}
            <AnimatePresence>
                {paymentStudent && !isProfessor && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
                        >
                            <div className="flex items-start justify-between border-b border-slate-100 p-7">
                                <div>
                                    <div className="mb-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-green">
                                        <CreditCard size={14} /> Paiement de la session
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900">Ajouter un paiement</h2>
                                    <p className="mt-1 text-sm font-semibold text-slate-600">{paymentStudent.full_name}</p>
                                    <p className="mt-0.5 text-xs text-slate-500">{selectedSessionLabel}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closePaymentModal}
                                    className="rounded-xl bg-slate-100 p-2 text-slate-500 transition-colors hover:text-slate-900"
                                    title="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSessionPayment} className="space-y-5 p-7">
                                <div className="grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-center">
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Prix total</p>
                                        <p className="mt-1 text-base font-black text-slate-900">{Number(paymentStudent.total_price || 0).toLocaleString('fr-FR')} DT</p>
                                    </div>
                                    <div className="border-x border-slate-200">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Déjà payé</p>
                                        <p className="mt-1 text-base font-black text-emerald-600">{Number(paymentStudent.amount_paid || 0).toLocaleString('fr-FR')} DT</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Reste</p>
                                        <p className="mt-1 text-base font-black text-rose-500">{Math.max(Number(paymentStudent.total_price || 0) - Number(paymentStudent.amount_paid || 0), 0).toLocaleString('fr-FR')} DT</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Montant reçu (DT) *</label>
                                    <input
                                        required
                                        autoFocus
                                        type="number"
                                        min="0.001"
                                        step="0.001"
                                        max={Math.max(Number(paymentStudent.total_price || 0) - Number(paymentStudent.amount_paid || 0), 0) || undefined}
                                        value={paymentAmount}
                                        onChange={(event) => setPaymentAmount(event.target.value)}
                                        placeholder="Exemple : 100"
                                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 outline-none focus:border-brand-green"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Reçu de paiement (facultatif)</label>
                                    <label className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition-all ${paymentReceipt ? 'border-brand-green bg-brand-green/5' : 'border-slate-200 bg-slate-50 hover:border-brand-green/50'}`}>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,application/pdf"
                                            className="hidden"
                                            onChange={(event) => setPaymentReceipt(event.target.files?.[0] || null)}
                                        />
                                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${paymentReceipt ? 'bg-brand-green text-black' : 'bg-white text-slate-400 shadow-sm'}`}>
                                            <Upload size={18} />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm font-semibold text-slate-800">
                                                {paymentReceipt ? paymentReceipt.name : 'Cliquer pour ajouter le reçu'}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-slate-500">JPG, PNG, WEBP ou PDF · maximum 10 Mo</span>
                                        </span>
                                    </label>
                                </div>

                                <div>
                                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">Remarque</label>
                                    <textarea
                                        rows={3}
                                        maxLength={2000}
                                        value={paymentNote}
                                        onChange={(event) => setPaymentNote(event.target.value)}
                                        placeholder="Exemple : paiement en espèces…"
                                        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-brand-green"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                    <button
                                        type="button"
                                        onClick={closePaymentModal}
                                        className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={savingPayment || !paymentAmount}
                                        className="btn-primary flex h-auto items-center gap-2 px-6 py-3 shadow-none disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {savingPayment ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                        Enregistrer le paiement
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* STUDENT PICKER MODAL */}
            <AnimatePresence>
                {isManifestOpen && isAddingStudent && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 20 }}
                            className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-7 border-b border-slate-100 flex items-start justify-between gap-6">
                                <div>
                                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.2em] text-[10px] mb-1">
                                        <Plus size={13} /> Nouvelle inscription
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900">Ajouter un étudiant</h2>
                                    <p className="mt-1 text-xs font-medium text-slate-500">{selectedSessionLabel}</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setStudentSearchQuery('');
                                        setIsAddingStudent(false);
                                    }}
                                    className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 transition-colors"
                                    title="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 border-b border-slate-100 bg-slate-50">
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Rechercher par nom, e-mail ou téléphone..."
                                        value={studentSearchQuery}
                                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-brand-green"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                {loadingStudents ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                                        <Loader2 className="animate-spin text-brand-green" size={30} />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chargement des étudiants...</p>
                                    </div>
                                ) : availableStudents.length > 0 ? (
                                    <div className="space-y-3">
                                        {availableStudents.map(student => (
                                            <div
                                                key={student.id}
                                                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-green/50 hover:bg-slate-50 transition-all"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                                                        {student.full_name?.charAt(0) || 'E'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black text-slate-900 truncate">{student.full_name || 'Sans nom'}</p>
                                                        <p className="text-xs text-slate-500 truncate">{student.email || 'E-mail indisponible'}</p>
                                                        <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                            <Phone size={12} className="text-brand-green" />
                                                            {student.phone || 'Téléphone indisponible'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleAddStudent(student.id)}
                                                    disabled={enrollingStudentId !== null}
                                                    className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-green text-black font-black text-[10px] uppercase tracking-wider hover:brightness-105 transition-all disabled:opacity-50"
                                                >
                                                    {enrollingStudentId === student.id
                                                        ? <Loader2 size={14} className="animate-spin" />
                                                        : <Plus size={14} />}
                                                    Ajouter
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-20 text-center">
                                        <Users size={42} className="text-slate-300 mb-4" />
                                        <p className="font-black text-slate-700">Aucun étudiant disponible</p>
                                        <p className="mt-1 text-xs text-slate-500">Tous les étudiants correspondants sont déjà inscrits à cette session.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-white">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    {availableStudents.length} étudiant(s) disponible(s)
                                </p>
                                <button
                                    onClick={() => {
                                        setStudentSearchQuery('');
                                        setIsAddingStudent(false);
                                    }}
                                    className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-black text-[10px] uppercase tracking-widest transition-all"
                                >
                                    Fermer
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
