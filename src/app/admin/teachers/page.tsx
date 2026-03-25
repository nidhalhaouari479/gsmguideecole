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
    Loader2,
    ArrowUpDown,
    Download,
    X,
    UserCheck,
    UserX,
    ShieldAlert,
    Award,
    Calendar,
    ChevronRight,
    Briefcase,
    Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TeacherData {
    id: string;
    nom: string;
    prenom: string;
    specialite: string;
    created_at: string;
}

export default function TeachersAdminPage() {
    const [teachers, setTeachers] = useState<TeacherData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<TeacherData | null>(null);
    const [formData, setFormData] = useState({ nom: '', prenom: '', specialite: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/teachers');
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setTeachers(data);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId: string, action: 'block' | 'unblock' | 'delete') => {
        if (action === 'delete') {
            if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce professeur ?')) return;
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
                await fetchTeachers();
                setActiveDropdown(null);
            }
        } catch (error) {
            console.error('Action error:', error);
            alert('Une erreur est survenue.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleOpenModal = (teacher?: TeacherData) => {
        if (teacher) {
            setEditingTeacher(teacher);
            setFormData({
                nom: teacher.nom || '',
                prenom: teacher.prenom || '',
                specialite: teacher.specialite || ''
            });
        } else {
            setEditingTeacher(null);
            setFormData({ nom: '', prenom: '', specialite: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = '/api/admin/teachers';
            const method = editingTeacher ? 'PUT' : 'POST';
            const body = editingTeacher
                ? { id: editingTeacher.id, ...formData }
                : formData;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            await fetchTeachers();
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || 'Une erreur est survenue.');
        } finally {
            setIsSubmitting(false);
        }
    };


    const filteredTeachers = teachers.filter(t =>
        t.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.specialite && t.specialite.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-brand-green" size={48} />
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Accessing Personnel Registry...</p>
            </div>
        );
    }

    const statsCards = [
        { label: 'Personnel Actif', value: teachers.length, color: 'text-brand-blue', bg: 'bg-brand-blue/10', icon: Users },
        { label: 'Spécialités Couvertes', value: new Set(teachers.map(t => t.specialite).filter(Boolean)).size, color: 'text-brand-green', bg: 'bg-brand-green/10', icon: BookOpen },
    ];

    return (
        <div className="space-y-10 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                        <Briefcase size={14} /> Personnel Intelligence
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Registre <span className="text-slate-500">Professeurs</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search Personnel ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all w-full md:w-80"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="btn-primary py-3 px-6 h-auto shadow-none"
                    >
                        RECRUIT
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
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Professeur</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Spécialité</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Date d'ajout</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredTeachers.length > 0 ? (
                                filteredTeachers.map((teacher, idx) => (
                                    <motion.tr
                                        key={teacher.id}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 border border-white/5 flex items-center justify-center text-white text-sm font-black shadow-lg group-hover:border-brand-green/40 transition-all overflow-hidden">
                                                    {teacher.nom.charAt(0)}{teacher.prenom.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-sm text-white">{teacher.nom} {teacher.prenom}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ID: {teacher.id.slice(0, 8)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-400">
                                                {teacher.specialite || <span className="text-slate-600 italic">Non renseignée</span>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-slate-400">
                                                {new Date(teacher.created_at).toLocaleDateString('fr-FR')}
                                            </span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {/* Edit Action */}
                                                <button
                                                    onClick={() => handleOpenModal(teacher)}
                                                    title="Modifier"
                                                    className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all border border-blue-500/20"
                                                >
                                                    <Edit2 size={18} />
                                                </button>

                                                {/* Delete Action */}
                                                <button
                                                    onClick={() => handleAction(teacher.id, 'delete')}
                                                    title="Révoquer"
                                                    disabled={actionLoading === teacher.id}
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
                                    <td colSpan={6} className="px-6 py-32 text-center">
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
            </div>

            {/* Modal for Add/Edit */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-white">
                                    {editingTeacher ? 'Modifier le Professeur' : 'Ajouter un Professeur'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Nom *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nom}
                                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50"
                                        placeholder="Nom du professeur"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Prénom *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.prenom}
                                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50"
                                        placeholder="Prénom du professeur"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Spécialité</label>
                                    <input
                                        type="text"
                                        value={formData.specialite}
                                        onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50"
                                        placeholder="Ex: Mathématiques"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-8">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-5 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 font-bold text-sm transition-all"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="btn-primary px-5 py-2.5 flex items-center gap-2"
                                    >
                                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                        {editingTeacher ? 'Enregistrer' : 'Créer'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
