"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

import { supabase } from '@/lib/supabase';
import { Button, Field, inputClass, cn } from '@/components/admin/ui';

export default function AdminLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error: loginError } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (loginError) {
            setError(loginError.message);
            setLoading(false);
            return;
        }

        // Verify if the user is actually an admin
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profileError || !['admin', 'professor'].includes(profile?.role)) {
            await supabase.auth.signOut();
            setError('Accès refusé : droits administrateur insuffisants.');
            setLoading(false);
            return;
        }

        router.push(profile.role === 'professor' ? '/admin/students' : '/admin');
        router.refresh();
    };

    return (
        <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slate-50 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)] font-sans md:py-10">
            <div className="w-full max-w-sm">
                <div className="mb-6 flex flex-col items-center text-center">
                    <img src="/gsmlogo.png" alt="GSM Guide Academy" className="mb-4 h-10 w-10 object-contain" />
                    <h1 className="text-xl font-semibold tracking-tight text-slate-900">Connexion à l’administration</h1>
                    <p className="mt-1 text-sm text-slate-500">Compte administrateur ou professeur.</p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    {error && (
                        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            <span className="min-w-0 break-words">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <Field label="E-mail" htmlFor="admin-login-email">
                            <input
                                id="admin-login-email"
                                type="email"
                                autoComplete="email"
                                inputMode="email"
                                autoFocus
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                aria-invalid={!!error}
                                className={inputClass}
                                placeholder="admin@gsmguide.com"
                            />
                        </Field>

                        <Field label="Mot de passe" htmlFor="admin-login-password">
                            <div className="relative">
                                <input
                                    id="admin-login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    aria-invalid={!!error}
                                    className={cn(inputClass, 'pr-10')}
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                    title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </Field>

                        <Button
                            type="submit"
                            variant="primary"
                            loading={loading}
                            aria-busy={loading}
                            className="w-full"
                        >
                            {loading ? 'Connexion en cours…' : 'Se connecter'}
                        </Button>
                    </form>
                </div>

                <p className="mt-4 text-center text-xs text-slate-500">Accès réservé au personnel de l’académie.</p>

                <div className="mt-4 text-center">
                    <Link
                        href="/"
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
                    >
                        <ArrowLeft size={16} /> Retour au site
                    </Link>
                </div>
            </div>
        </div>
    );
}
