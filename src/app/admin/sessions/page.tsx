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
    X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function SessionsAdminPage() {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [instructors, setInstructors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        course_id: '',
        instructor_id: '',
        seats_available: 12,
        schedule: 'Full Time',
        seanceCount: 1,
        seances: [{ date: '', start_time: '09:00', end_time: '17:00' }]
    });

    useEffect(() => {
        fetchSessions();
        fetchInitialData();
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
                schedule: 'Full Time',
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
                label: p.label || 'Personalized',
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

    const filteredSessions = sessions.filter(s =>
        s.courses?.title_fr?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.instructor?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-brand-green" size={48} />
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing Deployment Intel...</p>
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
                        <CalendarIcon size={14} /> Deployment Planning
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Sessions <span className="text-slate-500">& Planning</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Filter Deployment Cycle..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all w-full md:w-80"
                        />
                    </div>
                    <div className="flex bg-slate-900 border border-white/5 p-1 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-green text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-green text-black shadow-lg' : 'text-slate-500 hover:text-white'}`}
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
                                schedule: 'Full Time',
                                seanceCount: 1,
                                seances: [{ date: '', start_time: '09:00', end_time: '17:00' }]
                            });
                            setCurrentStep(1);
                            setIsModalOpen(true);
                        }}
                        className="btn-primary py-3 px-6 h-auto shadow-none flex items-center gap-2"
                    >
                        <Plus size={18} /> NEW SESSION
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="premium-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-brand-blue/10 text-brand-blue">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums">{openSessions}</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Cycles Actifs</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="premium-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-brand-green/10 text-brand-green">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums">{totalStudents}</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Équipage Enrôlé</p>
                        </div>
                    </div>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="premium-card p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-amber-400/10 text-amber-400">
                            <Briefcase size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-white tracking-tighter tabular-nums">92%</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">Taux d'Occupation</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                                    {session.courses?.category}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 flex-grow flex flex-col justify-between">
                            <div className="space-y-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight leading-tight group-hover:text-brand-green transition-colors">
                                            {session.courses?.title_fr}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center">
                                                <Briefcase size={12} className="text-slate-500" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
                                                Instructeur: <span className="text-slate-200">{session.instructor?.full_name || 'NON ASSIGNÉ'}</span>
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleEditClick(session)}
                                            className="p-2 text-slate-500 hover:text-brand-green transition-colors bg-white/5 rounded-lg"
                                            title="Modifier"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteSession(session.id)}
                                            className="p-2 text-slate-500 hover:text-red-500 transition-colors bg-white/5 rounded-lg"
                                            title="Supprimer"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <CalendarIcon size={14} className="text-brand-green" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Start Date</span>
                                        </div>
                                        <p className="text-sm font-black text-slate-200 uppercase tracking-tighter">
                                            {new Date(session.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Clock size={14} className="text-brand-green" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">Schedule</span>
                                        </div>
                                        <p className="text-sm font-black text-slate-200 uppercase tracking-tighter">
                                            {(() => {
                                                try {
                                                    const parsed = JSON.parse(session.schedule);
                                                    return (
                                                        <span className="flex items-center gap-2">
                                                            {parsed.label}
                                                            <span className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400">
                                                                {parsed.seances?.length || 0} séances
                                                            </span>
                                                        </span>
                                                    );
                                                } catch (e) {
                                                    return session.schedule;
                                                }
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex items-end justify-between">
                                <div className="space-y-2 flex-grow max-w-[180px]">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-1">
                                        <span className="text-slate-500 text-[8px]">Inscriptions: <span className="text-white">{session.stats.confirmed}/{session.seats_available}</span></span>
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

                                <button className="flex items-center gap-2 text-brand-green font-black uppercase tracking-widest text-[10px] hover:gap-3 transition-all">
                                    VIEW MANIFEST <ChevronRight size={14} />
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
                        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Registry Zero-Match Deployment Cycle</p>
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
                            className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
                        >
                            {/* Header */}
                            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-950/50">
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight">
                                        {editingSessionId ? 'Update' : 'New'} Training <span className="text-brand-green">Session</span>
                                    </h2>
                                    <div className="flex items-center gap-4 mt-2">
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${currentStep === 1 ? 'text-brand-green' : 'text-slate-500'}`}>
                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${currentStep === 1 ? 'border-brand-green bg-brand-green text-black' : 'border-slate-800'}`}>1</span> {editingSessionId ? 'EDIT' : 'INFO'}
                                        </div>
                                        <div className="w-8 h-[1px] bg-slate-800" />
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${currentStep === 2 ? 'text-brand-green' : 'text-slate-500'}`}>
                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${currentStep === 2 ? 'border-brand-green bg-brand-green text-black' : 'border-slate-800'}`}>2</span> COUNT
                                        </div>
                                        <div className="w-8 h-[1px] bg-slate-800" />
                                        <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${currentStep === 3 ? 'text-brand-green' : 'text-slate-500'}`}>
                                            <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${currentStep === 3 ? 'border-brand-green bg-brand-green text-black' : 'border-slate-800'}`}>3</span> SCHEDULE
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
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-brand-green/50 appearance-none font-bold text-sm"
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
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-brand-green/50 appearance-none font-bold text-sm"
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
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-brand-green/50 font-bold text-sm"
                                                        placeholder="Ex: 12"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rythme Global</label>
                                                    <input
                                                        type="text"
                                                        value={formData.schedule}
                                                        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                                                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-4 text-white focus:outline-none focus:border-brand-green/50 font-bold text-sm"
                                                        placeholder="Ex: Full Time / Weekend"
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
                                                        className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/5 text-white flex items-center justify-center hover:bg-brand-green hover:text-black transition-all font-black text-xl shadow-lg"
                                                    >
                                                        -
                                                    </button>
                                                    <span className="text-5xl font-black text-white tabular-nums tracking-tighter">{formData.seanceCount}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSeanceCountChange(formData.seanceCount + 1)}
                                                        className="w-12 h-12 rounded-2xl bg-slate-800 border border-white/5 text-white flex items-center justify-center hover:bg-brand-green hover:text-black transition-all font-black text-xl shadow-lg"
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
                                                    <div key={index} className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 space-y-4 group hover:border-brand-green/30 transition-all">
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
                                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50 text-xs font-bold"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Heure Début</label>
                                                                <input
                                                                    type="time"
                                                                    required
                                                                    value={seance.start_time}
                                                                    onChange={(e) => handleSeanceChange(index, 'start_time', e.target.value)}
                                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50 text-xs font-bold"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Heure Fin</label>
                                                                <input
                                                                    type="time"
                                                                    required
                                                                    value={seance.end_time}
                                                                    onChange={(e) => handleSeanceChange(index, 'end_time', e.target.value)}
                                                                    className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50 text-xs font-bold"
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
                            <div className="p-8 border-t border-white/5 bg-slate-950/50 flex justify-between items-center">
                                <button
                                    type="button"
                                    onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : setIsModalOpen(false)}
                                    className="px-8 py-4 rounded-2xl border border-white/10 text-white hover:bg-white/5 font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    {currentStep === 1 ? 'Cancel' : 'Previous'}
                                </button>

                                {currentStep < 3 ? (
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(currentStep + 1)}
                                        disabled={currentStep === 1 && !formData.course_id}
                                        className="btn-primary py-4 px-10 h-auto shadow-xl shadow-brand-green/10 flex items-center gap-2 group"
                                    >
                                        NEXT STEP <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="btn-primary py-4 px-10 h-auto shadow-xl shadow-brand-green/10 flex items-center gap-2"
                                    >
                                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (editingSessionId ? <Check size={18} /> : <Plus size={18} />)}
                                        {isSubmitting ? 'ESTABLISHING...' : (editingSessionId ? 'UPDATE DEPLOYMENT' : 'FINALIZE DEPLOYMENT')}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
