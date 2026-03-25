"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    BookOpen,
    Plus,
    Search,
    MoreVertical,
    Edit2,
    Trash2,
    Eye,
    Clock,
    Tag,
    Users,
    TrendingUp,
    Loader2,
    X,
    Filter,
    ChevronRight,
    LayoutGrid,
    Target,
    Layers,
    Sparkles,
    Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Course {
    id: string;
    title_fr: string;
    title_en: string;
    description_fr: string;
    description_en: string;
    duration: string;
    base_price: number;
    sold_price: number | null;
    category: string;
    image_url: string;
    level: string;
    instructor_id: string;
    professeurs?: { id: string; nom: string; prenom: string };
    created_at: string;
    student_count?: number;
}

interface Professor {
    id: string;
    nom: string;
    prenom: string;
}

export default function CoursesAdminPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Upload state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title_fr: '', title_en: '', description_fr: '', description_en: '',
        duration: '', base_price: 0, sold_price: '', category: '',
        image_url: '', level: '', instructor_id: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch courses from custom API
            const coursesRes = await fetch('/api/admin/courses');
            const coursesData = await coursesRes.json();
            if (coursesData.error) throw new Error(coursesData.error);

            // Fetch professors for the dropdown
            const profsRes = await fetch('/api/admin/teachers');
            const profsData = await profsRes.json();
            if (!profsData.error) {
                setProfessors(profsData);
            }

            // Fetch enrollments to get student count
            const { data: enrollmentData } = await supabase.from('enrollments').select('course_id');

            const coursesWithStats = coursesData.map((course: Course) => ({
                ...course,
                student_count: (enrollmentData || []).filter(e => e.course_id === course.id).length
            }));

            setCourses(coursesWithStats);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) return;

        try {
            const res = await fetch(`/api/admin/courses?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setCourses(courses.filter(c => c.id !== id));
            setActiveDropdown(null);
        } catch (error) {
            console.error('Delete error:', error);
            alert('Erreur lors de la suppression.');
        }
    };

    const handleOpenModal = (course?: Course) => {
        if (course) {
            setEditingCourse(course);
            setFormData({
                title_fr: course.title_fr,
                title_en: course.title_en || '',
                description_fr: course.description_fr || '',
                description_en: course.description_en || '',
                duration: course.duration || '',
                base_price: course.base_price || 0,
                sold_price: course.sold_price ? course.sold_price.toString() : '',
                category: course.category || '',
                image_url: course.image_url || '',
                level: course.level || '',
                instructor_id: course.instructor_id || ''
            });
            setImageFile(null);
            setImagePreview(course.image_url || null);
        } else {
            setEditingCourse(null);
            setFormData({
                title_fr: '', title_en: '', description_fr: '', description_en: '',
                duration: '', base_price: 0, sold_price: '', category: '',
                image_url: '', level: '', instructor_id: ''
            });
            setImageFile(null);
            setImagePreview(null);
        }
        setIsModalOpen(true);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let finalImageUrl = formData.image_url;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `covers/${fileName}`;

                const uploadFormData = new FormData();
                uploadFormData.append('file', imageFile);
                uploadFormData.append('bucket', 'courses');
                uploadFormData.append('path', filePath);

                const uploadRes = await fetch('/api/admin/upload', {
                    method: 'POST',
                    body: uploadFormData
                });
                
                const uploadData = await uploadRes.json();
                if (uploadData.error) throw new Error("Erreur upload image: " + uploadData.error);
                
                finalImageUrl = uploadData.url;
            }

            const method = editingCourse ? 'PUT' : 'POST';
            const payload = {
                ...formData,
                image_url: finalImageUrl,
                id: editingCourse?.id,
                sold_price: formData.sold_price ? parseFloat(formData.sold_price) : null
            };

            const response = await fetch('/api/admin/courses', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            await fetchData();
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || 'Une erreur est survenue.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.title_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-brand-green" size={48} />
                <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Syncing Academic Modules...</p>
            </div>
        );
    }

    const stats = [
        { label: 'Modules Bio-Tech', value: courses.length, icon: BookOpen, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
        { label: 'Secteurs d\'Activité', value: [...new Set(courses.map(c => c.category))].length, icon: Layers, color: 'text-brand-green', bg: 'bg-brand-green/10' },
        { label: 'Densité Étudiante', value: (courses.reduce((sum, c) => sum + (c.student_count || 0), 0) / (courses.length || 1)).toFixed(1), icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { label: 'Valeur Acquisition', value: `${(courses.reduce((sum, c) => sum + c.base_price, 0) / (courses.length || 1)).toFixed(0)} DT`, icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-400/10' }
    ];

    return (
        <div className="space-y-10 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                        <BookOpen size={14} /> Knowledge Core
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Catalogue <span className="text-slate-500">Formations</span></h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Search Protocol..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-900/50 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-green/50 transition-all w-full md:w-80"
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="btn-primary py-3 px-6 h-auto shadow-none"
                    >
                        <Plus size={18} strokeWidth={3} /> INITIALIZE MODULE
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="premium-card p-6"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                                <stat.icon size={22} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white tracking-tighter tabular-nums">{stat.value}</h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{stat.label}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCourses.map((course, idx) => (
                    <motion.div
                        key={course.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="premium-card overflow-hidden flex flex-col h-full group"
                    >
                        <div className="p-3">
                            <div className="aspect-[16/10] rounded-xl overflow-hidden bg-slate-800 relative shadow-inner">
                                <img
                                    src={course.image_url}
                                    alt={course.title_fr}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"
                                />
                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1.5 bg-brand-green shadow-lg shadow-brand-green/20 text-black text-[10px] font-black uppercase tracking-widest rounded-lg">
                                        {course.category}
                                    </span>
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent opacity-60" />
                            </div>
                        </div>

                        <div className="p-7 flex flex-col flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-black text-white leading-tight tracking-tight group-hover:text-brand-green transition-colors">
                                    {course.title_fr}
                                </h3>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveDropdown(activeDropdown === course.id ? null : course.id)}
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeDropdown === course.id ? 'bg-brand-green text-black' : 'bg-white/5 hover:bg-white/10 text-slate-400'}`}
                                    >
                                        <MoreVertical size={18} />
                                    </button>

                                    <AnimatePresence>
                                        {activeDropdown === course.id && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                                    className="absolute right-0 top-12 w-52 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 py-3 overflow-hidden"
                                                >
                                                    <button
                                                        onClick={() => {
                                                            handleOpenModal(course);
                                                            setActiveDropdown(null);
                                                        }}
                                                        className="w-full px-5 py-2.5 text-left text-xs font-black uppercase tracking-widest hover:bg-white/5 text-slate-300 transition-all flex items-center gap-3"
                                                    >
                                                        <Edit2 size={14} className="text-brand-green" /> Éditer Module
                                                    </button>
                                                    <div className="h-px bg-white/5 my-2" />
                                                    <button
                                                        onClick={() => handleDelete(course.id)}
                                                        className="w-full px-5 py-2.5 text-left text-xs font-black uppercase tracking-widest hover:bg-rose-500/10 text-rose-500 transition-all flex items-center gap-3"
                                                    >
                                                        <Trash2 size={14} /> Dématérialiser
                                                    </button>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                    <Clock size={16} className="text-brand-green/50" />
                                    <span>{course.duration}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                                    <Users size={16} className="text-brand-green/50" />
                                    <span>{course.student_count} ÉLÈVES</span>
                                </div>
                            </div>

                            {course.professeurs && (
                                <div className="mb-4 text-xs font-bold text-slate-400 flex items-center gap-2">
                                    <span className="text-white/50">Prof:</span>
                                    {course.professeurs.nom} {course.professeurs.prenom}
                                </div>
                            )}

                            <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                <div className="flex flex-col">
                                    {course.sold_price ? (
                                        <>
                                            <span className="text-xs text-slate-500 line-through font-bold">{course.base_price} DT</span>
                                            <span className="text-2xl font-black text-brand-green tracking-tighter">{course.sold_price} DT</span>
                                        </>
                                    ) : (
                                        <span className="text-2xl font-black text-white tracking-tighter">{course.base_price} DT</span>
                                    )}
                                </div>
                                <button className="w-12 h-12 bg-white/5 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-brand-green hover:text-black hover:scale-110 active:scale-95 transition-all shadow-lg shadow-black/20">
                                    <ChevronRight size={22} strokeWidth={3} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}

                <motion.button
                    onClick={() => handleOpenModal()}
                    whileHover={{ scale: 1.02 }}
                    className="border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-6 bg-white/[0.02] hover:bg-white/[0.05] hover:border-brand-green/30 transition-all min-h-[350px] p-8 group"
                >
                    <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 group-hover:text-brand-green group-hover:border-brand-green/30 transition-all shadow-xl">
                        <Plus size={40} />
                    </div>
                    <div className="text-center">
                        <p className="font-black text-white uppercase tracking-widest text-sm">Deploy New Core</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Initialize Catalog Entry</p>
                    </div>
                </motion.button>
            </div>

            {filteredCourses.length === 0 && courses.length > 0 && (
                <div className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <Target size={48} className="text-slate-800" />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Registry Zero-Match Record</p>
                    </div>
                </div>
            )}

            {/* Modal for Add/Edit */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-slate-900 border border-white/10 p-6 rounded-2xl w-full max-w-2xl shadow-2xl my-8 relative"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-white">
                                    {editingCourse ? 'Modifier la Formation' : 'Ajouter une Formation'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Titre (FR) *</label>
                                        <input type="text" required value={formData.title_fr} onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })} className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-2">Catégorie *</label>
                                        <div className="flex gap-4 mt-2">
                                            {['Software', 'Hardware'].map(cat => (
                                                <label key={cat} className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={(formData.category ? formData.category.split(', ') : []).includes(cat)}
                                                        onChange={() => {
                                                            const currentCats = formData.category ? formData.category.split(', ') : [];
                                                            if (currentCats.includes(cat)) {
                                                                setFormData({ ...formData, category: currentCats.filter(c => c !== cat).join(', ') });
                                                            } else {
                                                                setFormData({ ...formData, category: [...currentCats, cat].join(', ') });
                                                            }
                                                        }}
                                                        className="w-4 h-4 rounded border-white/10 bg-slate-800 text-brand-green focus:ring-brand-green focus:ring-offset-slate-900" 
                                                    />
                                                    <span className="text-white text-sm">{cat}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2">Niveau *</label>
                                    <div className="flex flex-wrap gap-4 mt-2 mb-4">
                                        {['Débutant', 'Intermédiaire', 'Avancé'].map(lvl => (
                                            <label key={lvl} className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={(formData.level ? formData.level.split(', ') : []).includes(lvl)}
                                                    onChange={() => {
                                                        const currentLvls = formData.level ? formData.level.split(', ') : [];
                                                        if (currentLvls.includes(lvl)) {
                                                            setFormData({ ...formData, level: currentLvls.filter(l => l !== lvl).join(', ') });
                                                        } else {
                                                            setFormData({ ...formData, level: [...currentLvls, lvl].join(', ') });
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded border-white/10 bg-slate-800 text-brand-green focus:ring-brand-green focus:ring-offset-slate-900" 
                                                />
                                                <span className="text-white text-sm">{lvl}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Prix de Base (DT) *</label>
                                        <input type="number" required value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })} className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Prix Soldé (DT)</label>
                                        <input type="number" value={formData.sold_price} onChange={(e) => setFormData({ ...formData, sold_price: e.target.value })} className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50" placeholder="Optionnel" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 mb-1">Durée *</label>
                                        <input type="text" required value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50" placeholder="ex: 12 Semaines" />
                                    </div>
                                </div>



                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Image de Couverture *</label>
                                    <div className={`relative border-2 border-dashed rounded-xl p-4 transition-all flex justify-center items-center overflow-hidden min-h-[120px] ${imagePreview ? 'border-brand-green bg-brand-green/5' : 'border-white/10 bg-slate-800/50 hover:bg-slate-800 border-white/20'}`}>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    const file = e.target.files[0];
                                                    setImageFile(file);
                                                    setImagePreview(URL.createObjectURL(file));
                                                    setFormData({ ...formData, image_url: 'pending_upload' });
                                                }
                                            }}
                                        />
                                        <div className="flex flex-col items-center justify-center gap-2 pointer-events-none text-center h-full">
                                            {imagePreview ? (
                                                <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                                            ) : null}
                                            <div className="relative z-0 flex flex-col items-center gap-2 p-2 rounded bg-black/40 backdrop-blur-sm">
                                                <Upload size={24} className={imagePreview ? "text-white" : "text-slate-400"} />
                                                <span className={`text-xs font-bold ${imagePreview ? "text-white" : "text-slate-400"}`}>
                                                    {imagePreview ? "Changer l'image" : "Cliquez pour uploader une image"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {!imagePreview && !formData.image_url && <p className="text-[10px] text-red-400 mt-1">L'image est requise.</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Description (FR)</label>
                                    <textarea rows={3} value={formData.description_fr} onChange={(e) => setFormData({ ...formData, description_fr: e.target.value })} className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-white focus:outline-none focus:border-brand-green/50" />
                                </div>

                                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-white/10 text-white hover:bg-white/5 font-bold text-sm transition-all">
                                        Annuler
                                    </button>
                                    <button type="submit" disabled={isSubmitting} className="btn-primary px-5 py-2.5 flex items-center gap-2">
                                        {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                        {editingCourse ? 'Enregistrer les modifications' : 'Créer la formation'}
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
